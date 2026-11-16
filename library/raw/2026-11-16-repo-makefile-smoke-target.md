---
title: Repo Makefile (make smoke target)
type: raw
summary: The agentic-slop Makefile lists install, build, lint, check, format, test and smoke targets, with no benchmark or eval target; make smoke runs claude plugin eval with --ablation none over smoke-tagged cases.
tags: []
aliases: [Makefile, make smoke]
source: Makefile
accessed: 2026-11-16
published: unknown
provider: agentic-slop repository (local file)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Repo Makefile (make smoke target)

> [!quote] Source
> **URL**: none; local repository file `Makefile` (canonical path relative to the repo root), repo HEAD 1c5aefd.
> **Accessed**: 2026-11-16
> **Method/Context**: Read from the working tree while researching SMR-361 (benchmarking the slopify workflows against a bare model). No publication date; the file is versioned in git.

## Key evidence

- The `.PHONY` line lists the targets `install build lint check format test smoke`. No benchmark or eval target exists in the Makefile. Quote of the `.PHONY` line; the absence is the researcher's observation from the file. ^e1
- `PLUGINS ?= $(wildcard plugins/*/)`, and the `smoke` target loops over those plugin directories and runs `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 claude plugin eval "$$p" --tag smoke -j 6 --allow-tools Bash Write Edit Agent Workflow --scaffold --ablation none --trust-plugin || exit 1`. Quote/paraphrase of the recipe. ^e2
- The Makefile comment above the target says the smoke evals call models, so they run only on request. It also says each case checks that its workflow starts and reaches its first milestones within ten minutes, that all cases run at once, and that the whole run takes about ten minutes. It adds that smoke workflows can outlast a headless session's wait for background work, so that ceiling is lifted. Paraphrase of the comment. ^e3
- `make install` runs `npm ci` and sets `core.hooksPath` to `.githooks`; `make build` runs `npm run --silent build`, which the comment describes as bundling `src/<plugin>/workflows/*.ts` into `plugins/<plugin>/workflows/*.js`. Paraphrase of the recipes and comments. ^e4
- Researcher's inference from ^e2: the existing eval invocation uses `--ablation none` and only the `smoke` tag, so the repo does not currently run a no-plugin baseline arm through this target. Whether `claude plugin eval --ablation with-without` gives a bare-model arm with a pinned model was not verified in this run. ^e5

## Limitations

- The Makefile alone does not show that dev tooling is Node-only; that claim in the researcher's findings also rests on `package.json` and the local Node version, which this note does not record.
- Spend, case contents, and result layout of smoke runs come from other files (`plugins/slopify/evals/` and its `results/` directories), not from this one.
- The `claude plugin eval` flag semantics come from the CLI's own help output, not from the Makefile.

## Relevance

- Fixes the repo's current eval entry points for SMR-361: a benchmark target would be a new Makefile target alongside `smoke`, built on the same `claude plugin eval` command or on a wrapper, and the existing `smoke` target is the template for plugin-loop, permission and trust flags.
