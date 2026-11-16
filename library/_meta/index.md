---
title: Library Index
type: moc
summary: Entry point to the agentic-slop research library
tags:
  - index
aliases:
  - Library Index
created: 2026-11-15
updated: 2026-11-16
---

# Library Index

Research behind the agentic-slop Claude Code plugins.

## Wiki Pages

```dataview
TABLE summary, confidence, status, updated
FROM "library/wiki"
WHERE type = "wiki"
SORT updated DESC
```

## Raw Notes

```dataview
TABLE summary, source, accessed
FROM "library/raw"
WHERE type = "raw"
SORT file.name ASC
```

## Plain-Markdown Index

One line per page: `- [[path|title]] — summary (updated YYYY-MM-DD)`.

### Wiki pages

- [[library/wiki/slopify-benchmark-tooling-options|Tooling options for benchmarking slopify against bare Opus]] — Which eval frameworks, harnesses, task sets and reporting tools could run slopify and bare Opus on the same tasks, store runs and write an HTML report, with what each costs to adopt and what is unverified. (updated 2026-11-16)
- [[library/wiki/operations|Operations]] — Map of the library pages tagged operations, about running, benchmarking and reporting on the plugins' workflows (updated 2026-11-16)

### Raw notes (indexed for navigation; synthesized in the wiki page above)

- [[library/raw/2026-11-16-anthropic-statistical-approach-to-model-evals|Anthropic, A statistical approach to model evaluations]] — Anthropic's post recommends reporting paired differences, standard errors and 95% confidence intervals, clustered errors, resampling and power analysis when comparing two models, and notes Inspect computes standard errors across epochs. (updated 2026-11-16)
- [[library/raw/2026-11-16-braintrust-claude-agent-sdk-integration|Braintrust Claude Agent SDK integration]] — Braintrust traces Claude Agent SDK runs and hosts evals; it does not run the agent, and hosting, pricing and local-only mode are not established. (updated 2026-11-16)
- [[library/raw/2026-11-16-braintrust-sdk-javascript-github-repo|Braintrust JavaScript SDK GitHub repository metadata]] — GitHub API metadata for braintrustdata/braintrust-sdk-javascript (Apache-2.0, TypeScript, pushed 2026-11-16), the SDK that traces Claude Agent SDK runs for Braintrust; Braintrust does not run the agent. (updated 2026-11-16)
- [[library/raw/2026-11-16-claude-plugin-eval-help|claude plugin eval --help (Claude Code 2.1.325)]] — Help output of the local Claude Code CLI's `plugin eval` command (2.1.325), listing its ablation, repeat, model, cost, JSON and HTML report options, a candidate harness for benchmarking slopify workflows. (updated 2026-11-16)
- [[library/raw/2026-11-16-deep-research-bench-github-repo|DeepResearch Bench GitHub repository]] — The DeepResearch Bench repository holds 100 PhD-level research tasks graded by LLM judges (RACE for report quality, FACT for citations), with a non-Anthropic judge dependency and a licence conflict between page and badge. (updated 2026-11-16)
- [[library/raw/2026-11-16-deepresearch-bench-arxiv|DeepResearch Bench (arXiv 2506.11763)]] — DeepResearch Bench is a 100-task set of PhD-level research prompts graded by LLM judges (RACE for report quality, FACT for citations), a partial fit for evaluating the slopify research workflow. (updated 2026-11-16)
- [[library/raw/2026-11-16-demystifying-evals-for-ai-agents|Demystifying evals for AI agents]] — Anthropic's engineering guide recommends a small project-specific eval set built from real failures, and gives grader and trial-design guidance for coding and research agents. (updated 2026-11-16)
- [[library/raw/2026-11-16-harbor-claude-code-agent-source|Harbor claude_code.py agent source]] — Harbor's claude-code agent runs the claude CLI in print mode in the task container and copies skills, with no plugin-directory loading seen in a partial read. (updated 2026-11-16)
- [[library/raw/2026-11-16-harbor-framework-harbor|Harbor framework README]] — Harbor evaluates agents such as Claude Code on benchmarks in Docker or cloud sandboxes; its claude-code agent copies skills but showed no plugin loading. (updated 2026-11-16)
- [[library/raw/2026-11-16-harbor-hosted-cli-docs|Harbor hosted CLI docs]] — Harbor's hosted job config runs every listed agent against every task, so trials = n_attempts x tasks x agents; the same agent can appear twice with different models. (updated 2026-11-16)
- [[library/raw/2026-11-16-harbor-hosted-submitting-jobs|Harbor hosted docs, submitting jobs]] — Harbor's hosted-Harbor job config runs every listed agent against every task, with n_attempts 1-10, and pins package-manager agent versions at submission. (updated 2026-11-16)
- [[library/raw/2026-11-16-harbor-job-skills-docs|Harbor job skills docs]] — Harbor's per-arm knob for Claude Code is `skills`, uploaded to /harbor/skills/<name>; no plugin or workflow-script option appears in the retrieved docs or source. (updated 2026-11-16)
- [[library/raw/2026-11-16-harbor-loading-trajectories|Harbor Loading Trajectories]] — The Harbor docs page on loading trajectories, recorded for where Harbor stores claude-code native sessions and ATIF trajectories inside a trial output. (updated 2026-11-16)
- [[library/raw/2026-11-16-harbor-run-a-job|Harbor run a job]] — Harbor groups trials into a job, and the harbor run CLI lets the caller choose the jobs directory and job name, so a run directory like <version>-<date>[-N] can be set per run. (updated 2026-11-16)
- [[library/raw/2026-11-16-harbor-trial-config-source|Harbor trial config.py (AgentConfig) source]] — Harbor's AgentConfig source, read via context7, supports a job config that lists several agents run against every task; the local `harbor run -c` path was not confirmed. (updated 2026-11-16)
- [[library/raw/2026-11-16-harbor-view-job-results|Harbor view job results]] — Harbor's docs describe `harbor view <jobs-dir>`, a local web viewer for job results that must keep running; no static HTML export was found on the page. (updated 2026-11-16)
- [[library/raw/2026-11-16-harness-bench-github-repo|Harness Bench repository (Qihoo360)]] — Harness Bench is a 300-task offline benchmark that compares agent harnesses, including Claude Code, with deterministic oracle grading and no LLM judge. (updated 2026-11-16)
- [[library/raw/2026-11-16-harness-bench-task-taxonomy-v3|Harness-Bench task taxonomy]] — Harness-Bench's task taxonomy lists 300 sandboxed tasks in 6 families, each graded by deterministic oracles with no LLM judge, and compares agent harnesses on the same tasks. (updated 2026-11-16)
- [[library/raw/2026-11-16-harness-bench-website|Harness Bench website]] — Harness Bench is a 300-task offline benchmark that compares agent harnesses, including Claude Code, on the same tasks with deterministic oracles, but its tasks are prompts plus a workspace and cover no spike, shape or validate work. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-agent-bridge|Inspect Agent Bridge]] — Inspect AI's agent bridge can run CLI agents such as Claude Code in sandboxes, with model calls proxied to Inspect. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-ai-changelog|Inspect AI changelog (via context7)]] — Inspect AI changelog entry showing that sample summaries carry model usage, total time, working time and retries, as returned by context7. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-ai-dataframe|Inspect AI Log Dataframes]] — Inspect AI logs per-sample token usage and timing and loads them into Pandas dataframes via evals_df and samples_df, so aggregation is custom analysis code. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-ai-epochs-source|Inspect AI epochs source (via context7)]] — How Inspect AI repeats each sample over epochs and reduces the epoch scores, from its epochs.py, run.py and results.py source as returned by context7. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-ai-eval-logs|Inspect AI Eval Logs]] — Inspect AI writes per-eval logs to a configurable log directory in a binary .eval or text .json format, locally or on remote storage, and reads them through a CLI and Python API. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-ai-github-api|Inspect AI repository metadata (GitHub API)]] — GitHub API metadata for UKGovernmentBEIS/inspect_ai, an evaluation framework, giving its licence, language, age, activity and size. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-ai-log-viewer|Inspect AI Log Viewer]] — Inspect AI's log viewer is a local server over a log directory, and its Publishing section bundles logs into a static directory (not a single HTML file) that needs a range-request web server. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-ai-metrics|Inspect AI Metrics and Epoch Reducers]] — Inspect AI repeats each sample over epochs and combines the repeats with built-in reducers such as mean, median, mode, max, at_least_N, pass_at_k and pass_k_k. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-ai-model-graded|Inspect AI Model-Graded Scorers]] — Inspect AI's model_graded_qa scorer takes one grading model or a list that grade independently and are combined by a reducer, supports partial credit and custom templates, and defaults to a GRADE C or I format. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-ai-options|Inspect AI Eval Options (Epochs)]] — Inspect AI repeats each sample with --epochs and reduces the repeats with built-in reducers such as mean, median, mode, max, at_least_N, pass_at_k and pass_k_k. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-ai-readme|Inspect AI README]] — Inspect AI's README, cited with the Inspect SWE docs and the Inspect log viewer docs for the Inspect AI plus inspect_swe candidate of the slopify benchmark (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-ai-repo-viewer-context7|Inspect AI repository, viewer and log-shard design (Context7)]] — Context7 excerpts from the inspect_ai repository (design/eval-sharding.md, _view/view.py) on the local log viewer server and its static client reading .eval logs by byte-range requests. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-ai-tasks|Inspect AI Tasks]] — Inspect AI expresses comparison arms as solvers or task parameters, and eval_set builds a parameter-by-model grid of tasks. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-swe-claude-code-agent|Inspect SWE - Claude Code agent]] — inspect_swe's claude_code() agent runs Claude Code unattended in an Inspect sandbox, with documented options, version pinning and per-sample binary recording, and no plugin-loading option. (updated 2026-11-16)
- [[library/raw/2026-11-16-inspect-swe|Inspect SWE and other harnesses that can run Claude Code]] — Inspect SWE's claude_code() agent plus the promptfoo, Harbor, SWE-bench and Braintrust surfaces for running or tracing Claude Code in an eval (updated 2026-11-16)
- [[library/raw/2026-11-16-judging-llm-as-a-judge-mt-bench-arxiv|Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (arXiv 2306.05685)]] — Zheng et al. measure how well strong LLM judges agree with human preferences (over 80% for GPT-4) and name the judge biases, on chat-assistant answers (updated 2026-11-16)
- [[library/raw/2026-11-16-plotly-write-html|plotly.io.write_html (Plotly Python 7.1.0 docs)]] — A search snippet of the plotly.io.write_html docs says Plotly Python writes interactive HTML and that include_plotlyjs controls whether plotly.js is embedded or loaded from a CDN; the page was not fetched. (updated 2026-11-16)
- [[library/raw/2026-11-16-promptfoo-anthropic-provider|promptfoo Anthropic provider]] — Unfetched lead; a search snippet says the page points to the Claude Agent SDK provider for agentic evaluations. (updated 2026-11-16)
- [[library/raw/2026-11-16-promptfoo-claude-agent-sdk-docs-context7|promptfoo - Claude Agent SDK provider docs (via context7)]] — The providers/claude-agent-sdk.md source page as retrieved through context7, covering plugin loading, setting_sources, skills filter, working-directory isolation and run controls (updated 2026-11-16)
- [[library/raw/2026-11-16-promptfoo-claude-agent-sdk-provider|promptfoo - Claude Agent SDK provider]] — promptfoo's anthropic:claude-agent-sdk provider, its config keys (plugins, copy_working_dir, setting_sources), install and auth, and caching limits (updated 2026-11-16)
- [[library/raw/2026-11-16-promptfoo-command-line|promptfoo command line (flags and environment variables)]] — promptfoo CLI docs; eval history lives in the directory named by PROMPTFOO_CONFIG_DIR (default ~/.promptfoo) and --no-write skips writing results there. (updated 2026-11-16)
- [[library/raw/2026-11-16-promptfoo-docs-evaluate-coding-agents|promptfoo docs - Evaluate Coding Agents]] — The promptfoo docs page on evaluating coding agents, as read for SMR-361, covering the Claude Agent SDK provider setup, baseline arms, repeats, workspace-copy limits and the page's own cost figures (updated 2026-11-16)
- [[library/raw/2026-11-16-promptfoo-evaluate-coding-agents|promptfoo - evaluate coding agents guide]] — promptfoo's guide to evaluating coding agents with the Claude Agent SDK provider, covering copy_working_dir isolation, assertions, LLM rubrics, and cost and latency thresholds (updated 2026-11-16)
- [[library/raw/2026-11-16-promptfoo-evaluate-llm-temperature|promptfoo - evaluate temperature and --repeat guide]] — promptfoo's repeat controls for nondeterministic evals (--repeat, options.repeat, per-repeat caching, --no-cache, repeatStability) and the absence of paired statistics (updated 2026-11-16)
- [[library/raw/2026-11-16-promptfoo-github-repo|promptfoo GitHub repository metadata]] — GitHub API metadata for promptfoo/promptfoo (MIT licence, TypeScript, about 27.3k stars, pushed 2026-11-16, 965 open issues), a candidate eval harness for benchmarking slopify workflows. (updated 2026-11-16)
- [[library/raw/2026-11-16-promptfoo-llm-as-a-judge-guide|promptfoo LLM-as-a-judge guide (select-best)]] — The promptfoo LLM-as-a-judge guide documents a select-best grader that compares outputs across providers for one test and passes only the winner. (updated 2026-11-16)
- [[library/raw/2026-11-16-promptfoo-output-formats|promptfoo output formats (HTML report)]] — promptfoo docs on output formats; `promptfoo eval --output report.html` writes a self-contained, shareable HTML report, and JSON, CSV and JUnit XML outputs exist too. (updated 2026-11-16)
- [[library/raw/2026-11-16-promptfoo-test-agent-skills-guide|promptfoo - testing agent skills guide]] — promptfoo's agent-skills guide shows a two-arm comparison as two labelled providers with their own config and shared prompts and tests (updated 2026-11-16)
- [[library/raw/2026-11-16-promptfoo-test-cases-repeat|promptfoo test cases and repeat options]] — promptfoo docs on repeating evals (--repeat N, per-test options.repeat, per-repeat cache entries, mixed pass/fail flagging, repeatStability in JSON); no paired statistics between providers were found. (updated 2026-11-16)
- [[library/raw/2026-11-16-pytest-html-user-guide|pytest-html User Guide]] — The pytest-html guide shows a pytest plugin that writes one HTML report per invocation, with hooks to add summary text, environment rows, extra content and columns. (updated 2026-11-16)
- [[library/raw/2026-11-16-qa-codes-eval-platform-decision|qa.codes eval platform decision (Braintrust vs Langfuse vs Laminar vs Arize Phoenix)]] — Search-snippet listing of hosted eval and observability platforms; no evidence retrieved of per-run static HTML export from them. (updated 2026-11-16)
- [[library/raw/2026-11-16-repo-makefile-smoke-target|Repo Makefile (make smoke target)]] — The agentic-slop Makefile lists install, build, lint, check, format, test and smoke targets, with no benchmark or eval target; make smoke runs claude plugin eval with --ablation none over smoke-tagged cases. (updated 2026-11-16)
- [[library/raw/2026-11-16-repo-package-json-node-only-tooling|Repo package.json (Node-only dev tooling)]] — The repo's package.json lists only npm dev dependencies, so a benchmark runner that adds Python, uv or docker would be a new kind of dev dependency (updated 2026-11-16)
- [[library/raw/2026-11-16-repo-testing-md|Repo TESTING.md]] — The repo's TESTING.md says eval runs use the local Claude Code CLI login with no test account or env file, results stay gitignored, and a full eval target (make eval, SMR-364) does not exist yet. (updated 2026-11-16)
- [[library/raw/2026-11-16-slopify-existing-smoke-eval-cases|Existing slopify smoke eval cases]] — The six smoke eval cases under plugins/slopify/evals and the local smoke run results (aggregate-result.json, report.html, cost per run), as task material and cost floor for benchmarking slopify workflows. (updated 2026-11-16)
- [[library/raw/2026-11-16-slopify-plugin-eval-results|slopify local plugin eval results (aggregate-result.json, report.html)]] — Layout, fields and recorded spend of this repo's existing `claude plugin eval` smoke result directories under plugins/slopify/evals/results, a floor for benchmark cost and a model for per-run output. (updated 2026-11-16)
- [[library/raw/2026-11-16-swe-bench-github-repo|SWE-bench GitHub repository and README]] — GitHub API metadata and README for SWE-bench/SWE-bench (MIT, Python, about 6.2k stars); its harness evaluates patch predictions and does not invoke an agent for the eval step. (updated 2026-11-16)
- [[library/raw/2026-11-16-swe-bench-readme|SWE-bench README]] — The SWE-bench README describes a patch-evaluation harness and a task set of GitHub issues graded by repo tests in Docker, not an agent driver. (updated 2026-11-16)
- [[library/raw/2026-11-16-terminal-bench-2-1-hf-dataset-card|Terminal-Bench 2.1 dataset card (search snippet)]] — Search snippet of the harborframework/terminal-bench-2.1 Hugging Face dataset card giving version 2.1.0, 89 tasks, and Apache License 2.0; the page itself was not fetched. (updated 2026-11-16)
- [[library/raw/2026-11-16-terminal-bench-readme|Terminal-Bench README]] — The Terminal-Bench README describes terminal tasks, each with an instruction, a test script and an oracle solution, run in a sandboxed Docker terminal. (updated 2026-11-16)
- [[library/raw/2026-11-16-terminal-bench-run-page|Terminal-Bench run page (version 2.1)]] — A search snippet of the Terminal-Bench "How to run" page confirms that Harbor's `harbor view jobs` is the way to view run results; the page itself was not fetched. (updated 2026-11-16)
