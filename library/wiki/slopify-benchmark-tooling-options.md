---
title: Tooling options for benchmarking slopify against bare Opus
type: wiki
summary: Which eval frameworks, harnesses, task sets and reporting tools could run slopify and bare Opus on the same tasks, store runs and write an HTML report, with what each costs to adopt and what is unverified.
status: active
confidence: low
tags:
  - evaluation
  - agent-harness
  - operations
aliases:
  - slopify benchmark tooling
  - SMR-361 research
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/raw/2026-11-16-claude-plugin-eval-help]]"
  - "[[library/raw/2026-11-16-repo-testing-md]]"
created: 2026-11-16
updated: 2026-11-16
---

# Tooling options for benchmarking slopify against bare Opus

> [!abstract] Summary
> Research question (SMR-361): what could run the same tasks with bare Opus and with the slopify workflows, compare the results, store each run under `<version>-<date>[-N]`, and write an HTML report, and what does each cost to adopt in this repo?
>
> Five candidates were examined: the Claude Code CLI's own `claude plugin eval`, promptfoo, Inspect AI with inspect_swe, Harbor, and Braintrust. Of these, only `claude plugin eval` and promptfoo have a documented way to run a no-plugin arm next to a plugin arm. Only promptfoo documents loading a full local plugin through an option (`plugins`). For Harbor and Inspect SWE, plugin loading is unknown. No candidate was shown to run slopify's workflow scripts (the Workflow tool) end to end, and no run that spends model money was made. No public task set covers all slopify workflows; the closest sets fit only some of them. The page records evidence and gaps. It makes no product decision.

> [!warning] Reading limits
> Most facts below come from documentation snippets, README pages, GitHub API fields and search snippets, not from running the tools. Claims that an option is absent come from keyword searches of saved pages and are not proof the capability is missing. GitHub counts and push dates were read from the GitHub API on 2026-11-16 and change over time.

## What the benchmark needs from a tool

These come from the card and from the repo's own files.

- Local, user-triggered only. TESTING.md says eval runs use the local Claude Code CLI login, with "no separate test account" and no env file; CI never runs evals ([[library/raw/2026-11-16-repo-testing-md#^e1]], [[library/raw/2026-11-16-repo-testing-md#^e2]]). A tool that needs its own API key departs from that stated setup (the last sentence of ^e1 is the researcher's inference).
- Results stay out of git. Existing eval reports go under an ignored `plugins/slopify/evals/results/` ([[library/raw/2026-11-16-repo-testing-md#^e3]]).
- Node-only tooling. The repo's dev dependencies are all npm packages; Python, uv and docker exist on the researcher's machine, but nothing in the repo depends on them ([[library/raw/2026-11-16-repo-package-json-node-only-tooling#^e1]]).
- A `make benchmark` target does not exist; the Makefile lists `install build lint check format test smoke` ([[library/raw/2026-11-16-repo-makefile-smoke-target#^e1]]).
- TESTING.md already names a future `make eval` for "claims about cost, accuracy, or quality across many runs", in development under SMR-364 ([[library/raw/2026-11-16-repo-testing-md#^e4]]). The scopes of `make eval` and the card's `make benchmark` overlap and were not reconciled here.
- The existing material is six smoke cases (`shape`, `deliver-story`, `deliver-trivial`, `deliver-bugfix`, `deliver-spike`, `research`). Each has `case.yaml`, `scaffold.sh`, `prompt.md` and `graders/`, builds a throwaway repo, and uses no real Linear card ([[library/raw/2026-11-16-slopify-existing-smoke-eval-cases#^e1]]). They check that a workflow starts and reaches its first milestones, not that it finishes a task ([[library/raw/2026-11-16-repo-testing-md#^e2]]).

## Candidate comparison

| Candidate | Runs Claude Code | Bare vs plugin arm | Plugin or skill loading | Run storage and naming | HTML report | Adoption cost seen in evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `claude plugin eval` (repo already uses it) | It is the CLI | `--ablation with-without` adds a no-plugin baseline arm | The plugin under test is the unit loaded | `--output-dir`; default dirs are timestamped | Self-contained `--report <path>` | No new dependency; unverified that the baseline is a pinned bare Opus |
| promptfoo | Via Claude Agent SDK provider | Two `providers` entries, with and without `plugins` | `plugins: [{type: local, path}]` documented | `--output` path per invocation; history in `~/.promptfoo` | Self-contained `--output x.html` | Node (fits repo); SDK licence is proprietary; extra API key or login handling |
| Inspect AI + inspect_swe | `claude_code()` solver in a sandbox | Solvers or task parameters; `eval_set` grid | `skills` option only seen; plugin option not seen | `--log-dir` per run; `.eval` logs | Bundled directory, not one file | Python and Docker (new to the repo) |
| Harbor | `claude-code` agent in a task container | Several agents in one job config | `skills` only seen; plugin option not seen | `-o <jobs-dir> --job-name` | Served viewer; no static export seen | Python, Docker or cloud sandbox (new to the repo) |
| Braintrust | No, it traces and hosts | n/a | n/a | Hosted | Hosted UI | Hosted service; cost and self-hosting unverified |

Each row is explained below.

## Claude Code CLI `claude plugin eval`

- The repo's `make smoke` already calls it with `--tag smoke -j 6 --allow-tools Bash Write Edit Agent Workflow --scaffold --ablation none --trust-plugin` ([[library/raw/2026-11-16-repo-makefile-smoke-target#^e2]]). The allowed tools include `Workflow`, so the existing smoke cases do exercise the workflow scripts far enough to reach first milestones (the milestone limit is in [[library/raw/2026-11-16-repo-testing-md#^e2]]).
- Its help text (Claude Code 2.1.325) lists `--ablation with-without` ("Run a no-plugin baseline arm and report the score delta"), `--runs <n>` (default 3), `--model`, `--judge-model` (default haiku), `--max-cost-usd`, `--json [path]`, `--report <path>` (self-contained HTML), `--output-dir`, and `-j` from 1 to 8 ([[library/raw/2026-11-16-claude-plugin-eval-help#^e2]]).
- The help says the report is published to claude.ai by default unless `--no-publish` is passed ([[library/raw/2026-11-16-claude-plugin-eval-help#^e3]]). That default matters for anything private in a report.
- Existing result directories hold `aggregate-result.json` (fields include `claudeVersion`, `costUsd`, `suite.ablation`, `aggregates`) and `report.html`, in timestamp-named directories rather than `<version>-<date>[-N]` ([[library/raw/2026-11-16-slopify-plugin-eval-results#^e1]], [[library/raw/2026-11-16-slopify-plugin-eval-results#^e3]]). `claudeVersion` is recorded in the JSON.
- Gaps: the repo's own invocation uses `--ablation none`, so it does not currently run a baseline arm ([[library/raw/2026-11-16-repo-makefile-smoke-target#^e5]]); whether `with-without` gives a bare Opus arm on a pinned model was not verified. The help text was read, not exercised.
- Spend floor: smoke runs with `--ablation none` cost USD 6.51, 7.18, 8.29 and 13.52 for six cases across four runs, and USD 3.25 for a 3-case run ([[library/raw/2026-11-16-slopify-plugin-eval-results#^e2]]). These are milestone-only runs, so they are a floor, not the cost of full-task runs; per-run cost for full tasks, bare versus slopify, is unknown.

## promptfoo

- Facts: MIT, TypeScript/Node, about 27.3k stars, 965 open issues, last push 2026-11-16 ([[library/raw/2026-11-16-promptfoo-github-repo#^e1]], [[library/raw/2026-11-16-promptfoo-github-repo#^e2]]).
- Provider `anthropic:claude-agent-sdk` supports `working_dir`, `copy_working_dir`, `max_budget_usd`, `setting_sources`, `plugins` (local plugin directories, skills namespaced `plugin:skill`), `skills`, `model` and `mcp` ([[library/raw/2026-11-16-promptfoo-claude-agent-sdk-provider#^e1]]). The `plugins` key takes `[{type: local, path: ./my-plugin}]` and only `local` is supported ([[library/raw/2026-11-16-promptfoo-claude-agent-sdk-docs-context7#^e1]]). This is the only documented plugin-loading option among the candidates.
- By default the provider loads no CLAUDE.md, settings or slash commands; `setting_sources` must be set to load them, and with no `working_dir` it runs in a temporary directory with no tools ([[library/raw/2026-11-16-promptfoo-claude-agent-sdk-provider#^e2]]). A bare arm and a plugin arm can therefore differ only in `plugins`, if nothing else is loaded (inference).
- Two-arm pattern: the coding-agents guide documents two `providers` entries, one a plain model or the same SDK provider without `plugins`, the other with `plugins`, plus `--repeat 3` ([[library/raw/2026-11-16-promptfoo-docs-evaluate-coding-agents#^e2]]). The skills guide shows two labelled providers, each with its own `config`, sharing prompts and tests ([[library/raw/2026-11-16-promptfoo-test-agent-skills-guide#^e1]]). That guide varies `working_dir` fixtures, not a `plugins` key, which is a tension noted below.
- Grading: `javascript` assertions on output, cost and latency thresholds, and LLM rubrics ([[library/raw/2026-11-16-promptfoo-evaluate-coding-agents#^e2]], [[library/raw/2026-11-16-promptfoo-evaluate-coding-agents#^e3]]); a `select-best` grader compares providers for one test and passes the winner ([[library/raw/2026-11-16-promptfoo-llm-as-a-judge-guide#^e1]]).
- Isolation: `copy_working_dir: true` gives each eval step a fresh copy ([[library/raw/2026-11-16-promptfoo-evaluate-coding-agents#^e1]]). Copy mode rejects a worktree-style `.git` file and unsupported submodules ([[library/raw/2026-11-16-promptfoo-docs-evaluate-coding-agents#^e3]]). This repo's work happens in git worktrees, so fixtures would need to be separate directories or fresh clones (inference).
- Repeats: `--repeat N` or `options.repeat`, per-repeat cache entries, `--no-cache` for fresh calls, mixed pass/fail groups flagged, `results.repeatStability` in JSON ([[library/raw/2026-11-16-promptfoo-test-cases-repeat#^e1]], [[library/raw/2026-11-16-promptfoo-test-cases-repeat#^e2]], [[library/raw/2026-11-16-promptfoo-test-cases-repeat#^e3]]). Caching is disabled for local Claude login ([[library/raw/2026-11-16-promptfoo-claude-agent-sdk-provider#^e5]]).
- Storage and report: `--output report.html` writes one self-contained HTML file with sortable table, side-by-side comparison and pass/fail statistics, and several formats can be written in one run ([[library/raw/2026-11-16-promptfoo-output-formats#^e1]], [[library/raw/2026-11-16-promptfoo-output-formats#^e3]], [[library/raw/2026-11-16-promptfoo-output-formats#^e5]]). The path is chosen per invocation, so a script could compute a `<version>-<date>[-N]` directory; the docs describe no version or `-N` naming, so that is glue ([[library/raw/2026-11-16-promptfoo-output-formats#^e6]]). HTML and JSON exports include the eval config, with best-effort redaction ([[library/raw/2026-11-16-promptfoo-output-formats#^e9]]). Eval history lives in `PROMPTFOO_CONFIG_DIR` (default `~/.promptfoo`), and `--no-write` skips it ([[library/raw/2026-11-16-promptfoo-command-line#^e1]]).
- Install and licence: `npm install promptfoo @anthropic-ai/claude-agent-sdk@^0.3.273`; auth by `ANTHROPIC_API_KEY` or a local Claude Code login (`apiKeyRequired: false`); the docs describe the Agent SDK as proprietary-licensed ([[library/raw/2026-11-16-promptfoo-claude-agent-sdk-provider#^e3]], [[library/raw/2026-11-16-promptfoo-claude-agent-sdk-provider#^e4]]). The licence wording is the docs', not checked at the SDK repo.
- Cost on the page: an agent task for a small audit "might cost $0.10-0.30"; no price for a full multi-step workflow ([[library/raw/2026-11-16-promptfoo-docs-evaluate-coding-agents#^e4]]).
- Not found: a pin for the Claude Code CLI binary version ([[library/raw/2026-11-16-promptfoo-claude-agent-sdk-docs-context7#^e6]], inference from absence).

## Inspect AI with inspect_swe

- Inspect AI: MIT, Python, created 2023-11-14, last push 2026-11-15, about 3.3k stars, 521 open issues ([[library/raw/2026-11-16-inspect-ai-github-api#^e1]]). inspect_swe: MIT, created 2025-08-29, 42 stars, 46 open issues, maintained by the meridianlabs-ai org, separate from UK AISI ([[library/raw/2026-11-16-inspect-swe#^e4]]).
- The agent bridge runs CLI agents in sandboxes; `claude_code()` drives the Claude Code CLI unattended in an Inspect sandbox, with model calls proxied to Inspect ([[library/raw/2026-11-16-inspect-agent-bridge#^e1]], [[library/raw/2026-11-16-inspect-swe-claude-code-agent#^e1]]).
- Options seen: `model`, `system_prompt`, `skills`, `mcp_servers`, `bridged_tools`, `disallowed_tools`, `cwd`, `env`, `version`, `subagent_model`, `opus_model`, `sonnet_model`, `haiku_model`, `attempts` and retry settings ([[library/raw/2026-11-16-inspect-swe-claude-code-agent#^e3]]). No plugin option appears. This absence rests on one page read in full, but not the Agent Bridge page.
- `version` accepts `stable`, `latest`, an exact version, or one preinstalled in the sandbox. With `stable` or `latest`, resolution happens once per process, so a resumed run can install a newer release; exact pinning has no digest check. Each sample records the binary version and origin it ran ([[library/raw/2026-11-16-inspect-swe-claude-code-agent#^e5]], [[library/raw/2026-11-16-inspect-swe-claude-code-agent#^e6]]).
- Arms: solvers or task parameters (`--solver`, `-S`), and `eval_set` builds a parameter-by-model grid ([[library/raw/2026-11-16-inspect-ai-tasks#^e1]]). Using that grid for bare versus slopify is the researcher's inference ([[library/raw/2026-11-16-inspect-ai-tasks#^e2]]).
- Repeats and statistics: `--epochs` with reducers `mean`, `median`, `mode`, `max`, `at_least_N`, `pass_at_k`, `pass_k_k` ([[library/raw/2026-11-16-inspect-ai-options#^e1]]); each (sample, epoch) is an independent run, and `stderr` metrics work on epoch-reduced scores ([[library/raw/2026-11-16-inspect-ai-epochs-source#^e1]]). Anthropic says Inspect computes standard errors correctly via epochs ([[library/raw/2026-11-16-anthropic-statistical-approach-to-model-evals#^e3]]).
- Grading: `model_graded_qa` takes one model or a panel combined by a reducer ([[library/raw/2026-11-16-inspect-ai-model-graded#^e1]]). Whether it can judge a work product such as a diff or research document, rather than a final answer, was not verified.
- Storage: logs go to `--log-dir` or `INSPECT_LOG_DIR` (default `./logs`), so a per-run directory is reachable per invocation; `.eval` is binary, `.json` is text; file names default to `{timestamp}_{task}_{id}` ([[library/raw/2026-11-16-inspect-ai-eval-logs#^e1]], [[library/raw/2026-11-16-inspect-ai-eval-logs#^e2]], [[library/raw/2026-11-16-inspect-ai-eval-logs#^e3]]). Per-sample token usage and timing are logged and load into dataframes, so cross-run aggregation is custom code ([[library/raw/2026-11-16-inspect-ai-dataframe#^e1]], [[library/raw/2026-11-16-inspect-ai-changelog#^e1]]).
- Report: no single-file HTML export. `inspect view bundle` writes a directory (`index.html`, `assets/`, `logs/`) that needs a static server with HTTP range requests; Python's `http.server` does not support them ([[library/raw/2026-11-16-inspect-ai-log-viewer#^e1]]). The viewer reads `.eval` logs by byte-range request ([[library/raw/2026-11-16-inspect-ai-repo-viewer-context7#^e2]]). Opening the bundle from `file://` was not tested.
- New dependencies: Python and Docker sandbox (examples use `sandbox="docker"`) ([[library/raw/2026-11-16-inspect-ai-readme#^e1]]).

## Harbor

- Facts: Apache-2.0, Python (92.6%), installed by `uv tool install harbor` or pip, about 7.1k stars, 31 releases, 1306 open issues, last push 2026-11-14, official harness for Terminal-Bench 2.0 ([[library/raw/2026-11-16-harbor-framework-harbor#^e3]]). The README example runs `harbor run --dataset terminal-bench@2.0 --agent claude-code --model anthropic/... --n-concurrent 4` in Docker or a cloud sandbox ([[library/raw/2026-11-16-harbor-framework-harbor#^e1]]). No release version number was retrieved.
- The `claude-code` agent runs `claude --verbose --output-format=stream-json ... --print` in the task container and copies skills to `$CLAUDE_CONFIG_DIR/skills`; keyword matches showed no plugin-directory loading ([[library/raw/2026-11-16-harbor-claude-code-agent-source#^e1]]). Its per-arm knob is `skills`, and the listed options include `version`, `permission_mode` (default `bypassPermissions`), `max_budget_usd` and `append_system_prompt`; no plugin or workflow-script option appears ([[library/raw/2026-11-16-harbor-job-skills-docs#^e1]], [[library/raw/2026-11-16-harbor-job-skills-docs#^e2]]). A custom agent is documented through `agents[].import_path` ([[library/raw/2026-11-16-harbor-job-skills-docs#^e3]]). That slopify would need that route is an inference from absence ([[library/raw/2026-11-16-harbor-job-skills-docs#^e4]]).
- Arms: a job config lists several agents, and each runs against every task; the same agent can appear twice with different `model_name` or `kwargs` ([[library/raw/2026-11-16-harbor-hosted-cli-docs#^e1]], [[library/raw/2026-11-16-harbor-hosted-cli-docs#^e2]]). This comes from the hosted-Harbor docs; the local `harbor run -c` path is described only in the AgentConfig source note ([[library/raw/2026-11-16-harbor-trial-config-source#^e1]]).
- Storage: `harbor run -p <path> -a <agent> -m <model> -o <jobs-dir> --job-name <job-name>`, `-k` for attempts ([[library/raw/2026-11-16-harbor-run-a-job#^e1]]); a job writes `<jobs_dir>/<job_name>/result.json`, and `job_name` defaults to a UTC timestamp ([[library/raw/2026-11-16-harbor-hosted-cli-docs#^e4]]). Trial outputs hold session and trajectory files such as `agent/trajectory.json` ([[library/raw/2026-11-16-harbor-loading-trajectories#^e1]]). Version and `-N` naming would be caller glue ([[library/raw/2026-11-16-harbor-run-a-job#^e2]]).
- Report: `harbor view <jobs-dir>` is a local web viewer that must keep running; no static HTML export was found on that page ([[library/raw/2026-11-16-harbor-view-job-results#^e1]], [[library/raw/2026-11-16-harbor-view-job-results#^e5]]).

## Braintrust and other hosted platforms

- Braintrust does not run the agent. It traces Claude Agent SDK runs (`wrapClaudeAgentSDK`) and hosts evals; the tracing docs show an API key and project, from which the hosted service is inferred ([[library/raw/2026-11-16-braintrust-claude-agent-sdk-integration#^e1]], [[library/raw/2026-11-16-braintrust-claude-agent-sdk-integration#^e2]], [[library/raw/2026-11-16-braintrust-claude-agent-sdk-integration#^e5]]). A `braintrust-claude-plugin` with a `trace-claude-code` skill was seen only as a search snippet ([[library/raw/2026-11-16-braintrust-claude-agent-sdk-integration#^e3]]). The SDK repo is Apache-2.0 TypeScript ([[library/raw/2026-11-16-braintrust-sdk-javascript-github-repo#^e1]]).
- Langfuse, Phoenix, LangSmith, Weave and MLflow were seen only in search listings; no per-run static HTML export was found for them ([[library/raw/2026-11-16-qa-codes-eval-platform-decision#^e1]]). Pricing, self-hosting and the eval-runner pages were not fetched, so Braintrust's local-versus-hosted status and cost are unverified.

## Task sets

| Set | Task shape and grading | Fit to slopify workflows (researcher inference) |
| --- | --- | --- |
| SWE-bench | GitHub issue plus repo; patch graded by repo tests in Docker; MIT code; the harness evaluates patch predictions and does not invoke an agent ([[library/raw/2026-11-16-swe-bench-readme#^e1]], [[library/raw/2026-11-16-swe-bench-readme#^e3]]) | Bugfix and trivial only; other repos; needs Docker, 120GB free recommended ([[library/raw/2026-11-16-swe-bench-readme#^e2]], [[library/raw/2026-11-16-swe-bench-readme#^e5]]) |
| Terminal-Bench | Instruction, test script, oracle; Docker; deterministic ([[library/raw/2026-11-16-terminal-bench-readme#^e1]]); 2.1 has 89 tasks, Apache-2.0, from a search snippet only ([[library/raw/2026-11-16-terminal-bench-2-1-hf-dataset-card#^e1]], [[library/raw/2026-11-16-terminal-bench-2-1-hf-dataset-card#^e2]]) | Terminal and system work, not delivery, research, shape or validate ([[library/raw/2026-11-16-terminal-bench-readme#^e4]]); runs on Harbor ([[library/raw/2026-11-16-terminal-bench-readme#^e3]]) |
| Harness Bench | 300 offline tasks in 6 families; deterministic oracles, no LLM judge; compares 7 harnesses including Claude Code; tokens and cost per trial ([[library/raw/2026-11-16-harness-bench-github-repo#^e1]], [[library/raw/2026-11-16-harness-bench-github-repo#^e2]], [[library/raw/2026-11-16-harness-bench-github-repo#^e3]]) | Targets harness and model configurations, not plugin workflows; no spike, shape or validate categories ([[library/raw/2026-11-16-harness-bench-github-repo#^e6]]); licence not retrieved |
| DeepResearch Bench | 100 PhD-level research prompts; graded by LLM judges RACE and FACT with GPT-5.5 and GPT-5.4-mini plus a Jina key ([[library/raw/2026-11-16-deep-research-bench-github-repo#^e1]], [[library/raw/2026-11-16-deep-research-bench-github-repo#^e3]]) | Partial fit for the research workflow: open-web research versus a project library ([[library/raw/2026-11-16-deep-research-bench-github-repo#^e7]]); non-Anthropic judge cost |

- Task shape for all four is a prompt plus a workspace; none supplies a Linear card (inferences recorded in the notes above). How slopify's own workflows take input (card versus prompt, and what a workspace must contain) was not researched, because it needs a read of the plugin, which this research did not do. The existing smoke cases use a scaffold script and `prompt.md` ([[library/raw/2026-11-16-slopify-existing-smoke-eval-cases#^e1]]).
- No dataset for shape (card writing), validate (branch or PR checks) or spec writing was found. One targeted search for specification-writing benchmarks returned nothing, so that absence is unconfirmed.
- Anthropic's agent-evals guide recommends a small project-specific task set built from real failures, each task with an unambiguous spec and a reference solution, multiple trials, isolated clean environments, and graded outcomes rather than paths ([[library/raw/2026-11-16-demystifying-evals-for-ai-agents#^e2]], [[library/raw/2026-11-16-demystifying-evals-for-ai-agents#^e4]]). It is one vendor source.

## Grading and statistics

- For coding agents the Anthropic guide names deterministic graders such as unit tests as natural, with an optional LLM rubric; research agents have no binary pass/fail and need rubrics "frequently calibrated against expert human judgment" ([[library/raw/2026-11-16-demystifying-evals-for-ai-agents#^e3]]).
- LLM judges: strong judges agree with humans over 80% of the time but show position, verbosity and self-enhancement bias ([[library/raw/2026-11-16-judging-llm-as-a-judge-mt-bench-arxiv#^e1]]). The source is about chat answers, not agentic or coding output, and no agent-specific judge-reliability source was retrieved. DeepResearch Bench reports judge alignment of 71.82 against a 68.78 human baseline, from the benchmark's authors ([[library/raw/2026-11-16-deep-research-bench-github-repo#^e4]]).
- Comparing two arms: Anthropic recommends paired differences, standard errors, 95% confidence intervals, resampling and power analysis ([[library/raw/2026-11-16-anthropic-statistical-approach-to-model-evals#^e1]]), because frontier-model question scores correlate between 0.3 and 0.7 ([[library/raw/2026-11-16-anthropic-statistical-approach-to-model-evals#^e2]]).
- No candidate was found to compute a paired two-arm confidence interval. Only per-arm repeat handling was found: promptfoo `repeatStability` ([[library/raw/2026-11-16-promptfoo-evaluate-llm-temperature#^e2]]) and Inspect epochs reducers and `stderr`. `claude plugin eval` reports a "score delta" for its baseline arm ([[library/raw/2026-11-16-claude-plugin-eval-help#^e2]]); whether it includes any interval was not checked. These absences are from retrieved excerpts only.

## Reporting tools outside the frameworks

- pytest-html writes one HTML file per invocation with `--html=report.html --self-contained-html`, with hooks for summary text, environment rows and extra content; images added as files stay external ([[library/raw/2026-11-16-pytest-html-user-guide#^e2]], [[library/raw/2026-11-16-pytest-html-user-guide#^e3]], [[library/raw/2026-11-16-pytest-html-user-guide#^e4]]). It applies only if the benchmark runs under pytest, which a Node-only repo does not currently do.
- Plotly's `write_html` writes an interactive figure, embedding plotly.js or loading it from a CDN ([[library/raw/2026-11-16-plotly-write-html#^e1]], [[library/raw/2026-11-16-plotly-write-html#^e2]]). Search snippet only.
- A static report generated from a template library such as Jinja2 was not researched; its docs were not fetched.

## Contradictions and tensions

- No source conflicts directly. Harbor's multi-agent job example comes from the hosted docs, while the local path is evidenced only in source ([[library/raw/2026-11-16-harbor-hosted-cli-docs#^e1]] against [[library/raw/2026-11-16-harbor-trial-config-source#^e1]]).
- promptfoo documents a `plugins` key in the provider docs, but its skills-comparison guide varies `working_dir` fixtures instead.
- DeepResearch Bench licence: the GitHub page shows Apache-2.0 and the README badge reads MIT; the LICENSE file was not read ([[library/raw/2026-11-16-deep-research-bench-github-repo#^e5]]). The dataset licence was not checked.
- The Terminal-Bench README describes a beta of about 100 tasks (v0.1.1) while the 2.1 card has 89 tasks; these are different versions, not a conflict ([[library/raw/2026-11-16-terminal-bench-readme#^e2]], [[library/raw/2026-11-16-terminal-bench-2-1-hf-dataset-card#^e1]]).
- The research plan says "plugin or skill loading", but the candidates differ on that line: only promptfoo documents `plugins`; Harbor and inspect_swe document `skills`. Slopify's treatment arm is a plugin with workflow scripts, so a skills option may not be enough.
- `make eval` (SMR-364, in TESTING.md) and the card's `make benchmark` overlap and are not reconciled.

## Open questions

> [!question]
> - Can any candidate run slopify's workflow scripts (the Workflow tool) and namespaced skills end to end in headless or SDK mode? This was not tested; no model-spending runs were made.
> - Can Harbor or Inspect SWE load a full Claude Code plugin? Unknown; only a keyword search of saved pages was made, and the full Agent Bridge, promptfoo, Braintrust and Harbor `claude_code.py` pages were not read.
> - Does `claude plugin eval --ablation with-without` give a bare-Opus arm on a pinned model, and does its report give a paired interval?
> - How do slopify's own workflows take input, and what must a task's workspace hold? The datasets never need a Linear card; the answer is on the slopify side.
> - What does a full-task run cost, bare versus slopify? Only milestone-only smoke costs and promptfoo's USD 0.10-0.30 figure exist.
> - Are the model IDs in the docs (for example `claude-opus-5-5`) real? Not verified, and neither were the exact CLI or SDK versions Inspect SWE or Harbor install.
> - Not covered: OpenAI Evals-style tools, SWE-bench Pro, SWE-Lancer, tau-bench and pass^k (the paper was fetched but not read), the Claude Code CLI's non-interactive flags such as `--plugin-dir` and `--bare`, the Agent SDK's own licence, and a bare scripted runner around `claude -p`.

## Related pages

- None yet; this is the first wiki page.

## Sources

Raw notes cited above, by area. Several sources have more than one note; the overlaps are recorded in the log.

- CLI and repo: [[library/raw/2026-11-16-claude-plugin-eval-help]], [[library/raw/2026-11-16-repo-makefile-smoke-target]], [[library/raw/2026-11-16-repo-testing-md]], [[library/raw/2026-11-16-repo-package-json-node-only-tooling]], [[library/raw/2026-11-16-slopify-plugin-eval-results]], [[library/raw/2026-11-16-slopify-existing-smoke-eval-cases]]
- promptfoo: [[library/raw/2026-11-16-promptfoo-github-repo]], [[library/raw/2026-11-16-promptfoo-claude-agent-sdk-provider]], [[library/raw/2026-11-16-promptfoo-claude-agent-sdk-docs-context7]], [[library/raw/2026-11-16-promptfoo-anthropic-provider]], [[library/raw/2026-11-16-promptfoo-docs-evaluate-coding-agents]], [[library/raw/2026-11-16-promptfoo-evaluate-coding-agents]], [[library/raw/2026-11-16-promptfoo-test-agent-skills-guide]], [[library/raw/2026-11-16-promptfoo-test-cases-repeat]], [[library/raw/2026-11-16-promptfoo-evaluate-llm-temperature]], [[library/raw/2026-11-16-promptfoo-llm-as-a-judge-guide]], [[library/raw/2026-11-16-promptfoo-output-formats]], [[library/raw/2026-11-16-promptfoo-command-line]]
- Inspect: [[library/raw/2026-11-16-inspect-ai-github-api]], [[library/raw/2026-11-16-inspect-ai-readme]], [[library/raw/2026-11-16-inspect-agent-bridge]], [[library/raw/2026-11-16-inspect-swe-claude-code-agent]], [[library/raw/2026-11-16-inspect-swe]], [[library/raw/2026-11-16-inspect-ai-tasks]], [[library/raw/2026-11-16-inspect-ai-options]], [[library/raw/2026-11-16-inspect-ai-metrics]], [[library/raw/2026-11-16-inspect-ai-epochs-source]], [[library/raw/2026-11-16-inspect-ai-model-graded]], [[library/raw/2026-11-16-inspect-ai-eval-logs]], [[library/raw/2026-11-16-inspect-ai-dataframe]], [[library/raw/2026-11-16-inspect-ai-changelog]], [[library/raw/2026-11-16-inspect-ai-log-viewer]], [[library/raw/2026-11-16-inspect-ai-repo-viewer-context7]]
- Harbor: [[library/raw/2026-11-16-harbor-framework-harbor]], [[library/raw/2026-11-16-harbor-claude-code-agent-source]], [[library/raw/2026-11-16-harbor-job-skills-docs]], [[library/raw/2026-11-16-harbor-trial-config-source]], [[library/raw/2026-11-16-harbor-hosted-cli-docs]], [[library/raw/2026-11-16-harbor-hosted-submitting-jobs]], [[library/raw/2026-11-16-harbor-run-a-job]], [[library/raw/2026-11-16-harbor-loading-trajectories]], [[library/raw/2026-11-16-harbor-view-job-results]]
- Task sets: [[library/raw/2026-11-16-swe-bench-readme]], [[library/raw/2026-11-16-swe-bench-github-repo]], [[library/raw/2026-11-16-terminal-bench-readme]], [[library/raw/2026-11-16-terminal-bench-2-1-hf-dataset-card]], [[library/raw/2026-11-16-terminal-bench-run-page]], [[library/raw/2026-11-16-harness-bench-website]], [[library/raw/2026-11-16-harness-bench-github-repo]], [[library/raw/2026-11-16-harness-bench-task-taxonomy-v3]], [[library/raw/2026-11-16-deep-research-bench-github-repo]], [[library/raw/2026-11-16-deepresearch-bench-arxiv]]
- Method and grading: [[library/raw/2026-11-16-demystifying-evals-for-ai-agents]], [[library/raw/2026-11-16-anthropic-statistical-approach-to-model-evals]], [[library/raw/2026-11-16-judging-llm-as-a-judge-mt-bench-arxiv]]
- Hosted and reporting: [[library/raw/2026-11-16-braintrust-claude-agent-sdk-integration]], [[library/raw/2026-11-16-braintrust-sdk-javascript-github-repo]], [[library/raw/2026-11-16-qa-codes-eval-platform-decision]], [[library/raw/2026-11-16-pytest-html-user-guide]], [[library/raw/2026-11-16-plotly-write-html]]
