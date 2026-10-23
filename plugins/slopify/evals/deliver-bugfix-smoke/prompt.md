---
name: deliver-bugfix-smoke
tags: [smoke]
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Agent, Workflow]
max_turns: 80
timeout_seconds: 3600
runs: 1
---

/slopify:deliver-bugfix `add` in `calc.py` subtracts instead of adding. Fix it so it returns the sum.
