---
title: Harbor framework README
type: raw
summary: Harbor evaluates agents such as Claude Code on benchmarks in Docker or cloud sandboxes; its claude-code agent copies skills but showed no plugin loading.
tags: []
aliases: []
source: https://github.com/harbor-framework/harbor
accessed: 2026-11-16
published: unknown
provider: GitHub
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Harbor framework README

> [!quote] Source
> **URL**: https://github.com/harbor-framework/harbor
> **Accessed**: 2026-11-16
> **Method/Context**: Research for SMR-361 (benchmark the slopify workflows against alternatives). The README, the repo's `claude_code.py` agent source, and GitHub repo metadata were retrieved. Version date unknown; repo metadata is as of 2026-11-16.

## Key evidence

- Harbor, the framework from the Terminal-Bench creators, evaluates arbitrary agents including Claude Code. README example: `harbor run --dataset terminal-bench@2.0 --agent claude-code --model anthropic/claude-opus-5-5 --n-concurrent 4`. It runs locally in Docker or on cloud providers (Daytona, Modal and others) via `--env`. `harbor datasets list` shows the supported third-party benchmarks (SWE-Bench and Aider Polyglot are named), and users can build their own benchmarks and environments. ^e1
  > [!quote] README
  > "Evaluate arbitrary agents like Claude Code, OpenHands, Codex CLI, and more." "Build and share your own benchmarks and environments."
- Harbor's claude-code agent runs the `claude` CLI as `claude --verbose --output-format=stream-json ... --print` inside the task container. It copies a skills directory into `$CLAUDE_CONFIG_DIR/skills`, and also copies `~/.claude/skills` when that directory exists. The source showed no plugin-directory loading. This is a partial read, from keyword matches only (lines 132, 1193, 1875-1886, 2141-2153, 2196-2200), so absence of plugin loading is not established. Source: https://raw.githubusercontent.com/harbor-framework/harbor/main/src/harbor/agents/installed/claude_code.py (main branch at retrieval). ^e2
- Runtime, licence and maturity: Python (92.6%), installed with `uv tool install harbor` or `pip install harbor`. Apache-2.0, about 7.1k stars, created 2025-08-04, 31 releases, last pushed 2026-11-14, 1306 open issues. It is the official harness for Terminal-Bench-2.0. Sources: the README and https://api.github.com/repos/harbor-framework/harbor. ^e3

## Limitations

- README and repo version date unknown; star, issue and release counts are as of 2026-11-16.
- The `claude_code.py` finding comes from keyword matches only, not a full read of the file.
- Whether a plugin directory can reach the container another way (a mounted path, config directory contents) is not established.
- Nothing here was run; no measurement of Harbor with the slopify plugins exists in this note.

## Relevance

- Candidate harness for running Claude Code, with or without the slopify workflows, on benchmark tasks in isolated containers, for the SMR-361 comparison. The skills-copy behaviour suggests skills can be supplied per arm; plugin loading would need confirming.

## Update 2026-11-16

> [!quote] Source
> **Method/Context**: Second capture for SMR-361, as a benchmark candidate ("Candidate D, Harbor, Terminal-Bench's harness"). Sources: https://raw.githubusercontent.com/laude-institute/harbor/main/README.md, https://api.github.com/repos/harbor-framework/harbor, and https://docs.harborframework.com/results/view-job-results (search snippet only; page not fetched). Retrieved 2026-11-16; version date unknown.

### Key evidence

- As a candidate for benchmarking the slopify workflows, Harbor is Apache-2.0 and Python, with about 7.1k stars and a last push on 2026-11-14. It installs with `uv tool install harbor` or pip. `harbor run --dataset terminal-bench@2.0 --agent claude-code --model anthropic/... --n-concurrent 4` runs locally in Docker, or on cloud providers such as Daytona. `harbor datasets list` shows third-party benchmarks (SWE-Bench, Aider Polyglot). A local web viewer opens with `harbor view jobs`. Tasks are container environments, and custom tasks use Harbor's own task format. ^e4
- Not confirmed: whether the claude-code agent can load a local plugin or the Workflow tool, and the per-job output layout. The job-results docs page was seen only as a search snippet. ^e5

### Limitations

- The raw README URL above is under the `laude-institute` org, while the note's source is the `harbor-framework` org. This note does not establish how the two relate.
- The `harbor view jobs` and Harbor task-format points come from the README and a search snippet, not from a run or a read of the task-format docs.

### Relevance

- Fits a container-isolated, repeatable run of Claude Code with and without the slopify plugin. Its own task format and its unconfirmed plugin loading mean the cost of adapting slopify's workflow tasks to it is not yet known.
