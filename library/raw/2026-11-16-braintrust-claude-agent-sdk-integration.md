---
title: Braintrust Claude Agent SDK integration
type: raw
summary: Braintrust traces Claude Agent SDK runs and hosts evals; it does not run the agent, and hosting, pricing and local-only mode are not established.
tags: []
aliases: []
source: https://www.braintrust.dev/docs/integrations/agent-frameworks/claude-agent-sdk
accessed: 2026-11-16
published: unknown
provider: Braintrust
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Braintrust Claude Agent SDK integration

> [!quote] Source
> **URL**: https://www.braintrust.dev/docs/integrations/agent-frameworks/claude-agent-sdk
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows against an evaluation harness). Version or publication date of the page is unknown. Two further leads came with the finding and are listed under Limitations.

## Key evidence

- Braintrust does not run the agent. It traces Claude Agent SDK runs and hosts evals. The page's purpose, as a search snippet quotes it: "Trace Claude Agent SDK runs in Braintrust to debug agent queries, tool calls, and multi-step reasoning." (quotation of the search snippet) ^e1
- The TypeScript integration wraps the SDK with `wrapClaudeAgentSDK(claudeSDK)` after `initLogger({projectName, apiKey: BRAINTRUST_API_KEY})`. (paraphrase of the integration docs) ^e2
- A `braintrust-claude-plugin` offers a `trace-claude-code` skill to trace Claude Code sessions. (paraphrase; seen only in a search snippet of https://github.com/braintrustdata/braintrust-claude-plugin) ^e3
- The Braintrust SDK repository is Apache-2.0 TypeScript and was last pushed 2026-11-16. (paraphrase of API fields from https://api.github.com/repos/braintrustdata/braintrust-sdk-javascript, retrieved 2026-11-16; repo metadata as of that date) ^e4
- The tracing docs show an API key and a Braintrust project. (paraphrase) ^e5

## Limitations

- Inference, not quoted: the API key and project in ^e5 imply the hosted service.
- Not established: self-hosting, pricing and any local-only mode.
- The `braintrust-claude-plugin` repository page was not fetched; ^e3 rests on a search snippet only.
- The page's publication or version date is unknown.

## Relevance

- Braintrust instruments the Claude Agent SDK rather than driving it, so it could record traces of an evaluation run but would not replace a runner such as promptfoo, Inspect SWE or Harbor. Confirm hosting and pricing before relying on it.
