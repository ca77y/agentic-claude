---
name: deliver-trivial-smoke
tags: [smoke]
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Agent, Workflow]
max_turns: 80
timeout_seconds: 600
runs: 1
---

/slopify:deliver-trivial Add a function `mul(a, b)` to `calc.py` that returns the product of its two arguments. Work on a branch only, without a worktree.
