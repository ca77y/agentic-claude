// SMR-372: shape and the deliveries that file a card for a prompt, run against a fake Linear board that rewrites card
// text on save. Every agent that reads the board answers truthfully from it, so the tests hold whatever route a fix takes
// to find the card an earlier run filed.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import shape from "../src/slopify/workflows/shape.ts";
import { createDeliver } from "../src/slopify/lib/deliver.ts";
import { findCard } from "../src/slopify/lib/small.ts";
import { calls, current, installAgents, scriptOf, type Script } from "./harness.ts";
import { board, clearBoard, duplicateMarks, HIDDEN, holds, linearPusher, linearSave } from "./linear-board.ts";

installAgents();

const IDEA = "Split out of SMR-317: which of the owner's sessions reach Garmin, Intervals.icu and Strava";
// What shape's draft holds for an idea: the idea itself, as the card's text.
const draftBody = (idea: string): string => `## Question\n\n${idea}\n\n## References\n\n- The owner's comment.`;
const state = { idea: "" };

const item = (source: string, excerpt: string) => ({ source, location: "x", excerpt });
const VIEW = { judgement: "proceed", reasons: [], risks: [], conditions: [] };
const PASS = { verdict: "pass", evaluated: "x", findings: [], limits: "none" };
const AGENTS: Record<string, Script> = {
  "library-reader": () => ({ summary: "s", supported: [], gaps: [] }),
  "writer-card": () => ({ openQuestions: [] }),
  judge: () => ({ problems: [] }),
  pusher: linearPusher(() => draftBody(state.idea)),
  // Reports every card on the board by its visible text, as a scout reading the board does. Like the real scout, it
  // reports a card's hidden line only when its brief names that line, so a rerun finds its card only if the brief asks.
  "scout-related-cards": (_t, _l, prompt) => {
    const asked = Array.from(prompt.matchAll(HIDDEN), (m) => m[0]);
    return {
      answer: board.length > 0 ? `Cards on the board: ${board.map((c) => c.id).join(", ")}` : "No related card.",
      evidence: [
        ...board.map((c) => ({ source: "card", location: c.id, excerpt: c.body.replaceAll(HIDDEN, "").trim() })),
        ...board.flatMap((c) =>
          asked
            .filter((line) => c.body.includes(line) || c.body.includes(linearSave(line)))
            .map((line) => ({ source: "card", location: c.id, excerpt: line })),
        ),
      ],
      gaps: [],
    };
  },
  // advisor-fit's rule: another card that already holds this same outcome is the duplicate.
  "advisor-fit": (_t, _l, prompt) => {
    const shaped = /The card (\S+), with its comments/.exec(prompt)?.[1];
    const held = board.find((c) => c.id !== shaped && holds(c.body, state.idea));
    return { ...VIEW, ...(held && { duplicateOf: held.id }) };
  },
  "advisor-simplify": (_t, label) => (label === "simplify the draft" ? PASS : VIEW),
  // Reads a named card from the board, or takes a prompt as the story.
  "scout-card": (_t, _l, prompt) => {
    const arg = /<<<ARG\n([\s\S]*?)\nARG>>>/.exec(prompt)?.[1] ?? "";
    const card = board.find((c) => c.id === arg);
    return {
      answer: "a",
      gaps: [],
      evidence: card
        ? [
            item("card", card.id),
            item("story-source", "card"),
            item("story", card.body),
            item("story-revision", "abc1234"),
          ]
        : [item("story-source", "text"), item("story-revision", "abc1234")],
    };
  },
};
const agents = scriptOf(AGENTS);
const script: Script = (type, label, prompt) =>
  agents(type, label, prompt) ??
  (type.startsWith("scout-")
    ? { answer: "a", evidence: [], gaps: [] }
    : type.startsWith("advisor-")
      ? VIEW
      : type.startsWith("lens-")
        ? PASS
        : null);

async function run(): Promise<{ status: string; card?: string; report?: string }> {
  calls.length = 0;
  state.idea = IDEA;
  current.script = script;
  Object.assign(globalThis, { args: IDEA });
  return shape();
}

// deliver-trivial, deliver-bugfix, deliver-spike, and research all find or file their card through findCard.
async function deliver() {
  calls.length = 0;
  current.script = script;
  const d = createDeliver({ workflow: "deliver-trivial", projectRoot: "/p", storyArg: IDEA });
  try {
    return await findCard(d, IDEA, "story");
  } catch (error) {
    return { status: "blocked", error: String(error) };
  }
}

beforeEach(() => {
  clearBoard();
});

describe("shape against a board that rewrites card text on save", () => {
  test("an idea holding a card identifier and a domain is filed in full and reported as filed, not blocked", async () => {
    const r = await run();
    assert.equal(board.length, 1, "shape filed one card");
    const filed = board[0];
    assert.ok(filed, "shape filed a card");
    const wrote = linearSave(draftBody(IDEA));
    assert.ok(filed.body.startsWith(wrote), "the card holds everything shape wrote");
    assert.notEqual(r.status, "blocked", `shape reported ${filed.id}, a complete card, as blocked`);
    assert.equal(r.status, "done");
    assert.equal(r.card, filed.id);
  });

  test("a rerun on the same idea finds the card the first run filed and updates it, without the user naming it", async () => {
    await run();
    const first = board[0];
    assert.ok(first, "the first run filed a card");
    const r = await run();
    assert.equal(board.length, 1, `the rerun filed another card: ${board.map((c) => c.id).join(", ")}`);
    assert.equal(r.status, "done", `the rerun ended ${r.status}: ${r.report ?? ""}`);
    assert.equal(r.card, first.id);
    assert.equal(first.writes, 2, "the rerun updated the card the first run filed");
  });

  test("a rerun on an idea another card also holds marks no card a duplicate, since the user named none", async () => {
    await run();
    board.unshift({ id: "SMR-380", body: linearSave(draftBody(IDEA)), writes: 1 });
    await run();
    assert.deepEqual(duplicateMarks, [], "an idea run asked pusher to mark a card a duplicate");
  });
});

describe("a delivery that files a card for a prompt, against a board that rewrites card text on save", () => {
  test("a prompt holding a card identifier and a domain gets its card filed and reported as filed", async () => {
    const r = await deliver();
    assert.equal(board.length, 1, "the delivery filed one card");
    assert.ok(holds(board[0]?.body ?? "", IDEA), "the card holds the prompt");
    assert.ok("cardId" in r, `the delivery stopped on a complete card: ${JSON.stringify(r)}`);
    assert.equal(r.cardId, board[0]?.id);
  });

  test("a rerun on the same prompt finds the card the first run filed instead of filing another", async () => {
    await deliver();
    const r = await deliver();
    assert.equal(board.length, 1, `the rerun filed another card: ${board.map((c) => c.id).join(", ")}`);
    assert.ok("cardId" in r, `the rerun stopped: ${JSON.stringify(r)}`);
    assert.equal(r.cardId, board[0]?.id);
  });
});
