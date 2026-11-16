---
title: Inspect Agent Bridge
type: raw
summary: Inspect AI's agent bridge can run CLI agents such as Claude Code in sandboxes, with model calls proxied to Inspect.
tags: [operations]
aliases: []
source: https://inspect.aisi.org.uk/agent-bridge.html
accessed: 2026-11-16
published: unknown
provider: UK AI Security Institute (Inspect AI)
up: "[[library/wiki/operations|Operations]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Inspect Agent Bridge

> [!quote] Source
> **URL**: https://inspect.aisi.org.uk/agent-bridge.html
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). The finding below was reported by a researcher; the Agent Bridge page and the companion Inspect SWE page were read together, and the passages below are marked by which page they come from.

## Key evidence

- Inspect AI can run Claude Code as an agent on a task. Its agent bridge supports CLI agents that run in sandboxes, and the Inspect SWE package's `claude_code()` agent drives the Claude Code CLI in unattended mode inside an Inspect sandbox. Model API calls from the sandbox are proxied to the Inspect model provider. ^e1
  - Page for the bridge claim: https://inspect.aisi.org.uk/agent-bridge.html (Agent Bridge). Page for the `claude_code()` claim: https://meridianlabs-ai.github.io/inspect_swe/claude_code.html (Inspect SWE: Claude Code), a companion page in a separate org (meridianlabs-ai), not this source. Retrieved 2026-11-16; published/version date unknown.
  - > [!quote] From the Inspect SWE page
  > The `claude_code()` agent uses the unattended mode of Anthropic Claude Code to execute agentic tasks within the Inspect sandbox. Model API calls that occur in the sandbox are proxied back to Inspect

## Limitations

- Only one finding rests on this page, and part of it (the `claude_code()` agent and its quote) comes from the companion Inspect SWE page, not the Agent Bridge page itself.
- Publication and version dates are unknown for both pages.
- The record does not say which sentences of the claim the Agent Bridge page itself states beyond CLI agents running in sandboxes.

## Relevance

- Shows one route for running Claude Code as the agent under test inside an evaluation harness (SMR-361).
- Findings about Inspect SWE options, usage, plugin loading and repository maturity rest on other pages and are not recorded here.
