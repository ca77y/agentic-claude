// The build and validate loop deliver-story and review-pr share: an outer loop over the whole story, with one coder and
// qa inner loop per change. docs/deliver/STORY.md describes it. All of its control flow comes from rules.ts.
import { LENS_SCHEMA, lens, scout, STRINGS, type Answers, type LensResult } from "./family.ts";
import {
  NO_WRITES,
  callCoder,
  callDocsWriter,
  callPusher,
  list,
  need,
  opRef,
  pushOk,
  unique,
  type Deliver,
  type PusherResult,
  type Stopped,
} from "./deliver.ts";
import {
  FIX_ROUTES,
  MAX_FIX_ROUNDS,
  MAX_INNER_TRIES,
  allowsReady,
  gate,
  noProgress,
  renderBody,
  routeOf,
  waves,
  type CriterionRow,
  type Listed,
  type Route,
  type Severity,
} from "./rules.ts";
import { type Build, type Criterion, type RecordedDecision, type Task, type Validate } from "./spec.ts";

export type Run = Deliver;

/** An agent that died, or a write the forge refused. It ends the run as a halt, because no later step can use it. */
export class Halt extends Error {
  readonly step: string;
  readonly needs: string;
  constructor(step: string, needs: string, evidence: string) {
    super(evidence);
    this.step = step;
    this.needs = needs;
  }
}
export function must<T>(value: T | null | undefined, step: string, what: string): T {
  if (value === null || value === undefined) throw new Halt(step, what, "the agent did not return");
  return value;
}
// A halt as the run's blocked result; anything else is a bug in the script and keeps propagating.
export function stopOf(d: Run, error: unknown): Stopped {
  if (error instanceof Halt)
    return d.stop(error.step, [need(error.step, 1, "prerequisite", error.needs, error.message)]);
  throw error;
}

// ---- Schemas ----------------------------------------------------------------

const TEST_SCHEMA = {
  type: "object",
  required: ["tests", "failingOutput", "noTest", "specProblem"],
  properties: {
    tests: { ...STRINGS, description: "Test paths written or changed, relative to the worktree root" },
    failingOutput: { type: "string", description: "The test's failing output on the current code" },
    noTest: { type: "string", description: "Why the behavior can't be expressed as a test; empty when it can" },
    specProblem: {
      type: "string",
      description: "What the brief doesn't settle or can't deliver as written; empty when none",
    },
  },
} as const;

const FIX_SCHEMA = {
  type: "object",
  required: ["changed", "ran", "testProblem", "specProblem"],
  properties: {
    changed: { ...STRINGS, description: "Paths changed, relative to the worktree root" },
    ran: { ...STRINGS, description: "Each command and its result" },
    testProblem: { type: "string", description: "Why the test is wrong; empty when it isn't" },
    specProblem: {
      type: "string",
      description: "What the brief doesn't settle or can't deliver as written; empty when none",
    },
  },
} as const;

const QA_SCHEMA = {
  type: "object",
  required: [...LENS_SCHEMA.required, "testAtFault"],
  properties: {
    ...LENS_SCHEMA.properties,
    testAtFault: { type: "boolean", description: "True when the test itself is what has to change" },
  },
} as const;

const CHECKS_SCHEMA = {
  type: "object",
  required: ["commands"],
  properties: {
    commands: {
      type: "array",
      items: {
        type: "object",
        required: ["command", "exitCode", "failingLines"],
        properties: {
          command: { type: "string" },
          exitCode: { type: "number" },
          failingLines: { type: "string" },
        },
      },
    },
  },
} as const;

const VALIDATOR_SCHEMA = {
  type: "object",
  required: ["results", "uncategorizedSetting"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "result", "ran", "evidence", "detail", "setting"],
        properties: {
          id: { type: "string" },
          result: { type: "string", enum: ["pass", "fail", "cannot-verify"] },
          ran: { type: "string", description: "The validation path that ran: its commands, flows, or tests" },
          evidence: { ...STRINGS, description: "Paths under .tmp/evidence/ or quoted output" },
          detail: { type: "string", description: "For a fail, the flow step or file and line; else why" },
          setting: { type: "string", description: "What TESTING.md's category states when it can't be verified" },
        },
      },
    },
    uncategorizedSetting: { type: "string", description: "What TESTING.md's Uncategorized setting states" },
  },
} as const;

const JUDGE_SCHEMA = {
  type: "object",
  required: ["verdict", "severity", "kind", "ruling", "reason", "fingerprint"],
  properties: {
    verdict: { type: "string", enum: ["confirmed", "dismissed", "unverified"] },
    severity: { type: "string", enum: ["blocker", "major", "minor", "nit", "pre-existing", "none"] },
    kind: { type: "string", enum: ["code", "test", "docs", "spec", "cannot-verify", "decision"] },
    ruling: { type: "string", enum: ["none", "fix-differently", "accept-as-debt", "split-to-issue", "escalate"] },
    reason: { type: "string", description: "What the evidence shows" },
    fingerprint: { type: "string", description: "file|symbol|category, the same whenever this problem comes back" },
  },
} as const;

const GATEWAY_SCHEMA = {
  type: "object",
  required: ["missed", "docsToAdd"],
  properties: {
    missed: {
      type: "array",
      items: {
        type: "object",
        required: ["location", "text"],
        properties: { location: { type: "string" }, text: { type: "string" } },
      },
    },
    docsToAdd: { ...STRINGS, description: "Documents the change affects that aren't on the docs list" },
  },
} as const;

const WATCHER_SCHEMA = {
  type: "object",
  required: ["outcome", "waitingFor", "limitMinutes", "reference", "findings"],
  properties: {
    outcome: { type: "string", enum: ["finished", "failed", "timed-out", "pending", "not-declared"] },
    waitingFor: { type: "string", enum: ["start", "finish", ""] },
    limitMinutes: { type: "number" },
    reference: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "location", "text"],
        properties: { id: { type: "string" }, location: { type: "string" }, text: { type: "string" } },
      },
    },
  },
} as const;

const DOCS_SCHEMA = {
  type: "object",
  required: ["changed"],
  properties: { changed: { ...STRINGS, description: "Documents changed, relative to the worktree root" } },
} as const;

const SEVERITY_RUBRIC = `Severity: blocker when a criterion fails, the build or tests are broken, data is lost or corrupted, there is a security hole, or tests were weakened without a recorded reason. major for a correctness bug on a reachable path in changed code, an error swallowed on a path the user sees, or documentation the change made untrue. minor for real but low impact. nit for style, naming, or readability. pre-existing for a defect the change didn't introduce. none when the problem isn't a defect in the change.
Kind: code when the behavior is wrong. test when the behavior is right but the test or flow is wrong. docs when documentation is untrue or missing. spec when the spec is wrong, or the finding conflicts with its design. cannot-verify when a tool, simulator, or credential stopped working, the check hits a blind spot, or the proof is missing or unusable. decision when only a person can settle what a criterion should mean.
Never downgrade a confirmed failure. Filter out what a linter would catch, and style. Run a reproduction when you can, rather than only reading the code. An earlier dismissal of the same fingerprint stands.`;

const RECURRENCE_RUBRIC = `If this problem's fingerprint appears under earlier rulings after a fix attempt, also give a ruling, reading those attempts: fix-differently when another approach could work, accept-as-debt when a major can ship and be paid later, split-to-issue when a major belongs in its own issue, or escalate. Otherwise the ruling is none.`;

// ---- State ------------------------------------------------------------------

interface Problem {
  source: string;
  location: string;
  text: string;
  criterion?: string;
}
interface OpenItem {
  problem: Problem;
  route: Route;
  severity: Severity;
  fingerprint: string;
  reason: string;
}
/** One change the inner loop makes correct: a task from the spec, or one problem. */
interface Change {
  id: string;
  files: readonly string[];
  task?: Task;
  criteria: readonly Criterion[];
  item?: OpenItem;
  /** What to deliver when no task or problem says it: a small flow's first change. */
  assignment?: string;
}
interface CriterionState extends CriterionRow {
  setting: string;
  detail: string;
}
interface ReviewOutcome {
  clean: boolean;
  note: string;
}

export interface LoopInput {
  d: Run;
  where: string;
  /** The issue's why and what, for agents that judge against it. */
  story: string;
  cardId: string;
  build: Build | null;
  validate: Validate | null;
  specDir: string;
  answers: Answers;
  /** The first review to wait for; 0 starts with a round. */
  startAtReview: number;
  /** The spec's tasks are already built, so the first round starts at validation. */
  built: boolean;
  /** The short flow for a trivial story or a bug: no spec, and what the first test has to state. */
  small?: { firstTest: string; reproduced?: readonly Listed[] };
  /** Advisors and the writer revise the spec for these problems, and return the tasks to run again. */
  reviseSpec?: (problems: readonly string[]) => Promise<{ build: Build; validate: Validate; rerun: Task[] }>;
}

export interface LoopResult {
  status: "ready" | "draft";
  rounds: number;
  pr: string;
  review: string;
  draftReasons: readonly Listed[];
  decisions: readonly string[];
}

interface Loop extends LoopInput {
  build: Build | null;
  validate: Validate | null;
  docs: string[];
  round: number;
  reviewNumber: number;
  open: OpenItem[];
  escalated: OpenItem[];
  rows: Record<string, CriterionState>;
  /** Criteria this round's changes were meant to deliver, which validation has to run again. */
  affected: string[];
  fixes: Map<string, number>;
  differently: Set<string>;
  rulings: string[];
  decisions: RecordedDecision[];
  unverified: Listed[];
  confirmations: Listed[];
  knownDebt: Listed[];
  suggestions: Listed[];
  newIssues: Listed[];
  testChanges: string[];
  review: ReviewOutcome;
  changedThisRound: string[];
  openByRound: number[];
  commits: Promise<unknown>;
  halted: Halt | null;
}

const checksBrief = (where: string, worktree: string): string =>
  `${where}\nIn the worktree ${worktree}, run the Checks commands TESTING.md declares, and return each command's exit code and failing lines. Change nothing.`;
const worktreeOf = (l: Loop): string => l.d.state.worktree;
const rowsOf = (l: Loop): CriterionState[] => Object.values(l.rows);

// Commits and pushes go through one git index, so parallel inner loops take turns.
function inOrder<T>(l: Loop, step: () => Promise<T>): Promise<T> {
  const turn = async (): Promise<T> => {
    await l.commits;
    return step();
  };
  const next = turn();
  l.commits = settled(next);
  return next;
}
// The next turn waits for this one to end, whichever way it ended; its own caller sees any failure.
async function settled(p: Promise<unknown>): Promise<void> {
  try {
    await p;
  } catch {
    // Reported to the caller that started this turn.
  }
}

function pushed(r: PusherResult | null, what: string): PusherResult {
  const unmet = r?.unmet.join("; ");
  if (pushOk(r)) return r;
  throw new Halt("push", what, unmet ?? "pusher didn't return");
}

async function commit(l: Loop, paths: readonly string[], message: string): Promise<string> {
  const r = await inOrder(l, () =>
    callPusher(
      l.d.pushBrief(
        `Commit exactly these paths as they stand, staged by explicit path, with a message in the convention docs/FORGE.md declares, saying: ${message}.${l.cardId ? ` Name the issue ${l.cardId} in it.` : ""} Do not push.\n${list(paths)}`,
      ),
      `commit: ${message}`,
      "Build",
    ),
  );
  return opRef(pushed(r, `A commit of ${paths.join(", ")}.`), "commit");
}

// ---- Inner loop -------------------------------------------------------------

const answersText = (l: Loop): string =>
  Object.keys(l.answers).length > 0 ? `The user answered these earlier questions:\n${JSON.stringify(l.answers)}` : "";

function changeBrief(l: Loop, c: Change): string {
  const criteria = c.criteria.map((x) => `- ${x.id}: ${x.wording}\n  First test: ${x.firstTest}`).join("\n");
  return [
    `${l.where}\nWork in the worktree ${worktreeOf(l)}.`,
    l.build?.shared.length ? `Constraints every task follows:\n${list(l.build.shared)}` : "",
    c.assignment ?? "",
    c.task
      ? `Your task (${c.task.id}): ${c.task.todo}\nFiles you may write:\n${list(c.task.files)}\nReuse, don't rebuild:\n${list(c.task.reuse)}\nCreate:\n${list(c.task.create)}`
      : "",
    criteria ? `The criteria it delivers:\n${criteria}` : "",
    c.item ? `The problem to fix, at ${c.item.problem.location}:\n${c.item.problem.text}\n${c.item.reason}` : "",
    answersText(l),
    "Implement what this says, and make no decisions. If it doesn't settle something, or can't be delivered as written, return specProblem and stop.",
    NO_WRITES,
  ]
    .filter(Boolean)
    .join("\n\n");
}

interface CycleTest {
  paths: string[];
  commit: string;
  noTest: string;
  specProblem: string;
}

async function writeTest(l: Loop, c: Change, reason: string): Promise<CycleTest> {
  const t = must(
    await callCoder(
      `${changeBrief(l, c)}

Write a new test or change an existing one, so that it states the required behavior. Change no production code. It must fail on the current code: run it and return the failing output. When the behavior can't be expressed as a test, return noTest with the reason instead.${reason ? `\n\nAn earlier attempt showed the test has to change: ${reason}` : ""}`,
      `${c.id}: test`,
      "Build",
      TEST_SCHEMA,
    ),
    "build",
    `A test for ${c.id}.`,
  );
  if (t.specProblem) return { paths: [], commit: "", noTest: "", specProblem: t.specProblem };
  if (t.noTest || t.tests.length === 0) return { paths: [], commit: "", noTest: t.noTest, specProblem: "" };
  l.testChanges.push(...t.tests);
  const sha = await commit(l, t.tests, `add a failing test for ${c.id}`);
  return { paths: t.tests, commit: sha, noTest: "", specProblem: "" };
}

function qaBrief(l: Loop, c: Change, test: CycleTest): string {
  const history = test.commit
    ? `The test commit is ${test.commit}, and its protected paths are:\n${list(test.paths)}
Check in a temporary copy that the test fails at that commit and passes at HEAD. Check that nothing after that commit touches a protected path, and that nothing skips, weakens, or excludes the test, for example by loosening a tolerance, regenerating a snapshot, or changing the test config.`
    : `This change has no test, because: ${test.noTest}. Judge that reason.`;
  return `${changeBrief(l, c)}

Validate one change and its history.
${history}
Check that the fix delivers the behavior asked for and doesn't merely satisfy the test, for example by special-casing the test's input. Check that the change stays within its criterion or problem. Any failed check is a blocking finding. Set testAtFault when the test is what has to change.`;
}

function fixPrompt(l: Loop, c: Change, cycle: CycleTest, lastFailure: string): string {
  const assignment =
    cycle.paths.length > 0
      ? `Make this test pass. These paths are protected, so change none of them:\n${list(cycle.paths)}\nIf the test is wrong, return testProblem with the reason and stop.`
      : `Make the change. It has no test because: ${cycle.noTest}`;
  return `${changeBrief(l, c)}\n\n${assignment}${lastFailure ? `\n\nThe last attempt failed validation:\n${lastFailure}` : ""}`;
}

async function qaOf(l: Loop, c: Change, cycle: CycleTest) {
  return must(
    await agent(qaBrief(l, c, cycle), {
      agentType: "slopify:qa",
      label: `${c.id}: qa`,
      phase: "Build",
      schema: QA_SCHEMA,
    }),
    "build",
    `A qa verdict on ${c.id}.`,
  );
}

// The small flow runs the project's checks inside the inner loop; the story flow runs them once a round.
async function failingChecks(l: Loop): Promise<string> {
  if (!l.small) return "";
  const brief = checksBrief(l.where, worktreeOf(l));
  const ran = must(
    await agent(brief, {
      agentType: "slopify:checks",
      label: "checks",
      phase: "Build",
      schema: CHECKS_SCHEMA,
    }),
    "build",
    "The project's checks.",
  );
  const failed = ran.commands.filter((x) => x.exitCode !== 0);
  const lines = failed.map((x) => `${x.command}: ${x.failingLines}`);
  return lines.join("\n");
}

interface TryResult {
  /** What is still wrong; empty when this try delivered the change. */
  reason: string;
  rewriteTest: boolean;
}

// A coder decides nothing, so what its brief leaves open goes back to whoever writes the brief: the spec's writer, or,
// with no spec, the person reading the draft.
function specStopped(l: Loop, c: Change, problem: string): TryResult {
  const route: Route = l.reviseSpec ? "revise-spec" : "escalate";
  listRouted(l, route, {
    problem: { source: "the coder", location: c.id, text: problem },
    route,
    severity: "blocker",
    fingerprint: `${c.id}|spec`,
    reason: "The coder can't deliver this without making a decision.",
  });
  return { reason: "", rewriteTest: false };
}

// One fix, and whatever validates it.
async function tryFix(l: Loop, c: Change, cycle: CycleTest, lastFailure: string, attempt: number): Promise<TryResult> {
  const fix = must(
    await callCoder(
      fixPrompt(l, c, cycle, lastFailure),
      `${c.id}: fix${attempt > 1 ? ` (try ${String(attempt)})` : ""}`,
      "Build",
      FIX_SCHEMA,
    ),
    "build",
    `A fix for ${c.id}.`,
  );
  if (fix.specProblem) return specStopped(l, c, fix.specProblem);
  if (fix.testProblem) return { reason: fix.testProblem, rewriteTest: true };
  if (fix.changed.length > 0) await commit(l, fix.changed, `implement ${c.id}`);
  l.changedThisRound.push(...fix.changed);
  const failing = await failingChecks(l);
  if (failing) return { reason: failing, rewriteTest: false };
  // A small flow's qa runs once, on its first change; a review fix there has only the checks.
  if (l.small && l.round > 0) return { reason: "", rewriteTest: false };
  const verdict = await qaOf(l, c, cycle);
  if (verdict.verdict === "pass") return { reason: "", rewriteTest: false };
  const reason = verdict.findings.map((f) => `${f.location}: ${f.problem}`).join("\n") || verdict.limits;
  return { reason, rewriteTest: verdict.testAtFault };
}

// Test, fix, validate. Returns what's still wrong after the last try, or an empty string.
async function runChange(l: Loop, c: Change): Promise<string> {
  let test = await writeTest(l, c, "");
  let last: TryResult = { reason: "", rewriteTest: false };
  for (let attempt = 1; attempt <= MAX_INNER_TRIES; attempt += 1) {
    if (last.rewriteTest) test = await writeTest(l, c, last.reason);
    if (test.specProblem) return specStopped(l, c, test.specProblem).reason;
    last = await tryFix(l, c, test, last.rewriteTest ? "" : last.reason, attempt);
    if (!last.reason) return "";
  }
  return last.reason;
}

// ---- Build ------------------------------------------------------------------

function criteriaOf(l: Loop, ids: readonly string[]): Criterion[] {
  return (l.validate?.criteria ?? []).filter((c) => ids.includes(c.id));
}
function changeOfTask(l: Loop, task: Task): Change {
  return {
    id: task.id,
    files: task.files,
    task,
    criteria: criteriaOf(l, task.criteria),
  };
}
function changeOfItem(l: Loop, item: OpenItem, index: number): Change {
  const { location, criterion } = item.problem;
  return {
    id: `fix-${String(index + 1)}`,
    files: [location.replace(/:\d+(?:-\d+)?$/, "")],
    criteria: criteriaOf(l, criterion ? [criterion] : []),
    item,
  };
}

// parallel() turns a throw into null, so a halt in one inner loop waits here until its wave has finished.
async function changeHoldingHalt(l: Loop, c: Change): Promise<string> {
  try {
    return await runChange(l, c);
  } catch (error) {
    if (!(error instanceof Halt)) throw error;
    l.halted ??= error;
    return "";
  }
}

async function runChanges(l: Loop, changes: readonly Change[]): Promise<void> {
  const asTasks = changes.map((c) => ({ ...c, dependsOn: c.task?.dependsOn ?? [] }));
  for (const wave of waves(asTasks)) {
    const left = await parallel(wave.map((c) => () => changeHoldingHalt(l, c)));
    if (l.halted) throw l.halted;
    for (const [i, c] of wave.entries()) {
      const remaining = left[i];
      if (remaining === "") continue;
      // An inner loop that runs out of tries doesn't stop the round: its problem stays open as a blocker.
      l.open.push({
        problem: c.item?.problem ?? { source: "qa", location: c.id, text: remaining ?? "the inner loop didn't return" },
        route: "coder",
        severity: "blocker",
        fingerprint: c.item?.fingerprint ?? c.id,
        reason: remaining ?? "the inner loop didn't return",
      });
    }
  }
}

function countFix(l: Loop, item: OpenItem): void {
  const prior = l.fixes.get(item.fingerprint) ?? 0;
  if (prior > 0) l.differently.add(item.fingerprint);
  l.fixes.set(item.fingerprint, prior + 1);
}

async function reviseSpec(l: Loop, items: readonly OpenItem[]): Promise<Change[]> {
  if (items.length === 0 || !l.reviseSpec) return [];
  const revised = await l.reviseSpec(items.map((i) => `${i.problem.location}: ${i.problem.text}`));
  l.build = revised.build;
  l.validate = revised.validate;
  return revised.rerun.map((t) => changeOfTask(l, t));
}

async function updateDocs(l: Loop, problems: readonly OpenItem[]): Promise<void> {
  if (l.docs.length === 0 && problems.length === 0) return;
  if (l.changedThisRound.length === 0 && problems.length === 0) return;
  const problemLines = problems.map((i) => `${i.problem.location}: ${i.problem.text}`);
  const w = must(
    await callDocsWriter(
      `${l.where}
Update these documents in the worktree ${worktreeOf(l)} so they describe the code as built. Every claim must be true against the code.
${list(l.docs)}
${problems.length > 0 ? `\nProblems to fix:\n${list(problemLines)}` : ""}
Paths this round changed:\n${list(l.changedThisRound)}
${NO_WRITES}`,
      "update the docs",
      "Build",
      DOCS_SCHEMA,
    ),
    "build",
    "Updated documentation.",
  );
  if (w.changed.length > 0) await commit(l, w.changed, "update the docs the change affects");
}

function firstChanges(l: Loop): Change[] {
  if (!l.small) return (l.build?.tasks ?? []).map((t) => changeOfTask(l, t));
  const assignment = `Deliver this:\n<<<ISSUE\n${l.story}\nISSUE>>>\n\nThe first test ${l.small.firstTest}`;
  return [{ id: "change", files: [], criteria: [], assignment }];
}

// With no spec to list them, a scout finds the documents this round's diff makes untrue, and an empty list skips the writer.
async function findDocs(l: Loop): Promise<void> {
  if (!l.small || l.changedThisRound.length === 0) return;
  const found = await scout(
    "scout-docs",
    `${l.where}\nIn the worktree ${worktreeOf(l)}, read the diff of these paths, and find the documents it makes untrue or leaves incomplete. Report one evidence item per document, with source set to its path relative to the worktree root, and none when no document is affected.\n${list(l.changedThisRound)}`,
    { label: "find affected docs", phase: "Build" },
  );
  l.docs = must(found, "build", "The documents the change affects.").evidence.map((e) => e.source);
}

async function buildRound(l: Loop): Promise<void> {
  phase("Build");
  const openItems = l.open;
  l.open = [];
  l.changedThisRound = [];
  for (const item of openItems) countFix(l, item);
  const first = l.round === 0 ? firstChanges(l) : [];
  const fromSpec = await reviseSpec(
    l,
    openItems.filter((i) => i.route === "revise-spec"),
  );
  const fixes = openItems
    .filter((i) => i.route === "coder" || i.route === "correct-test")
    .map((item, i) => changeOfItem(l, item, i));
  const changes = [...first, ...fromSpec, ...fixes];
  l.affected = unique(changes.flatMap((c) => c.criteria.map((x) => x.id)));
  await runChanges(l, changes);
  await findDocs(l);
  await updateDocs(
    l,
    openItems.filter((i) => i.route === "writer"),
  );
}

// ---- Validate ---------------------------------------------------------------

interface ValidatedRun {
  rows: CriterionState[];
  uncategorizedSetting: string;
  problems: Problem[];
}

/** One validation pass: the project's checks and each criterion's category path. It is also /slopify:validate. */
export async function runValidation(o: {
  where: string;
  worktree: string;
  criteria: readonly Criterion[];
  /** Ids to run again; empty runs every criterion. */
  focus: readonly string[];
  changed: readonly string[];
  /** The small flow already ran them in its inner loop. */
  checks?: boolean;
}): Promise<ValidatedRun> {
  phase("Validate");
  const categorized = o.criteria.filter((c) => c.category !== "uncategorized");
  const toRun = o.focus.length > 0 ? categorized.filter((c) => o.focus.includes(c.id)) : categorized;
  const [checks, validated] = await parallel([
    () =>
      o.checks === false
        ? Promise.resolve({ commands: [] })
        : agent(checksBrief(o.where, o.worktree), {
            agentType: "slopify:checks",
            label: "checks",
            phase: "Validate",
            schema: CHECKS_SCHEMA,
          }),
    () =>
      // With no criteria at all, as when review-pr runs on a PR with no spec, there is nothing to drive the app for.
      o.criteria.length === 0
        ? Promise.resolve({ results: [], uncategorizedSetting: "" })
        : agent(
            `${o.where}\nIn the worktree ${o.worktree}, follow TESTING.md's setup and boot, then run each criterion's validation path below, and capture its evidence under .tmp/evidence/. Report what TESTING.md states for its category when it can't be verified, and what it states for uncategorized criteria.${o.changed.length > 0 ? ` Also run every criterion whose code path these changed paths touch, and every criterion if one is a boot or config file:\n${list(o.changed)}` : ""}\n\nCriteria to run:\n${JSON.stringify(toRun)}${o.focus.length > 0 ? `\n\nThe other criteria:\n${JSON.stringify(categorized.filter((c) => !toRun.includes(c)))}` : ""}`,
            { agentType: "slopify:validator", label: "validator", phase: "Validate", schema: VALIDATOR_SCHEMA },
          ),
  ]);
  const ran = must(checks, "validate", "The project's checks.");
  const verdicts = must(validated, "validate", "The validator's verdicts.");
  const byId = new Map(o.criteria.map((c) => [c.id, c]));
  const rows: CriterionState[] = verdicts.results.map((v) => {
    const c = byId.get(v.id);
    // A pass with no evidence proves nothing, but nothing shows the code is wrong either.
    const result = v.result === "pass" && v.evidence.length === 0 ? "cannot-verify" : v.result;
    return {
      id: v.id,
      wording: c?.wording ?? v.id,
      category: c?.category ?? "uncategorized",
      path: v.ran,
      result,
      evidence: v.evidence,
      setting: v.setting,
      detail: v.detail,
    };
  });
  const problems: Problem[] = [
    ...ran.commands
      .filter((x) => x.exitCode !== 0)
      .map((x) => ({ source: "checks", location: x.command, text: x.failingLines || `exit ${String(x.exitCode)}` })),
    ...rows
      .filter((r) => r.result === "fail")
      .map((r) => ({
        source: "validator",
        location: r.detail,
        text: `Criterion ${r.id} fails: ${r.wording}`,
        criterion: r.id,
      })),
  ];
  return { rows, uncategorizedSetting: verdicts.uncategorizedSetting, problems };
}

async function checkDocs(l: Loop): Promise<Problem[]> {
  if (l.docs.length === 0) return [];
  const verdicts = await parallel(
    l.docs.map(
      (doc) => () =>
        lens(
          "lens-docs",
          `${l.where}\nIn the worktree ${worktreeOf(l)}, judge this document against the code: ${doc}`,
          {
            label: `docs: ${doc}`,
            phase: "Validate",
          },
        ),
    ),
  );
  return verdicts.flatMap((v: LensResult | null, i) =>
    must(v, "validate", `A verdict on ${l.docs[i] ?? "a document"}.`).findings.map((f) => ({
      source: "lens-docs",
      location: f.location,
      text: f.problem,
    })),
  );
}

async function validateRound(l: Loop): Promise<Problem[]> {
  const uncategorized = (l.validate?.criteria ?? []).filter((c) => c.category === "uncategorized");
  const v = await runValidation({
    where: l.where,
    worktree: worktreeOf(l),
    criteria: l.validate?.criteria ?? [],
    focus: l.round === 0 ? [] : l.affected,
    changed: l.round === 0 ? [] : l.changedThisRound,
  });
  for (const r of v.rows) l.rows[r.id] = r;
  for (const c of uncategorized) {
    l.rows[c.id] = {
      id: c.id,
      wording: c.wording,
      category: "uncategorized",
      path: "none: suggest a category to add to TESTING.md",
      result: "uncategorized",
      evidence: [],
      setting: v.uncategorizedSetting,
      detail: "",
    };
  }
  return [...v.problems, ...(await checkDocs(l))];
}

// ---- Judge ------------------------------------------------------------------

function judgeBrief(l: Loop, p: Problem): string {
  const criterion = p.criterion ? criteriaOf(l, [p.criterion])[0] : undefined;
  return `${l.where}
Rule on one problem in the worktree ${worktreeOf(l)}, against the diff from the target branch docs/FORGE.md declares. ${l.story ? `\n\nThe issue:\n<<<ISSUE\n${l.story}\nISSUE>>>` : ""}

Reported by ${p.source} at ${p.location}:
${p.text}
${criterion ? `\nThe criterion: ${criterion.wording}` : ""}

${SEVERITY_RUBRIC}
${l.small ? "The ruling is none." : RECURRENCE_RUBRIC}

Earlier rulings:
${list(l.rulings)}

${answersText(l)}`;
}

function listRouted(l: Loop, route: Route, item: OpenItem): void {
  const entry = { text: `${item.problem.location}: ${item.problem.text}`, detail: item.reason };
  // A review finding that can't be verified has no criterion, so it has no TESTING.md setting to read.
  const lists: Partial<Record<Route, Listed[]>> = {
    unverified: l.unverified,
    "needs-confirmation": l.confirmations,
    suggestion: l.suggestions,
    "known-debt": l.knownDebt,
    "new-issue": l.newIssues,
    "split-issue": l.newIssues,
  };
  lists[route]?.push(entry);
  // A criterion ruled unverifiable is already in the table; a review finding has no setting to read.
  if (route === "not-validated" && !item.problem.criterion) l.unverified.push(entry);
  if (route === "escalate") l.escalated.push(item);
  if (FIX_ROUTES.includes(route)) l.open.push(item);
}

// The criteria table shows the ruling, and a criterion ruled unverifiable falls under TESTING.md's setting.
function applyToRow(l: Loop, p: Problem, route: Route, reason: string): void {
  const row = p.criterion ? l.rows[p.criterion] : undefined;
  if (!row) return;
  if (route === "dismiss") {
    row.result = `pass (the judge overturned a fail: ${reason})`;
    return;
  }
  if (route !== "not-validated") return;
  row.result = "cannot-verify";
  row.detail = reason;
}

async function judgeProblems(l: Loop, problems: readonly Problem[], phaseTitle: string): Promise<void> {
  if (problems.length === 0) return;
  const hasSpec = !!l.reviseSpec;
  const verdicts = await parallel(
    problems.map(
      (p, i) => () =>
        agent(judgeBrief(l, p), {
          agentType: "slopify:judge",
          label: `rule ${String(i + 1)}`,
          phase: phaseTitle,
          schema: JUDGE_SCHEMA,
        }),
    ),
  );
  for (const [i, p] of problems.entries()) {
    const v = must(verdicts[i], "judge", `A ruling on ${p.location}.`);
    const route = routeOf(v, l.fixes.get(v.fingerprint) ?? 0, l.differently.has(v.fingerprint), hasSpec);
    applyToRow(l, p, route, v.reason);
    l.rulings.push(`${v.fingerprint}: ${v.verdict}, ${v.severity}, ${v.kind}, ${route}. ${v.reason}`);
    listRouted(l, route, {
      problem: p,
      route,
      severity: v.severity,
      fingerprint: v.fingerprint,
      reason: v.reason,
    });
  }
}

async function gateway(l: Loop): Promise<void> {
  phase("Gateway");
  const results = JSON.stringify(rowsOf(l));
  const g = must(
    await agent(
      `${l.where}
Check this round before it is pushed, in the worktree ${worktreeOf(l)}: was anything missed? Read the round's diff, and judge it against the spec below and the evidence.
${l.build ? `\nBuild spec:\n${JSON.stringify(l.build)}` : ""}
${l.validate ? `\nValidation spec:\n${JSON.stringify(l.validate)}` : ""}

Criterion results:
${results}

Rulings so far:
${list(l.rulings)}

Return each thing missed. Don't repeat a ruling. Return any document the change affects that isn't on this list:
${list(l.docs)}`,
      { agentType: "slopify:judge", label: "gateway", phase: "Gateway", schema: GATEWAY_SCHEMA },
    ),
    "gateway",
    "The gateway judge's verdict.",
  );
  l.docs = unique([...l.docs, ...g.docsToAdd]);
  await judgeProblems(
    l,
    g.missed.map((m) => ({ source: "gateway judge", location: m.location, text: m.text })),
    "Gateway",
  );
}

// ---- PR ---------------------------------------------------------------------

const countOpen = (l: Loop): number => l.open.length + l.escalated.length;

function heldRows(l: Loop): CriterionState[] {
  return rowsOf(l).filter(
    (r) => (r.result === "cannot-verify" || r.result === "uncategorized") && !allowsReady(r.setting),
  );
}
function unvalidatedRows(l: Loop): CriterionState[] {
  return rowsOf(l).filter(
    (r) => (r.result === "cannot-verify" || r.result === "uncategorized") && allowsReady(r.setting),
  );
}
const rowEntry = (r: CriterionState): Listed => ({
  text: `${r.wording} (${r.result})`,
  detail: r.result === "uncategorized" ? "Suggest a category to add to TESTING.md." : r.detail,
});

function draftReasons(l: Loop): Listed[] {
  const item = (i: OpenItem): Listed => ({
    text: `${i.severity}: ${i.problem.location}: ${i.problem.text}`,
    detail: `${i.reason} Fix attempts: ${String(l.fixes.get(i.fingerprint) ?? 0)}.`,
  });
  return [
    ...l.escalated.map((i) => item(i)),
    ...l.open.map((i) => item(i)),
    ...heldRows(l).map((r) => rowEntry(r)),
    ...(l.review.clean ? [] : [{ text: l.review.note || "The review hasn't come back clean yet." }]),
  ];
}

function body(l: Loop): string {
  return renderBody({
    issue: l.cardId || "none",
    specDir: l.specDir,
    draftReasons: draftReasons(l),
    needsConfirmation: [
      ...l.confirmations,
      ...l.decisions
        .filter((d) => d.affectsAcceptance)
        .map((d) => ({ text: d.question, detail: `Chose: ${d.choice}. Why: ${d.rationale}` })),
    ],
    ...(l.small?.reproduced && { reproduced: l.small.reproduced }),
    criteria: rowsOf(l),
    assumptions: l.decisions.filter((d) => !d.affectsAcceptance).map((d) => `${d.question} ${d.choice}`),
    unverified: l.unverified,
    notValidated: unvalidatedRows(l).map((r) => rowEntry(r)),
    knownDebt: l.knownDebt,
    suggestions: l.suggestions,
    testChanges: unique(l.testChanges),
  });
}

const bodyInstruction = (l: Loop): string =>
  `Write this PR description to ${worktreeOf(l)}/.tmp/pr-body.md, exactly as it stands, and use that file for the body:\n<<<BODY\n${body(l)}\nBODY>>>`;

async function pushRound(l: Loop, last: boolean): Promise<void> {
  phase("Push");
  const { state } = l.d;
  const open = !state.pr && (countOpen(l) === 0 || last);
  const number = l.reviewNumber + 1;
  const steps = state.pr
    ? `Push the branch even if something is still flagged. Then update the PR ${state.pr}. ${bodyInstruction(l)}\nThen fire the review trigger as docs/FORGE.md declares, if it declares one.`
    : open
      ? `Push the branch even if something is still flagged. Then open the branch's PR as a draft as docs/FORGE.md declares. ${bodyInstruction(l)}\nFire the review trigger only if docs/FORGE.md says opening doesn't fire it. ${l.cardId ? `Then attach the PR to card ${l.cardId} as docs/BOARD.md declares.` : ""} Report the PR reference as the operation named pr.`
      : "Push the branch even if something is still flagged. Open no PR yet.";
  const lines = [
    ...(open ? ["done publish <the PR reference>"] : []),
    ...(state.pr || open ? [`review ${String(number)} fired <the trigger time>`] : []),
    `done round ${String(l.round)}`,
  ];
  const r = pushed(
    await inOrder(l, () => callPusher(l.d.pushBrief(steps, lines), "push the round", "Push")),
    "A push of the story branch, and its PR.",
  );
  if (open) state.pr = opRef(r, "pr");
  if (state.pr) l.reviewNumber = number;
}

// Each dispatch waits at most this long, and the forge's own limits make the watcher report timed-out before long.
const WATCH_MINUTES = 9;
const WATCH_DISPATCHES = 40;

async function waitForReview(l: Loop) {
  const { state } = l.d;
  for (let n = 1; n <= WATCH_DISPATCHES; n += 1) {
    const w = must(
      await agent(
        `${l.where}
Wait for review ${String(l.reviewNumber)} of this pull request, as docs/FORGE.md's review-status binding declares: first for the review to start, then for it to finish. Wait at most ${String(WATCH_MINUTES)} minutes in this dispatch, then return pending. On finished, return each finding with its id, its location (path:line, or empty), and its text. Change nothing.

Pull request: ${state.pr}
Worktree: ${worktreeOf(l)}`,
        {
          agentType: "slopify:watcher",
          label: `review ${String(l.reviewNumber)} wait ${String(n)}`,
          phase: "Review",
          schema: WATCHER_SCHEMA,
        },
      ),
      "review",
      "The review's status.",
    );
    if (w.outcome !== "pending") return w;
  }
  return null;
}

async function reviewRound(l: Loop): Promise<void> {
  phase("Review");
  const w = await waitForReview(l);
  const outcome = w?.outcome ?? "timed-out";
  await inOrder(l, () =>
    callPusher(
      l.d.pushBrief("Do nothing except append the ledger line.", [
        `review ${String(l.reviewNumber)} ended ${outcome}: ${String(w?.findings.length ?? 0)} finding(s)`,
      ]),
      "record the review",
      "Review",
    ),
  );
  // A project that declares no review has nothing to wait for, so that can't hold its PR back.
  l.review = {
    clean: outcome === "finished" || outcome === "not-declared",
    note: outcome === "finished" || outcome === "not-declared" ? "" : `Review ${String(l.reviewNumber)} ${outcome}.`,
  };
  await judgeProblems(
    l,
    (w?.findings ?? []).map((f) => ({ source: "the review", location: f.location, text: f.text })),
    "Review",
  );
}

// ---- Exit -------------------------------------------------------------------

async function finish(l: Loop, ready: boolean): Promise<void> {
  const { state } = l.d;
  const issues =
    l.newIssues.length > 0
      ? `File one Linear issue for each of these, as docs/BOARD.md declares:\n${list(l.newIssues.map((i) => `${i.text} ${i.detail ?? ""}`))}\n`
      : "";
  const questions = [
    ...l.decisions.filter((d) => d.affectsAcceptance).map((d) => `${d.question} We chose: ${d.choice}.`),
    ...draftReasons(l).map((x) => x.text),
  ];
  const card = l.cardId
    ? ready
      ? `Perform the operations docs/BOARD.md declares for when the PR's review is clean on card ${l.cardId} (for example moving it to In Review), and comment on the card with the evidence and assumptions:\n${list(questions)}`
      : `Comment on card ${l.cardId} with what is open:\n${list(questions)}`
    : "";
  pushed(
    await inOrder(l, () =>
      callPusher(
        l.d.pushBrief(
          `Update the PR ${state.pr}. ${bodyInstruction(l)}\n${ready ? "Mark the PR ready for review, as docs/FORGE.md declares.\n" : "Leave it a draft.\n"}${issues}${card}`,
          [`delivery ${ready ? "ready" : "draft"}`],
        ),
        ready ? "mark the PR ready" : "report the draft",
        "Push",
      ),
    ),
    "The final PR update.",
  );
}

// ---- The outer loop ---------------------------------------------------------

// The app runs before the PR opens, and again only if that run failed; a review fix has only the checks.
async function validateSmall(l: Loop): Promise<void> {
  if (l.round > 0 && l.affected.length === 0) return;
  const v = await runValidation({
    where: l.where,
    worktree: worktreeOf(l),
    criteria: l.validate?.criteria ?? [],
    focus: [],
    changed: [],
    checks: false,
  });
  for (const r of v.rows) l.rows[r.id] = r;
  for (const p of v.problems) {
    l.open.push({ problem: p, route: "coder", severity: "blocker", fingerprint: p.text, reason: "" });
  }
}

async function round(l: Loop, last: boolean): Promise<void> {
  if (l.round > 0 || !l.built) await buildRound(l);
  if (l.small) {
    await validateSmall(l);
  } else {
    await judgeProblems(l, await validateRound(l), "Judge");
    await gateway(l);
  }
  await pushRound(l, last);
}

function freshLoop(input: LoopInput): Loop {
  return {
    ...input,
    docs: input.build?.docs ?? [],
    round: 0,
    reviewNumber: input.startAtReview > 0 ? input.startAtReview - 1 : 0,
    open: [],
    escalated: [],
    rows: {},
    affected: [],
    fixes: new Map(),
    differently: new Set(),
    rulings: [],
    decisions: input.build?.decisions ?? [],
    unverified: [],
    confirmations: [],
    knownDebt: [],
    suggestions: [],
    newIssues: [],
    testChanges: [],
    review: { clean: false, note: "" },
    changedThisRound: [],
    openByRound: [],
    commits: Promise.resolve(),
    halted: null,
  };
}

function nextStep(l: Loop): "clean" | "held" | "fix" | "end" {
  const g = gate({
    prOpen: !!l.d.state.pr,
    reviewClean: l.review.clean,
    open: countOpen(l),
    held: heldRows(l).length,
  });
  if (g !== "fix") return g;
  if (l.round >= MAX_FIX_ROUNDS || noProgress(l.openByRound)) return "end";
  // Only open items can start a round; a failed review with nothing to fix has nothing left to run.
  return l.open.length > 0 || !l.d.state.pr ? "fix" : "end";
}

/** Run the loop until the delivery is clean or a limit ends it. */
export async function runLoop(input: LoopInput): Promise<LoopResult> {
  const l = freshLoop(input);
  if (input.startAtReview > 0) {
    l.reviewNumber = input.startAtReview;
    await reviewRound(l);
  } else {
    await round(l, false);
    if (l.d.state.pr) await reviewRound(l);
  }
  l.openByRound.push(countOpen(l));
  for (let step = nextStep(l); step === "fix"; step = nextStep(l)) {
    l.round += 1;
    await round(l, l.round >= MAX_FIX_ROUNDS || noProgress([...l.openByRound, countOpen(l)]));
    if (l.d.state.pr) await reviewRound(l);
    l.openByRound.push(countOpen(l));
  }
  return endLoop(l, nextStep(l) === "clean");
}

async function endLoop(l: Loop, ready: boolean): Promise<LoopResult> {
  // A limit ended the loop before the PR opened: anything still open is what keeps it a draft.
  if (!l.d.state.pr) await pushRound(l, true);
  await finish(l, ready);
  return {
    status: ready ? "ready" : "draft",
    rounds: l.round,
    pr: l.d.state.pr,
    review: l.review.note || "clean",
    draftReasons: ready ? [] : draftReasons(l),
    decisions: l.decisions.filter((d) => d.affectsAcceptance).map((d) => d.id),
  };
}

/** A short account of how the run ended, for the session to relay. */
export function reportOf(workflowName: string, r: LoopResult, specDir = ""): string {
  return [
    `${workflowName} finished: the PR is ${r.status === "ready" ? "ready for review" : "a draft"}.`,
    `PR: ${r.pr}.`,
    specDir ? `Spec: ${specDir}.` : "",
    `Fix rounds: ${String(r.rounds)}. Review: ${r.review}.`,
    r.draftReasons.length > 0 ? `Why it is a draft:\n${r.draftReasons.map((x) => `- ${x.text}`).join("\n")}` : "",
    r.decisions.length > 0 ? `Decisions to confirm: ${r.decisions.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
