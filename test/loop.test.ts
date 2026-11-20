// Runs the outer and inner loops with scripted agents, so their control flow is tested without any model.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { createDeliver } from "../src/slopify/lib/deliver.ts";
import { specReviser } from "../src/slopify/lib/how.ts";
import { runLoop, stopOf, Halt, type LoopInput, type Run } from "../src/slopify/lib/loop.ts";
import type { Build, Validate } from "../src/slopify/lib/spec.ts";
import { checkDescription } from "../src/slopify/lib/rules.ts";
import {
  PR_AGENTS,
  calls,
  current,
  describedBeforeEachPosting,
  installAgents,
  isPosting,
  scriptOf,
  prBody,
  type Reply,
  type Script,
} from "./harness.ts";
import { board, clearBoard, linearPusher } from "./linear-board.ts";

installAgents();

const use = (s: Script): void => {
  current.script = s;
};

const BUILD: Build = {
  shared: [],
  tasks: [{ id: "t1", dependsOn: [], files: ["src/a.ts"], criteria: ["c1"], todo: "do it", reuse: [], create: [] }],
  docs: [],
  decisions: [],
  manualActions: [],
};
const VALIDATE: Validate = {
  criteria: [{ id: "c1", wording: "it works", category: "UI", path: "flow", evidence: "shot", firstTest: "t" }],
};

const OK_PUSH = {
  done: true,
  unmet: [],
  operations: [
    { op: "commit", reference: "abc" },
    { op: "card", reference: "comment" },
  ],
};
const OK_TEST = {
  tests: ["a.test.ts"],
  stubs: [],
  failingOutput: "red",
  noTest: "",
  specProblem: "",
  assumptions: [],
  manualActions: [],
};
const OK_FIX = { changed: ["src/a.ts"], ran: [], testProblem: "", specProblem: "", assumptions: [], manualActions: [] };
const QA_PASS = { verdict: "pass", evaluated: "x", findings: [], limits: "none", testAtFault: false };
const QA_FAIL = {
  verdict: "fail",
  evaluated: "x",
  findings: [{ location: "src/a.ts", problem: "wrong", blocking: true }],
  limits: "none",
  testAtFault: false,
};
const CHECKS_OK = { commands: [{ command: "lint", exitCode: 0, failingLines: "" }] };
const PASS_ROW = { id: "c1", result: "pass", ran: "flow", evidence: ["shot.png"], detail: "", setting: "draft" };
const VALIDATOR_PASS = { results: [PASS_ROW], uncategorizedSetting: "draft" };
const CLEAN_REVIEW = { outcome: "finished", waitingFor: "none", limitMinutes: 60, reference: "r", findings: [] };
const GATEWAY_OK = { missed: [], docsToAdd: [] };
const finding = (text: string) => ({ ...CLEAN_REVIEW, findings: [{ id: "f1", location: "src/a.ts:3", text }] });
const ruling = (over: Record<string, unknown> = {}) => ({
  verdict: "confirmed",
  severity: "major",
  kind: "code",
  ruling: "none",
  reason: "seen",
  fingerprint: "src/a.ts|f|bug",
  ...over,
});

const pusher = (prompt: string): Reply =>
  prompt.includes("open the branch's PR")
    ? { done: true, unmet: [], operations: [{ op: "pr", reference: "PR-1" }] }
    : OK_PUSH;

// A delivery where everything passes; each test overrides the agents it cares about.
const DEFAULTS: Record<string, Script> = {
  pusher: (_t, _l, prompt) => pusher(prompt),
  coder: (_t, label) => (label.endsWith(": test") ? OK_TEST : OK_FIX),
  qa: () => QA_PASS,
  simplifier: () => QA_PASS,
  checks: () => CHECKS_OK,
  validator: () => VALIDATOR_PASS,
  watcher: () => CLEAN_REVIEW,
  judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling()),
  "writer-docs": () => ({ changed: ["docs/a.md"] }),
  ...PR_AGENTS,
};
const happy = (over: Partial<Record<string, Script>> = {}): Script => scriptOf(DEFAULTS, over);

function inputFor(d: Run, over: Partial<LoopInput> = {}): LoopInput {
  return {
    d,
    kind: "story",
    where: "project",
    story: "the issue",
    cardId: "SMR-1",
    build: BUILD,
    validate: VALIDATE,
    specDir: "docs/specs/smr-1",
    answers: {},
    startAtReview: 0,
    built: false,
    ...over,
  };
}
function freshRun(): Run {
  const d = createDeliver({
    workflow: "deliver-story",
    projectRoot: "/p",
    storyArg: "SMR-1",
  });
  d.state.worktree = "/p/wt";
  return d;
}
const count = (type: string, label?: string): number =>
  calls.filter((c) => c.type === type && (label === undefined || c.label.includes(label))).length;
const pushPrompts = (): string[] => calls.filter((c) => c.label === "push the round").map((c) => c.prompt);
const judgePrompts = (): string[] => calls.filter((c) => c.type === "judge").map((c) => c.prompt);
const finalPrompt = (): string => calls.find((c) => /mark the PR ready|report the draft/.test(c.label))?.prompt ?? "";
const cardPrompt = (): string => calls.find((c) => c.label === "update the card")?.prompt ?? "";
const writerPrompts = (): string[] => calls.filter((c) => c.type === "writer-pr").map((c) => c.prompt);
const lastWriterPrompt = (): string => writerPrompts().at(-1) ?? "";
const filingPrompt = (): string =>
  calls.find((c) => c.type === "pusher" && c.prompt.includes("File one card"))?.prompt ?? "";

// Each review has one finding fewer, so the open count keeps falling and only the round cap can end the loop.
const fallingReviews = (counts: readonly number[]): Script => {
  let review = 0;
  return happy({
    watcher: () => {
      const n = counts[review] ?? 0;
      review += 1;
      const findings = Array.from({ length: n }, (_, i) => ({
        id: `f${String(i)}`,
        location: `src/f${String(i)}.ts:1`,
        text: `bug ${String(review)}-${String(i)}`,
      }));
      return { ...CLEAN_REVIEW, findings };
    },
    judge: (_t, label, prompt) =>
      label === "gateway" ? GATEWAY_OK : ruling({ fingerprint: /bug \d+-\d+/.exec(prompt)?.[0] ?? "x" }),
  });
};

const recurring = (rulingName: string, severity = "major"): Script =>
  happy({
    watcher: () => finding("same bug"),
    judge: (_t, label) =>
      label === "gateway" ? GATEWAY_OK : ruling({ severity, fingerprint: "same", ruling: rulingName }),
  });

const cannotVerify = (setting: string): Script =>
  happy({
    validator: () => ({
      results: [{ ...PASS_ROW, result: "cannot-verify", evidence: [], detail: "no simulator", setting }],
      uncategorizedSetting: "draft",
    }),
  });

async function statusOf(over: Partial<LoopInput> = {}): Promise<string> {
  const { status } = await runLoop(inputFor(freshRun(), over));
  return status;
}

// The simplifier trims the test, then the coder's next try asks to put the trimmed part back.
const trimmedThenObjected = (keep: boolean): Script => {
  let simplified = 0;
  let fixes = 0;
  return happy({
    simplifier: () => {
      simplified += 1;
      return simplified === 1
        ? {
            ...QA_PASS,
            verdict: "fail",
            findings: [{ location: "a.test.ts:4", problem: "unused fixture", blocking: true }],
          }
        : QA_PASS;
    },
    coder: (_t, label) => {
      if (label.endsWith(": test")) return OK_TEST;
      fixes += 1;
      return fixes === 2 ? { ...OK_FIX, changed: [], testProblem: "the trim dropped the URL case" } : OK_FIX;
    },
    judge: (_t, label) =>
      label.endsWith("rule on the test") ? { keep, reason: "seen" } : label === "gateway" ? GATEWAY_OK : ruling(),
  });
};

beforeEach(() => {
  calls.length = 0;
});

describe("a delivery with nothing wrong", () => {
  test("rates blocker and major by the code severity reference", async () => {
    use(happy({ watcher: () => finding("off by one") }));
    await statusOf();
    assert.match(
      calls.find((c) => c.type === "judge" && c.label === "rule on the problems")?.prompt ?? "",
      /blocker and major as the severity reference severity-code\.md defines them/,
    );
  });

  test("builds, validates, opens the PR ready, and keeps it ready on a clean review", async () => {
    use(happy());
    const r = await runLoop(inputFor(freshRun()));
    assert.match(pushPrompts().at(-1) ?? "", /open the branch's PR ready for review, not as a draft/);
    assert.equal(r.status, "ready");
    assert.equal(r.pr, "PR-1");
    assert.equal(r.rounds, 0);
    assert.equal(count("coder"), 2);
    assert.equal(count("qa"), 1);
    assert.equal(count("watcher"), 1);
    assert.ok(finalPrompt().includes("Mark the PR ready"));
  });

  test("names the agent first on every progress row", async () => {
    use(happy());
    await runLoop(inputFor(freshRun()));
    for (const c of calls) assert.ok(c.row === c.type || c.row.startsWith(`${c.type} · `), c.row);
  });

  test("commits the test before the fix, each on its own", async () => {
    use(happy());
    await runLoop(inputFor(freshRun()));
    const commits = calls.filter((c) => c.label.startsWith("commit:")).map((c) => c.label);
    assert.deepEqual(commits, ["commit: add a failing test for t1", "commit: implement t1"]);
  });

  test("tells the fix dispatch the test paths are protected", async () => {
    use(happy());
    await runLoop(inputFor(freshRun()));
    const fix = calls.find((c) => c.label === "t1: fix");
    assert.ok(fix?.prompt.includes("protected"));
    assert.ok(fix?.prompt.includes("a.test.ts"));
  });

  test("commits a test's stubs with it and leaves them unprotected", async () => {
    const withStub = { ...OK_TEST, stubs: ["src/stub.ts"] };
    use(happy({ coder: (_t, label) => (label.endsWith(": test") ? withStub : OK_FIX) }));
    await runLoop(inputFor(freshRun()));
    const testCommit = calls.find((c) => c.label === "commit: add a failing test for t1");
    assert.ok(testCommit?.prompt.includes("src/stub.ts"));
    const fix = calls.find((c) => c.label === "t1: fix");
    assert.ok(!fix?.prompt.includes("src/stub.ts"));
  });
});

describe("a commit a hook rejects", () => {
  const REJECTED = {
    done: false,
    unmet: ["commit: the hook failed"],
    operations: [],
    hookRejection: "a.test.ts:1 lint error",
  };

  test("has the coder fix what the hook reported, then commits again", async () => {
    let tries = 0;
    use(
      happy({
        pusher: (_t, label, prompt) => {
          if (!label.startsWith("commit: add a failing test")) return pusher(prompt);
          tries += 1;
          return tries === 1 ? REJECTED : OK_PUSH;
        },
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.equal(tries, 2);
    const repair = calls.find((c) => c.label === "t1: fix the commit hook's report");
    assert.ok(repair?.prompt.includes("a.test.ts:1 lint error"));
  });

  test("leaves a commit the hook still rejects after three fixes open for the next round", async () => {
    let rejected = 0;
    const prompts: string[] = [];
    const laterTest = { ...OK_TEST, tests: ["b.test.ts"] };
    use(
      happy({
        coder: (_t, label) => {
          if (label === "t1: test") return OK_TEST;
          return label.endsWith(": test") ? laterTest : OK_FIX;
        },
        pusher: (_t, label, prompt) => {
          if (!label.startsWith("commit:")) return pusher(prompt);
          prompts.push(prompt);
          if (!label.startsWith("commit: add a failing test") || rejected >= 4) return OK_PUSH;
          rejected += 1;
          return REJECTED;
        },
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(count("coder", "fix the commit hook's report"), 3);
    assert.equal(count("qa"), 1);
    assert.ok(prompts[4]?.includes("a.test.ts"), "the next commit carries the rejected paths");
    assert.notEqual(r.status, "blocked");
  });
});

describe("the inner loop", () => {
  test("sends a qa failure back to the coder without rewriting the test", async () => {
    let qa = 0;
    use(
      happy({
        qa: () => {
          qa += 1;
          return qa === 1 ? QA_FAIL : QA_PASS;
        },
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.equal(count("coder", ": test"), 1);
    assert.equal(count("coder", ": fix"), 2);
  });

  test("sends code the simplifier finds unneeded back to the coder, only once qa passes", async () => {
    let simplified = 0;
    const UNNEEDED = {
      ...QA_PASS,
      verdict: "fail",
      findings: [{ location: "src/a.ts:3", problem: "helper used once", blocking: true }],
    };
    use(
      happy({
        simplifier: () => {
          simplified += 1;
          return simplified === 1 ? UNNEEDED : QA_PASS;
        },
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.equal(count("coder", ": fix"), 2);
    assert.equal(count("simplifier"), 2);
    assert.ok(calls.findLast((c) => c.label.includes(": fix"))?.prompt.includes("helper used once"));
  });

  test("sends a simplifier finding in the test to the test's writer, not the coder", async () => {
    let simplified = 0;
    use(
      happy({
        simplifier: () => {
          simplified += 1;
          return simplified === 1
            ? {
                ...QA_PASS,
                verdict: "fail",
                findings: [{ location: "a.test.ts:4", problem: "unused fixture", blocking: true }],
              }
            : QA_PASS;
        },
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.equal(count("coder", ": test"), 2);
    assert.ok(calls.findLast((c) => c.label.endsWith(": test"))?.prompt.includes("unused fixture"));
    assert.ok(calls.every((c) => !c.label.includes(": fix") || !c.prompt.includes("unused fixture")));
  });

  test("has one judge rule when the coder asks to put back what the simplifier trimmed, and keeps the trim", async () => {
    use(trimmedThenObjected(true));
    await runLoop(inputFor(freshRun()));
    assert.equal(count("judge", "rule on the test"), 1);
    assert.equal(count("coder", ": test"), 2);
    assert.ok(calls.findLast((c) => c.label.includes(": fix"))?.prompt.includes("the test stands"));
    assert.ok(calls.findLast((c) => c.type === "simplifier")?.prompt.includes("A judge already ruled"));
  });

  test("rewrites the test for the coder when the judge rules the trim went too far", async () => {
    use(trimmedThenObjected(false));
    await runLoop(inputFor(freshRun()));
    assert.equal(count("judge", "rule on the test"), 1);
    assert.equal(count("coder", ": test"), 3);
    assert.ok(calls.findLast((c) => c.label.endsWith(": test"))?.prompt.includes("the trim dropped the URL case"));
  });

  test("lets a test-kind problem's test pass on the current code, and has qa break the behavior instead", async () => {
    use(fallingReviews([1, 0]));
    const base = current.script;
    current.script = (type, label, prompt) =>
      type === "judge" && label !== "gateway"
        ? ruling({ kind: "test", fingerprint: "cov" })
        : base(type, label, prompt);
    await runLoop(inputFor(freshRun()));
    const test = calls.find((c) => c.label === "fix-1: test")?.prompt ?? "";
    assert.ok(test.includes("may already pass on the current code"));
    assert.ok(!test.includes("must fail on the current code"));
    assert.ok(calls.find((c) => c.label === "fix-1: qa")?.prompt.includes("when the behavior it states is broken"));
    assert.ok(calls.some((c) => c.label === "commit: add a test for fix-1"));
  });

  test("doesn't ask the simplifier while qa still fails", async () => {
    use(happy({ qa: () => QA_FAIL }));
    await runLoop(inputFor(freshRun()));
    assert.equal(count("simplifier"), 0);
  });

  test("rewrites the test when qa says the test is at fault", async () => {
    let qa = 0;
    use(
      happy({
        qa: () => {
          qa += 1;
          return qa === 1 ? { ...QA_FAIL, testAtFault: true } : QA_PASS;
        },
      }),
    );
    await runLoop(inputFor(freshRun()));
    assert.equal(count("coder", ": test"), 2);
  });

  test("rewrites the test when the coder reports a test problem", async () => {
    let fix = 0;
    use(
      happy({
        coder: (_t, label) => {
          if (label.endsWith(": test")) return OK_TEST;
          fix += 1;
          return fix === 1 ? { ...OK_FIX, testProblem: "wrong" } : OK_FIX;
        },
      }),
    );
    await runLoop(inputFor(freshRun()));
    assert.equal(count("coder", ": test"), 2);
  });

  test("commits a fix's changes even when the coder also reports a problem", async () => {
    let fix = 0;
    use(
      happy({
        coder: (_t, label) => {
          if (label.endsWith(": test")) return OK_TEST;
          fix += 1;
          return fix === 1 ? { ...OK_FIX, testProblem: "it leaves out a case" } : OK_FIX;
        },
      }),
    );
    await runLoop(inputFor(freshRun()));
    assert.equal(count("pusher", "commit: implement t1"), 2);
  });

  test("keeps a change open as a blocker after three tries, and doesn't stop the round", async () => {
    use(happy({ qa: () => QA_FAIL }));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.ok(r.draftReasons.some((x) => x.text.includes("blocker")));
    assert.ok(finalPrompt().includes("Convert the PR to a draft"));
    assert.ok(count("validator") >= 1);
    assert.equal(count("coder", "t1: fix"), 3);
  });
});

describe("a coder decides how, not what", () => {
  const OPEN = "the spec doesn't say which store to use";

  test("leaves how to the coder, and sends a question about what back", async () => {
    use(happy());
    await statusOf();
    const fix = calls.find((c) => c.label === "t1: fix");
    assert.ok(fix?.prompt.includes("How to implement it in your paths is your decision"));
    assert.ok(fix?.prompt.includes("return specProblem"));
  });

  test("sends what the brief leaves open to the spec's writer, then builds the revised task", async () => {
    let revised = 0;
    let fixes = 0;
    use(
      happy({
        coder: (_t, label) => {
          if (label.endsWith(": test")) return OK_TEST;
          fixes += 1;
          return fixes === 1 ? { ...OK_FIX, specProblem: OPEN } : OK_FIX;
        },
      }),
    );
    const status = await statusOf({
      reviseSpec: async (problems) => {
        revised += 1;
        assert.ok(problems[0]?.includes(OPEN));
        await Promise.resolve();
        return { build: BUILD, validate: VALIDATE, rerun: BUILD.tasks };
      },
    });
    assert.equal(revised, 1);
    assert.equal(status, "ready");
    assert.equal(fixes, 2);
  });

  test("with no spec, keeps the PR a draft and lists it, instead of retrying", async () => {
    use(happy({ coder: (_t, label) => (label.endsWith(": test") ? OK_TEST : { ...OK_FIX, specProblem: OPEN }) }));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.ok(r.draftReasons.some((x) => x.text.includes(OPEN)));
    assert.equal(count("coder", ": fix"), 1);
    assert.equal(count("qa"), 0);
  });

  test("a choice the coder settles goes to qa to check, and never to the person", async () => {
    const NAMED = "What to call the helper? retryUpload.";
    use(happy({ coder: (_t, label) => (label.endsWith(": test") ? OK_TEST : { ...OK_FIX, assumptions: [NAMED] }) }));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.ok(
      calls.some((c) => c.type === "qa" && c.prompt.includes(NAMED)),
      "qa checks the coder's choice",
    );
    assert.ok(!cardPrompt().includes(NAMED), "the card comment doesn't list it");
    assert.ok(!lastWriterPrompt().includes(NAMED), "writer-pr doesn't get it");
  });

  test("a test dispatch can stop the same way", async () => {
    use(happy({ coder: (_t, label) => (label.endsWith(": test") ? { ...OK_TEST, specProblem: OPEN } : OK_FIX) }));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.equal(count("coder", ": fix"), 0);
  });
});

describe("the outer loop", () => {
  test("fixes a confirmed review finding in a later round, then goes ready", async () => {
    let review = 0;
    use(
      happy({
        watcher: () => {
          review += 1;
          return review === 1 ? finding("bug") : CLEAN_REVIEW;
        },
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.equal(r.rounds, 1);
    assert.equal(count("coder", "fix-1: test"), 1);
    assert.ok(calls.some((c) => c.prompt.includes("fire the review trigger")));
  });

  test("doesn't open a PR while something blocks, but still pushes", async () => {
    let rounds = 0;
    use(
      happy({
        validator: () => {
          rounds += 1;
          return rounds === 1
            ? { results: [{ ...PASS_ROW, result: "fail", detail: "step 2" }], uncategorizedSetting: "draft" }
            : VALIDATOR_PASS;
        },
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    const [first, second] = pushPrompts();
    assert.ok(first?.includes("Open no PR yet"));
    assert.ok(second?.includes("open the branch's PR"));
  });

  test("opens the draft on the last round even when something still blocks", async () => {
    use(
      happy({
        validator: () => ({
          results: [{ ...PASS_ROW, result: "fail", detail: "step 2" }],
          uncategorizedSetting: "draft",
        }),
        judge: (_t, label) =>
          label === "gateway" ? GATEWAY_OK : ruling({ severity: "blocker", fingerprint: `fp-${String(calls.length)}` }),
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.equal(r.pr, "PR-1");
    assert.ok(r.rounds <= 3);
  });

  test("runs at most three fix rounds", async () => {
    use(fallingReviews([4, 3, 2, 1]));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.equal(r.rounds, 3);
    assert.equal(count("watcher"), 4);
  });

  test("rules on every review finding of a round with one judge", async () => {
    use(fallingReviews([3, 0]));
    await runLoop(inputFor(freshRun()));
    const review = calls.find((c) => c.type === "judge" && c.label === "rule on the problems")?.prompt ?? "";
    assert.ok(["bug 1-0", "bug 1-1", "bug 1-2"].every((b) => review.includes(b)));
    assert.equal(count("judge", "rule"), 1);
  });

  test("still reads and gates the review after the last fix round", async () => {
    use(fallingReviews([3, 2, 1, 0]));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.rounds, 3);
    assert.equal(r.status, "ready");
  });

  test("stops early when the open count doesn't fall over two rounds", async () => {
    use(fallingReviews([1, 1, 1, 1]));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.rounds, 2);
    assert.equal(r.status, "draft");
  });

  test("sends a docs problem to the writer, not the coder", async () => {
    let review = 0;
    use(
      happy({
        watcher: () => {
          review += 1;
          return review === 1 ? finding("doc is wrong") : CLEAN_REVIEW;
        },
        judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling({ kind: "docs" })),
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.equal(count("coder", "fix-"), 0);
    assert.equal(count("writer-docs", "update the docs"), 1);
  });

  test("sends a spec problem to the reviser, and reruns the tasks it returns", async () => {
    let review = 0;
    let revised = 0;
    use(
      happy({
        watcher: () => {
          review += 1;
          return review === 1 ? finding("design conflict") : CLEAN_REVIEW;
        },
        judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling({ kind: "spec" })),
      }),
    );
    const r = await runLoop(
      inputFor(freshRun(), {
        reviseSpec: async () => {
          revised += 1;
          await Promise.resolve();
          return { build: BUILD, validate: VALIDATE, rerun: BUILD.tasks };
        },
      }),
    );
    assert.equal(r.status, "ready");
    assert.equal(revised, 1);
    assert.equal(count("coder", "t1: test"), 2);
  });
});

describe("recurrence", () => {
  test("closes a recurring major as debt, so it no longer holds the PR", async () => {
    use(recurring("accept-as-debt"));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.ok(lastWriterPrompt().includes("same bug"), "writer-pr is told the debt is still open");
  });

  test("files a split recurring major as an issue", async () => {
    use(recurring("split-to-issue"));
    await runLoop(inputFor(freshRun()));
    assert.ok(filingPrompt().includes("same bug"));
  });

  test("never lets a ruling close a recurring blocker", async () => {
    use(recurring("accept-as-debt", "blocker"));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.ok(r.draftReasons.some((x) => x.text.includes("blocker")));
  });
});

describe("what TESTING.md decides", () => {
  test("keeps the PR a draft for a cannot-verify criterion set to draft, with no extra round", async () => {
    use(cannotVerify("draft"));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.equal(r.rounds, 0);
    assert.ok(cardPrompt().includes("it works (cannot-verify)"), "the card comment says why it is a draft");
  });

  test("lets a cannot-verify criterion set to ready through, under Not validated", async () => {
    use(cannotVerify("ready"));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.ok(lastWriterPrompt().includes("cannot-verify"), "writer-pr is told the criterion's result");
  });

  test("treats a missing statement as draft", async () => {
    use(cannotVerify(""));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
  });

  test("never sends a cannot-verify criterion to the coder", async () => {
    use(cannotVerify("draft"));
    await runLoop(inputFor(freshRun()));
    assert.equal(count("coder", "fix-"), 0);
    assert.equal(count("judge", "rule"), 0);
  });

  test("turns a pass with no evidence into cannot-verify", async () => {
    use(
      happy({
        validator: () => ({ results: [{ ...PASS_ROW, evidence: [] }], uncategorizedSetting: "ready" }),
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.equal(count("coder", "fix-"), 0);
  });

  test("follows the Uncategorized setting", async () => {
    const validate: Validate = {
      criteria: [{ id: "c1", wording: "it works", category: "uncategorized", path: "", evidence: "", firstTest: "t" }],
    };
    use(happy({ validator: () => ({ results: [], uncategorizedSetting: "draft" }) }));
    assert.equal(await statusOf({ validate }), "draft");
    use(happy({ validator: () => ({ results: [], uncategorizedSetting: "ready" }) }));
    assert.equal(await statusOf({ validate }), "ready");
  });
});

const failing = () => ({
  results: [{ ...PASS_ROW, result: "fail", detail: "step 2" }],
  uncategorizedSetting: "draft",
});

describe("rulings on a failing criterion", () => {
  test("shows an overturned fail as a pass in the table", async () => {
    use(
      happy({
        validator: failing,
        judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling({ verdict: "dismissed", reason: "flaky" })),
      }),
    );
    assert.equal(await statusOf(), "ready");
    assert.ok(lastWriterPrompt().includes("overturned a fail"));
    assert.equal(count("coder", "fix-"), 0);
  });

  test("applies TESTING.md's setting to a fail ruled unverifiable", async () => {
    use(
      happy({
        validator: failing,
        judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling({ kind: "cannot-verify", severity: "none" })),
      }),
    );
    assert.equal(await statusOf(), "draft");
    assert.equal(count("coder", "fix-"), 0);
  });
});

describe("the PR's other sections", () => {
  test("lists an unverified review finding without blocking", async () => {
    use(
      happy({
        watcher: () => finding("maybe a race"),
        judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling({ verdict: "unverified", severity: "none" })),
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.ok(lastWriterPrompt().includes("maybe a race"), "writer-pr is told the finding is open");
  });

  test("marks ready with a spec decision that changes acceptance, and lists it to confirm", async () => {
    const decision = {
      id: "d1",
      question: "keep the data?",
      choice: "yes",
      rationale: "x",
      reversible: true,
      permission: "",
      affectsAcceptance: true,
    };
    use(happy());
    const r = await runLoop(inputFor(freshRun(), { build: { ...BUILD, decisions: [decision] } }));
    assert.equal(r.status, "ready");
    assert.deepEqual(r.decisions, ["d1"]);
    assert.ok(cardPrompt().includes("keep the data?"), "the card comment lists the decision");
  });

  test("lists the spec's and the coder's manual actions, and still goes ready", async () => {
    use(
      happy({
        coder: (_t, label) =>
          label.endsWith(": test") ? OK_TEST : { ...OK_FIX, manualActions: ["drop the old table"] },
      }),
    );
    const r = await runLoop(inputFor(freshRun(), { build: { ...BUILD, manualActions: ["run the backfill"] } }));
    assert.equal(r.status, "ready");
    assert.match(cardPrompt(), /run the backfill[\s\S]*drop the old table/);
  });

  test("lists a finding only a person can settle under Needs confirmation", async () => {
    use(
      happy({
        watcher: () => finding("what should this mean?"),
        judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling({ kind: "decision", severity: "none" })),
      }),
    );
    assert.equal(await statusOf(), "ready");
    assert.ok(cardPrompt().includes("what should this mean?"), "the card comment lists the confirmation");
  });

  test("files a pre-existing finding as an issue and doesn't fix it", async () => {
    use(
      happy({
        watcher: () => finding("old bug"),
        judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling({ severity: "pre-existing" })),
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.equal(count("coder", "fix-"), 0);
    assert.ok(filingPrompt().includes("old bug"));
    assert.match(filingPrompt(), /deliver-preexisting SMR-1 [a-z0-9-]+ -->/);
  });
});

describe("the review's outcome", () => {
  test("keeps a draft when the review times out, and stops there", async () => {
    use(happy({ watcher: () => ({ ...CLEAN_REVIEW, outcome: "timed-out" }) }));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.equal(r.rounds, 0);
    assert.ok(r.draftReasons.some((x) => x.text.includes("timed-out")));
  });

  test("keeps a draft when the review was skipped, though it has no findings", async () => {
    use(happy({ watcher: () => ({ ...CLEAN_REVIEW, outcome: "skipped" }) }));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.ok(r.draftReasons.some((x) => x.text.includes("skipped")));
  });

  test("counts a project with no declared review as clean", async () => {
    use(happy({ watcher: () => ({ ...CLEAN_REVIEW, outcome: "not-declared" }) }));
    assert.equal(await statusOf(), "ready");
  });

  test("keeps waiting while the watcher reports pending", async () => {
    let n = 0;
    use(
      happy({
        watcher: () => {
          n += 1;
          return n < 3 ? { ...CLEAN_REVIEW, outcome: "pending", waitingFor: "start" } : CLEAN_REVIEW;
        },
      }),
    );
    assert.equal(await statusOf(), "ready");
    assert.equal(n, 3);
  });
});

describe("starting points", () => {
  test("a rerun after the PR opened validates once, builds nothing, and goes ready when the review is clean", async () => {
    use(happy());
    const d = freshRun();
    d.state.pr = "PR-9";
    const r = await runLoop(inputFor(d, { startAtReview: 1, built: true }));
    assert.equal(r.status, "ready");
    assert.equal(count("coder"), 0);
    assert.equal(count("validator"), 1, "the description has criterion results to rest on");
    assert.equal(count("judge", "gateway"), 0);
    assert.ok(!(calls.find((c) => c.type === "writer-pr")?.prompt ?? "").includes("No criterion results"));
  });

  test("a rerun whose tasks are built starts at validation", async () => {
    use(happy());
    await runLoop(inputFor(freshRun(), { built: true }));
    assert.equal(count("coder"), 0);
    assert.equal(count("validator"), 1);
  });
});

describe("the small flow", () => {
  const SMALL = {
    kind: "trivial" as const,
    build: null,
    specDir: "",
    small: { firstTest: "states the new behavior." },
  };

  test("runs test, fix, checks, and qa once, then the app once, with no judge or gateway", async () => {
    use(happy({ "scout-docs": () => ({ answer: "none", evidence: [], gaps: [] }) }));
    assert.equal(await statusOf(SMALL), "ready");
    assert.equal(count("coder", ": test"), 1);
    assert.equal(count("coder", ": fix"), 1);
    assert.equal(count("checks"), 1);
    assert.equal(count("qa"), 1);
    assert.equal(count("validator"), 1);
    assert.equal(count("judge"), 0);
  });

  test("gives the first test its instruction", async () => {
    use(happy({ "scout-docs": () => ({ answer: "none", evidence: [], gaps: [] }) }));
    await statusOf(SMALL);
    const first = calls.find((c) => c.label === "change: test");
    assert.ok(first?.prompt.includes("states the new behavior."));
    assert.ok(first?.prompt.includes("the issue"));
  });

  test("skips the writer when the scout finds no affected docs", async () => {
    use(happy({ "scout-docs": () => ({ answer: "none", evidence: [], gaps: [] }) }));
    await statusOf(SMALL);
    assert.equal(count("scout-docs"), 1);
    assert.equal(count("writer-docs"), 0);
  });

  test("runs the writer when the scout finds affected docs", async () => {
    const found = { answer: "one", evidence: [{ source: "docs/a.md", location: "x", excerpt: "y" }], gaps: [] };
    use(happy({ "scout-docs": () => found }));
    await statusOf(SMALL);
    assert.equal(count("writer-docs"), 1);
    assert.ok(calls.some((c) => c.type === "writer-docs" && c.prompt.includes("docs/a.md")));
    assert.equal(count("lens-docs"), 0);
  });

  test("sends failing checks back to the coder before qa sees it", async () => {
    let n = 0;
    use(
      happy({
        "scout-docs": () => ({ answer: "none", evidence: [], gaps: [] }),
        checks: () => {
          n += 1;
          return n === 1 ? { commands: [{ command: "lint", exitCode: 1, failingLines: "bad" }] } : CHECKS_OK;
        },
      }),
    );
    assert.equal(await statusOf(SMALL), "ready");
    assert.equal(count("coder", ": fix"), 2);
    assert.equal(count("qa"), 1);
  });

  test("fixes a review finding with only the checks, not qa or the app", async () => {
    let review = 0;
    use(
      happy({
        "scout-docs": () => ({ answer: "none", evidence: [], gaps: [] }),
        watcher: () => {
          review += 1;
          return review === 1 ? finding("bug") : CLEAN_REVIEW;
        },
      }),
    );
    assert.equal(await statusOf(SMALL), "ready");
    assert.equal(count("coder", "fix-1: fix"), 1);
    assert.equal(count("qa"), 1);
    assert.equal(count("validator"), 1);
    assert.equal(count("checks"), 2);
  });

  test("sends a failed app run back to the coder before opening the PR, and runs the app again", async () => {
    let n = 0;
    use(
      happy({
        "scout-docs": () => ({ answer: "none", evidence: [], gaps: [] }),
        validator: () => {
          n += 1;
          return n === 1
            ? { results: [{ ...PASS_ROW, result: "fail", detail: "step 2" }], uncategorizedSetting: "draft" }
            : VALIDATOR_PASS;
        },
      }),
    );
    assert.equal(await statusOf(SMALL), "ready");
    assert.equal(count("validator"), 2);
    assert.equal(count("judge"), 0);
    const [first, second] = pushPrompts();
    assert.ok(first?.includes("Open no PR yet"));
    assert.ok(second?.includes("open the branch's PR"));
  });

  test("keeps a recurring finding open as a draft instead of asking for a ruling", async () => {
    use(
      happy({
        "scout-docs": () => ({ answer: "none", evidence: [], gaps: [] }),
        watcher: () => finding("same bug"),
        judge: () => ruling({ fingerprint: "same" }),
      }),
    );
    const { status, draftReasons } = await runLoop(inputFor(freshRun(), SMALL));
    assert.equal(status, "draft");
    assert.ok(draftReasons.length > 0);
    assert.ok(calls.filter((c) => c.type === "judge").every((c) => c.prompt.includes("The ruling is none.")));
  });
});

// SMR-402: a fix round can ask for a test of behavior the code already has. No code fails such a test, so asking it to
// fail first only stops the run.
describe("a guard test in a fix round", () => {
  const BUGFIX = {
    kind: "bugfix" as const,
    build: null,
    specDir: "",
    small: { firstTest: "fails now the way the reproduction shows." },
  };
  const GUARD_ASK = "no test pins that a marker the board leaves alone stays byte for byte";
  const NO_CODE_FAILS =
    "No existing code fails this test: the behavior it states is already there, so it can't fail on the current code.";
  // A coder that can write the guard test but can't make it fail on the current code. When the dispatch allows a test
  // that already passes, it writes the guard and says so with no failing output; otherwise it stops.
  const coder: Script = (_t, label, prompt) => {
    if (!label.endsWith(": test")) return OK_FIX;
    if (!prompt.includes(GUARD_ASK)) return OK_TEST;
    return prompt.includes("may already pass on the current code")
      ? { ...OK_TEST, failingOutput: "" }
      : { ...OK_TEST, failingOutput: "", specProblem: NO_CODE_FAILS };
  };
  const guardRun = (over: Partial<Record<string, Script>>): Script =>
    happy({ "scout-docs": () => ({ answer: "none", evidence: [], gaps: [] }), coder, ...over });
  const once = (first: Reply, then: Reply): Script => {
    let n = 0;
    return () => {
      n += 1;
      return n === 1 ? first : then;
    };
  };

  const reviewAsks = (): Script => once(finding(GUARD_ASK), CLEAN_REVIEW);
  const qaAsks: Reply = {
    verdict: "fail",
    evaluated: "x",
    findings: [{ location: "a.test.ts", problem: GUARD_ASK, blocking: true }],
    limits: "none",
    testAtFault: true,
  };
  const CASES: { name: string; id: string; over: () => Partial<Record<string, Script>> }[] = [
    { name: "qa says the test is at fault", id: "change", over: () => ({ qa: once(qaAsks, QA_PASS) }) },
    {
      name: "the judge rules a review finding code-kind",
      id: "fix-1",
      over: () => ({ watcher: reviewAsks() }),
    },
    {
      name: "the app run fails",
      id: "fix-1",
      over: () => ({
        validator: once(
          { results: [{ ...PASS_ROW, result: "fail", detail: GUARD_ASK }], uncategorizedSetting: "draft" },
          VALIDATOR_PASS,
        ),
      }),
    },
  ];

  for (const { name, id, over } of CASES) {
    test(`when ${name}, lets the guard test pass on the current code, commits it, and goes ready`, async () => {
      use(guardRun(over()));
      const r = await runLoop(inputFor(freshRun(), BUGFIX));
      const guardAt = calls.findIndex((c) => c.label === `${id}: test` && c.prompt.includes(GUARD_ASK));
      assert.ok(guardAt !== -1, "the guard test is asked for");
      assert.ok(calls[guardAt]?.prompt.includes("may already pass on the current code"));
      const after = calls.slice(guardAt + 1);
      assert.ok(
        after.some((c) => c.type === "pusher" && new RegExp(`^commit: add .*test for ${id}$`).test(c.label)),
        "the guard test is committed",
      );
      assert.ok(
        after.some((c) => c.label === `${id}: qa` && c.prompt.includes("when the behavior it states is broken")),
        "qa proves the guard test by breaking the behavior it states",
      );
      assert.deepEqual(r.draftReasons, []);
      assert.equal(r.status, "ready");
    });
  }

  test("keeps fail first for the first test", async () => {
    use(guardRun({}));
    await runLoop(inputFor(freshRun(), BUGFIX));
    assert.ok(calls.find((c) => c.label === "change: test")?.prompt.includes("must fail on the current code"));
  });

  test("still stops as a draft on a coder's question about what to build", async () => {
    const OPEN = "the report doesn't say which markers the board rewrites";
    const asked: Script = (t, label, prompt) =>
      label === "fix-1: test" ? { ...OK_TEST, specProblem: OPEN } : coder(t, label, prompt);
    use(guardRun({ watcher: reviewAsks(), coder: asked }));
    const { status, draftReasons } = await runLoop(inputFor(freshRun(), BUGFIX));
    assert.equal(status, "draft");
    assert.ok(draftReasons.some((x) => x.text.includes(OPEN)));
  });
});

describe("parallel inner loops", () => {
  const two: Build = {
    shared: [],
    tasks: [
      { id: "a", dependsOn: [], files: ["a.ts"], criteria: [], todo: "", reuse: [], create: [] },
      { id: "b", dependsOn: ["a"], files: ["b.ts"], criteria: [], todo: "", reuse: [], create: [] },
    ],
    docs: [],
    decisions: [],
    manualActions: [],
  };

  test("runs a dependent task after the one it needs", async () => {
    use(happy());
    await runLoop(inputFor(freshRun(), { build: two }));
    const order = calls.filter((c) => c.type === "coder").map((c) => c.label);
    assert.ok(order.indexOf("a: fix") < order.indexOf("b: test"));
  });

  test("fixes one problem at a time, since a fix's test can land in any file", async () => {
    use(fallingReviews([2, 0]));
    await runLoop(inputFor(freshRun()));
    const order = calls.filter((c) => c.type === "coder").map((c) => c.label);
    assert.ok(order.includes("fix-1: fix") && order.includes("fix-2: test"));
    assert.ok(order.lastIndexOf("fix-1: fix") < order.indexOf("fix-2: test"));
  });

  test("updates the card in its own brief, and halts when pusher reports no card operation", async () => {
    use(
      happy({
        pusher: (_t, label, prompt) =>
          label === "update the card" ? { done: true, unmet: [], operations: [] } : pusher(prompt),
      }),
    );
    const d = freshRun();
    await assert.rejects(runLoop(inputFor(d)), (error: unknown) => {
      assert.ok(JSON.stringify(stopOf(d, error).needs).includes("no card operation"));
      return error instanceof Halt;
    });
    const card = calls.find((c) => c.label === "update the card")?.prompt ?? "";
    assert.ok(card.includes("such as a status move"));
    assert.ok(
      card.includes("Nothing is open") && !card.includes("- none"),
      "an empty open list doesn't read as no operations",
    );
    assert.ok(!(calls.find((c) => c.label === "mark the PR ready")?.prompt ?? "").includes("comment on the card"));
  });

  test("turns a refused commit into a halt, even inside a wave", async () => {
    use(happy({ pusher: () => ({ done: false, unmet: ["push denied"], operations: [] }) }));
    const d = freshRun();
    await assert.rejects(runLoop(inputFor(d)), (error: unknown) => {
      const stopped = stopOf(d, error);
      assert.equal(stopped.status, "blocked");
      assert.ok(JSON.stringify(stopped.needs).includes("push denied"));
      return error instanceof Halt;
    });
  });
});

describe("the document flow", () => {
  const revisions: (readonly string[])[] = [];
  const DOC = (problems: { source: string; location: string; text: string }[][] = []) => {
    let checked = 0;
    revisions.length = 0;
    return {
      kind: "spike" as const,
      build: null,
      validate: null,
      specDir: "",
      built: true,
      document: {
        paths: ["docs/spikes/smr-1.md"],
        check: () => {
          checked += 1;
          return Promise.resolve(problems[checked - 1] ?? []);
        },
        revise: (p: readonly string[]) => {
          revisions.push(p);
          return Promise.resolve(["docs/spikes/smr-1.md"]);
        },
        severity: "severity-spike.md",
      },
    };
  };
  const UNCITED = { source: "lens-evidence", location: "docs/spikes/smr-1.md:4", text: "uncited claim" };

  test("validates the document, opens the PR, and goes ready with no coder, qa, or validator", async () => {
    use(happy());
    assert.equal(await statusOf(DOC()), "ready");
    assert.equal(count("coder"), 0);
    assert.equal(count("qa"), 0);
    assert.equal(count("validator"), 0);
    assert.equal(count("checks"), 1);
    assert.ok(lastWriterPrompt().includes("docs/spikes/smr-1.md"), "writer-pr is told the document");
  });

  test("sends a confirmed problem from the document's checks to its writer, whatever its kind", async () => {
    use(happy({ judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling({ kind: "code" })) }));
    assert.equal(await statusOf(DOC([[UNCITED]])), "ready");
    assert.deepEqual(revisions, [[`${UNCITED.location}: ${UNCITED.text}`]]);
    assert.equal(count("coder"), 0);
    assert.ok(calls.some((c) => c.label === "commit: revise the findings"));
  });

  const WORDING = { source: "lens-evidence", location: "docs/spikes/smr-1.md:9", text: "awkward wording" };
  const minorWording: Script = (_t, label, prompt) =>
    label === "gateway" ? GATEWAY_OK : ruling(prompt.includes(WORDING.text) ? { severity: "minor", kind: "docs" } : {});

  test("rates blocker and major by the document's own severity reference", async () => {
    use(happy({ judge: minorWording }));
    await statusOf(DOC([[UNCITED]]));
    assert.match(
      judgePrompts()[0] ?? "",
      /blocker and major as the severity reference severity-spike\.md defines them/,
    );
  });

  test("lists a minor problem as a suggestion, starts no round for it, and says so in the result", async () => {
    use(happy({ judge: minorWording }));
    const r = await runLoop(inputFor(freshRun(), DOC([[WORDING]])));
    assert.equal(r.status, "ready");
    assert.equal(r.rounds, 0);
    assert.deepEqual(revisions, []);
    // The description has no suggestions section any more: an unfixed finding sits only under Not done (d19).
    assert.doesNotMatch(r.review, /suggestion/i, "the summary names no old section");
    assert.match(r.review, /\b1\b/, "the summary counts the unfixed finding");
    assert.match(r.review, /Not done/, "the summary says where the description lists it");
    assert.ok(lastWriterPrompt().includes("awkward wording"), "writer-pr is told the suggestion");
  });

  test("applies a minor problem when a round runs for another, and drops it from the suggestions", async () => {
    use(happy({ judge: minorWording }));
    const r = await runLoop(inputFor(freshRun(), DOC([[UNCITED, WORDING]])));
    assert.equal(r.status, "ready");
    assert.deepEqual(revisions, [[`${UNCITED.location}: ${UNCITED.text}`, `${WORDING.location}: ${WORDING.text}`]]);
    assert.equal(r.review, "clean");
    assert.ok(!lastWriterPrompt().includes("awkward wording"));
  });

  test("sends a review finding to the writer and checks the document again", async () => {
    let review = 0;
    use(
      happy({
        watcher: () => {
          review += 1;
          return review === 1 ? finding("the answer skips part two") : CLEAN_REVIEW;
        },
      }),
    );
    assert.equal(await statusOf(DOC()), "ready");
    assert.equal(revisions.length, 1);
    assert.equal(count("checks"), 2);
    assert.equal(count("judge", "gateway"), 0);
  });
});

const DESCRIPTION_REASON = "The PR description did not pass its check.";
const EXTRA_HEADING = "It has a heading other than";
const firstOnly = (n: number): boolean => n === 1;
const always = (): boolean => true;
// A body checkDescription refuses for its format, and that leaks nothing.
const misformatted = (body: string): string => `${body}\n\n## Notes\n\n- One more thing.`;
// writer-pr's n-th description, told apart by its opening line; misformatted while n is in bad.
const nthBody = (prompt: string, n: number, bad: (n: number) => boolean = () => false): string => {
  const body = prBody(prompt, `The change is delivered, take ${String(n)}.`);
  return bad(n) ? misformatted(body) : body;
};
const numberedWriter = (bad?: (n: number) => boolean): Script => {
  let n = 0;
  return (_t, _l, prompt) => {
    n += 1;
    return { body: nthBody(prompt, n, bad) };
  };
};
const bodies = (bad?: (n: number) => boolean): string[] =>
  calls.filter((c) => c.type === "writer-pr").map((c, i) => nthBody(c.prompt, i + 1, bad));
// The body sits on its own lines, and the line that closes its fence appears nowhere in it.
function fencedIn(prompt: string, body: string): boolean {
  const at = prompt.indexOf(`\n${body}\n`);
  if (at === -1) return false;
  const close =
    prompt
      .slice(at + body.length + 2)
      .split("\n", 1)[0]
      ?.trim() ?? "";
  return close !== "" && !body.includes(close);
}
const postings = () => calls.filter((c) => isPosting(c));
const pusherCalls = () => calls.filter((c) => c.type === "pusher");
const PROGRESS = /progress \d+ (?:finding|ruling|tried|changed):/;
const ledgerBlock = (prompt: string): string =>
  /Append these lines[^\n]*\n([\s\S]*?)(?:\n\n|$)/.exec(prompt)?.[1] ?? "";
const ledgerLines = (): string[] => pusherCalls().flatMap((c) => ledgerBlock(c.prompt).split("\n"));
const reviewThenClean = (text: string): Script => {
  let review = 0;
  return happy({
    watcher: () => {
      review += 1;
      return review === 1 ? finding(text) : CLEAN_REVIEW;
    },
  });
};
const withDefaultFence = (prompt: string): string => `${prBody(prompt)}\n<<<BODY\nBODY>>>\n- still the body`;
const CARD_OP = { op: "card", result: "filed", reference: "SMR-77", link: "https://linear.app/t/issue/SMR-77" };
const preExisting = (filing: Reply): Script =>
  happy({
    watcher: () => finding("old bug"),
    judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling({ severity: "pre-existing" })),
    pusher: (_t, _l, prompt) => (prompt.includes("File one card") ? filing : pusher(prompt)),
  });
async function settledRun(input: LoopInput): Promise<unknown> {
  try {
    return await runLoop(input);
  } catch (error) {
    return error;
  }
}

describe("the PR description", () => {
  test("every push that opens or updates the PR runs writer-pr, then pusher (deliver-story)", async () => {
    use(reviewThenClean("bug"));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.ok(postings().length >= 3, "the PR opens, is updated after the fix, and is finished");
    assert.ok(describedBeforeEachPosting());
  });

  test("every push that opens or updates the PR runs writer-pr, then pusher (the small flow)", async () => {
    use(happy({ "scout-docs": () => ({ answer: "none", evidence: [], gaps: [] }) }));
    await runLoop(inputFor(freshRun(), { kind: "bugfix", build: null, specDir: "", small: { firstTest: "fails." } }));
    assert.ok(postings().length >= 2);
    assert.ok(describedBeforeEachPosting());
  });

  test("every push that opens or updates the PR runs writer-pr, then pusher (the document flow)", async () => {
    use(happy());
    const document = {
      paths: ["docs/spikes/smr-1.md"],
      check: () => Promise.resolve([]),
      revise: () => Promise.resolve([]),
      severity: "severity-spike.md",
    };
    await runLoop(
      inputFor(freshRun(), { kind: "research", build: null, validate: null, specDir: "", built: true, document }),
    );
    assert.ok(postings().length >= 2);
    assert.ok(describedBeforeEachPosting());
  });

  test("the pusher's body is the last writer-pr body, unchanged", async () => {
    use(happy({ "writer-pr": numberedWriter() }));
    await runLoop(inputFor(freshRun()));
    const written = bodies();
    assert.ok(written.length >= 2);
    const [opening, final] = postings();
    assert.ok(fencedIn(opening?.prompt ?? "", written[0] ?? "x"), "the opening push posts the first stage's body");
    assert.ok(fencedIn(final?.prompt ?? "", written.at(-1) ?? "x"), "the final update posts the last body");
  });

  test("a body that holds the default fence is posted byte-identical", async () => {
    use(happy({ "writer-pr": (_t, _l, prompt) => ({ body: withDefaultFence(prompt) }) }));
    await runLoop(inputFor(freshRun()));
    const body = withDefaultFence(writerPrompts()[0] ?? "");
    const posted = postings();
    assert.ok(posted.length >= 2);
    assert.ok(
      posted.every((p) => fencedIn(p.prompt, body)),
      "every posting embeds it whole",
    );
  });

  test("a leaking last body is never posted; the latest leak-free one is, unchanged", async () => {
    const LEAK = "See /Users/me/wt/src/a.ts for the change.";
    let n = 0;
    use(
      happy({
        "writer-pr": (_t, _l, prompt) => {
          n += 1;
          return { body: n === 1 ? misformatted(prBody(prompt)) : `${prBody(prompt)}\n\n${LEAK}` };
        },
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    const first = misformatted(prBody(writerPrompts()[0] ?? ""));
    assert.ok(writerPrompts().length > 1);
    assert.ok(fencedIn(postings()[0]?.prompt ?? "", first));
    assert.ok(pusherCalls().every((c) => !c.prompt.includes(LEAK)));
    assert.equal(r.status, "draft");
  });

  test("a format problem sends writer-pr back with it, and the revision is checked again", async () => {
    const bad = firstOnly;
    use(happy({ "writer-pr": numberedWriter(bad) }));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    const opening = calls.findIndex((c) => isPosting(c));
    const stage = calls.slice(0, opening).filter((c) => c.type === "writer-pr");
    assert.equal(stage.length, 2);
    const revision = stage[1]?.prompt ?? "";
    assert.ok(revision.includes(EXTRA_HEADING), "the revision brief carries the problem");
    assert.ok(revision.includes(bodies(bad)[0] ?? "x"), "the revision brief carries the previous body");
    assert.ok(fencedIn(calls[opening]?.prompt ?? "", bodies(bad)[1] ?? "x"), "the checked revision is posted");
    assert.ok(
      judgePrompts().every((p) => !p.includes(EXTRA_HEADING)),
      "a description problem never reaches the judge",
    );
  });

  test("after three failed revisions the last one is posted and the run ends draft with the description reason", async () => {
    const bad = always;
    use(happy({ "writer-pr": numberedWriter(bad) }));
    const r = await runLoop(inputFor(freshRun()));
    const finalAt = calls.findIndex((c) => /mark the PR ready|report the draft/.test(c.label));
    const openedAt = calls.findIndex((c) => isPosting(c));
    const finalStage = calls.slice(openedAt + 1, finalAt);
    assert.equal(
      finalStage.filter((c) => c.type === "writer-pr").length,
      4,
      "the first description and three revisions",
    );
    assert.ok(fencedIn(finalPrompt(), bodies(bad).at(-1) ?? "x"));
    assert.equal(r.status, "draft");
    assert.ok(r.draftReasons.some((x) => x.text === DESCRIPTION_REASON));
    assert.ok(cardPrompt().includes(DESCRIPTION_REASON), "the card comment carries it");
    assert.ok(bodies(bad).every((b) => !b.includes(DESCRIPTION_REASON)));
  });

  test("the writer-pr brief carries the card, the diff instruction, the ledger path, and the criterion results and open items", async () => {
    use(happy({ qa: () => QA_FAIL }));
    await runLoop(inputFor(freshRun()));
    const brief = lastWriterPrompt();
    for (const part of ["SMR-1", "the issue", "/p/wt", "/p/wt/.tmp/ledger.md", "Criterion results", "it works"]) {
      assert.ok(brief.includes(part), part);
    }
    assert.match(brief, /diff/);
    assert.match(brief, /target branch/);
    assert.ok(brief.includes("Open items"));
    assert.ok(brief.includes("src/a.ts: wrong"), "the open blocker");
  });

  test("each round's findings, rulings, attempts and changes ride on a pusher dispatch as progress entries", async () => {
    use(reviewThenClean("off by one"));
    await runLoop(inputFor(freshRun()));
    const lines = ledgerLines();
    assert.ok(
      lines.some((l) => /^- progress \d+ finding: .*off by one/.test(l)),
      "the finding",
    );
    assert.ok(
      lines.some((l) => /^- progress \d+ ruling: .*seen/.test(l)),
      "the ruling with its reason",
    );
    assert.ok(
      lines.some((l) => l.startsWith("- progress 1 tried: ")),
      "what round 1 tried",
    );
    assert.ok(
      lines.some((l) => /^- progress 1 changed: .*src\/a\.ts/.test(l)),
      "what round 1 changed",
    );
  });

  test("no pusher instruction, body or comment contains a progress entry", async () => {
    use(reviewThenClean("off by one"));
    await runLoop(inputFor(freshRun()));
    assert.ok(
      ledgerLines().some((l) => PROGRESS.test(l)),
      "the run wrote progress entries",
    );
    const leaked = pusherCalls().filter((c) => PROGRESS.test(c.prompt.replace(ledgerBlock(c.prompt), "")));
    assert.deepEqual(
      leaked.map((c) => c.label),
      [],
    );
  });

  test("a resumed run's writer-pr brief points it at the ledger's earlier progress entries", async () => {
    use(happy());
    const d = freshRun();
    d.state.pr = "PR-9";
    await runLoop(inputFor(d, { startAtReview: 1, built: true }));
    const brief = lastWriterPrompt();
    assert.ok(brief.includes("/p/wt/.tmp/ledger.md"));
    assert.match(brief, /progress entr/);
  });

  test("deliver-story's writer-pr brief requires the Spec: <folder> line", async () => {
    use(happy());
    await runLoop(inputFor(freshRun()));
    const brief = lastWriterPrompt();
    assert.ok(brief.includes("Spec: docs/specs/smr-1"), brief.slice(0, 200));
    assert.ok(!brief.includes("Spec: `"));
  });

  test("filed cards reach the final writer-pr brief with their identifiers and links", async () => {
    use(preExisting({ done: true, unmet: [], operations: [CARD_OP] }));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    const filedAt = calls.findIndex((c) => c.type === "pusher" && c.prompt.includes("File one card"));
    const lastWriterAt = calls.findLastIndex((c) => c.type === "writer-pr");
    assert.ok(filedAt !== -1 && filedAt < lastWriterAt, "the cards are filed before the final description");
    assert.ok(lastWriterPrompt().includes("SMR-77"));
    assert.ok(lastWriterPrompt().includes(CARD_OP.link));
  });

  test("a partial card filing failure doesn't halt the run", async () => {
    use(preExisting({ done: false, unmet: ["card: the second card failed"], operations: [CARD_OP] }));
    const r = await settledRun(inputFor(freshRun()));
    assert.ok(!(r instanceof Halt), String(r));
    assert.ok(lastWriterPrompt().includes("SMR-77"));
  });

  for (const [name, filing] of [
    ["fails outright", null],
    ["fails part way", { done: false, unmet: ["card: the second card failed"], operations: [] }],
  ] as const) {
    test(`a follow-up whose card filing ${name} stays in the PR description, the card comment and the run result`, async () => {
      use(preExisting(filing));
      const r = await runLoop(inputFor(freshRun()));
      assert.ok(lastWriterPrompt().includes("old bug"), "the final writer-pr brief lists the unfiled follow-up");
      assert.ok(cardPrompt().includes("old bug"), "the card comment lists the unfiled follow-up");
      assert.ok(JSON.stringify(r).includes("old bug"), "the run result carries the unfiled follow-up");
    });
  }

  // SMR-372: a board that links an identifier or a domain on save has filed the follow-up card in full.
  test("a follow-up filed on a board that rewrites its text is reported filed, and a rerun reuses its card", async () => {
    clearBoard();
    const filing = linearPusher();
    const script = happy({
      watcher: () => finding("old bug split out of SMR-317 at Intervals.icu"),
      judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling({ severity: "pre-existing" })),
      pusher: (t, l, prompt) => (prompt.includes("File one card") ? filing(t, l, prompt) : pusher(prompt)),
    });
    use(script);
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(board.length, 1, "the follow-up got one card");
    assert.ok(!JSON.stringify(r).includes("not confirmed filed"), "the filed follow-up was reported unfiled");
    calls.length = 0;
    await runLoop(inputFor(freshRun()));
    assert.equal(board.length, 1, `the rerun filed another card: ${board.map((c) => c.id).join(", ")}`);
  });

  test("a large run with dozens of coder choices and confirmations fits and ends ready", async () => {
    const ids = Array.from({ length: 26 }, (_, i) => `c${String(i + 1)}`);
    const validate: Validate = {
      criteria: ids.map((id) => ({
        id,
        wording: `${id} works`,
        category: "UI",
        path: "flow",
        evidence: "shot",
        firstTest: "t",
      })),
    };
    const decisions = Array.from({ length: 14 }, (_, i) => ({
      id: `d${String(i + 1)}`,
      question: `Which store for part ${String(i + 1)}?`,
      choice: "the existing one",
      rationale: "reuse",
      reversible: true,
      permission: "",
      affectsAcceptance: i % 2 === 0,
    }));
    const choices = Array.from(
      { length: 30 },
      (_, i) => `How to name helper ${String(i + 1)}? helper${String(i + 1)}.`,
    );
    const questions = Array.from({ length: 24 }, (_, i) => `what should rule ${String(i + 1)} mean?`);
    use(
      happy({
        coder: (_t, label) => (label.endsWith(": test") ? OK_TEST : { ...OK_FIX, assumptions: choices }),
        validator: () => ({ results: ids.map((id) => ({ ...PASS_ROW, id })), uncategorizedSetting: "draft" }),
        watcher: () => ({
          ...CLEAN_REVIEW,
          findings: questions.map((text, i) => ({ id: `f${String(i)}`, location: "", text })),
        }),
        judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling({ kind: "decision", severity: "none" })),
      }),
    );
    const r = await runLoop(inputFor(freshRun(), { validate, build: { ...BUILD, decisions } }));
    assert.equal(r.status, "ready");
    const posted = prBody(lastWriterPrompt());
    assert.ok(fencedIn(finalPrompt(), posted));
    assert.ok(posted.length <= 4000);
    assert.deepEqual(checkDescription(posted, { kind: "story", specDir: "docs/specs/smr-1" }), {
      leak: [],
      format: [],
    });
    const missing = [...questions, ...decisions.map((d) => d.question)].filter((x) => !cardPrompt().includes(x));
    assert.deepEqual(missing, [], "the card comment lists each in full");
  });

  test("writer-pr never returning a body halts the run as declared", async () => {
    use(happy({ "writer-pr": () => null }));
    const d = freshRun();
    await assert.rejects(runLoop(inputFor(d)), (error: unknown) => {
      const stopped = stopOf(d, error);
      assert.equal(stopped.status, "blocked");
      return error instanceof Halt;
    });
    assert.equal(postings().length, 0, "nothing posts a description");
    assert.ok(calls.find((c) => c.label === "report the halt")?.prompt.includes("Comment on card"));
  });
});

// SMR-404: the pusher refuses a progress line, or reports one out of order, while every operation it was asked for
// succeeded, as the live pusher did in wf_ce30743f-626.
const LONG = Array.from({ length: 120 }, (_, i) => `src/module-${String(i)}/a-fairly-long-file-name-${String(i)}.ts`);
const progressRefusing =
  (refuse: (line: string) => string | null): Script =>
  (_t, label, prompt) => {
    const base = pusher(prompt) as typeof OK_PUSH;
    const unmet = ledgerBlock(prompt)
      .split("\n")
      .map((l) => (/^- progress \d+ \w+: /.test(l) ? refuse(l.slice(2)) : null))
      .filter((u): u is string => u !== null);
    if (unmet.length === 0) return base;
    const ops =
      label === "push the round"
        ? [...base.operations, { op: "push", reference: "5d4d638" }, { op: "review-trigger", reference: "18:59:30Z" }]
        : base.operations;
    return { done: false, unmet, operations: ops, hookRejection: "" };
  };

describe("a progress line the pusher refuses", () => {
  test("a shortened progress line it won't append doesn't block the push, and the run reaches the review", async () => {
    use(
      happy({
        coder: (_t, label) => (label.endsWith(": test") ? OK_TEST : { ...OK_FIX, changed: LONG }),
        pusher: progressRefusing((line) =>
          line.length > 1000
            ? `Ledger line '${line.slice(0, 20)}...' was not appended. The brief's text for it is cut off with '...', so it cannot be copied whole without altering the data.`
            : null,
        ),
      }),
    );
    const r = await settledRun(inputFor(freshRun()));
    assert.ok(
      ledgerLines().some((l) => /^- progress \d+ changed: /.test(l) && l.length > 1000),
      "the run sent a long changed line",
    );
    assert.ok(!(r instanceof Halt), `the run halted: ${String(r)}`);
    assert.ok(count("watcher") > 0, "the run reached the Review phase");
    assert.ok(["ready", "draft"].includes((r as { status: string }).status));
  });

  test("a progress line it reports out of order doesn't block the push, and the run reaches the review", async () => {
    use(
      happy({
        pusher: progressRefusing((line) => {
          const m = /^progress (\d+) (\w+):/.exec(line);
          return m
            ? `Ledger line 'progress ${m[1] ?? ""} ${m[2] ?? ""}' was appended out of order, after 'done round ${m[1] ?? ""}'.`
            : null;
        }),
      }),
    );
    const r = await settledRun(inputFor(freshRun()));
    assert.ok(
      ledgerLines().some((l) => PROGRESS.test(l)),
      "the run sent progress lines",
    );
    assert.ok(!(r instanceof Halt), `the run halted: ${String(r)}`);
    assert.ok(count("watcher") > 0, "the run reached the Review phase");
    assert.ok(["ready", "draft"].includes((r as { status: string }).status));
  });
});

// SMR-405: a spec revision during the build reruns only the tasks it changed, and a rebuild of a change that is already
// committed neither demands a new failing test nor blocks on a commit with nothing left to commit.
const revisionTask = (id: string, file: string, criterion: string, todo: string) => ({
  id,
  dependsOn: [],
  files: [file],
  criteria: [criterion],
  todo,
  reuse: [],
  create: [],
});
const SPEC_JUDGE: Script = (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling({ kind: "spec" }));
const C2 = { ...PASS_ROW, id: "c2" };
// The first review finds a problem at a location that names no task, file, or criterion, and it is ruled a spec fault.
const specFinding = (): Script => {
  let review = 0;
  return () => {
    review += 1;
    return review === 1
      ? { ...CLEAN_REVIEW, findings: [{ id: "f1", location: "design", text: "the design keeps a legacy path" }] }
      : CLEAN_REVIEW;
  };
};
const listedPaths = (prompt: string): string[] =>
  prompt
    .split("\n")
    .filter((x) => x.startsWith("- "))
    .map((x) => x.slice(2).trim());

// Models git in the worktree: a path is dirty only while a producer has written content not yet committed. On the
// rebuild the coder writes back what is already committed, so git has nothing to commit, and pusher reports that in
// its typed `alreadyCommitted` field. `failing` is a path the first fix reports changed whose commit fails, with the
// unmet entry pusher returns for it.
function gitLike(failing?: { path: string; unmet: string }): Script {
  const dirty = new Set<string>();
  let tests = 0;
  let fixes = 0;
  return happy({
    watcher: specFinding(),
    judge: SPEC_JUDGE,
    coder: (_t, label) => {
      if (label.endsWith(": test")) {
        tests += 1;
        if (tests === 1) dirty.add("a.test.ts");
        return { ...OK_TEST, failingOutput: tests === 1 ? "red" : "" };
      }
      fixes += 1;
      if (fixes === 1) dirty.add("src/a.ts");
      return { ...OK_FIX, changed: failing && fixes === 1 ? ["src/a.ts", failing.path] : ["src/a.ts"] };
    },
    pusher: (_t, label, prompt) => {
      if (!label.startsWith("commit:")) return pusher(prompt);
      const listed = listedPaths(prompt);
      if (failing && listed.includes(failing.path))
        return { done: false, unmet: [failing.unmet], operations: [], hookRejection: "", alreadyCommitted: false };
      if (listed.every((p) => !dirty.has(p)))
        return {
          done: false,
          unmet: ["nothing to commit: git status --short printed nothing"],
          operations: [],
          hookRejection: "",
          alreadyCommitted: true,
        };
      for (const p of listed) dirty.delete(p);
      return OK_PUSH;
    },
  });
}
// The revision changes t1, so it is rebuilt, though its test and fix are already committed and pass.
const rebuilding = (d: Run): LoopInput =>
  inputFor(d, {
    reviseSpec: async () => {
      await Promise.resolve();
      const tasks = BUILD.tasks.map((t) => ({ ...t, todo: `${t.todo}, revised` }));
      return { build: { ...BUILD, tasks }, validate: VALIDATE, rerun: tasks };
    },
  });
async function rebuildOutcome(d: Run): Promise<{ status: string; needs: string }> {
  try {
    const r = await runLoop(rebuilding(d));
    return { status: r.status, needs: "" };
  } catch (error) {
    const s = stopOf(d, error);
    return { status: s.status, needs: JSON.stringify(s.needs) };
  }
}

describe("a spec revision during the build", () => {
  test("reruns only the tasks the revision changed, when the problem names none", async () => {
    const t1 = revisionTask("t1", "src/a.ts", "c1", "remove the client");
    const two: Build = { ...BUILD, tasks: [t1, revisionTask("t2", "src/b.ts", "c2", "remove the server")] };
    const validate: Validate = {
      criteria: [...VALIDATE.criteria, ...VALIDATE.criteria.map((c) => ({ ...c, id: "c2" }))],
    };
    const revised = { ...two, tasks: [t1, revisionTask("t2", "src/b.ts", "c2", "remove the server, revised")] };
    const agents = happy({
      watcher: specFinding(),
      judge: SPEC_JUDGE,
      "writer-spec": () => ({ build: revised, validate, claims: [] }),
      validator: () => ({ results: [PASS_ROW, C2], uncategorizedSetting: "draft" }),
    });
    use((type, label, prompt) => (type.startsWith("advisor-") ? { findings: [] } : agents(type, label, prompt)));
    const d = freshRun();
    await runLoop(
      inputFor(d, {
        build: two,
        validate,
        reviseSpec: specReviser({
          d,
          where: "project",
          story: "the issue",
          storyRevision: "abc",
          cardId: "SMR-1",
          specDir: "docs/specs/smr-1",
          answers: {},
        }),
      }),
    );
    assert.equal(count("writer-spec"), 1, "the spec was revised once");
    assert.equal(count("coder", "t2: test"), 2, "t2, which the revision changed, is built again");
    assert.equal(count("coder", "t1: test"), 1, "t1, which the revision left unchanged, is not built again");
  });

  test("lets a rebuilt change's existing, passing test stand instead of demanding a new failing test", async () => {
    use(gitLike());
    await rebuildOutcome(freshRun());
    const briefs = calls.filter((c) => c.type === "coder" && c.label === "t1: test").map((c) => c.prompt);
    assert.equal(briefs.length, 2, "t1 is rebuilt once after the revision");
    assert.ok(
      briefs[1]?.includes("may already pass"),
      "the rebuild's test brief demands a new failing test though t1's test is committed and passing",
    );
  });

  test("counts a commit whose listed content is already committed as done, and does not block", async () => {
    use(gitLike());
    const r = await rebuildOutcome(freshRun());
    assert.notEqual(r.status, "blocked", `the run ended blocked: ${r.needs}`);
  });

  test("still blocks on a commit that fails because a listed path was never written", async () => {
    use(gitLike({ path: "src/never.ts", unmet: "commit: pathspec 'src/never.ts' did not match any files" }));
    const r = await rebuildOutcome(freshRun());
    assert.equal(r.status, "blocked");
    assert.ok(r.needs.includes("src/never.ts"), r.needs);
  });

  test("still blocks on a failed commit whose unmet entry quotes git's 'nothing to commit' but is not already committed", async () => {
    // git add refuses a gitignored path, so git commit prints its own 'nothing to commit' line, which pusher quotes.
    const unmet =
      "commit: The following paths are ignored by one of your .gitignore files: src/ignored.ts\nnothing to commit, working tree clean";
    use(gitLike({ path: "src/ignored.ts", unmet }));
    const r = await rebuildOutcome(freshRun());
    assert.equal(r.status, "blocked", "a commit failure that quotes git's output counted as already committed");
    assert.ok(r.needs.includes("src/ignored.ts"), r.needs);
  });
});
