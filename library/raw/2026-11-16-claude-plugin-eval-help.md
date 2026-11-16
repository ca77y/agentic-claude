---
title: claude plugin eval --help (Claude Code 2.1.325)
type: raw
summary: Help output of the local Claude Code CLI's `plugin eval` command (2.1.325), listing its ablation, repeat, model, cost, JSON and HTML report options, a candidate harness for benchmarking slopify workflows.
tags: []
aliases: [claude plugin eval help]
source: claude plugin eval --help
accessed: 2026-11-16
published: unknown
provider: Claude Code CLI (local, 2.1.325)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# claude plugin eval --help (Claude Code 2.1.325)

> [!quote] Source
> **URL**: none; local command `claude plugin eval --help`
> **Accessed**: 2026-11-16
> **Method/Context**: Help text printed by the locally installed Claude Code CLI, version 2.1.325, read while researching SMR-361 (benchmarking the slopify workflows against a bare model). Help output carries no publication date.

## Key evidence

- Candidate A is the Claude Code CLI's own `claude plugin eval`, which the repo's `make smoke` target already uses; Claude Code 2.1.325 is installed. Per the help text, it runs `case.yaml` cases with graders. Paraphrase of help text. ^e1
- Options named in the help text: `--ablation with-without` ("Run a no-plugin baseline arm and report the score delta"), `--runs <n>` (default 3), `--model`, `--judge-model` (default haiku), `--max-cost-usd`, `--json [path]`, `--report <path>` (self-contained HTML), `--output-dir`, and `-j` with a 1 to 8 range. The plugin arm is loaded and a no-plugin baseline arm is added. Quote and paraphrase of help text. ^e2
- The help text says the report is published to claude.ai by default unless `--no-publish` is passed. Paraphrase of help text. ^e3
- It adds no extra dependency beyond the Claude Code CLI the repo already requires. Inference. ^e4

## Limitations

- Help text only; no run was made to confirm the options behave as described.
- Not verified: whether the baseline arm gives a bare Opus arm with a pinned model, or uses the default model.
- The repo's smoke target passes `--ablation none` and runs only smoke-tagged cases, so the `with-without` mode was not exercised there.
- The licence of the Claude Code CLI was not checked in this run.

## Relevance

- Candidate A in the SMR-361 comparison of harnesses for a bare-versus-slopify benchmark; its native ablation arm, repeats, JSON aggregate and HTML report map directly onto what a `make benchmark` target would need, with no new dependency.
