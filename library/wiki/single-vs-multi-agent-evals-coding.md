---
title: Single-agent vs orchestrated designs, published evals on coding tasks
type: wiki
summary: Published evals that compare one agent with orchestrated or multi-agent designs on software-engineering tasks, with what was held fixed, success, tokens or cost, latency, sample size, stated limits, and where they agree and disagree.
status: active
confidence: low
tags:
  - evaluation
  - architecture
  - performance
  - agent-harness
aliases:
  - single vs multi-agent coding evals
  - SMR-376 coding evals
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/wiki/single-vs-multi-agent-evals-outside-coding]]"
  - "[[library/wiki/slopify-benchmark-tooling-options]]"
created: 2026-11-17
updated: 2026-11-17
---

# Single-agent vs orchestrated designs, published evals on coding tasks

> [!abstract] Summary
> Research question (SMR-376, coding half): which published evals compare one agent with orchestrated multi-agent designs on software-engineering tasks, and what did they find?
>
> Nine coding evals from seven sources were found. Five of the nine hold the model fixed, and most of those use small samples. On the controlled coding results found, an orchestrated design did not clearly beat one agent on success: Google's SWE-bench Verified arms were all slightly worse, Squad tied at n=50, a same-model manager loop on SWE-bench Lite was 2 points lower at n=50, and Vals AI's Vibe Code Bench showed a significant team gain in 1 of 4 model and effort pairs at 1.8x to 5.1x the cost. The two gains under fixed model and tools, BOAD and Vals Sol at medium effort, do not isolate orchestration: BOAD tuned its design and prompts on the benchmark family and reports no significance test, and the Vals team arm also gets a delegation prompt. Token cost is higher in most coded arms; latency is rarely reported. No same-model single-vs-orchestrated result was found on SWE-bench Pro. The page records evidence and gaps; it makes no product decision and recommends nothing for slopify.

> [!warning] Reading limits
> Most sources are arXiv preprints, vendor posts or a tool author's README; none was independently replicated. Several figures were relayed by researchers from the source rather than re-read. Absence claims (for example "latency not reported") come from keyword searches or partial reads and are not proof the source omits it. Search for coding evals was thin: a few web searches per sub-question, not a crawl. The Daily Brief article named in the task was not fetched, because the primary paper covers its figures.

## At a glance

"Fixed" means the same model and tools in both arms, as the raw note records it. "Class" is the library's label, not the authors'.

| Eval | Class | Model fixed | Tools fixed |
| --- | --- | --- | --- |
| Google, SWE-bench Verified and Terminal-Bench arms | controlled | yes, per model | yes; prompts identical, compute matched by iterations |
| BOAD (Seed-OSS-36B) | controlled, with tuning caveat | yes | yes; prompts tuned with the design |
| Squad, SWE-bench Verified 50 | controlled by the author's own label | yes (gpt-5.5) | harness matched |
| Liu, Weak-to-Weak vs Weak Direct (n=50) | controlled pair inside a larger study | yes | same pipeline |
| Vals AI, Vibe Code Bench | controlled within each model and effort pair | yes within a pair | yes; team arm also gets a delegation prompt |
| Liu, ManagerWorker vs Strong Direct (n=200) | model differs | no | same pipeline |
| Anthropic docs, Eval A and Eval B | model differs | no | Eval A tools fixed |
| Agyn | uncontrolled | no | no |
| Squad, Terminal-Bench 2.0 and SWE-bench Lite | uncontrolled | partly | no |

## Controlled or mostly controlled evals

### Google Research, scaling agent systems: SWE-bench Verified and Terminal-Bench arms

- **Source and version.** arXiv 2512.08296 v3 (8 Apr 2026). The Google Research blog and v1 cover only the four non-coding benchmarks (180 configurations); the coding benchmarks exist only from v3 (260 configurations). The blog does not mention SWE-bench or Terminal-Bench. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e1]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e6]]
- **Task set.** SWE-bench Verified (7 tools: bash, file editing, test execution) and Terminal-Bench (2 tools), each with 20-instance subsets per configuration and eight models. The page's other four benchmarks are on [[library/wiki/single-vs-multi-agent-evals-outside-coding]]. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e1]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e7]]
- **Designs.** Single agent; Independent (parallel, no communication); Centralized (orchestrator); Decentralized (peer debate); Hybrid. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e2]]
- **Held fixed.** Within a model, identical prompts, tools and compute budgets; compute is matched by total iterations, not tokens or dollars. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e4]]
- **Success.** SWE-bench Verified, single agent mean 0.522: Hybrid 0.511 (-2.1%), Centralized 0.506 (-3.1%), Decentralized 0.494 (-5.4%), Independent 0.444 (-14.9%); all orchestrated designs slightly worse. Terminal-Bench, single agent mean 0.344: Independent +1.7% (0.350), Centralized -19.2% (0.278); the other two designs' Terminal-Bench figures were not recorded. The authors attribute SWE-bench to capability saturation (single agent above about 45%) and Terminal-Bench to its low tool count. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e6]]
- **Tokens and cost.** Across the four original benchmarks, orchestrated designs used 1.6x to 6.2x the single agent's tokens (overhead: Independent 58%, Decentralized 263%, Centralized 285%, Hybrid 515%). The coding benchmarks lack cost tracking in that analysis because of the Docker-based evaluation, so there is no coding-specific token figure. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e8]]
- **Latency.** Not reported per design; the authors say only that token consumption and latency grow substantially with agent count. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e9]]
- **Significance and sample size.** Bootstrap 95% intervals are about +/-20 percentage points per cell; the authors call pairwise comparisons at n=20 underpowered and call only the aggregate trend robust (45% threshold, 94% match rate, p<0.001). [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e7]]
- **Stated limits.** Identical prompts, not tuned per model or architecture, so tuning may change results; only six benchmarks; text-based benchmarks; regression clustered at six datasets. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e15]]
- **Library note.** The v3 raw note [[library/raw/2026-11-17-towards-a-science-of-scaling-agent-systems-arxiv-v3]] and [[library/raw/2026-11-17-arxiv-2512-08296-scaling-agent-systems]] carry the same coding figures from the paper.

### BOAD: single SWE-agent against orchestrator plus sub-agents (arXiv 2512.23631)

- **Task set.** SWE-bench Verified and SWE-bench-Live (300 issues). [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e3]] [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e4]]
- **Designs.** SWE-agent single agent; SWE-agent plus one hand-designed sub-agent; plus evolutionary search; plus BOAD (orchestrator with discovered sub-agents). [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e3]]
- **Held fixed.** Orchestrator and every sub-agent use Seed-OSS-36B-Instruct at temperature 0.0 with the same default tools. Caveat: the orchestrator and sub-agent prompts were generated by Claude-4 and tuned on a 12-issue design set, so design and prompts were searched together. [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e2]]
- **Success** (Verified / Live, percent): single agent 49.8 / 12.3; manual sub-agent 47.4 / 14.0; evolutionary search 46.0 / 17.0; BOAD 53.2 / 20.0 (53.1 on Verified excluding the 12 design issues). The manual multi-agent design lost to the single agent on Verified. [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e3]]
- **Tokens.** Total tokens per issue: Verified 0.92M single vs 0.93M BOAD (+0.7%); Live 1.49M vs 1.13M (-23.8%); max input tokens lower for BOAD on both. Cost in dollars not reported. [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e1]]
- **Latency.** Not reported in the text searched. [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e5]]
- **Ablations.** Tuned prompt without sub-agents: 16.3% on Live. Sub-agent count on Live: one 49/300, two 60/300 (peak), three 49/300, four 50/300, five 41/300; the authors say larger teams reduce performance through coordination overhead. Generic orchestrator prompt 50/300 vs customized 60/300. [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e4]]
- **Significance and sample size.** Table 1 gives no significance test; results appear to be single runs at temperature 0 (the note's inference). [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e3]]
- **Stated limits.** Only a 36B open model; discovered sub-agents transfer across models only partially; error propagation when the orchestrator accepts sub-agent output unconditionally. [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e5]]
- **Library note.** The v2 HTML note [[library/raw/2026-11-17-boad-hierarchical-software-engineering-agents-arxiv-v2]] records the same figures.

### Squad: SWE-bench Verified 50 (tool author, self-run)

- **Task set and designs.** 50 SWE-bench Verified instances; Squad (a multi-agent coordination layer for GitHub Copilot CLI) on versus off. [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e1]] [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e2]]
- **Held fixed.** Model gpt-5.5 and the WSL/Docker harness matched, by the author's label. [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e2]]
- **Success.** Squad-on 36/50 (72%), Squad-off 36/50 (72%); the arms solve different instances (3 unique each). The author calls it "an honest statistical tie at n=50". [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e2]]
- **Tokens, cost, latency.** Not reported for the coding arms. [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e6]]
- **Limits.** Author-run by the tool's author, README only, no peer review; the per-instance data in a separate repository was not fetched. [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e7]] The same README's uncontrolled results are in the uncontrolled section below.

### Liu, Can AI Models Direct Each Other? Weak-to-Weak pair (arXiv 2603.26458)

- **Task set.** A 200-instance subset of SWE-bench Lite (Python only), five configurations run through GitHub Copilot CLI. [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e1]]
- **The model-fixed pair (n=50).** Weak-to-Weak (GPT-5-mini as both manager and worker) solved 42% against 44% for Weak Direct (GPT-5-mini alone). The author reads this as "structure without substance is pure overhead". [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e4]]
- **Tokens.** Weak-to-Weak about 75K tokens per instance against about 15K for Weak Direct (about 5x), estimated token counts rather than billing. [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e5]]
- **Latency and significance.** Latency and a significance test are not reported. The 2-point gap is inside the 10-point run-to-run variation the author reports on small subsets, so the note reads it as no benefit rather than a measured loss. [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e7]] [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e12]]
- **Stated limits.** One benchmark (Python only), two model tiers, estimated token counts, pipeline-specific artifacts, non-determinism. [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e11]]
- The HTML note [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-html]] records the same figures.

### Vals AI, Do Agent Teams Pay Off? Vibe Code Bench

- **Task set.** Vibe Code Bench: 50 greenfield web apps built from a product spec, deployed with Docker Compose and graded by browser agents; score is the share of an app's UI tests that pass. It is full-stack building, not issue repair. [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e2]]
- **Designs.** Single agent against a lead agent with up to five concurrent subagents, for GPT 6 Sol (Agents API) and Claude Opus 5.5 (Claude Code CLI), each at medium and max reasoning effort: eight setups. [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e3]]
- **Held fixed.** Within a model and effort pair, the task prompt, sandbox and grader are identical. The team arm also receives a delegation instruction, so each comparison is "subagents plus a delegation prompt" against neither. Across models the harness differs, so cross-model comparisons mix model and harness. [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e4]]
- **Success, cost per app, median runtime (single to team).** [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e5]]
  - Sol medium: 77.6%, $1.22, 12.4 min to 84.9%, $3.07, 11.9 min.
  - Sol max: 89.0%, $4.82, 38.4 min to 90.4%, $8.54, 27.6 min.
  - Opus 5.5 medium: 91.5%, $4.08, 20.3 min to 91.2%, $9.10, 26.6 min.
  - Opus 5.5 max: 89.8%, $23.77, 74.7 min to 93.2%, about $122, 174.1 min.
- **Cost multiples.** Teams cost 1.8x to 5.1x as much (Sol 2.5x and 1.8x; Opus 2.2x and 5.1x). Total tokens per arm are not tabulated; at Opus max, subagents read a median of 224 million cached tokens per app against 17 million for the lead and 55 million for the single agent. [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e1]] [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e6]]
- **Latency.** Mixed: Sol teams were faster; Opus teams were slower, up to 2.3x the single agent's runtime at max effort. [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e7]]
- **Significance and sample size.** 50 apps, each setup run once; paired t-test over apps. Only Sol at medium effort was significant (+7.3 points, p=0.005, interval +2.3 to +12.4); the other three pairs had p from 0.16 to 0.81. The intervals reflect variation across apps, not between repeated runs. [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e8]]
- **Competing lever.** For Sol, max effort raised the single agent by 11.4 points (p<0.001), more than the 7.3 a team added at medium effort; for Opus, max effort alone did not raise the score. [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e9]]
- **Where the Sol gain came from.** The authors' post-hoc analysis: the medium-effort team scored higher on 24 apps, lower on 11; on nine apps with gains of 20 or more points, the single agents reported tests passing even though some features were never built. [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e10]]
- **Stated limits.** One benchmark of full-stack web apps; each setup ran once; different harness per model; Sol's event stream shows only the lead's turns. [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e13]] [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e14]]
- **Secondary source.** [[library/raw/2026-11-17-iamag-ai-agent-teams-token-waste-vals-benchmark]] is an AI-generated summary of this post; use it only to locate the primary. [[library/raw/2026-11-17-iamag-ai-agent-teams-token-waste-vals-benchmark#^e1]]

## Evals where the model differs between arms

These are published single-vs-orchestrated comparisons, but the design is confounded with a model change, so they do not isolate the design.

### Liu, ManagerWorker vs Strong Direct (SWE-bench Lite, n=200)

- ManagerWorker (Sonnet 4.6 manager directing a GPT-5-mini worker) solved 62%, against 60% for Strong Direct (Sonnet 4.6 alone); Simple Loop (same pairing, review-only) 53%; Weak Direct 51%. [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e2]] [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e3]]
- Estimated tokens: ManagerWorker about 6.6K strong-model tokens against about 30K for Strong Direct (the weak worker's tokens are separate). [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e5]]
- The 2-point gain mixes models; no significance test, no latency. [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e9]] [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e10]]

### Anthropic docs, Optimizing for cost and intelligence: Eval A (subagents)

- **Task set.** Anthropic internal coding benchmark, 134 repository tasks graded by hidden tests, 5 attempts per task in each of 3 runs, run on Claude Managed Agents. [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e2]]
- **Designs and what differs.** Opus 5.5 alone at medium effort; Opus 5.5 plus Haiku 5.5 subagents with no added prompt; the same with a 113-word delegation prompt; Opus 5.5 alone at low effort. Every agent had the same two custom tools (shell and file editor). The orchestrator model is fixed but the subagent model differs from the single agent, so the note treats it as partly uncontrolled. [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e2]]
- **Success and cost per attempt.** Opus alone at medium 72.1% and $4.78; with subagents 68.8% and $3.35; with subagents plus prompt 67.9% and $3.27; Opus alone at low 63.0% and $1.84. With the prompt, cost was 32% lower (95% interval 29 to 35%) and 4.2 points fewer tasks passed (1.3 to 7.1). The subagent designs landed on the line between low and medium effort. [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e2]]
- **Latency.** Not reported numerically. [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e2]]
- **Stated limit.** Voided attempts fell only on the subagent configurations (72 of 2,010 with prompt); with those excluded the gap was 1.7 points fewer (4.4 fewer to 1.1 more). [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e2]]

### Anthropic docs: Eval B (advisor)

- 370 repository tasks graded by each repository's own tests, plain API agent, 5 attempts per task. Opus 5.5 at high effort with a Fable 5.1 advisor scored 90.1% at $2.92 per attempt; Opus 5.5 alone scored 74.8% ($0.35, low), 86.6% ($0.84, medium), 88.4% ($1.38, high) and 91.1% ($4.11, xhigh). The advisor added 1.7 points over Opus at high for about 2.1x the cost, "at the edge of run-to-run noise"; the page's reading is that it "bought about what more effort does". Latency is qualitative only ("one or two extra frontier-model calls per task, each on the task's critical path"). The model differs between arms. [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e3]]
- Vendor-run, self-reported, internal benchmarks that readers cannot rerun. [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e3]]

## Uncontrolled results

### Agyn, team-based software engineering (arXiv 2602.01465)

- A role-based team (manager, engineer, reviewer, researcher) resolves 72.2% of SWE-bench Verified (500 tasks), against 65.0% for mini-SWE-agent with GPT-5 and 71.8% for mini-SWE-agent with GPT-5.2 and for OpenHands with GPT-5. The abstract claims a 7.4% gain over mini-SWE-agent "under comparable model configurations". [[library/raw/2026-11-17-agyn-multi-agent-team-based-autonomous-software-engineering#^e1]]
- Not held fixed: the team mixes GPT-5 and GPT-5-Codex by role, uses role-specific tools and isolated sandboxes, and the baselines are leaderboard entries, not matched runs. [[library/raw/2026-11-17-agyn-multi-agent-team-based-autonomous-software-engineering#^e2]]
- The paper reports no tokens, cost or latency for either design. [[library/raw/2026-11-17-agyn-multi-agent-team-based-autonomous-software-engineering#^e3]]
- Only the HTML was read by keyword filter; an earlier PDF fetch failed.

### Squad: Terminal-Bench 2.0 and SWE-bench Lite

- Terminal-Bench 2.0, 20 of 89 tasks: Squad 16/20 (80%) against baseline 15/20 (75%), but the arms ran through different harness paths; the author calls the one-task margin "directional, not a clean controlled result". [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e3]]
- SWE-bench Lite: 66% against an estimated baseline near 48% taken from public reports, not a matched run. [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e4]]

## Gaps in the coding record

- **SWE-bench Pro.** No same-model single-vs-orchestrated result was found. The only SWE-bench Pro multi-agent data located is Anthropic's advisor pairings, which use two different models and give no pairing score in the page text beyond a 77.4% Sonnet 5 baseline. The page's subset size is 482 problems in one place and 478 in another, and is not comparable to the public leaderboard. This is a thin search, not evidence of absence. [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e1]]
- **Terminal-Bench.** The only controlled design comparison found is the n=20 Google arm; Anthropic's page compares models, not designs. [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e4]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e6]]
- **Latency.** Reported with numbers only by Vals AI; Google, BOAD, Liu, Squad and Agyn report none, and Anthropic's page is qualitative. [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e7]]
- **Unfetched leads, no claims made.** The Anthropic 2026 Agentic Coding Trends Report PDF (a "single-agent vs multi-agent Claude" figure appears only on secondary blogs); DeepSWE (arXiv 2607.07946); SWE-Debate (arXiv 2507.23348); the Squad Verified-50 raw data repository; the Artificial Analysis coding-agents page. Secondary blog restatements of the Agyn figure are not independent evals. [[library/raw/2026-11-17-agyn-multi-agent-team-based-autonomous-software-engineering]]

## Where the evals agree

- **No uniform multi-agent gain on coding.** Most controlled comparisons show the orchestrated arm at or below the single agent, or a gain that is not significant (the two exceptions, BOAD and Vals Sol at medium effort, are under Disagree): Google SWE-bench Verified (all four designs slightly lower), Squad Verified-50 (tie), Liu Weak-to-Weak (42% vs 44%), Vals (3 of 4 pairs not significant). Anthropic Eval A, where the subagent model differs from the single agent, also had a lower pass rate. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e6]] [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e2]] [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e4]] [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e8]] [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e2]]
- **Orchestration usually costs more.** Vals teams cost 1.8x to 5.1x; Google reports 1.6x to 6.2x tokens across its (non-coding) cost-tracked benchmarks; Liu's same-model pair used about 5x the tokens. [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e5]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e8]] [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e5]]
- **Design details decide the outcome.** BOAD's hand-designed sub-agent scored below the single agent on Verified (47.4 vs 49.8, though above it on SWE-bench-Live, 14.0 vs 12.3) while the BOAD-discovered design scored above on both, and sub-agent count and orchestrator prompt moved results; Liu's same-model manager added overhead without a gain. [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e3]] [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e4]] [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e4]]
- **Small samples.** Most controlled coding arms sit at n=20 to n=50 per cell with wide intervals or none, and the authors of Google, Liu and Squad say so; BOAD is the larger exception (300 SWE-bench-Live issues plus SWE-bench Verified) but gives no significance test. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e7]] [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458#^e7]] [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e3]] [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e3]]
- **Another lever competes.** Vals found reasoning effort matched or beat the team gain for Sol; Anthropic's advisor "bought about what more effort does". [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e9]] [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e3]]
- **Where the authors name a fit.** Anthropic's own post says most coding tasks have fewer parallelizable parts than research; Vals says teams should gain most when work splits into parts that run side by side. Both are authors' hypotheses; Vals lists them as future work, not tested. [[library/raw/2026-11-17-anthropic-multi-agent-research-system#^e8]] [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e11]]

## Where the evals disagree

- **Direction of the token cost.** BOAD found orchestration token-neutral on Verified (+0.7%) and cheaper on Live (-23.8%) at a fixed 36B model; Anthropic Eval A found subagents cheaper (about 30% lower cost) with a cheaper subagent model; the other coding sources found more cost. The setups differ in model size, design source and what the cost covers, so the contradiction stays open. [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e1]] [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e2]] [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e5]]
- **Does a gain exist at all.** BOAD (53.2 vs 49.8 on Verified) and Vals Sol medium (+7.3, p=0.005) show gains under fixed model and tools; Google, Squad and the Liu pair show none. BOAD tuned its design and prompts on the benchmark family and the Vals team arm bundles a delegation prompt, so neither isolates orchestration. [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e2]] [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e4]]
- **Latency direction.** Vals teams were faster for Sol and up to 2.3x slower for Opus at max effort. [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e7]]
- **Capability ceiling.** Google's regression says tasks where the single agent is above about 45% accuracy see negative returns from added agents; Vals's Sol medium single agent scored 77.6% and still gained significantly. The benchmarks, metrics and models differ, so this is a tension, not a direct contradiction (the library's reading). [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e13]] [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench#^e5]]
- **Uncontrolled claims of gain.** Agyn claims 72.2% against 65.0% but changes model mix and tools along with the design; Squad's Terminal-Bench and Lite numbers favour Squad but are uncontrolled. These disagree with the controlled ties and cannot be reconciled with them from the notes. [[library/raw/2026-11-17-agyn-multi-agent-team-based-autonomous-software-engineering#^e2]] [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e3]]
- **A source that disagrees with itself.** Anthropic's page gives the SWE-bench Pro subset as 482 and 478 problems. [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e1]]

## Open questions

> [!question]
> - Whether any published eval holds model, tools and prompts fixed on SWE-bench Pro, or on Terminal-Bench with more than 20 tasks per arm. None was found.
> - Whether the Anthropic 2026 Agentic Coding Trends Report holds a primary single-vs-multi-agent coding figure; it was not fetched.
> - Per-design latency on coding tasks outside Vals AI.
> - Whether BOAD's gain survives a single agent given the same prompt-search budget (the paper's prompt-only ablation scored 16.3% on Live against 20.0% for BOAD, which partly addresses this on one benchmark). [[library/raw/2026-11-17-boad-arxiv-2512-23631#^e4]]

## Related pages

- [[library/wiki/single-vs-multi-agent-evals-outside-coding]] covers the non-coding evals and the SOP-Bench study that prompted this research.
- [[library/wiki/slopify-benchmark-tooling-options]] covers tooling for running benchmark comparisons; no eval was run for this page.

## Sources

- [[library/raw/2026-11-17-google-research-scaling-agent-systems]]
- [[library/raw/2026-11-17-towards-a-science-of-scaling-agent-systems-arxiv-v3]]
- [[library/raw/2026-11-17-arxiv-2512-08296-scaling-agent-systems]]
- [[library/raw/2026-11-17-boad-arxiv-2512-23631]]
- [[library/raw/2026-11-17-boad-hierarchical-software-engineering-agents-arxiv-v2]]
- [[library/raw/2026-11-17-squad-marble-benchmark-readme]]
- [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-2603-26458]]
- [[library/raw/2026-11-17-can-ai-models-direct-each-other-arxiv-html]]
- [[library/raw/2026-11-17-vals-ai-multi-agent-vibe-code-bench]]
- [[library/raw/2026-11-17-iamag-ai-agent-teams-token-waste-vals-benchmark]]
- [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence]]
- [[library/raw/2026-11-17-agyn-multi-agent-team-based-autonomous-software-engineering]]
- [[library/raw/2026-11-17-anthropic-multi-agent-research-system]]
