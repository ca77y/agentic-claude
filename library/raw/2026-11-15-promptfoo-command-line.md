---
title: promptfoo Command Line
type: raw
summary: How promptfoo identifies, repeats, resumes and retries eval runs, and how its response cache affects repeat independence
tags: [evaluation, operations]
aliases: []
source: https://www.promptfoo.dev/docs/usage/command-line/
accessed: 2026-11-15
published: unknown
provider: promptfoo (product documentation)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# promptfoo Command Line

> [!quote] Source
> **URL**: https://www.promptfoo.dev/docs/usage/command-line/
> **Accessed**: 2026-11-15
> **Method/Context**: Product documentation page for the promptfoo CLI. No publication date recorded. Recorded for the SMR-361 question on benchmarking the slopify workflows, in particular run identity, repeats and run naming.

## Key evidence

- Each promptfoo eval has an `evalId`. `--repeat <n>` runs each test n times, and a range filter applies before repeat expansion. `--filter-sample-seed` makes sampling reproducible. `--resume [evalId]` reuses the original run's runtime options and skips completed pairs. `retry <evalId>` preserves the eval ID unless `--new-id` is passed. `--no-cache` disables the response cache. ^e1
  > [!quote] Quote
  > "--repeat <number>  Number of times to run each test"
  >
  > "--no-cache  Do not read or write results to disk cache"
- A response cache can silently make a repeat run non-independent unless it is disabled. ^e2
  > [!note] Inference
  > The cache-independence implication is an inference from the `--repeat` and `--no-cache` descriptions above, not a statement on the page.

## Limitations

- Covers only the command-line surface of promptfoo. Output formats are on a separate docs page and are not recorded here.
- The page gives option descriptions, not measurements of how often the cache changes a repeat result.

## Relevance

- Shows one harness that keeps a generated run ID stable across retry and resume, and offers repeats with an explicit cache switch. Relevant to run naming and to whether repeated runs of a slopify workflow are independent. ^e3
