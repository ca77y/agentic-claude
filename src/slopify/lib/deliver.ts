// What every delivery shares: the pusher schema, the dispatchers, and one run's state with the helpers that read and
// change it.
import { absent, blocked, fact, type Blocked, type Need, type NeedKind, type ScoutResult } from "./family.ts";
import { pusherSchema } from "./schemas.ts";

const PUSHER_SCHEMA = pusherSchema({ reference: "A commit sha, PR URL or path, card id, or worktree path" });

export type PusherResult = Infer<typeof PUSHER_SCHEMA>;

interface DeliverState {
  worktree: string;
  branch: string;
  ledger: string;
  pr: string;
}
interface Checkpoint {
  worktree?: string;
  branch?: string;
  ledger?: string;
  pr?: string;
}
export type Stopped = Blocked & { completed: string[]; checkpoint: Checkpoint };

export interface DeliverConfig {
  workflow: string;
  projectRoot: string;
  storyArg: string;
}

export const NO_WRITES = "Do not commit, push, branch, or change the board or forge; pusher does that.";

export function need(step: string, n: number, kind: NeedKind, what: string, evidence?: string): Need {
  return { id: `${step}-${n}`, kind, what, evidence: evidence || "" };
}

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

export const pushOk = (r: PusherResult | null): r is PusherResult => !!r && r.done && r.unmet.length === 0;
export const opRef = (r: PusherResult | null, name: string): string => {
  const o = (r?.operations ?? []).find((x) => x.op.toLowerCase() === name);
  return o ? o.reference.trim() : "";
};

// Each dispatch of a producer or operator names its agent type literally.
export function callWriter<const S extends Schema>(
  prompt: string,
  label: string,
  phaseTitle: string,
  schema: S,
): Promise<Infer<S> | null> {
  return agent(prompt, { agentType: "slopify:writer", label, phase: phaseTitle, schema });
}
export function callCoder<const S extends Schema>(
  prompt: string,
  label: string,
  phaseTitle: string,
  schema: S,
): Promise<Infer<S> | null> {
  return agent(prompt, { agentType: "slopify:coder", label, phase: phaseTitle, schema });
}
export function callPusher(prompt: string, label: string, phaseTitle: string): Promise<PusherResult | null> {
  return agent(prompt, { agentType: "slopify:pusher", label, phase: phaseTitle, schema: PUSHER_SCHEMA });
}

// Builds one run's state and the helpers that close over it. Call it where the run's helpers are first needed:
// WHERE and AUTH are fixed from the config then.
export function createDeliver(config: DeliverConfig) {
  const { workflow: WORKFLOW, projectRoot, storyArg } = config;

  const WHERE = projectRoot
    ? `The project is at ${projectRoot}; address files by absolute path under it.`
    : "The project is the session project directory; address files by absolute path.";
  const AUTH = `Authorization, from the user's invocation of /slopify:${WORKFLOW}: the story branch and worktree, attributable commits, the pushes the brief asks for, opening or updating this task's PR as a draft or ready, the declared review trigger, the one issue comment and label the brief asks for when the run ends or halts, and filing the issues the brief lists. It does not authorize merging, releases, any other message, rewriting docs/BOARD.md or docs/FORGE.md, or changing a card's content. Work exactly as docs/BOARD.md and docs/FORGE.md declare; an operation that is not bound is unmet, never improvised. Stage explicit paths only.`;

  const completed: string[] = [];
  const state: DeliverState = {
    worktree: "",
    branch: "",
    ledger: "",
    pr: "",
  };
  let runLinePending = true;

  function done(step: string): void {
    completed.push(step);
  }
  function skip(step: string): void {
    completed.push(step);
  }
  function stop(step: string, needs: readonly Need[]): Stopped {
    const checkpoint: Checkpoint = {};
    if (state.worktree) checkpoint.worktree = state.worktree;
    if (state.branch) checkpoint.branch = state.branch;
    if (state.ledger) checkpoint.ledger = state.ledger;
    if (state.pr) checkpoint.pr = state.pr;
    return blocked(WORKFLOW, step, needs, {
      completed: [...completed],
      checkpoint,
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

  return { WHERE, state, done, skip, stop, pushBrief, pushStop };
}

export type Deliver = ReturnType<typeof createDeliver>;
