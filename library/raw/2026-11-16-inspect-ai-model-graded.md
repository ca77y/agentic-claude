---
title: Inspect AI Model-Graded Scorers
type: raw
summary: Inspect AI's model_graded_qa scorer takes one grading model or a list that grade independently and are combined by a reducer, supports partial credit and custom templates, and defaults to a GRADE C or I format.
tags: [reliability]
aliases: []
source: https://inspect.aisi.org.uk/model-graded.html
accessed: 2026-11-16
published: unknown
provider: UK AI Security Institute (Inspect AI), via context7 /websites/inspect_aisi_uk
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Inspect AI Model-Graded Scorers

> [!quote] Source
> **URL**: https://inspect.aisi.org.uk/model-graded.html
> **Accessed**: 2026-11-16
> **Method/Context**: Inspect docs pages model-graded.html and custom-scorers.html, read via context7 (/websites/inspect_aisi_uk). Version unknown. Retrieved for ticket SMR-361 (benchmark the slopify workflows against a baseline).

## Key evidence

- Inspect AI has model-graded scoring. `model_graded_qa` takes a grading model, or a list of models that grade independently with the results combined by a reducer. It supports partial credit and a custom template, and its default grade format is `GRADE: C` or `GRADE: I`. ^e1
  - Passage (paraphrase of the retrieved docs): `model: list[string|Model]` ... if a list, each model grades independently and the results are combined by a reducer.
  - Default grade format, partial credit and custom template are as stated in the findings handed to the scribe; the exact docs wording for those was not supplied.

## Limitations

- Published date and Inspect version are unknown.
- The `model` parameter passage is a paraphrase, not a verbatim quote.
- This note records only what the model-graded pages say about grader configuration. It does not show how well model graders agree with humans on agent work products.

## Relevance

- A grader panel with a reducer is one way to reduce single-judge variance when scoring slopify workflow outputs against a baseline. ^e2
  - Inference, not stated in the source.
