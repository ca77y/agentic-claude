// SMR-372: shape runs against a fake Linear board that rewrites card text on save, as Linear does: it links card
// identifiers in any case, rewrites `-` bullets to `*`, and wraps bare URLs in `<…>`. Every agent that touches the board
// answers truthfully from it, so the test holds whatever route a fix takes.
// The fake pusher keeps to its contract (agents/pusher.md, references/pusher-board.md, the pusher schema): it reads back
// each write, and a difference counts as tolerated only when its instructions declare that kind of rewrite harmless (the
// brief, pusher-board.md, or docs/BOARD.md). Any other difference is a failed card write: done false, listed in unmet,
// with the card still reported as an operation because it exists.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beforeEach, describe, test } from "node:test";

import shape from "../src/slopify/workflows/shape.ts";
import { SAME_WORK } from "../src/slopify/lib/deliver.ts";
import { calls, current, installAgents, scriptOf, type Script } from "./harness.ts";

installAgents();

const read = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

interface Card {
  id: string;
  body: string;
  writes: number;
}
const board: Card[] = [];
const state = { nextId: 371, idea: "" };

const linkIds = (t: string): string =>
  t.replaceAll(/\b([a-z]{2,5})-(\d+)\b/gi, (_m, k: string, n: string) => {
    const id = `${k.toUpperCase()}-${n}`;
    return `<issue id="uuid-${id}" label="${id}" href="https://linear.app/ca77y/issue/${id}/t" />`;
  });
const bulletsAndUrls = (t: string): string =>
  t.replaceAll(/^- /gm, "* ").replaceAll(/(?<![<(])(https?:\/\/[^\s>)]+)/g, "<$1>");
const linearSave = (t: string): string => linkIds(bulletsAndUrls(t));

// What shape's draft holds for an idea: the idea itself, as the card's text.
const draftBody = (idea: string): string => `## Question\n\n${idea}\n\n## References\n\n- The owner's comment.`;

// The idea's own words, which Linear leaves alone, are what makes a card hold this idea.
const holdsIdea = (c: Card, idea: string): boolean =>
  idea
    .replaceAll(/\b[a-z]{2,5}-\d+\b/gi, "")
    .split(/\W+/)
    .filter((w) => w.length > 4)
    .every((w) => c.body.includes(w));

// A sentence in the pusher's instructions that declares an identifier-to-link rewrite of the card body harmless.
const idLinksTolerated = (instructions: string): boolean =>
  instructions
    .split(/(?<=[.;])\s+/)
    .some(
      (s) =>
        /identifier|issue link|mention|link/i.test(s) &&
        /not a (?:content change|failed write)|is not a change|isn't a (?:content change|failed write)/i.test(s) &&
        !/that line|the marker line|marker/i.test(s),
    );

const pusher: Script = (_t, _l, prompt) => {
  const marker = /(<!--[\s\S]*?-->)/.exec(prompt)?.[1] ?? "";
  const named = /Update card (\S+) with it\./.exec(prompt)?.[1];
  const sent = `${draftBody(state.idea)}\n\n${marker}`.trimEnd();
  const searched = (): Card | undefined => {
    if (/whose body holds/i.test(prompt)) return board.find((c) => c.body.includes(marker));
    return prompt.includes(SAME_WORK) ? board.find((c) => holdsIdea(c, state.idea)) : undefined;
  };
  let card = named ? board.find((c) => c.id === named) : searched();
  if (!card) {
    card = { id: named ?? `SMR-${String(state.nextId++)}`, body: "", writes: 0 };
    board.push(card);
  }
  card.body = linearSave(sent);
  card.writes += 1;

  const instructions = [prompt, read("plugins/slopify/references/pusher-board.md"), read("docs/BOARD.md")].join("\n");
  const markerTolerated = /may rewrite text in that line[^.]*not a failed write/i.test(prompt);
  const stored = card.body.split("\n");
  const failed = sent.split("\n").filter((line, i) => {
    const back = stored[i] ?? "";
    const tolerated =
      back === line ||
      back === bulletsAndUrls(line) ||
      (line === marker && markerTolerated) ||
      (idLinksTolerated(instructions) && back === linearSave(line));
    return !tolerated;
  });
  const op = { op: "card", result: "written", reference: card.id, link: `https://linear.app/ca77y/issue/${card.id}` };
  return failed.length === 0
    ? { done: true, unmet: [], operations: [op], hookRejection: "" }
    : {
        done: false,
        unmet: [`card ${card.id}: read back differs from what was written: ${failed.join(" | ")}`],
        operations: [op],
        hookRejection: "",
      };
};

const VIEW = { judgement: "proceed", reasons: [], risks: [], conditions: [] };
const PASS = { verdict: "pass", evaluated: "x", findings: [], limits: "none" };
const AGENTS: Record<string, Script> = {
  "library-reader": () => ({ summary: "s", supported: [], gaps: [] }),
  "writer-card": () => ({ openQuestions: [] }),
  judge: () => ({ problems: [] }),
  pusher,
  // Returns every stored card, with its body as stored.
  "scout-related-cards": () => ({
    answer: board.length > 0 ? `Cards on the board: ${board.map((c) => c.id).join(", ")}` : "No related card.",
    evidence: board.map((c) => ({ source: "card", location: c.id, excerpt: c.body })),
    gaps: [],
  }),
  // advisor-fit's rule: a card that already holds this same outcome is the duplicate.
  "advisor-fit": () => {
    const held = board.find((c) => holdsIdea(c, state.idea));
    return { ...VIEW, ...(held && { duplicateOf: held.id }) };
  },
  "advisor-simplify": (_t, label) => (label === "simplify the draft" ? PASS : VIEW),
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

async function run(idea: string): Promise<{ status: string; card?: string; report?: string }> {
  calls.length = 0;
  state.idea = idea;
  current.script = script;
  Object.assign(globalThis, { args: idea });
  return shape();
}

const IDEA = "Split out of SMR-317: which of the owner's sessions reach Garmin, Intervals.icu and Strava";

beforeEach(() => {
  board.length = 0;
  state.nextId = 371;
});

describe("shape against a board that rewrites card text on save", () => {
  test("an idea with no identifier is filed and reported as filed", async () => {
    const r = await run("Which of the owner's sessions reach Garmin, Intervals.icu and Strava");
    assert.equal(board.length, 1);
    assert.equal(r.status, "done");
  });

  test("an idea holding a card identifier is filed in full and reported as filed, not blocked", async () => {
    const r = await run(IDEA);
    assert.equal(board.length, 1, "shape filed one card");
    const filed = board[0];
    assert.ok(filed && holdsIdea(filed, IDEA), "the card holds everything shape wrote");
    assert.notEqual(r.status, "blocked", `shape reported ${filed.id}, a complete card, as blocked`);
    assert.equal(r.status, "done");
    assert.equal(r.card, filed.id);
  });

  test("a rerun on the same idea finds the card the first run filed and updates it, without the user naming it", async () => {
    await run(IDEA);
    const first = board[0];
    assert.ok(first, "the first run filed a card");
    const r = await run(IDEA);
    assert.equal(board.length, 1, `the rerun filed another card: ${board.map((c) => c.id).join(", ")}`);
    assert.equal(r.status, "done", `the rerun ended ${r.status}: ${r.report ?? ""}`);
    assert.equal(r.card, first.id);
    assert.equal(first.writes, 2, "the rerun updated the card the first run filed");
  });
});
