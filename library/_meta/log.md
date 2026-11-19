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

### 2026-11-16

- Ingest (SMR-361): 60 raw notes dated 2026-11-16 covering Inspect AI and inspect_swe, promptfoo, Harbor, SWE-bench, Terminal-Bench, Harness Bench, DeepResearch Bench, Braintrust, Anthropic eval guidance, pytest-html, Plotly, hosted eval platforms, and repo files (Makefile, TESTING.md, package.json, existing smoke eval results and `claude plugin eval --help`). Source URLs and fetch limits are in each note.
- Overlaps for later merging: `raw/2026-11-16-promptfoo-evaluate-coding-agents` (GitHub source of the guide) and `raw/2026-11-16-promptfoo-docs-evaluate-coding-agents` (promptfoo.dev); `raw/2026-11-16-promptfoo-claude-agent-sdk-provider` (promptfoo.dev) and `raw/2026-11-16-promptfoo-claude-agent-sdk-docs-context7` (GitHub source); `raw/2026-11-16-harbor-hosted-cli-docs`, `raw/2026-11-16-harbor-hosted-submitting-jobs` and `raw/2026-11-16-harbor-trial-config-source` (same comparison-model finding); `raw/2026-11-16-harbor-claude-code-agent-source` and `raw/2026-11-16-harbor-job-skills-docs` (same skills finding); `raw/2026-11-16-inspect-swe` summarises several sources also held in their own notes.
- Synthesis (SMR-361): created `wiki/slopify-benchmark-tooling-options.md` (confidence low; no candidate was run, and plugin and workflow-script support is untested).
- Taxonomy: registered domain tags `evaluation` and `agent-harness`; applied to the wiki page. Raw notes keep their original tags (raw notes are append-only).
- Topic map: created `wiki/operations.md` (`type: moc`) for the 21 pages tagged `operations`, which now point `up` to it.

### 2026-11-17

- Ingest (SMR-376): 24 raw notes dated 2026-11-17 on published single-agent vs orchestrated evals, in groups by source. Amazon and UW arXiv 2611.12953 (two notes, `agent-architecture-cost-success-tradeoffs-arxiv-2611-12953` and `arxiv-2611-12953-agent-architecture-cost-success`, same source at the abstract and HTML URLs); SOP-Bench (v1 abstract, v2 abstract, v2 HTML); Google Research blog and arXiv 2512.08296 (blog, paper abstract, v3 HTML, v1 abstract); Anthropic multi-agent research system post; Tran and Kiela arXiv 2604.02460; Rakuten India arXiv 2608.18740; ArcticSwarm arXiv 2609.01870; Vals AI Vibe Code Bench post and its IAMag secondary; Anthropic docs "Optimizing for cost and intelligence"; Liu arXiv 2603.26458 (abstract and HTML notes); Squad benchmark README; BOAD arXiv 2512.23631 (two notes); Agyn arXiv 2602.01465; plus the SMR-376 research plan and a copy of the librarian instructions, which hold no eval evidence. The Daily Brief article was not fetched. An appended section on `raw/2026-11-16-harbor-hosted-submitting-jobs.md` records a library check for single-vs-multi-agent evidence and found none.
- Overlaps for later merging: `raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953` and `raw/2026-11-17-arxiv-2611-12953-agent-architecture-cost-success` (same paper; block IDs differ, so cite by note); `raw/2026-11-17-boad-arxiv-2512-23631` and `raw/2026-11-17-boad-hierarchical-software-engineering-agents-arxiv-v2`; `raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458` and `raw/2026-11-17-can-ai-models-direct-each-other-arxiv-html`; `raw/2026-11-17-sop-bench-v2-abstract` and `raw/2026-11-17-sop-bench-v2-html`; `raw/2026-11-17-google-research-scaling-agent-systems`, `raw/2026-11-17-arxiv-2512-08296-scaling-agent-systems`, `raw/2026-11-17-towards-a-science-of-scaling-agent-systems-arxiv-v3` and `raw/2026-11-17-scaling-agent-systems-v1-abstract`.
- Synthesis (SMR-376): created `wiki/single-vs-multi-agent-evals-coding.md` (confidence low, status active; coding evals are few; five of nine hold the model fixed, most of those at small n) and `wiki/single-vs-multi-agent-evals-outside-coding.md` (confidence medium, status contested; the evals disagree). Neither recommends a change to slopify. Unverified in the library: a 12-SOP variant of the Amazon and UW figures that the researcher reported from the paper's Conclusion and Limitations; no raw note records it.
- Taxonomy: no new tags; both pages use existing `evaluation`, `architecture`, `performance`, `agent-harness`. The `evaluation` tag has far more than five pages and no topic map yet; none was created in this batch.
