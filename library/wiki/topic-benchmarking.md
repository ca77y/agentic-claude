---
title: Benchmarking topic map
type: moc
summary: Map of library pages tagged benchmarking (18 pages at creation).
tags: [benchmarking]
aliases: []
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Benchmarking topic map

> [!abstract] Map of content
> Benchmark design, scaffold effects, and comparing a workflow against a bare model. Lists every page tagged `benchmarking`; the tag crossed five pages, so librarian.md requires this map.

## Wiki pages

```dataview
TABLE confidence, updated
FROM "library/wiki"
WHERE type = "wiki" AND contains(tags, "benchmarking")
SORT updated DESC
```

- [[library/wiki/benchmarking-workflows-against-a-bare-model|Benchmarking workflows against a bare model]]
- [[library/wiki/eval-integrity-and-task-sets|Eval integrity and task sets]]

## Raw notes

```dataview
TABLE source, accessed
FROM "library/raw"
WHERE type = "raw" AND contains(tags, "benchmarking")
SORT file.name ASC
```

- [[library/raw/2026-11-15-agent-benchmarks-stop-ranking-before-they-run-out-of-tasks|Agent Benchmarks Stop Ranking Before They Run Out of Tasks]]
- [[library/raw/2026-11-15-agent-evaluation-reliability-more-tasks-wont-fix-leaderboard|Agent Evaluation Reliability: More Tasks Won't (Always) Fix An Agent Leaderboard]]
- [[library/raw/2026-11-15-ai-agents-that-matter-kapoor|AI Agents That Matter (Kapoor et al.)]]
- [[library/raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents|Demystifying evals for AI agents (Anthropic Engineering)]]
- [[library/raw/2026-11-15-anthropic-infrastructure-noise|Quantifying infrastructure noise in agentic coding evals (Anthropic)]]
- [[library/raw/2026-11-15-aws-tokenomics-for-coding-agents|Tokenomics for coding agents (AWS)]]
- [[library/raw/2026-11-15-demystifying-evals-for-ai-agents|Demystifying evals for AI agents]]
- [[library/raw/2026-11-15-establishing-best-practices-for-agentic-benchmarks-abc|Establishing Best Practices for Building Rigorous Agentic Benchmarks (ABC)]]
- [[library/raw/2026-11-15-holistic-agent-leaderboard-hal|Holistic Agent Leaderboard (HAL) abstract]]
- [[library/raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi|How We Broke Top AI Agent Benchmarks (UC Berkeley RDI)]]
- [[library/raw/2026-11-15-lesswrong-just-a-wrapper-scaffolds-matter|Just a Wrapper? How Much Do Scaffolds Matter?]]
- [[library/raw/2026-11-15-openai-gdpval|OpenAI GDPval, measuring model performance on real-world tasks]]
- [[library/raw/2026-11-15-openai-why-we-no-longer-evaluate-swe-bench-verified|Why SWE-bench Verified no longer measures frontier coding capabilities (OpenAI)]]
- [[library/raw/2026-11-15-swe-bench-evaluation-guide|SWE-bench Evaluation Guide]]
- [[library/raw/2026-11-15-swe-bench-pro|SWE-Bench Pro (arXiv:2509.16941)]]
- [[library/raw/2026-11-15-tau-bench-tool-agent-user-interaction|tau-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains]]
