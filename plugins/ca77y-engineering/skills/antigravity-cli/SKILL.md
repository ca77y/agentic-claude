---
name: antigravity-cli
description: Use when an agent needs Antigravity CLI or agy for review, critique, writing, planning, code analysis, plugin skills, hooks, subagents, sandboxing, or headless automation.
---

# Antigravity CLI

## Overview

Use Antigravity CLI (`agy`) as an external engine for headless, non-interactive jobs. Keep prompts explicit, and verify available options with `agy --help` when behavior matters.

Antigravity CLI is not a drop-in replacement for Gemini CLI. Do not use Gemini-only flags such as `-m`, `--model`, `--output-format`, `-e`, or `--approval-mode`.

## Headless Pattern

Use `--print` or `--prompt` for non-interactive work:

```bash
agy \
  --sandbox \
  --dangerously-skip-permissions \
  --print-timeout 30m \
  --print "Your task-specific prompt." < /dev/null
```

**Always redirect stdin from `/dev/null` (`< /dev/null`).** In `--print` mode `agy` reads stdin and blocks *at startup* — before it boots its language server or writes a single log line — until stdin reaches EOF. When launched detached, in the background, or from a tool/agent that leaves stdin open (a pipe that never closes), it hangs indefinitely with **zero output and an empty log file**. Closing stdin lets it boot in seconds. This is the most common cause of an `agy` run that "hangs forever and prints nothing."

**`--print` must be the last flag.** `--print`/`--prompt`/`-p` consume the next argument as the prompt value, so any other flag placed after `--print` is swallowed *into* the prompt (e.g. `--print --print-timeout 30m "…"` sends the model the literal text `--print-timeout`). Always put every other flag first and `--print "<prompt>"` last.

**Default `--print-timeout` is only 5m.** Print mode aborts at 5 minutes unless you raise it. For long jobs (a library synthesis or health audit can run many minutes) you MUST pass an explicit `--print-timeout` above the expected job length, e.g. `--print-timeout 30m`. Omitting it silently kills long jobs mid-run.

**To run a plugin command or subagent, make it the start of the prompt as a slash command** — e.g. `--print "/ca77y-library:scribe …"`. Headless `--print` expands slash commands (verified). See the Plugins section for the exact form and the import prerequisite.

For long prompts, pass clear sections in the prompt:

```text
Task:
Context:
Files or artifact under review:
Output requirements:
Constraints:
```

## Core Options

- `--print`, `--prompt`, `-p`: run one non-interactive prompt and print the response. Consumes the next argument as the prompt, so it must be the **last** flag. Expands a leading slash command (`/<plugin>:<command>`) when the plugin is imported. Also reads stdin and blocks at startup until EOF — redirect from `/dev/null` (`< /dev/null`) in any detached or automated context or the run hangs before it begins, with an empty log and no output.
- `--prompt-interactive`, `-i`: run an initial prompt and continue interactively.
- `--print-timeout`: set the maximum wait for print mode, for example `30m`. **Default is 5m** — raise it above the job length or long jobs are killed mid-run.
- `--sandbox`: run with terminal restrictions enabled.
- `--dangerously-skip-permissions`: auto-approve tool permission prompts. Use only with explicit task constraints.
- `--add-dir`: add a directory to the workspace. Repeat when multiple workspace roots are required.
- `--continue`, `-c`: continue the most recent conversation.
- `--conversation`: resume a previous conversation by ID.
- `plugin` or `plugins`: manage Antigravity plugins.

## Gemini CLI Parity Notes

| Gemini CLI | Antigravity CLI |
| --- | --- |
| `gemini -p` or `gemini --prompt` | `agy --print` or `agy --prompt` |
| `--approval-mode yolo` | `--dangerously-skip-permissions` |
| `--sandbox` | `--sandbox` |
| `--include-directories` | `--add-dir` |
| `-e <skill>` | invoke the plugin command as a slash command at the very start of the prompt, namespaced: `/<plugin>:<command>` |
| `/<skill>` | `/<plugin>:<command>` (same `/`; `@` is for attaching context only, never for invocation) |
| `--output-format json` | no CLI parity; require strict JSON in the prompt and parse stdout defensively |
| `-m` or `--model` | no CLI parity; use configured Antigravity model/settings |

## Plugins

Antigravity imports Gemini CLI extensions as plugins. Manage them with:

```bash
agy plugins list
agy plugin import gemini
agy plugin install <target>
agy plugin enable <name>
agy plugin disable <name>
agy plugin validate <path>
```

A plugin command or subagent is invoked by putting it as a **slash command** at the very start of the `--print` prompt, **namespaced** as `/<plugin>:<command>` — for example `/ca77y-library:librarian` or `/ca77y-library:scribe`. Use `/`, never `@`: per the Antigravity guide, `/` invokes workflows and launches subagents while `@` only attaches context (files, conversations, MCP tools). Bare names can be ambiguous; prefer the namespaced form. Which command to target for a given job is the caller's concern, not this skill's.

**Import is a prerequisite.** `agy` only sees *imported* plugins, not raw Gemini CLI extensions. A command that exists as a `~/.gemini/extensions/<name>` extension will not resolve until imported — verify with `agy plugins list`, and import with `agy plugin import gemini` if missing. An un-imported command is silently treated as literal prompt text, not executed.

## Retry Policy

Antigravity CLI can fail transiently when the active session is busy, the model reports exhausted capacity, or the command returns quota, 429, or session-limit style errors. Treat those as retryable unless the error clearly says authentication, command syntax, missing plugin/skill, invalid file/path, or unsupported flag.

For retryable session/capacity failures:

- Wait before retrying instead of falling back immediately.
- Retry up to 10 total attempts.
- Use increasing delays, for example 15s, 30s, 60s, then 120s for later attempts.
- Re-run the same command unchanged unless the failure identifies a concrete bad flag or missing plugin.
- If all 10 attempts fail, report the exact failure class and the number of attempts.

## Output Discipline

Antigravity CLI currently has no `--output-format json` equivalent. When downstream code or a calling agent needs structured output, put the exact schema in the prompt and require "Output only valid JSON, with no Markdown fences." Treat stdout as untrusted and parse defensively.

For human-readable review, require:

- findings or results first
- severity or priority when relevant
- file and line references when applicable
- evidence checked
- concrete fix direction
- assumptions and unresolved gaps

## Safety

- Do not rely on Antigravity to enforce repository policy. Include explicit constraints in the prompt.
- For review-only tasks, say "Do not edit files" in the prompt even when using sandbox mode.
- Do not inspect `.env` files or output secrets.
- Use `--sandbox` for workspace-aware tasks.
- Use `agy --help` and command-specific help before depending on an option in a new environment.
