---
title: Library Maintenance Log
type: moc
summary: Chronological record of library changes
tags: []
created: 2026-11-15
updated: 2026-11-15
---

# Library Maintenance Log

**Status**: Active
**Last Updated**: 2026-11-15
**Document Scope**: Chronological record of library ingest and maintenance

---

## Log

### 2026-11-15

- Initialized the agentic-slop research library, templates, index, and taxonomy.
- Ingest (SMR-361): added 32 raw notes dated 2026-11-15 on benchmarking agent workflows against a bare model, covering scaffold effects, eval statistics, LLM-judge bias, task sets and grader integrity, cost accounting, and harness run layouts. Two notes capture the same Anthropic article, "Demystifying evals for AI agents" (`raw/2026-11-15-demystifying-evals-for-ai-agents` from the /engineering/ URL and `raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents` from the /research/ URL); both are kept because raw notes are append-only. `raw/2026-11-15-anthropic-infrastructure-noise` and `raw/2026-11-15-ai-agents-that-matter-kapoor` each carry an appended `## Update 2026-11-15` section. Abstract-only notes: HAL (arXiv:2510.11977), Hardy et al. (arXiv:2610.00651), Panickssery, Shi, Dubois, Zhuge, Ye (PDF fetches of the first two returned HTTP 500).
- Synthesis (SMR-361): wrote `wiki/benchmarking-workflows-against-a-bare-model`, `wiki/eval-statistics-for-small-agent-comparisons`, `wiki/llm-judge-bias-and-rubric-scoring`, `wiki/eval-integrity-and-task-sets`, and `wiki/eval-cost-run-layout-and-reporting`. All 32 raw notes are cited by at least one page. No product decisions are recorded; unretrieved leads and single-source claims are listed on each page.
- Taxonomy (SMR-361): registered domain tags `evaluation`, `benchmarking`, `llm-as-judge`, and `statistics`, used by the wiki pages only. Existing raw notes keep their frontmatter tags (raw notes are append-only). No topic map was created because no tag has more than five pages.
