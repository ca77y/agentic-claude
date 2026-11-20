import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";

// Reads the shipped plugin text the agents work from. A missing file reads as empty, so its absence fails an assertion.
const root = new URL("../", import.meta.url);
const text = (path: string): string => {
  const url = new URL(path, root);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
};
const sentences = (md: string): string[] => md.split(/(?<=[.!?])\s+|\n\s*\n/);
const saysLocal = (doc: string): boolean =>
  sentences(doc).some((s) => /progress entr/i.test(s) && /\blocal\b/i.test(s));

const writerPr = text("plugins/slopify/agents/writer-pr.md");
// A front matter field's value in writer-pr.md, read from the first line that sets it.
const field = (key: string): string => new RegExp(`^${key}: (.+)$`, "m").exec(writerPr)?.[1] ?? "";
const reference = text("plugins/slopify/references/pr-description.md");
const headingsInOrder = /What changes[\s\S]*?Needs you[\s\S]*?Why trust it[\s\S]*?Not done/;

describe("PR description agents", () => {
  test("writer-pr's instructions require the four headings in order, no other heading, at most 4,000 characters, and no process detail", () => {
    assert.equal(field("name"), "writer-pr");
    assert.match(writerPr, /produc(er|tion leaf)/i, "writer-pr is a producer");
    assert.match(writerPr, /pr-description\.md/, "writer-pr names the reference it follows");
    const rules = `${writerPr}\n${reference}`;
    assert.match(rules, headingsInOrder);
    assert.match(rules, /no other heading/i);
    assert.match(rules, /4,000 characters/);
    assert.match(rules, /process detail/i);
    assert.match(rules, /grouped/i, "the overflow rule groups lines");
  });

  test("writer-pr runs on opus, rests Why trust it only on the brief's results, and states an evidence limit once", () => {
    assert.equal(field("model"), "opus");
    assert.ok(
      sentences(writerPr).some((s) => s.includes("Why trust it") && /only from the results the brief gives/i.test(s)),
      "Why trust it rests only on the brief's results",
    );
    assert.ok(
      sentences(writerPr).some((s) => /\blimit\b/i.test(s) && /\bonce\b/i.test(s)),
      "an evidence limit is stated once",
    );
    assert.equal(
      existsSync(new URL("plugins/slopify/agents/lens-pr.md", root)),
      false,
      "no agent reviews the description",
    );
  });

  test("writer-pr's instructions require the Spec: <folder> line", () => {
    assert.match(`${writerPr}\n${reference}`, /Spec: <folder>/);
  });
});

describe("progress entries", () => {
  test("pusher-ledger.md describes progress entries as local", () => {
    const ledger = text("plugins/slopify/references/pusher-ledger.md");
    assert.match(ledger, /^<time> progress /m, "pusher-ledger.md has the progress entry template");
    assert.ok(saysLocal(ledger), "pusher-ledger.md says progress entries stay local");
  });
});

describe("a shortened or misordered progress entry (SMR-404)", () => {
  const ledger = text("plugins/slopify/references/pusher-ledger.md");
  const progressRule = ledger.split("\n").find((l) => l.startsWith("- `progress`")) ?? "";

  test("pusher-ledger.md says an entry ending in '...' was shortened on purpose and is appended as given", () => {
    assert.ok(progressRule, "pusher-ledger.md has the progress rule");
    assert.ok(progressRule.includes("..."), "the progress rule names the '...' ending");
    assert.match(progressRule, /shorten|cut/i, "the progress rule says the workflow shortens an entry on purpose");
  });

  test("pusher-ledger.md says a progress entry's length or order is never unmet", () => {
    const rule = sentences(progressRule);
    assert.ok(
      rule.some((s) => /order/i.test(s) && /unmet|block/i.test(s)),
      "the progress rule says an entry's order never makes the dispatch unmet",
    );
  });
});

describe("a commit with nothing left to commit (SMR-405)", () => {
  const commitRule =
    text("plugins/slopify/references/pusher-forge.md")
      .split("\n")
      .find((l) => l.startsWith("- **Commit.**")) ?? "";

  test("pusher-forge.md has pusher report an already-committed commit in the typed field the delivery loop reads", () => {
    assert.ok(commitRule, "pusher-forge.md has the commit rule");
    assert.match(commitRule, /already committed/i);
    assert.ok(commitRule.includes("`alreadyCommitted`"), "the commit rule has pusher set the typed field");
    assert.ok(text("src/slopify/lib/schemas.ts").includes("alreadyCommitted"), "the pusher schema has the field");
    assert.ok(
      !text("src/slopify/lib/loop.ts").includes("NOTHING_TO_COMMIT"),
      "the delivery loop decides the commit outcome from the pusher's prose",
    );
  });
});

describe("a removal with nothing left to commit (SMR-405)", () => {
  const commitRule =
    text("plugins/slopify/references/pusher-forge.md")
      .split("\n")
      .find((l) => l.startsWith("- **Commit.**")) ?? "";

  test("pusher-forge.md counts a listed path whose deletion is already committed as nothing to commit", () => {
    assert.ok(commitRule, "pusher-forge.md has the commit rule");
    assert.doesNotMatch(
      commitRule,
      /every listed path exists/i,
      "a removal lists paths that no longer exist, so requiring each to exist reports an already-committed deletion as a failure",
    );
    assert.match(
      commitRule,
      /delet/i,
      "the rule says how a listed path whose deletion is already committed is reported",
    );
  });
});

// The Create bullet of a board file's Operations list.
const createLine = (md: string): string => md.split("\n").find((l) => l.startsWith("- Create")) ?? "";

describe("relations on create and the split planner (SMR-380)", () => {
  const board = text("docs/BOARD.md");
  const nothingCreated = /creates? nothing|unmet/i;

  test("docs/BOARD.md's Create line binds blockedBy and relatedTo, and leaves the create-nothing rule to pusher-board.md", () => {
    const create = createLine(board);
    assert.ok(create, "docs/BOARD.md has the Create line");
    assert.ok(create.includes("`blockedBy`"), "the Create line binds a blocking relation");
    assert.ok(create.includes("`relatedTo`"), "the Create line binds a related relation");
    assert.doesNotMatch(create, nothingCreated, "the create-nothing rule is stated once, in pusher-board.md");
  });

  test("bootstrap asks the create binding to say how relations are added or mark them unsupported, and the template's Create line carries it", () => {
    const reference = sentences(text("plugins/slopify/skills/bootstrap/references/board.md"));
    assert.ok(
      reference.some((s) => /create binding/i.test(s) && /block/i.test(s) && /relat/i.test(s)),
      "board.md says the create binding adds a blocking and a related relation",
    );
    assert.ok(
      reference.some((s) => /relation/i.test(s) && /unsupported/i.test(s)),
      "board.md marks relations unsupported when the tracker records none",
    );
    const create = createLine(text("plugins/slopify/skills/bootstrap/resources/BOARD.md"));
    assert.ok(create.includes("{{CREATE_BINDING}}"), "the template keeps its create slot");
    assert.match(create, /relation/i, "the template's Create line carries the relation binding");
  });

  test("pusher-board.md adds relations only as the brief names them and creates nothing when one has no binding", () => {
    const bullets = text("plugins/slopify/references/pusher-board.md")
      .split("\n")
      .filter((l) => l.startsWith("- "));
    const rule = bullets.find((l) => /relation/i.test(l) && /creat\w* nothing/i.test(l)) ?? "";
    assert.ok(rule, "pusher-board.md has a bullet that creates nothing for a relation it can't bind");
    assert.match(rule, /brief names/i, "relations are added only as the brief names them");
    assert.match(rule, /Create binding/, "relations go through the Create binding");
    assert.match(rule, /unmet/i, "a relation with no binding is reported unmet");
  });

  test("writer-split writes no file, changes no board, and never trims its plan to a cap", () => {
    const split = text("plugins/slopify/agents/writer-split.md");
    const said = sentences(split);
    assert.ok(
      said.some((s) => /\bno file\b|\bnever writes? (?:a|any) file/i.test(s)),
      "writer-split writes no file",
    );
    assert.ok(
      said.some((s) => /\bboard\b/i.test(s) && /\bno\b|\bnever\b/i.test(s)),
      "writer-split changes no board",
    );
    assert.ok(
      said.some((s) => /\bcap\b/i.test(s) && /\btrim/i.test(s) && /\bnever\b|\bnot\b/i.test(s)),
      "writer-split never trims its plan to a cap",
    );
  });

  test("scout-related-cards gives each match's location as the bare card identifier", () => {
    const scout = sentences(text("plugins/slopify/agents/scout-related-cards.md"));
    assert.ok(
      scout.some((s) => s.includes("`location`") && /bare card identifier/i.test(s) && /every match/i.test(s)),
      "every match's location is the bare card identifier",
    );
  });
});
