// Every slopify dispatch goes through here, so the progress view always names the agent that runs.

/** The row the progress view shows: the agent's name, then what this dispatch is for when that adds something. */
function rowLabel(agentType: string, label?: string): string {
  const name = agentType.replace(/^slopify:/, "");
  const what = (label ?? "").trim();
  return !what || what === name ? name : `${name} · ${what}`;
}

/** Dispatch a slopify agent. `label` says what this dispatch is for; the agent's name is added in front of it. */
export function dispatch<const S extends Schema>(
  prompt: string,
  opts: AgentOptions & { agentType: string; schema: S },
): Promise<Infer<S> | null> {
  return agent(prompt, { ...opts, label: rowLabel(opts.agentType, opts.label) });
}
