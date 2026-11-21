// The numbers and flags of one workflow run, from what Claude Code records about it: the run file, the journal, and
// each agent's transcript. Pure: reading the files is main.ts's job, so this is tested without any.

/** Dollars per million tokens. Cache writes cost 1.25 times the input price for 5 minutes and 2 times for an hour. */
interface Price {
  input: number;
  output: number;
  cacheRead: number;
}

// Haiku 5.5 charges more once a prompt passes 100K tokens.
const HAIKU_TIER_TOKENS = 100_000;
const PRICES: readonly { prefix: string; price: Price; above?: Price }[] = [
  { prefix: "claude-opus-5-5", price: { input: 4, output: 20, cacheRead: 0.2 } },
  { prefix: "claude-sonnet-5-5", price: { input: 2, output: 10, cacheRead: 0.1 } },
  {
    prefix: "claude-haiku-5-5",
    price: { input: 0.1, output: 0.5, cacheRead: 0.01 },
    above: { input: 0.5, output: 2.5, cacheRead: 0.05 },
  },
];

interface Usage {
  input: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
  output: number;
}

/** One model response, as an agent's transcript records it. */
export interface Turn {
  model: string;
  timestamp: string;
  usage: Usage;
  toolCalls: number;
}

export interface AgentRun {
  agentId: string;
  type: string;
  label: string;
  phase: string;
  /** When the agent was dispatched and when its transcript ends, as ISO times; empty when it has no transcript. */
  start: string;
  end: string;
  turns: Turn[];
  /** The agent's result from the journal: null when it returned nothing, undefined when it never finished. */
  result: unknown;
}

export interface RunData {
  runId: string;
  workflow: string;
  args: unknown;
  /** The run's own status, such as completed or failed. */
  status: string;
  /** What the workflow returned. */
  result: unknown;
  startTime: number;
  durationMs: number;
  agents: AgentRun[];
}

const MILLION = 1_000_000;

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    out.set(k, [...(out.get(k) ?? []), item]);
  }
  return out;
}

/** A turn's cost in dollars, or NaN for a model with no known price. */
export function turnCost(t: Turn): number {
  const row = PRICES.find((p) => t.model.startsWith(p.prefix));
  if (!row) return NaN;
  const u = t.usage;
  const prompt = u.input + u.cacheWrite5m + u.cacheWrite1h + u.cacheRead;
  const p = row.above && prompt > HAIKU_TIER_TOKENS ? row.above : row.price;
  return (
    (u.input * p.input +
      u.cacheWrite5m * p.input * 1.25 +
      u.cacheWrite1h * p.input * 2 +
      u.cacheRead * p.cacheRead +
      u.output * p.output) /
    MILLION
  );
}

const sum = (xs: readonly number[]): number => {
  let total = 0;
  for (const x of xs) total += x;
  return total;
};
const sumUsage = (turns: readonly Turn[]): Usage => ({
  input: sum(turns.map((t) => t.usage.input)),
  cacheWrite5m: sum(turns.map((t) => t.usage.cacheWrite5m)),
  cacheWrite1h: sum(turns.map((t) => t.usage.cacheWrite1h)),
  cacheRead: sum(turns.map((t) => t.usage.cacheRead)),
  output: sum(turns.map((t) => t.usage.output)),
});
const tokensOf = (u: Usage): number => u.input + u.cacheWrite5m + u.cacheWrite1h + u.cacheRead + u.output;

export interface AgentStats {
  agent: AgentRun;
  model: string;
  /** Milliseconds from the run's start to the agent's first response. */
  offsetMs: number;
  durationMs: number;
  usage: Usage;
  tokens: number;
  cost: number;
  outcome: string;
}

const time = (iso: string): number => new Date(iso).getTime();
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** One transcript entry's model response and its message id, or undefined when the entry is no response. */
export function turnOf(e: unknown): { id: string; turn: Turn } | undefined {
  if (!isRecord(e) || e["type"] !== "assistant" || !isRecord(e["message"])) return undefined;
  const m = e["message"];
  const u = isRecord(m["usage"]) ? m["usage"] : {};
  const split = isRecord(u["cache_creation"]) ? u["cache_creation"] : undefined;
  const content: unknown[] = Array.isArray(m["content"]) ? (m["content"] as unknown[]) : [];
  return {
    id: str(m["id"]),
    turn: {
      model: str(m["model"]),
      timestamp: str(e["timestamp"]),
      usage: {
        input: num(u["input_tokens"]),
        cacheWrite5m: num(split ? split["ephemeral_5m_input_tokens"] : u["cache_creation_input_tokens"]),
        cacheWrite1h: split ? num(split["ephemeral_1h_input_tokens"]) : 0,
        cacheRead: num(u["cache_read_input_tokens"]),
        output: num(u["output_tokens"]),
      },
      toolCalls: content.filter((b) => isRecord(b) && b["type"] === "tool_use").length,
    },
  };
}

// What the agent came back with, in a few words: enough to spot one that died, refused, or found something.
function outcomeOf(a: AgentRun): string {
  if (a.result === undefined) return "unfinished";
  if (a.result === null) return "returned nothing";
  if (!isRecord(a.result)) return "returned";
  const r = a.result;
  if (typeof r["done"] === "boolean") {
    const unmet = Array.isArray(r["unmet"]) ? r["unmet"].length : 0;
    return r["done"] && unmet === 0 ? "done" : `not done, ${String(unmet)} unmet`;
  }
  if (typeof r["verdict"] === "string") {
    const findings = Array.isArray(r["findings"]) ? r["findings"].length : 0;
    return findings > 0 ? `${r["verdict"]}, ${String(findings)} finding(s)` : r["verdict"];
  }
  return "returned";
}

export function agentStats(run: RunData): AgentStats[] {
  return run.agents.map((agent) => {
    const usage = sumUsage(agent.turns);
    return {
      agent,
      model: agent.turns[0]?.model ?? "",
      offsetMs: agent.start ? time(agent.start) - run.startTime : 0,
      durationMs: agent.start && agent.end ? time(agent.end) - time(agent.start) : 0,
      usage,
      tokens: tokensOf(usage),
      cost: sum(agent.turns.map((t) => turnCost(t))),
      outcome: outcomeOf(agent),
    };
  });
}

const median = (xs: readonly number[]): number => {
  const s = xs.toSorted((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2 : (s[mid] ?? 0);
};

// A slow agent is at least this much slower than the median of its type, and slow in absolute terms too.
const SLOW_FACTOR = 3;
const SLOW_MS = 60_000;
// One agent that takes this share of the run's cost is worth a look, once the run has enough agents to share it.
const HEAVY_SHARE = 0.25;
const HEAVY_MIN_AGENTS = 5;

const name = (s: AgentStats): string => `${s.agent.type} "${s.agent.label}"`;

// What each agent's own outcome and cost say about it.
function agentFlags(stats: readonly AgentStats[]): string[] {
  const out: string[] = [];
  const total = sum(stats.map((s) => s.cost));
  for (const s of stats) {
    if (s.outcome === "unfinished" || s.outcome === "returned nothing") out.push(`${name(s)} ${s.outcome}.`);
    else if (s.outcome.startsWith("not done")) out.push(`${name(s)} reported ${s.outcome}.`);
    else if (s.outcome.startsWith("pass,")) out.push(`${name(s)} passed but listed findings: ${s.outcome}.`);
    if (Number.isNaN(s.cost)) out.push(`${name(s)} ran on ${s.model || "an unknown model"}, which has no known price.`);
    else if (stats.length >= HEAVY_MIN_AGENTS && total > 0 && s.cost / total > HEAVY_SHARE) {
      out.push(`${name(s)} cost $${s.cost.toFixed(2)}, ${String(Math.round((s.cost / total) * 100))}% of the run.`);
    }
  }
  return out;
}

// Agents far slower than the others of their type.
function slowFlags(stats: readonly AgentStats[]): string[] {
  return [...groupBy(stats, (s) => s.agent.type)].flatMap(([type, group]) => {
    const m = median(group.map((s) => s.durationMs));
    return group
      .filter((s) => group.length > 1 && s.durationMs > SLOW_MS && s.durationMs > m * SLOW_FACTOR)
      .map((s) => `${name(s)} took ${seconds(s.durationMs)}, over ${String(SLOW_FACTOR)} times the ${type} median.`);
  });
}

// A judge returns one ruling per problem under rulings; an older one returned a single verdict.
function rulingsOf(s: AgentStats): Record<string, unknown>[] {
  const r = s.agent.result;
  if (s.agent.type !== "judge" || !isRecord(r)) return [];
  const rulings: unknown = r["rulings"];
  if (!Array.isArray(rulings)) return r["verdict"] === undefined ? [] : [r];
  const list: readonly unknown[] = rulings;
  return list.filter((x) => isRecord(x));
}
// A confirmed finding at one of these severities is routed to a suggestion, so nothing fixes it.
const UNFIXED = new Set(["minor", "nit", "none"]);
// Too few rulings say nothing about how a judge rates.
const MIN_RULINGS = 3;

function rulingFlags(stats: readonly AgentStats[]): string[] {
  const rulings = stats.flatMap((s) => rulingsOf(s));
  const dismissed = rulings.filter((r) => r["verdict"] === "dismissed");
  const confirmed = rulings.filter((r) => r["verdict"] === "confirmed");
  const unfixed = confirmed.filter((r) => UNFIXED.has(String(r["severity"])));
  const out: string[] = [];
  if (rulings.length > 0 && dismissed.length * 2 > rulings.length) {
    out.push(`${String(dismissed.length)} of ${String(rulings.length)} judge rulings were dismissals.`);
  }
  if (confirmed.length >= MIN_RULINGS && unfixed.length * 2 > confirmed.length) {
    out.push(
      `${String(unfixed.length)} of ${String(confirmed.length)} confirmed findings were ruled minor or below, so nothing fixed them.`,
    );
  }
  return out;
}

// A review that skipped the change, failed, or timed out reviewed nothing.
const UNREVIEWED = new Set(["skipped", "failed", "timed-out"]);
function reviewFlags(stats: readonly AgentStats[]): string[] {
  return stats
    .filter((s) => s.agent.type === "watcher")
    .map((s) => ({ s, r: isRecord(s.agent.result) ? s.agent.result : {} }))
    .filter(({ r }) => UNREVIEWED.has(String(r["outcome"])))
    .map(({ s, r }) => {
      const why = typeof r["reference"] === "string" ? `: ${r["reference"]}` : ".";
      return `${name(s)} reported the review ${String(r["outcome"])}${why}`;
    });
}

/** What stands out, each with the agents it concerns. These are leads for the investigation, not conclusions. */
export function flags(run: RunData, stats: readonly AgentStats[]): string[] {
  const out: string[] = [];
  if (isRecord(run.result) && run.result["status"] !== "ready") {
    const step = typeof run.result["step"] === "string" ? ` at ${run.result["step"]}` : "";
    out.push(`The run ended ${String(run.result["status"])}${step}, not ready.`);
  }
  out.push(...agentFlags(stats), ...slowFlags(stats));
  const byName = groupBy(stats, (s) => name(s));
  for (const [label, group] of byName) {
    if (group.length > 1) out.push(`${label} ran ${String(group.length)} times.`);
  }
  out.push(...rulingFlags(stats), ...reviewFlags(stats));
  return out;
}

const seconds = (ms: number): string => `${String(Math.round(ms / 1000))}s`;
const dollars = (n: number): string => (Number.isNaN(n) ? "?" : `$${n.toFixed(3)}`);
const thousands = (n: number): string => `${(n / 1000).toFixed(1)}K`;
const cell = (s: string): string => s.replaceAll("|", String.raw`\|`).replaceAll("\n", " ");
const table = (head: readonly string[], rows: readonly (readonly string[])[]): string =>
  [
    `| ${head.join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.map((c) => cell(c)).join(" | ")} |`),
  ].join("\n");

/** The file name a report gets: the workflow, the run's start date, and its run id. */
export function slugOf(run: RunData): string {
  return `${run.workflow}-${new Date(run.startTime).toISOString().slice(0, 10)}-${run.runId}`;
}

interface Group {
  key: string;
  stats: AgentStats[];
}
function grouped(stats: readonly AgentStats[], by: (s: AgentStats) => string): Group[] {
  return [...groupBy(stats, by)].map(([key, g]) => ({ key, stats: g }));
}
const costOf = (g: readonly AgentStats[]): number => sum(g.map((s) => s.cost));
const tokenSum = (g: readonly AgentStats[]): number => sum(g.map((s) => s.tokens));

/** The report's measured part, in Markdown. The investigation adds what the numbers mean. */
export function render(run: RunData): string {
  const stats = agentStats(run);
  const total = sumUsage(stats.flatMap((s) => s.agent.turns));
  const outcome = isRecord(run.result) ? String(run.result["status"]) : "no result";
  const byPhase = grouped(stats, (s) => s.agent.phase).map((g) => {
    const start = Math.min(...g.stats.map((s) => s.offsetMs));
    const end = Math.max(...g.stats.map((s) => s.offsetMs + s.durationMs));
    return [
      g.key,
      String(g.stats.length),
      seconds(end - start),
      thousands(tokenSum(g.stats)),
      dollars(costOf(g.stats)),
    ];
  });
  const byType = grouped(stats, (s) => s.agent.type)
    .map((g) => {
      const u = sumUsage(g.stats.flatMap((s) => s.agent.turns));
      return {
        cost: costOf(g.stats),
        row: [
          g.key,
          g.stats[0]?.model ?? "",
          String(g.stats.length),
          String(sum(g.stats.map((s) => s.agent.turns.length))),
          thousands(u.input + u.cacheWrite5m + u.cacheWrite1h),
          thousands(u.cacheRead),
          thousands(u.output),
          dollars(costOf(g.stats)),
          seconds(median(g.stats.map((s) => s.durationMs))),
        ],
      };
    })
    .toSorted((a, b) => b.cost - a.cost)
    .map((x) => x.row);
  const agents = stats
    .toSorted((a, b) => a.offsetMs - b.offsetMs)
    .map((s) => [
      seconds(s.offsetMs),
      seconds(s.durationMs),
      s.agent.phase,
      s.agent.type,
      s.agent.label,
      String(s.agent.turns.length),
      thousands(s.tokens),
      dollars(s.cost),
      s.outcome,
    ]);
  const found = flags(run, stats);
  return [
    `# ${run.workflow} run ${run.runId}`,
    "",
    `- Slug: ${slugOf(run)}`,
    `- Started: ${new Date(run.startTime).toISOString()}`,
    `- Arguments: ${run.args === undefined ? "not recorded" : `\`${JSON.stringify(run.args)}\``}`,
    `- Duration: ${seconds(run.durationMs)}; run status ${run.status}; outcome ${outcome}`,
    `- Agents: ${String(stats.length)}; tokens ${thousands(tokensOf(total))} (output ${thousands(total.output)}); cost ${dollars(costOf(stats))}`,
    "",
    "## By phase",
    "",
    table(["Phase", "Agents", "Wall time", "Tokens", "Cost"], byPhase),
    "",
    "## By agent type",
    "",
    table(
      ["Agent", "Model", "Dispatches", "Turns", "Input + cache writes", "Cache reads", "Output", "Cost", "Median time"],
      byType,
    ),
    "",
    "## Agents",
    "",
    table(["Start", "Time", "Phase", "Agent", "Label", "Turns", "Tokens", "Cost", "Outcome"], agents),
    "",
    "## Flags",
    "",
    found.length > 0 ? found.map((f) => `- ${f}`).join("\n") : "- None.",
    "",
  ].join("\n");
}
