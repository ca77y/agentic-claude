---
title: Inspect AI Tasks
type: raw
summary: Inspect AI expresses comparison arms as solvers or task parameters, and eval_set builds a parameter-by-model grid of tasks.
tags: [operations]
aliases: []
source: https://inspect.aisi.org.uk/tasks.html
accessed: 2026-11-16
published: unknown
provider: UK AI Security Institute (Inspect AI), via context7 /websites/inspect_aisi_uk
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Inspect AI Tasks

> [!quote] Source
> **URL**: https://inspect.aisi.org.uk/tasks.html
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). Retrieved through context7 (`/websites/inspect_aisi_uk`, source reputation Medium), not by fetching the page directly. Published date unknown.

## Key evidence

- Inspect AI expresses arms as solvers or task parameters. `inspect eval ctf.py --solver=ctf_agent -S attempts=5` selects a solver and passes a parameter. `eval_set([task_variant(...) for ...], model=[...], log_dir=...)` builds a parameter-by-model grid; the documentation example yields 16 tasks. ^e1
  - > [!quote] From the page (via context7)
  > This eval set will produce in total 16 tasks accounting for the parameter and model variation.
- Inference, not quoted: a bare-versus-plugin pair could be two task variants or two solver configs over one dataset, and each is a separate Task with its own log. ^e2

## Limitations

- Only one finding rests on this page. Findings about `Epochs`, `eval()` arguments and the `inspect_swe` `claude_code()` agent rest on other sources and are not recorded here.
- Read through context7 (reputation Medium), so the excerpts are not the full page. Published and version dates are unknown.
- The second bullet (^e2) is the researcher's inference about how to apply the grid to a bare-versus-plugin comparison. The retrieved text does not describe that comparison.

## Relevance

- Shows how Inspect AI would express a two-arm comparison (SMR-361) as task variants or solver configurations, with one log per Task.
