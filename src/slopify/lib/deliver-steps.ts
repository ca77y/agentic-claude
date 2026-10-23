// The steps deliver-story and deliver-bugfix share around their own: reading the card and the checkpoint, the
// workspace, the spec loop and its gate, judging a candidate, the implementation commit, publishing, and the review.
import type { ReviewPrResult } from "../workflows/review-pr.ts";
import {
  STRINGS,
  scout,
  lens,
  fact,
  absent,
  shaped,
  parseSpec,
  type Answers,
  type Decision,
  type Need,
  type ScoutResult,
} from "./family.ts";
import {
  dirtyEntry,
  need,
  decisionNeed,
  list,
  slugOf,
  val,
  isRel,
  splitList,
  unique,
  passed,
  blockingOf,
  findingText,
  pushOk,
  opRef,
  callPusher,
  parseDoneSpec,
  parseDoneImplement,
  parseDonePublish,
  parseDoneBoard,
  type BlockingFinding,
  type Deliver,
  type Plan,
  type Stopped,
  type Validator,
} from "./deliver.ts";

type Run = Deliver<"spec" | "implementation">;

export const WRITER_SCHEMA = {
  type: "object",
  required: ["produced", "revision", "openDecisions", "storyBlockers", "tasks", "docs"],
  properties: {
    produced: { ...STRINGS, description: "Absolute paths written" },
    revision: {
      type: "string",
      description: "git hash-object of the main artifact",
    },
    openDecisions: {
      ...STRINGS,
      description: "Decisions only the user can make; empty when none",
    },
    storyBlockers: {
      ...STRINGS,
      description: "Reasons the story is unbuildable or a criterion is wrong as stated; empty when none",
    },
    tasks: {
      type: "array",
      description: "Spec only: the tasks, with disjoint paths; empty otherwise",
      items: {
        type: "object",
        required: ["id", "summary", "paths"],
        properties: {
          id: { type: "string" },
          summary: { type: "string" },
          paths: {
            ...STRINGS,
            description: "Files or directories the task may write, relative to the worktree root, no globs",
          },
        },
      },
    },
    docs: {
      ...STRINGS,
      description: "Spec only: documentation files to update, relative to the worktree root; empty otherwise",
    },
  },
} as const;

export type WriterResult = Infer<typeof WRITER_SCHEMA>;
/** review-pr's finished result, which a delivery returns as its review. */
export type ReviewDone = Extract<ReviewPrResult, { status: "done" }>;
type Gated = { stop: Stopped } | { carry: string[] } | null;

export const inTmp = (p: string): boolean => /^\.tmp(?:\/|$)/.test(p);
const sameHash = (a: string, b: string): boolean => !!a && !!b && (a.startsWith(b) || b.startsWith(a));

// ---- Locate -----------------------------------------------------------------

/** How a delivery names its input when it is missing. */
interface StoryAsk {
  readable: string;
  input: string;
  arg: string;
  criteria: boolean;
}
interface Story {
  storySource: string;
  story: string;
  storyRevision: string;
}
interface Located extends Story {
  cardId: string;
  boardBranch: string;
  slug: string;
  specRel: string;
}

// The story scout-card read, or the need that stops the run without one.
function readStory(cardRes: ScoutResult, storyArg: string, ask: StoryAsk): Story | { need: Need } {
  const storySource = (/^\s*(card|text|none)\b/i.exec(fact(cardRes, "story-source"))?.[1] || "").toLowerCase();
  const story = storySource === "text" ? storyArg : fact(cardRes, "story");
  const storyRevision = shaped("sha", fact(cardRes, "story-revision"));
  if (!story || storySource === "none") {
    return {
      need: {
        ...need("locate", 1, "input", ask.input, cardRes.gaps.join("; ") || cardRes.answer),
        arg: ask.arg,
      },
    };
  }
  if (!storyRevision) {
    return { need: need("locate", 1, "prerequisite", "The story revision digest from scout-card.", cardRes.answer) };
  }
  if (ask.criteria) {
    const criteria = fact(cardRes, "criteria");
    // Only a bare "none" reply means no criteria; a criterion that opens with "Missing ..." is one.
    if (absent(criteria, true) && !criteria.trim().includes("\n")) {
      return {
        need: need(
          "locate",
          1,
          "story",
          "The story states no acceptance criteria; it needs observable ones from shape.",
          cardRes.answer,
        ),
      };
    }
  }
  return { storySource, story, storyRevision };
}

// The spec path, relative to the worktree root: the board's, else one built from the card identifier and the
// card title's lowercase kebab slug.
function specRelOf(cardRes: ScoutResult, cardId: string, storySource: string, story: string, slug: string): string {
  // The card title is the first line of a card-backed story; its lowercase kebab slug names the spec.
  const titleSlug = (storySource === "card" ? (story.split("\n", 1)[0] ?? "").replace(/^#+\s*/, "") : "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short line from a scout
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 60)
    // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short line from a scout
    .replace(/-+$/, "");
  return (
    [shaped("rel", val(cardRes, "spec-path"))].find((p) => p.endsWith(".md")) ||
    `docs/specs/${
      [
        cardId
          .toLowerCase()
          .replaceAll(/[^a-z0-9]+/g, "-")
          // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short line from a scout
          .replaceAll(/^-+|-+$/g, ""),
        titleSlug,
      ]
        .filter(Boolean)
        .join("-") || slug
    }.md`
  );
}

// What scout-card read: the story, the card, and the names built from them, or the stop without a story.
export function locate(
  d: Run,
  cardRes: ScoutResult | null,
  storyArg: string,
  fallbackSlug: string,
  ask: StoryAsk,
): Located | { stop: Stopped } {
  if (!cardRes) {
    return {
      stop: d.stop("locate", [need("locate", 1, "prerequisite", ask.readable, "scout-card did not return")]),
    };
  }
  const read = readStory(cardRes, storyArg, ask);
  if ("need" in read) return { stop: d.stop("locate", [read.need]) };
  const cardId = shaped("id", val(cardRes, "card"));
  const boardBranch = shaped("branch", val(cardRes, "branch"));
  const slug = slugOf(cardId) || fallbackSlug;
  const specRel = specRelOf(cardRes, cardId, read.storySource, read.story, slug);
  return { ...read, cardId, boardBranch, slug, specRel };
}

interface CheckpointAsk {
  /** What the run delivers, as the checkpoint brief names it. */
  delivery: string;
  boardBranch: string;
  /** The spec path as the checkpoint brief names it. */
  specNoun: string;
  specRel: string;
  tests: boolean;
}

// Ask scout-checkpoint where this run stands.
function readCheckpoint(d: Run, o: CheckpointAsk): Promise<ScoutResult | null> {
  return scout(
    "scout-checkpoint",
    `${d.WHERE}
Report where this run stands. It is the delivery of ${o.delivery}${o.boardBranch ? `; the board gives the branch name ${o.boardBranch}` : ""}. ${o.specNoun}, relative to the worktree root, is ${o.specRel}.
Report these keys, each as an evidence item with source set to the key; leave out a key that does not exist:
- worktree, branch, head, dirty (comma-separated paths relative to the worktree root, or none), ledger
- ledger-story: the story revision on the last done spec line${o.tests ? "\n- ledger-test: the comma-separated test paths on the most recent done spec line that has a test field" : ""}
- done-spec, done-implement, done-publish, done-board-start, done-board-pr: the last ledger line of that name ("done board-start" and "done board-pr" lines name the card or the PR), with its leading timestamp removed and the ledger line number put in front as "<line number>|"
- review-fired, review-ended
- ledger-exclude: the paths after the word "exclude" on the last ledger line whose text, after its leading timestamp, starts with that word, comma-separated, or none
- spec: "<absolute path>@<git hash-object>" of the spec at the path above
- pr: the PR reference on the first line, then its description`,
    { label: "read checkpoints", phase: "Locate" },
  );
}

// Read the checkpoint, then take the worktree, branch, ledger, PR, and spec from it; returns the dirty paths that
// count.
export async function checkpoint(
  d: Run,
  o: CheckpointAsk,
): Promise<{ stop: Stopped } | { cp: ScoutResult; dirty: string[] }> {
  const cp = await readCheckpoint(d, o);

  if (!cp) {
    return {
      stop: d.stop("locate", [
        need(
          "locate",
          1,
          "prerequisite",
          "The run's checkpoints, to know which steps are complete.",
          "scout-checkpoint did not return",
        ),
      ]),
    };
  }
  const { state, rel } = d;
  const cpWorktree = shaped("path", val(cp, "worktree"));
  // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short line from a scout
  if (cpWorktree.startsWith("/")) state.worktree = cpWorktree.replace(/\/+$/, "");
  state.branch = shaped("branch", val(cp, "branch")) || o.boardBranch;
  state.ledger = shaped("path", val(cp, "ledger"));
  state.pr = shaped("ref", val(cp, "pr"));
  // Only the story worktree's dirty paths count: before it exists a scout can only see the main checkout's.
  const dirty = state.worktree
    ? splitList(fact(cp, "dirty"))
        .flatMap((x) => dirtyEntry(x))
        .map((p) => rel(p))
        .filter((p) => isRel(p) && !inTmp(p))
    : [];
  // Only the story worktree's copy of the spec counts. Before the worktree exists a scout can only
  // report the main checkout's copy, and a path outside the worktree is another file.
  const cpSpecRaw = parseSpec(val(cp, "spec"));
  const cpSpec =
    cpSpecRaw && state.worktree
      ? {
          ...cpSpecRaw,
          path: cpSpecRaw.path.startsWith("/") ? cpSpecRaw.path : `${state.worktree}/${rel(cpSpecRaw.path)}`,
        }
      : null;
  if (cpSpec?.path.startsWith(state.worktree + "/")) {
    state.specPath = cpSpec.path;
    state.specHash = cpSpec.hash;
    state.specExists = true;
  }
  return { cp, dirty };
}

// Which steps the checkpoint shows complete for this story and spec. With tests, a done spec also names the
// committed regression test, and the spec is current only with one.
export function currencyOf(d: Run, cp: ScoutResult, o: { cardId: string; storyRevision: string; tests: boolean }) {
  const { state, rel } = d;
  const { cardId } = o;
  const doneSpec = parseDoneSpec(val(cp, "done-spec"));
  const doneImpl = parseDoneImplement(val(cp, "done-implement"));
  const donePub = parseDonePublish(val(cp, "done-publish"));
  // The checkpoint reads the PR through the forge; when it cannot, the ledger's publish line names it.
  if (!state.pr && donePub) state.pr = donePub.pr;
  // A board operation counts once its ledger line exists; with no card there is none to do.
  const boardStartDone = !cardId || !!parseDoneBoard(val(cp, "done-board-start"), "start");
  const boardPrDone = !cardId || !!parseDoneBoard(val(cp, "done-board-pr"), "pr");
  const ledgerStory = shaped("sha", val(cp, "ledger-story")) || (doneSpec ? doneSpec.story : "");

  // The currency chain: each link depends on the one before it.
  // A done spec line written after a spec revision may omit the test; an earlier line then knows it.
  const ledgerTests = o.tests
    ? (doneSpec?.test || val(cp, "ledger-test"))
        .split(",")
        .map((t) => rel(t.trim()))
        .filter((t) => isRel(t))
    : [];
  // Once the PR is published, a rerun goes straight to the review: a spec or story revised since then
  // belongs to the review loop, not to a redo of the steps before the publish.
  const published = !!donePub && !!state.pr && !!state.worktree;
  const specCurrent =
    published ||
    (!!doneSpec &&
      (!o.tests || ledgerTests.length > 0) &&
      state.specExists &&
      sameHash(doneSpec.hash, state.specHash) &&
      !!ledgerStory &&
      sameHash(ledgerStory, o.storyRevision));
  const implCurrent = published || (specCurrent && !!doneImpl && sameHash(doneImpl.spec, state.specHash));
  const publishCurrent =
    published || (implCurrent && !!donePub && !!doneImpl && (doneImpl.pushed || doneImpl.n < donePub.n));
  return { doneSpec, doneImpl, ledgerTests, boardStartDone, boardPrDone, specCurrent, implCurrent, publishCurrent };
}

// Dirty paths an earlier run found outside its assigned paths, read back from the ledger.
export function excludedOf(d: Run, cp: ScoutResult): string[] {
  return splitList(val(cp, "ledger-exclude"))
    .map((p) => d.rel(p))
    .filter((p) => isRel(p) && !inTmp(p));
}

// ---- Workspace --------------------------------------------------------------

interface WorkspaceOpts {
  cardId: string;
  boardBranch: string;
  boardStartDone: boolean;
  specRel: string;
  /** The worktree as the briefs name it. */
  worktree: string;
  /** What the worktree is declared for. */
  subject: string;
}

// Create or recover the worktree; the same dispatch starts the card.
async function createWorktree(d: Run, o: WorkspaceOpts): Promise<Stopped | null> {
  const { state, stop, done, pushBrief, pushStop } = d;
  const { cardId, boardBranch } = o;
  const r = await callPusher(
    pushBrief(
      `Create or recover ${o.worktree} and branch that docs/FORGE.md declares for ${o.subject}${boardBranch ? ` (the board gives the branch name ${boardBranch})` : ""}. ${cardId ? "Then perform the delivery-start operation docs/BOARD.md declares for the card (for example its status transition), only as bound." : "There is no card, so perform no board operation."} Change no card content. Append the board-start line only once the delivery-start operation is done.`,
      cardId ? [`done board-start ${cardId}`] : [],
      "<worktree>/.tmp/ledger.md at the root of the worktree you create or recover",
    ),
    "create the worktree",
    "Workspace",
  );
  if (!pushOk(r)) return pushStop("workspace", r);
  const wt = opRef(r, "worktree");
  if (!wt.startsWith("/")) {
    return stop("workspace", [
      need("workspace", 1, "prerequisite", `The absolute path of ${o.worktree}.`, JSON.stringify(r.operations)),
    ]);
  }
  // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short path from pusher
  state.worktree = wt.replace(/\/+$/, "");
  state.branch = opRef(r, "branch") || state.branch;
  done("workspace");
  return null;
}

export async function workspace(d: Run, o: WorkspaceOpts): Promise<Stopped | null> {
  const { state, done, skip, pushBrief, pushStop } = d;
  const { cardId } = o;
  phase("Workspace");
  let boardStartRecorded = false; // the create dispatch records the board operation in the same dispatch
  if (state.worktree) {
    skip("workspace");
  } else {
    const created = await createWorktree(d, o);
    if (created) return created;
    boardStartRecorded = !!cardId;
  }
  // The delivery-start board operation follows the worktree; a rerun that finds the worktree but no
  // ledger line for the operation does it now, since it may have failed after the worktree was made.
  if (!o.boardStartDone && !boardStartRecorded) {
    const b = await callPusher(
      pushBrief(
        `Perform the delivery-start operation docs/BOARD.md declares for card ${cardId} (for example its status transition), only as bound and only if the card does not already show it. Do nothing else, and change no card content.`,
        [`done board-start ${cardId}`],
      ),
      "start the card",
      "Workspace",
    );
    if (!pushOk(b)) return pushStop("workspace", b);
    done("board-start");
  }
  if (!state.ledger) state.ledger = `${state.worktree}/.tmp/ledger.md`;
  if (!state.specPath) state.specPath = `${state.worktree}/${o.specRel}`;
  return null;
}

// ---- Spec -------------------------------------------------------------------

interface SpecLoop {
  draft: (pending: readonly string[]) => Promise<{ res: WriterResult | null; open: Decision[] }>;
  /** The retry reason for a draft without usable tasks. */
  tasksProblem: string;
  accept: (revision: string, plan: Plan) => void;
  gate: (plan: Plan, carry: readonly string[]) => Promise<Gated>;
  commit: () => Promise<Stopped | null>;
}

// A spec draft's story blockers or open decisions stop the run.
function draftStop(d: Run, w: WriterResult, open: readonly Decision[]): Stopped | null {
  if (w.storyBlockers.length > 0) {
    return d.stop(
      "spec",
      w.storyBlockers.map((b, i) => need("spec", i + 1, "story", b, "reported by the spec writer")),
    );
  }
  return open.length > 0
    ? d.stop(
        "spec",
        open.map((dec) => decisionNeed(dec, "the spec writer")),
      )
    : null;
}
// What is wrong with a spec draft, to retry with; '' when it is usable.
function draftProblem(d: Run, w: WriterResult | null, tasksProblem: string): string {
  if (!w) return "the writer did not return";
  if (!w.revision) return "the writer returned no spec revision";
  if (w.produced.every((p) => d.rel(p) !== d.rel(d.state.specPath)))
    return `the writer did not write the spec at ${d.state.specPath}`;
  return w.tasks.length === 0 || w.tasks.some((t) => t.paths.length === 0) ? tasksProblem : "";
}

// Write or revise the spec, then have fresh lenses judge that exact revision, then commit it.
export async function specGate(d: Run, findings: readonly string[], o: SpecLoop): Promise<Stopped | null> {
  const { state, rel, done, fail, exhausted } = d;
  // carry: the findings the next draft must resolve (the lenses' or the caller's). pending adds
  // what went wrong with the last attempt, and never replaces carry.
  let carry = findings;
  let pending = carry;
  for (;;) {
    phase("Spec");
    const { res: w, open } = await o.draft(pending);
    const blockedDraft = w ? draftStop(d, w, open) : null;
    if (blockedDraft) return blockedDraft;
    const problem = draftProblem(d, w, o.tasksProblem);
    if (problem || !w) {
      pending = [...carry, problem];
      if (fail("spec", "spec draft", problem)) return exhausted("spec", "spec");
      continue;
    }
    state.specExists = true;
    const drafted: Plan = {
      tasks: w.tasks.map((t) => ({ ...t, paths: t.paths.map((p) => rel(p)) })),
      docs: w.docs.map((p) => rel(p)),
    };
    o.accept(w.revision, drafted);
    done("spec");
    const gate = await o.gate(drafted, carry);
    if (gate && "stop" in gate) return gate.stop;
    if (gate) {
      carry = gate.carry;
      pending = carry;
      continue;
    }
    return o.commit();
  }
}

// Judge with the validators and record each verdict; findings is null when every validator passed.
async function judged(
  d: Run,
  items: readonly Validator[],
  revision: string,
  step: string,
): Promise<{ stop: Stopped } | { findings: BlockingFinding[] | null }> {
  const j = await d.judge(items, revision, step);
  if (j.stop) return { stop: j.stop };
  const verdicts = j.verdicts;
  for (const [i, item] of items.entries()) d.record(item.name, verdicts[i], revision);
  return {
    findings: verdicts.every((x) => passed(x)) ? null : items.flatMap((item, i) => blockingOf(item.name, verdicts[i])),
  };
}

interface SpecLenses {
  revision: string;
  carry: readonly string[];
  storyBlock: string;
  /** The opening of the briefs' worktree sentence. */
  worktree: string;
  /** What lens-scope judges. */
  scope: string;
  consistency: boolean;
}

// Fresh lenses judge the spec revision. Returns null when they pass, else the findings to carry or the stop.
export async function lensGate(d: Run, o: SpecLenses): Promise<Gated> {
  const { WHERE, state, fail, exhausted } = d;
  const { revision, carry } = o;
  phase("Spec gate");
  const brief = (what: string): string => `${WHERE}
${o.worktree} is ${state.worktree}. ${what}
Spec: ${state.specPath}, revision ${revision}. Set evaluated to exactly that revision.

${o.storyBlock}${carry.length > 0 ? `\n\nEarlier findings to recheck:\n${list(carry)}` : ""}`;
  const items: Validator[] = [
    {
      name: "lens-scope",
      call: () => lens("lens-scope", brief(o.scope), { label: "scope", phase: "Spec gate" }),
    },
  ];
  if (o.consistency)
    items.push({
      name: "lens-consistency",
      call: () =>
        lens(
          "lens-consistency",
          brief("Judge whether the spec agrees with the repository's constraints and its existing specs."),
          { label: "consistency", phase: "Spec gate" },
        ),
    });
  const r = await judged(d, items, revision, "spec-gate");
  if ("stop" in r) return r;
  if (!r.findings) return null;
  const next = r.findings.map((f) => findingText(f));
  return fail("spec", `spec revision ${revision}`, next.join("; "))
    ? { stop: exhausted("spec-gate", "spec") }
    : { carry: next };
}

// ---- Validate ---------------------------------------------------------------

interface Judging {
  cand: string;
  findings: BlockingFinding[] | null;
  prior: string[];
}

// Fresh validators judge the candidate. Returns the step that ends validation, or null with the findings to fix
// left on v.
export async function judgeCandidate(
  d: Run,
  items: readonly Validator[],
  v: Judging,
): Promise<{ stop: Stopped } | { ok: true; candidate: string } | null> {
  const { cand } = v;
  const r = await judged(d, items, cand, "validate");
  if ("stop" in r) return r;
  if (!r.findings) return { ok: true, candidate: cand };
  v.findings = r.findings;
  v.prior = r.findings.map((f) => findingText(f));
  return d.fail("implementation", `candidate ${cand}`, v.prior.join("; "))
    ? { stop: d.exhausted("validate", "implementation") }
    : null;
}

// Report the dirty paths left outside the assigned paths, and keep them as the run's exclusions.
export function leaveOutside(d: Run, outside: readonly string[], outsideDirty: string[]): void {
  if (outside.length > 0)
    d.limits.push(`Uncommitted paths outside the assigned paths, not committed: ${outside.join(", ")}`);
  outsideDirty.splice(0, outsideDirty.length, ...outside);
}

// Commit the paths the validators judged.
export async function commitWork(
  d: Run,
  commitPaths: readonly string[],
  outsideDirty: readonly string[],
  label: string,
): Promise<Stopped | null> {
  const c = await callPusher(
    d.pushBrief(
      `Commit exactly these paths as they stand, staged by explicit path, with the commit convention docs/FORGE.md declares. Do not push. Commit nothing else, even if the worktree holds other uncommitted changes. If every path is already committed, make no commit and record the current HEAD sha in the ledger line.\nPaths:\n${list(commitPaths)}`,
      [
        `exclude ${outsideDirty.join(", ") || "none"}`,
        `done implement commit <the new commit's sha> spec ${d.state.specHash}`,
      ],
    ),
    label,
    "Validate",
  );
  return pushOk(c) ? null : d.pushStop("validate", c);
}

// With no plan from this run's spec, read it back from the committed spec.
export async function planOf(d: Run, step: string, what: string): Promise<Plan | Stopped> {
  const plan = await d.recoverPlan();
  return (
    plan ??
    d.stop(step, [
      need(step, 1, "prerequisite", `${what} in the spec at ${d.state.specPath}.`, "scout-docs could not read them"),
    ])
  );
}

// ---- Publish ----------------------------------------------------------------

interface PublishOpts {
  cardId: string;
  boardPrDone: boolean;
  publishCurrent: boolean;
  /** The branch as the push brief names it. */
  branch: string;
  /** What the PR describes. */
  describes: string;
}

// The board operations for an open PR, after a rerun found them missing.
async function boardPr(d: Run, cardId: string): Promise<Stopped | null> {
  const { state } = d;
  const b = await callPusher(
    d.pushBrief(
      `Perform the board operations docs/BOARD.md declares for when the PR opens (for example attaching ${state.pr} to card ${cardId} and a status transition), only as bound and only where the card does not already show them. Do nothing else, and change no card content.`,
      [`done board-pr ${state.pr}`],
    ),
    "update the card for the PR",
    "Publish",
  );
  if (!pushOk(b)) return d.pushStop("publish", b);
  d.done("board-pr");
  return null;
}

// Push the branch, open or update the PR, and fire the review.
async function openPr(d: Run, o: PublishOpts, needBoardPr: boolean): Promise<Stopped | null> {
  const { state } = d;
  const verified = list(d.verification.map((v) => `${v.agent}: ${v.verdict} on ${v.evaluated}`));
  const r = await callPusher(
    d.pushBrief(
      `Push ${o.branch} ${state.branch || ""} as docs/FORGE.md declares. ${state.pr ? `A PR exists (${state.pr}); update it as docs/FORGE.md declares${needBoardPr ? ", then perform the board operations docs/BOARD.md declares for when the PR opens (for example attaching it and a status transition), only where the card does not already show them" : " and perform no board operation"}.` : "Open the PR as docs/FORGE.md declares, then perform the board operations docs/BOARD.md declares for when the PR opens (for example attaching it and a status transition)."} The PR describes ${o.describes}, links the spec at ${state.specPath}, and lists this verification:\n${verified}\nThen fire the review trigger docs/FORGE.md declares, unless opening the PR fires it; if none is declared, fire none and do not report that as unmet. Change no card content.`,
      [
        ...(o.cardId && (needBoardPr || !state.pr)
          ? [
              `done board-pr <the PR reference> (write this line as soon as the board operations are done, before the review trigger)`,
            ]
          : []),
        `done publish <the PR reference> commit <HEAD sha>`,
        `review 1 fired <trigger time; the PR's creation time when opening it fires the review> head <HEAD sha> (write this line only if a review was requested)`,
      ],
    ),
    "publish the PR",
    "Publish",
  );
  if (!pushOk(r)) return d.pushStop("publish", r);
  state.pr = opRef(r, "pr") || state.pr;
  if (!state.pr) {
    return d.stop("publish", [need("publish", 1, "prerequisite", "The PR reference.", JSON.stringify(r.operations))]);
  }
  d.done("publish");
  return null;
}

// Push and open or update the PR, or, when it is published, finish its board operations.
export async function publish(d: Run, o: PublishOpts): Promise<Stopped | null> {
  phase("Publish");
  const needBoardPr = !!o.cardId && !o.boardPrDone;
  if (!o.publishCurrent) return openPr(d, o, needBoardPr);
  d.skip("publish");
  // The PR is published; its board operations (attach, status) may have failed after it opened.
  return needBoardPr && d.state.pr ? boardPr(d, o.cardId) : null;
}

// ---- Review -----------------------------------------------------------------

interface ReviewOpts {
  story: string;
  /** Fields review-pr takes from this delivery alone, passed after the story. */
  extra?: Readonly<Record<string, string>>;
  projectRoot: string;
  answers: Answers;
  exclude: readonly string[];
}

// Run the review loop as a sub-workflow.
export async function review(d: Run, o: ReviewOpts): Promise<{ stop: Stopped } | { review: ReviewDone }> {
  const { state, stop } = d;
  phase("Review");
  if (!state.pr) {
    return {
      stop: stop("review", [
        need(
          "review",
          1,
          "prerequisite",
          "The PR reference, to start the review.",
          "the checkpoint and the ledger name no PR",
        ),
      ]),
    };
  }
  let result: ReviewPrResult | null;
  try {
    result = await workflow<ReviewPrResult | null>("slopify:review-pr", {
      pr: state.pr,
      worktree: state.worktree,
      spec: state.specPath,
      story: o.story,
      ...o.extra,
      projectRoot: o.projectRoot || undefined,
      answers: o.answers,
      // Dirty paths this run left out of its own commit; the review loop never stages them.
      exclude: unique(o.exclude),
    });
  } catch (error) {
    const message: unknown = !!error && typeof error === "object" ? Reflect.get(error, "message") : undefined;
    return {
      stop: stop("review", [
        need("review", 1, "prerequisite", "The review-pr workflow, which could not run.", String(message || error)),
      ]),
    };
  }
  if (!result) {
    return {
      stop: stop("review", [
        need("review", 1, "prerequisite", "A result from the review-pr workflow.", "it returned nothing"),
      ]),
    };
  }
  if (result.status === "blocked") {
    // The block is this workflow's own: its name and rerun text, with review-pr's needs and completed steps.
    return {
      stop: {
        ...stop("review", result.needs),
        completed: [...d.completed, ...result.completed.map((s) => `review-pr:${s}`)],
      },
    };
  }
  if (result.status !== "done") {
    return {
      stop: stop("review", [
        need(
          "review",
          1,
          "prerequisite",
          "A finished review of the PR.",
          `the review-pr workflow returned status ${JSON.stringify(result.status)}`,
        ),
      ]),
    };
  }
  return { review: result };
}
