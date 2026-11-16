---
title: Repo TESTING.md
type: raw
summary: The repo's TESTING.md says eval runs use the local Claude Code CLI login with no test account or env file, results stay gitignored, and a full eval target (make eval, SMR-364) does not exist yet.
tags: []
aliases: []
source: TESTING.md
accessed: 2026-11-16
published: unknown
provider: agentic-slop repository
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Repo TESTING.md

> [!quote] Source
> **URL**: none; a repository file, `TESTING.md` at the repo root (cited here by its repo-relative path, not a URL). Repo HEAD 1c5aefd.
> **Accessed**: 2026-11-16
> **Method/Context**: Research for SMR-361 (benchmark the slopify workflows against alternatives), reading the Smoke eval and Full eval categories to learn what constraints a benchmark harness must respect. Local file read, not edited.

## Key evidence

- Model access and accounts. TESTING.md line 19 (quote): "by the user's choice, eval runs call models through the Claude Code CLI login of whoever runs them, locally. No separate test account exists." Line 17 (quote): "Where the env file comes from: none; nothing reads an env file." A harness that needs its own API key or env file would depart from this stated setup. (quote; the last sentence is inference) ^e1
- Smoke eval category (lines 48-53, paraphrase). Covers how a workflow behaves when run with a model, limited to "that a workflow starts, dispatches its agents, and reaches its first milestones". Run through `make smoke` locally, only when the user asks (about ten minutes, all cases at once). CI never runs it. Required evidence is each case's pass or fail and its report under `plugins/slopify/evals/results/`. ^e2
- Result storage (line 74, quote): "eval reports in `plugins/slopify/evals/results/`, which is ignored." The repo's `.gitignore` also lists `plugins/*/evals/results/` (from the task brief's reading of `.gitignore`; not re-read in this note). ^e3
- Full eval category (lines 55-60, paraphrase and quote). Covers "claims about cost, accuracy, or quality across many runs". Validation path is `make eval`, run locally only when the user asks; CI never runs it. The page says the target "is in development under SMR-364 and doesn't exist yet, so until it lands a full eval run is the user's by hand." Required evidence is "the user's run report". An unverifiable criterion leaves the pull request a `draft`. ^e4
- Blind spots (lines 76-79, quote/paraphrase). Full eval claims about cost, accuracy, and quality across runs are shown only by a run the user performs. Smoke cases "use local scaffolds, never the real tracker or forge". ^e5
- Existing case material (lines 18, 70, paraphrase). Six smoke cases sit under `plugins/slopify/evals/`: `shape-smoke`, `deliver-story-smoke`, `deliver-trivial-smoke`, `deliver-bugfix-smoke`, `deliver-spike-smoke`, `research-smoke`. Each has a `scaffold.sh`, a `prompt.md`, and `graders/`; each `scaffold.sh` "builds its own throwaway repository", and there is no seed data. ^e6
- Platform and tooling (lines 7, 11-13, paraphrase). The project is a Claude Code plugin marketplace with no running app; plugins are "exercised through `claude plugin eval`". Tooling is Node 26 with npm and the Claude Code CLI pinned at `@anthropic-ai/claude-code@2.1.309` in the install line. ^e7

## Limitations

- Line numbers refer to TESTING.md at HEAD 1c5aefd and will drift as the file changes.
- The CLI version in line 12 (2.1.309) differs from the locally installed Claude Code 2.1.325 noted elsewhere in this research; TESTING.md was not checked against the installed version here.
- TESTING.md states policy and intent only. It does not say what `make eval` will run, how it will name or store results, or what it will cost; SMR-364 was not read in this note.
- Nothing here was run.

## Relevance

- Sets constraints for any benchmark harness: it should work through the local Claude Code login with no separate test account or env file, keep results out of git, and be run only on the user's request, never in CI (^e1, ^e3, ^e4).
- Shows that a `make eval` target is already named and expected from SMR-364, so a benchmark target must be reconciled with that work (^e4).
- Identifies the six existing smoke cases as the starting task material, with the limit that they test milestones and use throwaway local scaffolds, not full tasks or the real board (^e2, ^e5, ^e6).
