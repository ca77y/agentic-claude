---
title: promptfoo - evaluate temperature and --repeat guide
type: raw
summary: promptfoo's repeat controls for nondeterministic evals (--repeat, options.repeat, per-repeat caching, --no-cache, repeatStability) and the absence of paired statistics
tags: []
aliases: []
source: https://github.com/promptfoo/promptfoo/blob/main/site/docs/guides/evaluate-llm-temperature.md
accessed: 2026-11-16
published: unknown
provider: promptfoo
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# promptfoo - evaluate temperature and --repeat guide

> [!quote] Source
> **URL**: https://github.com/promptfoo/promptfoo/blob/main/site/docs/guides/evaluate-llm-temperature.md
> **Accessed**: 2026-11-16
> **Method/Context**: Retrieved through context7 during SMR-361 (benchmark the slopify workflows against a bare-model baseline). Publication date unknown. The finding below also draws on two sibling promptfoo docs pages, `configuration/test-cases.md` and `configuration/caching.md`, retrieved the same way; this guide is one of its three sources, and the note does not separate which sentence came from which page. Lines marked "quote" are verbatim from the retrieved excerpt; the rest paraphrase it.

## Key evidence

- promptfoo repeats a test with `promptfoo eval --repeat N` or per-test `options.repeat: N`; the per-test value overrides the global one. Each repeat index has its own cache namespace, and `--no-cache` forces fresh provider calls. The completion summary flags repeated groups with mixed pass/fail, and JSON exports carry `results.repeatStability`. ^e1
  > [!quote]
  > "By default, each repeat index has its own cache entry... add --no-cache to force fresh generations on every run."
- Nothing found in the retrieved pages shows paired statistics or confidence intervals between providers. ^e2

## Limitations

- Source pages are the promptfoo docs as served through context7; the retrieved excerpts carry no publication date or page version.
- The absence in ^e2 is an absence in the retrieved excerpts, not proof that promptfoo has no such feature.
- The retrieved material does not attribute individual statements to this guide versus `configuration/test-cases.md` or `configuration/caching.md`.

## Relevance

- SMR-361 compares slopify workflows against a bare-model baseline, and model output varies run to run. ^e1 shows promptfoo can repeat each test and surface unstable groups, and that fresh calls need `--no-cache`.
- Inference: ^e2 implies any paired comparison of two arms with a confidence interval would be custom glue on top of promptfoo's output.

## Update 2026-11-16

> [!quote] Source
> **URL**: https://www.promptfoo.dev/docs/guides/evaluate-llm-temperature
> **Accessed**: 2026-11-16
> **Method/Context**: Hosted-site URL of the same guide recorded above, retrieved through context7 (library `/websites/promptfoo_dev`) during SMR-361. Published date and version unknown. This section records only what rests on this guide; the findings that rest on other promptfoo or Inspect pages belong in those pages' notes.

### Key evidence

- promptfoo repeats tests with `--repeat N` and flags repeated groups with mixed pass/fail in the completion summary. Each repeat index has its own cache entry by default; `--no-cache` forces fresh calls. ^e3
  > [!quote]
  > "promptfoo eval --repeat 3 ... Repeated groups with mixed pass/fail results are flagged in the completion summary. By default, each repeat index has its own cache entry; use --no-cache" (retrieved excerpt, ellipsis and wording as returned; treat as a paraphrase-grade quote).
- The retrieved text reports no confidence intervals or paired tests. ^e4

### Limitations

- The absence in ^e4 is not confirmed, only not found in the retrieved excerpt.
- ^e3 and ^e4 restate ^e1 and ^e2 from a second retrieval route (hosted docs through context7 rather than the GitHub source path); they do not add independent evidence.
