---
title: lm-evaluation-harness User Guide (interface.md)
type: raw
summary: How lm-evaluation-harness exposes seeds, config files and a testing-only sample limit on its command line
tags: [reliability]
aliases: []
source: https://raw.githubusercontent.com/EleutherAI/lm-evaluation-harness/main/docs/interface.md
accessed: 2026-11-15
published: unknown
provider: GitHub (EleutherAI lm-evaluation-harness repository documentation)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# lm-evaluation-harness User Guide (interface.md)

> [!quote] Source
> **URL**: https://raw.githubusercontent.com/EleutherAI/lm-evaluation-harness/main/docs/interface.md
> **Accessed**: 2026-11-15
> **Method/Context**: Repository documentation page on the main branch, undated. Recorded for the SMR-361 question on benchmarking the slopify workflows, in particular reproducibility controls and run configuration.

## Key evidence

- Seeds are command-line flags. `--seed` takes four values, defaulting to `0,1234,1234,1234` for the python, numpy, torch and fewshot seeds. ^e1
- Run configuration can come from a YAML file passed with `--config`, with command-line flags overriding it. ^e2
- `--limit` (running only part of each task) is documented as "for testing only", so a limited run is not a reportable result. ^e3
  > [!quote] Quote
  > "for testing only" (as quoted in the assignment; the surrounding sentence was not supplied)

## Limitations

- The seed defaults, `--config` override behaviour and `--limit` wording are recorded from the assignment's findings, which cite this page together with `lm_eval/loggers/evaluation_tracker.py`. Only the parts attributed to this page are kept here.
- The findings on results-file naming and the reproducibility fields in the results JSON (model name, system instruction and chat template SHAs, task hashes) rest on `evaluation_tracker.py`, not on this page, and are not recorded in this note.
- Only the `--limit` phrase is a direct quotation; the seed and config items are paraphrase. Whether the page documents a git hash or other version pin was not verified.

## Relevance

- Shows one harness treating seeds and a config file as explicit, user-visible run inputs, and sample limiting as a non-final mode. A comparable point for how slopify benchmark runs record and label their settings.
