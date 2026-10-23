import {
  scout,
  advise,
  fact,
  absent,
  shaped,
  slugged,
  parseSpec,
  decisionsOf,
  answerOf,
  settledText,
  type AdvisorResult,
  type Answers,
  type FamilyOptions,
  type LensResult,
  type Need,
  type ScoutResult,
  type Settled,
} from "../lib/family.ts";
import {
  MAX_FAILURES,
  halt,
  done,
  skip,
  lensOn,
  problems,
  answeredBlockers,
  type Attempt,
  type Halted,
  type RunLog,
} from "../lib/gates.ts";
import { answersOf, startInput, textOf, whereOf, type Input, type NotStarted } from "../lib/input.ts";
import { libraryReaderSchema, pusherSchema, writerSchema } from "../lib/schemas.ts";
import { bullets, show, slugify, withoutTrailing } from "../lib/text.ts";

export const meta = {
  name: "shape",
  description:
    "Turn an idea into a durable story with observable acceptance criteria: scouts and the library gather evidence, the what-and-why advisors judge it, a writer drafts the story, and fresh lenses validate it; no spec is written",
  whenToUse:
    "Run only when the user invokes /slopify:shape or asks for the slopify shape workflow. Args: {idea, card?, file?: boolean, projectRoot?, answers?}, or the idea as a plain string; card names an existing card to start from, file: true files or updates the story card, projectRoot defaults to the session project directory, and answers maps an open-decision id to its answer when rerunning.",
  phases: [
    { title: "Locate", detail: "scout-card and scout-related-cards, then scout-checkpoint" },
    { title: "Gather", detail: "library-reader, scout-docs, and scout-code" },
    { title: "Advise", detail: "advisor-value, advisor-scope, advisor-alternatives, and advisor-fit in parallel" },
    { title: "Draft", detail: "writer drafts the story in the draft file, or resolves its marked open decisions" },
    { title: "Validate", detail: "lens-criteria and lens-solution-free judge the draft revision" },
    { title: "File", detail: "pusher files or updates the story card, only when file is true" },
  ],
} as const satisfies WorkflowMeta;

const NAME = "shape";
const READ_ONLY = "Report only: change nothing, and perform no board or forge operation.";
const PRODUCER_BOUNDS = "Do not commit, push, or perform any board or forge operation; another agent does that.";

const CONTEXT_SCHEMA = libraryReaderSchema("the idea");

const WRITER_SCHEMA = writerSchema({
  produced: "Absolute paths written",
  revision: "git hash-object of the main artifact",
  openDecisions: "Ids of the open decisions still marked in the artifact",
  storyBlockers: "What prevents the artifact from being written",
  tasks: "Always an empty array here",
  docs: "Always an empty array here",
});

const PUSHER_SCHEMA = pusherSchema({
  reference: "A card id, commit sha, PR URL or path, or worktree path",
  unmet: "Each operation that could not be performed as declared, and why",
});

type LibraryResult = Infer<typeof CONTEXT_SCHEMA>;
type WriterResult = Infer<typeof WRITER_SCHEMA>;
type PusherResult = Infer<typeof PUSHER_SCHEMA>;

interface Checkpoint {
  draft?: string;
  filed?: string;
}
interface Verdict {
  lens: string;
  result: LensResult;
}
interface AdvisorView {
  name: string;
  judgement: AdvisorResult["judgement"];
  conditions: string[];
}

type BlockedRun = Halted<Checkpoint>;
interface Shaped {
  status: "done";
  workflow: string;
  skipped: string[];
  attempts: Attempt[];
  report: string;
  story: string;
  revision: string;
  verdicts: (Pick<LensResult, "verdict" | "evaluated" | "findings" | "limits"> & { lens: string })[];
  advisors: AdvisorView[];
  filed: string | null;
}

// One shape run: its inputs, the draft it works on, and what it has done so far.
interface Ctx extends RunLog<Checkpoint> {
  readonly idea: string;
  readonly cardArg: string;
  readonly cardId: string;
  readonly slug: string;
  readonly wantFile: boolean;
  readonly answers: Answers;
  readonly where: string;
  readonly draftRel: string;
  readonly draftPath: string;
  readonly settledBlockers: Settled[];
  rev: string;
  openIds: string[];
}

// A card identifier or URL is one token; prose such as "no card found" is not an identifier.
const idOf = (v: string): string => shaped("id", v);

function stop(ctx: Ctx, step: string, needs: readonly Need[]): BlockedRun {
  return halt(NAME, ctx, step, needs);
}

function hasAnswer(ctx: Ctx, id: string): boolean {
  return Object.hasOwn(ctx.answers, id) && String(ctx.answers[id]).trim() !== "";
}

function showLibrary(r: LibraryResult | null): string {
  return r
    ? `### Library\n${r.summary}\nSupported:\n${bullets(r.supported)}\nGaps:\n${bullets(r.gaps)}`
    : "### Library\nThe library-reader did not return: treat this as a gap, not an absence.";
}

// ---- Locate ----------------------------------------------------------------

async function locate(
  ctx: Ctx,
): Promise<{ cardR: ScoutResult | null | undefined; relatedR: ScoutResult | null | undefined }> {
  phase("Locate");
  const readCard = (retry: boolean): Promise<ScoutResult | null> =>
    scout(
      "scout-card",
      `${ctx.where}
${READ_ONLY}

Read the one card this idea starts from: ${ctx.cardArg}. If the project has no board or the card does not exist, report that. The story revision is not needed for this run.

Idea: ${ctx.idea}`,
      { label: retry ? "read card (again)" : "read card", phase: "Locate" },
    );
  const [firstCardR, relatedR] = await parallel([
    () => (ctx.cardArg ? readCard(false) : Promise.resolve(null)),
    () =>
      scout(
        "scout-related-cards",
        `${ctx.where}
${READ_ONLY}

Search the board for cards that duplicate, overlap, conflict with, or depend on this outcome. If the project has no board, report that.

Idea: ${ctx.idea}`,
        { label: "related cards", phase: "Locate" },
      ),
  ]);

  // A scout that returns nothing is not a board with no card: ask once more. The card the args name
  // is the only card to update, whatever the scout reports or the idea mentions; with none named, the
  // File step files a new card.
  const cardR = !firstCardR && ctx.cardArg ? await readCard(true) : firstCardR;
  return { cardR, relatedR };
}

async function readCheckpoint(ctx: Ctx): Promise<ScoutResult | null> {
  let cp: ScoutResult | null = null;
  for (let i = 1; i <= MAX_FAILURES && !cp; i++) {
    cp = await scout(
      "scout-checkpoint",
      `${ctx.where}
${READ_ONLY}

Report where a shape run stands from its durable checkpoints. The run's draft file is ${ctx.draftPath} (under the project's ignored .tmp/ folder). Return one evidence item per key that exists, with source set to the key and excerpt set to its value; omit a key that does not exist.

Keys:
- draft: present only when the draft file exists; its value is its absolute path, then "@", then its git hash-object digest.
- draft-open: the ids of the open decisions still marked in the draft, comma-separated, or "none". Find them with: grep -oE '<!-- (open-decision [a-z0-9-]+|filed [^ ]+)' ${ctx.draftPath}
- draft-filed: the card id from a "filed" marker in the draft, from the same grep; omit when there is no such marker.

Idea: ${ctx.idea}`,
      { label: `checkpoint${i > 1 ? ` (attempt ${i})` : ""}`, phase: "Locate" },
    );
    if (!cp) ctx.attempts.push({ gate: "locate", approach: "scout-checkpoint", failed: "the scout did not return" });
  }
  return cp;
}

// What the checkpoint says of this run's draft. Sets the checkpoint, revision, and open ids it reports.
interface DraftState {
  exists: boolean;
  openFromCheckpoint: string[];
  filed: string;
}
function draftState(ctx: Ctx, cp: ScoutResult): DraftState {
  // A draft exists only when the checkpoint reports "<path>@<digest>" for this run's draft path;
  // a missing-file note, an empty value, or any other prose means there is no draft.
  const draftValue = fact(cp, "draft");
  const draftMatch = parseSpec(draftValue);
  const exists = !!draftMatch && draftMatch.path.endsWith(ctx.draftRel);
  // draft-open's value is its excerpt alone: an empty excerpt means no marker, never the location.
  const openItem = cp.evidence.find((e) => e.source === "draft-open");
  const openValue = openItem ? openItem.excerpt.trim() : "";
  const openFromCheckpoint =
    exists && !absent(openValue)
      ? openValue
          .split(",")
          .map((x) => x.trim())
          .filter((id) => /^[a-z0-9-]+$/.test(id))
      : [];
  const filedValue = fact(cp, "draft-filed");
  const filed = exists ? idOf(filedValue) : "";
  if (exists) ctx.checkpoint.draft = ctx.draftPath;
  if (filed) ctx.checkpoint.filed = filed;

  ctx.rev = exists ? draftMatch.hash : "";
  ctx.openIds = openFromCheckpoint;
  return { exists, openFromCheckpoint, filed };
}

// ---- Gather and advise (a draft already exists: skipped) --------------------

async function gather(
  ctx: Ctx,
  cardR: ScoutResult | null | undefined,
  relatedR: ScoutResult | null | undefined,
): Promise<string> {
  phase("Gather");
  const [lib, docs, code] = await parallel([
    () =>
      agent(
        `${ctx.where}

Report what the project library already supports about this idea, so supported work isn't repeated. Read library/_meta/librarian.md, then the relevant index and wiki pages and the raw notes behind them. Cite each supported claim to its file and heading, and name gaps, stale material, and contested pages. Make no internet requests and no writes. If the project has no library, say so as a gap.

Idea: ${ctx.idea}`,
        { agentType: "slopify:library-reader", label: "library context", phase: "Gather", schema: CONTEXT_SCHEMA },
      ),
    () =>
      scout(
        "scout-docs",
        `${ctx.where}
${READ_ONLY}

Find the documentation and specs that make claims about what this idea covers.

Idea: ${ctx.idea}`,
        { label: "docs", phase: "Gather" },
      ),
    () =>
      scout(
        "scout-code",
        `${ctx.where}
${READ_ONLY}

Find where the product already does or touches this idea: the code locations and call paths.

Idea: ${ctx.idea}`,
        { label: "code", phase: "Gather" },
      ),
  ]);
  const evidenceText = [
    ctx.cardArg ? show("Card", cardR) : "### Card\nNo card was named: this idea starts a new card.",
    show("Related cards", relatedR),
    showLibrary(lib),
    show("Docs", docs),
    show("Code", code),
  ].join("\n\n");
  done(ctx, "gather");
  return evidenceText;
}

interface Advisor {
  name: string;
  run: (p: string, o: FamilyOptions) => Promise<AdvisorResult | null>;
}
const ADVISORS: readonly Advisor[] = [
  { name: "advisor-value", run: (p, o) => advise("advisor-value", p, o) },
  { name: "advisor-scope", run: (p, o) => advise("advisor-scope", p, o) },
  { name: "advisor-alternatives", run: (p, o) => advise("advisor-alternatives", p, o) },
  { name: "advisor-fit", run: (p, o) => advise("advisor-fit", p, o) },
];

// Every advisor's judgement by name, in the order they returned, or the blocked result once one has
// failed to return three times.
async function adviseAll(
  ctx: Ctx,
  evidenceText: string,
): Promise<BlockedRun | { advice: Record<string, AdvisorResult> }> {
  phase("Advise");
  const advice: Record<string, AdvisorResult> = {};
  let waiting = ADVISORS;
  let adviseFailures = 0;
  while (waiting.length > 0) {
    const results = await parallel(
      waiting.map(
        (a) => () =>
          a.run(
            `${ctx.where}
${READ_ONLY}

Judge this idea from your one angle, from the evidence below plus reading the repository. You judge; you do not decide.

Idea: ${ctx.idea}

Evidence:
${evidenceText}`,
            { label: a.name.replace("advisor-", ""), phase: "Advise" },
          ),
      ),
    );
    const missing: Advisor[] = [];
    for (const [i, a] of waiting.entries()) {
      const r = results[i];
      if (r) advice[a.name] = r;
      else missing.push(a);
    }
    waiting = missing;
    if (missing.length === 0) {
      continue;
    }

    adviseFailures += 1;
    ctx.attempts.push({
      gate: "advise",
      approach: "what-and-why advisors",
      failed: `${missing.map((a) => a.name).join(", ")} did not return`,
    });
    if (adviseFailures >= MAX_FAILURES) {
      return stop(ctx, "advise", [
        {
          id: "advise-1",
          kind: "prerequisite",
          what: `A judgement from ${missing.map((a) => a.name).join(", ")}`,
          evidence: "the advisor did not return in three dispatches",
        },
      ]);
    }
  }
  return { advice };
}

// ---- Draft -----------------------------------------------------------------

function draftOk(ctx: Ctx, w: WriterResult): boolean {
  return w.produced.length > 0 && w.produced.every((p) => p.endsWith(ctx.draftRel)) && textOf(w.revision) !== "";
}

function decisionNeeds(ctx: Ctx, ids: readonly string[]): Need[] {
  return ids.map((id) => ({
    id,
    kind: "decision",
    what: `Answer open decision ${id}; its question is in the marker in the draft`,
    evidence: `<!-- open-decision ${id}: … --> in ${ctx.draftPath}`,
  }));
}

// A writer that reports a story blocker, or open decisions that answers doesn't settle while it
// wrote no draft, stops the run at once: retrying could never show the user the reason. Every blocker
// the user has answered goes back to the writer with its answer, from its first dispatch (a fresh writer
// words a blocker differently); one it raises again with no draft stops the run with the answer it got.
function earlyStop(ctx: Ctx, w: WriterResult | null, step: string): BlockedRun | null {
  if (!w) return null;
  const blockers = decisionsOf("draft-blocker", w.storyBlockers);
  const open = blockers.filter((d) => !answerOf(ctx.answers, d.id));
  if (open.length > 0) {
    return stop(
      ctx,
      step,
      open.map((d) => ({
        id: d.id,
        kind: "input",
        what: d.question,
        evidence: "reported by the writer while working on the story",
      })),
    );
  }
  if (draftOk(ctx, w)) return null;
  const unanswered = w.openDecisions.map((x) => x.trim()).filter((id) => id && !hasAnswer(ctx, id));
  const needs: Need[] = [
    ...blockers.map((d): Need => ({
      id: d.id,
      kind: "input",
      what: d.question,
      evidence: `raised again after the writer was given the answer "${answerOf(ctx.answers, d.id)}"; give an answer that resolves it`,
    })),
    ...(unanswered.length > 0 ? decisionNeeds(ctx, unanswered) : []),
  ];
  return needs.length > 0 ? stop(ctx, step, needs) : null;
}

// Take a good draft's revision and the ids it still marks open.
function accept(ctx: Ctx, w: WriterResult): void {
  ctx.rev = textOf(w.revision);
  ctx.openIds = w.openDecisions.map((s) => s.trim()).filter(Boolean);
}

// Marked open decisions that answers doesn't settle block the run; settled ones go to a writer
// that applies the answers. Returns a blocked result, or null once no decision is open.
async function settle(ctx: Ctx): Promise<BlockedRun | null> {
  let resolves = 0;
  while (ctx.openIds.length > 0) {
    const unanswered = ctx.openIds.filter((id) => !hasAnswer(ctx, id));
    if (unanswered.length > 0) {
      return stop(ctx, "draft", decisionNeeds(ctx, unanswered));
    }
    if (resolves >= MAX_FAILURES) {
      return stop(ctx, "draft", [
        {
          id: "draft-resolve",
          kind: "validation",
          what: `The writer to apply the answers for ${ctx.openIds.join(", ")} in the draft`,
          evidence: "the markers were still open after three resolving dispatches",
        },
      ]);
    }
    resolves += 1;
    const given = ctx.openIds.map((id) => `- ${id}: ${String(ctx.answers[id])}`).join("\n");
    const w = await agent(
      `Address files by absolute path.
${PRODUCER_BOUNDS}

Resolve the open decisions in the story draft at ${ctx.draftPath}, and write only that file. Apply each answer below in the draft, remove that decision's marker line, and report in openDecisions the ids that are still marked. Return in revision the git hash-object digest of the draft, and in produced its absolute path. Return tasks and docs as empty arrays.

Answers:
${given}${settledText(ctx.settledBlockers)}`,
      {
        agentType: "slopify:writer",
        label: `resolve ${ctx.openIds.join(" ")}`,
        phase: "Draft",
        schema: WRITER_SCHEMA,
      },
    );
    const earlyResolve = earlyStop(ctx, w, "draft");
    if (earlyResolve) return earlyResolve;
    if (!w || !draftOk(ctx, w)) {
      ctx.attempts.push({
        gate: "draft",
        approach: `resolve ${ctx.openIds.join(", ")}`,
        failed: "the writer did not return a draft revision at the draft path",
      });
      continue;
    }
    accept(ctx, w);
  }
  return null;
}

// The writer drafts the story; a blocked result when it cannot, null once the draft is written.
async function draftStory(ctx: Ctx, evidenceText: string): Promise<BlockedRun | null> {
  let draftFailures = 0;
  for (;;) {
    const w = await agent(
      `Address files by absolute path.
${PRODUCER_BOUNDS}

Write the story for this idea at ${ctx.draftPath}, and write only that file (create its folder if needed). Use the card shape the project's board declaration gives: problem and outcome, scope and exclusions, observable acceptance criteria, dependencies, and evidence. State the problem, outcome, scope, and criteria, never how to build them. Write no spec and no approach. Synthesize the advisors' views: say in the story what you adopted and why, and what you set aside and why.

Decide anything that does not change the story's outcome (naming, types, edge cases with an obvious default) yourself, and record it in the draft as a labelled assumption (a line starting "Assumption:"). Mark an open decision only for a choice that changes what the story delivers or whom it serves and that the evidence cannot settle: one line in the draft, <!-- open-decision <id>: <question> -->, with id matching [a-z0-9-]+, and return the same ids in openDecisions. Put anything that stops a story from being written in storyBlockers. Return in revision the git hash-object digest of the draft, and in produced its absolute path. Return tasks and docs as empty arrays.

Idea: ${ctx.idea}

Evidence:
${evidenceText}${settledText(ctx.settledBlockers)}`,
      {
        agentType: "slopify:writer",
        label: draftFailures ? `draft story (attempt ${draftFailures + 1})` : "draft story",
        phase: "Draft",
        schema: WRITER_SCHEMA,
      },
    );
    const early = earlyStop(ctx, w, "draft");
    if (early) return early;
    if (w && draftOk(ctx, w)) {
      accept(ctx, w);
      ctx.checkpoint.draft = ctx.draftPath;
      return null;
    }
    draftFailures += 1;
    ctx.attempts.push({
      gate: "draft",
      approach: "writer story draft",
      failed: w ? "the writer wrote outside the draft path or returned no revision" : "the writer did not return",
    });
    if (draftFailures >= MAX_FAILURES) {
      return stop(ctx, "draft", [
        {
          id: "draft-1",
          kind: "validation",
          what: `A story draft written at ${ctx.draftPath} with a revision`,
          evidence: "the writer did not produce one in three dispatches",
        },
      ]);
    }
  }
}

// ---- Validate --------------------------------------------------------------

// Both lenses on the current revision, or the blocked result when either gave no verdict on it.
async function judge(ctx: Ctx, round: number): Promise<BlockedRun | [LensResult, LensResult]> {
  const [crit, free] = await parallel([
    () =>
      lensOn(
        ctx,
        "lens-criteria",
        `${ctx.where}

Judge the story draft at ${ctx.draftPath}, revision ${ctx.rev}. Judge that exact revision only, and name it as evaluated.`,
        ctx.rev,
        { label: `criteria (round ${round})`, phase: "Validate" },
      ),
    () =>
      lensOn(
        ctx,
        "lens-solution-free",
        `${ctx.where}

Judge the story draft at ${ctx.draftPath}, revision ${ctx.rev}. Judge that exact revision only, and name it as evaluated.`,
        ctx.rev,
        { label: `solution-free (round ${round})`, phase: "Validate" },
      ),
  ]);
  if (!crit || !free) {
    return stop(ctx, "validate", [
      {
        id: "validate-1",
        kind: "validation",
        what: `A verdict on revision ${ctx.rev} from ${[!crit && "lens-criteria", !free && "lens-solution-free"].filter(Boolean).join(" and ")}`,
        evidence: "three dispatches returned no verdict or a verdict on another revision",
      },
    ]);
  }
  return [crit, free];
}

// The writer revises from the findings; the next round judges the new revision. Failures count
// against the validate gate.
async function revise(
  ctx: Ctx,
  bad: readonly string[],
  round: number,
  gate: { failures: number },
): Promise<BlockedRun | null> {
  for (;;) {
    const w = await agent(
      `Address files by absolute path.
${PRODUCER_BOUNDS}

Revise the story draft at ${ctx.draftPath} (revision ${ctx.rev}) to resolve the findings below, and write only that file. Keep the problem, outcome, and scope the story already states; state no implementation. Keep any open-decision marker you do not settle, and decide anything that does not change the story's outcome yourself as a labelled assumption. Return in revision the git hash-object digest of the revised draft, in produced its absolute path, and in openDecisions the ids still marked. Return tasks and docs as empty arrays.

Findings:
${bad.join("\n\n")}${settledText(ctx.settledBlockers)}`,
      {
        agentType: "slopify:writer",
        label: `revise story (round ${round})`,
        phase: "Validate",
        schema: WRITER_SCHEMA,
      },
    );
    const earlyRevise = earlyStop(ctx, w, "validate");
    if (earlyRevise) return earlyRevise;
    if (w && draftOk(ctx, w)) {
      accept(ctx, w);
      return null;
    }
    gate.failures += 1;
    ctx.attempts.push({
      gate: "validate",
      approach: "writer revision of the story draft",
      failed: w ? "the writer wrote outside the draft path or returned no revision" : "the writer did not return",
    });
    if (gate.failures >= MAX_FAILURES) {
      return stop(ctx, "validate", [
        {
          id: "validate-1",
          kind: "validation",
          what: "A revised story draft for the lenses to judge",
          evidence: bad.join("\n"),
        },
      ]);
    }
  }
}

// Judge, revise, and judge again until both lenses pass: the passing verdicts, or the blocked result.
async function validate(ctx: Ctx): Promise<BlockedRun | Verdict[]> {
  phase("Validate");
  const gate = { failures: 0 };
  for (let round = 1; ; round++) {
    const judged = await judge(ctx, round);
    if (!Array.isArray(judged)) return judged;
    const [crit, free] = judged;
    const verdicts = [
      { lens: "lens-criteria", result: crit },
      { lens: "lens-solution-free", result: free },
    ];
    const bad = [...problems("lens-criteria", crit), ...problems("lens-solution-free", free)];
    if (bad.length === 0) return verdicts;
    gate.failures += 1;
    ctx.attempts.push({ gate: "validate", approach: `story draft revision ${ctx.rev}`, failed: bad.join("; ") });
    if (gate.failures >= MAX_FAILURES) {
      return stop(ctx, "validate", [
        {
          id: "validate-1",
          kind: "validation",
          what: "A story draft that lens-criteria and lens-solution-free both pass",
          evidence: bad.join("\n"),
        },
      ]);
    }
    const revised = await revise(ctx, bad, round, gate);
    if (revised) return revised;
    const blockedOnDecision = await settle(ctx);
    if (blockedOnDecision) return blockedOnDecision;
  }
}

// ---- File ------------------------------------------------------------------

// A pusher that reports an unmet operation stops the run.
function unmetStop(ctx: Ctx, p: PusherResult): BlockedRun {
  ctx.attempts.push({ gate: "file", approach: "pusher card filing", failed: p.unmet.join("; ") });
  // The card operation can succeed and a later step fail: name the cause that is true.
  const made = p.operations.find((o) => o.reference && o.reference !== ctx.draftPath);
  if (made) {
    ctx.checkpoint.filed = made.reference;
    return stop(ctx, "file", [
      {
        id: "file-1",
        kind: "prerequisite",
        what: `The "filed" marker appended to ${ctx.draftPath}: card ${made.reference} was filed, but a step after it failed`,
        evidence: p.unmet.join("; "),
      },
    ]);
  }
  return stop(ctx, "file", [
    {
      id: "file-1",
      kind: "prerequisite",
      what: "A board declaration that binds creating or updating a story card",
      evidence: p.unmet.join("; "),
    },
  ]);
}

// The pusher's brief: file the draft as a card, updating the card the run started from.
function filePrompt(ctx: Ctx): string {
  const cardLine = ctx.cardId
    ? `The idea came from the existing card ${ctx.cardId}: update that card with the story.`
    : "The idea came from no existing card: create a card for the story.";
  return `${ctx.where}

Authorization: the user invoked the shape workflow with file: true, which authorizes exactly this: file the story below as a card, through the project's board declaration (docs/BOARD.md), then append the filed marker to the draft. Perform no other operation: no commit, branch, worktree, push, pull request, review trigger, merge, or message, and no change to any other card. Work exactly as the board declaration binds it; report an operation that is not bound, or a project with no board, in unmet, and improvise nothing.

File the story at ${ctx.draftPath}, revision ${ctx.rev}, exactly as written; change no word of it. Add one trailing line to the card body, <!-- shape-draft ${ctx.slug} -->, which is not part of the story and lets a rerun find this card. ${ctx.cardId ? "" : `Before creating, search the board for a card whose body holds that line; if one exists, it is this story's card: update it instead of creating another. `}${cardLine}

The moment the card operation succeeds, and before anything else that can fail (a read-back, a label, a status), append the line <!-- filed <card id> --> to the end of the draft. Return the card operation first in operations, with the card id as its reference. When there is no board, perform nothing and return the draft path in unmet.`;
}

// The pusher files or updates the story card: the card reference, or the blocked result.
async function fileCard(ctx: Ctx): Promise<BlockedRun | { filed: string }> {
  phase("File");
  let pusherFailures = 0;
  for (;;) {
    const p = await agent(filePrompt(ctx), {
      agentType: "slopify:pusher",
      label: pusherFailures ? `file story card (attempt ${pusherFailures + 1})` : "file story card",
      phase: "File",
      schema: PUSHER_SCHEMA,
    });
    if (p && p.unmet.length > 0) return unmetStop(ctx, p);
    if (p?.done && p.operations.length > 0) {
      const op = p.operations.find((o) => o.reference) ?? p.operations[0];
      const filed = op?.reference || "filed";
      ctx.checkpoint.filed = filed;
      return { filed };
    }
    pusherFailures += 1;
    ctx.attempts.push({
      gate: "file",
      approach: "pusher card filing",
      failed: p ? "the pusher reported the filing as not done" : "the pusher did not return",
    });
    if (pusherFailures >= MAX_FAILURES) {
      return stop(ctx, "file", [
        {
          id: "file-1",
          kind: "prerequisite",
          what: "The story card filed through the board declaration",
          evidence: "the pusher did not complete it in three dispatches",
        },
      ]);
    }
  }
}

function shapedResult(
  ctx: Ctx,
  verdicts: readonly Verdict[],
  advisorViews: AdvisorView[],
  filed: string | null,
): Shaped {
  const criteriaVerdict = verdicts.find((v) => v.lens === "lens-criteria")?.result;
  const report = [
    `Advisors: ${advisorViews.length > 0 ? advisorViews.map((a) => `${a.name.replace("advisor-", "")} ${a.judgement}`).join("; ") : "not run (a draft already existed)"}`,
    criteriaVerdict
      ? `lens-criteria: ${criteriaVerdict.verdict} at revision ${ctx.rev}`
      : `lens-criteria: not run (the draft was already filed at revision ${ctx.rev})`,
    `Story draft: ${ctx.draftPath}`,
    filed ? `Filed: ${filed}` : "Filed: no (file was not requested)",
  ].join("\n");

  return {
    status: "done",
    workflow: NAME,
    skipped: ctx.skipped,
    attempts: ctx.attempts,
    report,
    story: ctx.draftPath,
    revision: ctx.rev,
    verdicts: verdicts.map((v) => ({
      lens: v.lens,
      verdict: v.result.verdict,
      evaluated: v.result.evaluated,
      findings: v.result.findings,
      limits: v.result.limits,
    })),
    advisors: advisorViews,
    filed,
  };
}

function contextOf(input: Input, idea: string): Ctx {
  const cardArg = textOf(input["card"]);
  const projectRoot = withoutTrailing(textOf(input["projectRoot"]), "/");
  const answers = answersOf(input["answers"]);
  const cardId = idOf(cardArg);
  const slug = slugify(cardId) || slugged(idea, "idea");
  const draftRel = `.tmp/shape/${slug}.md`;
  return {
    idea,
    cardArg,
    cardId,
    slug,
    wantFile: input["file"] === true,
    answers,
    where: whereOf(projectRoot),
    draftRel,
    draftPath: projectRoot ? `${projectRoot}/${draftRel}` : draftRel,
    settledBlockers: answeredBlockers("draft-blocker", answers),
    completed: [],
    skipped: [],
    attempts: [],
    checkpoint: {},
    rev: "",
    openIds: [],
  };
}

// Gather the evidence and the advisors' judgements for a new draft, or skip both when a draft exists.
async function evidenceFor(
  ctx: Ctx,
  draftExists: boolean,
  located: Awaited<ReturnType<typeof locate>>,
): Promise<BlockedRun | { evidenceText: string; advisorViews: AdvisorView[] }> {
  const advisorViews: AdvisorView[] = [];
  if (draftExists) {
    skip(ctx, "gather");
    skip(ctx, "advise");
    return { evidenceText: "", advisorViews };
  }
  const evidenceText = await gather(ctx, located.cardR, located.relatedR);
  const advised = await adviseAll(ctx, evidenceText);
  if ("status" in advised) return advised;
  const { advice } = advised;
  for (const a of ADVISORS) {
    const r = advice[a.name];
    if (r) advisorViews.push({ name: a.name, judgement: r.judgement, conditions: r.conditions });
  }
  done(ctx, "advise");
  return { evidenceText: `${evidenceText}\n\n### Advisors\n${JSON.stringify(advice, null, 2)}`, advisorViews };
}

// Draft the story when none exists, then settle its open decisions.
async function writeDraft(ctx: Ctx, draft: DraftState, evidenceText: string): Promise<BlockedRun | null> {
  phase("Draft");
  if (!draft.exists) {
    const unwritten = await draftStory(ctx, evidenceText);
    if (unwritten) return unwritten;
  }
  const blockedOnDecision = await settle(ctx);
  if (blockedOnDecision) return blockedOnDecision;
  if (draft.exists && draft.openFromCheckpoint.length === 0) skip(ctx, "draft");
  else done(ctx, "draft");
  return null;
}

export default async function run(): Promise<NotStarted | BlockedRun | Shaped> {
  const started = startInput(
    args,
    "idea",
    "Ask the user for the idea, problem, or evidence to shape, then invoke again.",
  );
  if ("status" in started) return started;

  const ctx = contextOf(started.input, started.subject);
  const located = await locate(ctx);
  const cp = await readCheckpoint(ctx);
  if (!cp) {
    return stop(ctx, "locate", [
      {
        id: "locate-1",
        kind: "prerequisite",
        what: "A scout-checkpoint report of the draft file, so a rerun never overwrites an existing draft",
        evidence: "scout-checkpoint did not return in three dispatches",
      },
    ]);
  }
  done(ctx, "locate");
  const draft = draftState(ctx, cp);

  const gathered = await evidenceFor(ctx, draft.exists, located);
  if ("status" in gathered) return gathered;

  const unwritten = await writeDraft(ctx, draft, gathered.evidenceText);
  if (unwritten) return unwritten;

  // A filed draft is not judged or revised again: the card already holds this story, and a revision here
  // would leave the card behind the draft.
  let verdicts: Verdict[] = [];
  if (draft.filed) skip(ctx, "validate");
  else {
    const validated = await validate(ctx);
    if (!Array.isArray(validated)) return validated;
    verdicts = validated;
    done(ctx, "validate");
  }

  let filed = draft.filed || null;
  if (draft.filed) skip(ctx, "file");
  else if (ctx.wantFile) {
    const card = await fileCard(ctx);
    if ("status" in card) return card;
    filed = card.filed;
    done(ctx, "file");
  }

  return shapedResult(ctx, verdicts, gathered.advisorViews, filed);
}
