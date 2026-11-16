---
title: Repo package.json (Node-only dev tooling)
type: raw
summary: The repo's package.json lists only npm dev dependencies, so a benchmark runner that adds Python, uv or docker would be a new kind of dev dependency
tags: []
aliases: []
source: package.json
accessed: 2026-11-16
published: unknown
provider: Local repository file (agentic-slop, HEAD 1c5aefd)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Repo package.json (Node-only dev tooling)

> [!quote] Source
> **URL**: `package.json` at the repository root (local file, no URL)
> **Accessed**: 2026-11-16
> **Method/Context**: Research for SMR-361, benchmarking the slopify workflows. The finding below comes from the repo's own files, read locally at repo HEAD 1c5aefd. It marks quotation, paraphrase and inference apart.

## Key evidence

- Repo constraint: dev tooling is Node-only. `package.json` `devDependencies` are all npm packages (for example eslint, prettier, esbuild, knip, jscpd, markdownlint-cli2, shellcheck), and Node v26.13.0 is installed locally. Python, uv and docker are present on this machine. Dev dependencies are npm-only; this does not cover the smoke fixtures, which use Python (see Limitations). The `make` targets are install, build, lint, check, format, test and smoke; no benchmark or eval target exists yet. The `smoke` target loops over plugins and runs `claude plugin eval "$p" --tag smoke -j 6 --allow-tools Bash Write Edit Agent Workflow --scaffold --ablation none --trust-plugin` with `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`. Source: `package.json` and `Makefile` in the worktree; retrieved 2026-11-16; repo HEAD 1c5aefd. (quote/paraphrase) ^e1

## Limitations

- The note covers one finding. It rests on `package.json` together with the `Makefile`; the `devDependencies` list above is partial (names given as examples, not the full list).
- That Python, uv and docker are present on this machine is a statement about this machine, not about the repo or other contributors' machines or CI.
- Correction (integration repair): an earlier wording said nothing in the repo depends on Python, uv or docker. That was too broad. Five of the six smoke scaffolds (`deliver-trivial`, `deliver-bugfix`, `deliver-spike`, `deliver-story`, `shape`) build Python fixture repos and tell the agent to run `python3 -m unittest`, so the claim is scoped to dev dependencies.
- The finding says what the repo's dev dependencies are today, not what it may add.

## Relevance

- Bears on SMR-361's choice of benchmark runner: a runner needing Python, uv or docker would add a dev toolchain the repo does not currently declare (Python already appears in the smoke fixtures), while a Node or `claude`-CLI-based runner would not.
