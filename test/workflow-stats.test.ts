// The workflow-investigate script's numbers and flags, from hand-built runs.
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  agentStats,
  flags,
  render,
  slugOf,
  turnCost,
  type AgentRun,
  type RunData,
  type Turn,
} from "../src/slopify/skills/workflow-investigate/stats.ts";

const START = Date.parse("2026-11-15T10:00:00Z");
const at = (s: number): string => new Date(START + s * 1000).toISOString();
const turn = (model: string, usage: Partial<Turn["usage"]> = {}): Turn => ({
  model,
  timestamp: at(1),
  usage: { input: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, output: 0, ...usage },
  toolCalls: 0,
});
const agent = (over: Partial<AgentRun>): AgentRun => ({
  agentId: "a",
  type: "scout-code",
  label: "scout",
  phase: "Ground",
  start: at(0),
  end: at(10),
  turns: [turn("claude-haiku-5-5", { input: 1000, output: 100 })],
  result: { answer: "a" },
  ...over,
});
const READY = { status: "ready" };
const run = (agents: AgentRun[], result: unknown = READY): RunData => ({
  runId: "wf_1",
  workflow: "deliver-trivial",
  args: { story: "SMR-1" },
  status: "completed",
  result,
  startTime: START,
  durationMs: 60_000,
  agents,
});
const flagsOf = (r: RunData): string[] => flags(r, agentStats(r));
// A scout dispatch with its own id and label, ending at the given second.
const scout = (id: string, end = 10): AgentRun => agent({ agentId: id, label: id, end: at(end) });
const haiku = (input: number): number => turnCost(turn("claude-haiku-5-5", { input }));

describe("turnCost", () => {
  test("prices input, both cache writes, cache reads, and output", () => {
    const t = turn("claude-opus-5-5", {
      input: 1_000_000,
      cacheWrite5m: 1_000_000,
      cacheWrite1h: 1_000_000,
      cacheRead: 1_000_000,
      output: 1_000_000,
    });
    assert.equal(turnCost(t), 4 + 5 + 8 + 0.2 + 20);
  });

  test("charges Haiku's higher tier once the prompt passes 100K tokens", () => {
    assert.equal(haiku(100_000), 0.01);
    assert.equal(haiku(200_000), 0.1);
  });

  test("has no price for an unknown model", () => {
    const unknown = turn("some-model", { input: 1 });
    assert.ok(Number.isNaN(turnCost(unknown)));
  });
});

describe("flags", () => {
  test("says nothing about a clean run", () => {
    const clean = run([scout("a"), scout("b")]);
    assert.deepEqual(flagsOf(clean), []);
  });

  test("names a run that didn't end ready", () => {
    const f = flagsOf(run([scout("a")], { status: "blocked", step: "locate" }));
    assert.ok(f.includes("The run ended blocked at locate, not ready."));
  });

  test("names an agent that never finished, and one that returned nothing", () => {
    const f = flagsOf(run([agent({ result: undefined }), agent({ agentId: "b", label: "b", result: null })]));
    assert.ok(f.includes('scout-code "scout" unfinished.'));
    assert.ok(f.includes('scout-code "b" returned nothing.'));
  });

  test("names a pusher that wasn't done, and a lens that passed with findings", () => {
    const f = flagsOf(
      run([
        agent({ type: "pusher", label: "push", result: { done: false, unmet: ["x"], operations: [] } }),
        agent({ agentId: "b", type: "lens-scope", label: "scope", result: { verdict: "pass", findings: [{}, {}] } }),
      ]),
    );
    assert.ok(f.includes('pusher "push" reported not done, 1 unmet.'));
    assert.ok(f.includes('lens-scope "scope" passed but listed findings: pass, 2 finding(s).'));
  });

  test("names a repeated dispatch and mostly dismissed rulings", () => {
    const judge = (id: string, verdict: string): AgentRun =>
      agent({ agentId: id, type: "judge", label: `rule ${id}`, result: { verdict } });
    const f = flagsOf(
      run([
        judge("1", "dismissed"),
        judge("2", "dismissed"),
        judge("3", "confirmed"),
        agent({}),
        agent({ agentId: "x" }),
      ]),
    );
    assert.ok(f.includes("2 of 3 judge rulings were dismissals."));
    assert.ok(f.includes('scout-code "scout" ran 2 times.'));
  });

  test("names an agent far slower than others of its type", () => {
    const f = flagsOf(run([scout("a"), scout("b", 12), scout("c", 200)]));
    assert.ok(f.some((x) => x.startsWith('scout-code "c" took 200s')));
  });
});

describe("render", () => {
  test("gives the slug, and the phase, agent type, and agent tables", () => {
    const r = run([agent({})]);
    const md = render(r);
    assert.equal(slugOf(r), "deliver-trivial-2026-11-15-wf_1");
    assert.match(md, /^# deliver-trivial run wf_1/);
    assert.match(md, /- Slug: deliver-trivial-2026-11-15-wf_1/);
    for (const heading of ["## By phase", "## By agent type", "## Agents", "## Flags"]) assert.ok(md.includes(heading));
    assert.match(md, /\| Ground \| 1 \| 10s \|/);
  });
});
