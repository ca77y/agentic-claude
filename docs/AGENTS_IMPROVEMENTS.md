# Agents improvements

Append-only notes on friction in the pipeline itself — the flow, an agent's instructions, or a
skill. One `###` entry per concrete proposal.

Entries are triaged periodically: a solvable finding becomes an issue on the board (see [`ISSUE_TRACKING.md`](./ISSUE_TRACKING.md))
and a finding already resolved or foreclosed by shipped work is removed. The log is empty when
every recorded finding has been converted or retired.

### The dispatch contract has semantic mirrors with no drift guard

**Area**: flow

**Observed**: The root `CLAUDE.md` guards two paragraphs that are duplicated *byte-identically*
across files, with a `grep | sort -u | wc -l` check for each. It guards nothing for the contract
that is duplicated *semantically*: how the `lead` dispatches, resumes, and collects from a worker
is asserted in `skills/lead/SKILL.md`, restated for users in `README.md`, and restated again from
the worker's side in each `agents/*.md` ("the lead dispatches it once and **resumes** it with qa
and acceptance-gate findings"). On SMR-167 the `lead` skill stopped guaranteeing the resume, and
because the spec's Boundary correctly walled the worker definitions off, `coder.md` was left
telling a freshly dispatched coder that it had been resumed with prior context. No check in the
repo can catch that: the wordings differ by design, so no byte-comparison applies.

**Suggested change**: When a spec changes one side of a semantic mirror, require its Boundary
section to enumerate the other sides and state, per side, whether it is being changed now or
carried as a named follow-up — rather than only listing files the build must not touch. The
enumeration is the deliverable; the drift is invisible without it, and "out of scope" currently
reads the same whether the other side was checked or never looked at.
