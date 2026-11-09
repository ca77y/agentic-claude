// Runs the outer and inner loops with scripted agents, so their control flow is tested without any model.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { createDeliver } from "../src/slopify/lib/deliver.ts";
import { runLoop, stopOf, Halt, type LoopInput, type Run } from "../src/slopify/lib/loop.ts";
import type { Build, Validate } from "../src/slopify/lib/spec.ts";

type Reply = Record<string, unknown> | null;
type Script = (type: string, label: string, prompt: string) => Reply;

interface Call {
  type: string;
  label: string;
  prompt: string;
}

const calls: Call[] = [];
const current: { script: Script } = { script: () => null };
const use = (s: Script): void => {
  current.script = s;
};

async function runAll(thunks: (() => Promise<unknown>)[]): Promise<unknown[]> {
  const settle = async (t: () => Promise<unknown>): Promise<unknown> => {
    try {
      return await t();
    } catch {
      return null;
    }
  };
  return Promise.all(thunks.map((t) => settle(t)));
}
function fakeAgent(prompt: string, opts: { agentType?: string; label?: string }): Promise<Reply> {
  const type = (opts.agentType ?? "").replace("slopify:", "");
  const label = opts.label ?? "";
  calls.push({ type, label, prompt });
  return Promise.resolve(current.script(type, label, prompt));
}
Object.assign(globalThis, { phase: () => null, parallel: runAll, agent: fakeAgent });

const BUILD: Build = {
  shared: [],
  tasks: [{ id: "t1", dependsOn: [], files: ["src/a.ts"], criteria: ["c1"], todo: "do it", reuse: [], create: [] }],
  docs: [],
};
const VALIDATE: Validate = {
  criteria: [{ id: "c1", wording: "it works", category: "UI", path: "flow", evidence: "shot", firstTest: "t" }],
};

const OK_PUSH = { done: true, unmet: [], operations: [{ op: "commit", reference: "abc" }] };
const OK_TEST = { tests: ["a.test.ts"], failingOutput: "red", noTest: "", decisions: [] };
const OK_FIX = { changed: ["src/a.ts"], ran: [], testProblem: "", decisions: [] };
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
const CLEAN_REVIEW = { outcome: "finished", waitingFor: "", limitMinutes: 60, reference: "r", findings: [] };
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
  checks: () => CHECKS_OK,
  validator: () => VALIDATOR_PASS,
  watcher: () => CLEAN_REVIEW,
  judge: (_t, label) => (label === "gateway" ? GATEWAY_OK : ruling()),
  writer: () => ({ changed: ["docs/a.md"] }),
};
const happy = (over: Partial<Record<string, Script>> = {}): Script => {
  const agents = { ...DEFAULTS, ...over };
  return (type, label, prompt) => agents[type]?.(type, label, prompt) ?? null;
};

function inputFor(d: Run, over: Partial<LoopInput> = {}): LoopInput {
  return {
    d,
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
    maxFailures: 3,
    planPhase: "Build",
    failures: { spec: 0, implementation: 0 },
    projectRoot: "/p",
    storyArg: "SMR-1",
  });
  d.state.worktree = "/p/wt";
  return d;
}
const count = (type: string, label?: string): number =>
  calls.filter((c) => c.type === type && (label === undefined || c.label.includes(label))).length;
const pushPrompts = (): string[] => calls.filter((c) => c.label === "push the round").map((c) => c.prompt);
const finalPrompt = (): string => calls.find((c) => /mark the PR ready|report the draft/.test(c.label))?.prompt ?? "";

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

beforeEach(() => {
  calls.length = 0;
});

describe("a delivery with nothing wrong", () => {
  test("builds, validates, opens a draft, and goes ready on a clean review", async () => {
    use(happy());
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.equal(r.pr, "PR-1");
    assert.equal(r.rounds, 0);
    assert.equal(count("coder"), 2);
    assert.equal(count("qa"), 1);
    assert.equal(count("watcher"), 1);
    assert.ok(finalPrompt().includes("Mark the PR ready"));
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

  test("keeps a change open as a blocker after three tries, and doesn't stop the round", async () => {
    use(happy({ qa: () => QA_FAIL }));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.ok(r.draftReasons.some((x) => x.text.includes("blocker")));
    assert.ok(count("validator") >= 1);
    assert.equal(count("coder", "t1: fix"), 3);
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
    assert.equal(count("writer", "update the docs"), 1);
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
    assert.ok(finalPrompt().includes("## Known debt"));
  });

  test("files a split recurring major as an issue", async () => {
    use(recurring("split-to-issue"));
    await runLoop(inputFor(freshRun()));
    assert.ok(finalPrompt().includes("File one Linear issue"));
  });

  test("never lets a ruling close a recurring blocker", async () => {
    use(recurring("accept-as-debt", "blocker"));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.ok(!finalPrompt().includes("## Known debt"));
    assert.ok(r.draftReasons.some((x) => x.text.includes("blocker")));
  });
});

describe("what TESTING.md decides", () => {
  test("keeps the PR a draft for a cannot-verify criterion set to draft, with no extra round", async () => {
    use(cannotVerify("draft"));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "draft");
    assert.equal(r.rounds, 0);
    assert.ok(finalPrompt().includes("## Why this is a draft"));
  });

  test("lets a cannot-verify criterion set to ready through, under Not validated", async () => {
    use(cannotVerify("ready"));
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.ok(finalPrompt().includes("## Not validated"));
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
    assert.ok(finalPrompt().includes("overturned a fail"));
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
    assert.ok(finalPrompt().includes("## Unverified findings"));
  });

  test("marks ready with a decision that changes acceptance, and lists it to confirm", async () => {
    const decision = {
      id: "d1",
      question: "keep the data?",
      choice: "yes",
      rationale: "x",
      reversible: true,
      affectsAcceptance: true,
    };
    use(
      happy({
        coder: (_t, label) => (label.endsWith(": test") ? OK_TEST : { ...OK_FIX, decisions: [decision] }),
      }),
    );
    const r = await runLoop(inputFor(freshRun()));
    assert.equal(r.status, "ready");
    assert.deepEqual(r.decisions, ["d1"]);
    assert.ok(finalPrompt().includes("## Needs confirmation"));
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
    assert.ok(finalPrompt().includes("File one Linear issue"));
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
  test("review-pr starts at the review and builds nothing when it's clean", async () => {
    use(happy());
    const d = freshRun();
    d.state.pr = "PR-9";
    const r = await runLoop(inputFor(d, { build: null, validate: null, specDir: "", startAtReview: 1, built: true }));
    assert.equal(r.status, "ready");
    assert.equal(count("coder"), 0);
    assert.equal(count("validator"), 0);
  });

  test("review-pr without a spec fixes a finding, runs the checks, and skips the validator", async () => {
    let n = 0;
    use(
      happy({
        watcher: () => {
          n += 1;
          return n === 1 ? finding("bug") : CLEAN_REVIEW;
        },
      }),
    );
    const d = freshRun();
    d.state.pr = "PR-9";
    const r = await runLoop(inputFor(d, { build: null, validate: null, specDir: "", startAtReview: 1, built: true }));
    assert.equal(r.status, "ready");
    assert.equal(count("coder", "fix-1: fix"), 1);
    assert.equal(count("checks"), 1);
    assert.equal(count("validator"), 0);
  });

  test("a rerun whose tasks are built starts at validation", async () => {
    use(happy());
    await runLoop(inputFor(freshRun(), { built: true }));
    assert.equal(count("coder"), 0);
    assert.equal(count("validator"), 1);
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
  };

  test("runs a dependent task after the one it needs", async () => {
    use(happy());
    await runLoop(inputFor(freshRun(), { build: two }));
    const order = calls.filter((c) => c.type === "coder").map((c) => c.label);
    assert.ok(order.indexOf("a: fix") < order.indexOf("b: test"));
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
