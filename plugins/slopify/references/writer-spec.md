# Spec folder

Write the folder the brief names. Agents read it and no human reviews it, so write what an agent needs to act: no summaries, no headings for their own sake, nothing restated.

The issue holds the why and the what. Never change what it asks for. Decide every choice about how, and record it; never hand one back.

## `build.json`

What to build, in the shape the brief's schema gives.

- `shared`: the constraints and interfaces every task of this story must follow. Never repeat a project rule; those reach agents through the project's rules and `AGENTS.md`.
- `tasks`: split so tasks can run in parallel where their files don't overlap. Each says what to do, and marks what is reused apart from what is created, so nobody rebuilds what exists. Anything only one task needs goes in that task.
- `docs`: the documents making claims about the area the change touches, which the scouts found. It can be empty.

## `validate.json`

How to prove it, one entry per criterion:

- `wording`: copied word for word from the issue, because the issue can change later;
- `category`: a category from `TESTING.md`, or `uncategorized` when none fits;
- `path`: what the category's validation path runs for this criterion;
- `evidence`: what that path must produce;
- `firstTest`: the first test to write. When the category validates with a flow, the flow is the test.

## `RATIONALE.md`

Why, and it only ever grows: append, and never rewrite what is there. It holds the designs considered, each advisor's view and whether it was adopted, what was rejected and why, the rulings, and the risks. An agent reads it when something breaks in production, so name the reasoning a later reader couldn't get from the code.
