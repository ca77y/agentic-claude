import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";

// Reads the shipped plugin text the agents work from. A missing file reads as empty, so its absence fails an assertion.
const root = new URL("../", import.meta.url);
const text = (path: string): string => {
  const url = new URL(path, root);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
};
// A front matter field's value, read from the first line that sets it.
const field = (md: string, key: string): string => new RegExp(`^${key}: (.+)$`, "m").exec(md)?.[1] ?? "";
const sentences = (md: string): string[] => md.split(/(?<=[.!?])\s+|\n\s*\n/);
const saysLocal = (doc: string): boolean =>
  sentences(doc).some((s) => /progress entr/i.test(s) && /\blocal\b/i.test(s));

const writerPr = text("plugins/slopify/agents/writer-pr.md");
const lensPr = text("plugins/slopify/agents/lens-pr.md");
const reference = text("plugins/slopify/references/pr-description.md");
const headingsInOrder = /What changes[\s\S]*?Needs you[\s\S]*?Why trust it[\s\S]*?Not done/;

describe("PR description agents", () => {
  test("writer-pr's instructions require the four headings in order, no other heading, at most 4,000 characters, and no process detail", () => {
    assert.equal(field(writerPr, "name"), "writer-pr");
    assert.match(writerPr, /produc(er|tion leaf)/i, "writer-pr is a producer");
    assert.match(writerPr, /pr-description\.md/, "writer-pr names the reference it follows");
    const rules = `${writerPr}\n${reference}`;
    assert.match(rules, headingsInOrder);
    assert.match(rules, /no other heading/i);
    assert.match(rules, /4,000 characters/);
    assert.match(rules, /process detail/i);
    assert.match(rules, /grouped/i, "the overflow rule groups lines");
  });

  test("lens-pr is report-only and checks headings, order, the 4,000-character limit, process detail, and Why trust it lines against criterion results", () => {
    assert.equal(field(lensPr, "name"), "lens-pr");
    for (const tool of ["Edit", "Write", "NotebookEdit"]) {
      assert.ok(field(lensPr, "disallowedTools").split(/,\s*/).includes(tool), `lens-pr disallows ${tool}`);
    }
    const contract = /## Report-only contract\n[\s\S]*$/.exec(text("plugins/slopify/agents/lens-docs.md"))?.[0].trim();
    assert.ok(contract);
    assert.ok(lensPr.includes(contract), "lens-pr carries lens-docs.md's Report-only contract verbatim");
    assert.match(lensPr, /pr-description\.md/, "lens-pr names the reference it checks against");
    const rules = `${lensPr}\n${reference}`;
    assert.match(rules, headingsInOrder);
    assert.match(rules, /4,000 characters/);
    assert.match(rules, /process detail/i);
    assert.ok(
      sentences(lensPr).some((s) => s.includes("Why trust it") && /criterion result/i.test(s)),
      "lens-pr checks each Why trust it line against the criterion results",
    );
    assert.ok(
      sentences(lensPr).some((s) => s.includes("Why trust it") && /grouped/i.test(s)),
      "lens-pr accepts a grouped Why trust it line",
    );
  });

  test("writer-pr's and lens-pr's instructions both require the Spec: <folder> line", () => {
    for (const [name, agent] of [
      ["writer-pr", writerPr],
      ["lens-pr", lensPr],
    ] as const) {
      assert.match(`${agent}\n${reference}`, /Spec: <folder>/, `${name} works from the Spec line rule`);
    }
  });
});

describe("progress entries", () => {
  test("pusher-ledger.md describes progress entries as local", () => {
    const ledger = text("plugins/slopify/references/pusher-ledger.md");
    assert.match(ledger, /^<time> progress /m, "pusher-ledger.md has the progress entry template");
    assert.ok(saysLocal(ledger), "pusher-ledger.md says progress entries stay local");
  });

  test("README describes progress entries as local", () => {
    assert.ok(saysLocal(text("README.md")), "README.md says progress entries stay local");
  });
});
