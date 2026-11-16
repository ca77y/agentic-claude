---
title: Existing slopify smoke eval cases
type: raw
summary: The six smoke eval cases under plugins/slopify/evals and the local smoke run results (aggregate-result.json, report.html, cost per run), as task material and cost floor for benchmarking slopify workflows.
tags: []
aliases: [slopify smoke evals]
source: plugins/slopify/evals
accessed: 2026-11-16
published: unknown
provider: local repository
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Existing slopify smoke eval cases

> [!quote] Source
> **URL**: `plugins/slopify/evals` (repository path, not a web URL; repo HEAD 1c5aefd)
> **Accessed**: 2026-11-16
> **Method/Context**: Local file listing and reading of the case files and of the gitignored run results under `plugins/slopify/evals/results/*/aggregate-result.json` in the main checkout. Cited in the research on how to benchmark the slopify workflows (SMR-361). Quote and paraphrase are marked per bullet.

## Key evidence

- Six smoke cases exist under `plugins/slopify/evals/`: shape, deliver-story, deliver-trivial, deliver-bugfix, deliver-spike and research (directories named `<name>-smoke`). Each has `case.yaml` (schema_version 1.1, name, `context.scaffold_script`), `scaffold.sh`, `prompt.md` and `graders/*.md`. For example, `deliver-trivial-smoke` has the graders branch-created, card-filed, fixed, main-untouched and workflow-fired. The cases build a throwaway repo and do not use a real Linear card. (Paraphrase of the file listing; the "Flows" description in `TESTING.md` was also consulted.) ^e1
- Each smoke run writes `<results>/<ISO-timestamp>/aggregate-result.json` plus `report.html` (about 37-65 KB each). The JSON keys are schemaVersion, claudeVersion, startedAt, durationSeconds, costUsd, partial, suite{root, ablation, tagFilters, threshold, concurrency, plugins}, cases, and aggregates{casesTotal, casesPassed, overallScore, overallPassRate}. Directory naming is timestamp based, not `<version>-<date>[-N]`; `--output-dir` can redirect it. (Inference from the file listing and JSON fields.) ^e2
- Recorded spend of existing smoke runs with `--ablation none`: six cases cost USD 6.51 (4052 s), 7.18 (517 s), 8.29 (600 s) and 13.52 (600 s) across four runs; a 3-case run cost USD 3.25 and a 13-case "trigger" run cost USD 2.42. (Values read from `costUsd` and `durationSeconds` in the local JSON files.) ^e3

## Limitations

- The smoke cases only check that workflows start and reach their first milestones, so the e3 figures are a floor, not the cost of full-task runs. The full-workflow cost per task was not measured.
- The results directory is gitignored (`plugins/*/evals/results/`), so e2 and e3 rest on local files that are absent from a fresh clone or worktree.
- Whether these cases can serve as benchmark tasks for a bare-versus-slopify comparison was not tested; they are scaffolded throwaway repos graded on milestones.

## Relevance

- Gives existing task material (e1) and a cost floor (e3) for a benchmark of slopify against a bare model, and shows the shape of the per-run JSON and HTML output (e2) that a benchmark wrapper could reuse or compare against.
