# Board declaration

Fill [the board template](../resources/BOARD.md) with established facts and the user's answers, one line per fact, stating the rule and the binding rather than a tool transcript. Verify every binding against the tracker, mark unsupported operations explicitly, and never publish a guessed binding. If the policy already exists elsewhere in the project, point to it.

The create binding also says how a blocking relation and a related relation to named cards are added when the card is created, verified against the tracker, such as Linear's `blockedBy` and `relatedTo` on `save_issue`. When the tracker records no relations between cards, the Create line marks relations unsupported.

The duplicate binding says how a card is marked a duplicate of an existing one. Ask the user for it, offering the tracker's own mechanism when it has one, such as Linear's duplicate relation (`save_issue` with `duplicateOf`, which moves the card to Linear's reserved `Duplicate` status), and otherwise a label or status the user names. A label it needs is created like the labels below. When the user-owned decisions include that status or label, they say that asking for a card to be shaped lets the shaping process mark that card a duplicate.

The Cards section maps every part of each template in `${CLAUDE_PLUGIN_ROOT}/references/card-templates.md` (story, bug, and spike) to where the issue store holds it: a heading, a field, or a label. Check every part of every template against the mapping; a part with no place is a gap to fix with the user.

The Delivery section says which card operations happen at each point of a delivery, whatever status the card is in. Write conditions per operation and name no agent, skill, slash command, or model, so the declaration works for any orchestrator.

The `Deliverable`, `Shaped`, and `Unreproducible` labels must exist on the tracker, where the workflows read and set them. Create each one that doesn't, in the team or project the board declares, and add nothing else. When the tracker can't create a label, report that the user needs to create it.
