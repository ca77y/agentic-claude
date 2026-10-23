// What shape and reproduce-bug share to run their gates: the record of each run's steps and attempts, the
// blocked result built from it, and the lens dispatch and reading that every validate gate uses.
import {
  lens,
  sameRev,
  answerOf,
  blocked,
  type Answers,
  type Blocked,
  type FamilyOptions,
  type LensResult,
  type Need,
  type Settled,
} from "./family.ts";

export const MAX_FAILURES = 3;

export interface Attempt {
  gate: string;
  approach: string;
  failed: string;
}

/** What a run has done so far, and the durable checkpoints a rerun finds. */
export interface RunLog<C extends object> {
  readonly completed: string[];
  readonly skipped: string[];
  readonly attempts: Attempt[];
  readonly checkpoint: C;
}

export type Halted<C extends object> = Blocked & { completed: string[]; checkpoint: C; attempts: Attempt[] };

// A blocked result that keeps the steps and checkpoints as they stand now.
export function halt<C extends object>(
  workflow: string,
  run: RunLog<C>,
  step: string,
  needs: readonly Need[],
): Halted<C> {
  return blocked(workflow, step, needs, {
    completed: [...run.completed],
    checkpoint: { ...run.checkpoint },
    attempts: run.attempts,
  });
}

export function done(run: RunLog<object>, step: string): void {
  if (!run.completed.includes(step)) run.completed.push(step);
}

export function skip(run: RunLog<object>, step: string): void {
  if (!run.skipped.includes(step)) run.skipped.push(step);
  done(run, step);
}

function findingsText(v: LensResult): string {
  const list = v.findings.map((f) => `- ${f.blocking ? "[blocking] " : ""}${f.location}: ${f.problem}`);
  return list.length > 0 ? list.join("\n") : "- none";
}

// A lens that returns no verdict, or one on another revision, is dispatched again under its own bound:
// that is not a failure of the validate gate and does not send a producer to revise. Null when the bound is spent.
export async function lensOn(
  run: { readonly attempts: Attempt[] },
  name: string,
  brief: string,
  revision: string,
  opts: FamilyOptions,
): Promise<LensResult | null> {
  for (let i = 1; i <= MAX_FAILURES; i++) {
    const v = await lens(name, brief, opts);
    if (v && sameRev(revision, v.evaluated)) return v;
    run.attempts.push({
      gate: "validator",
      approach: `${name} on revision ${revision}`,
      failed: v ? `judged "${v.evaluated}", not the briefed revision` : "the lens did not return a verdict",
    });
  }
  return null;
}

// What keeps a lens verdict, already on the briefed revision, from counting as a pass; an empty array is a pass.
export function problems(name: string, v: LensResult): string[] {
  if (v.verdict !== "pass") return [`${name} ${v.verdict}\n${findingsText(v)}\nLimits: ${v.limits}`];
  return v.findings.some((f) => f.blocking) ? [`${name} passed with blocking findings\n${findingsText(v)}`] : [];
}

// Every blocker under the prefix that the user has answered, to go back to the writer with its answer from its
// first dispatch: a fresh writer words a blocker differently.
export function answeredBlockers(prefix: string, answers: Answers): Settled[] {
  return Object.keys(answers)
    .filter((k) => k.startsWith(`${prefix}-`) && answerOf(answers, k))
    .map((k) => ({
      id: k,
      question: `an earlier blocker whose id was ${k}; its words ran: ${k
        .replace(`${prefix}-`, "")
        .replace(/-[a-z0-9]{6,7}$/, "")
        .replaceAll("-", " ")}`,
      answer: answerOf(answers, k),
    }));
}
