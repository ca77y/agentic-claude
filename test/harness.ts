// Scripted stand-ins for the Workflow runtime's agent globals, so a test drives a workflow without any model.
export type Reply = Record<string, unknown> | null;
export type Script = (type: string, label: string, prompt: string) => Reply;

export const calls: { type: string; label: string; prompt: string }[] = [];
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
  const label = opts.label ?? "";
  calls.push({ type, label, prompt });
  return Promise.resolve(current.script(type, label, prompt));
}
export function installAgents(): void {
  Object.assign(globalThis, { phase: () => null, parallel: runAll, agent: fakeAgent });
}
