---
title: promptfoo GitHub repository metadata
type: raw
summary: GitHub API metadata for promptfoo/promptfoo (MIT licence, TypeScript, about 27.3k stars, pushed 2026-11-16, 965 open issues), a candidate eval harness for benchmarking slopify workflows.
tags: []
aliases: [promptfoo repo]
source: https://api.github.com/repos/promptfoo/promptfoo
accessed: 2026-11-16
published: unknown
provider: GitHub API
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# promptfoo GitHub repository metadata

> [!quote] Source
> **URL**: https://api.github.com/repos/promptfoo/promptfoo
> **Accessed**: 2026-11-16
> **Method/Context**: GitHub API repository record for promptfoo/promptfoo, read while researching SMR-361 (benchmarking the slopify workflows against a bare model). Version date: repo metadata as of 2026-11-16; no release or publication date.

## Key evidence

- Licence is MIT (API field `license.spdx_id`). Paraphrase of an API field. ^e1
- Language is TypeScript/Node; the repo had about 27.3k stars and 965 open issues, and its last push was 2026-11-16. Paraphrase of API fields. ^e2
- The same figures were cited by the researcher as the basis for promptfoo as "Candidate B" (a harness that can drive the Claude Agent SDK provider with local plugins). The provider features themselves (`plugins`, `copy_working_dir`, `setting_sources`, `max_budget_usd`, `--repeat`, HTML output) come from promptfoo's documentation pages, not from this API record, and belong in notes for those pages. ^e3

## Limitations

- The API record gives only repository metadata: it says nothing about whether promptfoo's Agent SDK provider runs the Claude Code Workflow tool or slopify's namespaced skills in headless mode. The researcher did not verify this.
- Star and issue counts are a snapshot as of 2026-11-16 and change over time. The 27.3k star figure is approximate.
- Evidence ^e3 is the researcher's attribution of figures to a candidate, not a passage from the API.

## Relevance

- Licence and maturity inputs for comparing promptfoo with `claude plugin eval`, Inspect AI, Harbor and a thin custom runner for the SMR-361 benchmark.
