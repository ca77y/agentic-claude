---
title: Anthropic Engineering, How we built our multi-agent research system
type: raw
summary: Anthropic's 2025-06-13 engineering post reports a 90.2% gain of an Opus 4 lead with Sonnet 4 subagents over single-agent Opus 4 on an internal eval, uncontrolled and without sample size or significance.
tags: [evaluation, architecture, performance, agent-harness]
aliases: []
source: https://www.anthropic.com/engineering/multi-agent-research-system
accessed: 2026-11-17
published: 2025-06-13
provider: Anthropic Engineering (Hadfield, Zhang, Lien, Scholz, Fox, Ford)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# Anthropic Engineering, How we built our multi-agent research system

> [!quote] Source
> **URL**: https://www.anthropic.com/engineering/multi-agent-research-system
> **Accessed**: 2026-11-17
> **Method/Context**: Gathered for SMR-376 (published evals of single-agent versus other agent designs). A vendor engineering post about a production feature. Bullets say whether they are quotation, paraphrase or inference; a quote is verbatim from the post as relayed by the researcher.

## Key evidence

- Headline result: a multi-agent system with Claude Opus 4 as lead and Claude Sonnet 4 subagents beat single-agent Claude Opus 4 by 90.2% on Anthropic's internal research eval. (quote) ^e1
  > [!quote] "We found that a multi-agent system with Claude Opus 4 as the lead agent and Claude Sonnet 4 subagents outperformed single-agent Claude Opus 4 by 90.2% on our internal research eval."
- The two arms differ in model mix, not only in design: Opus 4 lead with Sonnet 4 workers against a single Opus 4. The post does not say whether tools and prompts were identical across arms, and says the system was tuned with prompts and tools. Supporting passages: "prompt engineering was our primary lever for improving these behaviors", and the subagent prompt principles (delegation instructions, scaling-effort rules, tool-selection heuristics). (inference from quotes; the post gives no statement of matched prompts or tools) ^e2
- Architecture: a LeadResearcher plans, saves its plan to Memory, spawns subagents in parallel (3-5 at a time, each using 3+ tools in parallel), synthesizes, then passes the report to a CitationAgent. Lead agents run subagents synchronously. (quote; the post text reads "a multi-agent architecture") ^e3
  > [!quote] "Our Research system uses a multi-architecture with an orchestrator-worker pattern, where a lead agent coordinates the process while delegating to specialized subagents that operate in parallel."
- Eval size and measure: the post gives the 90.2% result no sample size, no variance, no significance test and no per-arm absolute score. The only size it states is the starting dev set, "about 20 queries representing real usage patterns", described as where the authors began, not as the eval behind the 90.2%. Grading is by a single LLM-judge call with a rubric (factual accuracy, citation accuracy, completeness, source quality, tool efficiency), scores 0.0-1.0 plus pass/fail, plus human testing. (quote) ^e4
  > [!quote] "We started with a set of about 20 queries representing real usage patterns." and "a single LLM call with a single prompt outputting scores from 0.0-1.0 and a pass-fail grade"
- Token multiples: the post reports agents use about 4x more tokens than chat and multi-agent systems about 15x more than chat. The baseline is chat, not a single agent, so the post gives no multi-agent to single-agent token ratio (15/4 = 3.75 is arithmetic on the post's figures, not a figure the post reports). No latency comparison against a single agent is given. (quote) ^e5
  > [!quote] "In our data, agents typically use about 4× more tokens than chat interactions, and multi-agent systems use about 15× more tokens than chats."
- What drives performance: on the BrowseComp eval, three factors explained 95% of performance variance. Token usage alone explains 80%; tool-call count and model choice are the other two factors. The post concludes multi-agent systems work "mainly because they help spend enough tokens to solve the problem." Upgrading to Claude Sonnet 4 gives a larger gain than doubling the token budget on Sonnet 3.7. Sample size and method for this variance analysis are not given. (quote) ^e6
  > [!quote] "three factors explained 95% of the performance variance in the BrowseComp evaluation... token usage by itself explains 80% of the variance, with the number of tool calls and the model choice as the two other explanatory factors."
- Speed claim: parallelization (lead spinning up 3-5 subagents in parallel, subagents using 3+ tools in parallel) "cut research time by up to 90% for complex queries". This compares against the team's own earlier sequential-search versions, not a separate single-agent arm. (quote for the 90%; the baseline reading is inference from "Our early agents executed sequential searches, which was painfully slow.") ^e7
- Stated limits and fit: breadth-first queries benefit most. Not a good fit: domains where all agents must share context or have many dependencies. "most coding tasks involve fewer truly parallelizable tasks than research, and LLM agents are not yet great at coordinating and delegating to other agents in real time." Economic viability needs high-value tasks. Other stated issues: early agents spawned 50 subagents for simple queries, duplicated work and distracted each other; synchronous execution creates bottlenecks (lead cannot steer subagents, subagents cannot coordinate); errors compound, minor changes cascade, emergent behavior. (quote) ^e8
- Controlled or uncontrolled: uncontrolled. It is a vendor engineering post about a production feature. The authors say prompts, tool descriptions and scaling rules were tuned for the multi-agent system (tool-description rewriting cut task completion time 40%), the arms differ in model mix, and the post reports no per-arm prompt or tool parity, sample size or significance. The post never calls itself a controlled comparison. (inference from the quotes above) ^e9
- Eval-practice remark: the authors say small samples suffice early because effect sizes are large ("A prompt tweak might boost success rates from 30% to 80%... you can spot changes with just a few test cases"), which signals the 90.2% is a development-eval result, not a significance-tested benchmark. (quote; the reading of the 90.2% as a dev-eval figure is inference) ^e10

## Limitations

- Findings were relayed by the researcher from the post; quotes are as relayed and were not re-fetched by the scribe.
- Single vendor source about its own product; the 90.2% figure cannot be reproduced or checked from the post (internal eval, no sample size, no per-arm scores).
- "Outperformed by 90.2%" is not defined in the relayed text (relative gain on which score is not stated).
- The post's wording "multi-architecture" in the quoted sentence was noted by the researcher as the post's text reading "a multi-agent architecture".

## Relevance

- Evidence on the SMR-376 question: it is a published single-agent versus multi-agent comparison, but uncontrolled (model mix differs, tuning favors the multi-agent arm), so it supports "multi-agent helped in this product on breadth-first research" more than "multi-agent design beats single-agent at equal conditions". ^e11
- The BrowseComp variance analysis (^e6) points to token spend as the main driver, which bears on whether the gain comes from design or from budget.
