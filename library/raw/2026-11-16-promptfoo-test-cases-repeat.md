---
title: promptfoo test cases and repeat options
type: raw
summary: promptfoo docs on repeating evals (--repeat N, per-test options.repeat, per-repeat cache entries, mixed pass/fail flagging, repeatStability in JSON); no paired statistics between providers were found.
tags: []
aliases: [promptfoo options.repeat]
source: https://github.com/promptfoo/promptfoo/blob/main/site/docs/configuration/test-cases.md
accessed: 2026-11-16
published: unknown
provider: context7 (/promptfoo/promptfoo, v0.125.1 listed)
up: "[[library/_meta/index|Library Index]]"
related: ["[[library/raw/2026-11-16-promptfoo-claude-agent-sdk-provider]]", "[[library/raw/2026-11-16-promptfoo-github-repo]]"]
created: 2026-11-16
updated: 2026-11-16
---

# promptfoo test cases and repeat options

> [!quote] Source
> **URL**: https://github.com/promptfoo/promptfoo/blob/main/site/docs/configuration/test-cases.md
> **Accessed**: 2026-11-16
> **Method/Context**: promptfoo documentation read through context7 (library `/promptfoo/promptfoo`, version v0.125.1 listed) while researching SMR-361 (benchmarking the slopify workflows against a bare model). Publication date unknown.

## Key evidence

- `promptfoo eval --repeat N` or a per-test `options.repeat: N` repeats evaluations, and the per-test value overrides the global one. Paraphrase of docs. ^e1
- Each repeat index has its own cache namespace, and `--no-cache` forces fresh provider calls. Quote: "By default, each repeat index has its own cache entry... add --no-cache to force fresh generations on every run." ^e2
- The completion summary flags repeated groups with mixed pass/fail, and JSON exports carry `results.repeatStability`. Paraphrase of docs. ^e3
- Nothing found shows paired statistics or confidence intervals between providers. The researcher inferred that such analysis would be custom glue; this is an inference from absence, not a documented statement. ^e4

## Limitations

- The researcher's citation for ^e1 to ^e3 spans three pages: guides/evaluate-llm-temperature.md, configuration/test-cases.md and configuration/caching.md. The finding as supplied does not say which page carries each statement, so the split of ^e1 to ^e3 across those pages is not recorded here. Only the test-cases.md page is this note's named source.
- The absence in ^e4 covers the retrieved excerpts only; it is not proof that promptfoo has no paired comparison feature.
- Version is as listed by context7 (v0.125.1); behavior in other versions is not checked.

## Relevance

- Bears on how an eval harness would handle nondeterminism when comparing a slopify-plugin arm against a bare-model arm: repeats and cache control are built in, while paired statistics between arms would have to be added.
