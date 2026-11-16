---
title: promptfoo - testing agent skills guide
type: raw
summary: promptfoo's agent-skills guide shows a two-arm comparison as two labelled providers with their own config and shared prompts and tests
tags: []
aliases: [promptfoo test-agent-skills]
source: https://github.com/promptfoo/promptfoo/blob/main/site/docs/guides/test-agent-skills.md
accessed: 2026-11-16
published: unknown
provider: promptfoo (via context7)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# promptfoo - testing agent skills guide

> [!quote] Source
> **URL**: https://github.com/promptfoo/promptfoo/blob/main/site/docs/guides/test-agent-skills.md
> **Accessed**: 2026-11-16
> **Method/Context**: Retrieved through context7 (`/promptfoo/promptfoo`, v0.125.1 listed) during SMR-361 (benchmark the slopify workflows against a bare-model baseline). Publication date unknown. Text in quotation marks is verbatim from the retrieved excerpt; the rest paraphrases it.

## Key evidence

- promptfoo expresses a two-arm comparison as two entries under `providers:` with distinct `label`s, each carrying its own `config` (`working_dir`, `setting_sources`, `skills`, `model`). The guide's own skill-comparison example pits `review-standards-v1` against `review-standards-v2` with a different `working_dir` fixture for each and the same model, while the prompts and tests are shared between the arms. ^e1
  > [!quote]
  > "providers: - id: anthropic:claude-agent-sdk label: review-standards-v1 config: model: claude-sonnet-5 working_dir: ./fixtures/v1 ... label: review-standards-v2 ... working_dir: ./fixtures/v2"

## Limitations

- Excerpt only: the elisions ("...") in the quoted example hide the remaining config keys, so which of `setting_sources` and `skills` the example sets is not confirmed by this source.
- The excerpt shows two skill versions, not a plugin versus a bare baseline. Applying the pattern to a plugin arm and a no-plugin arm is inference, not something the guide shows.
- Publication date unknown; the version label (v0.125.1) is the one context7 listed, not necessarily the version the page was written for.

## Relevance

- Gives a concrete config shape for the SMR-361 two-arm benchmark: one provider per arm, a label for each, shared prompts and tests. Inferred, not stated by the source.
