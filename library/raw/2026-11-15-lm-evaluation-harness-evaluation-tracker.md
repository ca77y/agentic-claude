---
title: lm-evaluation-harness evaluation_tracker.py
type: raw
summary: How EleutherAI's lm-evaluation-harness names and lays out result files and what reproducibility metadata it records in the results JSON
tags: []
aliases: [lm-eval evaluation tracker, EvaluationTracker]
source: https://raw.githubusercontent.com/EleutherAI/lm-evaluation-harness/main/lm_eval/loggers/evaluation_tracker.py
accessed: 2026-11-15
published: unknown
provider: EleutherAI (GitHub, lm-evaluation-harness)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# lm-evaluation-harness evaluation_tracker.py

> [!quote] Source
> **URL**: https://raw.githubusercontent.com/EleutherAI/lm-evaluation-harness/main/lm_eval/loggers/evaluation_tracker.py
> **Accessed**: 2026-11-15
> **Method/Context**: Source file on the `main` branch, undated. Recorded for ticket SMR-361 (benchmarking the slopify workflows against a task set), as one of several harnesses inspected for result layout, run naming and reproducibility metadata. Findings below come from the findings supplied to the scribe; the file itself was not re-read by the scribe.

## Key evidence

- Output layout and naming: lm-evaluation-harness writes per-model output under `<output_path>/<sanitized_model_name>/` as `results_<date_id>.json` (aggregate) and `samples_<task>_<date_id>.jsonl` (per-sample inputs and outputs, written only with `--log_samples`). `date_id` is the ISO timestamp with `:` replaced by `-`. The same timestamp pairs the results file with its samples files. Quotes: `self.date_id = datetime.now().isoformat().replace(":", "-")`; `file_results_aggregated = path / f"results_{self.date_id}.json"` ^e1
- Reproducibility metadata in the results JSON: `model_source`, `model_name`, `system_instruction` and its SHA, `chat_template` and its SHA, `fewshot_as_multiturn`, `total_evaluation_time_seconds`, and per-task `task_hashes` (a hash of the concatenated doc, prompt and target hashes per sample). Quote: "system_instruction_sha ... SHA hash of the system instruction for tracking and reproducibility" ^e2

## Limitations

- The `git_hash` field is not visible in this file; whether the harness records a git revision elsewhere was not verified.
- The seed flags, the `--config` YAML option and the `--limit` "for testing only" note were reported from a different source (`docs/interface.md`) and are not recorded here.
- The `main` branch is undated, so the layout may change.

## Relevance

- Shows a timestamp-suffixed result file under a per-model directory, with a summary file paired to per-sample detail by a shared timestamp.
- Shows content hashes of the prompt inputs (system instruction, chat template, per-task samples) as a way to tie a result to the exact inputs.
