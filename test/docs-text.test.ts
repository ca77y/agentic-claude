import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";

// Reads the product docs and the plugin's manifest. A missing file reads as empty, so its absence fails an assertion.
const root = new URL("../", import.meta.url);
const read = (path: string): string => {
  const url = new URL(path, root);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
};
const splitSentences = (md: string): string[] => md.split(/(?<=[.!?])\s+|\n/);

const kindDocs = {
  story: "docs/deliver/STORY.md",
  trivial: "docs/deliver/TRIVIAL.md",
  bugfix: "docs/deliver/BUGFIX.md",
  spike: "docs/deliver/SPIKE.md",
  research: "docs/RESEARCH.md",
};

describe("the PR description in the design docs", () => {
  const parts = ["**What changes**", "**Needs you**", "**Why trust it**", "**Not done**"];

  test("each kind's design doc and both forge texts name the four parts in order", () => {
    const forgeTexts = ["docs/FORGE.md", "plugins/slopify/skills/bootstrap/references/forge.md"];
    for (const path of [...Object.values(kindDocs), ...forgeTexts]) {
      const doc = read(path);
      const at = parts.map((part) => doc.indexOf(part));
      for (const [i, part] of parts.entries()) assert.ok((at[i] ?? -1) >= 0, `${path} names ${part}`);
      assert.deepEqual(
        at.toSorted((a, b) => a - b),
        at,
        `${path} names the four parts in order`,
      );
    }
  });

  // For each kind: what its What changes part opens with, and what its Why trust it part rests on.
  const kindLines: Record<keyof typeof kindDocs, { opening: RegExp[]; trust: RegExp[] }> = {
    story: { opening: [/outcome/i], trust: [/criterion results/i] },
    trivial: { opening: [/one sentence/i], trust: [/test/i, /app/i] },
    bugfix: { opening: [/before/i, /after/i], trust: [/reproduction/i, /before the fix/i, /after/i] },
    spike: { opening: [/question/i, /answer/i, /recommendation/i], trust: [/claims/i, /unknowns/i] },
    research: { opening: [/question/i, /short answer/i, /main page/i], trust: [/citations/i, /source/i] },
  };

  test("each kind's design doc states its opening and its trust line", () => {
    for (const [kind, path] of Object.entries(kindDocs) as [keyof typeof kindDocs, string][]) {
      const doc = splitSentences(read(path));
      const { opening, trust } = kindLines[kind];
      assert.ok(
        doc.some((s) => s.includes("What changes") && opening.every((re) => re.test(s))),
        `${path} says what **What changes** opens with for a ${kind}`,
      );
      assert.ok(
        doc.some((s) => s.includes("Why trust it") && trust.every((re) => re.test(s))),
        `${path} says what **Why trust it** rests on for a ${kind}`,
      );
    }
  });
});

describe("agent listings", () => {
  const readme = read("README.md").split("\n");
  // A table row's cells, found by its first cell.
  const row = (first: string): string[] =>
    (readme.find((l) => l.startsWith("|") && l.split("|", 2)[1]?.trim() === first) ?? "")
      .split("|")
      .map((c) => c.trim());

  test("README's workflow lists and agent families, DESIGN and plugin.json list writer-pr", (t) => {
    // The Area table's 'Agents its workflows dispatch' cell holds one list per workflow, each opening `<name>`: or
    // `<name>` and `<name>`:.
    const lists = [row("Delivery")[3] ?? "", row("Library")[3] ?? ""].flatMap((cell) =>
      cell.split(/(?<=\.)\s+(?=`[a-z-]+`(?: and `[a-z-]+`)?:)/),
    );
    for (const label of [
      "`deliver-story`:",
      "`deliver-trivial` and `deliver-bugfix`:",
      "`deliver-spike`:",
      "`research`:",
    ]) {
      const list = lists.find((l) => l.startsWith(label)) ?? "";
      assert.ok(list !== "", `README lists the agents of ${label}`);
      assert.match(list, /`writer-pr`/, `README's ${label} list names writer-pr`);
    }
    assert.match(row("Producers")[2] ?? "", /`writer-pr`/, "README's Producers row");

    const design = read("docs/DESIGN.md");
    assert.match(
      design.split("\n").find((l) => l.startsWith("- **Producers**")) ?? "",
      /`writer-pr`/,
      "DESIGN's producer list",
    );

    const manifest = "plugins/slopify/.claude-plugin/plugin.json";
    const plugin = JSON.parse(read(manifest)) as { description: string; version: string };
    assert.match(plugin.description, /writer-pr/, "plugin.json's description");

    // The test runs git from the developer's or CI's own PATH, as `make check` does.
    /* eslint-disable sonarjs/no-os-command-from-path */
    let base: string;
    try {
      base = execFileSync("git", ["merge-base", "HEAD", "master"], { cwd: root, encoding: "utf8" }).trim();
    } catch {
      t.skip("no master branch to compare the plugin version with");
      return;
    }
    const before = JSON.parse(
      execFileSync("git", ["show", `${base}:${manifest}`], { cwd: root, encoding: "utf8" }),
    ) as { version: string };
    /* eslint-enable sonarjs/no-os-command-from-path */
    assert.equal(plugin.version, before.version, "the plugin's version is unchanged");
  });

  test("README describes progress entries as local", () => {
    assert.ok(
      read("README.md")
        .split(/(?<=[.!?])\s+|\n\s*\n/)
        .some((s) => /progress entr/i.test(s) && /\blocal\b/i.test(s)),
      "README.md says progress entries stay local",
    );
  });
});

describe("the eval scaffolds' forge declarations", () => {
  const scaffolds = [
    "plugins/slopify/evals/deliver-story-smoke/scaffold.sh",
    "plugins/slopify/evals/deliver-trivial-smoke/scaffold.sh",
    "plugins/slopify/evals/deliver-bugfix-smoke/scaffold.sh",
    "plugins/slopify/evals/deliver-spike-smoke/scaffold.sh",
    "plugins/slopify/evals/research-smoke/scaffold.sh",
  ];
  const parts = new Set(["## What changes", "## Needs you", "## Why trust it", "## Not done"]);

  test("each scaffold's PR binding posts the body the brief supplies, with no heading but the four parts", () => {
    for (const path of scaffolds) {
      const line = read(path)
        .split("\n")
        .find((l) => l.startsWith("- Create or update:"));
      assert.ok(line !== undefined, `${path} declares how the PR is created or updated`);
      assert.match(line, /the body the brief supplies/, `${path} posts the body the brief supplies`);
      assert.doesNotMatch(line, /renders/, `${path} no longer says the delivery renders the body`);
      // Each heading the line names, as a code span such as `## Summary`.
      const headings = Array.from(line.matchAll(/`(#{2,6} [^`]*)`/g), (m) => m[1] ?? "");
      assert.deepEqual(
        headings.filter((h) => !parts.has(h)),
        [],
        `${path} names no PR heading but the four parts`,
      );
    }
  });
});
