import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// SMR-378: wordings the docs used for claims that were untrue of the plugin as built. Each was corrected or removed,
// and this fails if one comes back.
const root = new URL("../", import.meta.url);

const removed: Record<string, string[]> = {
  "README.md": [
    "only when its args set `file: true`",
    "Steps before the one that raised the decision replay",
    "a filed card, or a reproduction directory",
    "Only a confirmed `blocker` or `major` goes back to a producer",
    "one `judge` per problem confirms it",
    "seven workflows and three skills",
    "returns `ready` or `draft` whenever a PR exists",
    "the checkpoints that exist, and the attempts",
    "a gate runs out of failures, a decision is open",
    "so no dispatch exists just to write the ledger",
    "It records each run, `done spec`, `done findings`, `done round`",
    "`writer-card` drafts stories.",
    "one task each and no return format",
    "`ask` and `lint`: `library-reader`, `library-scribe`",
    "is named from its idea text plus a short hash",
    "marks the PR ready and moves the issue to In Review.",
  ],
  "docs/DESIGN.md": [
    "runs on sonnet, because it reads the whole spec",
    "the same set of failures",
    "or `draft` result names what it needs",
    "gives every problem from every stage",
    "`reversible`, and `affectsAcceptance`",
    "`writer-docs` and `writer-card` run on sonnet",
  ],
  "docs/deliver/STORY.md": [
    "the run report suggests a new category",
    "The problem, the diff, and the relevant task and criterion",
    "its review has run on the latest push",
    "resumes at the next outer round",
    "It flags changes that no criterion calls for",
    "`validator` then follows each criterion's category path",
    "its comments, labels, and relations",
  ],
  "docs/deliver/TRIVIAL.md": [
    "with the state reported on the issue",
    "`qa` and `simplifier` run once**, on the first change",
    "scout-docs, then writer-docs if it found any",
    "PR ready, issue In Review",
  ],
  "docs/deliver/BUGFIX.md": [
    "The comment says which, with what was tried.",
    "`lens-repro` saw it come and go",
    "Nobody is needed at any point.",
    "As in [`TRIVIAL.md`](TRIVIAL.md). An unreproducible",
  ],
  "docs/deliver/SPIKE.md": [
    "scout-known-issues, scout-prior-art (sonnet)",
    "with the state reported on the issue",
    "deleted once the measurements are confirmed",
  ],
  "docs/RESEARCH.md": ["every problem, whatever its kind, goes", "clean → PR ready, issue In Review"],
  "docs/FORGE.md": ["`refactor`, or `chore`, with an optional", "doesn't say the review was skipped, and its progress"],
  "docs/deliver/CARDS.md": [
    "so a what question left open reaches the PR as a draft",
    "advisors, and every `judge` read the whole issue",
    "its title, body, comments, labels, relations, and the branch",
    "decides from the code's evident contract",
    "One story is one issue and one PR.",
    "The parts are encoded in the plugin's",
  ],
  "plugins/slopify/skills/bootstrap/resources/FORGE.md": [
    "started and finished, as commands that can be polled, with time limits",
    "Review trigger and where findings land",
  ],
  "plugins/slopify/agents/pusher.md": ["Change no file content except the card"],
  "plugins/slopify/references/pusher-forge.md": ["created from the target branch with"],
  "plugins/slopify/references/pusher-ledger.md": ["ended <finished|failed", "at the story worktree root"],
  "plugins/slopify/agents/scout-checkpoint.md": [
    "the board's branch name, a PR, or a slug",
    "from the identifier or slug the brief gives",
  ],
  "TESTING.md": ["report under `plugins/slopify/evals/results/`."],
  ".claude/rules/architecture.md": [
    "comes from three files in that project",
    "The tracker is Linear and the forge is GitHub",
    "(../../docs/deliver/STORY.md)",
  ],
};

for (const [path, phrases] of Object.entries(removed)) {
  test(`${path} no longer states the claims SMR-378 corrected`, () => {
    const text = readFileSync(new URL(path, root), "utf8");
    for (const phrase of phrases) assert.ok(!text.includes(phrase), `${path} still says: ${phrase}`);
  });
}
