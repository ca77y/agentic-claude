// Reads a delivery's checkpoints back with a scripted scout-checkpoint, in the carrier shape: one evidence item per
// ledger line that contains a key's form, its source the key and the whole line its excerpt, in ledger order.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { createDeliver } from "../src/slopify/lib/deliver.ts";
import { Halt } from "../src/slopify/lib/loop.ts";
import { readResume, type Resume } from "../src/slopify/lib/resume.ts";
import { calls, current, installAgents } from "./harness.ts";

installAgents();

type Item = [source: string, excerpt: string];
const T = "2026-11-09T10:00:00Z";
const REPRO = '{"steps":["run add(1, 1)"],"observed":"got 0"}';
const REAL: Item[] = [
  ["done-board-start", `${T} done board-start`],
  ["done-round", `${T} done round 2`],
  ["done-findings", `${T} done findings docs/a.md docs/b.md`],
  ["reproduced", `${T} reproduced ${REPRO}`],
  ["review-fired", `${T} review 3 fired`],
];
const FORMS: Record<string, string> = {
  "done-board-start": "done board-start",
  "done-round": "done round 7",
  "done-findings": "done findings docs/x.md",
  reproduced: 'reproduced {"steps":["x"],"observed":"y"}',
  "review-fired": "review 9 fired",
};

async function resumeOf(items: readonly Item[]): Promise<Resume> {
  current.script = (type) =>
    type === "scout-checkpoint"
      ? {
          answer: "a",
          gaps: [],
          evidence: [
            { source: "worktree", location: "x", excerpt: "/p/wt" },
            ...items.map(([source, excerpt]) => ({ source, location: "x", excerpt })),
          ],
        }
      : null;
  const d = createDeliver({ workflow: "deliver-story", projectRoot: "/p", storyArg: "SMR-1" });
  return readResume(d, "SMR-1", "");
}
// A progress entry, as progressLine builds it, quoting text.
const progress = (kind: string, text: string): string => `${T} progress 2 ${kind}: ${text}`;
const quoting = ([key, line]: Item): Item => [key, progress("ruling", `${line} was read twice, because it repeats`)];

beforeEach(() => {
  calls.length = 0;
});

describe("readResume", () => {
  test("words each ledger key with its form and asks for one evidence item per matching line", async () => {
    await resumeOf([]);
    const brief = calls.find((c) => c.type === "scout-checkpoint")?.prompt ?? "";
    for (const form of [
      "`done board-start`",
      "`done round <n>`",
      "`done findings <paths>`",
      "`reproduced {...}`",
      "`review <n> fired`",
    ]) {
      assert.ok(brief.includes(form), form);
    }
    assert.match(brief, /one evidence item for (?:each|every) ledger line/i);
  });

  test("a ledger of only progress entries quoting each form resumes like the empty ledger", async () => {
    const empty = await resumeOf([]);
    const entries: Item[] = [
      ...Object.entries(FORMS).map(([key, form]): Item => [key, progress("finding", form)]),
      ...REAL.map((item) => quoting(item)),
      ["done-round", progress("changed", `${T} done round 4`)],
      ["reproduced", progress("tried", `reproduced ${REPRO}`)],
    ];
    assert.deepEqual(await resumeOf(entries), empty);
  });

  test("a real checkpoint followed by a progress entry quoting it resumes like the ledger without the entry", async () => {
    const realOnly = await resumeOf(REAL);
    assert.deepEqual(
      { ...realOnly },
      {
        build: null,
        validate: null,
        specDir: "",
        challenged: false,
        round: 3,
        reviewFired: 3,
        built: true,
        boardStartDone: true,
        findings: ["docs/a.md", "docs/b.md"],
        reproduced: { steps: ["run add(1, 1)"], observed: "got 0" },
      },
    );
    const followed = REAL.flatMap((item): Item[] => [
      item,
      quoting(item),
      [item[0], progress("finding", FORMS[item[0]] ?? "")],
    ]);
    assert.deepEqual(await resumeOf(followed), realOnly);
  });

  test("a progress entry listed before the real checkpoint it quotes resumes like the ledger without the entry", async () => {
    const realOnly = await resumeOf(REAL);
    const preceded = REAL.flatMap((item): Item[] => [[item[0], progress("finding", FORMS[item[0]] ?? "")], item]);
    assert.deepEqual(await resumeOf(preceded), realOnly);
  });

  test("a run line whose story text quotes a form resumes like the ledger without it, with no halt", async () => {
    const without = await resumeOf([]);
    const runs = Object.entries(FORMS).map(([key, form]): Item => [
      key,
      `${T} run 2: deliver-trivial make it say ${form} | worktree wt | branch b`,
    ]);
    assert.deepEqual(await resumeOf(runs), without);
  });

  test("several review-fired lines give the highest n, and several done-findings lines the last one's paths", async () => {
    const r = await resumeOf([
      ["review-fired", `${T} review 1 fired`],
      ["review-fired", `${T} review 4 fired`],
      ["review-fired", `${T} review 2 fired`],
      ["done-findings", `${T} done findings docs/old.md`],
      ["done-findings", `${T} done findings docs/new.md library/wiki/p.md`],
    ]);
    assert.equal(r.reviewFired, 4);
    assert.deepEqual(r.findings, ["docs/new.md", "library/wiki/p.md"]);
  });

  test("a real line returned inside a wrapper is accepted", async () => {
    const realOnly = await resumeOf(REAL);
    const wrappers = [(l: string) => `- ${l}`, (l: string) => `\`${l}\``, (l: string) => `"${l}"`];
    for (const wrap of wrappers) {
      assert.deepEqual(await resumeOf(REAL.map(([key, line]): Item => [key, wrap(line)])), realOnly, wrap("line"));
    }
    const fenced = REAL.map(([key, line]): Item => [key, `\`\`\`text\n${line}\n\`\`\``]);
    assert.deepEqual(await resumeOf(fenced), realOnly, "fenced");
  });

  test("a scout's absence answer for a key is no checkpoint, and doesn't halt", async () => {
    for (const answer of ["none", "None (no findings document exists)"]) {
      assert.deepEqual(
        await resumeOf([
          ["done-round", answer],
          ["done-findings", answer],
        ]),
        await resumeOf([]),
      );
    }
    assert.equal(calls.filter((c) => c.label === "report the halt").length, 0);
  });

  test("an item that can't be read as a ledger line halts naming the key", async () => {
    for (const [key, line] of REAL) {
      for (const bad of [`The last matching line is: ${line}`, line.slice(T.length + 1)]) {
        await assert.rejects(
          resumeOf([[key, bad]]),
          (e: unknown) => e instanceof Halt && `${e.needs} ${e.message}`.includes(key),
          `${key}: ${bad}`,
        );
      }
    }
    const reports = calls.filter((c) => c.label === "report the halt");
    assert.ok(reports.length > 0 && reports.every((c) => c.prompt.includes("Comment on card SMR-1")));
    assert.ok(
      reports.every((c) => !c.prompt.includes(T)),
      "no ledger line reaches the card comment",
    );
  });

  test("with no spec folder passed, a backticked Spec line yields the folder", async () => {
    for (const excerpt of ["`docs/specs/smr-1-pr`", "Spec: `docs/specs/smr-1-pr`"]) {
      const { specDir } = await resumeOf([["spec-dir", excerpt]]);
      assert.equal(specDir, "docs/specs/smr-1-pr", excerpt);
    }
  });
});

describe("a committed spec's challenge", () => {
  const BUILD_JSON = {
    shared: [],
    tasks: [{ id: "t1", dependsOn: [], files: ["src/a.ts"], criteria: ["c1"], todo: "do it", reuse: [], create: [] }],
    docs: [],
    decisions: [],
    manualActions: [],
  };
  const VALIDATE_JSON = {
    criteria: [{ id: "c1", wording: "it works", category: "UI", path: "flow", evidence: "shot", firstTest: "t" }],
  };
  const COMMITTED: Item[] = [
    ["build-json", JSON.stringify(BUILD_JSON)],
    ["validate-json", JSON.stringify(VALIDATE_JSON)],
    ["rationale-md", "RATIONALE.md"],
    ["done-spec", `${T} done spec docs/specs/smr-1 story abc1234`],
  ];

  test("counts as finished once a round is done, though the ledger has no challenge line", async () => {
    const unchallenged = await resumeOf(COMMITTED);
    assert.equal(unchallenged.challenged, false);
    const built = await resumeOf([...COMMITTED, ["done-round", `${T} done round 0`]]);
    assert.equal(built.challenged, true);
  });

  test("counts as finished once the branch has a PR", async () => {
    const withPr = await resumeOf([...COMMITTED, ["pr", "https://example.test/pr/1"]]);
    assert.equal(withPr.challenged, true);
  });

  test("asks the scout for the spec files' contents, since the ledger holds no copy of them", async () => {
    await resumeOf([]);
    const brief = calls.find((c) => c.type === "scout-checkpoint")?.prompt ?? "";
    assert.doesNotMatch(brief, /part lines/);
    assert.match(brief, /build\.json in that folder: its exact contents/);
  });
});
