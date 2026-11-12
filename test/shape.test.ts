// Runs shape with scripted agents, so its control flow is tested without any model.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import shape from "../src/slopify/workflows/shape.ts";

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

const SCOUT = { answer: "a", evidence: [], gaps: [] };
const PASS = { verdict: "pass", evaluated: "x", findings: [], limits: "none" };
const FAIL = {
  verdict: "fail",
  evaluated: "x",
  findings: [{ location: "criteria", problem: "vague", blocking: true }],
  limits: "",
};
const VIEW = { judgement: "proceed", reasons: [], risks: [], conditions: [] };
const CONFIRMED = { verdict: "confirmed", severity: "major", reason: "seen" };
const FILED = { done: true, unmet: [], operations: [{ op: "card", reference: "SMR-60" }] };

const DEFAULTS: Record<string, Script> = {
  "library-reader": () => ({ summary: "s", supported: [], gaps: [] }),
  "writer-card": () => ({ openQuestions: [] }),
  judge: () => CONFIRMED,
  pusher: () => FILED,
};
const happy = (over: Partial<Record<string, Script>> = {}): Script => {
  const agents = { ...DEFAULTS, ...over };
  return (type, label, prompt) => {
    const scripted = agents[type];
    if (scripted) return scripted(type, label, prompt);
    if (type.startsWith("scout-")) return SCOUT;
    if (type.startsWith("advisor-")) return VIEW;
    return type.startsWith("lens-") ? PASS : null;
  };
};
const count = (type: string, label?: string): number =>
  calls.filter((c) => c.type === type && (label === undefined || c.label.includes(label))).length;
const filing = (): string => calls.find((c) => c.type === "pusher")?.prompt ?? "";

async function run(args: unknown, script: Script) {
  current.script = script;
  Object.assign(globalThis, { args });
  return shape();
}

beforeEach(() => {
  calls.length = 0;
});

describe("shape", () => {
  test("shapes an idea into a story, checks it three ways, and files it as Deliverable", async () => {
    const r = await run("Let users multiply two numbers", happy());
    assert.equal(r.status, "done");
    assert.ok("deliverable" in r && r.deliverable);
    assert.equal(
      count("advisor-value") + count("advisor-scope") + count("advisor-alternatives") + count("advisor-fit"),
      4,
    );
    assert.deepEqual(
      calls.filter((c) => c.type.startsWith("lens-")).map((c) => c.type),
      ["lens-template", "lens-criteria", "lens-solution-free"],
    );
    assert.ok(filing().includes("has the label Deliverable"));
    assert.ok(filing().includes("create a card only when there is none"));
  });

  test("files a story with open questions without Deliverable, and lists them", async () => {
    const r = await run("Let users multiply", happy({ "writer-card": () => ({ openQuestions: ["integers only?"] }) }));
    assert.ok("deliverable" in r && !r.deliverable);
    assert.ok(filing().includes("doesn't have the label Deliverable"));
    assert.ok("report" in r && r.report.includes("integers only?"));
  });

  test("shapes a bug with the fit advisor and the template check only, and never labels it", async () => {
    const r = await run({ idea: "add returns the difference", kind: "bug" }, happy());
    assert.ok("deliverable" in r && !r.deliverable);
    assert.equal(calls.filter((c) => c.type.startsWith("advisor-")).length, 1);
    assert.equal(count("advisor-fit"), 1);
    assert.deepEqual(
      calls.filter((c) => c.type.startsWith("lens-")).map((c) => c.type),
      ["lens-template"],
    );
    assert.ok(!filing().includes("Make sure the card"));
  });

  test("shapes a spike with the scope advisor", async () => {
    await run({ idea: "Is the parser fast enough?", kind: "spike" }, happy());
    assert.equal(count("advisor-scope"), 1);
    assert.equal(calls.filter((c) => c.type.startsWith("advisor-")).length, 1);
    assert.ok(calls.find((c) => c.type === "writer-card")?.prompt.includes("a spike"));
  });

  test("revises the draft for a confirmed problem, then files it", async () => {
    let checks = 0;
    const r = await run(
      "Let users multiply",
      happy({
        "lens-criteria": () => {
          checks += 1;
          return checks === 1 ? FAIL : PASS;
        },
      }),
    );
    assert.ok("deliverable" in r && r.deliverable);
    assert.equal(count("writer-card", "revise"), 1);
  });

  test("ignores a problem the judge dismisses", async () => {
    const r = await run(
      "Let users multiply",
      happy({ "lens-criteria": () => FAIL, judge: () => ({ ...CONFIRMED, verdict: "dismissed" }) }),
    );
    assert.ok("deliverable" in r && r.deliverable);
    assert.equal(count("writer-card"), 1);
  });

  test("records what is still wrong after three rounds as open questions, so it isn't Deliverable", async () => {
    const r = await run(
      "Let users multiply",
      happy({
        "lens-criteria": () => FAIL,
        "writer-card": (_t, label) => ({ openQuestions: label === "record what is open" ? ["criteria: vague"] : [] }),
      }),
    );
    assert.ok("deliverable" in r && !r.deliverable);
    assert.equal(count("writer-card", "revise"), 2);
    assert.equal(count("writer-card", "record what is open"), 1);
  });

  test("starts from a card with its comments, and updates that card", async () => {
    const card: Reply = {
      ...SCOUT,
      evidence: [
        { source: "card", location: "x", excerpt: "SMR-7" },
        { source: "text", location: "x", excerpt: "Multiply\n\nOpen question: integers only?\nComment: yes, integers" },
      ],
    };
    await run({ card: "SMR-7" }, happy({ "scout-card": () => card }));
    assert.ok(calls.find((c) => c.label === "draft")?.prompt.includes("yes, integers"));
    assert.ok(filing().includes("Update card SMR-7"));
  });

  test("halts when the card can't be filed", async () => {
    const r = await run(
      "Let users multiply",
      happy({ pusher: () => ({ done: false, unmet: ["no create binding"], operations: [] }) }),
    );
    assert.equal(r.status, "blocked");
  });

  test("asks for the idea when given nothing", async () => {
    const r = await run("", happy());
    assert.equal(r.status, "not-started");
    assert.equal(calls.length, 0);
  });
});
