// Runs the SWE-bench Pro comparison of the slopify workflows with plain Opus. Usage:
//   node scripts/swepro/main.ts install [--tasks <terms>]
//   node scripts/swepro/main.ts run [--tasks <terms>] [--arms slopify,plain] [--jobs <n>] [--resume <run dir>] [--keep]
//   node scripts/swepro/main.ts grader [--tasks <terms>] [--jobs <n>]
// Everything it downloads or writes stays under .eval/, which git ignores. See scripts/swepro/README.md.
//
// It drives the docker, git, and claude of whoever runs it, so it finds them on their PATH.
/* eslint-disable sonarjs/no-os-command-from-path */

import { spawn, spawnSync, type SpawnSyncOptions } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  BRANCH,
  claudeArgs,
  DIFF_EXCLUDES,
  endingOf,
  EXCLUDED,
  gradeArgs,
  phases,
  renderGraderReport,
  renderReport,
  runScript,
  selectArms,
  selectTasks,
  setupFiles,
  SETUP_FILES,
  storyCard,
  stripBinary,
  taskKey,
  usageOf,
  type Arm,
  type ArmResult,
  type GraderVerdict,
  type PhaseResult,
  type Row,
  type Task,
  type TaskList,
} from "./lib.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const EVAL = path.join(ROOT, ".eval");
const HARNESS = path.join(EVAL, "cache", "SWE-bench_Pro-os");
const ROWS = path.join(EVAL, "cache", "rows");
const PLUGIN = path.join(ROOT, "plugins", "slopify");
const CONFIG = process.env["CLAUDE_CONFIG_DIR"] ?? path.join(os.homedir(), ".claude");
const LIST = JSON.parse(readFileSync(path.join(import.meta.dirname, "tasks.json"), "utf8")) as TaskList;

/** Hours each invocation may take before it is stopped and graded on what it left. */
const HOURS: Record<string, number> = {
  "deliver-story": 6,
  shape: 2,
  "deliver-bugfix": 3,
  "deliver-trivial": 2,
  plain: 2,
};

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === "object" && v !== null;
const log = (msg: string): void => {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
};

function option(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}
const list = (v: string | undefined): string[] => (v ?? "").split(/[\s,]+/).filter(Boolean);

/** Runs a command to completion and returns its stdout, throwing with its stderr when it fails. */
function sh(cmd: string, args: readonly string[], opts: SpawnSyncOptions = {}): string {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 30, ...opts });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const err = typeof r.stderr === "string" ? r.stderr : "";
    throw new Error(`${cmd} ${args.slice(0, 3).join(" ")} failed (${String(r.status)}): ${err.trim().slice(-800)}`);
  }
  return typeof r.stdout === "string" ? r.stdout : "";
}
const git = (cwd: string, ...args: string[]): string => sh("git", args, { cwd });

/** Runs a command, streaming its stdout and stderr into files, and stops it after the timeout. */
function runLogged(
  cmd: string,
  args: readonly string[],
  opts: { cwd: string; out: string; err: string; hours: number; env?: NodeJS.ProcessEnv },
): Promise<{ exitCode: number | null; timedOut: boolean; seconds: number }> {
  const start = performance.now();
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env ?? process.env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.pipe(createWriteStream(opts.out));
    child.stderr.pipe(createWriteStream(opts.err));
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 30_000).unref();
    }, opts.hours * 3_600_000);
    child.on("error", reject);
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, timedOut, seconds: (performance.now() - start) / 1000 });
    });
  });
}

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
const readLines = (file: string): unknown[] =>
  existsSync(file)
    ? readFileSync(file, "utf8")
        .split("\n")
        .filter((l) => l.trimStart().startsWith("{"))
        .map((l) => JSON.parse(l) as unknown)
    : [];
const filesUnder = (dir: string): string[] =>
  existsSync(dir) ? readdirSync(dir, { recursive: true, encoding: "utf8" }).map((f) => path.join(dir, f)) : [];

function preflight(): void {
  for (const [cmd, args, hint] of [
    ["docker", ["info", "--format", "{{.ServerVersion}}"], "Install Docker and start it."],
    ["claude", ["--version"], "Install Claude Code and log in (`claude` once)."],
    ["git", ["--version"], "Install git."],
  ] as const) {
    try {
      sh(cmd, args);
    } catch {
      throw new Error(`${cmd} is not available. ${hint}`);
    }
  }
}

const taskDir = (id: string): string => path.join(HARNESS, "v2", "tasks", id);
const rowFile = (id: string): string => path.join(ROWS, `${id}.json`);
const imageOf = (id: string): string => (readJson(rowFile(id)) as Row).docker_image;
const norm = (s: string): string => s.replaceAll(/\s+/g, " ").trim();

/** Fetches the pinned harness's task folders: the instructions, verifier, and reference patch of each task. */
function fetchHarness(tasks: readonly Task[]): void {
  if (!existsSync(path.join(HARNESS, ".git"))) {
    mkdirSync(HARNESS, { recursive: true });
    git(HARNESS, "init", "-q");
    git(HARNESS, "remote", "add", "origin", LIST.harness.repository);
  }
  git(HARNESS, "sparse-checkout", "set", "--no-cone", ...tasks.map((t) => `/v2/tasks/${t.id}/`));
  git(HARNESS, "fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", LIST.harness.commit);
  git(HARNESS, "checkout", "-q", "--force", LIST.harness.commit);
  for (const t of tasks) {
    if (!existsSync(path.join(taskDir(t.id), "tests", "test.sh"))) throw new Error(`the harness has no task ${t.id}`);
  }
}

/** The dataset server times out now and then while it warms up, so a request gets several tries. */
async function fetchJson(url: URL): Promise<unknown> {
  let status = 0;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      status = res.status;
    } catch {
      status = 0;
    }
    await new Promise((r) => setTimeout(r, attempt * 10_000));
  }
  throw new Error(`the dataset server answered ${String(status)} for ${url.searchParams.get("where") ?? ""}`);
}

/**
 * Fetches each task's dataset row and keeps only what the harness uses, never the reference or test patch. The row
 * must agree with the pinned harness: its problem statement, requirements, and interface all appear in the task's
 * instruction.md, so a changed dataset fails here instead of silently changing the tasks.
 */
async function fetchRows(tasks: readonly Task[]): Promise<void> {
  mkdirSync(ROWS, { recursive: true });
  const missing = tasks.filter((t) => !existsSync(rowFile(t.id)));
  for (const t of missing) {
    const url = new URL("https://datasets-server.huggingface.co/filter");
    url.searchParams.set("dataset", LIST.dataset.name);
    url.searchParams.set("config", LIST.dataset.config);
    url.searchParams.set("split", LIST.dataset.split);
    url.searchParams.set("where", `"instance_id"='${t.id}'`);
    const body = (await fetchJson(url)) as { rows?: { row: Json }[] };
    const row = body.rows?.[0]?.row;
    if (!row) throw new Error(`the dataset has no row ${t.id}`);
    const text = (key: string): string => (typeof row[key] === "string" ? row[key] : "");
    const keep = {
      instance_id: text("instance_id"),
      repo: text("repo"),
      problem_statement: text("problem_statement"),
      requirements: text("requirements"),
      interface: text("interface"),
      docker_image: text("docker_image"),
    } satisfies Row;
    const instructionFile = readFileSync(path.join(taskDir(t.id), "instruction.md"), "utf8");
    const instruction = norm(instructionFile);
    for (const field of ["problem_statement", "requirements", "interface"] as const) {
      if (!instruction.includes(norm(keep[field])))
        throw new Error(`${t.id}: the dataset's ${field} differs from the pinned harness`);
    }
    writeFileSync(rowFile(t.id), JSON.stringify(keep, null, 2));
  }
}

function pullImages(tasks: readonly Task[]): void {
  for (const [i, t] of tasks.entries()) {
    const image = imageOf(t.id);
    if (spawnSync("docker", ["image", "inspect", image], { stdio: "ignore" }).status === 0) continue;
    log(`pulling image ${String(i + 1)}/${String(tasks.length)}: ${taskKey(t.id)} (about 2-5 GB)`);
    sh("docker", ["pull", "-q", "--platform", "linux/amd64", image], { stdio: ["ignore", "ignore", "pipe"] });
  }
}

function ensureInstalled(tasks: readonly Task[]): void {
  const missing = tasks.filter((t) => !existsSync(rowFile(t.id)) || !existsSync(taskDir(t.id)));
  if (missing.length > 0) {
    throw new Error(`not installed: ${missing.map((t) => taskKey(t.id)).join(", ")}. Run \`make install-eval\` first.`);
  }
  pullImages(tasks);
}

/** Runs async jobs with at most `n` at once. */
async function pool<T, R>(items: readonly T[], n: number, job: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++;
      out[i] = await job(items[i] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()));
  return out;
}

const containers = new Set<string>();
function removeContainer(name: string): void {
  spawnSync("docker", ["rm", "-f", name], { stdio: "ignore" });
  containers.delete(name);
}

/** Where the image keeps the repository: /app, or /testbed for a few tasks. */
function repoPathOf(image: string): string {
  return sh("docker", [
    "run",
    "--rm",
    "--platform",
    "linux/amd64",
    "--entrypoint",
    "sh",
    image,
    "-c",
    "test -d /app && echo /app || echo /testbed",
  ]).trim();
}

/**
 * Copies the task's repository out of its image at the base commit, adds the project setup the workflows read, and
 * commits it as the seed every patch is taken from. Returns the seed commit.
 */
function seedRepo(task: Task, row: Row, ws: string, inside: string, container: string): string {
  const dir = path.dirname(ws);
  const tmp = sh("docker", ["create", "--platform", "linux/amd64", row.docker_image]).trim();
  try {
    sh("docker", ["cp", `${tmp}:${inside}`, dir]);
  } finally {
    spawnSync("docker", ["rm", "-f", tmp], { stdio: "ignore" });
  }
  rmSync(ws, { recursive: true, force: true });
  sh("mv", [path.join(dir, path.basename(inside)), ws]);
  const setup = Object.entries(setupFiles(row));
  for (const [file, text] of setup) {
    mkdirSync(path.dirname(path.join(ws, file)), { recursive: true });
    writeFileSync(path.join(ws, file), text);
  }
  mkdirSync(path.join(ws, ".swepro"), { recursive: true });
  writeFileSync(path.join(ws, ".swepro", "run"), runScript(container, inside));
  chmodSync(path.join(ws, ".swepro", "run"), 0o755);
  mkdirSync(path.join(ws, ".board"), { recursive: true });
  if (task.workflow === "deliver-story" && !task.shape)
    writeFileSync(path.join(ws, ".board", "STORY-1.md"), storyCard(row));
  const exclude = path.join(ws, ".git", "info", "exclude");
  mkdirSync(path.dirname(exclude), { recursive: true });
  writeFileSync(exclude, `${existsSync(exclude) ? readFileSync(exclude, "utf8") : ""}\n${EXCLUDED.join("\n")}\n`);
  git(ws, "config", "user.name", "swepro");
  git(ws, "config", "user.email", "swepro@example.com");
  git(ws, "branch", "-M", "main");
  // The stub forge's bare remote borrows the repository's objects, so a push doesn't copy its whole history.
  const remote = path.join(ws, ".forge", "remote.git");
  git(ws, "init", "-q", "--bare", remote);
  writeFileSync(path.join(remote, "objects", "info", "alternates"), `${path.join(ws, ".git", "objects")}\n`);
  mkdirSync(path.join(ws, ".forge", "prs"), { recursive: true });
  spawnSync("git", ["remote", "remove", "origin"], { cwd: ws, stdio: "ignore" });
  git(ws, "remote", "add", "origin", remote);
  git(ws, "add", "--", ...SETUP_FILES);
  sh("git", ["commit", "-q", "-m", "chore: add the project setup"], {
    cwd: ws,
    env: { ...process.env, GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z" },
  });
  const dirty = git(ws, "status", "--porcelain").trim();
  if (dirty) throw new Error(`the copied repository isn't clean (a case-insensitive disk?): ${dirty.slice(0, 300)}`);
  return git(ws, "rev-parse", "HEAD").trim();
}

/** The session's own transcript, every agent transcript under it, and its latest workflow run file. */
function sessionFiles(sessionId: string): { transcripts: { agent: boolean; lines: unknown[] }[]; workflow: unknown } {
  const projects = path.join(CONFIG, "projects");
  const project = readdirSync(projects).find((p) => existsSync(path.join(projects, p, `${sessionId}.jsonl`)));
  if (!project) return { transcripts: [], workflow: undefined };
  const dir = path.join(projects, project, sessionId);
  const agents = filesUnder(path.join(dir, "subagents")).filter((f) => /agent-[^/]+\.jsonl$/.test(f));
  const runs = filesUnder(path.join(dir, "workflows"))
    .filter((f) => /wf_[^/]+\.json$/.test(f))
    .map((f) => readJson(f))
    .filter((r) => isRecord(r))
    .toSorted((a, b) => Number(a["startTime"] ?? 0) - Number(b["startTime"] ?? 0));
  return {
    transcripts: [
      { agent: false, lines: readLines(path.join(projects, project, `${sessionId}.jsonl`)) },
      ...agents.map((f) => ({ agent: true, lines: readLines(f) })),
    ],
    workflow: runs.at(-1),
  };
}

/** The arm's final code as a patch on the seed: the checkout's working tree, or the story branch if it holds more. */
function capturePatch(ws: string, dir: string, seed: string): string {
  const index = path.join(dir, "capture.index");
  // Start from the checkout's own index, so a submodule vendored as a plain directory stays one entry, as in git status.
  copyFileSync(path.join(ws, ".git", "index"), index);
  const env = { ...process.env, GIT_INDEX_FILE: index };
  sh("git", ["add", "-A"], { cwd: ws, env });
  let patch = sh("git", ["diff", "--cached", "--binary", seed, "--", ".", ...DIFF_EXCLUDES], { cwd: ws, env });
  rmSync(index, { force: true });
  const hasBranch = spawnSync("git", ["rev-parse", "--verify", "-q", BRANCH], { cwd: ws }).status === 0;
  if (!patch.trim() && hasBranch) patch = git(ws, "diff", "--binary", seed, BRANCH, "--", ".", ...DIFF_EXCLUDES);
  return stripBinary(patch);
}

/** Grades a patch on a fresh container of the task's image with the task's own verifier. */
async function grade(
  id: string,
  patch: string,
  dir: string,
): Promise<{ resolved: boolean; passed: number; total: number }> {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(path.join(dir, "logs", "verifier"), { recursive: true });
  const patchFile = path.join(dir, "model.patch");
  writeFileSync(patchFile, patch);
  const args = gradeArgs({
    image: imageOf(id),
    testsDir: path.join(taskDir(id), "tests"),
    patchFile,
    logsDir: path.join(dir, "logs"),
  });
  await runLogged("docker", args, {
    cwd: dir,
    out: path.join(dir, "verifier.log"),
    err: path.join(dir, "verifier.log.err"),
    hours: 1,
  });
  const reward = path.join(dir, "logs", "verifier", "reward.txt");
  const resolved = existsSync(reward) && readFileSync(reward, "utf8").trim() === "1";
  const output = path.join(dir, "logs", "verifier", "output.json");
  const passedTests = new Set(
    existsSync(output)
      ? ((readJson(output) as { tests?: { name: string; status: string }[] }).tests ?? [])
          .filter((t) => t.status === "PASSED")
          .map((t) => t.name)
      : [],
  );
  const f2p = failToPass(id);
  return { resolved, passed: f2p.filter((t) => passedTests.has(t)).length, total: f2p.length };
}

/** The task's fail-to-pass test names from its verifier config, which stores them as JSON or a Python-literal list. */
function failToPass(id: string): string[] {
  const raw = (readJson(path.join(taskDir(id), "tests", "config.json")) as Json)["fail_to_pass"];
  if (Array.isArray(raw)) return raw.map(String);
  const text = String(raw);
  try {
    return (JSON.parse(text) as unknown[]).map(String);
  } catch {
    const out = sh(
      "python3",
      ["-I", "-c", "import ast,json,sys; print(json.dumps(ast.literal_eval(sys.stdin.read())))"],
      { input: text },
    );
    return (JSON.parse(out) as unknown[]).map(String);
  }
}

/** The newest story card shape filed, by its number. */
function newestStory(ws: string, before: ReadonlySet<string>): string | undefined {
  return readdirSync(path.join(ws, ".board"))
    .filter((f) => /^STORY-\d+\.md$/.test(f) && !before.has(f))
    .map((f) => f.slice(0, -3))
    .toSorted((a, b) => Number(a.slice(6)) - Number(b.slice(6)))
    .at(-1);
}

/** Runs the arm's Claude Code invocations in order, recording each one's cost, agents, time, and ending. */
async function runPhases(
  task: Task,
  row: Row,
  arm: Arm,
  at: { dir: string; ws: string; name: string; result: ArmResult },
): Promise<void> {
  let storyId = "STORY-1";
  const count = phases(task, row, arm).length;
  for (let i = 0; i < count; i++) {
    const phase = phases(task, row, arm, storyId)[i];
    if (!phase) break;
    const before = new Set(readdirSync(path.join(at.ws, ".board")));
    const sessionId = randomUUID();
    const stem = path.join(at.dir, `${String(i + 1)}-${phase.name}`);
    log(`${at.name}: ${phase.name} started (session ${sessionId})`);
    const run = await runLogged("claude", claudeArgs(arm, { prompt: phase.prompt, sessionId, pluginDir: PLUGIN }), {
      cwd: at.ws,
      out: `${stem}.jsonl`,
      err: `${stem}.stderr`,
      hours: HOURS[phase.name] ?? 2,
      // A headless session otherwise stops waiting for a workflow it started in the background. Claude Code's Bash
      // tool runs in $SHELL, so pinning bash makes a run behave the same on every machine.
      env: { ...process.env, CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: "0", SHELL: "/bin/bash" },
    });
    const final = readLines(`${stem}.jsonl`).findLast((e) => isRecord(e) && e["type"] === "result");
    const files = sessionFiles(sessionId);
    const usage = usageOf(files.transcripts);
    const ending = endingOf({
      timedOut: run.timedOut,
      exitCode: run.exitCode,
      result: final,
      workflow: files.workflow,
    });
    const reported = isRecord(final) && typeof final["total_cost_usd"] === "number" ? final["total_cost_usd"] : null;
    const phaseResult: PhaseResult = {
      name: phase.name,
      cost: usage.cost,
      agents: usage.agents,
      wallSeconds: run.seconds,
      ending,
      reportedCost: reported,
    };
    at.result.phases.push(phaseResult);
    log(
      `${at.name}: ${phase.name} ${ending} after ${(run.seconds / 60).toFixed(1)} min, $${usage.cost.toFixed(2)}, ${String(usage.agents)} agents`,
    );
    if (phase.name !== "shape") continue;
    const filed = newestStory(at.ws, before);
    if (!filed) {
      phaseResult.ending += ", filed no story card";
      break;
    }
    storyId = filed;
  }
}

async function runArm(task: Task, arm: Arm, runDir: string, keep: boolean): Promise<ArmResult> {
  const dir = path.join(runDir, taskKey(task.id), arm);
  const resultFile = path.join(dir, "result.json");
  if (existsSync(resultFile)) return readJson(resultFile) as ArmResult;
  mkdirSync(dir, { recursive: true });
  const row = readJson(rowFile(task.id)) as Row;
  const ws = path.join(dir, "repo");
  const container = `swepro-${path.basename(runDir)}-${taskKey(task.id)}-${arm}`.replaceAll(/[^\w.-]/g, "-");
  const result: ArmResult = {
    task: task.id,
    workflow: task.workflow,
    shape: task.shape,
    arm,
    resolved: null,
    failToPass: null,
    phases: [],
  };
  const name = `${taskKey(task.id)} ${arm}`;
  try {
    log(`${name}: setting up the repository`);
    const inside = repoPathOf(row.docker_image);
    const seed = seedRepo(task, row, ws, inside, container);
    removeContainer(container);
    containers.add(container);
    sh("docker", [
      "run",
      "-d",
      "--name",
      container,
      "--platform",
      "linux/amd64",
      "-v",
      `${ws}:${inside}`,
      "-w",
      inside,
      "--entrypoint",
      "sleep",
      row.docker_image,
      "infinity",
    ]);
    sh("docker", ["exec", container, "git", "config", "--global", "--add", "safe.directory", "*"]);
    await runPhases(task, row, arm, { dir, ws, name, result });
    const patch = capturePatch(ws, dir, seed);
    writeFileSync(path.join(dir, "patch.diff"), patch);
    removeContainer(container);
    log(`${name}: grading a ${String(patch.split("\n").length)}-line patch`);
    const g = await grade(task.id, patch, path.join(dir, "grade"));
    result.resolved = g.resolved;
    result.failToPass = { passed: g.passed, total: g.total };
    log(`${name}: ${g.resolved ? "RESOLVED" : "unresolved"} (${String(g.passed)}/${String(g.total)} fail-to-pass)`);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    log(`${name}: failed: ${result.error}`);
  } finally {
    removeContainer(container);
    if (!keep) rmSync(ws, { recursive: true, force: true });
  }
  writeFileSync(resultFile, JSON.stringify(result, null, 2));
  return result;
}

const stamp = (): string => new Date().toISOString().replaceAll(/[:.]/g, "-").slice(0, 19);

async function main(): Promise<void> {
  const command = process.argv[2];
  const tasks = selectTasks(LIST.tasks, list(option("--tasks") ?? process.env["TASKS"]));
  const jobs = Number(option("--jobs") ?? process.env["JOBS"] ?? 4);
  process.on("SIGINT", () => {
    for (const c of containers) removeContainer(c);
    process.exit(130);
  });
  preflight();
  if (command === "install") {
    log(`installing ${String(tasks.length)} tasks into ${path.relative(ROOT, EVAL)}/`);
    fetchHarness(tasks);
    await fetchRows(tasks);
    pullImages(tasks);
    log("installed. Run `make eval` to run the comparison, or `make eval-grader` to check the grader.");
    return;
  }
  ensureInstalled(tasks);
  if (command === "grader") {
    const runDir = path.join(EVAL, "runs", `${stamp()}-grader`);
    const pairs = tasks.flatMap((t) => (["reference", "empty"] as const).map((p) => ({ t, p })));
    const verdicts = await pool(pairs, jobs, async ({ t, p }): Promise<GraderVerdict> => {
      const patch =
        p === "reference" ? readFileSync(path.join(taskDir(t.id), "solution", "gold_patch.diff"), "utf8") : "";
      const g = await grade(t.id, patch, path.join(runDir, taskKey(t.id), p));
      log(`${taskKey(t.id)} ${p}: ${g.resolved ? "resolved" : "unresolved"}`);
      return { task: t.id, patch: p, resolved: g.resolved };
    });
    const report = renderGraderReport(verdicts);
    writeFileSync(path.join(runDir, "report.md"), report);
    console.log(`\n${report}\nReport: ${path.relative(ROOT, path.join(runDir, "report.md"))}`);
    if (verdicts.some((v) => v.resolved !== (v.patch === "reference"))) process.exitCode = 1;
    return;
  }
  if (command !== "run") throw new Error("usage: main.ts install | run | grader");
  const arms = selectArms(list(option("--arms") ?? process.env["ARMS"]));
  const resume = option("--resume") ?? process.env["RUN"];
  const runDir = resume ? path.resolve(resume) : path.join(EVAL, "runs", stamp());
  mkdirSync(runDir, { recursive: true });
  const started = new Date().toISOString();
  const plugin = (readJson(path.join(PLUGIN, ".claude-plugin", "plugin.json")) as Json)["version"];
  log(
    `running ${String(tasks.length)} tasks × ${arms.join(" and ")} with ${String(jobs)} at once into ${path.relative(ROOT, runDir)}/`,
  );
  const keep = process.argv.includes("--keep") || Boolean(process.env["KEEP"]);
  const results = await pool(
    tasks.flatMap((t) => arms.map((a) => ({ t, a }))),
    jobs,
    ({ t, a }) => runArm(t, a, runDir, keep),
  );
  const report = renderReport(results, { started, plugin: `slopify ${String(plugin)}` });
  writeFileSync(path.join(runDir, "report.md"), report);
  writeFileSync(path.join(runDir, "results.json"), JSON.stringify(results, null, 2));
  console.log(`\n${report}\nReport: ${path.relative(ROOT, path.join(runDir, "report.md"))}`);
}

try {
  await main();
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
