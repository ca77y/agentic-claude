---
title: Optimizing for cost and intelligence (Claude Platform Docs)
type: raw
summary: Anthropic docs page with vendor-run evals of single agent vs subagent and advisor designs, and its own conclusion on when delegation pays.
tags: [evaluation, agent-harness, performance]
aliases: []
source: https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence
accessed: 2026-11-17
published: unknown
provider: Anthropic
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# Optimizing for cost and intelligence (Claude Platform Docs)

> [!quote] Source
> **URL**: https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence
> **Accessed**: 2026-11-17
> **Method/Context**: Fetched for SMR-376 (published evals of single agent vs multi-agent designs). Publication date unknown; the page cites runs dated Aug to Oct 2026. Vendor documentation, not peer reviewed. Quotations are marked as such; everything else is the scribe's paraphrase of the supplied findings.

## Key evidence

- **SWE-bench Pro: no model-fixed single vs multi-agent comparison found.** The only SWE-bench Pro multi-agent data found are advisor-tool pairings that use two different models (an executor plus a stronger advisor), so the model is not held fixed. For SMR-375 this is a gap, not a result. The page gives a 482-problem (ref 3 text) or 478-problem (body text) SWE-bench Pro subset that is not comparable to the public leaderboard, and it states no pairing score for the Sonnet 5 pairings beyond the 77.4% baseline. ^e1
  > [!quote] Page text
  > "Claude Sonnet 5 alone twice at its default effort (77.4%, the baseline for both pairings)"; "On 20 SWE-bench Pro problems, the suggested prompt made no clear difference for Claude Sonnet 5.5"; "At its default effort, high, Claude Sonnet 5.5 did not consult the advisor on any of the 20 problems"

- **Eval A (vendor; tools fixed, orchestrator model fixed, subagent model differs; treat as partly uncontrolled).** Anthropic internal coding benchmark, 134 repository tasks graded by hidden tests, 5 attempts per task in each of 3 runs, Oct 21 to 23 2026, Claude Managed Agents (page ref 29). Designs: Opus 5.5 alone at medium; Opus 5.5 at medium plus Haiku 5.5 subagents (no added prompt); the same with a 113-word delegation prompt; Opus 5.5 alone at low. Every agent used the same two custom tools (shell, file editor). Latency not reported. ^e2
  - Opus 5.5 alone at medium: pass 72.1%, $4.78 per attempt.
  - With subagents, no prompt: 68.8%, $3.35.
  - With subagents plus prompt: 67.9%, $3.27.
  - Opus 5.5 alone at low: 63.0%, $1.84.
  - With the prompt: 32% less cost (95% interval 29 to 35%) and 4.2 pp fewer passed (1.3 to 7.1).
  - The subagent designs landed on the line between low and medium (+0.5 pp, interval -2.3 to +3.2), "neither above nor below it".
  > [!quote] Page text
  > "Every agent used two custom tools, a shell and a file editor"; "Differences are paired by task within each run, and the intervals are bootstrap intervals over the 134 tasks"

  > [!warning] Stated limit
  > Voided attempts fell only on the subagent configurations (72 of 2,010 with prompt). With those excluded the gap was 1.7 pp fewer (4.4 fewer to 1.1 more), so part of the loss comes from the evaluation's own rules.

- **Eval B (vendor; model differs across arms, so not model-fixed).** Anthropic internal agentic-coding benchmark, 370 repository tasks graded by each repo's own tests, plain API agent, 5 attempts per task (page ref 11 and Advisor strategy section). Opus 5.5 at high with a Fable 5.1 advisor scored 90.1% at $2.92 per attempt. Opus 5.5 alone: 74.8% at $0.35 (low), 86.6% at $0.84 (medium), 88.4% at $1.38 (high), 91.1% at $4.11 (xhigh). The advisor adds 1.7 pp over Opus 5.5 at high for about 2.1x the cost, "at the edge of run-to-run noise". The advisor was consulted about 1.4 times per attempt. Latency is stated only qualitatively, as "about one or two extra frontier-model calls per task, each on the task's critical path" (no number). ^e3
  > [!quote] Page text
  > "the advisor bought about what more effort does"

- **Terminal-Bench: no design comparison on this page.** The page reports Terminal-Bench 3 runs (74 tasks, 2 runs per model, 148 attempts per model; "single runs swing by 5 to 11 points", page ref 20) but compares models only, not single-agent against orchestrated designs. ^e4

- **The page's own cross-eval conclusion on delegation.** Delegation came out ahead in only two situations: routine work with a long cost tail, and work larger than one context window. The measured cases are BrowseComp, DeepWideSearch and an internal defect-search benchmark, not coding tasks. Useful for the outside-coding page and the agree/disagree section. ^e5
  > [!quote] Page text (Orchestrator strategy section)
  > "When the work is one dependent chain, or fits in a single context without a long cost tail, the orchestrator's model alone at lower effort came out ahead in every case measured on earlier models"

## Limitations

- Vendor-run, self-reported, no peer review; the evals use internal benchmarks that readers cannot rerun.
- Eval A varies the subagent model (Haiku 5.5) against a single Opus 5.5 agent, and its voided-attempt rule affected only the subagent arms. Eval B varies the model across arms. Neither is a clean same-model single vs multi-agent test.
- The SWE-bench Pro subset size differs inside the page (482 vs 478) and is not comparable to the public leaderboard.
- Latency is not reported numerically in any eval summarized here.
- Publication date unknown; the retrieval date is 2026-11-17.

## Relevance

- Supplies two vendor datapoints for SMR-376: delegation lowered cost at a small pass-rate loss (Eval A), and an advisor bought about what more effort does (Eval B). Neither holds the model fixed.
- Records the SWE-bench Pro and Terminal-Bench gaps for SMR-375 as gaps, not results.
- The orchestrator-strategy conclusion applies to non-coding work and is cited as such.
