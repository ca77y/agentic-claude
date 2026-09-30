---
name: deliver-smoke
tags: [smoke]
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Agent, Skill, TaskStop]
max_turns: 80
timeout_seconds: 1800
runs: 1
---

/slop-eng:deliver `add` in `calc.py` subtracts instead of adding. Fix it so it returns the sum.
