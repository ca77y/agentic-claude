---
title: Harbor run a job
type: raw
summary: Harbor groups trials into a job, and the harbor run CLI lets the caller choose the jobs directory and job name, so a run directory like <version>-<date>[-N] can be set per run.
tags: []
aliases: []
source: https://docs.harborframework.com/jobs/run-a-job
accessed: 2026-11-16
published: unknown
provider: Harbor documentation
up: "[[library/_meta/index|Library Index]]"
related: ["[[library/raw/2026-11-16-harbor-framework-harbor]]"]
created: 2026-11-16
updated: 2026-11-16
---

# Harbor run a job

> [!quote] Source
> **URL**: https://docs.harborframework.com/jobs/run-a-job
> **Accessed**: 2026-11-16
> **Method/Context**: Research for SMR-361 (benchmark the slopify workflows against alternatives), asking where a benchmark harness can write per-run results to plain files in a directory named by the caller. Version date not stated on the page.

## Key evidence

- Harbor organises work as a job, a collection of trials. The CLI takes a jobs directory and a job name, so the caller can set a run directory named `<version>-<date>[-N]`: `harbor run -p <path> -a <agent> -m <model> -o <jobs-dir> --job-name <job-name>`. The `-k` option sets attempts per task. The page also describes a hosted mode, "Run on Harbor Hub". (quote/paraphrase of the page; the exact wording of each passage was not kept) ^e1
- The directory name is caller-supplied. Nothing in this evidence shows Harbor generating a version or a `-N` suffix itself, so that naming would be script glue. (inference from ^e1) ^e2

## Limitations

- Whether the job output is plain JSON files (such as `result.json`) and its exact on-disk layout were not confirmed from this page.
- The page was not recorded with verbatim passages; the command line above is the retrieved form, not a copied block.
- Harbor Hub is a hosted mode; whether results there are also reachable as local files was not checked.
- Nothing here was run.

## Relevance

- A candidate harness whose jobs-directory and job-name options fit a per-run directory scheme. The result format, which decides whether runs are diffable plain text, still needs confirming. See [[library/raw/2026-11-16-harbor-framework-harbor]] for the harness itself.
