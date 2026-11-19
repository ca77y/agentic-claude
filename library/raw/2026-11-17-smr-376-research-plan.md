---
title: SMR-376 research plan
type: raw
summary: The SMR-376 research plan that defines sub-questions q1 to q9, with the library-state checks run against it on 2026-11-17 before any q1 to q8 note existed.
tags: [evaluation]
aliases: []
source: .tmp/research/smr-376.plan.md
accessed: 2026-11-17
published: 2026-11-17
provider: project file (SMR-376 research workflow)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# SMR-376 research plan

> [!quote] Source
> **URL**: none; project file `.tmp/research/smr-376.plan.md` in the SMR-376 worktree (branch `tokwieci/smr-376-research-published-evals-of-single-agent-vs`, HEAD 50d66a9, clean working tree when checked). The `published` date is the access date, because the file is a local working file.
> **Accessed**: 2026-11-17
> **Method/Context**: The plan "Research plan SMR-376" defines sub-questions q1 to q9. The findings below come from checks run against the project library, using a file listing of `library/raw`, a content search of `library/raw`, and name searches of the repo and worktrees. They are inferences from absence, not quotations from the plan, except where marked.

## Key evidence

- Inference: when checked, no raw note from q1 to q8 existed, so no agree/disagree synthesis (q9) could be built. `ls library/raw` listed 61 entries, and the only dated 2026-11-16 notes were on Harbor, Inspect, promptfoo, the SWE-bench and Terminal-Bench READMEs, Harness Bench, slopify smoke results and similar. None was dated after 2026-11-16 or had a slug for SOP-Bench, arXiv 2611.12953, Google scaling agent systems, Anthropic multi-agent research, Vals AI, or any single-vs-multi-agent coding eval. ^e1
- A content search of `library/raw` for "multi-agent", "orchestrat" and "single-agent" hit only three Harbor notes, and those concern Harbor job configuration, not eval results: `library/raw/2026-11-16-harbor-hosted-cli-docs.md` line 40, `library/raw/2026-11-16-harbor-hosted-submitting-jobs.md` line 36, and `library/raw/2026-11-16-harbor-trial-config-source.md` line 35. Those notes carry no success, token or latency comparison between a single agent and an orchestrated design. One of them says, in quotation: "I did not confirm that the local `harbor run -c` path takes the same `n_attempts` and multi-agent keys". ^e2
- Searches for "sop-bench" and "2611" file names, and for raw notes matching sop, google, scaling, vals, multi or anthropic, returned nothing from the project. The searches were shell `find` and `ls` over the repo and worktrees. One `find` that crawled the whole filesystem timed out and was backgrounded, and its output was not used. ^e3

## Limitations

- The checks are a snapshot from 2026-11-17 and went stale during the same workflow run. A later `git status` in the worktree showed untracked `library/raw/2026-11-17-*` notes on SOP-Bench, arXiv 2611.12953, Google's scaling-agent-systems post, Anthropic's multi-agent research system and Vals AI. This is inference from the file names; their contents were not read here. Treat ^e1 and ^e3 as true only for the moment they were run.
- The other worktrees under `/Users/catty/Workspace/agentic-claude/.worktrees` (smr-358, 359, 360, 361, 369, 370, ci-review-bg-wait) were not searched for q1 to q8 notes. It is unknown whether such notes sit in another checkout. ^e4
- The plan file itself is not quoted here beyond what the findings rest on; read the file for the question text and evidence bar.

## Relevance

- Supports a decision on ordering: q9 depends on notes from q1 to q8, and each claim in it needs a raw-note block citation.
- Records that the existing 2026-11-16 library content gives no single-vs-multi-agent eval result, so those results needed new sources.
