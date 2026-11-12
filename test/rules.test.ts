import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  allowsReady,
  gate,
  isDeliverable,
  noProgress,
  parseReproduction,
  reproductionLine,
  renderBody,
  routeOf,
  waves,
  type PrBody,
  type Ruled,
} from "../src/slopify/lib/rules.ts";

const ruled = (over: Partial<Ruled>): Ruled => ({
  verdict: "confirmed",
  severity: "major",
  kind: "code",
  ruling: "none",
  ...over,
});

const first = (r: Partial<Ruled>, hasSpec = true) => routeOf(ruled(r), 0, false, hasSpec);
const idsIn = (group: readonly { id: string }[]) => group.map((t) => t.id);
const ids = (groups: readonly { id: string }[][]) => groups.map((g) => idsIn(g));
const task = (id: string, dependsOn: string[] = [], files: string[] = [`${id}.ts`]) => ({ id, dependsOn, files });

const idsOf = (tasks: readonly ReturnType<typeof task>[]) => ids(waves(tasks));

describe("routeOf", () => {
  test("sends each kind where the table says", () => {
    assert.equal(first({ kind: "code" }), "coder");
    assert.equal(first({ kind: "test" }), "correct-test");
    assert.equal(first({ kind: "docs" }), "writer");
    assert.equal(first({ kind: "spec" }), "revise-spec");
  });

  test("treats a spec problem as code when the run has no spec folder", () => {
    assert.equal(first({ kind: "spec" }, false), "coder");
  });

  test("never sends a non-defect to a producer", () => {
    assert.equal(first({ kind: "cannot-verify", severity: "none" }), "not-validated");
    assert.equal(first({ kind: "decision", severity: "none" }), "needs-confirmation");
    assert.equal(first({ verdict: "dismissed" }), "dismiss");
    assert.equal(first({ verdict: "unverified" }), "unverified");
  });

  test("lists what doesn't block instead of fixing it", () => {
    assert.equal(first({ severity: "minor" }), "suggestion");
    assert.equal(first({ severity: "nit" }), "suggestion");
    assert.equal(first({ severity: "pre-existing" }), "new-issue");
  });

  test("closes a recurring major with its ruling", () => {
    assert.equal(routeOf(ruled({ ruling: "accept-as-debt" }), 1, false, true), "known-debt");
    assert.equal(routeOf(ruled({ ruling: "split-to-issue" }), 1, false, true), "split-issue");
    assert.equal(routeOf(ruled({ ruling: "escalate" }), 1, false, true), "escalate");
  });

  test("never lets a ruling close a recurring blocker", () => {
    const blocker = { severity: "blocker" } as const;
    assert.equal(routeOf(ruled({ ...blocker, ruling: "accept-as-debt" }), 1, false, true), "escalate");
    assert.equal(routeOf(ruled({ ...blocker, ruling: "split-to-issue" }), 1, false, true), "escalate");
  });

  test("allows fix-differently once", () => {
    const again = ruled({ ruling: "fix-differently" });
    assert.equal(routeOf(again, 1, false, true), "coder");
    assert.equal(routeOf(again, 2, true, true), "escalate");
  });

  test("ignores a ruling on a problem's first attempt", () => {
    assert.equal(routeOf(ruled({ ruling: "accept-as-debt" }), 0, false, true), "coder");
  });
});

describe("gate", () => {
  const clean = { prOpen: true, reviewClean: true, open: 0, held: 0 };

  test("is clean only with a PR, a clean review, and nothing open or held", () => {
    assert.equal(gate(clean), "clean");
    assert.equal(gate({ ...clean, prOpen: false }), "fix");
    assert.equal(gate({ ...clean, reviewClean: false }), "fix");
    assert.equal(gate({ ...clean, open: 1 }), "fix");
  });

  test("stops at a held criterion, because code can't change it", () => {
    assert.equal(gate({ ...clean, held: 1 }), "held");
  });

  test("keeps fixing when something fixable is open beside a held criterion", () => {
    assert.equal(gate({ ...clean, open: 1, held: 1 }), "fix");
  });
});

describe("noProgress", () => {
  test("needs two rounds in a row without a fall", () => {
    assert.equal(noProgress([3, 3]), false);
    assert.equal(noProgress([3, 3, 3]), true);
    assert.equal(noProgress([3, 2, 2]), false);
    assert.equal(noProgress([2, 3, 4]), true);
    assert.equal(noProgress([5, 3, 3, 3]), true);
  });
});

describe("allowsReady", () => {
  test("accepts only the word ready", () => {
    assert.equal(allowsReady("ready"), true);
    assert.equal(allowsReady(" ready\n"), true);
    assert.equal(allowsReady("draft"), false);
    assert.equal(allowsReady("Ready"), false);
    assert.equal(allowsReady(""), false);
    assert.equal(allowsReady(undefined), false);
  });
});

describe("isDeliverable", () => {
  test("finds the exact label in a list", () => {
    assert.equal(isDeliverable("Feature, Deliverable"), true);
    assert.equal(isDeliverable("Deliverable\nFeature"), true);
    assert.equal(isDeliverable("Feature"), false);
    assert.equal(isDeliverable("Undeliverable"), false);
    assert.equal(isDeliverable(""), false);
  });
});

describe("waves", () => {
  test("runs independent tasks together", () => {
    assert.deepEqual(idsOf([task("a"), task("b")]), [["a", "b"]]);
  });

  test("waits for dependencies", () => {
    assert.deepEqual(idsOf([task("b", ["a"]), task("a")]), [["a"], ["b"]]);
  });

  test("separates tasks whose files overlap", () => {
    const overlapping = [task("a", [], ["src/x.ts"]), task("b", [], ["src/x.ts"]), task("c", [], ["src/y.ts"])];
    assert.deepEqual(idsOf(overlapping), [["a", "c"], ["b"]]);
  });

  test("treats a directory as overlapping the files under it", () => {
    assert.deepEqual(idsOf([task("a", [], ["src"]), task("b", [], ["src/x.ts"])]), [["a"], ["b"]]);
    assert.deepEqual(idsOf([task("a", [], ["src"]), task("b", [], ["srcs/x.ts"])]), [["a", "b"]]);
  });

  test("still finishes on a dependency cycle or an unknown id", () => {
    assert.deepEqual(idsOf([task("a", ["b"]), task("b", ["a"])]), [["a", "b"]]);
    assert.deepEqual(idsOf([task("a", ["missing"])]), [["a"]]);
  });
});

describe("renderBody", () => {
  const body: PrBody = {
    issue: "SMR-1",
    specDir: "docs/specs/smr-1-x",
    draftReasons: [],
    needsConfirmation: [],
    manualActions: [],
    criteria: [],
    assumptions: [],
    unverified: [],
    notValidated: [],
    knownDebt: [],
    suggestions: [],
    testChanges: [],
  };

  test("leaves out empty sections", () => {
    assert.equal(renderBody(body), "Issue: SMR-1\n\nSpec: `docs/specs/smr-1-x`");
  });

  test("puts why it is a draft and what needs confirmation before the criteria", () => {
    const text = renderBody({
      ...body,
      draftReasons: [{ text: "login fails", detail: "tried twice" }],
      needsConfirmation: [{ text: "keep the data?" }],
      criteria: [{ id: "c1", wording: "a | b", category: "UI", path: "flow", result: "pass", evidence: ["x.png"] }],
    });
    assert.ok(text.indexOf("Why this is a draft") < text.indexOf("Needs confirmation"));
    assert.ok(text.indexOf("Needs confirmation") < text.indexOf("## Criteria"));
    assert.ok(text.includes("- login fails\n  tried twice"));
    assert.ok(text.includes(String.raw`a \| b`));
  });

  test("gives unverified findings and unvalidated criteria their own sections", () => {
    const text = renderBody({ ...body, unverified: [{ text: "race?" }], notValidated: [{ text: "no simulator" }] });
    assert.ok(text.includes("## Unverified findings\n\n- race?"));
    assert.ok(text.includes("## Not validated\n\n- no simulator"));
  });
});

describe("the reproduction's ledger line", () => {
  test("reads back what it wrote, with a timestamp in front", () => {
    const r = { steps: ["run add(1, 1)", 'see "0"'], observed: "got 0\nthen stop" };
    assert.deepEqual(parseReproduction(`2026-11-09T10:00:00Z ${reproductionLine(r)}`), r);
  });

  test("reads nothing from a line that isn't one", () => {
    assert.equal(parseReproduction(""), null);
    assert.equal(parseReproduction("reproduced {broken"), null);
    assert.equal(parseReproduction('reproduced {"steps":"x","observed":"y"}'), null);
  });
});
