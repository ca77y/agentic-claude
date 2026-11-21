// SMR-380: shape's split mode, run with scripted agents against the fake Linear board, which records each card's
// relations from the pusher brief. Each agent tells a part by its outcome, which only that part's card idea holds.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import shape, { meta } from "../src/slopify/workflows/shape.ts";
import { MAX_CARDS, REQUIRED_PARTS, type Plan } from "../src/slopify/lib/split.ts";
import { slugged } from "../src/slopify/lib/family.ts";
import { calls, current, installAgents, type Reply, type Script } from "./harness.ts";
import { board, clearBoard, linearPusher, relatedCardsScout } from "./linear-board.ts";

installAgents();

interface Result {
  status: string;
  next?: string;
  cards?: { part: string; card: string; deliverable: boolean; openQuestions: string[] }[];
  covered?: { part: string; card: string }[];
  leftOut?: { part: string; reason: string }[];
  report: string;
  completed?: string[];
}

const REQUEST = "Build the shop: let people buy what we sell online.";
const OUTCOMES: Record<string, string> = {
  catalog: "Customers browse every product with its price",
  cart: "Customers keep chosen products until they pay",
  checkout: "Customers pay for their chosen products",
  reviews: "Customers rate a product they bought",
  a: "Owners sign in with their account",
  b: "Owners see their own orders after signing in",
};
const part = (key: string, dependsOn: string[] = []) => ({
  key,
  outcome: OUTCOMES[key] ?? `Outcome of ${key}`,
  dependsOn,
});
const planOf = (parts: Plan["parts"], over: Partial<Plan> = {}): Plan => ({
  constraints: [],
  statedCap: 0,
  parts,
  omitted: [],
  ...over,
});

const VIEW = { judgement: "proceed", reasons: [], risks: [], conditions: [] };
const PASS = { verdict: "pass", evaluated: "x", findings: [], limits: "none" };
const FULL = REQUIRED_PARTS.map((name) => ({ name, words: 12 }));

// The card idea a brief fences, which names the part; the whole brief when it fences none.
const ideaOf = (prompt: string): string => /<<<IDEA\n([\s\S]*?)\nIDEA>>>/.exec(prompt)?.[1] ?? prompt;
const isPart = (key: string, prompt: string): boolean => ideaOf(prompt).includes(OUTCOMES[key] ?? `Outcome of ${key}`);

interface World {
  plan: Plan;
  /** advisor-fit's reply for a part, by key. */
  fit: Record<string, { duplicateOf?: string; overlaps?: string[] }>;
  /** writer-card's reply, by the dispatch's label and brief. */
  writer: (label: string, prompt: string) => Reply;
  /** The scout reports a card's location as its URL rather than its bare identifier. */
  urls: boolean;
  pusher: Script;
}
const world: World = {
  plan: planOf([]),
  fit: {},
  writer: () => ({ openQuestions: [], parts: FULL }),
  urls: false,
  pusher: linearPusher(() => "A split card."),
};

const where = (id: string): string => (world.urls ? `https://linear.app/ca77y/issue/${id}/card` : id);
const AGENTS: Record<string, Script> = {
  "writer-split": () => world.plan,
  "library-reader": () => ({ summary: "s", supported: [], gaps: [] }),
  "writer-card": (_t, label, prompt) => world.writer(label, prompt),
  judge: () => ({ problems: [] }),
  pusher: (t, l, p) => world.pusher(t, l, p),
  "advisor-simplify": (_t, label) => (label === "simplify the draft" ? PASS : VIEW),
  "advisor-fit": (_t, _l, prompt) => {
    const key = Object.keys(world.fit).find((k) => isPart(k, prompt));
    return { ...VIEW, duplicateOf: "", ...(key && world.fit[key]) };
  },
  "scout-related-cards": relatedCardsScout(where),
};
const script: Script = (type, label, prompt) =>
  AGENTS[type]?.(type, label, prompt) ??
  (type.startsWith("scout-")
    ? { answer: "a", evidence: [], gaps: [] }
    : type.startsWith("advisor-")
      ? VIEW
      : type.startsWith("lens-")
        ? PASS
        : null);

async function run(args: unknown): Promise<Result> {
  calls.length = 0;
  current.script = script;
  Object.assign(globalThis, { args });
  return shape() as Promise<Result>;
}
const split = (over: Record<string, unknown> = {}): Promise<Result> => run({ idea: REQUEST, split: true, ...over });

const count = (type: string): number => calls.filter((c) => c.type === type).length;
const cartDrafts = (): number => calls.filter((c) => c.type === "writer-card" && isPart("cart", c.prompt)).length;
const cardOf = (r: Result, key: string): string => r.cards?.find((c) => c.part === key)?.card ?? "";
const reportLine = (r: Result, ...words: string[]): boolean =>
  r.report.split("\n").some((line) => words.every((w) => line.includes(w)));

beforeEach(() => {
  clearBoard();
  world.plan = planOf([]);
  world.fit = {};
  world.writer = () => ({ openQuestions: [], parts: FULL });
  world.urls = false;
  world.pusher = linearPusher(() => "A split card.");
});

const REFUSED = [
  ["a card", { card: "SMR-7" }],
  ["a bug kind", { kind: "bug" }],
  ["no request", { idea: "" }],
  ["a cap of 0", { cap: 0 }],
  ["a negative cap", { cap: -1 }],
  ["a fractional cap", { cap: 1.5 }],
  ["a cap that is not a number", { cap: "two" }],
] as const;

describe("shape's split mode refuses what it can't run, before any dispatch", () => {
  for (const [name, over] of REFUSED) {
    test(`a split with ${name} is not-started with no dispatch`, async () => {
      world.plan = planOf([part("catalog")]);
      const r = await split(over);
      assert.equal(r.status, "not-started");
      assert.ok(r.next, "the result says what to fix");
      assert.equal(calls.length, 0);
    });
  }
});

describe("the cap (c1)", () => {
  test("with no cap arg, a request stating a cap of 2 with four parts dispatches exactly 2 card creates and names the other 2 as over the cap of 2", async () => {
    world.plan = planOf([part("catalog"), part("cart"), part("checkout"), part("reviews")], { statedCap: 2 });
    const r = await split();
    assert.equal(r.status, "done", r.report);
    assert.equal(count("pusher"), 2);
    assert.equal(board.length, 2);
    assert.deepEqual(
      r.cards?.map((c) => c.part),
      ["catalog", "cart"],
    );
    assert.deepEqual(
      r.leftOut?.map((l) => l.part),
      ["checkout", "reviews"],
    );
    const overCap = r.leftOut ?? [];
    for (const l of overCap) assert.match(l.reason, /cap\D*2\b/, l.reason);
    assert.ok(reportLine(r, "checkout") && reportLine(r, "reviews"), r.report);
  });

  test("a cap arg of N with N+2 uncovered parts dispatches exactly N creates and names 2 over the cap", async () => {
    world.plan = planOf(["catalog", "cart", "checkout", "reviews", "a"].map((k) => part(k)));
    const r = await split({ cap: 3 });
    assert.equal(count("pusher"), 3);
    assert.equal(r.cards?.length, 3);
    assert.deepEqual(
      r.leftOut?.map((l) => l.part),
      ["reviews", "a"],
    );
    const overCap = r.leftOut ?? [];
    for (const l of overCap) assert.match(l.reason, /cap\D*3\b/, l.reason);
  });

  test("a cap given as a numeric string counts as that cap, and wins over the stated one", async () => {
    world.plan = planOf(
      ["catalog", "cart", "checkout"].map((k) => part(k)),
      { statedCap: 3 },
    );
    const r = await split({ cap: "1" });
    assert.equal(count("pusher"), 1);
    assert.equal(r.leftOut?.length, 2);
  });

  test("a stated cap of 50 with no cap arg files at most 20", async () => {
    world.plan = planOf(
      Array.from({ length: 22 }, (_, i) => part(`part${String(i + 1)}`)),
      { statedCap: 50 },
    );
    const r = await split();
    assert.equal(MAX_CARDS, 20);
    assert.equal(count("pusher"), 20);
    assert.equal(board.length, 20);
    assert.deepEqual(
      r.leftOut?.map((l) => l.part),
      ["part21", "part22"],
    );
  });

  test("a covered part takes no slot under the cap", async () => {
    board.push({ id: "SMR-50", body: "Hand-filed card.", writes: 1 });
    world.plan = planOf([part("catalog"), part("cart"), part("checkout"), part("reviews")]);
    world.fit = { cart: { duplicateOf: "SMR-50" } };
    const r = await split({ cap: 2 });
    assert.equal(count("pusher"), 2);
    assert.deepEqual(
      r.cards?.map((c) => c.part),
      ["catalog", "checkout"],
    );
    assert.deepEqual(r.covered, [{ part: "cart", card: "SMR-50" }]);
    assert.deepEqual(
      r.leftOut?.map((l) => l.part),
      ["reviews"],
    );
  });
});

describe("every filed card has the story template's required parts (c2)", () => {
  test("a part whose draft still lacks Out of scope after the revisions is not filed, and the report names the missing part", async () => {
    world.plan = planOf([part("catalog"), part("cart")]);
    world.writer = (_label, prompt) => ({
      openQuestions: [],
      parts: isPart("cart", prompt) ? FULL.filter((p) => p.name !== "Out of scope") : FULL,
    });
    const r = await split();
    assert.equal(r.status, "done", r.report);
    assert.equal(count("pusher"), 1);
    assert.deepEqual(
      r.cards?.map((c) => c.part),
      ["catalog"],
    );
    const cart = r.leftOut?.find((l) => l.part === "cart");
    assert.ok(cart, `cart is not left out: ${JSON.stringify(r.leftOut)}`);
    assert.match(cart.reason, /Out of scope/);
    assert.ok(reportLine(r, "cart", "Out of scope"), r.report);
    assert.ok(cartDrafts() > 1, "the missing part kept the revisions going");
  });

  test("a part reported with 0 words is missing, so its card is not filed", async () => {
    world.plan = planOf([part("catalog")]);
    world.writer = () => ({ openQuestions: [], parts: FULL.map((p) => (p.name === "Why" ? { ...p, words: 0 } : p)) });
    const r = await split();
    assert.equal(count("pusher"), 0);
    assert.match(r.leftOut?.find((l) => l.part === "catalog")?.reason ?? "", /Why/);
  });

  test("a part the first draft lacks keeps the revisions going, and a revision that adds it gets the card filed", async () => {
    world.plan = planOf([part("catalog")]);
    world.writer = (label) => ({
      openQuestions: [],
      parts: label.includes("revise") ? FULL : FULL.filter((p) => p.name !== "Out of scope"),
    });
    const r = await split();
    assert.deepEqual(
      r.cards?.map((c) => c.part),
      ["catalog"],
    );
    assert.equal(count("pusher"), 1);
  });

  test("a filed card with no open question is Deliverable, and one with open questions is not", async () => {
    world.plan = planOf([part("catalog"), part("cart")]);
    world.writer = (_label, prompt) => ({
      openQuestions: isPart("cart", prompt) ? ["which currency?"] : [],
      parts: FULL,
    });
    const r = await split();
    assert.deepEqual(
      r.cards?.map((c) => [c.part, c.deliverable]),
      [
        ["catalog", true],
        ["cart", false],
      ],
    );
    assert.ok(reportLine(r, "cart", "which currency?"), r.report);
  });
});

describe("relations between the cards (c3)", () => {
  test("part b depends on part a, so b's card on the board is blocked by a's card", async () => {
    world.plan = planOf([part("b", ["a"]), part("a")]);
    const r = await split();
    assert.equal(r.status, "done", r.report);
    const a = board.find((c) => c.id === cardOf(r, "a"));
    const b = board.find((c) => c.id === cardOf(r, "b"));
    assert.ok(a && b, `both cards are filed: ${JSON.stringify(r.cards)}`);
    assert.ok(board.indexOf(a) < board.indexOf(b), "a's card is filed before b's");
    assert.deepEqual(b.blockedBy, [a.id]);
    assert.deepEqual(a.blockedBy ?? [], []);
  });

  test("a dependent in a later wave than its dependency is blocked by the dependency's card", async () => {
    world.plan = planOf([part("a"), part("catalog"), part("cart"), part("checkout"), part("b", ["a"])]);
    const r = await split();
    assert.equal(r.status, "done", r.report);
    const b = board.find((c) => c.id === cardOf(r, "b"));
    assert.ok(b, `b's card is filed: ${JSON.stringify(r.cards)}`);
    assert.deepEqual(b.blockedBy, [cardOf(r, "a")]);
  });

  test("a dependency inside the cap is filed and its dependent over the cap is left out", async () => {
    world.plan = planOf([part("b", ["a"]), part("a")]);
    const r = await split({ cap: 1 });
    assert.equal(count("pusher"), 1);
    assert.deepEqual(
      r.cards?.map((c) => c.part),
      ["a"],
    );
    assert.match(r.leftOut?.find((l) => l.part === "b")?.reason ?? "", /cap\D*1\b/);
  });

  test("a dependency still missing a required part is left out, and its dependent is filed blocked by no card", async () => {
    world.plan = planOf([part("a"), part("b", ["a"])]);
    world.writer = (_label, prompt) => ({
      openQuestions: [],
      parts: isPart("a", prompt) ? FULL.filter((p) => p.name !== "Out of scope") : FULL,
    });
    const r = await split();
    assert.equal(r.status, "done", r.report);
    assert.match(r.leftOut?.find((l) => l.part === "a")?.reason ?? "", /Out of scope/);
    const b = board.find((c) => c.id === cardOf(r, "b"));
    assert.ok(b, `b's card is filed: ${JSON.stringify(r.cards)}`);
    assert.deepEqual(b.blockedBy ?? [], []);
    assert.equal(board.length, 1);
  });

  test("a checked overlap becomes a related card, and one the scout never reported is dropped", async () => {
    board.push({ id: "SMR-50", body: "Hand-filed card.", writes: 1 });
    world.plan = planOf([part("catalog")]);
    world.fit = { catalog: { overlaps: ["SMR-50", "SMR-999"] } };
    const r = await split();
    const filed = board.find((c) => c.id === cardOf(r, "catalog"));
    assert.ok(filed, `catalog's card is filed: ${JSON.stringify(r.cards)}`);
    assert.deepEqual(filed.relatedTo, ["SMR-50"]);
  });
});

describe("whole-set constraints (c4)", () => {
  test("every part's writer-card brief carries every whole-set constraint the planner returned", async () => {
    const constraints = [
      "Sign-in is the single Clerk auth shared with Coachtopus.",
      "Everything ships in the single existing deployment.",
      "The shop lives on its own separate path.",
    ];
    world.plan = planOf([part("catalog"), part("cart"), part("checkout")], { constraints });
    await split();
    const keys = ["catalog", "cart", "checkout"];
    for (const key of keys) {
      const briefs = calls.filter((c) => c.type === "writer-card" && isPart(key, c.prompt));
      assert.ok(briefs.length > 0, `no writer-card brief for ${key}`);
      for (const b of briefs)
        for (const c of constraints) assert.ok(b.prompt.includes(c), `${key}'s brief lacks: ${c}`);
    }
  });
});

describe("the report names every part that gets no card (c5)", () => {
  test("a part the planner leaves out is named in the report with its reason", async () => {
    world.plan = planOf([part("catalog")], {
      omitted: [{ part: "Native mobile app", reason: "the request asks for the web shop only" }],
    });
    const r = await split();
    assert.ok(reportLine(r, "Native mobile app", "the request asks for the web shop only"), r.report);
    assert.ok(r.leftOut?.some((l) => l.reason.includes("the request asks for the web shop only")));
  });
});

describe("a part a board card already covers (c6, c7)", () => {
  test("a rerun on the same request files no card, finding each part's card by its hidden line", async () => {
    world.plan = planOf([part("catalog"), part("cart", ["catalog"])]);
    const first = await split();
    assert.equal(first.cards?.length, 2, first.report);
    const r = await split();
    assert.equal(board.length, 2, `the rerun filed another card: ${board.map((c) => c.id).join(", ")}`);
    assert.equal(count("pusher") + count("writer-card"), 0);
    assert.deepEqual(
      r.covered,
      ["catalog", "cart"].map((key) => ({ part: key, card: cardOf(first, key) })),
    );
  });

  test("a part an existing card covers is reported as already covered by that card", async () => {
    board.push({ id: "SMR-50", body: "Hand-filed card.", writes: 1 });
    world.plan = planOf([part("catalog"), part("cart")]);
    world.fit = { cart: { duplicateOf: "SMR-50" } };
    const r = await split();
    assert.deepEqual(r.covered, [{ part: "cart", card: "SMR-50" }]);
    assert.ok(reportLine(r, "cart", "SMR-50"), r.report);
    assert.equal(cartDrafts(), 0);
    assert.equal(count("pusher"), 1);
    assert.deepEqual(
      r.cards?.map((c) => c.part),
      ["catalog"],
    );
  });

  test("a duplicate the scout reports inside a card URL still covers the part", async () => {
    board.push({ id: "SMR-50", body: "Hand-filed card.", writes: 1 });
    world.urls = true;
    world.plan = planOf([part("catalog"), part("cart")]);
    world.fit = { cart: { duplicateOf: "SMR-50" } };
    const r = await split();
    assert.deepEqual(r.covered, [{ part: "cart", card: "SMR-50" }]);
    assert.equal(count("pusher"), 1);
  });

  test("a duplicate the scout never reported covers nothing, so the part gets its card", async () => {
    world.plan = planOf([part("catalog")]);
    world.fit = { catalog: { duplicateOf: "SMR-999" } };
    const r = await split();
    assert.deepEqual(r.covered ?? [], []);
    assert.deepEqual(
      r.cards?.map((c) => c.part),
      ["catalog"],
    );
  });

  test("two requests sharing a part key each file their card", async () => {
    world.plan = planOf([part("catalog")]);
    const shop = await split();
    const blog = await run({ idea: "Build the blog: let people read what we write.", split: true });
    assert.equal(board.length, 2);
    assert.equal(shop.cards?.length, 1);
    assert.equal(blog.cards?.length, 1, blog.report);
    assert.deepEqual(blog.covered ?? [], []);
  });
});

// The second create reports a relation with no Create binding, and so creates nothing.
const unmetOnSecond = (): Script => {
  const real = linearPusher(() => "A split card.");
  let creates = 0;
  return (t, l, p) => {
    creates += 1;
    return creates === 2 ? { done: false, unmet: ["blockedBy has no Create binding"], operations: [] } : real(t, l, p);
  };
};

describe("a create that fails", () => {
  test("a pusher unmet on the second card returns Stopped naming the first, and a rerun files only the second", async () => {
    world.plan = planOf([part("catalog"), part("cart")]);
    world.pusher = unmetOnSecond();
    const r = await split();
    assert.equal(r.status, "blocked");
    assert.equal(board.length, 1);
    const first = board[0]?.id ?? "";
    assert.ok(JSON.stringify(r.completed).includes(first), `Stopped does not name ${first}: ${JSON.stringify(r)}`);

    world.pusher = linearPusher(() => "A split card.");
    const rerun = await split();
    assert.equal(rerun.status, "done", rerun.report);
    assert.equal(count("pusher"), 1);
    assert.equal(board.length, 2);
    assert.deepEqual(rerun.covered, [{ part: "catalog", card: first }]);
    assert.deepEqual(
      rerun.cards?.map((c) => c.part),
      ["cart"],
    );
  });

  test("on the rerun, a dependent part's card is blocked by the card an earlier run filed for its dependency", async () => {
    world.plan = planOf([part("a"), part("b", ["a"])]);
    world.pusher = unmetOnSecond();
    await split();
    const a = board[0]?.id ?? "";
    world.pusher = linearPusher(() => "A split card.");
    const rerun = await split();
    const b = board.find((c) => c.id === cardOf(rerun, "b"));
    assert.ok(b, `b's card is filed: ${JSON.stringify(rerun)}`);
    assert.deepEqual(b.blockedBy, [a]);
  });

  test("a create that made its card but reported it unmet is found by its hidden line on the rerun, so no second card is filed", async () => {
    world.plan = planOf([part("catalog"), part("cart")]);
    const real = linearPusher(() => "A split card.");
    let creates = 0;
    world.pusher = (t, l, p) => {
      creates += 1;
      const r = real(t, l, p);
      return creates === 2 ? { ...r, done: false, unmet: ["card read back differs"] } : r;
    };
    const r = await split();
    assert.equal(r.status, "blocked");
    assert.equal(board.length, 2);

    world.pusher = linearPusher(() => "A split card.");
    const rerun = await split();
    assert.equal(count("pusher"), 0);
    assert.equal(board.length, 2);
    assert.deepEqual(
      rerun.covered?.map((c) => c.card),
      board.map((c) => c.id),
    );
  });
});

describe("a halt while drafting", () => {
  test("a writer-card halt on a part in the second wave returns Stopped naming each card the first wave filed, and a rerun files only the rest", async () => {
    const keys = ["catalog", "cart", "checkout", "reviews", "a", "b"];
    world.plan = planOf(keys.map((k) => part(k)));
    world.writer = (_label, prompt) => (isPart("b", prompt) ? null : { openQuestions: [], parts: FULL });
    const r = await split();
    assert.equal(r.status, "blocked", JSON.stringify(r));
    const filed = board.map((c) => c.id);
    assert.equal(filed.length, 4, `the first wave's cards stay on the board: ${filed.join(", ")}`);
    for (const id of filed) assert.ok(JSON.stringify(r.completed).includes(id), `Stopped does not name ${id}`);

    world.writer = () => ({ openQuestions: [], parts: FULL });
    const rerun = await split();
    assert.equal(rerun.status, "done", rerun.report);
    assert.equal(board.length, 6);
    assert.deepEqual(
      rerun.covered?.map((c) => c.card),
      filed,
    );
    assert.deepEqual(
      rerun.cards?.map((c) => c.part),
      ["a", "b"],
    );
  });
});

describe("the hidden line", () => {
  test("a request whose slug starts with a shorter request's slug never shares a hidden line with it when the part ids hold the rest", async () => {
    // "Build the <h>" slugs to build-the-<h>-<h2>, and "Build the" to build-the-<h>, so joining slug and part id with
    // a dash would give both build-the-<h>-<h2>-cart.
    const short = "Build the";
    const long = `${short} ${slugged(short).split("-").at(-1) ?? ""}`;
    world.plan = planOf([part("cart")]);
    await run({ idea: long, split: true });
    world.plan = planOf([part(`${slugged(long).split("-").at(-1) ?? ""}-cart`)]);
    const r = await run({ idea: short, split: true });
    assert.equal(r.cards?.length, 1, r.report);
    assert.deepEqual(r.covered ?? [], []);
    assert.equal(board.length, 2);
  });
});

describe("meta", () => {
  test("documents split and cap, and declares the Plan phase", () => {
    assert.match(meta.whenToUse, /\bsplit\b/);
    assert.match(meta.whenToUse, /\bcap\b/);
    const titles: readonly string[] = meta.phases.map((p) => p.title);
    assert.ok(titles.includes("Plan"));
  });
});
