import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const root = new URL("../", import.meta.url);

// The current product text: the docs, everything the plugin ships (agents, references, skills, built workflows,
// plugin.json, eval scaffolds and graders), and src/, so a banned string can't reach the built workflows.
const scanned = ["README.md", "TESTING.md", "docs", "plugins", "src"];

// Records, not current product text, so they may keep an old phrase:
// - docs/specs/: past specs record what each story intended when it was written.
// - plugins/slopify/evals/results/: eval reports record past runs (ignored by git, excluded in case one is tracked).
// library/ and test/ are outside `scanned`: the library holds research sources, and the tests name the phrases to ban them.
const excluded = ["docs/specs/", "plugins/slopify/evals/results/"];

const banned = ["Suggestions", "Known debt", "Unverified findings", "Not validated", "Test changes"];

describe("old PR section phrases", () => {
  test("no shipped doc or plugin text holds an old PR section phrase", () => {
    // The test runs git from the developer's or CI's own PATH, as `make check` does.
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    const files = execFileSync("git", ["ls-files", "-z", "--", ...scanned], { cwd: root, encoding: "utf8" })
      .split("\0")
      .filter((path) => path !== "" && excluded.every((dir) => !path.startsWith(dir)));
    assert.ok(files.length > 0, "git lists the scanned files");
    const hits = files.flatMap((path) =>
      readFileSync(new URL(path, root), "utf8")
        .split("\n")
        .flatMap((line, i) =>
          banned.filter((phrase) => line.includes(phrase)).map((phrase) => `${path}:${String(i + 1)}: ${phrase}`),
        ),
    );
    assert.deepEqual(hits, []);
  });
});
