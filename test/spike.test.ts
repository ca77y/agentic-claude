// Runs deliver-spike with scripted agents, so its control flow is tested without any model.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import deliverSpike from "../src/slopify/workflows/deliver-spike.ts";

type Reply = Record<string, unknown> | null;
type Script = (type: string, label: string, prompt: string) => Reply;

const calls: { type: string; label: string; prompt: string }[] = [];
const current: { script: Script } = { script: () => null };

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
Object.assign(globalThis, { phase: () => null, parallel: runAll, agent: fakeAgent });

const SCOUT = { answer: "a", gaps: [], evidence: [{ source: "code", location: "calc.py:1", excerpt: "def add" }] };
const LENS_PASS = { verdict: "pass", evaluated: "x", findings: [], limits: "none" };
const CONFIRMED = {
  verdict: "confirmed",
  severity: "major",
  kind: "docs",
  ruling: "none",
  reason: "seen",
  fingerprint: "f",
};
const ok = (op: string, reference: string) => ({ done: true, unmet: [], operations: [{ op, reference }] });
const CLAIM = { id: "c1", claim: "add sums a million pairs in under a second.", status: "unknown" };

// A prompt: pusher files SPIKE-1, which reads back with the question as its story.
const pusher = (label: string, prompt: string): Reply => {
  if (label === "file the card") return ok("card", "SPIKE-1");
  if (label === "create the worktree") return ok("worktree", "/p/wt");
  if (label === "create the prototype") return ok("worktree", "/p/proto");
  return ok(prompt.includes("open the branch's PR") ? "pr" : "commit", "PR-7");
};
const DEFAULTS: Record<string, Script> = {
  "scout-card": (_t, _l, prompt) =>
    prompt.includes("SPIKE-1")
      ? {
          answer: "a",
          gaps: [],
          evidence: [
            { source: "card", location: "x", excerpt: "SPIKE-1" },
            { source: "story-source", location: "x", excerpt: "card" },
            { source: "story", location: "x", excerpt: "Is add fast enough?" },
            { source: "story-revision", location: "x", excerpt: "abc1234" },
          ],
        }
      : {
          answer: "a",
          gaps: [],
          evidence: [
            { source: "story-source", location: "x", excerpt: "text" },
            { source: "story-revision", location: "x", excerpt: "abc1234" },
          ],
        },
  "scout-checkpoint": () => ({ answer: "a", gaps: [], evidence: [] }),
  "library-reader": () => ({ summary: "nothing yet", supported: [], gaps: ["speed"] }),
  "writer-findings": (_t, label) =>
    label === "plan"
      ? { claims: [{ ...CLAIM, measurement: "time a million calls" }], assumptions: [] }
      : { changed: ["docs/spikes/spike-1.md"] },
  coder: () => ({
    measurements: [{ claim: "c1", command: "python3 bench.py", output: "0.02 s", value: "0.02 s" }],
    assumptions: [],
    problem: "",
  }),
  qa: () => ({ results: [{ claim: "c1", confirmed: true, reason: "" }] }),
  judge: () => CONFIRMED,
  checks: () => ({ commands: [{ command: "lint", exitCode: 0, failingLines: "" }] }),
  watcher: () => ({ outcome: "not-declared", waitingFor: "", limitMinutes: 60, reference: "r", findings: [] }),
  pusher: (_t, label, prompt) => pusher(label, prompt),
};
const happy = (over: Partial<Record<string, Script>> = {}): Script => {
  const agents = { ...DEFAULTS, ...over };
  return (type, label, prompt) => {
    const script = agents[type];
    if (script) return script(type, label, prompt);
    return type.startsWith("lens-") ? LENS_PASS : type.startsWith("scout-") ? SCOUT : null;
  };
};
const briefOf = (label: string): string => calls.find((c) => c.label === label)?.prompt ?? "";

// Every case starts from the same prompt.
async function run(script: Script) {
  current.script = script;
  Object.assign(globalThis, { args: "Is add fast enough?" });
  return deliverSpike();
}

beforeEach(() => {
  calls.length = 0;
});

describe("deliver-spike", () => {
  test("files a card for a prompt without writing a ledger, which has no checkout yet", async () => {
    await run(happy());
    const filing = briefOf("file the card");
    assert.ok(filing.includes("Append no ledger lines."));
    assert.ok(!filing.includes("Ledger:"));
    assert.ok(briefOf("create the worktree").includes("run <n"));
  });

  test("reports what the prototype measured, that qa confirmed it, and that it was deleted", async () => {
    const r = await run(happy());
    assert.ok("report" in r);
    assert.match(r.report, /Findings: docs\/spikes\/spike-1-.*\.md\./);
    assert.match(r.report, /deleted; it was never pushed or merged/);
    assert.match(r.report, /confirmed by a separate qa:\n- add sums a million pairs in under a second\. 0\.02 s/);
    assert.ok(calls.some((c) => c.label === "delete the prototype"));
  });

  test("says no prototype was needed when the evidence settled every claim", async () => {
    const r = await run(
      happy({
        "writer-findings": (_t, label) =>
          label === "plan"
            ? { claims: [{ ...CLAIM, measurement: "" }], assumptions: [] }
            : { changed: ["docs/spikes/spike-1.md"] },
      }),
    );
    assert.ok("report" in r);
    assert.match(r.report, /No prototype was needed/);
    assert.equal(calls.filter((c) => c.type === "coder").length, 0);
  });

  test("tells pusher that firing no review for a project that declares none is not unmet", async () => {
    await run(happy());
    const push = briefOf("push the round");
    assert.ok(push.includes("When docs/FORGE.md declares no review, fire nothing: that is not unmet."));
    assert.ok(push.includes("fired <the trigger time, or none when docs/FORGE.md declares no review>"));
  });

  test("tells pusher that an operation the brief doesn't ask for is not unmet", async () => {
    await run(happy());
    assert.ok(briefOf("file the card").includes("one it doesn't ask for is neither performed nor unmet"));
  });
});
