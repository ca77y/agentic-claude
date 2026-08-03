# Docs Templates

Copy the scaffold, replace every placeholder, and remove unused sections. Do not turn the template itself into a real artifact.

## Rules

- Copy `spec.md` into `docs/specs/<identifier-slug>.md`, named after the board issue it builds (e.g. `smr-166-convert-the-lead.md`).
- There is no story scaffold here: stories are Linear issues, whose shape is declared in [`../ISSUE_TRACKING.md`](../ISSUE_TRACKING.md).
- Keep the spec order `Goal -> Design -> Requirements -> Tasks`; pipeline agents parse that contract.
- Keep templates generic and readable as plain Markdown.
