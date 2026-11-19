---
title: Vals AI - Do Agent Teams Pay Off? A Case Study on Vibe Code Bench
type: raw
summary: Vals AI's controlled single-agent versus team comparison on 50 greenfield web-app builds, the only one of its kind a search of Vals found; teams cost 1.8x to 5.1x as much and beat single agents significantly in only one of four model/effort pairs.
tags: [evaluation, agent-harness]
aliases: [Vals multi-agent Vibe Code Bench, Do Agent Teams Pay Off]
source: https://www.vals.ai/blogs/multi-agent-vibe-code-bench
accessed: 2026-11-17
published: 2026-10-09
provider: Vals AI (Katrina Drozdov)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# Vals AI - Do Agent Teams Pay Off? A Case Study on Vibe Code Bench

> [!quote] Source
> **URL**: https://www.vals.ai/blogs/multi-agent-vibe-code-bench
> **Accessed**: 2026-11-17
> **Method/Context**: Gathered for SMR-376 (published evals of single-agent versus multi-agent designs). Findings were reported by a researcher who read the post; each bullet is marked as quotation, paraphrase, or inference. The post is dated "10/09/2026"; the date format is ambiguous. It is read as 2026-10-09 because a secondary article dated 2026-10-12 cites it. The p-values and intervals are the post's own and were not recomputed.

## Key evidence

- Headline result: "We ran GPT 6 Sol and Claude Opus 5.5 on Vibe Code Bench as single agents and as teams, at medium and max reasoning effort. Teams cost 1.8 to 5.1 times as much, and only for Sol at medium effort was the difference in score statistically significant." (quotation) ^e1
- Task set and domain: Vibe Code Bench is "our benchmark for building complete web applications from a product spec"; 50 apps, each deployed with Docker Compose and graded by browser agents clicking through workflows. Score is "the share of an app's UI tests that pass, averaged over the 50 apps". (quotation) This is a greenfield full-stack build task, not SWE-bench-style issue repair. (inference) ^e2
- Designs compared: single agent versus team. The team is a lead agent that can hand parts of the build to subagents, "up to five at once, and subagents cannot spawn their own". Both leads got "the same short instruction: split the work into independent parts, delegate each one, then integrate and verify the result". Two models at two reasoning efforts (medium, max) make 8 setups: GPT 6 Sol via the OpenAI Agents API with multi_agent mode off or on, and Claude Opus 5.5 via the Claude Code CLI headless with subagent tools removed or available. (quotation and paraphrase, methodology section) ^e3
- Controls and confounds: within each model/effort pair "the task prompt, sandbox, and grader were otherwise identical". The team arm also received the delegation instruction, so "each comparison is between 'subagents plus a delegation prompt' and neither." Single agents had subagent tools removed (Opus) or multi_agent off (Sol). Opus team runs also disabled Claude Code's ten-minute limit on background subagents. Across models the comparison is not controlled: "The two models ran through different harnesses, so comparisons across models mix the model with its harness." (quotation and paraphrase) ^e4
- Results, single to team (success rate, cost per app, median runtime), from the post's table (quotation of table):
  - Sol medium: 77.6%, $1.22, 12.4 min to 84.9%, $3.07, 11.9 min.
  - Sol max: 89.0%, $4.82, 38.4 min to 90.4%, $8.54, 27.6 min.
  - Opus 5.5 medium: 91.5%, $4.08, 20.3 min to 91.2%, $9.10, 26.6 min.
  - Opus 5.5 max: 89.8%, $23.77, 74.7 min to 93.2%, about $122 ($121.95 on the leaderboard table), 174.1 min.
  - Team cost multiples: Sol 2.5x (medium) and 1.8x (max); Opus 2.2x (medium) and 5.1x (max). ^e5
- Tokens: "At max effort, Opus's subagents read a median of 224 million cached tokens per app, against 17 million for the lead and 55 million for the single agent." (quotation) Total token counts per arm are not tabulated; cost is the published measure. Sol's cost applies OpenAI base-tier list prices to reported usage and "assume[s] that its reported token usage includes the subagents". (quotation and paraphrase) ^e6
- Latency: Sol teams were faster (medium 11.9 vs 12.4 min; max 27.6 vs 38.4 min). Opus teams were slower, "up to 2.3 times the single agent's runtime at max effort" (174.1 vs 74.7 min). Runtime is wall-clock agent time in the sandbox; "longer runs did not score higher". Four Opus max team runs exceeded four hours and one hit the 5.25-hour limit. One Opus max team ran out of time while verifying, and its cost of about $189 is estimated from token counts. (quotation and paraphrase) ^e7
- Significance and sample size: 50 apps; "Each of the eight setups ran once." Paired t-test on the same 50 apps. Only Sol medium was significant: +7.3 points, p = 0.005, 95% interval +2.3 to +12.4. The other three were not (p = 0.16 to 0.81): Sol max +1.4 (interval -1.7 to +4.5), Opus medium -0.3 (-3.2 to +2.5), Opus max +3.4 (-1.4 to +8.3). "Because each setup ran once, the intervals and p-values in this post reflect variation across apps, not between repeated runs." (quotation and paraphrase) ^e8
- Effort versus team as a lever: for Sol, max effort raised the single agent by 11.4 points (p < 0.001), more than the 7.3 a team added at medium. Sol max-effort single (89.0%) against medium-effort team (84.9%) is +4.1, p = 0.08, at 1.6x cost and 3x runtime. For Opus, max effort alone did not raise the score (89.8% at $23.77 vs 91.5% at $4.08, p = 0.48). The highest score in the study, Opus max team at 93.2%, cost thirty times the medium single agent, and its 1.6-point lead over that agent was not significant (p = 0.36). (paraphrase of the post) ^e9
- Where gains came from (the authors' post-hoc analysis): the Sol medium team scored higher on 24 apps, lower on 11, and the same on 15, with about +15 points on harder apps and about +1 on easier ones. On nine apps where it gained 20 or more points, "the single agents reported that testing had passed even when some features were never built". Opus gains and losses were balanced (higher on 14, lower on 15 at medium; higher on 13, lower on 8 at max) and did not favor harder apps. "Other properties we checked had no consistent effect" (spec length, number of UI tests, single vs multi-user). (paraphrase and quotation) ^e10
- Authors' framing: "Whether a team is worth it depends on the model, task, and budget"; "A team should gain the most when the work splits into parts that can proceed side by side, and the lead can combine them without spending the time it saved on coordination." Large codebases, broad research questions and analyses over many documents are named as next places to look; this is future work, not tested. (quotation and paraphrase) ^e11
- Secondary write-up, locator only and not a source for numbers: IAMag, "AI Agent Teams: Token Waste for Minimal Gains", 2026-10-12, https://iamag.it/en/news/ai-agent-teams-token-waste-vals-benchmark (retrieved 2026-11-17). It is labelled "AI-generated summary. It may not be accurate" and an AI translation, and cites the-decoder.com and the Vals post. Its table matches the Vals primary. It adds claims absent from the Vals post (an Anthropic system card Lean scaling 0.39 to 0.66 to 0.68, quotes attributed to Noam Brown and Eric Provencher, a "coordination tax" framing). These were not verified and need their own primary sources before use. ^e12

## Limitations

- Stated by the authors: "These observations come from one benchmark of full-stack web apps and may not carry over to other kinds of work." Each setup ran once. Each model ran through a different harness. (quotation and paraphrase) ^e13
- Logging asymmetry: OpenAI's Agents API event stream contains only the lead's turn, "so for Sol we can see when the lead created, messaged, and waited on subagents, but not what it told them or what they did"; Sol's logs omit the lead's file-edit-tool calls. Sol cost for requests above the 272K-token long-context threshold could not be evaluated. Behavior counts come from event streams, and activity labels are "heuristic classifications". (quotation and paraphrase) ^e14
- The team arm bundles subagents with a delegation prompt, so the effect of the prompt alone is not separated from the effect of subagents. (inference from ^e4) ^e15
- Coverage: three search queries on Vals coding content (single agent versus team, SWE-bench orchestrator subagents, Terminal-Bench and Vibe Code Bench multi-agent) returned only this post on single-versus-team designs. Vals leaderboard pages (SWE-bench, Terminal-Bench, Vibe Code Bench) appeared as model leaderboards and were not fetched. That Vals has no other single-versus-team coding eval is supported by search only, not by a crawl of vals.ai/blogs. ^e16

## Relevance

- A controlled published comparison of single agent against lead-plus-subagents on software work, with cost and runtime reported alongside score. It shows the team gain is model- and effort-dependent, significant in 1 of 4 pairs, and bought at 1.8x to 5.1x cost. (inference from ^e1, ^e5, ^e8)
- Raising reasoning effort was a competing lever that matched or beat the team gain for Sol (^e9). It does not bear on single-agent versus team comparisons on issue-repair tasks (^e2).
