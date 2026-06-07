# Improvement Template

Use for enhancements to existing behavior, UX, performance, quality, reliability, operations, or internal workflows.

```markdown
## Goal

[What existing behavior should improve and why it matters.]

## Problem or Opportunity

[What is inefficient, confusing, slow, fragile, inconsistent, or otherwise worth improving.]

## Current State

[How the product, flow, system, or process works today.]

## Desired State

[What should be better after this work.]

## Evidence

- [User feedback, analytics, logs, screenshots, support reports, prior tasks, or code observations]
- [Exact examples, routes, prompts, payloads, workflows, or commands that show the current limitation]

## Impact

[Who or what benefits, how often this matters, and why now.]

## Scope

[What is included in this improvement.]

## Out of Scope

[Relevant boundaries and non-goals.]

## Constraints

- [Product, UX, technical, data, privacy, provider, performance, or compatibility constraints]
- [Existing behavior that must not regress]

## Risks

- [Likely regressions, rollout concerns, migration concerns, or rollback/disable path if relevant]

## Suspected Area

- [Relevant files, modules, routes, APIs, prompts, docs, or related issues]
- [Optional: implementation direction, clearly marked as a suggestion]

## References

- [docs/library/... or other docs/code/task/web references needed for planning]

## Verification

- [ ] [Observable before/after improvement]
- [ ] [Observable product/system outcome]
- [ ] Targeted test or reproducible check is added or updated when feasible
- [ ] Existing behavior covered by the constraints still works
- [ ] Relevant validation command is run: `[make validate-client/server/test/etc.]`

## Open Questions

- [Question that must be resolved before or during planning, if any]
```
