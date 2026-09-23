# Specification and acceptance

Read before a nontrivial change. The core skill requires the spec gate before implementation and a separate fresh validator for final acceptance.

## Proportionate specification

Use the project's durable spec location, normally `docs/specs/`. Reuse an existing spec when it covers the current request; retain its acceptance source and validate current fit. Include the problem/outcome, scope and exclusions, intended behavior or approach, relevant constraints and dependencies, observable acceptance criteria, and how each can be verified. Require an overall integer complexity score from 1 to 10 with a short rationale, and the same for every task. Identify at least one task in a one-task spec. Overall complexity accounts for integration, uncertainty and consequences; tasks are scored independently using the delivery matrix. Add missing scores to reused specs before the next delivery gate. A reused spec and its revalidation are evidence inputs: its historical author does not set a tier for a new task. A short document can be sufficient; no fixed story template, board card or separate shaping run is required. Trivial work without a spec still has a scored ledger assignment.

Keep user requirements distinguishable from implementation decisions. For card-backed work, use the bound source as the acceptance source, preserve the relevant wording, and disclose inaccessible evidence. Identify assumptions and current evidence. Do not require unrelated board or forge operations to validate a local change.

Give a fresh validator the spec identity and repository/product evidence. Independent design challenge is required for high-risk or materially uncertain approaches. Resolve blocking ambiguity, revise the spec, and dispatch a new validator for the revision. A passed gate is recorded evidence for that spec, not an automatic request for human approval or permission to publish.

## Candidate acceptance

Give another fresh validator the validated spec, candidate identity including uncommitted content, changed paths, relevant baseline/raw evidence, and required checks. Ask for correctness and acceptance together, with proportionate regression coverage and affected documentation. Checks should exercise meaningful behavior or artifact properties; mechanical skill validation alone does not prove a workflow's behavior.

Retain pass/fail/unverified observations and blocking findings. Missing dependencies or an unavailable defined check remain unverified. Group relevant small checks in one fresh validation assignment. Arrange product or test corrections as production work outside the validator, then obtain a newly dispatched validator's verdict on the changed candidate.

If a correction changes the contract materially, revise and validate the spec first. Never weaken a criterion to erase a defect. A spec pass and an implementation pass apply only to their identified artifacts; later changes invalidate affected evidence. Preserve specifications and evidence needed for recovery rather than relying on a disposable worktree snapshot.
