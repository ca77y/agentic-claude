---
title: Eval cost, run layout, and reporting
type: wiki
summary: Evidence on cost and usage accounting between arms, how public harnesses name and lay out run results, and what their HTML or log reports show.
status: active
confidence: medium
tags: [evaluation, performance, reliability]
aliases: []
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/wiki/benchmarking-workflows-against-a-bare-model]]"
  - "[[library/wiki/eval-statistics-for-small-agent-comparisons]]"
created: 2026-11-15
updated: 2026-11-15
---

# Eval cost, run layout, and reporting

> [!abstract] Summary
> Cost and quality should be reported together per arm, with token counts stored so cost can be recomputed. Four public harnesses give precedent for run IDs, result layout, and reports. None uses a `<version>-<date>-<n>` scheme, so they are precedent for the pattern, not the naming. Variance and cost display in a single-file report has thin evidence.

## Cost and usage accounting

- Report accuracy and dollar cost together (Pareto frontier); compare at matched or reported cost, because retries or sampling can buy accuracy. [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e1]], inference for slopify at [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e4]]
- Store token counts so cost can be recomputed at current prices, and snapshot the price basis. [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e2]], [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e3]]
- Hold model, hosting, and rate fixed and change one lever at a time. In AWS's comparison, a lighter harness cost less and used fewer tokens for all 12 models with no score loss; the heavier harness spawns subagents (about $8 versus $24 per task for one model). [[raw/2026-11-15-aws-tokenomics-for-coding-agents#^e1]], [[raw/2026-11-15-aws-tokenomics-for-coding-agents#^e2]]
- AWS records tokens, turns, and latency per run, scored by an independent judge against a rubric from a clean clone pinned to a commit. [[raw/2026-11-15-aws-tokenomics-for-coding-agents#^e3]]
- A coding agent replays its transcript each turn, so input can dwarf output and cache hits drive cost. [[raw/2026-11-15-aws-tokenomics-for-coding-agents#^e4]] Record cache token fields separately. [[raw/2026-11-15-claude-agent-sdk-track-cost-and-usage#^e1]]
- Claude Agent SDK: result-level `usage` excludes subagents while `total_cost_usd` and `modelUsage` include them. [[raw/2026-11-15-claude-agent-sdk-track-cost-and-usage#^e2]] Inference: summing `usage` undercounts a multi-agent arm. [[raw/2026-11-15-claude-agent-sdk-track-cost-and-usage#^e3]]
- `total_cost_usd` is a client-side estimate from a bundled price table and drifts with SDK version; pinning the version and recomputing from stored tokens is inference. [[raw/2026-11-15-claude-agent-sdk-track-cost-and-usage#^e5]], [[raw/2026-11-15-claude-agent-sdk-track-cost-and-usage#^e6]]
- A response cache can make repeats non-independent unless disabled (promptfoo). [[raw/2026-11-15-promptfoo-command-line#^e2]]

## Run layout and identifiers (precedent only)

| Harness | Layout and naming | Evidence |
| --- | --- | --- |
| SWE-bench | `logs/evaluation/<run_id>/` with `results.json` and per-instance folders; caller-chosen `run_id`, results cached by `run_id` plus instance, so a rerun with the same id reuses the old result | [[raw/2026-11-15-swe-bench-evaluation-guide#^e1]], [[raw/2026-11-15-swe-bench-evaluation-guide#^e2]] |
| Inspect AI | `{timestamp}_{task}_{id}` in `./logs`; retries create a new log, never overwrite | [[raw/2026-11-15-inspect-ai-log-files#^e1]], [[raw/2026-11-15-inspect-ai-log-files#^e2]] |
| lm-evaluation-harness | `<output_path>/<model>/results_<date_id>.json` plus optional `samples_*.jsonl` | [[raw/2026-11-15-lm-evaluation-harness-evaluation-tracker#^e1]] |
| promptfoo | an `evalId` per run; `--repeat`, `--resume`, `retry` | [[raw/2026-11-15-promptfoo-command-line#^e1]] |

- Report non-gradable runs (errors, timeouts, infrastructure failures) separately from failures. SWE-bench does this, though Berkeley RDI warns a crashed task is a zero, not a missing point. [[raw/2026-11-15-swe-bench-evaluation-guide#^e3]], [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi#^e3]]
- Reproducibility metadata recorded: system instruction and chat template SHAs, per-task hashes, evaluation time (lm-eval); git revision and token usage in the viewer's Info panel (Inspect). SWE-bench documents no model-version pin or config snapshot. [[raw/2026-11-15-lm-evaluation-harness-evaluation-tracker#^e2]], [[raw/2026-11-15-inspect-ai-log-viewer#^e1]], [[raw/2026-11-15-swe-bench-evaluation-guide#^e4]]
- Seeds and config as flags or YAML; `--limit` is "for testing only", so a limited run is not a reportable result. [[raw/2026-11-15-lm-evaluation-harness-user-guide#^e1]], [[raw/2026-11-15-lm-evaluation-harness-user-guide#^e2]], [[raw/2026-11-15-lm-evaluation-harness-user-guide#^e3]]

## Reports

- promptfoo writes a standalone, self-contained HTML report (sortable table, side-by-side outputs, pass/fail stats) embedding config, prompts, outputs, per-assertion results, latency, tokens, and cost; it suggests date-prefixed filenames. [[raw/2026-11-15-promptfoo-output-formats#^e1]], [[raw/2026-11-15-promptfoo-output-formats#^e2]], [[raw/2026-11-15-promptfoo-output-formats#^e3]]
- Inspect keeps transcripts and summary in one log, with per-sample drill-down and epochs; its bundled viewer is a multi-file static site needing HTTP range requests, not a single HTML file. [[raw/2026-11-15-inspect-ai-log-files#^e3]], [[raw/2026-11-15-inspect-ai-log-viewer#^e1]], [[raw/2026-11-15-inspect-ai-log-viewer#^e2]]

## Caveats

> [!warning]
> - Docs are mostly undated and were read at current main with no version pin. Inspect eval-logs and promptfoo command-line pages were examined by grep, not end to end; the Inspect EvalSpec section was not read in detail, and lm-eval's evaluator (where git hash is added) was not checked.
> - No source was found for a static report showing variance or confidence intervals, or a bare-versus-scaffold comparison table. This is absence of retrieval, not evidence of absence; no search for it was run.
> - Not fetched: SWE-bench sb-cli, Inspect eval-sets, Braintrust or Langfuse, artificialanalysis.ai/agents/coding-agents, arXiv 2505.18286, and the AWS methodology docs and aws-samples `metrics.json` schema. No source defines how to normalise tool-call counts across multi-agent and single runs. No empirical study of caching bias between arms was found.
> - Kapoor et al. recommend dollar cost; AWS notes self-hosted cost is GPU time and not comparable with metered bills. Not an issue for two arms on one API.
> - The Claude docs page is undated (mentions v2.1.277).

## Sources

- [[raw/2026-11-15-ai-agents-that-matter-kapoor]], [[raw/2026-11-15-aws-tokenomics-for-coding-agents]], [[raw/2026-11-15-claude-agent-sdk-track-cost-and-usage]], [[raw/2026-11-15-swe-bench-evaluation-guide]], [[raw/2026-11-15-inspect-ai-log-files]], [[raw/2026-11-15-inspect-ai-log-viewer]], [[raw/2026-11-15-lm-evaluation-harness-evaluation-tracker]], [[raw/2026-11-15-lm-evaluation-harness-user-guide]], [[raw/2026-11-15-promptfoo-output-formats]], [[raw/2026-11-15-promptfoo-command-line]], [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi]]
