// What deliver-story and deliver-bugfix share: the coder and pusher schemas, and one run's state with the helpers
// that read and change it.
import {
  STRINGS,
  LENS_SCHEMA,
  scout,
  fact,
  absent,
  shaped,
  sameRev,
  HASH,
  blocked,
  type Blocked,
  type Decision,
  type Finding,
  type LensResult,
  type Need,
  type NeedKind,
  type ScoutResult,
} from "./family.ts";
import { pusherSchema } from "./schemas.ts";

export const CODER_SCHEMA = {
  type: "object",
  required: ["changed", "tests", "ran", "revision", "open", "specMismatch"],
  properties: {
    changed: { ...STRINGS, description: "Paths changed, relative to the worktree root" },
    tests: { ...STRINGS, description: "Test paths added or changed" },
    ran: { ...STRINGS, description: "Each command and its result" },
    revision: {
      type: "string",
      description: "The revision left, as the brief defines it",
    },
    open: STRINGS,
    specMismatch: {
      type: "string",
      description: "Why the spec cannot be implemented as written, or an empty string when it can",
    },
    steps: STRINGS,
    observed: { type: "string" },
    measurements: {
      type: "array",
      items: {
        type: "object",
        required: ["claim", "value", "command"],
        properties: {
          claim: { type: "string" },
          value: { type: "string" },
          command: { type: "string" },
        },
      },
    },
  },
} as const;

const PUSHER_SCHEMA = pusherSchema({ reference: "A commit sha, PR URL or path, card id, or worktree path" });

export type CoderResult = Infer<typeof CODER_SCHEMA>;
export type PusherResult = Infer<typeof PUSHER_SCHEMA>;

export interface Attempt {
  gate: string;
  approach: string;
  failed: string;
}
export interface Verification {
  agent: string;
  verdict: string;
  evaluated: string;
  findings: number;
}
interface DeliverState {
  worktree: string;
  branch: string;
  ledger: string;
  specPath: string;
  specHash: string;
  specExists: boolean;
  pr: string;
}
interface Checkpoint {
  worktree?: string;
  branch?: string;
  spec?: string;
  ledger?: string;
  pr?: string;
}
export type Stopped = Blocked & { completed: string[]; checkpoint: Checkpoint; attempts: Attempt[] };
/** A finding a fixer acts on, with the validator that raised it. */
export type BlockingFinding = Finding & { from: string };
/** A validator for judge: its name and its dispatch. */
export interface Validator {
  name: string;
  call: () => Promise<LensResult | null>;
}
export type Judged = { verdicts: (LensResult | null | undefined)[]; stop?: undefined } | { stop: Stopped };
interface PlanTask {
  id: string;
  summary: string;
  paths: string[];
}
export interface Plan {
  tasks: PlanTask[];
  docs: string[];
}
/** What a report reads of review-pr's result, which the runtime passes through unchecked. */
interface ReviewView {
  status: string;
  review?: unknown;
  rounds?: unknown;
  unfixed?: unknown;
}

export interface DeliverConfig<Gate extends string> {
  workflow: string;
  maxFailures: number;
  planPhase: string;
  failures: Record<Gate, number>;
  projectRoot: string;
  storyArg: string;
}

// Reads a field of a parsed JSON value as `v.key` does: a TypeError for null, undefined for a key that is not there
// or for a number, string, or boolean.
function prop(v: unknown, key: string): unknown {
  if (v === null || v === undefined) throw new TypeError(`Cannot read properties of ${String(v)} (reading '${key}')`);
  if (typeof v !== "object") return undefined;
  const value: unknown = Reflect.get(v, key);
  return value;
}

const isList = (v: unknown): v is readonly unknown[] => Array.isArray(v);

// A JSON value as String() renders it.
function jsonText(v: unknown): string {
  if (typeof v === "string") return v;
  if (isList(v)) return v.map((x: unknown) => (x === null || x === undefined ? "" : jsonText(x))).join(",");
  if (typeof v === "object" && v !== null) return "[object Object]";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return v === null ? "null" : "undefined";
}

// A dirty entry as bare paths: a git status code and a trailing remark are dropped, and a rename keeps both paths.
export function dirtyEntry(x: string | null | undefined): string[] {
  const t = (x || "")
    .trim()
    .replace(/^[ MADRCUT?!]{1,2}\s+/, "")
    // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short line from a scout
    .replace(/\s+\([^)]*\)$/, "");
  const m = /^(.*) -> (.*)$/.exec(t);
  return m ? [m[1] ?? "", m[2] ?? ""] : [t];
}
export const NO_WRITES = "Do not commit, push, branch, or change the board or forge; pusher does that.";
export const DIRTY_SENTENCE =
  "Uncommitted changes in these paths come from an interrupted run of this step; inspect them, keep what serves your assignment, and continue from them rather than starting over.";
export const DECIDE =
  'Decide anything that does not change the story\'s goal, scope, or acceptance criteria, and record it as a labelled assumption ("Assumption: ..."). Raise openDecisions only for a choice that would change the outcome or contradict the story; otherwise leave openDecisions empty.';
// The candidate is the worktree's current state; its label is an identifier, not a git object.
export const candidateNote = (cand: string): string =>
  `The candidate is the worktree's current state: HEAD plus its uncommitted changes. "${cand}" is an identifier for that state, not a git object, so do not resolve it with git. Report it back unchanged in evaluated.`;

export function need(step: string, n: number, kind: NeedKind, what: string, evidence?: string): Need {
  return { id: `${step}-${n}`, kind, what, evidence: evidence || "" };
}
// A need for an open decision a producer raised; its id comes from the question (see decisionsOf).
export const decisionNeed = (d: Decision, who: string): Need => ({
  id: d.id,
  kind: "decision",
  what: d.question,
  evidence: `raised by ${who}`,
});

// ---- Helpers ----------------------------------------------------------------

export const list = (items: readonly string[] | null | undefined): string =>
  items?.length ? items.map((x) => `- ${x}`).join("\n") : "- none";
export const slugOf = (s: string | null | undefined): string =>
  (s || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join("-");
const clean = (v: string | null | undefined): string => (absent(v) ? "" : (v ?? "").trim());
export const val = (res: ScoutResult | null | undefined, key: string): string => clean(fact(res, key));
export const isRel = (p: string): boolean => !!p && shaped("rel", p) === p;
export const splitList = (v: string): string[] =>
  absent(v)
    ? []
    : v
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
export function unique(items: readonly string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

// Evidence from a scout, for a later prompt. A null scout is a gap, not an absence.
export function show(label: string, r: ScoutResult | null | undefined): string {
  if (!r) return `${label}: the scout returned nothing, which is a gap, not an absence`;
  const ev = r.evidence.map((e) => `  - ${e.source} @ ${e.location}: ${e.excerpt}`).join("\n");
  const gaps = r.gaps.length > 0 ? `\n  Gaps: ${r.gaps.join("; ")}` : "";
  return `${label}: ${r.answer}${ev ? `\n${ev}` : ""}${gaps}`;
}

export function passed(v: LensResult | null | undefined): boolean {
  return !!v && v.verdict === "pass" && v.findings.every((f) => !f.blocking);
}
// A verdict is usable only when it is on the revision it was briefed with and is coherent: a
// fail names a blocking finding, a pass names none. A null or unusable verdict is re-run, not fixed.
function usable(v: LensResult | null | undefined, revision: string): boolean {
  if (!v || !revision || !sameRev(revision, v.evaluated)) return false;
  const blocking = v.findings.some((f) => f.blocking);
  return v.verdict === "fail" ? blocking : v.verdict !== "pass" || !blocking;
}
// What a fixer can act on: a fail's blocking findings, and what an unverified verdict could not check.
export function blockingOf(name: string, v: LensResult | null | undefined): BlockingFinding[] {
  if (!v || v.verdict === "pass") return [];
  const out: BlockingFinding[] = v.findings.filter((f) => f.blocking).map((f) => ({ from: name, ...f }));
  if (v.verdict === "unverified") {
    const lim = v.limits && !absent(v.limits, true) ? v.limits : "";
    out.push({
      from: name,
      location: name,
      problem: `could not check${lim ? `: ${lim}` : " (no reason given)"}`,
      blocking: true,
    });
  }
  return out;
}
export const findingText = (f: BlockingFinding): string =>
  `${f.from} (${f.blocking ? "blocking" : "note"}) at ${f.location}: ${f.problem}`;

export const pushOk = (r: PusherResult | null): r is PusherResult => !!r && r.done && r.unmet.length === 0;
export const opRef = (r: PusherResult | null, name: string): string => {
  const o = (r?.operations ?? []).find((x) => x.op.toLowerCase() === name);
  return o ? o.reference.trim() : "";
};

// Each dispatch of a producer, validator, or operator names its agent type literally.
export function callWriter<const S extends Schema>(
  prompt: string,
  label: string,
  phaseTitle: string,
  schema: S,
): Promise<Infer<S> | null> {
  return agent(prompt, {
    agentType: "slopify:writer",
    label,
    phase: phaseTitle,
    schema,
  });
}
export function callCoder(prompt: string, label: string, phaseTitle: string): Promise<CoderResult | null>;
export function callCoder<const S extends Schema>(
  prompt: string,
  label: string,
  phaseTitle: string,
  schema: S,
): Promise<Infer<S> | null>;
export function callCoder<const S extends Schema>(
  prompt: string,
  label: string,
  phaseTitle: string,
  schema?: S,
): Promise<Infer<S | typeof CODER_SCHEMA> | null> {
  return agent(prompt, {
    agentType: "slopify:coder",
    label,
    phase: phaseTitle,
    schema: schema ?? CODER_SCHEMA,
  });
}
export function callQa(prompt: string, label: string, phaseTitle: string): Promise<LensResult | null> {
  return agent(prompt, {
    agentType: "slopify:qa",
    label,
    phase: phaseTitle,
    schema: LENS_SCHEMA,
  });
}
export function callPusher(prompt: string, label: string, phaseTitle: string): Promise<PusherResult | null> {
  return agent(prompt, {
    agentType: "slopify:pusher",
    label,
    phase: phaseTitle,
    schema: PUSHER_SCHEMA,
  });
}

// ---- Checkpoint parsing -----------------------------------------------------

// A ledger value is "<line number>|<line text>" when the scout numbered it, else the bare line.
function ledgerLine(v: string): { n: number; text: string } {
  const m = /^(\d+)\|([\s\S]*)$/.exec(v.trim());
  return m ? { n: Number(m[1]), text: (m[2] ?? "").trim() } : { n: NaN, text: v.trim() };
}
export function parseDoneSpec(v: string) {
  if (!v) return null;
  const l = ledgerLine(v);
  const m = new RegExp(
    String.raw`done spec (.*)@(${HASH})\s+commit\s+(\S+)\s+story\s+(${HASH})(?:\s+test\s+(.+))?\s*$`,
  ).exec(l.text);
  if (!m) return null;
  const [, path = "", hash = "", commit = "", story = "", test = ""] = m;
  return { n: l.n, path: path.trim(), hash, commit, story, test: test.trim() };
}
export function parseDoneImplement(v: string) {
  if (!v) return null;
  const l = ledgerLine(v);
  const m = new RegExp(String.raw`done implement\s+commit\s+(\S+)\s+spec\s+(${HASH})(\s+pushed)?\s*$`).exec(l.text);
  if (!m) return null;
  const [, commit = "", spec = "", pushed] = m;
  return { n: l.n, commit, spec, pushed: !!pushed };
}
export function parseDonePublish(v: string) {
  if (!v) return null;
  const l = ledgerLine(v);
  // eslint-disable-next-line sonarjs/super-linear-regex, regexp/no-super-linear-backtracking -- matched against one short ledger line from a scout
  const m = /done publish(?:\s+(?!commit\b)(.*?))?(?:\s+commit\b.*)?$/.exec(l.text);
  return m ? { n: l.n, pr: shaped("ref", (m[1] || "").trim()) } : null;
}
// "done board-start <card>" and "done board-pr <PR reference>": a board operation that followed its forge step.
export function parseDoneBoard(v: string, kind: "start" | "pr") {
  if (!v) return null;
  const l = ledgerLine(v);
  const m = new RegExp(String.raw`done board-${kind}\s+(\S+)`).exec(l.text);
  return m ? { n: l.n, ref: m[1] ?? "" } : null;
}

// Builds one run's state and the helpers that close over it. Call it where the run's helpers are first needed:
// WHERE and AUTH are fixed from the config then.
export function createDeliver<Gate extends string>(config: DeliverConfig<Gate>) {
  const {
    workflow: WORKFLOW,
    maxFailures: MAX_FAILURES,
    planPhase: PLAN_PHASE,
    failures,
    projectRoot,
    storyArg,
  } = config;

  const WHERE = projectRoot
    ? `The project is at ${projectRoot}; address files by absolute path under it.`
    : "The project is the session project directory; address files by absolute path.";
  const AUTH = `Authorization, from the user's invocation of /slopify:${WORKFLOW}: the story branch and worktree, attributable commits, a push once the gates have passed, opening or updating this task's PR, and the declared review trigger. It does not authorize merging, releases, any other message, rewriting docs/BOARD.md or docs/FORGE.md, or changing a card's content. Work exactly as docs/BOARD.md and docs/FORGE.md declare; an operation that is not bound is unmet, never improvised. Stage explicit paths only.`;

  const completed: string[] = [];
  const skipped: string[] = [];
  const attempts: Attempt[] = [];
  const verification: Verification[] = [];
  const limits: string[] = [];
  const state: DeliverState = {
    worktree: "",
    branch: "",
    ledger: "",
    specPath: "",
    specHash: "",
    specExists: false,
    pr: "",
  };
  let runLinePending = true;

  function done(step: string): void {
    completed.push(step);
  }
  function skip(step: string): void {
    skipped.push(step);
    completed.push(step);
  }
  function stop(step: string, needs: readonly Need[]): Stopped {
    const checkpoint: Checkpoint = {};
    if (state.worktree) checkpoint.worktree = state.worktree;
    if (state.branch) checkpoint.branch = state.branch;
    if (state.specExists) checkpoint.spec = state.specPath;
    if (state.ledger) checkpoint.ledger = state.ledger;
    if (state.pr) checkpoint.pr = state.pr;
    return blocked(WORKFLOW, step, needs, {
      completed: [...completed],
      checkpoint,
      attempts,
    });
  }
  // Count a failure against a gate; true when the gate's budget is spent.
  function fail(gate: Gate, approach: string, failed: string): boolean {
    failures[gate] += 1;
    attempts.push({ gate, approach, failed });
    return failures[gate] >= MAX_FAILURES;
  }
  function exhausted(step: string, gate: Gate): Stopped {
    const last = attempts.filter((a) => a.gate === gate).slice(-MAX_FAILURES);
    return stop(step, [
      need(
        step,
        1,
        "validation",
        `A ${gate} that passes its gate; ${MAX_FAILURES} attempts failed.`,
        last.map((a) => `${a.approach}: ${a.failed}`).join(" | "),
      ),
    ]);
  }

  function rel(p: string | null | undefined): string {
    let t = (p || "").trim().replace(/^\.\//, "");
    if (state.worktree && t.startsWith(state.worktree + "/")) t = t.slice(state.worktree.length + 1);
    // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short path
    return t.replace(/\/+$/, "");
  }
  function within(p: string, scope: string): boolean {
    const a = rel(p);
    const b = rel(scope);
    return !!a && !!b && (a === b || a.startsWith(b + "/"));
  }
  function overlaps(x: readonly string[], y: readonly string[]): boolean {
    return x.some((p) => y.some((q) => within(p, q) || within(q, p)));
  }
  function pathOf(location: string): string {
    const m = /^(.*?)(?::\d+(?:-\d+)?)?$/.exec(location.trim());
    return rel(m ? m[1] : location);
  }
  // Relative paths from a JSON value the spec scout quoted; anything but an array throws, as calling map on it would.
  function relList(v: unknown): string[] {
    if (!isList(v)) throw new TypeError("not a list of paths");
    return v.map((p: unknown) => rel(jsonText(p || "")));
  }

  // Dispatch validators, and re-run any whose verdict is missing or on another revision. Those
  // re-runs have their own bound and spend neither the spec nor the implementation budget.
  async function judge(items: readonly Validator[], revision: string, step: string): Promise<Judged> {
    const out: (LensResult | null | undefined)[] = Array.from({ length: items.length }, () => null);
    let rounds = 0;
    for (;;) {
      const todo = items.map((item, i) => ({ item, i })).filter((t) => !usable(out[t.i], revision));
      if (todo.length === 0) return { verdicts: out };
      const names = todo.map((t) => t.item.name).join(", ");
      if (rounds >= MAX_FAILURES) {
        attempts.push({
          gate: "validator",
          approach: `${names} on ${revision}`,
          failed: "no usable verdict after repeated dispatches",
        });
        return {
          stop: stop(step, [
            need(
              step,
              1,
              "validation",
              `A usable verdict from ${names} on revision ${revision}.`,
              `${rounds} dispatches returned no verdict, a verdict on another revision, or a fail with no blocking finding`,
            ),
          ]),
        };
      }
      if (rounds > 0)
        attempts.push({
          gate: "validator",
          approach: `re-run ${names}`,
          failed: "no verdict, or a verdict on another revision",
        });
      const res = await parallel(todo.map((t) => () => t.item.call()));
      for (const [k, t] of todo.entries()) out[t.i] = res[k];
      rounds += 1;
    }
  }
  function record(name: string, v: LensResult | null | undefined, revision: string): void {
    verification.push({
      agent: name,
      verdict: v ? v.verdict : "none",
      evaluated: v ? v.evaluated : revision,
      findings: v ? v.findings.length : 0,
    });
  }

  // Ledger lines ride on the next pusher dispatch; the run line goes first.
  function takeLines(lines: readonly string[] | undefined): string[] {
    const out: string[] = [];
    if (runLinePending) {
      out.push(
        `run <n, one more than the highest run number in the ledger, or 1>: ${WORKFLOW} ${storyArg
          .replaceAll(/\s+/g, " ")
          .slice(
            0,
            80,
          )} | worktree ${state.worktree || "<the worktree path>"} | branch ${state.branch || "<the branch name>"}`,
      );
      runLinePending = false;
    }
    return [...out, ...(lines ?? [])];
  }
  function pushBrief(instruction: string, lines?: readonly string[], ledgerNote?: string): string {
    const ln = takeLines(lines);
    return `${WHERE}
You are the only agent in this workflow that acts on the board and forge. ${AUTH}

Worktree: ${state.worktree || "(not created yet)"}. Ledger: ${ledgerNote || `${state.worktree}/.tmp/ledger.md`}.

${instruction}

${
  ln.length > 0
    ? `Append these lines, in this order, to the ledger (create it, with its directory, if absent). Stamp each with the current time in front and fill every <placeholder> from what you just did:\n${ln.map((l) => `- ${l}`).join("\n")}`
    : "Append no ledger lines."
}

Report each operation you performed as an operations entry, named worktree, branch, delivery-start, commit, push, pr, review-trigger, or ledger, with its reference. Set done only when every operation asked for is complete; list each one that is unbound or failed in unmet.`;
  }
  function pushStop(step: string, r: PusherResult | null): Stopped {
    return stop(step, [
      need(
        step,
        1,
        "prerequisite",
        "An operation that docs/BOARD.md or docs/FORGE.md bind, and the authorization to run it.",
        r ? r.unmet.join("; ") || "pusher reported the work incomplete" : "pusher did not return",
      ),
    ]);
  }

  // A short account of what passed, for the session to relay.
  function makeReport(extra: readonly string[] | undefined, review: ReviewView): string {
    const outcome = (r: ReviewView): string => {
      const o = r.review === undefined ? r.status : r.review;
      const text = typeof o === "string" ? o : JSON.stringify(o);
      const rounds = isList(r.rounds) ? `${r.rounds.length} round(s)` : "";
      const unfixed = isList(r.unfixed) && r.unfixed.length > 0 ? `${r.unfixed.length} finding(s) left unfixed` : "";
      return [text, rounds, unfixed].filter(Boolean).join("; ");
    };
    return [
      `${WORKFLOW} done.`,
      ...(extra ?? []),
      verification.length > 0
        ? `Verification this run: ${verification.map((v) => `${v.agent} ${v.verdict} on ${v.evaluated}`).join("; ")}.`
        : "Verification: every gate was already satisfied by earlier checkpoints; no new verdicts this run.",
      skipped.length > 0 ? `Skipped from checkpoints: ${skipped.join(", ")}.` : "",
      `PR: ${state.pr}.`,
      `Review: ${outcome(review)}.`,
      limits.length > 0 ? `Limits: ${limits.join(" | ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  // ---- Plan -------------------------------------------------------------------

  // With the spec already committed, the tasks and docs come back from the spec itself.
  async function recoverPlan(): Promise<Plan | null> {
    const r = await scout(
      "scout-docs",
      `${WHERE}
Read the spec at ${state.specPath} and report only its task list and the documentation it says to update; quote the spec, claim nothing of your own. Report one evidence item per task: source "task:<id>", location the spec path, excerpt a JSON object {"summary": "...", "paths": ["..."]} with the task's paths relative to the worktree root. Report one evidence item with source "docs" and excerpt a JSON array of the documentation paths to update (an empty array when none). Quote the spec; make no changes.`,
      { label: "read spec tasks", phase: PLAN_PHASE },
    );
    const tasks: PlanTask[] = [];
    let docs: string[] = [];
    const evidence = r?.evidence ?? [];
    for (const e of evidence) {
      try {
        if (e.source.startsWith("task:")) {
          const j: unknown = JSON.parse(e.excerpt);
          const id = e.source.slice(5);
          const summary = jsonText(prop(j, "summary") || "");
          tasks.push({ id, summary, paths: relList(prop(j, "paths") || []) });
        } else if (e.source === "docs") {
          docs = relList(JSON.parse(e.excerpt));
        }
      } catch {
        // an unreadable item is dropped; an empty plan stops the run below
      }
    }
    return tasks.length > 0 ? { tasks, docs } : null;
  }

  return {
    WHERE,
    completed,
    skipped,
    attempts,
    verification,
    limits,
    state,
    done,
    skip,
    stop,
    fail,
    exhausted,
    rel,
    within,
    overlaps,
    pathOf,
    judge,
    record,
    pushBrief,
    pushStop,
    makeReport,
    recoverPlan,
  };
}

export type Deliver<Gate extends string> = ReturnType<typeof createDeliver<Gate>>;
