---
name: workflow-improve
description: Turn a workflow-investigate report into proposed improvements, and file each one the user accepts as a card with a plan for the fix attached.
disable-model-invocation: true
---

The argument is a report that `workflow-investigate` wrote, `docs/workflows/<slug>.md`, or its slug. Without one, ask which report to use.

1. Read the report. For each finding under `## Out of the ordinary` and each flag, find its cause in what produced it before proposing anything:
   - the plugin, under `${CLAUDE_PLUGIN_ROOT}`: the workflow in `workflows/<workflow>.js`, the agents in `agents/`, and the references in `references/`;
   - the project's setup: `docs/BOARD.md`, `docs/FORGE.md`, `TESTING.md`, `.claude/rules/`, and the root instructions.
     A finding about what the run produced, such as a document that grew with every revision, has its cause in the brief or loop that kept producing it, not in its cost: find which instruction asks for more, and which check never pushes back.

2. Propose one improvement per cause, ordered by what it would save. Each one gives:
   - a short title;
   - the findings it addresses, quoting the report's evidence;
   - the cause, at `file:line`;
   - the change, and whether it lands in the plugin or the project's setup;
   - the expected effect in time, tokens, or cost, from the report's numbers;
   - what could go wrong.

   Propose nothing the report has no evidence for.

3. Ask the user which proposals to accept, with `AskUserQuestion` and `multiSelect`, up to four per question.
4. For each accepted proposal, with `n` its number:
   - Write the card draft at `.tmp/workflow-improve/<slug>-<n>.md`, from the template in `${CLAUDE_PLUGIN_ROOT}/references/card-templates.md`. Make it a bug when the workflow did something wrong, and a story when it works but costs too much. The card states the problem and the outcome, with the report's numbers, and names no implementation. Its References name the report, and say when the change is to the plugin.
   - Write the plan for the fix at `.tmp/workflow-improve/<slug>-<n>.plan.md`: each file and what changes in it, the tests that prove the change, and how to measure the improvement by running the workflow again and investigating the new run.
   - Dispatch `slopify:pusher` with a brief that carries the user's acceptance as the authorization to file this one card and comment on it. The brief asks it to file the card from the draft as `docs/BOARD.md` declares, comment the plan's text on the card, and report the card's identifier.
5. Append a `## Improvements` section to the report. List every proposal, with its card identifier if it was accepted, or as declined.

Tell the user each card filed, with its title and identifier.
