import {
  LENS_SCHEMA,
  scout,
  lens,
  fact,
  absent,
  shaped,
  sameRev,
  parseSpec,
  settledText,
  settleDecisions,
  blocked,
  type Answers,
  type Blocked,
  type Decision,
  type LensResult,
  type Need,
  type NeedKind,
  type ScoutResult,
  type Shape,
} from "../lib/family.ts";
import { answersOf, inputOf, isRecord, whereOf } from "../lib/input.ts";
import { coderSchema, pusherSchema, writerSchema } from "../lib/schemas.ts";

export const meta = {
  name: "review-pr",
  description:
    "Wait for a pull request review, sort its findings, fix the real defects, and push each round only after a fresh qa passes, for at most three rounds or until a review is clean",
  whenToUse:
    "Run only when the user invokes /slopify:review-pr or asks for the slopify review-pr workflow; deliver-story and deliver-bugfix also run it as their last step. Args: {pr, worktree?, spec?, story?, test?, findings?, exclude?, projectRoot?, answers?}, or the pull request as a plain string. pr names the pull request, worktree is its story worktree, spec and story are the acceptance source when known, test is the regression test path that belongs with the spec on the ledger, findings are review findings to use in round 1 instead of waiting, projectRoot defaults to the session project directory, answers maps a blocked need id to the answer, and exclude lists the dirty paths the caller identified as outside its scope, which this workflow never stages; a producer that changes one leaves it unstaged and the result names it in leftForUser.",
  phases: [
    {
      title: "Locate",
      detail:
        "scout-checkpoint reports the PR, worktree, and ledger state; scout-card reads the PR card; pusher recovers a missing worktree",
    },
    { title: "Wait", detail: "watcher waits for review n, one dispatch at a time" },
    { title: "Sort", detail: "one lens-finding per review finding, in parallel" },
    {
      title: "Fix",
      detail:
        "coder fixes code defects while writer fixes spec and documentation defects; lens-scope and lens-consistency pass a revised spec first",
    },
    { title: "Validate", detail: "a fresh qa judges the fixes, with lens-docs when documentation changed" },
    {
      title: "Push",
      detail: "pusher commits, pushes, updates the PR, re-fires the review trigger, and appends the ledger",
    },
  ],
} as const satisfies WorkflowMeta;

// ---- Local schemas ---------------------------------------------------------

const PATHS = "Paths, absolute or relative to the worktree";

const WRITER_SCHEMA = writerSchema({
  produced: "Absolute paths of the files written or changed; the spec path when the spec was revised",
  revision: "git hash-object of the main artifact written",
  openDecisions: "Decisions only the user can make",
  storyBlockers: "Reasons the story cannot be built or fixed as stated; empty when none",
});

const CODER_SCHEMA = coderSchema({
  changed: PATHS,
  tests: PATHS,
  ran: "Each command run, as: command -> result",
  revision: "The candidate revision left: <HEAD sha>+<digest>",
  specMismatch: "Why the spec cannot be followed; an empty string when none",
});

const PUSHER_SCHEMA = pusherSchema({ reference: "A commit sha, PR URL or path, card id, or worktree path" });

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

type WriterResult = Infer<typeof WRITER_SCHEMA>;
type DocWriterResult = WriterResult & { open: Decision[] };
type CoderResult = Infer<typeof CODER_SCHEMA>;
type PusherResult = Infer<typeof PUSHER_SCHEMA>;
type WatcherResult = Infer<typeof WATCHER_SCHEMA>;
type Review = WatcherResult & { note?: string };

interface RawFinding {
  id?: unknown;
  location?: unknown;
  text?: unknown;
  problem?: unknown;
}

interface ReviewFinding {
  id: string;
  location: string;
  text: string;
}
interface WorkItem extends ReviewFinding {
  why: string;
}
interface Attempt {
  gate: string;
  approach: string;
  failed: string;
}
interface Sorted {
  defects: { finding: ReviewFinding; why: string }[];
  nonIssues: { finding: string; reason: string }[];
  unverified: { finding: string; missing: string }[];
}
interface RoundRecord {
  round: number;
  defectsFixed: string[];
  nonIssues: Sorted["nonIssues"];
  unverified: Sorted["unverified"];
  verdict: string;
  note?: string;
  validations?: string[];
  pushed?: string;
  unmet?: string[];
}
interface ReviewOutcome {
  outcome: string;
  round: number;
  reference: string;
  note?: string;
}
interface Checkpoint {
  worktree?: string;
  branch?: string;
  spec?: string;
  ledger?: string;
  pr: string;
}
interface RoundState {
  base: WorkItem[];
  feedback: WorkItem[];
  dirtyAll: string[];
  stage: Set<string>;
  docsChanged: boolean;
  specRevised: boolean;
  specRevision: string;
  coder: CoderResult | null;
  writer: DocWriterResult | null;
  validations: number;
  pass: number;
  label: string;
  validationLog: string[];
}

type Stopped = Blocked & { completed: string[]; checkpoint: Checkpoint; attempts: Attempt[] };
interface Halt {
  stop: Stopped;
}
interface Ok {
  stop?: undefined;
  ok: true;
}
interface Validated {
  stop?: undefined;
  pass: boolean;
  feedback: WorkItem[];
  verdicts: LensResult[];
  label: string;
}
type Waited = { stopped: true; review?: undefined } | { stopped?: undefined; review: Review };
/** What locate reads for the resume rule. */
interface Resume {
  pushedAhead: boolean;
  unpushed: boolean;
  fired: number;
}

export type ReviewPrResult =
  | Stopped
  | { status: "not-started"; next: string }
  | {
      status: "done";
      workflow: "review-pr";
      skipped: string[];
      attempts: Attempt[];
      pr: string;
      rounds: RoundRecord[];
      review: ReviewOutcome | null;
      unfixed: { finding: string; reason: string }[];
      leftForUser?: string[];
      report: string;
    };

const listOf = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);
// A list's first item, or the value itself when it is not a list.
const firstOf = (v: unknown): unknown => (Array.isArray(v) ? listOf(v)[0] : v);

// ---- Inputs ----------------------------------------------------------------

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

function normFindings(items: unknown): ReviewFinding[] {
  const out: ReviewFinding[] = [];
  for (const [i, f] of listOf(items).entries()) {
    if (typeof f === "string" && f.trim()) {
      out.push({ id: `f${i + 1}`, location: "", text: f.trim() });
    } else if (isRecord(f)) {
      const g: RawFinding = f;
      if (g.text || g.problem)
        out.push({ id: str(g.id) || `f${i + 1}`, location: str(g.location), text: String(g.text || g.problem).trim() });
    }
  }
  return out;
}

interface Input {
  pr: string;
  projectRoot: string;
  storyText: string;
  testPath: string;
  excluded: string[];
  answers: Answers;
  givenFindings: ReviewFinding[];
  worktree: string;
  spec: string;
}

function readInput(a: unknown): Input {
  // A JSON number is the pull request's number.
  const input = inputOf(a, "pr", true);
  return {
    pr: str(input["pr"]),
    projectRoot: str(input["projectRoot"]),
    storyText: str(input["story"]),
    testPath: str(firstOf(input["test"])),
    // Dirty paths the caller deliberately left uncommitted (outside its assigned paths): never staged, never briefed.
    // The ledger's exclude line adds to them once the checkpoint is read.
    excluded: listOf(input["exclude"])
      .map((x) => str(x))
      .filter(Boolean),
    answers: answersOf(input["answers"]),
    givenFindings: normFindings(input["findings"]),
    worktree: str(input["worktree"]),
    spec: str(input["spec"]),
  };
}

const MAX_ROUNDS = 3;
const MAX_FAILURES = 3;
const WATCH_MINUTES = 9;
const FINAL_ROUND = MAX_ROUNDS + 1;
const NO_LIMIT_DISPATCHES = 12; // when the forge declares no review time limit

const READ_ONLY =
  "You only read and report here: make no commit, push, branch, worktree, pull request comment, review trigger, or board change.";
const NO_FORGE_WRITES =
  "Do not commit, push, create or remove branches or worktrees, comment on the pull request, fire a review trigger, or change the board or forge; pusher does all of that.";
const AUTH =
  "Authorization: the user invoked the review loop on this pull request. You may create or recover the story worktree, make attributable commits, push the story branch after the gates passed, update this pull request, re-fire the declared review trigger, and append ledger lines. You may not merge, release, send other messages, change a card, force-push, or rewrite history. Work exactly as docs/BOARD.md and docs/FORGE.md declare, resolving their relative paths against the main checkout root. Report any operation they do not bind in unmet; never improvise one.";

// ---- Small helpers ---------------------------------------------------------

const list = (items: readonly string[]): string =>
  items.length > 0 ? items.map((x) => `- ${x}`).join("\n") : "- none";
// Each checkpoint key's expected shape (see shaped in the shared block); a key without one is text.
const KINDS: Readonly<Record<string, Shape>> = {
  worktree: "path",
  ledger: "path",
  head: "sha",
  "pushed-head": "sha",
  "fired-head": "sha",
  base: "sha",
  "story-revision": "sha",
  branch: "branch",
};
// A checkpoint item's value, or '' when it says there is none or lacks the expected shape. A shaped item
// followed by a remark is the item. A text value is none only for a bare none reply.
function val(res: ScoutResult | null, key: string): string {
  const v = fact(res, key);
  if (key === "spec") return specOf(v);
  const kind = KINDS[key];
  return kind ? shaped(kind, v) : absent(v, true) ? "" : v;
}
// The spec's path from "<path>@<hash>", "<path> <hash>", or a bare path, in the story worktree or relative to it.
function specOf(v: string): string {
  // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short line from a scout
  const s = parseSpec((v.split("\n", 1)[0] ?? "").replace(/\s*\([^)]*\)\s*$/, ""));
  return s ? shaped("path", s.path) || shaped("rel", s.path) : shaped("path", v) || shaped("rel", v);
}
// The highest round on 'review <n> fired|ended' text, else a bare number; never a digit run from a timestamp.
function reviewRound(v: string): number {
  const t = v.trim();
  if (absent(t)) return 0;
  let best = 0;
  for (const m of t.matchAll(/review\s+(\d+)\s+(?:fired|ended)/gi)) best = Math.max(best, Number(m[1]));
  if (best) return best;
  const bare = /^(?:round\s+)?(\d+)$/i.exec(t);
  return bare ? Number(bare[1]) : 0;
}
const need = (id: string, kind: NeedKind, what: string, evidence: string): Need => ({ id, kind, what, evidence });

const isTmp = (p: string): boolean => /(?:^|\/)\.tmp(?:\/|$)/.test(p);

// A dirty entry as bare paths: a git status code and a trailing remark are dropped, and a rename keeps both paths.
function dirtyEntry(x: string): string[] {
  const t = x
    .trim()
    .replace(/^[ MADRCUT?!]{1,2}\s+/, "")
    // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short line from a scout
    .replace(/\s+\([^)]*\)$/, "");
  const m = /^(.*) -> (.*)$/.exec(t);
  return m ? [m[1] ?? "", m[2] ?? ""] : [t];
}

// A .txt file is prose unless it is a build or dependency file (requirements*.txt, constraints*.txt, CMakeLists.txt).
const BUILD_TXT =
  /(?:^|\/)(?:cmakelists|[\w.-]*(?:requirements|constraints)[\w.-]*|dependencies|packages|manifest|robots|sources|version)\.txt$/i;

const CHECKPOINT_KEYS =
  "worktree branch head base pushed-head unpushed dirty ledger review-fired fired-head fired-ancestor review-ended ledger-exclude spec pr";

// A validator verdict counts only when it passes, carries no blocking finding, and names the revision
// the brief gave it in evaluated (see sameRev in the shared block). A brief with no revision to name
// accepts any evaluated.
const named = (v: LensResult, rev: string): boolean => sameRev(rev, v.evaluated);
const passes = (v: LensResult | null, rev: string): boolean =>
  !!v && v.verdict === "pass" && v.findings.every((f) => !f.blocking) && named(v, rev);
// Whether every slot holds a verdict on the revision.
const judged = (verdicts: readonly (LensResult | null)[], rev: string): verdicts is LensResult[] =>
  verdicts.every((v) => !!v && named(v, rev));
function problems(v: LensResult | null, rev: string): string[] {
  if (!v) return ["no verdict returned"];
  const out = v.findings.filter((f) => v.verdict !== "pass" || f.blocking).map((f) => `${f.location}: ${f.problem}`);
  if (!named(v, rev)) out.push(`judged ${v.evaluated || "no revision"}, not the briefed revision ${rev}`);
  if (out.length === 0) out.push(`${v.verdict}: ${v.limits}`);
  return out;
}
// A pass that carries a blocking finding is no pass.
const blockedPass = (v: LensResult): boolean => v.verdict === "pass" && v.findings.some((x) => x.blocking);
// A verdict is usable when it names the candidate revision and a pass carries no blocking finding.
const usable = (v: LensResult | null | undefined, head: string): boolean => !!v && named(v, head) && !blockedPass(v);

// What the producers must fix after a failed validation: each blocking finding, or the verdict's problems.
function feedbackOf(verdicts: readonly LensResult[], label: string, validation: number): WorkItem[] {
  const feedback: WorkItem[] = [];
  for (const [i, v] of verdicts.entries()) {
    if (passes(v, label)) continue;
    const src = i === 0 ? "qa" : "lens-docs";
    const blockers = v.findings.filter((f) => f.blocking);
    if (blockers.length > 0)
      for (const [k, f] of blockers.entries())
        feedback.push({ id: `${src}-${validation}-${k + 1}`, location: f.location, text: f.problem, why: "" });
    else
      feedback.push({
        id: `${src}-${validation}`,
        location: "",
        text: problems(v, label).join("; "),
        why: "",
      });
  }
  return feedback;
}

// A spec revision both lenses passed: the round commits it alone, first.
function acceptSpec(st: RoundState, w: WriterResult): Ok {
  st.specRevised = true;
  st.specRevision = w.revision;
  for (const p of w.produced) st.stage.add(p);
  return { ok: true };
}

// The candidate's label: the coder's revision, else the documentation writer's, else the spec's.
const labelOf = (st: RoundState, wantCoder: boolean, wantDocs: boolean): string =>
  (wantCoder && st.coder ? st.coder.revision : wantDocs && st.writer ? st.writer.revision : st.label) ||
  st.specRevision ||
  "";

// The leading integer of a count, as parseInt reads it; NaN when there is none.
const leadingInt = (t: string): number => Number(/^[+-]?\d+/.exec(t)?.[0]);

const ASSUMPTIONS =
  "Decide anything that does not change the story's outcome yourself, and record it in the document as a labelled assumption (\"Assumption: ...\"). Raise an open decision only for a choice that would change the story's outcome.";

// After a dispatch that ended pending: the review as timed-out once this phase's dispatches reach their cap,
// else null. A declared limit bounds the dispatches; an undeclared (or zero) one means no limit, so a generous
// fixed cap bounds them instead of ending the review at once.
function cappedReview(r: number, res: WatcherResult, w: "start" | "finish", count: number): Review | null {
  const limit = res.limitMinutes || 0;
  const cap = limit > 0 ? Math.ceil(limit / WATCH_MINUTES) + 1 : NO_LIMIT_DISPATCHES;
  if (count < cap) return null;
  log(
    `Review ${r} did not ${w} within ${limit > 0 ? "its declared limit" : "the fixed cap"}; treating it as timed-out`,
  );
  return {
    ...res,
    outcome: "timed-out",
    ...(limit <= 0 && {
      note: `docs/FORGE.md declares no time limit for the review, so the wait was capped at ${NO_LIMIT_DISPATCHES} dispatches of ${WATCH_MINUTES} minutes (about ${NO_LIMIT_DISPATCHES * WATCH_MINUTES} minutes).`,
    }),
  };
}

// Sort one finding by its verdict. A verdict on another revision, or a pass that carries a blocking finding,
// is not trusted.
function sortInto(out: Sorted, f: ReviewFinding, verdict: LensResult | null | undefined, head: string): void {
  let v = verdict;
  if (v && (!named(v, head) || blockedPass(v))) {
    v = { verdict: "unverified", evaluated: v.evaluated, findings: [], limits: problems(v, head).join("; ") };
  }
  const why = v?.findings.length ? v.findings.map((x) => x.problem).join("; ") : "";
  if (v?.verdict === "fail") out.defects.push({ finding: f, why });
  else if (v?.verdict === "pass")
    out.nonIssues.push({ finding: f.text, reason: why || "the lens found the change free of it" });
  else out.unverified.push({ finding: f.text, missing: v ? v.limits : "the lens did not return a verdict" });
}

const workBrief = (items: readonly WorkItem[]): string =>
  list(
    items.map(
      (i) => `${i.id}${i.location ? ` at ${i.location}` : ""}: ${i.text}${i.why ? ` (the lens found: ${i.why})` : ""}`,
    ),
  );

const dirtyBrief = (paths: readonly string[]): string =>
  paths.length > 0
    ? `\nUncommitted changes in these paths come from an interrupted run of this step; inspect them, keep what serves your assignment, and continue from them rather than starting over:\n${list(paths)}`
    : "";

// The fix commit among the operations a push reported. The spec is committed first, alone, so the fix
// commit is the commit operation the brief names `commit`, else the last commit that is not the spec's.
function fixCommit(pushed: PusherResult | null): string {
  const commits = (pushed?.operations ?? []).filter((o) => /commit/i.test(o.op) && o.reference);
  const namedCommits = commits.filter((o) => o.op.trim().toLowerCase() === "commit");
  const rest = commits.filter((o) => !/spec/i.test(`${o.op} ${o.result}`));
  const pick = namedCommits.length > 0 ? namedCommits.at(-1) : rest.length > 0 ? rest.at(-1) : commits.at(-1);
  return pick ? pick.reference : "";
}

function roundRecord(
  round: number,
  sorted: Sorted | null,
  verdict: string,
  extra?: Omit<Partial<RoundRecord>, "round" | "verdict">,
): RoundRecord {
  return {
    round,
    defectsFixed: [],
    nonIssues: sorted ? sorted.nonIssues : [],
    unverified: sorted ? sorted.unverified : [],
    verdict,
    ...extra,
  };
}

function endedBy(res: Review, round: number): ReviewOutcome {
  return { outcome: res.outcome, round, reference: res.reference || "", ...(res.note && { note: res.note }) };
}

// ---- Report ----------------------------------------------------------------

function roundLine(rd: RoundRecord): string {
  const bits = [`Round ${rd.round}: ${rd.verdict}`];
  if (rd.defectsFixed.length > 0) bits.push(`fixed ${rd.defectsFixed.length} (${rd.defectsFixed.join("; ")})`);
  if (rd.nonIssues.length > 0)
    bits.push(
      `non-issues ${rd.nonIssues.length} (${rd.nonIssues.map((x) => `${x.finding} -- ${x.reason}`).join("; ")})`,
    );
  if (rd.unverified.length > 0)
    bits.push(
      `unverified ${rd.unverified.length} (${rd.unverified.map((x) => `${x.finding} -- missing: ${x.missing}`).join("; ")})`,
    );
  if (rd.validations?.length) bits.push(`qa: ${rd.validations.join(" | ")}`);
  if (rd.note) bits.push(rd.note);
  return bits.join("; ");
}

function endLine(review: ReviewOutcome | null, unfixed: number): string {
  const o = review ? review.outcome : "none";
  const at = review ? review.round : 0;
  switch (o) {
    case "not-declared": {
      return "Ended: No review is declared in docs/FORGE.md; nothing to wait for.";
    }
    case "clean": {
      return `Ended: clean review at round ${at}.`;
    }
    case "no-defects": {
      return `Ended: no defects at round ${at}, but some findings are unverified.`;
    }
    case "defects-remain": {
      return `Ended: ${MAX_ROUNDS} rounds done; review ${at} still has ${unfixed} unfixed defect(s).`;
    }
    default: {
      return `Ended: review ${at} ${o}.${review?.note ? ` ${review.note}` : ""}`;
    }
  }
}

function buildReport(
  pr: string,
  rounds: readonly RoundRecord[],
  review: ReviewOutcome | null,
  unfixed: number,
  leftForUser: ReadonlySet<string>,
): string {
  const lines = [`review-pr on ${pr}`];
  for (const rd of rounds) {
    if (rd.verdict !== "not-declared") lines.push(roundLine(rd));
  }
  lines.push(endLine(review, unfixed));
  if (leftForUser.size > 0)
    lines.push(
      `Left for the user, not staged (excluded by the caller, but changed by a producer): ${[...leftForUser].join(", ")}.`,
    );
  return lines.join("\n");
}

export default async function run(): Promise<ReviewPrResult> {
  const input = readInput(args);
  if (!input.pr) {
    return {
      status: "not-started",
      next: "Ask the user which pull request to review (a number, URL, or path), then invoke again.",
    };
  }
  const { pr, projectRoot, storyText, testPath, excluded, answers, givenFindings } = input;

  const WHERE = whereOf(projectRoot);

  // ---- State and small helpers -----------------------------------------------

  const attempts: Attempt[] = [];
  const skipped: string[] = [];
  const completed: string[] = [];
  const rounds: RoundRecord[] = [];
  let watchFailures = 0;
  let fixFailures = 0;
  let specFailures = 0;
  let validateFailures = 0;

  let cp: ScoutResult | null = null; // the latest scout-checkpoint result
  let worktree = input.worktree;
  let specPath = input.spec;
  let head = "";
  let baseCommit = "";
  let dirtyPaths: string[] = [];
  // Set by locate from the checkpoint.
  let branch = "";
  let prDescription = "";

  function checkpointOf(): Checkpoint {
    const cpBranch = val(cp, "branch");
    const ledger = val(cp, "ledger");
    return {
      ...(worktree && { worktree }),
      ...(cpBranch && { branch: cpBranch }),
      ...(specPath && { spec: specPath }),
      ...(ledger && { ledger }),
      pr,
    };
  }

  function stop(step: string, needs: Need[]): Stopped {
    return blocked("review-pr", step, needs, { completed, checkpoint: checkpointOf(), attempts });
  }

  function parseDirty(v: string): string[] {
    const t = v.trim();
    return absent(t)
      ? []
      : t
          .split(/[\n,]+/)
          // Prose, such as "clean (nothing to commit)", is no entry: a path before a remark names a directory or file.
          .filter((x) => !/^\s*\(/.test(x) && !/^[^/.]*\s\(/.test(x.trim()))
          .flatMap((x) => dirtyEntry(x))
          .filter((x) => x && !absent(x) && !isTmp(x))
          .filter((x) => excluded.every((e) => !samePath(x, e)));
  }

  // Worktree-relative form of a path, for comparing the same file spelled two ways.
  function relPath(p: string): string {
    const t = p.trim();
    return worktree && t.startsWith(worktree + "/") ? t.slice(worktree.length + 1) : t.replace(/^\.\//, "");
  }

  // Whether two spellings name one file: equal worktree-relative forms, or a relative spelling that ends one
  // absolute spelling. Two relative paths match only when equal, so docs/README.md is not README.md.
  function samePath(a: string, b: string): boolean {
    const x = relPath(a);
    const y = relPath(b);
    if (!x || !y) return false;
    if (x === y) return true;
    const xAbs = x.startsWith("/");
    return xAbs !== y.startsWith("/") && (xAbs ? x.endsWith("/" + y) : y.endsWith("/" + x));
  }

  // Markdown and text documents and the spec go to the writer; everything else goes to the coder. The kind of
  // file decides, not its directory: code under docs/ or doc/ (docs/conf.py, pkg/doc/render.go) is code.
  const isSpec = (loc: string): boolean => !!specPath && samePath(loc.replace(/:\d+(?:-\d+)?$/, ""), specPath);
  const isDoc = (loc: string): boolean => {
    const p = loc.replace(/:\d+(?:-\d+)?$/, "");
    return (
      isSpec(p) ||
      /\.(?:md|mdx|rst|adoc)$/i.test(p) ||
      (/\.txt$/i.test(p) && !BUILD_TXT.test(p)) ||
      /(?:^|\/)readme$/i.test(p)
    );
  };

  // Dispatch validators, and dispatch again any with no verdict or a verdict on another revision, under that
  // bound alone: such a verdict is not a failure of the gate and sends no producer to fix. A slot still
  // without a verdict on the revision after the bound is returned as it is, for the caller to stop on.
  async function judgeAll(
    jobs: readonly (() => Promise<LensResult | null>)[],
    rev: string,
  ): Promise<(LensResult | null)[]> {
    const out = Array.from<LensResult | null, LensResult | null>({ length: jobs.length }, () => null);
    for (let n = 0; n < MAX_FAILURES; n++) {
      const todo = jobs
        .map((job, i) => ({ job, i }))
        .filter(({ i }) => {
          const v = out[i];
          return !(v && named(v, rev));
        });
      if (todo.length === 0) break;
      if (n > 0)
        attempts.push({
          gate: "validator",
          approach: `re-run ${todo.length} validator(s) on ${rev}`,
          failed: "no verdict, or a verdict on another revision",
        });
      const res = await parallel(todo.map((t) => t.job));
      for (const [k, t] of todo.entries()) out[t.i] = res[k] ?? null;
    }
    return out;
  }

  function checkpointPrompt(keys: string, note: string): string {
    return `${WHERE}
${READ_ONLY}

Report where the review loop on this pull request stands from its durable checkpoints. Return each of these keys that exists as one evidence item whose source is the key and whose excerpt is its value; leave out a key that does not exist: ${keys}.
- worktree, branch, head, dirty: the story worktree for the pull request's head branch, named as docs/FORGE.md names it. head is its HEAD sha. dirty lists the paths with uncommitted changes, ignoring .tmp/, or is none.
- base: the pull request's base commit, the merge base of the head branch and the target branch docs/FORGE.md declares.
- pushed-head: the head commit sha of the pull request's branch as the remote has it, not the worktree's HEAD. unpushed: how many commits the worktree's HEAD holds that the pushed head lacks, or none.
- ledger: the absolute path of the worktree's .tmp/ledger.md, only when it exists. review-fired and review-ended: the highest review round numbers on its review lines after the last done publish line. fired-head: the sha after "head" on the last review fired line, when it has one. fired-ancestor: yes when fired-head is an ancestor of the worktree's HEAD (git merge-base --is-ancestor), otherwise no; leave it out when there is no fired-head.
- ledger-exclude: the paths after the word "exclude" on the last ledger line whose text, after its leading timestamp, starts with that word, comma-separated, or none
- spec: the current spec path and its git hash-object, written <absolute path>@<git hash-object>, when the story has a spec.
- pr: the pull request's description, read through docs/FORGE.md's read binding when it declares one; leave the key out when it declares none.

Pull request: ${pr}${worktree ? `\nWorktree: ${worktree}` : ""}${note ? `\n${note}` : ""}`;
  }

  // ---- Locate ----------------------------------------------------------------

  // The pull request identifies its card, so the card is read after the checkpoint.
  let card: ScoutResult | null = null;
  let hasCard = false;
  let cardLoaded = false;
  // Read only when the findings need an acceptance source, so a pull request with no review to wait for ends first.
  async function loadCard(): Promise<void> {
    if (cardLoaded) return;
    cardLoaded = true;
    if (storyText) {
      skipped.push("card");
      return;
    }
    card = await scout(
      "scout-card",
      `${WHERE}
${READ_ONLY}

Read the one card this pull request delivers, the card its description, title, or branch names, through the read bindings in docs/BOARD.md. Quote the card's content and acceptance criteria exactly in the answer, and report its story revision as the evidence item story-revision. With no board, or no card named, say so in the answer and return no story-revision.

Pull request: ${pr}
Its description and state:
${prDescription || "not readable: docs/FORGE.md declares no read binding for it"}`,
      { label: "card", phase: "Locate" },
    );
    hasCard = !!card && !!val(card, "story-revision");
  }

  async function recoverWorktree(): Promise<Stopped | null> {
    const recovered = await agent(
      `${WHERE}
${AUTH}

Recover the story worktree for this pull request's head branch, as docs/FORGE.md declares: check the branch out in a worktree named as docs/FORGE.md names it, and change nothing else. Return the worktree's absolute path as the reference of an operation named worktree.

Pull request: ${pr}
Branch: ${val(cp, "branch") || "the pull request head branch"}`,
      { agentType: "slopify:pusher", label: "recover worktree", phase: "Locate", schema: PUSHER_SCHEMA },
    );
    const op = recovered?.done
      ? recovered.operations.find((o) => /worktree/i.test(o.op) && o.reference.startsWith("/"))
      : null;
    if (!op) {
      return stop("locate", [
        need(
          "locate-3",
          "prerequisite",
          "A worktree for the pull request branch.",
          recovered ? recovered.unmet.join("; ") || "pusher returned no worktree path" : "pusher did not return",
        ),
      ]);
    }
    worktree = op.reference;
    cp =
      (await scout("scout-checkpoint", checkpointPrompt(CHECKPOINT_KEYS, "The worktree was just recovered."), {
        label: "checkpoint after recovery",
        phase: "Locate",
      })) ?? cp;
    return null;
  }

  // Read the checkpoint state the rounds start from.
  function readCheckpoint(): Resume {
    if (!specPath) specPath = val(cp, "spec");
    // Findings are judged against the pull request as the forge has it. A local commit that was never pushed
    // (a fix whose push failed, or an interrupted round) is not part of it, whatever the worktree's HEAD says.
    const pushedHead = val(cp, "pushed-head");
    const unpushed = leadingInt(fact(cp, "unpushed").trim()) > 0;
    // The `review <n> fired` line names the head that review judges. A pushed head beyond it, which is also the
    // worktree's HEAD and descends from the fired head, is this workflow's own fix pushed after that review fired,
    // and the steps after the push (PR update, re-fire, ledger) may not have run. A pushed head that is not the
    // worktree's (someone else's push or rebase) is not: its review is waited for and sorted as usual.
    const firedHead = val(cp, "fired-head");
    const pushedAhead =
      !!firedHead &&
      !!pushedHead &&
      !sameRev(firedHead, pushedHead) &&
      !sameRev(pushedHead, firedHead) &&
      !!val(cp, "head") &&
      sameRev(val(cp, "head"), pushedHead) &&
      /^yes/i.test(val(cp, "fired-ancestor"));
    head = pushedHead || val(cp, "head");
    baseCommit = val(cp, "base");
    for (const x of val(cp, "ledger-exclude").split(/[\n,]+/)) {
      const p = x.trim();
      if (p && !absent(p) && !isTmp(p) && excluded.every((e) => !samePath(p, e))) excluded.push(p);
    }
    dirtyPaths = parseDirty(fact(cp, "dirty"));
    branch = val(cp, "branch");
    prDescription = val(cp, "pr");
    // Resume rule: round = the highest review fired after the last done publish, else 1.
    return { pushedAhead, unpushed, fired: reviewRound(fact(cp, "review-fired")) };
  }

  async function locate(): Promise<Stopped | Resume> {
    phase("Locate");

    cp = await scout("scout-checkpoint", checkpointPrompt(CHECKPOINT_KEYS, ""), {
      label: "checkpoint",
      phase: "Locate",
    });
    if (!cp) {
      return stop("locate", [
        need(
          "locate-1",
          "prerequisite",
          "A checkpoint report for the pull request; the scout did not return.",
          "scout-checkpoint returned nothing",
        ),
      ]);
    }
    // The pull request is whatever the caller passed (a number, URL, or path). A parent passes its own
    // reference, so it is never re-read through a read binding to proceed; the checkpoint's pr item,
    // when the forge declares a read binding, only adds the description.

    if (!worktree) worktree = val(cp, "worktree");
    if (worktree) {
      skipped.push("workspace");
    } else {
      const stopped = await recoverWorktree();
      if (stopped) return stopped;
    }

    const resume = readCheckpoint();
    completed.push("locate");
    return resume;
  }

  // The acceptance source for every qa and lens-finding brief.
  function acceptance(failFindings: readonly string[]): string {
    const parts: string[] = [];
    if (storyText) parts.push(`Story, verbatim, the acceptance source:\n${storyText}`);
    else if (hasCard && card) parts.push(`The pull request's card, the acceptance source:\n${card.answer}`);
    if (specPath) parts.push(`Spec: ${specPath}`);
    if (!storyText && !hasCard && !specPath) {
      parts.push(
        `No spec, story, or card exists for this pull request. ` +
          (prDescription
            ? `The acceptance source is the pull request's description:\n${prDescription}`
            : "Its description could not be read, so the acceptance source is the review findings and the behavior the change visibly intends.") +
          (failFindings.length > 0
            ? `\n\nPlus these review findings, classified as present defects:\n${list(failFindings)}\nJudge that the fixes resolve those findings without regressing the behavior the pull request describes.`
            : ""),
      );
    }
    return parts.join("\n\n");
  }

  // ---- Wait ------------------------------------------------------------------

  // One watcher dispatch waits at most 9 minutes. The script has no clock, so it bounds each
  // phase (start, then finish) by counting dispatches that end pending.
  async function awaitReview(r: number): Promise<Waited> {
    phase("Wait");
    const counts = { start: 0, finish: 0 };
    let n = 0;
    let lastWaiting = "";
    for (;;) {
      n += 1;
      const res = await agent(
        `${WHERE}
${READ_ONLY}

Wait for review ${r} of this pull request, as docs/FORGE.md's review-status binding declares: first for the review to start, then for it to finish. This is dispatch ${n} for review ${r}${lastWaiting ? `; the previous dispatch ended while waiting for the review to ${lastWaiting}` : ""}. Wait at most ${WATCH_MINUTES} minutes in this dispatch, then return pending. The review's trigger and start times are those its status shows. On finished, return each finding with its id, its location (path:line, or empty), and its text.

Pull request: ${pr}
Worktree: ${worktree}`,
        { agentType: "slopify:watcher", label: `review ${r} wait ${n}`, phase: "Wait", schema: WATCHER_SCHEMA },
      );
      if (!res) {
        watchFailures += 1;
        attempts.push({
          gate: "wait",
          approach: `watcher dispatch ${n} for review ${r}`,
          failed: "the watcher did not return",
        });
        if (watchFailures >= MAX_FAILURES) return { stopped: true };
        continue;
      }
      if (res.outcome !== "pending") return { review: res };
      const w = res.waitingFor === "start" ? "start" : "finish";
      lastWaiting = w;
      counts[w] += 1;
      const capped = cappedReview(r, res, w, counts[w]);
      if (capped) return { review: capped };
    }
  }

  // ---- Sort ------------------------------------------------------------------

  // One lens-finding per finding. fail: the defect is present. pass: a non-issue. unverified: reported, not fixed.
  async function sortFindings(r: number, findings: readonly ReviewFinding[]): Promise<Sorted> {
    await loadCard();
    phase("Sort");
    const judge = (f: ReviewFinding, attempt: number): Promise<LensResult | null> =>
      lens(
        "lens-finding",
        `${WHERE}

Judge whether the change of this pull request is free of the defect that one review finding describes. The change is the committed one: from the base revision to the candidate commit, read in the worktree ${worktree} with git diff <base> <candidate>. Ignore the worktree's uncommitted changes: an interrupted round can leave a fix there, and an uncommitted fix is not evidence that a finding is handled. Report the candidate revision in evaluated.${attempt > 1 ? " An earlier verdict on this finding was missing or named another revision; judge it afresh." : ""}

Pull request: ${pr}
Base revision: ${baseCommit || "not reported; use the merge base of the pull request branch and the target branch docs/FORGE.md declares"}
Candidate revision: ${head || "the pull request head commit"}
${acceptance([])}

Review ${r}, finding ${f.id}${f.location ? ` at ${f.location}` : ""}:
${f.text}`,
        { label: `sort ${f.id}${attempt > 1 ? " again" : ""}`, phase: "Sort" },
      );
    const verdicts = await parallel(findings.map((f) => () => judge(f, 1)));
    const again = findings.map((f, i) => ({ f, i })).filter(({ i }) => !usable(verdicts[i], head));
    if (again.length > 0) {
      const second = await parallel(
        again.map(
          ({ f }) =>
            () =>
              judge(f, 2),
        ),
      );
      for (const [k, { i }] of again.entries()) {
        verdicts[i] = second[k] ?? verdicts[i] ?? null;
      }
    }
    const out: Sorted = { defects: [], nonIssues: [], unverified: [] };
    for (const [i, f] of findings.entries()) sortInto(out, f, verdicts[i], head);
    return out;
  }

  // ---- Fix -------------------------------------------------------------------

  // Everything the round commits: the producers' reported paths plus every path that was dirty when the round
  // began (validators judged the whole worktree), without .tmp/ and without the spec, which is committed alone.
  // An excluded path a producer changed is never staged: it is left for the user and named in the result.
  const leftForUser = new Set<string>();
  function stagedPaths(st: RoundState): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const p of [...st.stage, ...st.dirtyAll]) {
      if (!p || isTmp(p) || isSpec(p) || seen.has(relPath(p))) continue;
      seen.add(relPath(p));
      if (excluded.some((e) => samePath(p, e))) {
        leftForUser.add(relPath(p));
        continue;
      }
      out.push(p);
    }
    return out;
  }

  // Work already in the worktree from an interrupted run or from an earlier attempt of this round.
  const carriedPaths = (st: RoundState): string[] =>
    [...new Set([...st.dirtyAll, ...st.stage])].filter((p) => !isTmp(p));

  // A writer's story blockers or open decisions stop the round.
  function writerStop(r: number, w: WriterResult, open: readonly Decision[], why: string): Halt | null {
    if (w.storyBlockers.length > 0) {
      return {
        stop: stop(
          `fix-r${r}`,
          w.storyBlockers.map((b, i) => need(`r${r}-story-${i + 1}`, "story", b, why)),
        ),
      };
    }
    if (open.length > 0) {
      return {
        stop: stop(
          `fix-r${r}`,
          open.map((d) => need(d.id, "decision", d.question, why)),
        ),
      };
    }
    return null;
  }

  function specWriterCall(
    r: number,
    items: readonly WorkItem[],
    mismatch: string,
    gateFindings: readonly string[],
  ): Promise<{ res: WriterResult | null; open: Decision[] }> {
    return settleDecisions(`r${r}-spec`, answers, (settled) =>
      agent(
        `${WHERE}
${NO_FORGE_WRITES}

Revise the spec at ${specPath} (attempt ${specFailures + 1} in round ${r}) so that it covers the review defects below. Change only the spec. Clarify without changing meaning, and keep the original wording of a criterion beside any clarification. ${ASSUMPTIONS} The story is the acceptance source and is never changed: if a defect would change the story's goal, scope, or a criterion's meaning, return it in storyBlockers instead of revising. Return the spec path in produced and its git hash-object as revision.

${acceptance([])}
${items.length > 0 ? `\nReview defects the spec must cover:\n${workBrief(items)}` : ""}${mismatch ? `\nThe coder reports the spec cannot be followed as written:\n${mismatch}` : ""}${gateFindings.length > 0 ? `\nA fresh lens rejected the previous revision for:\n${list(gateFindings)}` : ""}${settledText(settled)}`,
        { agentType: "slopify:writer", label: `revise spec round ${r}`, phase: "Fix", schema: WRITER_SCHEMA },
      ),
    );
  }

  function specGate(
    r: number,
    items: readonly WorkItem[],
    mismatch: string,
    revision: string,
  ): Promise<(LensResult | null)[]> {
    const gateBrief = `${WHERE}

Judge the spec at ${specPath}, revision ${revision}, revised during the review loop on pull request ${pr}; spec gate attempt ${specFailures + 1}. Report that revision in evaluated.

${acceptance([])}

Review defects the revision was written to cover:
${workBrief(items)}${mismatch ? `\nThe coder's reason for the revision:\n${mismatch}` : ""}`;
    return judgeAll(
      [
        () => lens("lens-scope", gateBrief, { label: `lens-scope round ${r}`, phase: "Fix" }),
        () => lens("lens-consistency", gateBrief, { label: `lens-consistency round ${r}`, phase: "Fix" }),
      ],
      revision,
    );
  }

  // Revise the spec through the writer, then require a fresh lens-scope and lens-consistency to pass it.
  async function reviseSpec(
    r: number,
    items: readonly WorkItem[],
    mismatch: string,
    st: RoundState,
  ): Promise<Halt | Ok> {
    let gateFindings: string[] = [];
    for (;;) {
      phase("Fix");
      const { res: w, open } = await specWriterCall(r, items, mismatch, gateFindings);
      if (!w) {
        specFailures += 1;
        attempts.push({ gate: "spec", approach: `spec revision in round ${r}`, failed: "the writer did not return" });
        if (specFailures >= MAX_FAILURES)
          return {
            stop: stop(`spec-r${r}`, [
              need(
                `r${r}-spec`,
                "validation",
                "A spec revision that passes lens-scope and lens-consistency.",
                "the writer did not return",
              ),
            ]),
          };
        continue;
      }
      const raised = writerStop(r, w, open, "raised by the writer while revising the spec");
      if (raised) return raised;
      const gate = await specGate(r, items, mismatch, w.revision);
      if (!judged(gate, w.revision)) {
        return {
          stop: stop(`spec-r${r}`, [
            need(
              `r${r}-spec-verdict`,
              "validation",
              `A verdict on spec revision ${w.revision} from lens-scope and lens-consistency.`,
              "three dispatches returned no verdict or a verdict on another revision",
            ),
          ]),
        };
      }
      if (gate.every((g) => passes(g, w.revision))) return acceptSpec(st, w);
      specFailures += 1;
      gateFindings = gate.flatMap((g) => (passes(g, w.revision) ? [] : problems(g, w.revision)));
      attempts.push({
        gate: "spec",
        approach: `spec revision ${w.revision} in round ${r}`,
        failed: gateFindings.join("; "),
      });
      if (specFailures >= MAX_FAILURES)
        return {
          stop: stop(`spec-r${r}`, [
            need(
              `r${r}-spec`,
              "validation",
              "A spec revision that passes lens-scope and lens-consistency.",
              gateFindings.join("; "),
            ),
          ]),
        };
    }
  }

  function coderCall(r: number, items: readonly WorkItem[], st: RoundState): Promise<CoderResult | null> {
    const dirty = carriedPaths(st).filter((p) => !isDoc(p));
    return agent(
      `${WHERE}
${NO_FORGE_WRITES}

Fix these defects found in review ${r} of pull request ${pr} (attempt ${st.pass}), in the worktree ${worktree}. Write only code and test files there, and no documentation or spec. Add or update a regression test for each defect where one fits. Run the focused tests as you work. Run git add -N on each new file, then return as the revision a label for the worktree's current state: <HEAD sha>+<git hash-object of the output of git diff HEAD --binary>. The label is not a git object. Put in specMismatch why the spec cannot be followed, or an empty string.

${acceptance([])}
${specPath ? `\nThe spec at ${specPath} is the contract; do not edit it.` : ""}

Defects:
${workBrief(items)}${dirtyBrief(dirty)}`,
      { agentType: "slopify:coder", label: `fix code round ${r}`, phase: "Fix", schema: CODER_SCHEMA },
    );
  }

  // The documentation writer raises its own decisions (prefix r<n>-docs), apart from the spec writer's.
  // The result carries them as open, the questions the user has not answered.
  async function docWriterCall(r: number, items: readonly WorkItem[], st: RoundState): Promise<DocWriterResult | null> {
    const dirty = carriedPaths(st).filter((p) => isDoc(p) && !isSpec(p));
    const { res, open } = await settleDecisions(`r${r}-docs`, answers, (settled) =>
      agent(
        `${WHERE}
${NO_FORGE_WRITES}

Fix these documentation defects found in review ${r} of pull request ${pr} (attempt ${st.pass}), in the worktree ${worktree}. Write only documentation files, not the spec and not code. ${ASSUMPTIONS} Return the paths you changed in produced and the git hash-object of the main one as revision.

${acceptance([])}

Defects:
${workBrief(items)}${dirtyBrief(dirty)}${settledText(settled)}`,
        { agentType: "slopify:writer", label: `fix docs round ${r}`, phase: "Fix", schema: WRITER_SCHEMA },
      ),
    );
    return res ? { ...res, open } : null;
  }

  // Spec defects are fixed first, alone; with no spec to revise they need a story.
  async function fixSpecItems(r: number, specItems: readonly WorkItem[], st: RoundState): Promise<Halt | Ok> {
    if (!specPath) {
      return {
        stop: stop(`fix-r${r}`, [
          need(
            `r${r}-story-1`,
            "story",
            "A story or spec that the defects can be judged against.",
            specItems.map((i) => i.text).join("; "),
          ),
        ]),
      };
    }
    const res = await reviseSpec(r, specItems, "", st);
    if (res.stop) return res;
    st.base = st.base.filter((i) => !isSpec(i.location));
    st.feedback = st.feedback.filter((i) => !isSpec(i.location));
    return res;
  }

  // Run the coder and the documentation writer together, each only when asked, and record what each left
  // before any retry or early return: it is in the worktree either way.
  async function runProducers(
    r: number,
    st: RoundState,
    codeItems: readonly WorkItem[] | null,
    docItems: readonly WorkItem[] | null,
  ): Promise<{ coder: CoderResult | null; writer: DocWriterResult | null }> {
    const [c, w] = await parallel([
      () => (codeItems ? coderCall(r, codeItems, st) : Promise.resolve(null)),
      () => (docItems ? docWriterCall(r, docItems, st) : Promise.resolve(null)),
    ]);
    if (c) {
      for (const p of [...c.changed, ...c.tests]) st.stage.add(p);
      st.coder = c;
    }
    if (w) {
      for (const p of w.produced) if (!isSpec(p)) st.stage.add(p);
      st.docsChanged ||= w.produced.some((p) => !isSpec(p));
      st.writer = w;
    }
    return { coder: c, writer: w };
  }

  // The documentation writer's result: a stop, or whether it must run again.
  function docsOutcome(r: number, w: DocWriterResult | null): Halt | { stop?: undefined; failed: boolean } {
    if (!w) {
      fixFailures += 1;
      attempts.push({
        gate: "fix",
        approach: `documentation fix in round ${r}`,
        failed: "the writer did not return",
      });
      if (fixFailures >= MAX_FAILURES)
        return {
          stop: stop(`fix-r${r}`, [
            need(
              `r${r}-fix`,
              "validation",
              "A documentation fix; the writer did not return.",
              "writer returned nothing",
            ),
          ]),
        };
      return { failed: true };
    }
    return writerStop(r, w, w.open, "raised by the writer while fixing documentation") ?? { failed: false };
  }

  // A spec mismatch goes back through the spec gate and spends the spec budget, then the coder runs again.
  // Returns the coder's last result, or a stop.
  async function settleMismatch(
    r: number,
    codeItems: readonly WorkItem[],
    st: RoundState,
    first: CoderResult | null,
  ): Promise<Halt | { stop?: undefined; coder: CoderResult | null }> {
    let c = first;
    while (c?.specMismatch.trim()) {
      specFailures += 1;
      attempts.push({ gate: "spec", approach: `coder fix in round ${r}`, failed: c.specMismatch });
      if (!specPath)
        return {
          stop: stop(`fix-r${r}`, [
            need(
              `r${r}-story-1`,
              "story",
              "The defects cannot be fixed within the behavior the pull request describes.",
              c.specMismatch,
            ),
          ]),
        };
      if (specFailures >= MAX_FAILURES)
        return {
          stop: stop(`spec-r${r}`, [need(`r${r}-spec`, "validation", "A spec the code can follow.", c.specMismatch)]),
        };
      const rev = await reviseSpec(r, [], c.specMismatch, st);
      if (rev.stop) return rev;
      c = await coderCall(r, codeItems, st);
      if (!c) continue;
      for (const p of [...c.changed, ...c.tests]) st.stage.add(p);
      st.coder = c;
    }
    return { coder: c };
  }

  // The coder's result once its spec mismatch is settled: a stop, ok, or null when it must run again.
  async function coderOutcome(
    r: number,
    codeItems: readonly WorkItem[],
    st: RoundState,
    coder: CoderResult | null,
  ): Promise<Halt | Ok | null> {
    const settled = await settleMismatch(r, codeItems, st, coder);
    if (settled.stop) return settled;
    if (settled.coder) return { ok: true };
    fixFailures += 1;
    attempts.push({ gate: "fix", approach: `code fix in round ${r}`, failed: "the coder did not return" });
    if (fixFailures >= MAX_FAILURES)
      return {
        stop: stop(`fix-r${r}`, [
          need(`r${r}-fix`, "validation", "A code fix; the coder did not return.", "coder returned nothing"),
        ]),
      };
    return null;
  }

  // Code and documentation together, each producer only until it returned a good result. Null when a producer
  // must run again.
  async function fixPass(
    r: number,
    st: RoundState,
    done: { code: boolean; docs: boolean },
    codeItems: readonly WorkItem[],
    docItems: readonly WorkItem[],
  ): Promise<Halt | Ok | null> {
    phase("Fix");
    const wantCoder = codeItems.length > 0;
    const wantDocs = docItems.length > 0;
    const ranCoder = wantCoder && !done.code;
    const ranDocs = wantDocs && !done.docs;
    const { coder, writer } = await runProducers(r, st, ranCoder ? codeItems : null, ranDocs ? docItems : null);
    // A writer that returned nothing is run again, but only after the coder's spec mismatch below is handled.
    const docs = ranDocs ? docsOutcome(r, writer) : { failed: false };
    if (docs.stop) return docs;
    if (ranDocs && !docs.failed) done.docs = true;
    if (ranCoder) {
      const code = await coderOutcome(r, codeItems, st, coder);
      if (!code || code.stop) return code;
      done.code = true;
    }
    if (docs.failed) return null;
    st.label = labelOf(st, wantCoder, wantDocs);
    return { ok: true };
  }

  // One production pass: the spec first when it must change, then code and documentation together. A producer
  // that failed is run again alone; one that already returned a good result is not run twice.
  async function produce(r: number, st: RoundState): Promise<Halt | Ok> {
    const done = { code: false, docs: false };
    for (;;) {
      st.pass += 1;
      const items = [...st.base, ...st.feedback];
      const specItems = items.filter((i) => isSpec(i.location));
      if (specItems.length > 0) {
        const res = await fixSpecItems(r, specItems, st);
        if (res.stop) return res;
        continue;
      }
      const docItems = items.filter((i) => !isSpec(i.location) && isDoc(i.location));
      const codeItems = items.filter((i) => !isDoc(i.location));
      const res = await fixPass(r, st, done, codeItems, docItems);
      if (res) return res;
    }
  }

  // ---- Validate --------------------------------------------------------------

  function candidateRevision(st: RoundState): { label: string; text: string } {
    const parts: string[] = [];
    if (st.coder) parts.push(`the coder reports ${st.coder.revision}`);
    if (st.writer) parts.push(`the writer reports ${st.writer.revision} for its main document`);
    if (st.specRevised) parts.push(`the spec was revised to ${st.specRevision}`);
    const label = st.label || head || "";
    return {
      label,
      text: `${label || "the worktree head"}. This is a label for the current state of the worktree ${worktree} on top of commit ${head || "its head"}, after every producer returned (${parts.join("; ") || "no producer reported a revision"}); it is not a git object. Judge the worktree as it stands now and report this label in evaluated`,
    };
  }

  async function validate(r: number, st: RoundState, defects: Sorted["defects"]): Promise<Halt | Validated> {
    phase("Validate");
    const failFindings = defects.map((d) => `${d.finding.id}: ${d.finding.text}`);
    const cand = candidateRevision(st);
    const brief = `${WHERE}

Judge the fixes made for the review defects below on pull request ${pr} (validation ${st.validations} of round ${r}).
Revision: ${cand.text}.
Changed paths:
${list(stagedPaths(st))}

${acceptance(failFindings)}

Review defects fixed:
${list(failFindings)}`;
    const jobs: (() => Promise<LensResult | null>)[] = [
      () =>
        agent(
          `${brief}

Run the tests and checks that apply. Judge that each defect is resolved, that nothing regressed, and that the fixes stay within what the acceptance source covers.`,
          {
            agentType: "slopify:qa",
            label: `qa round ${r} #${st.validations}`,
            phase: "Validate",
            schema: LENS_SCHEMA,
          },
        ),
    ];
    if (st.docsChanged) {
      jobs.push(() =>
        lens(
          "lens-docs",
          `${brief}

Judge that the documentation claims in the changed paths are true against the code.`,
          { label: `lens-docs round ${r} #${st.validations}`, phase: "Validate" },
        ),
      );
    }
    const verdicts = await judgeAll(jobs, cand.label);
    if (!judged(verdicts, cand.label)) {
      return {
        stop: stop(`validate-r${r}`, [
          need(
            `r${r}-validate-verdict`,
            "validation",
            `A verdict on ${cand.label} from qa${st.docsChanged ? " and lens-docs" : ""}.`,
            "three dispatches returned no verdict or a verdict on another revision",
          ),
        ]),
      };
    }
    const pass = verdicts.every((v) => passes(v, cand.label));
    const feedback = feedbackOf(verdicts, cand.label, st.validations);
    const summary = `validation ${st.validations}: ${verdicts.map((v, i) => `${i === 0 ? "qa" : "lens-docs"} ${passes(v, cand.label) ? "pass" : v.verdict === "pass" ? "pass not accepted" : v.verdict}`).join(", ")}`;
    st.validationLog.push(summary);
    return { pass, feedback, verdicts, label: cand.label };
  }

  // ---- Push ------------------------------------------------------------------

  // The `done spec` ledger line's test part.
  const testPart = (): string =>
    testPath ? ` test ${testPath}` : " and, when that last done spec line ends with test <path>, the same test <path>";

  function pushBrief(r: number, st: RoundState, summary: string): string {
    const staged = stagedPaths(st);
    const steps = [
      `If ${worktree}/.tmp/ledger.md does not exist, create it with the line: <time> run 1: review-pr ${pr} | worktree ${worktree} | branch ${branch || "<branch>"}`,
    ];
    if (st.specRevised) {
      steps.push(
        `Commit ${specPath} alone, first, with a message in the project's commit convention from docs/FORGE.md; if it has no uncommitted change, make no spec commit.`,
      );
    }
    steps.push(
      `Commit exactly these paths, staging each explicitly and never staging anything else, with a message in the project's commit convention from docs/FORGE.md:\n${list(staged)}`,
      `Push the branch as docs/FORGE.md declares for a verified repair, then update the pull request as its repair binding declares, summarizing the defects fixed: ${summary}`,
      "Re-fire the review trigger as docs/FORGE.md declares.",
    );
    const lines: string[] = [];
    if (st.specRevised) {
      lines.push(
        `<time> done spec ${specPath}@<its git hash-object> commit <sha of the spec commit> story <the story revision on the ledger's last done spec line>` +
          testPart(),
      );
    }
    lines.push(
      `only if the ledger already holds a done spec line: <time> done implement commit <sha of the implementation commit> spec <git hash-object of ${specPath || "the spec"}> pushed`,
      `<time> review ${r} ended finished: ${summary}`,
      `<time> review ${r + 1} fired <the trigger time> head <sha of the pushed head>`,
    );
    steps.push(`Append these ledger lines in this order, stamping the time yourself:\n${list(lines)}`);
    return `${WHERE}
${AUTH}

Publish the verified fixes of review round ${r} for pull request ${pr}. A fresh qa passed them. Work in the worktree ${worktree}${branch ? ` on branch ${branch}` : ""}, in this order:
${steps.map((x, i) => `${i + 1}. ${x}`).join("\n")}

Return the implementation commit sha as the reference of an operation named "commit", the spec commit (if any) as "commit-spec", and record every other operation. Put anything docs/BOARD.md or docs/FORGE.md does not bind in unmet.`;
  }

  // A round whose fix was committed but not fully published (the push failed, or a step after it did, or the run
  // stopped first): finish the steps that remain, without judging the round again; a fresh qa passed the fix
  // before the commit. pushDone: the branch is already pushed, so only the steps after the push remain.
  function resumePushBrief(r: number, pushDone: boolean): string {
    const lines = [
      `only if the last done spec line's spec hash differs from the git hash-object of ${specPath || "the spec"}: <time> done spec ${specPath || "<the spec path>"}@<its git hash-object> commit <sha of the commit that holds that spec> story <the story revision on the ledger's last done spec line>` +
        testPart(),
      `only if the ledger already holds a done spec line: <time> done implement commit <sha of HEAD> spec <git hash-object of ${specPath || "the spec"}> pushed`,
      `<time> review ${r} ended finished: finished the publishing an interrupted run left undone`,
      `<time> review ${r + 1} fired <the trigger time> head <sha of the pushed head>`,
    ];
    return `${WHERE}
${AUTH}

The worktree ${worktree}${branch ? ` on branch ${branch}` : ""} holds a verified fix for review round ${r} of pull request ${pr} that an earlier run did not finish publishing. Commit nothing and stage nothing. Do each step below that the forge does not already show done, in this order:
1. ${pushDone ? "The branch is already pushed; do not push it again." : "Push the branch as docs/FORGE.md declares for a verified repair."} Then update the pull request as its repair binding declares, saying the fix of round ${r} was finished by a resumed run.
2. Re-fire the review trigger as docs/FORGE.md declares, unless review ${r + 1} was already fired for the pushed head.
3. Append these ledger lines in this order, stamping the time yourself:
${list(lines)}

Return the worktree's HEAD sha as the reference of an operation named "commit", and record every other operation. Put anything docs/BOARD.md or docs/FORGE.md does not bind in unmet.`;
  }

  async function refreshHead(r: number, pushed: PusherResult | null): Promise<void> {
    const res = await scout(
      "scout-checkpoint",
      checkpointPrompt("head dirty", `Report only head and dirty, after the push of round ${r}.`),
      { label: "checkpoint after push", phase: "Push" },
    );
    const h = res ? val(res, "head") : "";
    if (h) head = h;
    else {
      const ref = fixCommit(pushed);
      if (ref) head = ref;
    }
    dirtyPaths = res ? parseDirty(fact(res, "dirty")) : [];
  }

  // ---- The rounds ------------------------------------------------------------

  let review: ReviewOutcome | null = null; // the final outcome
  let unfixed: { finding: string; reason: string }[] = [];

  // A fix committed in this round and never pushed: resume at Push.
  async function resumePush(r: number, unpushed: boolean): Promise<Stopped | null> {
    phase("Push");
    const resumed = await agent(resumePushBrief(r, !unpushed), {
      agentType: "slopify:pusher",
      label: `push round ${r} (resumed)`,
      phase: "Push",
      schema: PUSHER_SCHEMA,
    });
    if (!resumed?.done) {
      return stop(`push-r${r}`, [
        need(
          `r${r}-push`,
          "prerequisite",
          "A pushed fix for the pull request; the worktree holds commits the forge lacks.",
          resumed ? resumed.unmet.join("; ") || "pusher reported the push not done" : "pusher did not return",
        ),
      ]);
    }
    rounds.push(
      roundRecord(r, null, "fixed", {
        note: unpushed
          ? `pushed the fix an interrupted run had committed`
          : `finished the steps after the push of a fix that an interrupted run had pushed`,
        pushed: fixCommit(resumed),
        ...(resumed.unmet.length > 0 && { unmet: resumed.unmet }),
      }),
    );
    completed.push(`round-${r}`);
    await refreshHead(r, resumed);
    return null;
  }

  // The findings of review r: those given in args for round 1, else the watcher's; "ended" when the review ended
  // without finishing.
  async function roundFindings(
    r: number,
    startRound: number,
  ): Promise<Stopped | "ended" | { findings: ReviewFinding[]; reviewRef: string }> {
    if (r === 1 && startRound === 1 && givenFindings.length > 0) {
      skipped.push("wait-round-1");
      return { findings: givenFindings, reviewRef: "" };
    }
    const waited = await awaitReview(r);
    if (waited.stopped) {
      return stop(`wait-r${r}`, [
        need(
          `r${r}-wait`,
          "prerequisite",
          `A watcher that can report review ${r}.`,
          "the watcher did not return three times",
        ),
      ]);
    }
    const res = waited.review;
    if (res.outcome !== "finished") {
      review = endedBy(res, r);
      rounds.push(roundRecord(r, null, res.outcome));
      return "ended";
    }
    return { findings: normFindings(res.findings), reviewRef: res.reference || "" };
  }

  // Fix and validate, until a fresh qa passes.
  async function fixRound(r: number, sorted: Sorted): Promise<Stopped | RoundState> {
    const st: RoundState = {
      base: sorted.defects.map((d) => ({
        id: d.finding.id,
        location: d.finding.location,
        text: d.finding.text,
        why: d.why,
      })),
      feedback: [],
      dirtyAll: [...dirtyPaths],
      stage: new Set(),
      docsChanged: false,
      specRevised: false,
      specRevision: "",
      coder: null,
      writer: null,
      validations: 0,
      pass: 0,
      label: "",
      validationLog: [],
    };
    for (;;) {
      const made = await produce(r, st);
      if (made.stop) return made.stop;
      st.validations += 1;
      const v = await validate(r, st, sorted.defects);
      if (v.stop) return v.stop;
      if (v.pass) return st;
      validateFailures += 1;
      const failed = v.verdicts.map((x) => problems(x, v.label).join("; ")).join(" | ");
      attempts.push({ gate: "validate", approach: `fixes for review ${r}, validation ${st.validations}`, failed });
      if (validateFailures >= MAX_FAILURES) {
        return stop(`validate-r${r}`, [need(`r${r}-validate`, "validation", "Fixes a fresh qa will pass.", failed)]);
      }
      st.feedback = v.feedback;
    }
  }

  // Push: reachable only after a fresh qa passed this round's fixes
  async function pushRound(r: number, sorted: Sorted, st: RoundState): Promise<Stopped | null> {
    phase("Push");
    const summary = `fixed ${sorted.defects.length}, non-issues ${sorted.nonIssues.length}${sorted.unverified.length > 0 ? `, unverified ${sorted.unverified.length}` : ""}`;
    const pushed = await agent(pushBrief(r, st, summary), {
      agentType: "slopify:pusher",
      label: `push round ${r}`,
      phase: "Push",
      schema: PUSHER_SCHEMA,
    });
    if (!pushed?.done) {
      return stop(`push-r${r}`, [
        need(
          `r${r}-push`,
          "prerequisite",
          "A pushed, verified fix for the pull request.",
          pushed ? pushed.unmet.join("; ") || "pusher reported the push not done" : "pusher did not return",
        ),
      ]);
    }
    rounds.push(
      roundRecord(r, sorted, "fixed", {
        defectsFixed: sorted.defects.map((d) => `${d.finding.id}: ${d.finding.text}`),
        validations: st.validationLog,
        pushed: fixCommit(pushed),
        ...(pushed.unmet.length > 0 && { unmet: pushed.unmet }),
      }),
    );
    completed.push(`round-${r}`);
    await refreshHead(r, pushed);
    return null;
  }

  // One review round: wait, sort, and, when a defect is present, fix, validate, and push.
  // Returns "ended" when the review loop ends with this round.
  async function playRound(r: number, startRound: number): Promise<Stopped | "ended" | null> {
    const got = await roundFindings(r, startRound);
    if (got === "ended" || "status" in got) return got;
    const { findings, reviewRef } = got;

    const sorted =
      findings.length > 0 ? await sortFindings(r, findings) : { defects: [], nonIssues: [], unverified: [] };
    if (sorted.defects.length === 0) {
      review = { outcome: sorted.unverified.length > 0 ? "no-defects" : "clean", round: r, reference: reviewRef };
      rounds.push(roundRecord(r, sorted, sorted.unverified.length > 0 ? "unverified" : "clean"));
      return "ended";
    }

    const st = await fixRound(r, sorted);
    return "status" in st ? st : pushRound(r, sorted, st);
  }

  // ---- The final review ------------------------------------------------------

  // After round 3's push (or when a rerun finds review 4 already fired): wait, sort for the report, fix nothing.
  async function finalReview(): Promise<Stopped | null> {
    const waited = await awaitReview(FINAL_ROUND);
    if (waited.stopped) {
      return stop("wait-final", [
        need(
          "final-wait",
          "prerequisite",
          `A watcher that can report review ${FINAL_ROUND}.`,
          "the watcher did not return three times",
        ),
      ]);
    }
    const res = waited.review;
    if (res.outcome !== "finished") {
      review = endedBy(res, FINAL_ROUND);
      rounds.push(roundRecord(FINAL_ROUND, null, res.outcome));
      return null;
    }
    const found = normFindings(res.findings);
    const sorted =
      found.length > 0 ? await sortFindings(FINAL_ROUND, found) : { defects: [], nonIssues: [], unverified: [] };
    unfixed = sorted.defects.map((d) => ({
      finding: `${d.finding.id}: ${d.finding.text}`,
      reason: d.why || "the lens found the defect present",
    }));
    review = {
      outcome: sorted.defects.length > 0 ? "defects-remain" : sorted.unverified.length > 0 ? "no-defects" : "clean",
      round: FINAL_ROUND,
      reference: res.reference || "",
    };
    rounds.push(roundRecord(FINAL_ROUND, sorted, "final"));
    return null;
  }

  // The rounds the resume rule leaves to play; true when the loop ended before the final review.
  async function playRounds({ pushedAhead, unpushed, fired }: Resume): Promise<Stopped | boolean> {
    const startRound = fired >= 1 ? Math.min(fired, FINAL_ROUND) : 1;
    for (let k = 1; k < startRound; k++) skipped.push(`round-${k}`);
    if (givenFindings.length > 0 && startRound > 1)
      log("Findings in args apply to round 1 only; this run resumes at a later round and waits for its review");

    let ended = false;
    for (let r = startRound; r <= MAX_ROUNDS && !ended; r++) {
      // A fix committed in this round and never pushed: resume at Push. Review r has already been judged
      // and fixed; waiting for it again would sort its findings against a HEAD that holds the fix. A worktree
      // with unpushed commits and uncommitted changes outside the excluded paths holds a fix that was never
      // committed: the round is unfinished and takes the normal path, which carries that work. A pushed fix was
      // pushed only after all its commits, so stray files never hold back its resume.
      const resume = (pushedAhead || (unpushed && dirtyPaths.length === 0)) && r === startRound && fired >= 1;
      const outcome = resume ? await resumePush(r, unpushed) : await playRound(r, startRound);
      if (outcome === "ended") ended = true;
      else if (outcome) return outcome;
    }
    return ended;
  }

  const located = await locate();
  if ("status" in located) return located;
  const ended = await playRounds(located);
  if (typeof ended !== "boolean") return ended;
  if (!ended) {
    const stopped = await finalReview();
    if (stopped) return stopped;
  }

  return {
    status: "done",
    workflow: "review-pr",
    skipped,
    attempts,
    pr,
    rounds,
    review,
    unfixed,
    ...(leftForUser.size > 0 && { leftForUser: [...leftForUser] }),
    report: buildReport(pr, rounds, review, unfixed.length, leftForUser),
  };
}
