---
title: ArcticSwarm, Deferring Early Consensus in Long-Horizon Multi-Agent Research (arXiv 2609.01870v2)
type: raw
summary: Controlled BrowseComp-Plus comparison (Qwen 3.5-27B, 830 questions) of an author-built orchestrated swarm against single-agent, majority-vote, MiroFlow, Duo and Direct Messaging designs, with token and latency figures.
tags: [evaluation, architecture, performance, agent-harness]
aliases: []
source: https://arxiv.org/abs/2609.01870
accessed: 2026-11-17
published: 2026-09-01
provider: arXiv
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# ArcticSwarm, Deferring Early Consensus in Long-Horizon Multi-Agent Research (arXiv 2609.01870v2)

> [!quote] Source
> **URL**: https://arxiv.org/abs/2609.01870 (full text: https://arxiv.org/html/2609.01870v2)
> **Accessed**: 2026-11-17
> **Method/Context**: Yoon et al. Published 2026-09-01 (v1); v2 2026-11-11. Read for the question of published single-agent vs multi-agent evals. Read: abstract; Sections 4, 5.1, 5.2; Tables 2 and 21; Appendix H.1, I.6; Limitations.

## Key evidence

- **Eval: deep web research, BrowseComp-Plus, 830 questions.** The architecture rows are controlled on model, tools and limits. Task set: all 830 BrowseComp-Plus questions (fixed retrieval corpus, Arctic Embed L v2.0), plus a live-web BrowseComp extension (1,266 questions mentioned) with GPT-5, run once per configuration. ^e1
- **Designs (Qwen 3.5-27B, the controlled study).** ArcticSwarm (orchestrator plus up to 16 subagents, with a gathering gate and an integration gate; the authors' own system), a single agent (one browsing agent, no peer channel), Majority@20 of single-agent runs at ArcticSwarm's token budget, MiroFlow multi-agent (replicated from its official codebase with native prompts and hierarchy), MiroFlow single agent and Majority@36, Duo (leader plus auditor), and Direct Messaging (DM). ^e2
- **Held fixed: yes for the architecture rows.** All conditions use Qwen 3.5-27B, the same corpus and tool endpoints, 20,000 s per question, 1,200 orchestrator turns and 200 subagent turns. ^e3
  > [!quote] Source excerpt
  > "replace the coordination structure (single agent, DM, and Duo) with the model, timeout, and tools fixed, so they are end-to-end architecture comparisons"
- **Success (accuracy, %).** ArcticSwarm 82.6 +/-0.5; MiroFlow multi-agent 70.6 +/-3.7; MiroFlow single 54.1 +/-0.9 (mean of 40 runs); ArcticSwarm single agent 48.4 +/-1.0 (20 runs); Majority@20 62.5; Majority@36 (MiroFlow) 63.2; Duo 66.1; DM 61.9. ^e4
  > [!quote] Source excerpt
  > "MiroFlow reaches 70.6% under the same model, tools, and limits, and majority voting reaches 62.5% at the same token budget"
- **Tokens** (Table 21 and Table 2, relative to ArcticSwarm = 1x at 24.86M tokens per case). Single agent 0.05x (about 1.25M per case); Duo 0.31x; DM 1.14x; MiroFlow single 0.03x. ^e5
- **Latency** (median minutes per case). ArcticSwarm 104.4; DM 38.9; Duo 10.0. Single-agent latency is not in Table 21, which lists only three-run configurations. ^e6
- **Significance.** 95% question-bootstrap CIs (100,000 resamples) and Holm-adjusted tests for paired differences within the ArcticSwarm family. As read, the single-agent rows are not marked with the significance asterisk in Table 2. ^e7
- **Sample size.** 830 questions, three executions each; 20 and 40 runs for the single-agent rows. ^e8
- **Authors' conclusion.** ^e9
  > [!quote] Source excerpt
  > "structured coordination, not agent count alone, drives the improvement"

## Limitations

- The winning system (ArcticSwarm) is the authors' own. Its single agent (48.4%) is weaker than MiroFlow's single agent (54.1%), so the 34-point gap over "single agent" depends on which single agent is used.
- Authors' stated limits: tool harness issues (PDF reader memory use, search failures, safety refusals), run-to-run nondeterminism, and closed-model live-web runs executed once because of cost.
- The single-agent rows are not marked significant in Table 2 as read; I did not verify the paired tests for them.
- Single-agent latency was not found in what was read.

## Relevance

- Reading (inference, not quoted): ArcticSwarm used about 20x the tokens of the single agent and beat it by about 34 points. Yet a single agent run 20 to 36 times and majority-voted at equal tokens reached only about 63%. On this task, then, coordination design, not agent count alone, accounted for the gain (^e4, ^e5). The other orchestrated design (MiroFlow) beat its own single agent by 16.5 points at far more tokens (^e4, ^e5). This is a case where multi-agent wins, with a token cost far above the single agent's.
