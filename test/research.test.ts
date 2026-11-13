// Runs research with scripted agents, so its control flow is tested without any model.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import research from "../src/slopify/workflows/research.ts";

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

const CARD = {
  answer: "a",
  gaps: [],
  evidence: [
    { source: "card", location: "x", excerpt: "SMR-30" },
    { source: "story-source", location: "x", excerpt: "card" },
    { source: "story", location: "x", excerpt: "How fast is the parser?" },
    { source: "story-revision", location: "x", excerpt: "abc1234" },
  ],
};
const evidenceFor = (url: string, extra: Record<string, unknown> = {}) => ({
  findings: [`fast <- ${url}`],
  sources: [{ url, title: url }],
  contradictions: [],
  limits: [],
  planProblem: "",
  ...extra,
});
const PASS = { verdict: "pass", findings: [], evidence: "read it" };
const FAIL = { verdict: "fail", findings: ["q2 is unbounded"], evidence: "read it" };
// One judge serves both the plan's rulings and the loop's.
const CONFIRMED = {
  verdict: "confirmed",
  severity: "major",
  kind: "docs",
  ruling: "none",
  reason: "seen",
  fingerprint: "f",
};
const PR = { done: true, unmet: [], operations: [{ op: "pr", reference: "PR-3" }] };
const OK_PUSH = { done: true, unmet: [], operations: [{ op: "commit", reference: "abc" }] };

const scribe = (label: string): Reply => {
  if (label === "plan" || label.startsWith("revise")) {
    return {
      subQuestions: [
        { id: "q1", question: "How fast?" },
        { id: "q2", question: "On what input?" },
      ],
    };
  }
  if (label.startsWith("raw note"))
    return { path: `library/raw/${label.replace("raw note ", "n")}.md`, deferredMetadata: ["index line"] };
  if (label === "integrate")
    return {
      pages: ["library/wiki/parser-speed.md"],
      changed: ["library/wiki/parser-speed.md", "library/_meta/index.md"],
    };
  return { changed: ["library/wiki/parser-speed.md"] };
};

const DEFAULTS: Record<string, Script> = {
  "scout-card": () => CARD,
  "scout-checkpoint": () => ({
    answer: "a",
    gaps: [],
    evidence: [{ source: "worktree", location: "x", excerpt: "/p/wt" }],
  }),
  "library-reader": () => ({ summary: "nothing yet", supported: [], gaps: ["speed"] }),
  "library-scribe": (_t, label) => scribe(label),
  "library-clerk": () => PASS,
  "library-researcher": (_t, label) => evidenceFor(label === "retrieve q1" ? "https://a.example" : "https://b.example"),
  judge: () => CONFIRMED,
  checks: () => ({ commands: [{ command: "lint", exitCode: 0, failingLines: "" }] }),
  watcher: () => ({ outcome: "finished", waitingFor: "", limitMinutes: 60, reference: "r", findings: [] }),
  pusher: (_t, _l, prompt) => (prompt.includes("open the branch's PR") ? PR : OK_PUSH),
};
const happy = (over: Partial<Record<string, Script>> = {}): Script => {
  const agents = { ...DEFAULTS, ...over };
  return (type, label, prompt) => agents[type]?.(type, label, prompt) ?? null;
};
const count = (type: string, label?: string): number =>
  calls.filter((c) => c.type === type && (label === undefined || c.label.includes(label))).length;
const integratePrompt = (): string => calls.find((c) => c.label === "integrate")?.prompt ?? "";

async function run(args: unknown, script: Script) {
  current.script = script;
  Object.assign(globalThis, { args });
  return research();
}

beforeEach(() => {
  calls.length = 0;
});

describe("research", () => {
  test("plans, retrieves per sub-question, writes a raw note per source, integrates, and goes ready", async () => {
    const r = await run("SMR-30", happy());
    assert.equal(r.status, "ready");
    assert.equal(count("library-researcher"), 2);
    assert.equal(count("library-scribe", "raw note"), 2);
    assert.equal(count("library-scribe", "integrate"), 1);
    assert.ok(
      calls.some(
        (c) =>
          c.label === "commit: add the research" && c.prompt.includes("done findings library/wiki/parser-speed.md"),
      ),
    );
    assert.ok(
      calls.some((c) => c.label === "push the round" && c.prompt.includes("Findings: `library/wiki/parser-speed.md`")),
    );
    assert.ok(calls.find((c) => c.label === "plan")?.prompt.includes(".tmp/research/smr-30.plan.md"));
  });

  test("writes one raw note for a source two sub-questions share", async () => {
    await run("SMR-30", happy({ "library-researcher": () => evidenceFor("https://same.example") }));
    assert.equal(count("library-scribe", "raw note"), 1);
  });

  test("revises the plan for a confirmed problem", async () => {
    let checks = 0;
    await run(
      "SMR-30",
      happy({
        "library-clerk": (_t, label) => {
          if (label !== "check the plan") return PASS;
          checks += 1;
          return checks === 1 ? FAIL : PASS;
        },
      }),
    );
    assert.equal(count("library-scribe", "revise"), 1);
  });

  test("states what is still wrong with the plan after three rounds as a limit, and goes on", async () => {
    const r = await run(
      "SMR-30",
      happy({ "library-clerk": (_t, label) => (label === "check the plan" ? FAIL : PASS) }),
    );
    assert.equal(r.status, "ready");
    assert.equal(count("library-scribe", "revise"), 2);
    assert.ok(integratePrompt().includes("q2 is unbounded"));
  });

  test("never replans: a researcher's plan problem becomes a stated limit", async () => {
    await run(
      "SMR-30",
      happy({ "library-researcher": () => evidenceFor("https://a.example", { planProblem: "q1 needs a version" }) }),
    );
    assert.equal(count("library-scribe", "revise"), 0);
    assert.ok(integratePrompt().includes("q1 needs a version"));
  });

  test("sends a problem the final check finds to the scribe's repair", async () => {
    let checks = 0;
    await run(
      "SMR-30",
      happy({
        "library-clerk": (_t, label) => {
          if (label !== "library integrity") return PASS;
          checks += 1;
          return checks === 1 ? { ...FAIL, findings: ["broken link in the index"] } : PASS;
        },
      }),
    );
    assert.equal(count("library-scribe", "repair"), 1);
  });

  test("goes straight to the loop when the pages are already committed", async () => {
    const r = await run(
      "SMR-30",
      happy({
        "scout-checkpoint": () => ({
          answer: "a",
          gaps: [],
          evidence: [
            { source: "worktree", location: "x", excerpt: "/p/wt" },
            { source: "done-findings", location: "x", excerpt: "library/wiki/parser-speed.md" },
          ],
        }),
      }),
    );
    assert.equal(r.status, "ready");
    assert.equal(count("library-reader"), 0);
    assert.equal(count("library-researcher"), 0);
  });

  test("asks for the question when given nothing", async () => {
    const r = await run("", happy());
    assert.equal(r.status, "not-started");
    assert.equal(calls.length, 0);
  });
});
