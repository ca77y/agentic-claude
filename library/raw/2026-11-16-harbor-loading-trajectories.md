---
title: Harbor Loading Trajectories
type: raw
summary: The Harbor docs page on loading trajectories, recorded for where Harbor stores claude-code native sessions and ATIF trajectories inside a trial output.
tags: [operations]
aliases: []
source: https://docs.harborframework.com/jobs/loading-trajectories
accessed: 2026-11-16
published: unknown
provider: Harbor (harbor-framework)
up: "[[library/wiki/operations|Operations]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Harbor Loading Trajectories

> [!quote] Source
> **URL**: https://docs.harborframework.com/jobs/loading-trajectories
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). The finding below was reported by a researcher from this page. The page carries no version date. Wording is paraphrase or quotation as marked on each bullet.

## Key evidence

- Trial output layout: Harbor stores claude-code native sessions at `agent/sessions/projects/-app/<session-id>.jsonl` and ATIF trajectories at `agent/trajectory.json` inside the trial output. (quote/paraphrase; the researcher's report does not separate the quoted from the paraphrased wording) ^e1

## Limitations

- The page carries no version date.
- The researcher's report cites a second Harbor page, `https://docs.harborframework.com/jobs/run-a-job`, for the job and CLI details (a job as a collection of trials, `harbor run` with a jobs directory and a job name). Those details do not rest on this page and are not recorded here.
- Whether the job output is plain JSON files (such as `result.json`), and its exact layout beyond the two paths in ^e1, was not confirmed. Harbor also has a hosted Harbor Hub mode, which this note does not cover.

## Relevance

- The two paths in ^e1 show where the transcript of a claude-code run can be read back from a trial output, which a comparison of slopify workflow runs would need (inference from ^e1, not a page statement).
