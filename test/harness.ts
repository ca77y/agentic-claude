// Scripted stand-ins for the Workflow runtime's agent globals, so a test drives a workflow without any model.
export type Reply = Record<string, unknown> | null;
export type Script = (type: string, label: string, prompt: string) => Reply;

/** `label` is what the dispatch is for, without the agent name the progress view shows in front of it; `row` is the whole row. */
export const calls: { type: string; label: string; row: string; prompt: string }[] = [];
export const current: { script: Script } = { script: () => null };

async function runAll(thunks: (() => Promise<unknown>)[]): Promise<unknown[]> {
  const settle = async (t: () => Promise<unknown>): Promise<unknown> => {
    try {
      return await t();
    } catch {
      return null;
    }
  };
  return Promise.all(thunks.map((t) => settle(t)));
}
// The delivery loop's judge rules on every problem of a step in one dispatch. A test scripts one ruling per problem,
// so each problem is shown to the script on its own, with the rest of the brief, and the rulings are numbered back.
const PROBLEM = /^Problem (\d+): [\s\S]*?(?=^Problem \d+: |^Severity: )/gm;
function rulePerProblem(type: string, prompt: string): Reply {
  const rest = prompt.replaceAll(PROBLEM, "");
  const rulings = Array.from(prompt.matchAll(PROBLEM), ([block, n]) => {
    const r = current.script(type, "rule", `${block}\n${rest}`);
    return r && { ...r, problem: Number(n) };
  });
  return rulings.every(Boolean) ? { rulings } : null;
}

function fakeAgent(prompt: string, opts: { agentType?: string; label?: string }): Promise<Reply> {
  const type = (opts.agentType ?? "").replace("slopify:", "");
  const row = opts.label ?? "";
  const label = row.startsWith(`${type} · `) ? row.slice(type.length + 3) : row;
  calls.push({ type, label, row, prompt });
  return Promise.resolve(
    label === "rule on the problems" ? rulePerProblem(type, prompt) : current.script(type, label, prompt),
  );
}
export function installAgents(): void {
  Object.assign(globalThis, { phase: () => null, log: () => null, parallel: runAll, agent: fakeAgent });
}

/** A run where each agent follows its default script, unless a test overrides it; any other agent returns nothing. */
export function scriptOf(defaults: Record<string, Script>, over: Partial<Record<string, Script>> = {}): Script {
  const agents = { ...defaults, ...over };
  return (type, label, prompt) => agents[type]?.(type, label, prompt) ?? null;
}

// A description in the shared PR format, as writer-pr returns it; a story's names the spec folder its brief gives.
export function prBody(prompt: string, outcome = "The change is delivered."): string {
  const spec = /Spec: ([\w./-]+)/.exec(prompt)?.[1];
  return [
    "## What changes",
    "",
    outcome,
    ...(spec ? ["", `Spec: ${spec}`] : []),
    "",
    "## Why trust it",
    "",
    "- Every check passes.",
  ].join("\n");
}
export const PR_WRITER: Script = (_t, _l, prompt) => ({ body: prBody(prompt) });
export const PR_AGENTS: Record<string, Script> = { "writer-pr": PR_WRITER };
export const isPosting = (c: { type: string; prompt: string }): boolean =>
  c.type === "pusher" && /open the branch's PR|update the PR/i.test(c.prompt);

/** Each pusher dispatch that opens or updates the PR has writer-pr since the one before it. */
export function describedBeforeEachPosting(): boolean {
  let from = 0;
  return calls.every((c, i) => {
    if (!isPosting(c)) return true;
    const stage = calls.slice(from, i);
    from = i + 1;
    return stage.some((s) => s.type === "writer-pr");
  });
}
