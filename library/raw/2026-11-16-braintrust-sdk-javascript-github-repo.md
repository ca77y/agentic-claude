---
title: Braintrust JavaScript SDK GitHub repository metadata
type: raw
summary: GitHub API metadata for braintrustdata/braintrust-sdk-javascript (Apache-2.0, TypeScript, pushed 2026-11-16), the SDK that traces Claude Agent SDK runs for Braintrust; Braintrust does not run the agent.
tags: []
aliases: [braintrust sdk repo]
source: https://api.github.com/repos/braintrustdata/braintrust-sdk-javascript
accessed: 2026-11-16
published: unknown
provider: GitHub API
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Braintrust JavaScript SDK GitHub repository metadata

> [!quote] Source
> **URL**: https://api.github.com/repos/braintrustdata/braintrust-sdk-javascript
> **Accessed**: 2026-11-16
> **Method/Context**: GitHub API repository record for braintrustdata/braintrust-sdk-javascript, read while researching SMR-361 (benchmarking the slopify workflows against a bare model). Version date: repo metadata as of 2026-11-16; no release or publication date.

## Key evidence

- The SDK repository is Apache-2.0 licensed TypeScript, and its last push was 2026-11-16. Paraphrase of API fields. ^e1
- The researcher used this record as the licence, language and activity input for the finding that Braintrust does not run the agent: it traces Claude Agent SDK runs and hosts evals. The tracing integration itself (`wrapClaudeAgentSDK(claudeSDK)` after `initLogger({projectName, apiKey: BRAINTRUST_API_KEY})`), the `braintrust-claude-plugin` with its `trace-claude-code` skill, and the inference that an API key and project imply the hosted service come from Braintrust's documentation page and a plugin-repo search snippet, not from this API record, and belong in notes for those pages. ^e2

## Limitations

- The API record gives only repository metadata. It says nothing about what Braintrust does with Claude Agent SDK runs, whether it can self-host, its pricing, or whether it has a local-only mode. Those are not established.
- Evidence ^e2 is the researcher's attribution of the figures to the finding, not a passage from the API.
- The push date is a snapshot as of 2026-11-16 and changes over time.

## Relevance

- Licence and maturity inputs for placing Braintrust as a tracing and eval-hosting layer, not an agent runner, when comparing harness options for the SMR-361 benchmark.
