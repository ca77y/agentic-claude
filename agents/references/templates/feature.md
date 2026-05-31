# Feature Template

Use for new user-visible capability or product behavior.

```markdown
## Goal

[What new capability this should add and why it matters.]

## User Problem

[Who needs this, what they are trying to do, and what is missing today.]

## Background

[Design findings, product context, user need, and research outcomes needed by planner.]

## User Flow

[How the user should experience the feature at a high level.]

## Requirements

- [Behavior the system must support]
- [Important state, permission, data, API, prompt, or integration requirement]

## Scope

[What is included in this feature.]

## Out of Scope

[Relevant boundaries and non-goals.]

## Constraints

- [Product, UX, technical, data, privacy, provider, performance, or compatibility constraints]
- [Existing behavior that must not regress]

## Risks

- [Likely regressions, rollout concerns, migration concerns, or fallback/disable path if relevant]

## Suspected Area

- [Relevant files, modules, routes, APIs, prompts, docs, designs, or related issues]
- [Optional: implementation direction, clearly marked as a suggestion]

## References

- [docs/library/... or other docs/code/Linear/web references needed for planning]

## Verification

- [ ] [Observable user-facing outcome]
- [ ] [Observable product/system outcome]
- [ ] Targeted test or reproducible check is added or updated when feasible
- [ ] Existing behavior covered by the constraints still works
- [ ] Relevant validation command is run: `[make validate-client/server/test/etc.]`

## Open Questions

- [Question that must be resolved before or during planning, if any]
```
