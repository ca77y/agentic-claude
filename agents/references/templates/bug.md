# Bug Template

Use for incorrect, broken, or regressed behavior.

```markdown
## Problem

[What is broken or incorrect.]

## Expected Behavior

[What should happen instead.]

## Actual Behavior

[What happens instead. Include exact error text when available.]

## Reproduction

Preconditions:
- [Required state, role, data, flags, browser, route, or environment]

Steps:
1. [Atomic action]
2. [Atomic action]
3. [Observed failure point]

Minimal Input:
- [Smallest payload, prompt, route, fixture, account state, or UI interaction that reproduces it]

## Environment

- Surface: [client/server/LLM flow/background job/etc.]
- Version/commit/env: [if known]
- Browser/OS/provider/model: [if relevant]

## Evidence

- [Logs, Sentry, screenshots, console output, failing test, Linear/customer report]
- [Exact commands or prompts already used to validate/reproduce]

## Suspected Area

- [Relevant files, modules, routes, APIs, prompts, docs, or related issues]
- [Optional: likely cause, clearly marked as hypothesis]

## Impact

[Who or what is affected and how severe it is.]

## Scope

[What should be fixed.]

## Out of Scope

[Related issues or improvements that should not be included.]

## References

- [docs/code/Linear/Sentry/log/web references needed for planning]

## Verification

- [ ] A regression test or reproducible check fails before the fix when feasible
- [ ] The broken behavior no longer occurs
- [ ] The expected behavior is observable
- [ ] Relevant validation command is run: `[make validate-client/server/test/etc.]`

## Open Questions

- [Question that must be resolved before or during planning, if any]
```
