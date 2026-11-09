// Runs the how phase and deliver-story's intake with scripted agents.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { createDeliver } from "../src/slopify/lib/deliver.ts";
import { runHow } from "../src/slopify/lib/how.ts";
import type { Run } from "../src/slopify/lib/loop.ts";
import deliverStory from "../src/slopify/workflows/deliver-story.ts";

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

const SPEC = {
  build: {
    shared: [],
    tasks: [{ id: "t1", dependsOn: [], files: ["a.ts"], criteria: ["c1"], todo: "x", reuse: [], create: [] }],
    docs: [],
  },
  validate: {
    criteria: [{ id: "c1", wording: "w", category: "UI", path: "p", evidence: "e", firstTest: "t" }],
  },
  claims: ["a.ts exists"],
};
const DESIGN = { approach: "a", reuse: [], create: [], interfaces: [], data: [], dependencies: [], risks: [] };
const SCOUT = { answer: "a", evidence: [], gaps: [] };
const LENS_PASS = { verdict: "pass", evaluated: "x", findings: [], limits: "none" };
const VIABLE = { viable: true, chosen: "smallest", grafts: [], rejected: [], reasons: ["fits"] };
const OK_PUSH = { done: true, unmet: [], operations: [{ op: "commit", reference: "abc" }] };

const isAdvisor = (type: string): boolean => type.startsWith("advisor-");
const adviceOrAttack = (label: string): Reply => (label.startsWith("attack") ? LENS_PASS : { views: [] });

const DEFAULTS: Record<string, Script> = {
  designer: () => DESIGN,
  writer: () => SPEC,
  pusher: () => OK_PUSH,
  "check-claim": () => ({ holds: true, location: "a.ts:1", problem: "" }),
  "check-criterion": () => ({ holds: true, location: "c1", problem: "" }),
  "lens-scope": () => LENS_PASS,
  "lens-consistency": () => LENS_PASS,
  judge: (_t, label) => (label === "decide" ? VIABLE : { verdict: "confirmed", severity: "major", reason: "r" }),
  "library-reader": () => ({ summary: "s", supported: [], gaps: [] }),
};
const happy = (over: Partial<Record<string, Script>> = {}): Script => {
  const agents = { ...DEFAULTS, ...over };
  return (type, label, prompt) => {
    if (isAdvisor(type)) return adviceOrAttack(label);
    return type.startsWith("scout-") ? SCOUT : (agents[type]?.(type, label, prompt) ?? null);
  };
};

function freshRun(): Run {
  const d = createDeliver({
    workflow: "deliver-story",
    maxFailures: 3,
    planPhase: "Build",
    failures: { spec: 0, implementation: 0 },
    projectRoot: "/p",
    storyArg: "SMR-1",
  });
  d.state.worktree = "/p/wt";
  return d;
}
const how = async (script: Script) => {
  current.script = script;
  const d = freshRun();
  return runHow({
    d,
    where: "project",
    story: "the issue",
    storyRevision: "abc",
    cardId: "SMR-1",
    specDir: "docs/specs/smr-1",
    answers: {},
  });
};
const count = (type: string): number => calls.filter((c) => c.type === type).length;

beforeEach(() => {
  calls.length = 0;
});

const card =
  (labels: string): Script =>
  (type, label, prompt) => {
    if (type === "scout-card") {
      return {
        answer: "a",
        gaps: [],
        evidence: [
          { source: "card", location: "x", excerpt: "SMR-1" },
          { source: "story-source", location: "x", excerpt: "card" },
          { source: "story", location: "x", excerpt: "Title\n\nBody" },
          { source: "story-revision", location: "x", excerpt: "abc1234" },
          { source: "labels", location: "x", excerpt: labels },
        ],
      };
    }
    return type === "scout-checkpoint"
      ? { ...SCOUT, evidence: [{ source: "worktree", location: "x", excerpt: "/p/wt" }] }
      : happy()(type, label, prompt);
  };

describe("the how phase", () => {
  test("runs three independent designs, then all five advisors", async () => {
    const r = await how(happy());
    assert.ok("build" in r);
    assert.equal(count("designer"), 3);
    for (const name of ["architecture", "performance", "risk", "security", "testability"]) {
      assert.ok(count(`advisor-${name}`) >= 1, name);
    }
  });

  test("gives each designer its own stance, and none sees another's work", async () => {
    await how(happy());
    const briefs = calls.filter((c) => c.type === "designer").map((c) => c.prompt);
    assert.equal(new Set(briefs).size, 3);
    assert.ok(briefs.every((b) => !b.includes('"approach"')));
  });

  test("commits the spec before it is challenged", async () => {
    await how(happy());
    const firstCommit = calls.findIndex((c) => c.label === "commit the spec");
    const firstCheck = calls.findIndex((c) => c.type === "check-claim");
    assert.ok(firstCommit !== -1 && firstCommit < firstCheck);
  });

  test("checks each claim and each criterion on its own", async () => {
    await how(happy());
    assert.equal(count("check-claim"), 1);
    assert.equal(count("check-criterion"), 1);
    assert.equal(count("lens-scope"), 1);
  });

  test("designs again when none is viable, then reports it exhausted", async () => {
    const r = await how(
      happy({ judge: () => ({ viable: false, chosen: "", grafts: [], rejected: [], reasons: ["can't work"] }) }),
    );
    assert.ok("exhausted" in r);
    assert.deepEqual(r.exhausted, ["can't work", "can't work"]);
    assert.equal(count("designer"), 6);
    assert.equal(count("writer"), 0);
  });

  test("revises the spec for a confirmed problem, then passes", async () => {
    let claims = 0;
    const r = await how(
      happy({
        "check-claim": () => {
          claims += 1;
          return claims === 1
            ? { holds: false, location: "a.ts", problem: "no such file" }
            : { holds: true, location: "a.ts", problem: "" };
        },
      }),
    );
    assert.ok("build" in r);
    assert.equal(count("writer"), 2);
  });

  test("halts on a blocker still open after every round", async () => {
    const r = await how(
      happy({
        "check-claim": () => ({ holds: false, location: "a.ts", problem: "gone" }),
        judge: (_t, label) =>
          label === "decide" ? VIABLE : { verdict: "confirmed", severity: "blocker", reason: "fatal" },
      }),
    );
    assert.ok("exhausted" in r);
    assert.ok(r.exhausted[0]?.includes("gone"));
    assert.equal(count("check-claim"), 3);
  });

  test("records a major still open after every round, and continues", async () => {
    const r = await how(happy({ "check-claim": () => ({ holds: false, location: "a.ts", problem: "gone" }) }));
    assert.ok("build" in r);
    assert.ok(calls.some((c) => c.type === "writer" && c.prompt.includes("Record these open problems")));
  });

  test("ignores a dismissed problem", async () => {
    const r = await how(
      happy({
        "check-claim": () => ({ holds: false, location: "a.ts", problem: "gone" }),
        judge: (_t, label) => (label === "decide" ? VIABLE : { verdict: "dismissed", severity: "minor", reason: "no" }),
      }),
    );
    assert.ok("build" in r);
    assert.equal(count("writer"), 1);
  });

  test("never treats a check that died as a pass", async () => {
    await assert.rejects(how(happy({ "check-claim": () => null })));
  });
});

describe("deliver-story's intake", () => {
  test("refuses an issue without the Deliverable label, and says to run shape", async () => {
    current.script = card("Feature");
    Object.assign(globalThis, { args: "SMR-1" });
    const r = await deliverStory();
    assert.equal(r.status, "not-started");
    assert.ok("next" in r && r.next.includes("shape"));
    assert.equal(count("designer"), 0);
    assert.ok(calls.some((c) => c.label === "comment on the issue"));
  });

  test("goes on to the how phase when the label is there", async () => {
    current.script = card("Feature, Deliverable");
    Object.assign(globalThis, { args: "SMR-1" });
    await deliverStory();
    assert.ok(count("designer") > 0);
  });

  test("asks for the issue when the argument is empty", async () => {
    current.script = happy();
    Object.assign(globalThis, { args: "" });
    const r = await deliverStory();
    assert.equal(r.status, "not-started");
    assert.equal(calls.length, 0);
  });
});
