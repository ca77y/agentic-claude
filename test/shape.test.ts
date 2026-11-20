// Runs shape with scripted agents, so its control flow is tested without any model.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import shape from "../src/slopify/workflows/shape.ts";
import { calls, current, installAgents, type Reply, type Script } from "./harness.ts";

installAgents();

const SCOUT = { answer: "a", evidence: [], gaps: [] };
const PASS = { verdict: "pass", evaluated: "x", findings: [], limits: "none" };
const FAIL = {
  verdict: "fail",
  evaluated: "x",
  findings: [{ location: "criteria", problem: "vague", blocking: true }],
  limits: "",
};
const VIEW = { judgement: "proceed", reasons: [], risks: [], conditions: [] };
const CONFIRMED = { problems: [{ location: "x", problem: "vague", severity: "major", reason: "seen" }] };
const FILED = { done: true, unmet: [], operations: [{ op: "card", reference: "SMR-60" }] };

const DEFAULTS: Record<string, Script> = {
  "library-reader": () => ({ summary: "s", supported: [], gaps: [] }),
  "writer-card": () => ({ openQuestions: [] }),
  judge: () => CONFIRMED,
  pusher: () => FILED,
  "advisor-simplify": (_t, label) => (label === "simplify the draft" ? PASS : VIEW),
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
    assert.equal(count("advisor-simplify", "simplify the draft"), 1);
    assert.ok(filing().includes("has the label Deliverable"));
    assert.ok(filing().includes("has the label Shaped"));
    assert.ok(filing().includes("Create a card with it."));
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
    assert.equal(calls.filter((c) => c.type.startsWith("advisor-") && c.label !== "simplify the draft").length, 1);
    assert.equal(count("advisor-fit"), 1);
    assert.deepEqual(
      calls.filter((c) => c.type.startsWith("lens-")).map((c) => c.type),
      ["lens-template"],
    );
    assert.ok(!filing().includes("Deliverable."));
    assert.ok(filing().includes("has the label Shaped"));
  });

  test("shapes a spike with the scope and fit advisors", async () => {
    await run({ idea: "Is the parser fast enough?", kind: "spike" }, happy());
    assert.equal(count("advisor-scope") + count("advisor-fit"), 2);
    assert.equal(calls.filter((c) => c.type.startsWith("advisor-") && c.label !== "simplify the draft").length, 2);
    assert.ok(calls.find((c) => c.type === "writer-card")?.prompt.includes("a spike"));
  });

  test("files nothing for an idea an existing card already holds, and returns that card", async () => {
    const r = await run("Let users multiply", happy({ "advisor-fit": () => ({ ...VIEW, duplicateOf: "SMR-40" }) }));
    assert.equal(r.status, "duplicate");
    assert.ok("card" in r && r.card === "SMR-40");
    assert.ok("report" in r && r.report.includes("/slopify:shape SMR-40"));
    assert.equal(count("writer-card") + count("pusher"), 0);
  });

  test("marks a named card a duplicate of the card that already holds it, and drafts nothing", async () => {
    const card: Reply = { ...SCOUT, evidence: [{ source: "card", location: "x", excerpt: "SMR-7" }] };
    const r = await run(
      { card: "SMR-7" },
      happy({ "scout-card": () => card, "advisor-fit": () => ({ ...VIEW, duplicateOf: "SMR-40" }) }),
    );
    assert.equal(r.status, "duplicate");
    assert.ok("marked" in r && r.marked === "SMR-7");
    assert.ok(calls.find((c) => c.label === "mark the duplicate")?.prompt.includes("duplicate of card SMR-40"));
    assert.equal(count("writer-card"), 0);
  });

  test("never treats a card as a duplicate of itself", async () => {
    const card: Reply = { ...SCOUT, evidence: [{ source: "card", location: "x", excerpt: "SMR-7" }] };
    const r = await run(
      { card: "SMR-7" },
      happy({ "scout-card": () => card, "advisor-fit": () => ({ ...VIEW, duplicateOf: "SMR-7" }) }),
    );
    assert.equal(r.status, "done");
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

  test("rules on a round's findings with one judge, and skips it when nothing is reported", async () => {
    let checks = 0;
    const failOnce = () => {
      checks += 1;
      return checks <= 2 ? FAIL : PASS;
    };
    await run("Let users multiply", happy({ "lens-criteria": failOnce, "lens-template": failOnce }));
    assert.equal(count("judge"), 1);
    assert.equal(calls.find((c) => c.type === "judge")?.label, "rule on the findings");
  });

  test("ignores a problem the judge dismisses", async () => {
    const r = await run("Let users multiply", happy({ "lens-criteria": () => FAIL, judge: () => ({ problems: [] }) }));
    assert.ok("deliverable" in r && r.deliverable);
    assert.equal(count("writer-card"), 1);
  });

  test("records what is still wrong after three revisions as open questions, so it isn't Deliverable", async () => {
    const r = await run(
      "Let users multiply",
      happy({
        "lens-criteria": () => FAIL,
        "writer-card": (_t, label) => ({ openQuestions: label === "record what is open" ? ["criteria: vague"] : [] }),
      }),
    );
    assert.ok("deliverable" in r && !r.deliverable);
    assert.equal(count("writer-card", "revise"), 3);
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
    assert.equal(count("library-reader"), 1);
  });

  test("reshapes a Shaped card without grounding or advice, and still checks it", async () => {
    const card: Reply = {
      ...SCOUT,
      evidence: [
        { source: "card", location: "x", excerpt: "SMR-7" },
        { source: "labels", location: "x", excerpt: "Feature, Shaped" },
        { source: "text", location: "x", excerpt: "Multiply\n\nOpen question: integers only?\nComment: yes, integers" },
      ],
    };
    const r = await run({ card: "SMR-7" }, happy({ "scout-card": () => card }));
    assert.ok("deliverable" in r && r.deliverable);
    assert.equal(count("library-reader") + count("scout-code") + count("scout-docs"), 0);
    assert.equal(calls.filter((c) => c.type.startsWith("advisor-") && c.label !== "simplify the draft").length, 0);
    assert.ok(calls.find((c) => c.label === "apply the answers")?.prompt.includes("yes, integers"));
    assert.equal(calls.filter((c) => c.type.startsWith("lens-")).length, 3);
    assert.equal(count("advisor-simplify", "simplify the draft"), 1);
  });

  test("grounds and advises a card that isn't Shaped, such as one written by hand", async () => {
    const card: Reply = {
      ...SCOUT,
      evidence: [
        { source: "card", location: "x", excerpt: "SMR-8" },
        { source: "labels", location: "x", excerpt: "Feature" },
        { source: "text", location: "x", excerpt: "Multiply" },
      ],
    };
    await run({ card: "SMR-8" }, happy({ "scout-card": () => card }));
    assert.equal(count("library-reader"), 1);
    assert.equal(count("advisor-value"), 1);
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
