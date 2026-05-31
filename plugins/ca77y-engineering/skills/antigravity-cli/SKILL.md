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
  --print "Your task-specific prompt."
```

For long prompts, pass clear sections in the prompt:

```text
Task:
Context:
Files or artifact under review:
Output requirements:
Constraints:
```

## Core Options

- `--print`, `--prompt`, `-p`: run one non-interactive prompt and print the response.
- `--prompt-interactive`, `-i`: run an initial prompt and continue interactively.
- `--print-timeout`: set the maximum wait for print mode, for example `30m`.
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
| `-e <skill>` | mention the plugin skill in the prompt, for example `@<skill>` |
| `/<skill>` | `@<skill>` |
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

An installed plugin skill is invoked by putting `@skill-name` at the very start of the `--print` prompt. Which skill to target for a given job is the caller's concern, not this skill's.

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
