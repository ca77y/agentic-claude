import {
  STRINGS,
  LENS_SCHEMA,
  scout,
  lens,
  fact,
  absent,
  shaped,
  sameRev,
  slugged,
  parseSpec,
  settledText,
  settleDecisions,
  blocked,
  type Answers,
  type Finding,
  type LensResult,
  type Need,
  type NeedKind,
  type ScoutResult,
} from "../lib/family.ts";
import type { Attempt, Halted } from "../lib/gates.ts";
import { answersOf, startInput, textOf, whereOf, type NotStarted } from "../lib/input.ts";
import { libraryReaderSchema, measuringCoderSchema, pusherSchema, writerSchema } from "../lib/schemas.ts";
import { bullets } from "../lib/text.ts";

export const meta = {
  name: "deliver-spike",
  description:
    "Answer a bounded technical question with a cited findings document that makes no recommendation: the library first, then outside scouts, and an optional throwaway prototype on its own unpushed branch that a fresh qa confirms and that is deleted, never merged",
  whenToUse:
    'Run only when the user invokes /slopify:deliver-spike or asks for the slopify deliver-spike workflow, for a bounded technical question that needs findings, measurements, or a throwaway prototype. Open-ended outside research ("what is the best X") belongs to /slopify:research. Args: {question, projectRoot?, answers?}, or the question as a plain string; projectRoot defaults to the session project directory; answers maps the need ids of a blocked result to the user\'s decisions.',
  phases: [
    { title: "Locate", detail: "scout-checkpoint reports the findings document, prototype branch, and worktree" },
    { title: "Codebase", detail: "library-reader, scout-feasibility, and scout-code in parallel" },
    {
      title: "Outside",
      detail:
        "after library-reader has returned: scout-upstream-docs, scout-known-issues, and scout-prior-art in parallel",
    },
    { title: "Plan", detail: "writer lists the claims, their evidence status, and the measurements needed" },
    {
      title: "Prototype",
      detail:
        "pusher creates the prototype branch and worktree; coder builds the throwaway prototype and runs each measurement",
    },
    { title: "Findings", detail: "writer writes the findings document, with no recommendation" },
    {
      title: "Validate",
      detail:
        "lens-evidence, lens-question, lens-neutrality, and qa on the prototype, each a fresh dispatch on the new revision",
    },
    { title: "Cleanup", detail: "pusher removes the prototype worktree and deletes its branch" },
  ],
} as const satisfies WorkflowMeta;

const WORKFLOW = "deliver-spike";
const MAX_FAILURES = 3;

const NO_OPS =
  "Do not commit, push, create or remove branches or worktrees, open pull requests, or touch cards: pusher alone does that.";
// Rules for every prompt that writes or revises the findings document, and the revision wording.
const MEASURED_RULE =
  "Every measured value in the document must come from a prototype command recorded in the document together with its output. Do not report figures from scouts, from runs that were not saved, or from a validator's reruns: drop such a figure rather than cite it. When a validator flags a figure that has no recorded command, remove it or add the recorded command and its output; never add a new unrecorded figure.";
const DOC_REVISION =
  "The document revision is the file's own git hash-object (git hash-object <path>); the file may be untracked, so verify it that way and do not look for a commit.";

// Local producer and operations schemas ------------------------------------

const LIBRARY_SCHEMA = libraryReaderSchema("the question");

const WRITER_SCHEMA = writerSchema({
  produced: "Absolute paths written",
  revision: "git hash-object of the main artifact",
});

const PLAN_SCHEMA = {
  type: "object",
  required: ["claims", "openDecisions"],
  properties: {
    claims: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "claim", "status", "needsMeasurement", "measurement"],
        properties: {
          id: { type: "string", description: "A short stable id such as c1" },
          claim: { type: "string" },
          status: { type: "string", enum: ["supported", "contested", "unknown"] },
          needsMeasurement: { type: "boolean" },
          measurement: {
            type: "string",
            description: "What to measure and how; an empty string when no measurement is needed",
          },
        },
      },
    },
    openDecisions: { ...STRINGS, description: "Questions only the user can settle before the spike can proceed" },
  },
} as const;

const CODER_SCHEMA = measuringCoderSchema({
  ran: "command -> result",
  revision: "Label <HEAD sha>+<digest> naming the worktree's current state; not a git object",
  specMismatch: "Why the approach cannot work as assigned; an empty string when it can",
});

const PUSHER_SCHEMA = pusherSchema();

type LibraryResult = Infer<typeof LIBRARY_SCHEMA>;
type Plan = Infer<typeof PLAN_SCHEMA>;
type Claim = Plan["claims"][number];
type Measurement = Infer<typeof CODER_SCHEMA>["measurements"][number];
type PusherResult = Infer<typeof PUSHER_SCHEMA>;

// worktree, branch, findingsDoc: whichever exist
interface Checkpoint {
  worktree?: string;
  branch?: string;
  findingsDoc?: string;
}
interface Verdict {
  verdict: string;
  result: string;
  evaluated: string;
  findings: Finding[];
  limits: string;
}
// A validator in the Validate gate, with the revision it is briefed with and its latest result.
interface Judge {
  name: string;
  doc: boolean;
  call: () => Promise<LensResult | null>;
  revision: string;
  r: LensResult | null | undefined;
}

// What the run knows so far; the steps below read and update it.
interface Spike {
  readonly question: string;
  readonly answers: Answers;
  readonly where: string;
  readonly slug: string;
  // The prototype's names come from docs/FORGE.md's "Spike prototypes" binding, read in Locate; the
  // script invents none. binding is '' when FORGE.md declares none, and then no prototype is built.
  binding: string;
  readonly attempts: Attempt[];
  readonly completed: string[];
  readonly skipped: string[];
  readonly checkpoint: Checkpoint;
  readonly doc: { path: string; revision: string };
  prototypeBranch: string;
  prototypeWorktree: string;
  measurements: Measurement[]; // from the coder; empty on a rerun that finds the document already written
  unknowns: string[];
  protoRevision: string;
  prototypeGap: string; // set when claims need a prototype but docs/FORGE.md declares no naming for one
}

type Stopped = Halted<Checkpoint>;
interface Done {
  status: "done";
  workflow: string;
  report: string;
  skipped: string[];
  attempts: Attempt[];
  document: string;
  revision: string;
  verdicts: Verdict[];
  measurements: Measurement[];
  unknowns: string[];
  prototypeDeleted: boolean;
}

// Helpers --------------------------------------------------------------------

const auth = (s: Spike): string =>
  `The user invoked the deliver-spike workflow. That invocation itself authorizes you to create, and later delete, this spike's own prototype branch and worktree, which are local only, never pushed, and never merged. Name them only as docs/FORGE.md's "Spike prototypes" binding names them:\n${s.binding}\nFollow docs/FORGE.md for everything else it binds, such as the target branch to branch from. The user's invocation of deliver-spike is the user's request for creating and deleting this prototype branch and worktree, so it lifts any restriction in docs/FORGE.md against them. The invocation authorizes nothing else: no commit, push, pull request, board operation, ledger line, merge, or message.`;

function need(id: string, kind: NeedKind, what: string, evidence: string): Need {
  return { id, kind, what, evidence };
}

// A blocked result: the step that could not proceed, what it needs, and what a rerun finds.
function stop(s: Spike, step: string, needs: readonly Need[]): Stopped {
  return blocked(WORKFLOW, step, needs, { completed: s.completed, checkpoint: s.checkpoint, attempts: s.attempts });
}

function opRef(result: PusherResult, op: string): string {
  const hit = result.operations.find((o) => o.op === op);
  return hit ? hit.reference.trim() : "";
}

// A scout result as brief text. A scout that did not return is a gap, not an absence.
function show(title: string, r: ScoutResult | null | undefined): string {
  if (!r) return `### ${title}\nNo result: the dispatch did not return, so this is a gap, not an absence.`;
  const ev = r.evidence.map((e) => `- ${e.source} (${e.location}): ${e.excerpt}`);
  return `### ${title}\n${r.answer}\nEvidence:\n${bullets(ev)}\nGaps:\n${bullets(r.gaps)}`;
}

function showLibrary(r: LibraryResult | null): string {
  return r
    ? `### library-reader\n${r.summary}\nSupported:\n${bullets(r.supported)}\nGaps:\n${bullets(r.gaps)}`
    : "### library-reader\nNo result: the library-reader did not return, so what the library supports is unknown, not empty.";
}

function showMeasurements(ms: readonly Measurement[]): string {
  return ms.length > 0
    ? ms.map((m) => `- ${m.claim}: ${m.value} (command: ${m.command})`).join("\n")
    : "- none reported";
}

function covers(measurements: readonly Measurement[], id: string): boolean {
  const re = new RegExp(String.raw`(^|[^\w-])${id.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}([^\w-]|$)`);
  return measurements.some((m) => re.test(m.claim));
}

// A verdict passes only when it says pass and nothing blocking remains.
function passed(r: LensResult | null | undefined): r is LensResult {
  return !!r && r.verdict === "pass" && r.findings.every((f) => !f.blocking);
}

// Whether a verdict is on the revision it was briefed with (or names what it judged, when none was briefed).
function onRevision(r: LensResult | null | undefined, revision: string): boolean {
  return !!r && (revision ? sameRev(revision, r.evaluated) : r.evaluated.trim() !== "");
}

// A verdict counts only for the revision it judged. When the brief could not name a revision
// (a rerun that found the artifact already written), the verdict must still name what it judged.
function passedOn(r: LensResult | null | undefined, revision: string): boolean {
  if (!passed(r)) return false;
  return revision ? sameRev(revision, r.evaluated) : r.evaluated.trim() !== "";
}

function describe(name: string, r: LensResult | null | undefined, revision: string): string {
  if (!r) return `${name}: the dispatch did not return`;
  const items = r.findings.map((f) => `${f.location}: ${f.problem}${f.blocking ? "" : " (non-blocking)"}`);
  if (r.verdict === "pass" && items.length === 0 && !passedOn(r, revision)) {
    items.push(`judged "${r.evaluated}", not the briefed revision ${revision || "(none named)"}`);
  }
  const limits = r.limits && !absent(r.limits, true) ? `; limits: ${r.limits}` : "";
  return `${name}: ${r.verdict}${items.length > 0 ? ` (${items.join("; ")})` : ""}${limits}`;
}

// Run a producer until `check` finds no problem, at most MAX_FAILURES times. Every failed
// attempt is recorded. `fatal` stops early on a result that retrying cannot improve.
async function attempt<R>(
  s: Spike,
  gate: string,
  label: string,
  run: (last: string) => Promise<R | null>,
  check: (r: R) => string,
  fatal?: (r: R) => boolean,
): Promise<{ res: R | null; last: string }> {
  let last = "";
  for (let i = 0; i < MAX_FAILURES; i++) {
    const res = await run(last);
    const problem = res ? check(res) : "the agent did not return";
    if (!problem) return { res, last };
    s.attempts.push({ gate, approach: label, failed: problem });
    last = problem;
    if (res && fatal?.(res)) break;
  }
  return { res: null, last };
}

const retryNote = (last: string): string => (last ? `\nThe previous attempt failed: ${last}\n` : "");

// ---- Locate -----------------------------------------------------------------

async function locate(s: Spike): Promise<Stopped | undefined> {
  phase("Locate");
  let cp: ScoutResult | null = null;
  for (let i = 0; i < MAX_FAILURES && !cp; i++) {
    cp = await scout(
      "scout-checkpoint",
      `${s.where}

Report where this spike stands from its durable checkpoints. Return each key below that exists as an evidence item whose source is the key; leave out a key that does not exist. A spike has no card: read no board.

Spike slug: ${s.slug}
Question: ${s.question}

Keys:
- spike-binding: the "Spike prototypes" binding in docs/FORGE.md: its local branch pattern, its worktree pattern, and whether it permits deleting a never-pushed prototype, quoted. Leave the key out when docs/FORGE.md does not exist or has no such binding; invent no names.
- findings-doc: the findings document for this spike, a Markdown file in the main checkout (ignore .git and .worktrees) whose first line under its title is "Spike: ${s.slug}". Location: its absolute path. Excerpt: "<absolute path> <git hash-object of the file>".
- prototype-branch: the local prototype branch that binding names for the slug above, if it exists. Location and excerpt: the branch name alone. Leave the key out when there is no binding.
- worktree: the prototype worktree that binding names for the slug above, if it exists. Location and excerpt: its absolute path alone. Leave the key out when there is no binding.`,
      { label: "checkpoint", phase: "Locate" },
    );
    if (!cp) s.attempts.push({ gate: "locate", approach: "scout-checkpoint", failed: "the scout did not return" });
  }
  if (!cp) {
    return stop(s, "locate", [
      need(
        "locate-1",
        "prerequisite",
        "A scout-checkpoint result for this spike, so a rerun knows what is already done.",
        "scout-checkpoint did not return in three dispatches",
      ),
    ]);
  }
  s.completed.push("locate");

  const bindingFact = fact(cp, "spike-binding");
  // The quoted line is "Spike prototypes: none" when the project wants no prototypes. A binding names a branch
  // pattern in terms of <slug>; anything else is no binding, and no names are invented.
  const bindingBody = bindingFact.replace(/^[\s>*-]*spike prototypes\s*[:—-]?\s*/i, "");
  s.binding = !absent(bindingBody) && /<slug>/i.test(bindingBody) ? bindingFact : "";
  const docSpec = parseSpec(fact(cp, "findings-doc"));
  s.doc.path = docSpec ? shaped("path", docSpec.path) : "";
  s.doc.revision = docSpec ? shaped("sha", docSpec.hash) : "";
  s.prototypeBranch = shaped("branch", fact(cp, "prototype-branch"));
  s.prototypeWorktree = shaped("path", fact(cp, "worktree"));
  if (s.doc.path) s.checkpoint.findingsDoc = s.doc.path;
  if (s.prototypeBranch) s.checkpoint.branch = s.prototypeBranch;
  if (s.prototypeWorktree) s.checkpoint.worktree = s.prototypeWorktree;
  return undefined;
}

// ---- Codebase and Outside ---------------------------------------------------
// Returns the evidence text the later producers are briefed with.

async function gather(s: Spike): Promise<string> {
  phase("Codebase");
  const [library, feasibility, code] = await parallel([
    () =>
      agent(
        `${s.where}

Report what the project library already supports about this spike's question, so supported work is not repeated. Read library/_meta/librarian.md, then the relevant index and wiki pages and the raw notes behind them. Cite each supported claim to its file and heading, and name gaps, stale material, and contested pages. Make no internet requests and no writes.

Question: ${s.question}`,
        { agentType: "slopify:library-reader", label: "library context", phase: "Codebase", schema: LIBRARY_SCHEMA },
      ),
    () =>
      scout(
        "scout-feasibility",
        `${s.where}

The candidate is whatever approach the spike's question asks about. Find where it fits in this codebase, what it would touch, and what blocks it.

Question: ${s.question}`,
        { label: "feasibility", phase: "Codebase" },
      ),
    () =>
      scout(
        "scout-code",
        `${s.where}

The described change is whatever the spike's question would require of this codebase. Find the code locations and call paths relevant to it, with path:line evidence.

Question: ${s.question}`,
        { label: "code", phase: "Codebase" },
      ),
  ]);
  if (!library)
    s.attempts.push({
      gate: "codebase",
      approach: "library-reader",
      failed: "the reader did not return; recorded as a gap",
    });
  s.completed.push("codebase");

  // ---- Outside --------------------------------------------------------------
  // Only after library-reader has returned: the outside scouts are told what the library
  // already supports, so they look only for what is missing.

  phase("Outside");
  const libraryText = showLibrary(library);
  const outsideBrief = (task: string): string => `${s.where}

${task}

Question: ${s.question}

What the project library already supports (look only for what is missing from it, and do not repeat it):
${libraryText}

Codebase evidence so far:
${show("scout-feasibility", feasibility)}
${show("scout-code", code)}`;
  const [upstream, known, prior] = await parallel([
    () =>
      scout(
        "scout-upstream-docs",
        outsideBrief(
          "Find official docs and API references for the one library or service the question turns on, naming it from the question or the codebase evidence below: versions, limits, deprecations. If none is named, report that as a gap.",
        ),
        { label: "upstream docs", phase: "Outside" },
      ),
    () =>
      scout(
        "scout-known-issues",
        outsideBrief("Find pitfalls and open bugs relevant to the question in upstream trackers and changelogs."),
        { label: "known issues", phase: "Outside" },
      ),
    () =>
      scout(
        "scout-prior-art",
        outsideBrief("Find GitHub repos, issues, PRs, discussions, and write-ups where others did the same thing."),
        { label: "prior art", phase: "Outside" },
      ),
  ]);
  s.completed.push("outside");

  return [
    showLibrary(library),
    show("scout-feasibility", feasibility),
    show("scout-code", code),
    show("scout-upstream-docs", upstream),
    show("scout-known-issues", known),
    show("scout-prior-art", prior),
  ].join("\n\n");
}

// ---- Plan -------------------------------------------------------------------

function planProblem(r: Plan): string {
  if (!Array.isArray(r.claims)) return "the plan has no claims list";
  const ids = r.claims.map((c) => c.id);
  if (new Set(ids).size !== ids.length) return "claim ids are not unique";
  const bad = r.claims.find((c) => c.needsMeasurement && !c.measurement.trim());
  return bad ? `claim ${bad.id} needs a measurement but names none` : "";
}

async function planClaims(s: Spike, evidenceText: string): Promise<Stopped | { plan: Plan }> {
  phase("Plan");
  // Open decisions get ids derived from their text, so an answer stays with its question
  // whatever else the writer asks. The first plan call never carries answers (so a resumed run
  // replays it); each answer then goes back with its question text.
  let planFailure = "";
  const sd = await settleDecisions("plan", s.answers, async (settled) => {
    const planned = await attempt(
      s,
      "plan",
      settled.length > 0 ? "writer claim plan with answers" : "writer claim plan",
      (last) =>
        agent(
          `${s.where}
${NO_OPS}
Write no files: return the plan.
${retryNote(last)}
List the claims the answer to this spike's question rests on. For each, give a short stable id (c1, c2, ...), the claim, its evidence status from the evidence below (supported, contested, or unknown), and whether it needs a measurement from a throwaway prototype. A claim needs a measurement only when the evidence leaves it contested or unknown and a prototype could settle it; then say what to measure and how. Leave measurement empty otherwise. Settle measurement details yourself (environment, interpreter or tool versions, method, scope, what is included in a timing) and record each as a labelled assumption: put it in the claim's measurement text as "Assumption: ...", so the findings document can state it too. Raise a question in openDecisions only when the spike's question itself is ambiguous in a way no reasonable assumption resolves; never for how to measure. Otherwise leave openDecisions empty.${settledText(
            settled,
          )}

Question: ${s.question}

Evidence:
${evidenceText}`,
          { agentType: "slopify:writer", label: "plan claims", phase: "Plan", schema: PLAN_SCHEMA },
        ),
      planProblem,
    );
    planFailure = planned.last;
    return planned.res;
  });
  if (!sd.res) {
    return stop(s, "plan", [
      need("plan-1", "validation", "A claim plan the writer can produce for this question.", planFailure),
    ]);
  }
  if (sd.open.length > 0) {
    return stop(
      s,
      "plan",
      sd.open.map((d) => need(d.id, "decision", d.question, "raised by the claim plan")),
    );
  }
  s.completed.push("plan");
  return { plan: sd.res };
}

// ---- Prototype --------------------------------------------------------------

function pusherProblem(r: PusherResult): string {
  return r.unmet.length > 0 ? `unmet: ${r.unmet.join("; ")}` : r.done ? "" : "the operation did not complete";
}
const pusherUnmet = (r: PusherResult): boolean => r.unmet.length > 0;

async function makeWorkspace(s: Spike): Promise<Stopped | undefined> {
  const made = await attempt(
    s,
    "prototype",
    "pusher prototype workspace",
    (last) =>
      agent(
        `${s.where}
${auth(s)}
${retryNote(last)}
Create the spike's prototype branch and worktree for the slug "${s.slug}", named as docs/FORGE.md's "Spike prototypes" binding names them. Branch from the target branch docs/FORGE.md declares. Both are local only, never pushed, never merged; confirm neither was pushed before reusing an existing one. If they already exist from an interrupted run, reuse them. Report the operations \`branch-create\` (reference: the branch name) and \`worktree-add\` (reference: the absolute worktree path). Commit nothing, push nothing, open no pull request, and append no ledger line. Report an operation as unmet only if it fails or the request above does not cover it.`,
        { agentType: "slopify:pusher", label: "prototype workspace", phase: "Prototype", schema: PUSHER_SCHEMA },
      ),
    (r) => pusherProblem(r) || (opRef(r, "worktree-add") ? "" : "no worktree path was reported"),
    pusherUnmet,
  );
  if (!made.res) {
    return stop(s, "prototype", [
      need(
        "prototype-1",
        "prerequisite",
        "A prototype branch and worktree the spike may create (docs/FORGE.md must not prohibit them), so it can measure its claims.",
        made.last,
      ),
    ]);
  }
  s.prototypeWorktree = opRef(made.res, "worktree-add");
  s.prototypeBranch = opRef(made.res, "branch-create") || s.prototypeBranch;
  s.checkpoint.worktree = s.prototypeWorktree;
  if (s.prototypeBranch) s.checkpoint.branch = s.prototypeBranch;
  return undefined;
}

async function buildPrototype(
  s: Spike,
  toMeasure: readonly Claim[],
  evidenceText: string,
): Promise<Stopped | undefined> {
  const claimLines = toMeasure.map((c) => `- ${c.id}: ${c.claim} (measure: ${c.measurement})`).join("\n");
  const built = await attempt(
    s,
    "prototype",
    "coder throwaway prototype",
    (last) =>
      agent(
        `${s.where}
${NO_OPS}
${retryNote(last)}
Build a throwaway prototype in the worktree ${s.prototypeWorktree} and write only inside it. It measures the claims below to answer the spike's question. It is deleted afterwards and never merged, so keep it as small as the measurements allow. If the worktree already holds prototype work from an interrupted run, inspect it, keep what serves this assignment, and continue from it.

Run every measurement yourself, the way its claim states. Return one measurements entry per claim: claim set to "<claim id>: <claim>", value set to what you observed, and command set to the exact command that produced it. Return in steps what you ran and in observed what you saw. Return in revision the label <HEAD sha>+<digest> for the worktree's current state, where the digest is git hash-object of the output of git -C ${s.prototypeWorktree} diff HEAD --binary, taken after git add -N on your new files. The revision is a label for the worktree's current state, not a git object: do not look it up in git. If the approach cannot measure a claim, say why in specMismatch.

Question: ${s.question}

Claims to measure:
${claimLines}

Evidence:
${evidenceText}`,
        { agentType: "slopify:coder", label: "build prototype", phase: "Prototype", schema: CODER_SCHEMA },
      ),
    (r) => {
      if (r.specMismatch.trim()) return `unworkable: ${r.specMismatch.trim()}`;
      if (!r.revision.trim()) return "no prototype revision was returned";
      const missing = toMeasure.filter((c) => !covers(r.measurements, c.id)).map((c) => c.id);
      return missing.length > 0 ? `no measurement was returned for ${missing.join(", ")}` : "";
    },
  );
  if (!built.res) {
    return stop(s, "prototype", [
      need(
        "prototype-2",
        "validation",
        `A prototype that measures every claim that needs it (${toMeasure.map((c) => c.id).join(", ")}).`,
        built.last,
      ),
    ]);
  }
  s.measurements = built.res.measurements;
  s.protoRevision = built.res.revision.trim();
  s.completed.push("prototype");
  return undefined;
}

async function prototype(s: Spike, plan: Plan, evidenceText: string): Promise<Stopped | undefined> {
  const toMeasure = plan.claims.filter((c) => c.needsMeasurement);
  if (toMeasure.length === 0) {
    log("No claim needs a measurement; no prototype");
    s.skipped.push("prototype");
    return undefined;
  }
  if (!s.binding && !s.prototypeWorktree) {
    s.prototypeGap = `No prototype was built: docs/FORGE.md declares no "Spike prototypes" naming, so these claims were not measured: ${toMeasure.map((c) => c.id).join(", ")}`;
    log(s.prototypeGap);
    s.skipped.push("prototype");
    return undefined;
  }
  phase("Prototype");
  if (!s.prototypeWorktree) {
    const stopped = await makeWorkspace(s);
    if (stopped) return stopped;
  }
  return buildPrototype(s, toMeasure, evidenceText);
}

// ---- Findings ---------------------------------------------------------------

async function findings(s: Spike, plan: Plan, evidenceText: string): Promise<Stopped | undefined> {
  phase("Findings");
  const written = await attempt(
    s,
    "findings",
    "writer findings document",
    (last) =>
      agent(
        `${s.where}
${NO_OPS}
${retryNote(last)}
Write the spike's findings document. Place it in the main checkout where it best fits the project's documentation, as a new entry, and leave it uncommitted. Its first line under its title is "Spike: ${s.slug}". Directly after the title block, open with a one-paragraph direct answer to the question that states its conditions (the stated assumptions and what it holds for). Then the question, the findings, the measurements, and the open unknowns. It makes no recommendation and does not rank options. Every claim cites a path:line, library evidence (file and heading), an outside source (URL), or a measurement (its claim id and command). State the plan's labelled assumptions ("Assumption: ...") in the measurements section, next to the measurements they qualify. ${MEASURED_RULE} Write only that one document: produced holds exactly its absolute path, and revision is its git hash-object. Return the open unknowns, one per entry, in openDecisions.

Question: ${s.question}

Claims and their evidence status:
${plan.claims.map((c) => `- ${c.id} [${c.status}]: ${c.claim}${c.measurement ? ` (measurement: ${c.measurement})` : ""}`).join("\n")}

Measurements from the prototype:
${showMeasurements(s.measurements)}${
          s.prototypeGap
            ? `\n\n${s.prototypeGap}. State each of those claims as unmeasured in the document, and list the missing prototype naming among the open unknowns.`
            : ""
        }

Evidence:
${evidenceText}`,
        { agentType: "slopify:writer", label: "findings document", phase: "Findings", schema: WRITER_SCHEMA },
      ),
    (r) => {
      if (!r.produced[0]?.startsWith("/")) return "no absolute document path was returned";
      return r.revision.trim() ? "" : "no document revision was returned";
    },
  );
  if (!written.res) {
    return stop(s, "findings", [
      need("findings-1", "validation", "A findings document the writer can produce.", written.last),
    ]);
  }
  s.doc.path = written.res.produced[0] ?? "";
  s.doc.revision = written.res.revision.trim();
  s.unknowns = written.res.openDecisions;
  if (s.prototypeGap && s.unknowns.every((u) => !/prototype/i.test(u))) s.unknowns = [...s.unknowns, s.prototypeGap];
  s.checkpoint.findingsDoc = s.doc.path;
  s.completed.push("findings");
  return undefined;
}

// Codebase, Outside, Plan, Prototype, and Findings: everything that produces the findings document.
async function produce(s: Spike): Promise<Stopped | undefined> {
  const evidenceText = await gather(s);
  // Wrapped, so a key the writer adds to its plan can never read as a stopped result.
  const planned = await planClaims(s, evidenceText);
  if (!("plan" in planned)) return planned;
  const { plan } = planned;
  return (await prototype(s, plan, evidenceText)) ?? findings(s, plan, evidenceText);
}

// ---- Validate ---------------------------------------------------------------

function judges(s: Spike): Judge[] {
  const docBrief = (task: string): string => `${s.where}

${task}

Question: ${s.question}
Findings document: ${s.doc.path}
Revision judged: ${s.doc.revision || "the document as it is now (report its git hash-object in evaluated)"}
${DOC_REVISION}${
    s.measurements.length > 0 ? `\n\nMeasurements the prototype reported:\n${showMeasurements(s.measurements)}` : ""
  }`;
  const judged: Omit<Judge, "revision" | "r">[] = [
    {
      name: "lens-evidence",
      doc: true,
      call: () =>
        lens(
          "lens-evidence",
          docBrief("Judge whether every claim in the findings document cites a reachable source or measurement."),
          { label: "evidence", phase: "Validate" },
        ),
    },
    {
      name: "lens-question",
      doc: true,
      call: () =>
        lens(
          "lens-question",
          docBrief("Judge whether the findings answer the spike's question and name what remains unknown."),
          { label: "question", phase: "Validate" },
        ),
    },
    {
      name: "lens-neutrality",
      doc: true,
      call: () =>
        lens("lens-neutrality", docBrief("Judge whether the findings make no recommendation."), {
          label: "neutrality",
          phase: "Validate",
        }),
    },
  ];
  if (s.prototypeWorktree) {
    judged.push({
      name: "qa",
      doc: false,
      call: () =>
        agent(
          `${s.where}

Judge whether the throwaway prototype measures what the findings document says. The acceptance source is the document's measurement claims, and each measurement's claim, value, and command. For each, re-run the command in a temporary copy of the prototype worktree and check that the prototype exercises what the claim says (not a stub), and that the document's stated value agrees with what you observe, allowing for ordinary run-to-run variance. Change nothing in the worktree or the document.

Question: ${s.question}
Prototype worktree: ${s.prototypeWorktree}
Prototype revision judged: ${
            s.protoRevision
              ? `${s.protoRevision} (a label for the worktree's current state, not a git object)`
              : "the worktree's current state. Name it in evaluated as <HEAD sha>+<digest>, a label and not a git object, computed in a temporary copy: git add -N on new files, then git hash-object of git diff HEAD --binary"
          }
Findings document: ${s.doc.path}
Document revision: ${s.doc.revision || "the document as it is now"}
${DOC_REVISION}

Measurements the prototype reported:
${showMeasurements(s.measurements)}`,
          { agentType: "slopify:qa", label: "confirm prototype", phase: "Validate", schema: LENS_SCHEMA },
        ),
    });
  }
  return judged.map((j) => ({ ...j, revision: j.doc ? s.doc.revision : s.protoRevision, r: undefined }));
}

// A validator with no verdict, or a verdict on another revision, is dispatched again under its own
// bound; that is not a failure of this gate and does not send a producer to fix.
async function judge(s: Spike, judged: readonly Judge[]): Promise<Stopped | undefined> {
  let todo = judged;
  for (let n = 0; n < MAX_FAILURES && todo.length > 0; n++) {
    if (n > 0)
      s.attempts.push({
        gate: "validator",
        approach: `re-run ${todo.map((j) => j.name).join(", ")}`,
        failed: "no verdict, or a verdict on another revision",
      });
    const res = await parallel(todo.map((j) => j.call));
    for (const [i, j] of todo.entries()) j.r = res[i];
    todo = judged.filter((j) => !onRevision(j.r, j.revision));
  }
  if (todo.length > 0) {
    return stop(s, "validate", [
      need(
        "validate-2",
        "validation",
        `A verdict on the briefed revision from ${todo.map((j) => j.name).join(", ")}.`,
        "three dispatches returned no verdict or a verdict on another revision",
      ),
    ]);
  }
  return undefined;
}

// The coder repairs the prototype and re-measures when qa failed.
async function fixPrototype(s: Spike, protoFail: Judge, failures: number): Promise<void> {
  const fixed = await agent(
    `${s.where}
${NO_OPS}

A fresh qa did not confirm that the throwaway prototype in ${s.prototypeWorktree} measures what the findings document says. Fix the prototype so it measures what each claim states, or, where the claim as written cannot be measured, report the measurement as it actually is; write only inside that worktree, and supply any prerequisite a finding names as missing if you can. Re-run every measurement and return them as before, claim set to "<claim id>: <claim>", with steps, observed, and the new revision: the label <HEAD sha>+<digest> for the worktree's current state, the digest being git hash-object of git -C ${s.prototypeWorktree} diff HEAD --binary after git add -N on new files. The revision is a label for the worktree's current state, not a git object: do not look it up in git.

Question: ${s.question}
Findings document: ${s.doc.path}

qa findings:
${describe("qa", protoFail.r, s.protoRevision)}

Measurements so far:
${showMeasurements(s.measurements)}`,
    { agentType: "slopify:coder", label: `fix prototype ${failures}`, phase: "Validate", schema: CODER_SCHEMA },
  );
  if (!fixed || fixed.specMismatch.trim()) {
    s.attempts.push({
      gate: "validate",
      approach: "coder prototype fix",
      failed: fixed ? `unworkable: ${fixed.specMismatch.trim()}` : "the coder did not return",
    });
  } else {
    if (fixed.measurements.length > 0) s.measurements = fixed.measurements;
    if (fixed.revision.trim()) s.protoRevision = fixed.revision.trim();
  }
}

// The writer revises the document from every finding and the measurements as they now stand.
async function reviseFindings(s: Spike, failing: readonly Judge[], failures: number): Promise<void> {
  const revised = await agent(
    `${s.where}
${NO_OPS}

Revise the findings document at ${s.doc.path}, and write only that file. Resolve each finding below without adding a recommendation, and make every measurement claim in it agree with the measurements as they now stand. Keep the first line under its title as "Spike: ${s.slug}", the opening one-paragraph direct answer with its conditions (updated to agree with the revision), every claim cited, and the open unknowns listed. ${MEASURED_RULE} produced holds exactly its absolute path, revision is its git hash-object, and openDecisions holds the open unknowns, one per entry.

Question: ${s.question}

Findings from fresh validators:
${failing.map((j) => describe(j.name, j.r, j.revision)).join("\n")}

Measurements:
${showMeasurements(s.measurements)}`,
    { agentType: "slopify:writer", label: `revise findings ${failures}`, phase: "Validate", schema: WRITER_SCHEMA },
  );
  if (revised?.revision.trim()) {
    s.doc.revision = revised.revision.trim();
    const produced = revised.produced[0];
    if (produced?.startsWith("/")) s.doc.path = produced;
    s.unknowns = revised.openDecisions;
    s.checkpoint.findingsDoc = s.doc.path;
  } else {
    s.attempts.push({
      gate: "validate",
      approach: "writer findings revision",
      failed: "the writer did not return a revision",
    });
  }
}

// Every round is fresh dispatches on the revisions that now exist. A round with any
// non-passing verdict is one failure of this gate; the producers then fix from the findings.
async function validate(s: Spike): Promise<Stopped | Verdict[]> {
  phase("Validate");
  let failures = 0;

  for (;;) {
    const hasPrototype = !!s.prototypeWorktree;
    const judged = judges(s);
    const stopped = await judge(s, judged);
    if (stopped) return stopped;
    const failing = judged.filter((j) => !passedOn(j.r, j.revision));
    const verdicts = judged.map((j) => ({
      verdict: j.name,
      result: j.r ? j.r.verdict : "no-verdict",
      evaluated: j.r ? j.r.evaluated : "",
      findings: j.r ? j.r.findings : [],
      limits: j.r ? j.r.limits : "the dispatch did not return",
    }));
    if (failing.length === 0) return verdicts;

    failures += 1;
    const summary = failing.map((j) => describe(j.name, j.r, j.revision)).join(" | ");
    s.attempts.push({
      gate: "validate",
      approach: `document ${s.doc.revision || s.doc.path}${s.protoRevision ? `, prototype ${s.protoRevision}` : ""}`,
      failed: summary,
    });
    if (failures >= MAX_FAILURES) {
      return stop(s, "validate", [
        need(
          "validate-1",
          "validation",
          `Findings that pass lens-evidence, lens-question, lens-neutrality${hasPrototype ? ", and a qa confirmation of the prototype" : ""}.`,
          summary,
        ),
      ]);
    }

    const protoFail = failing.find((j) => j.name === "qa");
    if (protoFail) await fixPrototype(s, protoFail, failures);
    await reviseFindings(s, failing, failures);
  }
}

// ---- Cleanup ----------------------------------------------------------------
// Returns whether the prototype was deleted.

async function cleanup(s: Spike): Promise<Stopped | boolean> {
  if (!s.prototypeBranch && !s.prototypeWorktree) {
    s.skipped.push("cleanup");
    return false;
  }
  phase("Cleanup");
  const cleaned = await attempt(
    s,
    "cleanup",
    "pusher prototype removal",
    (last) =>
      agent(
        `${s.where}
${auth(s)}
${retryNote(last)}
Remove this spike's prototype: ${s.prototypeWorktree ? `the worktree at ${s.prototypeWorktree}` : "its worktree, if one exists"} and ${s.prototypeBranch ? `its local branch ${s.prototypeBranch}` : "its local branch, if one exists"} (named by docs/FORGE.md's "Spike prototypes" binding for the slug "${s.slug}"; find them from the worktree list and the branch list). Both are local only, never pushed, never merged. The branch was never pushed or merged and the prototype is throwaway, so delete the worktree and branch even though they are unmerged and the worktree holds uncommitted files. Touch no other branch or worktree, and push nothing. Report the operations \`worktree-remove\` and \`branch-delete\`, then confirm that git worktree list and git branch --list show neither.`,
        { agentType: "slopify:pusher", label: "remove prototype", phase: "Cleanup", schema: PUSHER_SCHEMA },
      ),
    pusherProblem,
    pusherUnmet,
  );
  if (!cleaned.res) {
    return stop(s, "cleanup", [
      need(
        "cleanup-1",
        "prerequisite",
        "The prototype worktree and branch removed, as the deliver-spike invocation authorizes for its own local, unpushed prototype.",
        cleaned.last,
      ),
    ]);
  }
  s.completed.push("cleanup");
  return true;
}

// ---- Report -----------------------------------------------------------------

function done(s: Spike, verdicts: Verdict[], prototypeDeleted: boolean): Done {
  const verdictLine = (v: Verdict): string => `${v.verdict}: ${v.result}, evaluated ${v.evaluated || "unnamed"}`;
  const protoVerdict = verdicts.find((v) => v.verdict === "qa");
  const report = [
    `Spike done. Findings document: ${s.doc.path} (revision ${s.doc.revision || "unnamed"}); it makes no recommendation.`,
    `Lens verdicts: ${verdicts
      .filter((v) => v.verdict !== "qa")
      .map((v) => verdictLine(v))
      .join("; ")}.`,
    protoVerdict
      ? `The measurements come from a throwaway prototype and were independently confirmed by a fresh qa: ${verdictLine(protoVerdict)}.`
      : "No prototype was needed, so no qa ran.",
    `Measurements: ${s.measurements.length > 0 ? s.measurements.map((m) => `${m.claim} = ${m.value} (${m.command})`).join("; ") : "none this run (see the document)"}.`,
    `Open unknowns: ${s.unknowns.length > 0 ? s.unknowns.join("; ") : "none reported this run (see the document)"}.`,
    prototypeDeleted
      ? `The prototype worktree${s.prototypeBranch ? ` and branch ${s.prototypeBranch}` : ""} were deleted without merging anything; nothing was pushed.`
      : s.prototypeGap
        ? `${s.prototypeGap}; nothing was pushed or merged.`
        : "No prototype branch existed, so none was deleted; nothing was pushed or merged.",
  ].join("\n");

  return {
    status: "done",
    workflow: WORKFLOW,
    report,
    skipped: s.skipped,
    attempts: s.attempts,
    document: s.doc.path,
    revision: s.doc.revision,
    verdicts,
    measurements: s.measurements,
    unknowns: s.unknowns,
    prototypeDeleted,
  };
}

export default async function run(): Promise<NotStarted | Stopped | Done> {
  const started = startInput(
    args,
    "question",
    "Ask the user for the spike question, then invoke /slopify:deliver-spike again.",
  );
  if ("status" in started) return started;
  const { input, subject: question } = started;

  const s: Spike = {
    question,
    answers: answersOf(input["answers"]),
    where: whereOf(textOf(input["projectRoot"])),
    slug: slugged(question, "spike"),
    binding: "",
    attempts: [],
    completed: [],
    skipped: [],
    checkpoint: {},
    doc: { path: "", revision: "" },
    prototypeBranch: "",
    prototypeWorktree: "",
    measurements: [],
    unknowns: [],
    protoRevision: "",
    prototypeGap: "",
  };

  const notLocated = await locate(s);
  if (notLocated) return notLocated;

  if (s.doc.path) {
    log(`Findings document ${s.doc.path} exists; skipping codebase, outside, plan, prototype, and findings`);
    s.skipped.push("codebase", "outside", "plan", "prototype", "findings");
  } else {
    const stopped = await produce(s);
    if (stopped) return stopped;
  }

  const verdicts = await validate(s);
  if ("status" in verdicts) return verdicts;
  s.completed.push("validate");

  const deleted = await cleanup(s);
  return typeof deleted === "boolean" ? done(s, verdicts, deleted) : deleted;
}
