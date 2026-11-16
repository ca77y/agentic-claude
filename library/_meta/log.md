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
