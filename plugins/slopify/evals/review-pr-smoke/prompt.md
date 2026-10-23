---
name: review-pr-smoke
tags: [smoke]
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Agent, Workflow]
max_turns: 80
timeout_seconds: 3600
runs: 1
---

/slopify:review-pr .forge/prs/smoke.md
