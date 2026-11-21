// Prints the measured report of one workflow run. Usage:
//   node stats.js <run id | workflow name> [--project <dir>] [--config <dir>]
// A workflow name picks that workflow's latest run. --project defaults to the current directory, and --config to
// $CLAUDE_CONFIG_DIR or ~/.claude: Claude Code keeps a project's runs under <config>/projects/<project slug>/.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { render, turnOf, type AgentRun, type RunData, type Turn } from "./stats.ts";

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === "object" && v !== null;
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
const readLines = (file: string): unknown[] =>
  existsSync(file)
    ? readFileSync(file, "utf8")
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l) as unknown)
    : [];
const dirs = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];

function option(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback);
}

// One response per message id: a transcript repeats an entry for each content block of the same response.
function turnsOf(file: string): Turn[] {
  const seen = new Set<string>();
  const turns: Turn[] = [];
  for (const e of readLines(file)) {
    const t = turnOf(e);
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    turns.push(t.turn);
  }
  return turns;
}

// The transcript's first entry is the brief the agent was dispatched with, and its last is the agent's last word.
function spanOf(file: string): { start: string; end: string } {
  const times = readLines(file)
    .map((e) => (isRecord(e) ? str(e["timestamp"]) : ""))
    .filter(Boolean);
  return { start: times[0] ?? "", end: times.at(-1) ?? "" };
}

function agentsOf(runDir: string): AgentRun[] {
  const results = new Map<string, unknown>();
  const started: Json[] = [];
  const rows = readLines(path.join(runDir, "journal.jsonl")).filter((r) => isRecord(r));
  for (const row of rows) {
    if (row["type"] === "started") started.push(row);
    else if (row["type"] === "result") results.set(str(row["agentId"]), row["result"] ?? null);
  }
  return started.map((row) => {
    const agentId = str(row["agentId"]);
    const metaFile = path.join(runDir, `agent-${agentId}.meta.json`);
    const meta = existsSync(metaFile) ? readJson(metaFile) : {};
    return {
      agentId,
      type: str(isRecord(meta) ? meta["agentType"] : "").replace(/^slopify:/, ""),
      label: str(row["label"]),
      phase: str(row["phase"]),
      ...spanOf(path.join(runDir, `agent-${agentId}.jsonl`)),
      turns: turnsOf(path.join(runDir, `agent-${agentId}.jsonl`)),
      result: results.has(agentId) ? results.get(agentId) : undefined,
    };
  });
}

// Every run of the project, across its sessions. A run writes its run file when it ends, so one that was stopped
// has only its journal, and its script's name, <workflow>-<run id>.js, gives the workflow.
function runsOf(projectDir: string): RunData[] {
  return dirs(projectDir).flatMap((session) => {
    const workflows = path.join(projectDir, session, "workflows");
    const scripts = existsSync(path.join(workflows, "scripts")) ? readdirSync(path.join(workflows, "scripts")) : [];
    return dirs(path.join(projectDir, session, "subagents", "workflows"))
      .filter((runId) => runId.startsWith("wf_"))
      .map((runId) => {
        const runDir = path.join(projectDir, session, "subagents", "workflows", runId);
        const agents = agentsOf(runDir);
        const runFile = path.join(workflows, `${runId}.json`);
        const d = existsSync(runFile) ? readJson(runFile) : undefined;
        if (isRecord(d)) {
          return {
            runId,
            workflow: str(d["workflowName"]),
            args: d["args"],
            status: str(d["status"]),
            result: d["result"],
            startTime: num(d["startTime"]),
            durationMs: num(d["durationMs"]),
            agents,
          };
        }
        const times = agents.flatMap((a) => [a.start, a.end].filter(Boolean).map((t) => new Date(t).getTime()));
        const start = times.length > 0 ? Math.min(...times) : 0;
        const script = scripts.find((f) => f.endsWith(`-${runId}.js`)) ?? "";
        return {
          runId,
          workflow: script.slice(0, -`-${runId}.js`.length),
          args: undefined,
          status: "stopped before it ended",
          result: undefined,
          startTime: start,
          durationMs: times.length > 0 ? Math.max(...times) - start : 0,
          agents,
        };
      });
  });
}

const target = (process.argv[2] ?? "").replace(/^slopify:/, "");
const project = path.resolve(option("--project", process.cwd()));
const config = option("--config", process.env["CLAUDE_CONFIG_DIR"] ?? path.join(os.homedir(), ".claude"));
const projectDir = path.join(config, "projects", project.replaceAll(/[^a-z0-9]/gi, "-"));
const runs = runsOf(projectDir);
const match =
  runs.find((r) => r.runId === target) ??
  runs.filter((r) => r.workflow === target).toSorted((a, b) => b.startTime - a.startTime)[0];
if (match) {
  process.stdout.write(render(match));
} else {
  const names = [...new Set(runs.map((r) => r.workflow))].join(", ") || "none";
  process.stderr.write(`No run "${target}" in ${projectDir}. Workflows with runs there: ${names}.\n`);
  process.exitCode = 1;
}
