import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

// SMR-380: the docs describe shape's split mode as built.
const root = new URL("../", import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, root), "utf8");
const sentences = (md: string): string[] => md.split(/(?<=[.!?])\s+|\n/);
const says = (md: string, ...all: RegExp[]): boolean => sentences(md).some((s) => all.every((r) => r.test(s)));

// The body of a Markdown section, from its heading to the next heading of the same or a higher level.
const section = (md: string, heading: RegExp): string => {
  const lines = md.split("\n");
  const at = lines.findIndex((l) => /^#{2,3} /.test(l) && heading.test(l));
  if (at === -1) return "";
  const level = /^#+/.exec(lines[at] ?? "")?.[0].length ?? 2;
  const end = lines.findIndex((l, i) => i > at && new RegExp(`^#{1,${String(level)}} `).test(l));
  return lines.slice(at, end === -1 ? lines.length : end).join("\n");
};

describe("docs/SHAPE.md on splitting a request (SMR-380)", () => {
  const shape = read("docs/SHAPE.md");

  test("a section says how a split grounds once, plans with writer-split, covers each part, caps by selection, and files in waves", () => {
    const split = section(shape, /split/i);
    assert.ok(split, "docs/SHAPE.md has a section on splitting a request");
    assert.match(split, /`writer-split`/, "the section names the planner");
    assert.ok(says(split, /ground/i, /once/i), "the request is grounded once");
    assert.ok(says(split, /cover/i, /part/i, /hidden line|scout-related-cards/i), "coverage is checked per part");
    assert.ok(says(split, /\bcap\b/i, /select/i), "the cap is applied by selection");
    assert.ok(says(split, /wave/i, /draft/i, /file/i), "waves draft, then file");
    assert.ok(says(split, /blocked[- ]by|relation/i), "cards are filed with their relations");
  });

  test("the decisions state the split's limits", () => {
    const decisions = section(shape, /^## Decisions/);
    assert.ok(says(decisions, /split/i, /never files more/i, /\bcap\b/i), "a split never files more than its cap");
    assert.ok(says(decisions, /\bcap\b/i, /request/i, /never raises/i), "a cap read from the request never raises it");
    assert.ok(
      says(decisions, /covers?/i, /files nothing/i, /report/i),
      "a covered part files nothing, named in the report",
    );
    assert.ok(says(decisions, /constraints?/i, /every card/i), "whole-set constraints go to every card");
    assert.ok(
      says(decisions, /required part/i, /not filed|never filed/i),
      "a part missing a required part is not filed",
    );
    assert.ok(
      says(decisions, /covered cards?|cards? (?:that|which) cover/i, /never changed|changes? no/i),
      "covered cards are never changed",
    );
    assert.ok(
      says(decisions, /relation/i, /binding/i, /before/i, /created/i),
      "an unbound relation stops the run first",
    );
  });

  test("the H2 row says earlier cards stay filed and a rerun finds them by their hidden line", () => {
    const h2 = shape.split("\n").find((l) => l.startsWith("| H2")) ?? "";
    assert.match(h2, /stay filed/i, "cards filed before the failure stay filed");
    assert.match(h2, /rerun/i, "a rerun is named");
    assert.match(h2, /hidden line/i, "the rerun finds them by their hidden line");
  });
});

describe("README, ARCHITECTURE, and the plugin description name split mode (SMR-380)", () => {
  const readme = read("README.md");
  const row = (name: string): string[] =>
    (readme.split("\n").find((l) => new RegExp(String.raw`^\|\s*${name}\s*\|`).test(l)) ?? "")
      .split("|")
      .map((c) => c.trim());

  test("README's Shape row describes split and lists writer-split", () => {
    const shape = row("Shape");
    assert.match(shape[2] ?? "", /split/i, "the Shape row describes split mode");
    assert.match(shape[3] ?? "", /`writer-split`/, "the Shape row's agent list names writer-split");
  });

  test("README's Producers row names writer-split", () => {
    assert.match(row("Producers")[2] ?? "", /`writer-split`/);
  });

  test("README's authority paragraph bounds a split by its cap of new story cards and their relations", () => {
    const authority = section(readme, /^## Project authority/);
    assert.ok(
      says(authority, /`shape`/, /split/i, /\bcap\b/i, /stor(?:y|ies)/i, /relations/i, /nothing more/i),
      "invoking shape with split authorizes filing up to its cap of new story cards with their relations, and nothing more",
    );
  });

  test("ARCHITECTURE's producers paragraph names writer-split as returning its work instead of a file", () => {
    const producers =
      read("docs/ARCHITECTURE.md")
        .split("\n")
        .find((l) => l.startsWith("- **Producers**")) ?? "";
    assert.ok(says(producers, /`writer-split`/, /return/i), "writer-split returns its plan");
  });

  test("plugin.json's description names split mode and writer-split", () => {
    const plugin = JSON.parse(read("plugins/slopify/.claude-plugin/plugin.json")) as { description: string };
    assert.match(plugin.description, /writer-split/);
    assert.match(plugin.description, /split/);
    assert.match(plugin.description, /\bcap\b|several|small/i, "the description says what a split does");
  });
});
