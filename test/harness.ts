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
function fakeAgent(prompt: string, opts: { agentType?: string; label?: string }): Promise<Reply> {
  const type = (opts.agentType ?? "").replace("slopify:", "");
  const row = opts.label ?? "";
  const label = row.startsWith(`${type} · `) ? row.slice(type.length + 3) : row;
  calls.push({ type, label, row, prompt });
  return Promise.resolve(current.script(type, label, prompt));
}
export function installAgents(): void {
  Object.assign(globalThis, { phase: () => null, parallel: runAll, agent: fakeAgent });
}
