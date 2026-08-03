# Docs Templates

Copy the scaffold, replace every placeholder, and remove unused sections. Do not turn the template itself into a real artifact.

## Rules

- Copy `spec.md` into `docs/specs/<identifier-slug>.md`, named after the board issue it builds (e.g. `smr-166-convert-the-lead.md`).
- Copy `story.md` into a Linear issue's **description**. It scaffolds the body only — title, type label, priority, and blocking relations are Linear fields, declared in [`../ISSUE_TRACKING.md`](../ISSUE_TRACKING.md). That file stays the authority on the fields; this one shapes the prose, and points there rather than restating it.
- Keep the spec order `Goal -> Design -> Requirements -> Tasks`; pipeline agents parse that contract.
- Keep templates generic and readable as plain Markdown.
