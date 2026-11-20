// SMR-405: which tasks a spec revision during the build runs again, and how a task it adds is briefed.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { createDeliver } from "../src/slopify/lib/deliver.ts";
import { specReviser } from "../src/slopify/lib/how.ts";
import { runLoop, type Run } from "../src/slopify/lib/loop.ts";
import type { Build, Task, Validate } from "../src/slopify/lib/spec.ts";
import { PR_AGENTS, calls, current, installAgents, scriptOf, type Script } from "./harness.ts";

installAgents();

const task = (id: string, todo = `build ${id}`): Task => ({
  id,
  dependsOn: [],
  files: [`src/${id}.ts`],
  criteria: [`c-${id}`],
  todo,
  reuse: [],
  create: [],
});
const specOf = (tasks: Task[]): { build: Build; validate: Validate } => ({
  build: { shared: [], tasks, docs: [], decisions: [], manualActions: [] },
  validate: {
    criteria: tasks.map((t) => ({
      id: `c-${t.id}`,
      wording: t.id,
      category: "UI",
      path: "flow",
      evidence: "shot",
      firstTest: "t",
    })),
  },
});
function run(): Run {
  const d = createDeliver({ workflow: "deliver-story", projectRoot: "/p", storyArg: "SMR-1" });
  d.state.worktree = "/p/wt";
  return d;
}
const howInput = (d: Run) => ({
  d,
  where: "project",
  story: "the issue",
  storyRevision: "abc",
  cardId: "SMR-1",
  specDir: "docs/specs/smr-1",
  answers: {},
});
const committed = {
  done: true,
  unmet: [],
  operations: [
    { op: "commit", reference: "abc" },
    { op: "card", reference: "comment" },
  ],
};
// The revision writer returns `revised`, and the advisors find nothing in it.
const reviserAgents =
  (revised: { build: Build; validate: Validate }): Script =>
  (type) =>
    type.startsWith("advisor-")
      ? { findings: [] }
      : type === "writer-spec"
        ? { ...revised, claims: [] }
        : type === "pusher"
          ? committed
          : null;
const rerunIds = async (problem: string, before: Task[], after: Task[]): Promise<string[]> => {
  current.script = reviserAgents(specOf(after));
  const r = await specReviser(howInput(run()))([problem], specOf(before));
  return r.rerun.map((t) => t.id);
};

beforeEach(() => {
  calls.length = 0;
});

describe("the tasks a spec revision runs again", () => {
  test("are the tasks a problem names together with the tasks the revision changed", async () => {
    const ids = await rerunIds(
      "src/t1.ts: wrong",
      [task("t1"), task("t2"), task("t3")],
      [task("t1"), task("t2", "build t2 another way"), task("t3")],
    );
    assert.deepEqual(ids, ["t1", "t2"]);
  });

  test("include a task the revision adds", async () => {
    assert.deepEqual(await rerunIds("design: wrong", [task("t1")], [task("t1"), task("t9")]), ["t9"]);
  });
});

// A run whose first review finding is ruled a spec fault; the revision keeps t1 as it was and adds t9.
const reviewThenClean = (): Script => {
  let reviews = 0;
  return () => {
    reviews += 1;
    const findings = reviews === 1 ? [{ id: "f1", location: "design", text: "a path is missing" }] : [];
    return { outcome: "finished", waitingFor: "none", limitMinutes: 60, reference: "r", findings };
  };
};
const noChoices = { specProblem: "", assumptions: [], manualActions: [] };
const loopAgents = (): Script =>
  scriptOf({
    ...PR_AGENTS,
    pusher: (_t, _l, prompt) =>
      prompt.includes("open the branch's PR")
        ? { done: true, unmet: [], operations: [{ op: "pr", reference: "PR-1" }] }
        : committed,
    coder: (_t, label) =>
      label.endsWith(": test")
        ? { tests: ["x.test.ts"], stubs: [], failingOutput: "red", noTest: "", ...noChoices }
        : { changed: ["src/x.ts"], ran: [], testProblem: "", ...noChoices },
    qa: () => ({ verdict: "pass", evaluated: "x", findings: [], limits: "none", testAtFault: false }),
    simplifier: () => ({ verdict: "pass", evaluated: "x", findings: [], limits: "none" }),
    checks: () => ({ commands: [{ command: "lint", exitCode: 0, failingLines: "" }] }),
    validator: (_t, _l, prompt) => ({
      results: ["c-t1", "c-t9"]
        .filter((id) => prompt.includes(id))
        .map((id) => ({ id, result: "pass", ran: "flow", evidence: ["s.png"], detail: "", setting: "draft" })),
      uncategorizedSetting: "draft",
    }),
    watcher: reviewThenClean(),
    judge: (_t, label) =>
      label === "gateway"
        ? { missed: [], docsToAdd: [] }
        : {
            verdict: "confirmed",
            severity: "major",
            kind: "spec",
            ruling: "none",
            reason: "seen",
            fingerprint: "d|f|x",
          },
    "writer-docs": () => ({ changed: [] }),
  });

const briefOf = (label: string): string[] =>
  calls.filter((c) => c.type === "coder" && c.label === label).map((c) => c.prompt);

describe("a task a spec revision adds", () => {
  test("is briefed as a first build that fails first, while a rebuilt task may keep its passing test", async () => {
    current.script = loopAgents();
    const before = specOf([task("t1")]);
    const after = specOf([task("t1", "build t1, revised"), task("t9")]);
    await runLoop({
      d: run(),
      kind: "story",
      where: "project",
      story: "the issue",
      cardId: "SMR-1",
      ...before,
      specDir: "docs/specs/smr-1",
      answers: {},
      startAtReview: 0,
      built: false,
      reviseSpec: () => Promise.resolve({ ...after, rerun: after.build.tasks }),
    });
    const rebuilt = briefOf("t1: test").at(-1) ?? "";
    const added = briefOf("t9: test").at(-1) ?? "";
    assert.equal(briefOf("t1: test").length, 2, "t1 is built, then rebuilt after the revision");
    assert.ok(rebuilt.includes("may already pass"), "the rebuilt task may keep its passing test");
    assert.ok(rebuilt.includes("already committed"), "the rebuilt task is told its work is committed");
    assert.ok(added, "the added task is built");
    assert.ok(!added.includes("may already pass"), "the added task's test must fail first");
    assert.ok(!added.includes("already committed"), "the added task is not told it was built before");
  });
});
