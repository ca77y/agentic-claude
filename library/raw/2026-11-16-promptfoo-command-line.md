---
title: promptfoo command line (flags and environment variables)
type: raw
summary: promptfoo CLI docs; eval history lives in the directory named by PROMPTFOO_CONFIG_DIR (default ~/.promptfoo) and --no-write skips writing results there.
tags: []
aliases: [promptfoo CLI, PROMPTFOO_CONFIG_DIR]
source: https://www.promptfoo.dev/docs/usage/command-line/
accessed: 2026-11-16
published: unknown
provider: web-tools
up: "[[library/_meta/index|Library Index]]"
related: ["[[library/raw/2026-11-16-promptfoo-output-formats]]"]
created: 2026-11-16
updated: 2026-11-16
---

# promptfoo command line (flags and environment variables)

> [!quote] Source
> **URL**: https://www.promptfoo.dev/docs/usage/command-line/
> **Accessed**: 2026-11-16
> **Method/Context**: promptfoo documentation page `usage/command-line`, fetched while researching SMR-361 (benchmarking the slopify workflows against a bare model). Page version date not stated; the page was current as of 2026.

## Key evidence

- promptfoo keeps eval history in a local directory set by an environment variable, and a flag skips writing to it. Quote: "PROMPTFOO_CONFIG_DIR | Directory that stores eval history | ~/.promptfoo" and "--no-write | Do not write results to promptfoo directory". Both are from the flags and environment variables sections. ^e1
- `promptfoo view [directory]` views a custom directory. Paraphrase of the CLI section; the exact argument syntax was not recorded. ^e2

## Limitations

- The storage engine (for example SQLite) is not stated in the fetched pages, so none is claimed here.
- Whether the history directory holds plain files that can be committed or diffed was not established from this page.
- Page version date is not stated.

## Relevance

- Bears on where a promptfoo-based benchmark of the slopify workflows would keep run history: a directory chosen per invocation through PROMPTFOO_CONFIG_DIR, separate from files written by `--output` (see [[library/raw/2026-11-16-promptfoo-output-formats]]).
