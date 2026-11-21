// The pure half of the SWE-bench Pro comparison: which tasks run, what each arm is given, how the task repository is
// set up for the workflows, how an arm is graded, and how the report reads. main.ts does the I/O.

import { turnCost, turnOf } from "../../src/slopify/skills/workflow-investigate/stats.ts";

type Workflow = "deliver-story" | "deliver-bugfix" | "deliver-trivial";
export type Arm = "slopify" | "plain";
const ARMS: readonly Arm[] = ["slopify", "plain"];

export interface Task {
  id: string;
  workflow: Workflow;
  /** A story whose card shape writes from the problem statement and interface, before deliver-story runs on it. */
  shape: boolean;
  size: string;
  note: string;
}

export interface TaskList {
  harness: { repository: string; commit: string };
  dataset: { name: string; config: string; split: string };
  tasks: Task[];
}

/** The dataset fields the harness reads. The row also holds the reference and test patches, which no arm sees. */
export interface Row {
  instance_id: string;
  repo: string;
  problem_statement: string;
  requirements: string;
  interface: string;
  docker_image: string;
}

/** The plain-Opus arm's model; the slopify arm's agents use the plugin's own models. */
const PLAIN_MODEL = "claude-opus-5-5";
/** Every lookup tool is off in both arms, so neither can find the upstream fix. */
const DISALLOWED_TOOLS = ["WebFetch", "WebSearch"];
/** The files the harness adds to the task repository; they never reach a graded patch. */
export const SETUP_FILES = ["TESTING.md", "docs/BOARD.md", "docs/FORGE.md"];
/** Git-excluded paths the harness and the workflows keep in the task repository. */
export const EXCLUDED = [".swepro/", ".board/", ".forge/", ".tmp/", ".worktrees/"];
export const BRANCH = "feat/swepro";
export const ONE_RUN =
  "Each figure comes from one run of each task and arm, so the results are directional, not proof.";
/** The stub forge has no reviewer, so a workflow's review loop never runs and its PR stays a draft. */
const NO_REVIEW =
  "The local forge runs no review, so each workflow's PR stays a draft and its review rounds are neither run nor costed.";

/** A short, readable key for a task: its repository and the first seven characters of its commit. */
export function taskKey(id: string): string {
  const m = /^instance_[^_]+__([^-]+(?:-[a-z]+)*)-([0-9a-f]{7})/.exec(id);
  return m ? `${m[1] ?? ""}-${m[2] ?? ""}` : id;
}

/**
 * The tasks a run covers. Each term names a workflow (`deliver-story`, or just `story`), `shape` for the shape →
 * story tasks, or any part of an instance id; no terms means every task. A term that names nothing is an error, so
 * a typo never silently runs the wrong set.
 */
export function selectTasks(tasks: readonly Task[], terms: readonly string[]): Task[] {
  const words = terms.map((t) => t.trim()).filter(Boolean);
  if (words.length === 0) return [...tasks];
  const matches = (t: Task, w: string): boolean =>
    w === t.workflow || `deliver-${w}` === t.workflow || (w === "shape" && t.shape) || t.id.includes(w);
  const unknown = words.filter((w) => tasks.every((t) => !matches(t, w)));
  if (unknown.length > 0) throw new Error(`no task matches: ${unknown.join(", ")}`);
  return tasks.filter((t) => words.some((w) => matches(t, w)));
}

export function selectArms(terms: readonly string[]): Arm[] {
  const words = terms.map((t) => t.trim()).filter(Boolean);
  if (words.length === 0) return [...ARMS];
  const unknown = words.filter((w) => !ARMS.includes(w as Arm));
  if (unknown.length > 0) throw new Error(`unknown arm: ${unknown.join(", ")}; the arms are ${ARMS.join(", ")}`);
  return ARMS.filter((a) => words.includes(a));
}

const section = (heading: string, body: string): string => `## ${heading}\n\n${body.trim()}`;

/**
 * The task text an arm is given: the problem statement, then the requirements, then the interface. A shape → story
 * task withholds the requirements, so shape and the design phase decide them.
 */
export function workItem(row: Row, opts: { requirements: boolean }): string {
  return [
    row.problem_statement.trim(),
    ...(opts.requirements ? [section("Requirements", row.requirements)] : []),
    section("New Interfaces", row.interface || "None."),
  ].join("\n\n");
}

/** The problem statement's own title, without its heading marks or a `Title:` label. */
const cleanTitle = (l: string): string =>
  l
    .replace(/^#+\s*/, "")
    .replaceAll("**", "")
    .replace(/^(?:title|summary)\s*:?\s*/i, "")
    .trim();

export function titleOf(problem: string): string {
  const line = problem
    .split("\n")
    .map((l) => cleanTitle(l))
    .find(Boolean);
  return (line ?? "Untitled task").slice(0, 120);
}

/** The story card deliver-story runs on, in the local board's format. */
export function storyCard(row: Row): string {
  return [
    `# ${titleOf(row.problem_statement)}`,
    "Status: Todo\nLabel: Feature\nLabel: Deliverable",
    section("Why", row.problem_statement),
    section("Scope", `Implement the change above, with these new interfaces:\n\n${row.interface || "None."}`),
    section("Acceptance criteria", row.requirements),
    "",
  ].join("\n\n");
}

const BRANCH_ONLY = "Work on a branch only, without a worktree.";

/** What each Claude Code invocation of a task and arm is told, in order. A shape → story task has two phases. */
export interface Phase {
  name: string;
  prompt: string;
}

export function phases(task: Task, row: Row, arm: Arm, storyId = "STORY-1"): Phase[] {
  const text = workItem(row, { requirements: !task.shape });
  if (arm === "plain") return [{ name: "plain", prompt: `${text}\n\nTESTING.md says how to run code and the checks.` }];
  if (task.workflow !== "deliver-story") {
    return [{ name: task.workflow, prompt: `/slopify:${task.workflow} ${text}\n\n${BRANCH_ONLY}` }];
  }
  const story = { name: "deliver-story", prompt: `/slopify:deliver-story ${storyId} ${BRANCH_ONLY}` };
  return task.shape ? [{ name: "shape", prompt: `/slopify:shape ${text}` }, story] : [story];
}

/** Claude Code variables a run keeps from the caller: its login, provider, and config folder. */
const KEPT_CLAUDE_VARS = /^(?:CLAUDE_CONFIG_DIR|CLAUDE_CODE_OAUTH_TOKEN|CLAUDE_CODE_USE_\w+)$/;

/**
 * The environment of one invocation. A caller that is itself a Claude Code session would otherwise hand down its
 * session, effort, and agent settings, so every other CLAUDE variable is dropped. A headless session waits for the
 * workflow it started in the background, and its Bash tool runs in bash, so a run behaves the same on every machine.
 */
export function childEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const kept = Object.entries(env).filter(([k]) => !k.startsWith("CLAUDE") || KEPT_CLAUDE_VARS.test(k));
  return { ...Object.fromEntries(kept), CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: "0", SHELL: "/bin/bash" };
}

/** The command line flags of one invocation; the slopify arm adds the plugin, the plain arm pins its model. */
export function claudeArgs(arm: Arm, opts: { prompt: string; sessionId: string; pluginDir: string }): string[] {
  return [
    "-p",
    opts.prompt,
    "--session-id",
    opts.sessionId,
    "--output-format",
    "stream-json",
    "--verbose",
    // Only the project's settings: the user's own plugins, hooks, and MCP servers stay out of both arms.
    "--setting-sources",
    "project,local",
    "--strict-mcp-config",
    "--dangerously-skip-permissions",
    "--disallowedTools",
    DISALLOWED_TOOLS.join(","),
    "--model",
    PLAIN_MODEL,
    ...(arm === "slopify" ? ["--plugin-dir", opts.pluginDir] : []),
  ];
}

/** How each repository's code runs inside its task container. Generic per repository, so it reveals no hidden test. */
const CHECKS: Record<string, string> = {
  "ansible/ansible": "- Unit tests: `.swepro/run 'PYTHONPATH=/app pytest test/units/<path> -v'`",
  "internetarchive/openlibrary":
    "- Unit tests: `.swepro/run 'PYTHONPATH=/app OL_CONFIG=/app/conf/openlibrary.yml pytest <path> -v'`",
  "qutebrowser/qutebrowser":
    "- Unit tests: `.swepro/run 'QT_QPA_PLATFORM=offscreen PYTEST_QT_API=pyqt5 python -m pytest -p no:xvfb <path> -v'`",
  "flipt-io/flipt": "- Build: `.swepro/run 'go build ./...'`\n- Unit tests: `.swepro/run 'go test ./<package>/...'`",
  "future-architect/vuls":
    "- Build: `.swepro/run 'go build ./...'`\n- Unit tests: `.swepro/run 'go test ./<package>/...'`",
  "gravitational/teleport":
    "- Build: `.swepro/run 'go build ./tool/tsh/...'`\n- Unit tests: `.swepro/run 'go test ./<package>'`",
  "element-hq/element-web":
    "- Unit tests: `.swepro/run 'npx jest <test file>'`\n- Typecheck: `.swepro/run 'npx tsc --noEmit'`",
  "protonmail/webclients":
    "- Unit tests, from the package or application that holds the file: `.swepro/run 'cd packages/<name> && yarn test <test file>'` or `.swepro/run 'cd applications/<name> && yarn test <test file>'`",
};

function checksOf(repo: string): string {
  const checks = CHECKS[repo];
  if (checks === undefined) throw new Error(`no checks declared for ${repo}`);
  return checks;
}

/** The project setup the workflows read: a local Markdown board, a local stub forge, and how to run the code. */
export function setupFiles(row: Row): Record<string, string> {
  return {
    "TESTING.md": `# Testing

## Platform

${row.repo}, a library and its tests. There is no app to boot.

## Tools

The code's toolchain and dependencies exist only inside the task container. Run every command there through
\`.swepro/run '<command>'\`, from anywhere in the repository: it runs the command in the container, in the same
directory. Running the code or its tests directly on this machine doesn't work.

## Setup

Nothing to set up.

## Boot

Nothing to boot.

## Checks

${checksOf(row.repo)}

## Categories

### Code

- Covers: every change to the code and its tests.
- Validation path: run the unit tests that cover the change through \`.swepro/run\`.
- Required evidence: the command's output.
- When a criterion in this category can't be verified, the pull request is \`ready\` or stays \`draft\`: draft

### Uncategorized

When a criterion fits no category, the pull request is \`ready\` or stays \`draft\`: draft

## Flows

None.

## Evidence

Under \`.tmp/evidence/\`.

## Blind spots

None.
`,
    "docs/BOARD.md": `# Board declaration

Configuration does not authorize execution; the user's request does. An operation not bound here has no grant.

## Board

- Tracker, project, and team: local Markdown cards, one file per card under \`.board/\` at the main checkout root (paths here are relative to that root, never to a worktree). There is no team.
- Access, without credentials: read and write the files directly.

## Operations

- Locate, read, search: read \`.board/<identifier>.md\`, or search \`.board/*.md\` with grep.
- Create, with initial status: write \`.board/<KIND>-<n>.md\`, where KIND is \`STORY\`, \`BUG\`, or \`SPIKE\` and \`n\` is one more than the highest existing number of that kind (starting at 1): \`# <title>\`, then a \`Status: Backlog\` line and one \`Label: <label>\` line per label, then the body.
- Transition: rewrite the card's \`Status:\` line.
- Update content and relations: rewrite the card's body, or add or remove its \`Label:\` lines and \`Blocks: <identifier>\`, \`Blocked by: <identifier>\`, or \`Related: <identifier>\` lines under the status line.
- Attach a PR: add a \`PR: <path>\` line under the status line.
- Comment: append \`## Comment\` and the comment's text to the end of the card.
- Mark a duplicate: add a \`Duplicate of: <identifier>\` line under the status line and set \`Status: Canceled\`.

## Cards

- Identity and spec naming: the file name without \`.md\` (\`STORY-1\`); a spec is the folder \`docs/specs/<lowercase identifier>-<slug>/\`.
- Type and priority: the kind in the identifier; no priority.
- Dependencies: the \`Blocks:\` and \`Blocked by:\` lines.
- Story format: the plugin's story template, each part a \`## <part>\` section; labels \`Feature\` and, when it applies, \`Deliverable\` and \`Shaped\`.
- Bug format: the plugin's bug template, each part a \`## <part>\` section; label \`Bug\`.
- Spike format: the plugin's spike template, each part a \`## <part>\` section; label \`Spike\`.
- Deliverable: the label \`Deliverable\` marks a story card the shaping process filed with no open question left and every check passed, and comes off when shaping the card again leaves a question open. Only a card with this label can go through a full story delivery.
- Shaped: the label \`Shaped\` marks a card the shaping process filed, and is added every time it files or updates one. Shaping a card with this label again only applies the answers its comments give, without new grounding or advice.
- Unreproducible: the label \`Unreproducible\` marks a Bug card whose bug an automated fix could not reproduce.

## Statuses

- Statuses: Backlog, Todo, In Progress, In Review, Done, Canceled.
- User-owned decisions: Done and Canceled, except marking a duplicate.

## Delivery

- When delivery starts: set \`Status: In Progress\`.
- When the PR opens: attach it.
- When the PR's review is clean: set \`Status: In Review\`.
- On a later round: nothing more.

## Other conditions

- Filing a card: whenever a workflow the user started calls for one.
- Editing card content: whenever a workflow the user started calls for it.
- Comments: whenever a workflow the user started calls for one.

Never rewrite an acceptance criterion to match an implementation.
`,
    "docs/FORGE.md": `# Forge declaration

Configuration does not authorize execution; the user's request does. An operation not bound here has no grant.

## Repository

- Remote and permitted push destinations: \`origin\`, the local bare repository \`.forge/remote.git\` at the main checkout root (paths here are relative to that root, never to a worktree); only the story branch is pushed.
- Forge and how it is reached, without credentials: a local stub. A pull request is the file \`.forge/prs/swepro.md\`.
- Target branch and its protection: \`main\`; automated work never commits to it.

## Workspace

- Branch name: \`${BRANCH}\`.
- Story worktree path and its ignore rule: \`.worktrees/swepro\`, ignored by \`.git/info/exclude\`; created with \`git worktree add .worktrees/swepro -b ${BRANCH} main\`, or \`git worktree add .worktrees/swepro ${BRANCH}\` when the branch exists.
- Worktree preparation: none.
- Cleanup after merge: the user.
- Spike prototypes: under \`.tmp/\`, never committed.

## Commits and push

- Commit convention: Conventional Commits.
- When to push: at the end of each round, with \`git push -u origin ${BRANCH}\` the first time and \`git push\` after.
- Merging the target into a story branch, before each push, and concluding or aborting a conflicted merge: \`git merge --no-edit main\`; conclude a resolved conflict with \`git add -- <paths>\` and \`git commit --no-edit\`, or abort it with \`git merge --abort\`.

## Pull request

- Create, update, read, comment: create or update by writing \`.forge/prs/swepro.md\`, with \`# <title>\` and the body the brief supplies, unchanged, under a \`Draft: yes\` line while it's a draft; marking it ready removes that line. Read the file. Comment by appending \`## Comment\` and the text.
- Title and body: the title in Conventional Commits form; the body as the brief supplies it.
- Review trigger, whether opening the PR fires it, and where findings land: none; no reviewer runs.
- Review status, as commands that can be polled: started, finished, how to read the result, including one that skipped the change or ended before every step finished; the poll interval; and each phase's time limit and what it is measured from: none.
- Required checks: the checks in \`TESTING.md\`.

## Restrictions

Autonomous work never does these; an explicit user request for one authorizes it.

- Merge into \`main\`, force-push, or rewrite history.
`,
  };
}

/**
 * The script at `.swepro/run`: it runs a command in the task's container, in the directory that mirrors the caller's.
 * One argument runs through bash; several run as they are.
 */
export function runScript(container: string, repoInContainer: string): string {
  return `#!/bin/sh
# Runs a command in this task's container, in the directory that mirrors the current one.
root=$(cd "$(dirname "$0")/.." && pwd -P)
here=$(pwd -P)
case "$here" in "$root"*) rel=\${here#"$root"} ;; *) rel= ;; esac
if [ "$#" -eq 1 ]; then
  exec docker exec -w "${repoInContainer}$rel" ${container} bash -c "$1"
fi
exec docker exec -w "${repoInContainer}$rel" ${container} "$@"
`;
}

/**
 * What the grading container runs: apply the arm's patch to the pristine repository, then the task's own verifier,
 * which resets the test files, applies the hidden tests, runs them, and checks every fail-to-pass and pass-to-pass
 * test. The fallbacks are the ones SWE-bench Pro's patch replay uses.
 */
const GRADE_SCRIPT = `cd /app 2>/dev/null || cd /testbed
if [ -s /tmp/model.patch ]; then
  git apply --verbose /tmp/model.patch || git apply --3way /tmp/model.patch || patch --fuzz=3 -p1 -i /tmp/model.patch
fi
bash /tests/test.sh`;

/**
 * The docker command that grades one arm: a fresh container of the task's published image, removed when it exits,
 * that sees only that task's verifier, the arm's patch, and a log folder. No container a run used is reused.
 */
export function gradeArgs(opts: { image: string; testsDir: string; patchFile: string; logsDir: string }): string[] {
  return [
    "run",
    "--rm",
    "--platform",
    "linux/amd64",
    "-v",
    `${opts.testsDir}:/tests:ro`,
    "-v",
    `${opts.patchFile}:/tmp/model.patch:ro`,
    "-v",
    `${opts.logsDir}:/logs`,
    "--entrypoint",
    "/bin/bash",
    opts.image,
    "-c",
    GRADE_SCRIPT,
  ];
}

/** A git patch without its binary sections, which `git apply` can't take from a text diff. */
export function stripBinary(patch: string): string {
  return patch
    .split(/(?=^diff --git )/m)
    .filter((s) => s.trim() && !/^Binary files .* differ$/m.test(s) && !/^GIT binary patch$/m.test(s))
    .join("");
}

/** The pathspecs that leave the harness's own files out of an arm's patch. */
export const DIFF_EXCLUDES = SETUP_FILES.map((f) => `:(exclude)${f}`);

export interface Usage {
  cost: number;
  agents: number;
}

/**
 * The cost and agent count of one session, from its transcripts: the session's own, and one per agent it or its
 * workflows started. A transcript repeats an entry for each content block of the same response, so each message id
 * counts once.
 */
export function usageOf(transcripts: readonly { agent: boolean; lines: readonly unknown[] }[]): Usage {
  const seen = new Set<string>();
  let cost = 0;
  for (const t of transcripts) {
    for (const e of t.lines) {
      const turn = turnOf(e);
      if (!turn || seen.has(turn.id)) continue;
      seen.add(turn.id);
      cost += turnCost(turn.turn);
    }
  }
  return { cost, agents: transcripts.filter((t) => t.agent).length };
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === "object" && v !== null;
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** How one invocation ended: the workflow's own status when one ran, else how the session stopped. */
export function endingOf(opts: {
  timedOut: boolean;
  exitCode: number | null;
  result: unknown;
  workflow: unknown;
}): string {
  if (opts.timedOut) return "timed out";
  const wf = isRecord(opts.workflow) ? opts.workflow : undefined;
  if (wf) {
    const res = isRecord(wf["result"]) ? wf["result"] : {};
    const status = str(res["status"]) || str(res["outcome"]);
    return status ? `workflow ${status}` : `workflow ${str(wf["status"]) || "ended"}`;
  }
  const r = isRecord(opts.result) ? opts.result : undefined;
  if (r) return r["is_error"] === true ? `error: ${str(r["subtype"])}` : str(r["subtype"]) || "ended";
  return `exited ${String(opts.exitCode)}`;
}

export interface PhaseResult {
  name: string;
  cost: number;
  agents: number;
  wallSeconds: number;
  ending: string;
  /** Claude Code's own figure for the session, kept beside the transcript total as a cross-check. */
  reportedCost: number | null;
}

export interface ArmResult {
  task: string;
  workflow: Workflow;
  shape: boolean;
  arm: Arm;
  /** True or false once graded; null when the arm never produced code to grade. */
  resolved: boolean | null;
  failToPass: { passed: number; total: number } | null;
  phases: PhaseResult[];
  error?: string;
}

const totalOf = (r: ArmResult, key: "cost" | "agents" | "wallSeconds"): number =>
  r.phases.reduce((s, p) => s + p[key], 0);

const money = (n: number): string => `$${n.toFixed(2)}`;
const minutes = (s: number): string => `${(s / 60).toFixed(1)} min`;
const verdict = (r: ArmResult): string => (r.resolved === null ? "not graded" : r.resolved ? "resolved" : "unresolved");
const cell = (s: string): string => s.replaceAll("|", String.raw`\|`).replaceAll("\n", " ");

/** The run's report: one row per task and arm, the shape → story phases apart and summed, and totals per workflow. */
export function renderReport(results: readonly ArmResult[], meta: { started: string; plugin: string }): string {
  const rows = results.map((r) => {
    const ending = r.error ? `error: ${r.error}` : r.phases.map((p) => p.ending).join(" → ");
    const f2p = r.failToPass ? `${r.failToPass.passed}/${r.failToPass.total}` : "–";
    return `| ${taskKey(r.task)} | ${r.shape ? "shape → story" : r.workflow} | ${r.arm} | ${verdict(r)} | ${f2p} | ${money(totalOf(r, "cost"))} | ${minutes(totalOf(r, "wallSeconds"))} | ${totalOf(r, "agents")} | ${cell(ending)} |`;
  });
  const split = results
    .filter((r) => r.phases.length > 1)
    .flatMap((r) =>
      r.phases.map(
        (p) =>
          `| ${taskKey(r.task)} | ${r.arm} | ${p.name} | ${money(p.cost)} | ${minutes(p.wallSeconds)} | ${p.agents} | ${cell(p.ending)} |`,
      ),
    );
  const groups = new Map<string, ArmResult[]>();
  for (const r of results) {
    const k = `${r.shape ? "shape → story" : r.workflow} | ${r.arm}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const totals = [...groups].map(([k, rs]) => {
    const resolved = rs.filter((r) => r.resolved === true).length;
    const sum = (key: "cost" | "wallSeconds"): number => rs.reduce((s, r) => s + totalOf(r, key), 0);
    return `| ${k} | ${resolved}/${rs.length} | ${money(sum("cost"))} | ${minutes(sum("wallSeconds"))} |`;
  });
  return [
    "# SWE-bench Pro: slopify workflows and plain Opus",
    `Started ${meta.started}. Plugin: ${meta.plugin}. Plain arm: Claude Code on ${PLAIN_MODEL} at its default effort, with no plugin. Both arms run without ${DISALLOWED_TOOLS.join(" or ")}.`,
    ONE_RUN,
    NO_REVIEW,
    "## Per task and arm",
    "| Task | Workflow | Arm | Verdict | Fail-to-pass | Cost | Wall time | Agents | How it ended |\n| -- | -- | -- | -- | -- | -- | -- | -- | -- |\n" +
      rows.join("\n"),
    ...(split.length > 0
      ? [
          "## Shape → story phases",
          "| Task | Arm | Phase | Cost | Wall time | Agents | How it ended |\n| -- | -- | -- | -- | -- | -- | -- |\n" +
            split.join("\n"),
        ]
      : []),
    "## Totals",
    "| Workflow | Arm | Resolved | Cost | Wall time |\n| -- | -- | -- | -- | -- |\n" + totals.join("\n"),
    "",
  ].join("\n\n");
}

export interface GraderVerdict {
  task: string;
  patch: "reference" | "empty";
  resolved: boolean;
}

/** The grader check's report: each task's verdict with its reference and with an empty patch, and whether all hold. */
export function renderGraderReport(verdicts: readonly GraderVerdict[]): string {
  const expected = (v: GraderVerdict): boolean => v.resolved === (v.patch === "reference");
  const bad = verdicts.filter((v) => !expected(v));
  return [
    "# SWE-bench Pro grader check",
    bad.length === 0
      ? `Every task resolved with its reference patch and stayed unresolved with an empty patch (${verdicts.length} gradings).`
      : `${bad.length} of ${verdicts.length} gradings went the wrong way.`,
    "| Task | Patch | Verdict | As expected |\n| -- | -- | -- | -- |\n" +
      verdicts
        .map(
          (v) =>
            `| ${taskKey(v.task)} | ${v.patch} | ${v.resolved ? "resolved" : "unresolved"} | ${expected(v) ? "yes" : "no"} |`,
        )
        .join("\n"),
    "",
  ].join("\n\n");
}
