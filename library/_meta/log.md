---
title: Library Maintenance Log
type: moc
summary: Chronological record of library changes
tags: []
created: 2026-11-15
updated: 2026-11-16
---

# Library Maintenance Log

**Status**: Active
**Last Updated**: 2026-11-16
**Document Scope**: Chronological record of library ingest and maintenance

---

## Log

### 2026-11-15

- Initialized the agentic-slop research library, templates, index, and taxonomy.
- Ingest (SMR-361): added 32 raw notes dated 2026-11-15 on benchmarking agent workflows against a bare model, covering scaffold effects, eval statistics, LLM-judge bias, task sets and grader integrity, cost accounting, and harness run layouts. Two notes capture the same Anthropic article, "Demystifying evals for AI agents" (`raw/2026-11-15-demystifying-evals-for-ai-agents` from the /engineering/ URL and `raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents` from the /research/ URL); both are kept because raw notes are append-only. `raw/2026-11-15-anthropic-infrastructure-noise` and `raw/2026-11-15-ai-agents-that-matter-kapoor` each carry an appended `## Update 2026-11-15` section. Abstract-only notes: HAL (arXiv:2510.11977), Hardy et al. (arXiv:2610.00651), Panickssery, Shi, Dubois, Zhuge, Ye (PDF fetches of the first two returned HTTP 500).
- Synthesis (SMR-361): wrote `wiki/benchmarking-workflows-against-a-bare-model`, `wiki/eval-statistics-for-small-agent-comparisons`, `wiki/llm-judge-bias-and-rubric-scoring`, `wiki/eval-integrity-and-task-sets`, and `wiki/eval-cost-run-layout-and-reporting`. All 32 raw notes are cited by at least one page. No product decisions are recorded; unretrieved leads and single-source claims are listed on each page.
- Taxonomy (SMR-361): registered domain tags `evaluation`, `benchmarking`, `llm-as-judge`, and `statistics`. (Corrected 2026-11-16: this entry first said the tags were used by the wiki pages only, that raw notes kept their tags, and that no tag had more than five pages. All three were wrong; see the 2026-11-16 repair entries.)

### 2026-11-16

- Lint repair (SMR-361): quoted the `summary:` value in `wiki/eval-integrity-and-task-sets` and `raw/2026-11-15-miller-adding-error-bars-to-evals`, whose unquoted ": " made the YAML frontmatter invalid and dropped both pages from the index's Dataview tables. Raw-note body text was not touched.
- Taxonomy repair (SMR-361): the raw notes of this batch are new, so only their `tags:` frontmatter line was reassigned (bodies and captures untouched). All 32 now carry `evaluation` or `performance`; `benchmarking`, `llm-as-judge`, `statistics`, and `operations` were added where the note's subject fits, and `reliability` was removed where it did not fit (it stays on notes about noise, flawed benchmarks, or judge and grader reliability). The six notes that had `tags: []` now have tags. Assignments are the repairer's judgement from titles and summaries, not a re-read of every note. Page counts per tag, wiki pages included: `evaluation` 36, `benchmarking` 18, `reliability` 13, `llm-as-judge` 7, `operations` 7, `statistics` 6.
- Topic maps (SMR-361): every tag above five pages now has a `type: moc` page, as librarian.md requires: `wiki/topic-evaluation`, `wiki/topic-benchmarking`, `wiki/topic-llm-as-judge`, `wiki/topic-statistics`, `wiki/topic-reliability`, `wiki/topic-operations`. Each has a Dataview query by tag and a static list of pages. Added to the index under Topic maps.
- Synthesis repair (SMR-361): `wiki/llm-judge-bias-and-rubric-scoring` caveat now says Anthropic eval guidance was read and gives only indirect evidence on mixing deterministic checks with a judge. `wiki/eval-integrity-and-task-sets` no longer says OpenAI's probe "excluded reasoning models" (no raw note says so) and cites the probe method instead. `wiki/eval-cost-run-layout-and-reporting` no longer attributes a self-hosted GPU-time claim to AWS (the AWS note has none) and lists the question as not covered. `wiki/benchmarking-workflows-against-a-bare-model` now states both halves of the LessWrong scaffold guidance (typical deployment, maximum capability) and says the paraphrase is the raw note's.
