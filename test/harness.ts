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

// Linear's save turns a card identifier, in any case, into an issue link. It isn't a content change.
export function linearSave(body: string): string {
  return body.replaceAll(/\bsmr-\d+\b/gi, (m) => {
    const id = m.toUpperCase();
    return `<issue id="uuid-${id}" label="${id}" href="https://linear.app/ca77y/issue/${id}/x" />`;
  });
}

// A board that saves through linearSave, and a pusher that files a card the way a filing brief tells it: it finds the
// card the brief names, or searches the stored bodies for the brief's hidden line, writes that line as the card's body,
// and reads the write back, reporting unmet when the stored line isn't the line it wrote.
export function linearBoard(first: number): { cards: Map<string, string>; pusher: (prompt: string) => Reply } {
  const cards = new Map<string, string>();
  let next = first;
  const pusher = (prompt: string): Reply => {
    const line = /<!--[^\n]*?-->/.exec(prompt)?.[0] ?? "";
    const named = /Update card ([A-Z]+-\d+)/.exec(prompt)?.[1];
    const found = named ?? [...cards].find(([, body]) => body === line)?.[0];
    const id = found ?? `SMR-${String(next++)}`;
    cards.set(id, linearSave(line));
    return cards.get(id) === line
      ? { done: true, unmet: [], operations: [{ op: "card", reference: id }] }
      : { done: false, unmet: [`read back ${id}: the stored line differs from ${line}`], operations: [] };
  };
  return { cards, pusher };
}
