# Board declaration

Fill [the board template](../resources/BOARD.md) with established facts and the user's answers, one line per fact, stating the rule and the binding rather than a tool transcript. Verify every binding against the tracker, mark unsupported operations explicitly, and never publish a guessed binding. If the policy already exists elsewhere in the project, point to it.

The Cards section maps every part of each template in `${CLAUDE_PLUGIN_ROOT}/references/card-templates.md` (story, bug, and spike) to where the issue store holds it: a heading, a field, or a label. Check every part of every template against the mapping; a part with no place is a gap to fix with the user.

The Delivery section says which card operations happen at each point of a delivery, whatever status the card is in. Write conditions per operation and name no agent, skill, slash command, or model, so the declaration works for any orchestrator.

The `Deliverable` and `Unreproducible` labels must exist on the tracker. If either doesn't, report that the user needs to create it.

"No board" is a complete choice: state that there are no card operations and where acceptance material lives.
