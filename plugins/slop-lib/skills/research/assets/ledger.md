# Ledger: <outcome>

## Identity and authority

- Run ID:
- Initiating user request and resolution/endpoint:
- Related prior run ledgers (context only; no inherited attempt count):
- Absolute ledger path:
- Project identity / project root:
- Current checkout:
- Owner/task handle (record unavailable identifiers explicitly):
- Ownership: active / released / transferred / closed
- Prior owner, release evidence, destination and next owner:
- Outcome/problem identity:
- Acceptance source:
- User authority and authorized endpoint:
- Entry points used:
- Spec path and exact revision (or not applicable):
- Candidate/artifact paths and exact revision or snapshot:
- Last updated:

## Current progress

- Phase/status:
- Completed work:
- In progress:
- Pending work:
- Blockers and unresolved findings:
- Next action / owner:
- Endpoint reached or unmet condition:

## Subagents

Use `none` when no workers exist. Copy one record per dispatch, including validators; retain replaced and failed workers.

### <assignment>

- Returned agent ID: <actual ID, or unavailable if not exposed>
- Canonical task name / coordination handle:
- Configured role:
- Assignment and allowed paths:
- Model / selection rationale:
- Problem identity / reserved attempt slot (or evidence-only):
- Status: planned / running / waiting / completed / failed / stopped / unavailable
- Last progress and returned artifacts/results:
- Next action / last updated:

## Gates and evidence

| Acceptance criterion / gate | Spec and candidate identity | Validator handle | Observation/check and evidence path | Result / unresolved findings |
| --- | --- | --- | --- | --- |
| <criterion or gate> | <exact revision/snapshot> | <handle or not applicable> | <observation or command/result link> | <pass / fail / unverified / stale> |

## Attempts and reservations

- Problem identity:
- Current-run aggregate failed attempts / limit: 0 / 3
- Reserved solution slots and owners: none
- Remaining unreserved allowance: 3
- Explicit additional-attempt authorization: none

| Attempt | Approach / worker / model | Candidate/spec identity | Failure evidence and reason | Remaining allowance |
| --- | --- | --- | --- | --- |
| None yet | | | | |

Preserve each evaluated solution failure across gates, workers, turns and entry points within this run. Comment review and defect discovery alone do not consume attempts. A separate later user request uses a new ledger and count; preserve this history as context. Repeat this section for genuinely independent problems; three failures on any one stops the run.

## Decisions and handoff

- Material decisions / scope changes:
- Invalidated evidence:
- Runtime reconciliation: <live/stale workers, recovered results, uncertain history>
- Useful artifacts and durable evidence paths:
- Ownership transfer / ledger destination:
- Recovery action or required user decision:
