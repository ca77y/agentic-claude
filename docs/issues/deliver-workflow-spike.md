# Deliver workflow spike

Phase 0 of moving `deliver`'s gates into workflow scripts. A throwaway plugin (a copy of `slop-eng` plus `workflows/spike.js` and a `spike` skill) ran headless with `claude -p --plugin-dir` against a scaffold repo, on Claude Code 2.1.296, 2026-10-11. Evidence is each run's `journal.jsonl` and per-agent `*.meta.json` and `*.prefix.json` under `~/.claude/projects/<project>/<session>/subagents/workflows/<run>/`.

## Answers

1. **Plugin agents run with their pinned model and effort.** `agent(prompt, {agentType: 'slop-eng:writer'})` runs the definition: its body is the system prompt (the coder answered in its `Changed/Tests/Ran/Open` format), its `model` and `effort` apply (writer `claude-opus-5-5` at `medium`, coder and QA `claude-sonnet-5-5` at `high`, on a Sonnet session), and `disallowedTools` holds (QA had no `Edit` or `Write`). `opts.model` overrides the pinned model (writer with `model: 'haiku'` ran on Haiku).
2. **Moot**, since (1) holds.
3. **Yes.** The coder, addressed by absolute path, edited `calc.py`, ran `python3 -m unittest`, created a branch, and committed. Two limits: workflow agents get no `Agent` tool, so a leaf cannot dispatch `Explore` inside a workflow; and an agent may push a long command to the background and return a status message instead of a result, so a node's output must be checked, not trusted.
4. **Yes.** Every `schema` call returned a validated object, including an `unverified` verdict with its findings.
5. **Yes.** A run killed after its agents finished was relaunched from a resumed session (`claude -p --resume <session>`) with `Workflow({scriptPath, resumeFromRunId})`: all six agents replayed from the journal in 17 ms with no tokens, and the coder's commit was not repeated. An agent killed mid-flight reruns live. Resume needs the run's session.
6. **Yes, with string args.** A `disable-model-invocation: true` skill started the plugin workflow by its qualified name (`slop-eng:spike`). Told to pass a JSON object, the model once passed the raw argument string instead, so a script must accept `args` as an object or as a JSON string. The workflow runs in the background and the skill is notified when it returns; a headless session waits for it.
7. **Workflow agents inherit the session's permissions.** Headless, the `Workflow` tool and every agent command need an allow rule: QA's `cd <repo> && python3 …` matched none, was denied without a prompt, and QA returned `unverified`. Interactive default mode was not tested here; its prompts would reach the user while the workflow runs, as they already do for `deliver`'s background agents.

## Decision

Proceed. Model routing survives the move, and the workflow keeps the agent definitions, so the briefs, contracts, and references stay where they are.
