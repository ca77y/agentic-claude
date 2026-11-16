---
title: Benchmarking workflows against a bare model
type: wiki
summary: What published evaluation work says about comparing a workflow or scaffold against a bare model, what to hold constant, and where the evidence is thin.
status: active
confidence: medium
tags: [evaluation, benchmarking, reliability]
aliases: [slopify vs bare Opus benchmark research]
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/wiki/eval-statistics-for-small-agent-comparisons]]"
  - "[[library/wiki/llm-judge-bias-and-rubric-scoring]]"
  - "[[library/wiki/eval-integrity-and-task-sets]]"
  - "[[library/wiki/eval-cost-run-layout-and-reporting]]"
created: 2026-11-15
updated: 2026-11-15
---

# Benchmarking workflows against a bare model

> [!abstract] Summary
> Research for SMR-361 (compare slopify workflows with bare Opus on the same tasks). An agent eval measures harness plus model, so the comparison changes the harness and fixes the model. No source found benchmarks a prompt-and-workflow plugin against a bare model; the evidence is scaffold-versus-scaffold or model-versus-model, so applicability is inference. This page records evidence only and makes no product decision.

## Claims

- An agent evaluation measures the harness and the model together, so a workflow-versus-bare comparison varies the harness and holds the model fixed. [[raw/2026-11-15-demystifying-evals-for-ai-agents#^e1]]
- Scaffold choice matters a lot. On HAL data scaffolds explained more variance in logit performance than models did, after controlling for log price and benchmark. [[raw/2026-11-15-lesswrong-just-a-wrapper-scaffolds-matter#^e1]] (secondary analysis, not peer reviewed; see Caveats)
- Scaffold effects are model-dependent: the same scaffold helped some models and hurt others (GAIA Kendall tau 0.17 across scaffolds; negative rank correlation on CORE-Bench Hard). A result for Opus therefore need not transfer to other models. [[raw/2026-11-15-lesswrong-just-a-wrapper-scaffolds-matter#^e3]]
- A fixed model-scaffold system ranks far more reliably (0.935-0.994) than the underlying model alone (0.148-0.841). This is a model-ranking claim and is consistent with limiting any slopify claim to "slopify workflows with Opus versus bare Opus". [[raw/2026-11-15-agent-evaluation-reliability-more-tasks-wont-fix-leaderboard#^e1]], [[raw/2026-11-15-agent-evaluation-reliability-more-tasks-wont-fix-leaderboard#^e2]]
- The bare arm is not neutral. A bare run still needs a harness (tools, loop, system prompt), and a baseline without tool calls would make many scaffolds "look comparatively amazing". The baseline harness should be named explicitly (for example Claude Code with no slopify plugin loaded; that example is the integrator's inference, not a source claim). [[raw/2026-11-15-lesswrong-just-a-wrapper-scaffolds-matter#^e4]]
- Guidance on fixing versus varying the scaffold depends on the claim: to assess typical deployment, fix the scaffold actually used; to assess maximum capability, run several scaffolds and take the best. [[raw/2026-11-15-lesswrong-just-a-wrapper-scaffolds-matter#^e5]] The quoted line in the raw note ("the leaderboard should fix the scaffold that will actually be used") is itself recorded there as a paraphrase of the post, not a verbatim extract. For a workflow-versus-bare comparison the typical-deployment half applies if the claim is value of the workflow as shipped (the note's reading); the maximum-capability half is a different claim.
- Weak baselines flatter a workflow. Simple baselines (retry, warming, escalation) matched the best HumanEval agent architectures in accuracy, so the comparison should include a simple baseline and not only a no-op one. [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e6]], [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e12]] (the latter is the note's inference)
- A trivial or do-nothing arm as a floor, plus an oracle or reference solution per task, are mitigations the ABC paper gives. [[raw/2026-11-15-establishing-best-practices-for-agentic-benchmarks-abc#^e5]], [[raw/2026-11-15-establishing-best-practices-for-agentic-benchmarks-abc#^e6]]

### What to hold constant (inferred checklist)

No single source states this list; it is assembled from the cited advice and is inference.

| Variable | Evidence |
| --- | --- |
| Model and version | the fixed-model premise, [[raw/2026-11-15-demystifying-evals-for-ai-agents#^e1]]; one lever at a time, [[raw/2026-11-15-aws-tokenomics-for-coding-agents#^e1]] |
| Task and grader | same task and grader per trial, [[raw/2026-11-15-demystifying-evals-for-ai-agents#^e2]] |
| Environment | clean isolated environment per trial; shared state (for example `git log` from earlier trials) inflates scores, [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents#^e6]], [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi#^e6]] |
| Resources and infrastructure | identical infrastructure; resource configuration moved Terminal-Bench 2.0 scores by 6 points, [[raw/2026-11-15-anthropic-infrastructure-noise#^e6]] |
| Settings such as reasoning effort | higher effort reduced accuracy in most HAL runs, so pin it, [[raw/2026-11-15-holistic-agent-leaderboard-hal#^e3]] (abstract only) |
| Tools and system prompt | the baseline harness choice, [[raw/2026-11-15-lesswrong-just-a-wrapper-scaffolds-matter#^e4]] |
| Budget and token caps | only implied: some specialist scaffolds gain accuracy by using significantly more tokens, [[raw/2026-11-15-lesswrong-just-a-wrapper-scaffolds-matter#^e2]]; compare at matched or reported cost, [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e1]] |

## Design considerations

> [!note] For the shaping step, not decisions
> - Read run logs for shortcuts, not only scores: HAL's log inspection found an agent searching HuggingFace for the benchmark instead of solving the task. [[raw/2026-11-15-holistic-agent-leaderboard-hal#^e2]]
> - A tuned workflow needs a hold-out task set kept out of tuning (inference from [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e9]], [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e11]]).
> - Statistics, task sets, scoring, cost, and layout are on the related pages.

## Caveats and limits

> [!warning] Evidence limits
> - The HAL and Hardy et al. notes rest on abstract pages only. `web_fetch` of the PDFs (arxiv.org/pdf/2610.00651, arxiv.org/pdf/2510.11977) returned HTTP 500 (correlation ids dab342704690 and 4532e1bc2665), so there are no method-section quotes on held-constant variables. The HTML versions (arxiv.org/html/2510.11977v1, arxiv.org/html/2610.00651v1) were not tried and are leads.
> - The Gundlach et al. post is a secondary analysis of HAL data, not peer reviewed, and the authors say Claude Opus ran the analysis. Low to medium confidence on its own.
> - The plan's two-source rule is met for the principles but not for the held-constant list. Budget and token-cap equalisation is implied, not stated by any source.
> - Dates: Gundlach (2026-06) and Hardy (2026-09) are recent; HAL (2025-10) is about 13 months old with older model versions. Kapoor et al. (2024-07) is past the 18-month bar and its HumanEval-era numbers should not be carried over.
> - The plan assumed published work compares scaffolds with a bare model on the same tasks. In practice the literature compares scaffold to scaffold or model to model, and a no-scaffold baseline is rarely run.

## Open questions

> [!question]
> - Does any study compare a prompt-and-workflow plugin with a bare model on a small custom suite? None was found.
> - What do the unretrieved leads say: Claw-SWE-Bench (arXiv:2606.12344), the Terminal-Bench scaffold-confound page (systems-analysis.info, secondary), OpenReview rBCBZQTqPs, Anthropic's infrastructure-noise post (now read, see the cost page), and Davidson et al. 2023 (arXiv:2312.07413)? Nothing is claimed about the first four's contents beyond what is cited above; the rest were not fetched.
> - Tension to keep explicit: Anthropic says 20-50 tasks suffice when effects are large, while Hardy et al. say more tasks cannot fix uncertainty from limited scaffold coverage. See [[library/wiki/eval-statistics-for-small-agent-comparisons]].

## Sources

- [[raw/2026-11-15-demystifying-evals-for-ai-agents]], [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents]]
- [[raw/2026-11-15-holistic-agent-leaderboard-hal]], [[raw/2026-11-15-lesswrong-just-a-wrapper-scaffolds-matter]], [[raw/2026-11-15-agent-evaluation-reliability-more-tasks-wont-fix-leaderboard]]
- [[raw/2026-11-15-ai-agents-that-matter-kapoor]], [[raw/2026-11-15-establishing-best-practices-for-agentic-benchmarks-abc]], [[raw/2026-11-15-aws-tokenomics-for-coding-agents]], [[raw/2026-11-15-anthropic-infrastructure-noise]], [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi]]
