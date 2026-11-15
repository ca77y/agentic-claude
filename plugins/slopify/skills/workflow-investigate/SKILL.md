---
name: workflow-investigate
description: Measure one slopify workflow run, with each agent's tokens, cost, and time and whatever was out of the ordinary, and save it as a report in docs/workflows/.
disable-model-invocation: true
---

The argument names one run: its run id (`wf_…`), or a workflow name such as `deliver-story` for that workflow's latest run in this project. Without one, ask which run to investigate.

1. Run `node ${CLAUDE_SKILL_DIR}/scripts/workflow-investigate.js <run>` from the project root. It prints the measured report: the run's summary and slug, tables by phase, by agent type, and by agent, and the flags it found. If it finds no such run, tell the user which workflows have runs here, as it lists them, and stop.
2. Investigate what is out of the ordinary. Start from the flags, then look in the tables for anything else that stands out:
   - a run that ended blocked or as a draft, or was stopped;
   - an agent that returned nothing, never finished, or ran more than once;
   - a `pusher` that reported an operation unmet;
   - a check that passed but listed findings, or judges that mostly dismissed what they ruled on;
   - one agent or phase that takes most of the time or cost;
   - an agent that misread its brief, worked outside its role, or asked for something its brief didn't give.

   The run's records are under the Claude Code config directory, `$CLAUDE_CONFIG_DIR` or `~/.claude`, in `projects/<project root with every non-alphanumeric character replaced by ->/<session>/`. `subagents/workflows/<run id>/journal.jsonl` holds each dispatch and its result. `agent-<id>.jsonl` holds that agent's whole transcript, with its brief first, and `agent-<id>.meta.json` holds its type. Read the journal and the transcripts of the agents concerned, and use the `Explore` agent for a broad search across them.

3. For each finding, state what happened, quote the evidence with the agent's label (the journal line or the transcript passage), and give what it cost in time and money from the tables. Keep what the records show apart from your inference. Propose no fix: that is `workflow-improve`'s job.
4. Write `docs/workflows/<slug>.md`, with the slug from the report. It holds the script's report as printed, then a `## Out of the ordinary` section with one `###` heading per finding, ordered by cost. Write "Nothing stood out." when that is true.

Tell the user the report's path and the findings that cost the most, and that `/slopify:workflow-improve docs/workflows/<slug>.md` turns them into proposals.
