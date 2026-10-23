---
name: reproduce-bug-smoke
tags: [smoke]
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Agent, Workflow]
max_turns: 80
timeout_seconds: 3600
runs: 1
---

/slopify:reproduce-bug add(2, 2) in calc.py returns 0 instead of 4.
