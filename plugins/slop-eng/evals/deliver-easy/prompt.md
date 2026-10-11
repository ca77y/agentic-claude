---
name: deliver-easy
tags: [smoke]
allowed_tools:
  [Read, Write, Edit, Bash, Glob, Grep, Agent, Skill, TaskStop, Workflow]
max_turns: 60
timeout_seconds: 1200
runs: 1
---

/slop-eng:deliver Fix the typo "Retruns" in the docstring of `add` in `calc.py`.
