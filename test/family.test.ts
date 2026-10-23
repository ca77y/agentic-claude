import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  absent,
  answerOf,
  decisionsOf,
  hashOf,
  parseSpec,
  rerunText,
  sameRev,
  shaped,
  slugged,
} from "../src/slopify/lib/family.ts";

describe("absent", () => {
  for (const v of [
    "",
    "  ",
    null,
    undefined,
    "none",
    "None (no findings document exists)",
    "MISSING (test -f found no file)",
    "n/a",
  ]) {
    test(`${JSON.stringify(v)} is absent`, () => {
      assert.equal(absent(v), true);
    });
  }
  for (const v of ["none.txt", "missing/x", "/repo/a"]) {
    test(`${v} is a value`, () => {
      assert.equal(absent(v), false);
    });
  }
  test("whole: a sentence that opens with Missing is a value", () => {
    assert.equal(absent("Missing config files produce an error", true), false);
    assert.equal(absent("none (the card has no criteria)", true), true);
  });
});

describe("shaped", () => {
  test("strips a trailing remark and full stop", () => {
    assert.equal(shaped("path", "/repo/.worktrees/smr-1 (exists)."), "/repo/.worktrees/smr-1");
  });
  test("keeps a directory whose name holds a parenthetical", () => {
    assert.equal(shaped("path", "/Users/j/Dropbox (Personal)/app"), "/Users/j/Dropbox (Personal)/app");
  });
  test("reads only the first line", () => {
    assert.equal(shaped("sha", "abc1234\nremark"), "abc1234");
  });
  test("rejects another shape", () => {
    assert.equal(shaped("sha", "not a sha"), "");
  });
  test("accepts a GitHub-style card id", () => {
    assert.equal(shaped("id", "#123"), "#123");
  });
  test("keeps same-line prose out of a path", { todo: "the path shape accepts any text after a slash" }, () => {
    assert.equal(shaped("path", "/repo/.worktrees/smr-1, clean"), "");
  });
});

describe("sameRev", () => {
  test("a short sha matches its full form", () => {
    assert.equal(sameRev("1a2b3c4d5e6f", "1a2b3c4"), true);
  });
  test("a label must match whole", () => {
    assert.equal(sameRev("1a2b3c4+dig1", "1a2b3c4+dig1"), true);
    assert.equal(sameRev("1a2b3c4#2", "1a2b3c4"), false);
  });
  test("a brief naming no revision accepts any", () => {
    assert.equal(sameRev("", "anything"), true);
  });
});

describe("parseSpec", () => {
  test("reads <path>@<hash> and <path> <hash>", () => {
    assert.deepEqual(parseSpec("/w/docs/specs/x.md@1a2b3c4"), { path: "/w/docs/specs/x.md", hash: "1a2b3c4" });
    assert.deepEqual(parseSpec("docs/specs/x.md 1a2b3c4 (found)"), { path: "docs/specs/x.md", hash: "1a2b3c4" });
  });
  test("rejects a value without a hash", () => {
    assert.equal(parseSpec("/w/docs/specs/x.md"), null);
  });
});

describe("decisions and answers", () => {
  test("an id comes from the question, so rewording changes it", () => {
    const [a] = decisionsOf("spec", ["Should export include headers?"]);
    const [b] = decisionsOf("spec", ["Should the export include headers?"]);
    assert.ok(a?.id.startsWith("spec-should-export-include-headers-"));
    assert.notEqual(a?.id, b?.id);
  });
  test("a repeated question is listed once", () => {
    assert.equal(decisionsOf("x", ["q?", "q?"]).length, 1);
  });
  test("answerOf trims and treats null as unanswered", () => {
    assert.equal(answerOf({ a: "  yes " }, "a"), "yes");
    assert.equal(answerOf({ a: null }, "a"), "");
    assert.equal(answerOf(undefined, "a"), "");
  });
});

describe("names", () => {
  test("hashOf is stable", () => {
    assert.equal(hashOf("abc"), hashOf("abc"));
  });
  test("slugged keeps six words and adds a hash of all of it", () => {
    const a = slugged("Let users export their data as CSV");
    const b = slugged("Let users export their data as JSON");
    assert.ok(a.startsWith("let-users-export-their-data-as-"));
    assert.notEqual(a, b);
    assert.equal(slugged("", "fallback"), "fallback");
  });
});

describe("rerunText", () => {
  test("offers resume only when every need is a decision", () => {
    assert.match(
      rerunText("shape", [{ id: "d", kind: "decision", what: "w", evidence: "" }]),
      /resumeFromRunId to reuse/,
    );
    assert.match(
      rerunText("shape", [{ id: "p", kind: "prerequisite", what: "w", evidence: "" }]),
      /without resumeFromRunId/,
    );
  });
  test("an input need answered in an arg says so", () => {
    assert.match(
      rerunText("deliver-story", [{ id: "locate-1", kind: "input", what: "w", evidence: "", arg: "story" }]),
      /locate-1 in args\.story/,
    );
  });
});
