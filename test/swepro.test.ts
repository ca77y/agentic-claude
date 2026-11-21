// The SWE-bench Pro comparison: its task list, what each arm is given, how an arm is graded, and the report.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import {
  childEnv,
  claudeArgs,
  DIFF_EXCLUDES,
  endingOf,
  gradeArgs,
  ONE_RUN,
  phases,
  renderGraderReport,
  renderReport,
  selectArms,
  selectTasks,
  setupFiles,
  storyCard,
  stripBinary,
  taskKey,
  titleOf,
  usageOf,
  workItem,
  type ArmResult,
  type Row,
  type TaskList,
} from "../scripts/swepro/lib.ts";

const LIST = JSON.parse(readFileSync("scripts/swepro/tasks.json", "utf8")) as TaskList;
const byWorkflow = (w: string): number => LIST.tasks.filter((t) => t.workflow === w).length;

// A row as the dataset holds it, with the hidden material the harness must never pass on.
const ROW: Row & { patch: string; test_patch: string; fail_to_pass: string } = {
  instance_id: "instance_qutebrowser__qutebrowser-96b997802e942937e81d2b8a32d08f00d3f4bc4e-v5fc38aaf2",
  repo: "qutebrowser/qutebrowser",
  problem_statement: "# Title: `parse_duration` accepts invalid formats\n\nIt accepts `-1s`.",
  requirements: "- `parse_duration` must return -1 for `-1s`.",
  interface: "- Name: `utils.parse_duration`",
  docker_image: "ghcr.io/scaleapi/swe-bench_pro-v2:instance_qutebrowser",
  patch: "diff --git a/qutebrowser/utils/utils.py REFERENCE-PATCH",
  test_patch: "diff --git a/tests/unit/utils/test_utils.py HIDDEN-TEST",
  fail_to_pass: '["tests/unit/utils/test_utils.py::test_parse_duration[-1s--1]"]',
};
const HIDDEN = [ROW.patch, ROW.test_patch, "test_parse_duration[", "HIDDEN-TEST", "REFERENCE-PATCH"];
const task = (id: string) => {
  const t = LIST.tasks.find((x) => x.id.includes(id));
  assert.ok(t, id);
  return t;
};

describe("the task list", () => {
  test("names the 16 tasks: 6 stories, 3 of them through shape, 4 bugfixes, and 6 trivial", () => {
    assert.equal(LIST.tasks.length, 16);
    assert.equal(new Set(LIST.tasks.map((t) => t.id)).size, 16);
    assert.ok(LIST.tasks.every((t) => t.id.startsWith("instance_") && /-[0-9a-f]{40}(?:-|$)/.test(t.id)));
    assert.deepEqual(
      [byWorkflow("deliver-story"), byWorkflow("deliver-bugfix"), byWorkflow("deliver-trivial")],
      [6, 4, 6],
    );
    assert.equal(LIST.tasks.filter((t) => t.shape).length, 3);
    assert.ok(LIST.tasks.filter((t) => t.shape).every((t) => t.workflow === "deliver-story"));
  });

  test("pins the harness to one commit", () => {
    assert.match(LIST.harness.commit, /^[0-9a-f]{40}$/);
  });

  test("gives each task a distinct short key", () => {
    assert.equal(new Set(LIST.tasks.map((t) => taskKey(t.id))).size, 16);
    assert.equal(taskKey(ROW.instance_id), "qutebrowser-96b9978");
  });
});

describe("selecting part of the task list", () => {
  test("no terms run every task", () => {
    assert.equal(selectTasks(LIST.tasks, []).length, 16);
  });

  test("a workflow, `shape`, or part of an instance id runs only those tasks", () => {
    assert.deepEqual(
      selectTasks(LIST.tasks, ["trivial"]).map((t) => t.workflow),
      Array.from({ length: 6 }, () => "deliver-trivial"),
    );
    assert.ok(selectTasks(LIST.tasks, ["shape"]).every((t) => t.shape));
    assert.equal(selectTasks(LIST.tasks, ["deliver-bugfix"]).length, 4);
    const two = selectTasks(LIST.tasks, ["96b997802e", "flipt-io__flipt-ea9a2663"]);
    assert.deepEqual(
      two.map((t) => taskKey(t.id)),
      ["flipt-ea9a266", "qutebrowser-96b9978"],
    );
  });

  test("a term that names no task is an error, not a smaller run", () => {
    assert.throws(() => selectTasks(LIST.tasks, ["trivial", "no-such-task"]), /no task matches: no-such-task/);
  });

  test("arms select the same way", () => {
    assert.deepEqual(selectArms([]), ["slopify", "plain"]);
    assert.deepEqual(selectArms(["plain"]), ["plain"]);
    assert.throws(() => selectArms(["baseline"]), /unknown arm/);
  });
});

describe("what each arm is given", () => {
  test("a work item holds the problem statement, requirements, and interface, and nothing hidden", () => {
    const text = workItem(ROW, { requirements: true });
    for (const part of [ROW.problem_statement, ROW.requirements, ROW.interface]) assert.ok(text.includes(part));
    for (const hidden of HIDDEN) assert.ok(!text.includes(hidden), hidden);
  });

  test("every arm's prompts carry the work item and nothing hidden", () => {
    for (const t of [task("96b997802e"), task("b67138b316"), task("7cbfb812ef"), task("c1f2df4753")]) {
      for (const arm of ["slopify", "plain"] as const) {
        const all = phases(t, ROW, arm)
          .map((p) => p.prompt)
          .join("\n");
        for (const hidden of HIDDEN) assert.ok(!all.includes(hidden), `${t.id} ${arm}`);
      }
    }
    const card = storyCard(ROW);
    for (const part of [ROW.problem_statement, ROW.requirements, ROW.interface]) assert.ok(card.includes(part));
    for (const hidden of HIDDEN) assert.ok(!card.includes(hidden), hidden);
  });

  test("a shape → story task gives shape and plain Opus the problem statement and interface, without requirements", () => {
    const t = task("c1f2df4753");
    assert.ok(t.shape);
    const [shape, story] = phases(t, ROW, "slopify");
    const [plain] = phases(t, ROW, "plain");
    for (const p of [shape, plain]) {
      assert.ok(p);
      assert.ok(p.prompt.includes(ROW.problem_statement));
      assert.ok(p.prompt.includes(ROW.interface));
      assert.ok(!p.prompt.includes(ROW.requirements));
      assert.ok(!p.prompt.includes("## Requirements"));
    }
    assert.match(shape?.prompt ?? "", /^\/slopify:shape /);
    assert.match(story?.prompt ?? "", /^\/slopify:deliver-story STORY-1 /);
  });

  test("each workflow runs on its own command, a story on its card, and plain Opus on the bare text", () => {
    assert.match(phases(task("96b997802e"), ROW, "slopify")[0]?.prompt ?? "", /^\/slopify:deliver-trivial # Title/);
    assert.match(phases(task("b67138b316"), ROW, "slopify")[0]?.prompt ?? "", /^\/slopify:deliver-bugfix # Title/);
    assert.deepEqual(
      phases(task("7cbfb812ef"), ROW, "slopify").map((p) => p.prompt),
      ["/slopify:deliver-story STORY-1 Work on a branch only, without a worktree."],
    );
    const plain = phases(task("7cbfb812ef"), ROW, "plain");
    assert.equal(plain.length, 1);
    assert.ok(plain[0]?.prompt.startsWith(ROW.problem_statement));
    assert.ok(plain[0]?.prompt.includes(ROW.requirements));
  });

  test("the plain arm has no plugin and the slopify arm only slopify, both without the user's settings", () => {
    const plain = claudeArgs("plain", { prompt: "p", sessionId: "s", pluginDir: "/x/plugins/slopify" });
    const slopify = claudeArgs("slopify", { prompt: "p", sessionId: "s", pluginDir: "/x/plugins/slopify" });
    assert.ok(!plain.includes("--plugin-dir"));
    assert.deepEqual(slopify.slice(slopify.indexOf("--plugin-dir"), slopify.indexOf("--plugin-dir") + 2), [
      "--plugin-dir",
      "/x/plugins/slopify",
    ]);
    for (const args of [plain, slopify]) {
      assert.equal(args[args.indexOf("--setting-sources") + 1], "project,local");
      assert.equal(args[args.indexOf("--model") + 1], "claude-opus-5-5");
      assert.ok(!args.includes("--effort"));
      assert.ok(args.includes("--strict-mcp-config"));
    }
  });

  test("an invocation keeps the caller's login but none of its own Claude Code session settings", () => {
    const env = childEnv({
      PATH: "/usr/bin",
      ANTHROPIC_API_KEY: "k",
      CLAUDE_CONFIG_DIR: "/c",
      CLAUDE_CODE_OAUTH_TOKEN: "t",
      CLAUDE_CODE_USE_BEDROCK: "1",
      CLAUDE_EFFORT: "medium",
      CLAUDECODE: "1",
      CLAUDE_CODE_SESSION_ID: "s",
      CLAUDE_CODE_CHILD_SESSION: "1",
      SHELL: "/bin/zsh",
    });
    assert.deepEqual(env, {
      PATH: "/usr/bin",
      ANTHROPIC_API_KEY: "k",
      CLAUDE_CONFIG_DIR: "/c",
      CLAUDE_CODE_OAUTH_TOKEN: "t",
      CLAUDE_CODE_USE_BEDROCK: "1",
      CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: "0",
      SHELL: "/bin/bash",
    });
  });

  test("the story card is in the local board's format", () => {
    const card = storyCard(ROW);
    assert.match(
      card,
      /^# `parse_duration` accepts invalid formats\n\nStatus: Todo\nLabel: Feature\nLabel: Deliverable\n/,
    );
    assert.match(card, /## Acceptance criteria\n\n- `parse_duration` must return -1/);
  });

  test("titles drop heading marks and labels", () => {
    assert.equal(titleOf("## Title\n\nFix the parser"), "Fix the parser");
    assert.equal(titleOf("**Title:** Add sinks"), "Add sinks");
  });

  test("the setup tells both arms to run code in the task container, with no task-specific test", () => {
    const files = setupFiles(ROW);
    assert.deepEqual(Object.keys(files), ["TESTING.md", "docs/BOARD.md", "docs/FORGE.md"]);
    assert.match(files["TESTING.md"] ?? "", /\.swepro\/run/);
    assert.ok(!(files["TESTING.md"] ?? "").includes("test_utils"));
    assert.throws(() => setupFiles({ ...ROW, repo: "unknown/repo" }), /no checks declared/);
  });
});

describe("grading an arm", () => {
  const args = gradeArgs({
    image: "ghcr.io/scaleapi/swe-bench_pro-v2:instance_x",
    testsDir: "/cache/tasks/instance_x/tests",
    patchFile: "/runs/r/x/plain/grade/model.patch",
    logsDir: "/runs/r/x/plain/grade/logs",
  });

  test("runs in a fresh container of the task's published image that is removed afterwards", () => {
    assert.deepEqual(args.slice(0, 2), ["run", "--rm"]);
    assert.ok(args.includes("ghcr.io/scaleapi/swe-bench_pro-v2:instance_x"));
    assert.ok(!args.includes("--name"));
  });

  test("sees exactly that task's verifier and that arm's patch, and none of the arm's workspace", () => {
    const mounts = args.filter((_, i) => args[i - 1] === "-v");
    assert.deepEqual(mounts, [
      "/cache/tasks/instance_x/tests:/tests:ro",
      "/runs/r/x/plain/grade/model.patch:/tmp/model.patch:ro",
      "/runs/r/x/plain/grade/logs:/logs",
    ]);
    assert.match(args.at(-1) ?? "", /bash \/tests\/test\.sh$/);
  });

  test("an arm's patch leaves out the harness's setup files and binary hunks", () => {
    assert.deepEqual(DIFF_EXCLUDES, [":(exclude)TESTING.md", ":(exclude)docs/BOARD.md", ":(exclude)docs/FORGE.md"]);
    const text = "diff --git a/a.py b/a.py\n--- a/a.py\n+++ b/a.py\n@@ -1 +1 @@\n-x\n+y\n";
    const binary = "diff --git a/vuls b/vuls\nnew file mode 100755\nBinary files /dev/null and b/vuls differ\n";
    assert.equal(stripBinary(text + binary), text);
  });
});

const assistant = (id: string, model: string) => ({
  type: "assistant",
  timestamp: "2026-11-20T00:00:00Z",
  message: { id, model, usage: { input_tokens: 1_000_000, output_tokens: 0 } },
});

describe("measuring a run", () => {
  test("sums each response once across the session and its agents, and counts the agents", () => {
    const usage = usageOf([
      {
        agent: false,
        lines: [assistant("m1", "claude-opus-5-5"), assistant("m1", "claude-opus-5-5")],
      },
      { agent: true, lines: [assistant("m2", "claude-haiku-5-5"), { type: "user" }] },
      { agent: true, lines: [] },
    ]);
    assert.equal(usage.agents, 2);
    assert.ok(Math.abs(usage.cost - (4 + 0.5)) < 1e-9);
  });

  test("a run ends with its workflow's status, a timeout, or how the session stopped", () => {
    assert.equal(endingOf({ timedOut: true, exitCode: null, result: undefined, workflow: undefined }), "timed out");
    assert.equal(
      endingOf({
        timedOut: false,
        exitCode: 0,
        result: {},
        workflow: { status: "completed", result: { status: "draft" } },
      }),
      "workflow draft",
    );
    assert.equal(
      endingOf({ timedOut: false, exitCode: 0, result: { subtype: "success" }, workflow: undefined }),
      "success",
    );
    assert.equal(endingOf({ timedOut: false, exitCode: 1, result: undefined, workflow: undefined }), "exited 1");
  });
});

const result = (over: Partial<ArmResult>): ArmResult => ({
  task: "instance_flipt-io__flipt-e50808c03e4b9d25a6a78af9c61a3b1616ea356b",
  workflow: "deliver-story",
  shape: true,
  arm: "slopify",
  resolved: true,
  failToPass: { passed: 23, total: 23 },
  phases: [
    { name: "shape", cost: 4, agents: 12, wallSeconds: 600, ending: "workflow completed", reportedCost: 4 },
    { name: "deliver-story", cost: 96, agents: 80, wallSeconds: 9000, ending: "workflow ready", reportedCost: 95 },
  ],
  ...over,
});

describe("the report", () => {
  const report = renderReport(
    [
      result({}),
      result({
        arm: "plain",
        resolved: false,
        failToPass: { passed: 3, total: 23 },
        phases: [{ name: "plain", cost: 5, agents: 1, wallSeconds: 1200, ending: "success", reportedCost: 5 }],
      }),
    ],
    { started: "2026-11-21T00:00:00Z", plugin: "slopify 0.6.24" },
  );

  test("lists each task and arm with its verdict, cost, wall time, agent count, and how it ended", () => {
    assert.match(
      report,
      /\| flipt-e50808c \| shape → story \| slopify \| resolved \| 23\/23 \| \$100\.00 \| 160\.0 min \| 92 \| workflow completed → workflow ready \|/,
    );
    assert.match(
      report,
      /\| flipt-e50808c \| shape → story \| plain \| unresolved \| 3\/23 \| \$5\.00 \| 20\.0 min \| 1 \| success \|/,
    );
  });

  test("records shape and deliver-story apart as well as in total", () => {
    assert.match(report, /\| flipt-e50808c \| slopify \| shape \| \$4\.00 \| 10\.0 min \| 12 \|/);
    assert.match(report, /\| flipt-e50808c \| slopify \| deliver-story \| \$96\.00 \| 150\.0 min \| 80 \|/);
  });

  test("states that each figure comes from one run, and names the arms slopify and plain", () => {
    assert.ok(report.includes(ONE_RUN));
    assert.ok(!/baseline/i.test(report));
  });

  test("the grader check lists each task's verdict for both patches", () => {
    const g = renderGraderReport([
      { task: ROW.instance_id, patch: "reference", resolved: true },
      { task: ROW.instance_id, patch: "empty", resolved: false },
    ]);
    assert.match(g, /Every task resolved with its reference patch/);
    assert.match(g, /\| qutebrowser-96b9978 \| reference \| resolved \| yes \|/);
    assert.match(g, /\| qutebrowser-96b9978 \| empty \| unresolved \| yes \|/);
    assert.match(
      renderGraderReport([{ task: ROW.instance_id, patch: "empty", resolved: true }]),
      /1 of 1 gradings went the wrong way/,
    );
  });
});

describe("running only on request", () => {
  const makefile = readFileSync("Makefile", "utf8");
  const target = (name: string): string =>
    new RegExp(String.raw`^${name}:.*\n(?:\t.*\n?)*`, "m").exec(makefile)?.[0] ?? "";

  test("no check, test, lint, or smoke target and no CI workflow runs the comparison", () => {
    for (const name of ["check", "test", "lint", "smoke", "install"]) {
      assert.ok(target(name), name);
      assert.ok(!/swepro|eval-grader|install-eval|\beval\b/.test(target(name).replaceAll("plugin eval", "")), name);
    }
    for (const wf of ["check.yml", "claude.yml", "claude-code-review.yml"]) {
      assert.ok(!readFileSync(`.github/workflows/${wf}`, "utf8").includes("swepro"), wf);
    }
    assert.match(target("eval"), /scripts\/swepro\/main\.ts run/);
  });
});
