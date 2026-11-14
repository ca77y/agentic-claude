---
name: deliver-story-smoke
tags: [smoke]
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Agent, Workflow]
max_turns: 80
timeout_seconds: 600
runs: 1
---

/slopify:deliver-story STORY-1 Work on a branch only, without a worktree.
