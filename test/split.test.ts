import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import {
  capArgOf,
  capOf,
  checkedId,
  missingParts,
  orderParts,
  partsOf,
  PLAN_SCHEMA,
  REQUIRED_PARTS,
  selectParts,
  splitReport,
  type Part,
} from "../src/slopify/lib/split.ts";

const part = (id: string, dependsOn: string[] = []): Part => ({ id, key: id, outcome: `do ${id}`, dependsOn });
const ids = (parts: readonly Part[]): string[] => parts.map((p) => p.id);
const URL_LOCATION = "https://linear.app/team/issue/SMR-12/log-in";

describe("capArgOf", () => {
  const cases: [unknown, number | null | "invalid"][] = [
    [undefined, null],
    [3, 3],
    ["4", 4],
    [0, "invalid"],
    [-2, "invalid"],
    [1.5, "invalid"],
    ["1.5", "invalid"],
    ["abc", "invalid"],
    ["0", "invalid"],
  ];
  for (const [arg, want] of cases) {
    test(`${typeof arg} ${String(arg)} gives ${String(want)}`, () => {
      assert.equal(capArgOf(arg), want);
    });
  }
});

describe("PLAN_SCHEMA", () => {
  test("requires every field and asks for every part, uncapped", () => {
    assert.deepEqual(PLAN_SCHEMA.required, ["constraints", "statedCap", "parts", "omitted"]);
    assert.match(PLAN_SCHEMA.properties.parts.description, /every part.*uncapped/i);
  });
});

describe("capOf", () => {
  const cases: [string, number | null, number, number][] = [
    ["a stated cap above 20 is held to 20", null, 30, 20],
    ["a stated cap below 20 is the cap", null, 3, 3],
    ["no stated cap is 20", null, 0, 20],
    ["an arg cap wins, even above 20", 25, 3, 25],
  ];
  for (const [name, argCap, statedCap, want] of cases) {
    test(name, () => {
      assert.equal(capOf(argCap, statedCap), want);
    });
  }
});

describe("orderParts", () => {
  test("puts a dependency first", () => {
    const ordered = ids(orderParts([part("a", ["b"]), part("b"), part("c")]));
    assert.equal(ordered.length, 3);
    assert.ok(ordered.indexOf("b") < ordered.indexOf("a"), ordered.join(", "));
  });
  test("a cycle falls back to plan order", () => {
    const ordered = orderParts([part("a", ["b"]), part("b", ["a"])]);
    assert.deepEqual(ids(ordered), ["a", "b"]);
  });
});

describe("partsOf", () => {
  const parts = partsOf({
    constraints: [],
    statedCap: 0,
    omitted: [],
    parts: [
      { key: "Log in", outcome: "log in", dependsOn: ["ghost", "Sign up"] },
      { key: "Sign up", outcome: "sign up", dependsOn: [] },
      { key: "Log in", outcome: "log in again", dependsOn: [] },
    ],
  });
  test("keeps every part", () => {
    assert.equal(parts.length, 3);
  });
  test("drops a dependsOn key naming no part and maps the rest to ids", () => {
    assert.deepEqual(parts[0]?.dependsOn, [parts[1]?.id]);
  });
  test("gives two same-key parts distinct ids, safe in a path and a hidden line", () => {
    assert.equal(new Set(ids(parts)).size, 3);
    for (const p of parts) assert.match(p.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});

describe("selectParts", () => {
  test("takes at most cap uncovered parts in order; covered parts take no slot", () => {
    const ordered = ["p1", "p2", "p3", "p4", "p5"].map((id) => part(id));
    const { selected, overCap } = selectParts(ordered, new Set(["p1"]), 2);
    assert.deepEqual(ids(selected), ["p2", "p3"]);
    assert.deepEqual(ids(overCap), ["p4", "p5"]);
  });
});

describe("REQUIRED_PARTS", () => {
  test("equals the required story parts in card-templates.md", () => {
    const text = readFileSync(new URL("../plugins/slopify/references/card-templates.md", import.meta.url), "utf8");
    const story = text.slice(text.indexOf("## Story"), text.indexOf("## Bug"));
    const required = story
      .split("\n")
      .filter((line) => line.startsWith("- **") && !line.includes("**, when"))
      .map((line) => line.slice(4, line.indexOf("**", 4)));
    assert.ok(required.length > 0);
    assert.deepEqual([...REQUIRED_PARTS], required);
  });
});

describe("missingParts", () => {
  test("flags a required part that is absent or empty", () => {
    const reported = REQUIRED_PARTS.filter((name) => name !== "Out of scope").map((name) => ({
      name,
      words: name === "Why" ? 0 : 12,
    }));
    assert.deepEqual(new Set(missingParts(reported)), new Set(["Out of scope", "Why"]));
  });
  test("matches a part's name whatever its case or surrounding spaces", () => {
    const reported = REQUIRED_PARTS.map((name) => ({ name: ` ${name.toUpperCase()} `, words: 12 }));
    assert.deepEqual(missingParts(reported), []);
  });
});

describe("checkedId", () => {
  test("accepts a bare location, trimmed", () => {
    assert.equal(checkedId(" SMR-12 ", ["SMR-12"]), "SMR-12");
  });
  test("accepts a whole token inside a URL", () => {
    assert.equal(checkedId("SMR-12", [URL_LOCATION]), "SMR-12");
  });
  test("rejects an id absent from the locations", () => {
    assert.equal(checkedId("SMR-99", ["SMR-12"]), "");
  });
  test("rejects an id that is only part of a longer token", () => {
    assert.equal(checkedId("SMR-1", [URL_LOCATION]), "");
  });
});

describe("splitReport", () => {
  const report = splitReport({
    cards: [{ part: "sign-up", card: "SMR-70", deliverable: true, openQuestions: [] }],
    covered: [{ part: "log-in", card: "SMR-12" }],
    leftOut: [
      { part: "billing", reason: "the request rules out payments" },
      { part: "audit", reason: "over the cap of 2" },
      { part: "export", reason: "still missing Out of scope after the revisions" },
    ],
  });
  test("names every part once", () => {
    for (const p of ["sign-up", "log-in", "billing", "audit", "export"]) {
      assert.equal(report.split(p).length - 1, 1, `${p} in:\n${report}`);
    }
  });
  test("names a filed card and a covered part's card", () => {
    assert.match(report, /sign-up[^\n]*SMR-70/);
    assert.match(report, /log-in[^\n]*SMR-12/);
  });
  test("names each left-out part's reason", () => {
    assert.match(report, /billing[^\n]*the request rules out payments/);
    assert.match(report, /audit[^\n]*over the cap of 2/);
    assert.match(report, /export[^\n]*Out of scope/);
  });
});
