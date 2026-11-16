---
title: promptfoo Anthropic provider
type: raw
summary: Unfetched lead; a search snippet says the page points to the Claude Agent SDK provider for agentic evaluations.
tags: []
aliases: []
source: https://www.promptfoo.dev/docs/providers/anthropic/
accessed: 2026-11-16
published: unknown
provider: promptfoo
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# promptfoo Anthropic provider

> [!quote] Source
> **URL**: https://www.promptfoo.dev/docs/providers/anthropic/
> **Accessed**: 2026-11-16
> **Method/Context**: Search result snippet only; the page was not fetched. Gathered for SMR-361 (benchmarking the slopify workflows against an evaluation harness).

## Key evidence

- A search snippet for this page reads: "For agentic evaluations that need built-in file access and skill plugins on top of the Messages API, see the Claude Agent SDK provider." So the Anthropic provider page points readers to the Claude Agent SDK provider (`anthropic:claude-agent-sdk`) for agentic evaluations. (quotation of the snippet) ^e1

## Limitations

- Only the search snippet was read. The page itself was not fetched, so its full contents, surrounding text and any version or publication date are unknown.
- The snippet supports only the pointer to the Claude Agent SDK provider. It says nothing about how that provider loads plugins or isolates workspaces; those details come from a different page and are not recorded here.

## Relevance

- Shows that promptfoo separates its plain Messages API provider from an agentic one, so an evaluation that needs file access and skill plugins would use the Claude Agent SDK provider. Fetch the page before citing anything beyond this pointer.
