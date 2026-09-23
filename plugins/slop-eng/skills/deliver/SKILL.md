---
name: deliver
description: Deliver a change through a verified pull request, or repair an existing PR from its review findings. Use only when the user explicitly invokes this skill; never invoke it automatically. Accepts an optional `--fast` flag.
disable-model-invocation: true
argument-hint: "[--fast] <task, card, or PR with findings>"
---

Explicit invocation of this skill requests delivery through a pull request. It authorizes the task branch/worktree, attributable commits, push after the required gates pass, and creation or update of the same task PR; do not require a separate publication request. Follow the project’s board and forge bindings. Resolve routine design details without requiring a separate `shape` invocation.

Without an explicit deliver invocation, a generic implementation request may remain a local change in the project’s default checkout, including master; it does not imply commits or publication. Deliver invocation does not authorize unrelated messages, releases, or merging. The one review message it does authorize is the declared review trigger on this task's own PR — see [the review loop](#the-review-loop).

## Ledger ownership

On every invocation, open or create the run's durable ledger using the ledger procedure at `${CLAUDE_SKILL_DIR}/references/ledger.md` and the template at `${CLAUDE_SKILL_DIR}/assets/ledger.md` before production or delegation. The main agent is its sole writer, including for trivial work and runs without subagents. Record returned agent IDs, assignments and progress; update before dispatch and waits, immediately after dispatch, on results and gate/failure changes, and before handoff or the final response. Reuse the ledger on resume and across entry points within the same run, preserving each stable task/problem's history. A separate later user request gets a new run ledger; prior run history remains context, not its attempt count. Link the ledger in the final response.

## Context and authority

Strip a `--fast` flag from the invocation before reasoning about the task; it is an instruction about models, never part of the work. Read the request and acceptance source, relevant code/docs, current checkout and working changes, and any existing PR or prior verification. Reuse a suitable current environment and preserve unrelated work. Read `docs/BOARD.md` and `docs/FORGE.md` when their operations apply. Missing configuration blocks the corresponding operation, not already-authorized investigation or local preparation. Use the actual request and the declaration’s operation-based conditions to determine authorization. Require applicable bindings before the corresponding board/forge writes; do not rewrite declarations to grant yourself authority.

Address the story worktree by absolute path in every command and every dispatch brief — git calls carry `-C <path>` and file tools take absolute paths — because the shell's working directory can reset to the repository root. Where the harness refuses writes until the session is isolated, enter the already-created worktree with `EnterWorktree` by `path`, never by `name`, which would create a second worktree on a new branch.

For a documentation-accuracy finding, prepare the correction brief using `${CLAUDE_SKILL_DIR}/references/claim-corrections.md` before production, including direct work. Supply the whole candidate inventory and source evidence, then hand the final correction records to a fresh document auditor.

For repair of an existing PR, read `${CLAUDE_SKILL_DIR}/references/pr-repair.md`; reuse that PR and branch when authorized. For interrupted work or failed attempts needing persisted recovery, read `${CLAUDE_SKILL_DIR}/references/recovery.md` before another solution attempt. Read `${CLAUDE_SKILL_DIR}/references/escalation.md` only for unavailable or unknown production models, early promotion, parallel reservations, reopening or resuming a task, or terminal handling. Load only references relevant to the requested work.

## Required gate order

Every nontrivial change follows **specification + validation → implementation + validation**. Nontrivial means introducing or meaningfully altering behavior, contracts, data, architecture, configuration semantics, or operational procedures, or needing material design decisions. File count and edit size do not decide it: a one-line authorization change still needs the gate. Typographical, formatting, and equally bounded changes with established intent and no material semantic impact are trivial; they can skip a written spec but still require fresh validation. When uncertain, use the specification gate.

Before nontrivial implementation, read `${CLAUDE_SKILL_DIR}/references/specification.md`. Create or update a durable written spec in the project's location, normally `docs/specs/`, identifying the problem, scope, intended behavior/approach, constraints, observable acceptance criteria, and verification. Require an overall integer complexity score from 1 to 10 with rationale and the same for every task; score integration and uncertainty overall, then each task independently. Reuse a suitable existing spec only after fresh validation against the current request and repository context. A fresh validator must assess feasibility, consistency, product fit, and verifiable acceptance; high-risk or materially uncertain designs require independent challenge in that validation. Record the validated spec revision and gate evidence. Resolve blocking ambiguity and obtain a fresh passing verdict before implementation; human approval is not automatically required when implementation is already authorized.

Investigation, baseline reproduction, and bounded exploratory experiments may establish specification evidence before that gate. They must not become production implementation or bypass the gate under another label.

Implement the validated spec, then use another fresh validator on the final candidate, including affected documentation. Validation covers independent correctness and acceptance review, appropriate required checks, and the relevant criteria. Record candidate and spec identities, results, and unresolved findings. Resolve blocking findings and obtain fresh validation for a correction. Do not claim full completion or publish a completed change with a failed gate or missing required evidence.

If implementation exposes a material spec flaw or requires a material spec change, revise and revalidate the spec before implementing the affected change. Do not weaken criteria to make the candidate pass. Spec or candidate edits invalidate affected evidence and require refreshed validation. A spec task and each implementation task retain separate histories; a passing gate does not reset or demote the task it evaluated.

## Completion

Complete delivery by opening the task PR or updating its existing PR after the required gates pass. A local change or local commit alone does not complete an invoked deliver run. The final candidate satisfies relevant acceptance criteria, required checks pass, affected documentation is current, and blocking findings are resolved. Report the artifact, supporting verification, and material limitations. If a gate or endpoint cannot be reached, preserve useful work and state the unmet condition instead of reporting completion.

Optionally assign disjoint implementation/test production to `slop-eng:coder` and bounded spec/doc production to `slop-eng:writer`. Production agents author tests but leave execution and completion checks to fresh validators.

## The review loop

The PR review runs on the PR, by the reviewer `docs/FORGE.md` declares; it is not a local gate and never replaces fresh validation. After opening the PR, fire the review through the declaration's review-trigger binding unless the declaration says opening fires it automatically. Report the PR as open and not yet reviewed, with the trigger's result — or that the declaration binds no review and the PR waits on a human — and finish. Never wait on, poll, or monitor the review.

Review findings return as a new user request that invokes this skill again with the findings or the PR; that is a repair run under `${CLAUDE_SKILL_DIR}/references/pr-repair.md` with its own ledger and budget. After a repair run's verified fix push, re-fire the review through the same binding when one is bound; where none is bound, say the review must be fired by hand.

## Ownership and evidence

The main agent owns interpretation, decisions, production, integration, evidence, and the final response. Work directly or delegate bounded production when parallelism or context isolation helps. Use the configured production roles named here when helpful; delegation is optional. Work directly within scope if an optional production role is unavailable. Give each worker the bounded outcome, acceptance source, absolute project and allowed paths, concurrent owners, and stable task/problem identity with remaining attempt allocation. Give writers exclusive paths, identify concurrent owners, and require preservation of others' work. Continue a production worker holding useful context with `SendMessage` to its agent ID; its report arrives as a completion notification, so save the ledger and end the turn rather than polling. Never start another user session or scheduled task unless requested.

Infer the outcome from the request and conversation. Discussion alone does not authorize implementation. Compose explicitly requested outcomes in the same task, meeting each contract; completion of one does not authorize the next. Record scope changes and decisions; preserve each task/problem's history for continuations of the same run, and keep a separate later request’s attempt count independent. Ask a focused question only when a missing decision prevents sound progress; continue independent authorized work.

Tie completion evidence to its acceptance source, exact artifact or candidate revision, observation/check, and result. A content digest or an identified unchanged snapshot can identify uncommitted work. Keep this evidence in the mandatory ledger, linking larger artifacts instead of duplicating them. Later edits invalidate affected evidence. Missing, failed, and unrunnable checks remain visible and are never passes.

## Fresh validation

Delegate **every audit and validation** to a fresh `Agent` dispatch — never a `SendMessage` continuation or a fork — of `slop-eng:auditor` for spec readiness or document acceptance, or `slop-eng:qa` for executable behavior, code review, tests, and implementation acceptance. Select by evidence needed, not command name. QA may cover affected docs/mechanical checks adequately in the same candidate evaluation. Split mixed review only for materially different expertise or unresolved concerns; do not impose QA then auditor as two mandatory final gates. This includes specification gates, correctness and acceptance review, tests, mechanical validators, documentation, citation, link and formatting checks, optional checks, and revalidation. There is no small-edit or documentation exception. Ordinary reading and diagnosis for production may be done directly; evidence used to establish completion belongs to a validator. Do not self-certify or rename checks to avoid delegation.

Fresh means no prior participation in authoring, implementation, or validation of the work examined. Never reuse an implementer, a spec validator for implementation acceptance, or an earlier validator after corrections; dispatch a new agent, never `SendMessage`, for every new verdict. Supply the user requirements and authority, absolute project path and relevant rules, exact candidate and spec identity where applicable, raw evidence, applicable checks, and bounded validation scope. Previous findings identify rechecks, not the answer. The validator reports without editing the candidate. Integrate findings and corrections without overriding a failed gate. If the configured validator is unavailable, preserve prepared work and report the unmet condition; do not substitute a generic agent or validate in the main agent. This plugin ships both validator roles.

## Complexity and model selection

Score every bounded assignment from **1 to 10**, including direct work and validation, and record its rationale in the brief and ledger. Score the whole execution spec and every task within it; overall complexity reflects integration, uncertainty and consequences rather than an average. Do not inherit the whole spec's score or model for a simple child task. Trivial work still gets a ledger score even when no written spec is required.

Use **sonnet as the calibration anchor** for substantial but understood work. Start with the score-derived tier below, preferring the smaller capable model when work lies between tiers. These are operating defaults, not a universal benchmark ranking.

| Task complexity | Typical scope | Model |
| --- | --- | --- |
| 1–4 | Clear, bounded work with limited coupling | `haiku` |
| 5–8 | Several interacting parts, substantial design, or consequential uncertainty | `sonnet` |
| 9–10 | Exceptional ambiguity, system-wide coupling or consequences | `opus` |

The model progression is **haiku → sonnet → opus**. Pass the selected model as `model:` on every `Agent` dispatch; agent definitions carry no fixed model. Effort is not a dispatch parameter: every agent runs at the session's effort, so never record or report an effort change as part of routing. Route only these three model aliases; conditional model resolution is in `${CLAUDE_SKILL_DIR}/references/escalation.md`.

The main agent may choose a stronger start when ambiguity, coupling, context needs, error consequences or observed failure justify it. Record the evidence and selection/deviation rationale, rather than promoting by role identity or habit. Never shrink validation scope to fit a model.

The main session remains on its selected model. Delegate model-routed solution work to the configured production role when another model is needed; do not claim the session switched itself. Record intended and actual model for direct work too, including why direct work deviates from the matrix. A validator's model is recorded separately and does not promote the solution tier.

### The `--fast` flag

`--fast` belongs to the user, arrives on the invocation, and changes exactly one thing: every dispatch's model steps **one tier down** from what the matrix or an escalation selected — `opus → sonnet`, `sonnet → haiku`, `haiku` the floor — validators included. It lowers the starting tier and the tier each escalation lands on; escalation still climbs, and a run whose stepped-down tier is already `haiku` escalates to `sonnet` then `opus` as usual. It changes no score, gate, allowance, or effort. Never turn it on or off yourself, and pass it into no worker brief. Record in the ledger that it is in play and the model actually passed per dispatch; state it in the final response.

## Tier escalation and stop gate

Before solution dispatch, declare a stable task/problem ID and its acceptance outcome. Each task owns its own production tier and retry history. Spec production/readiness is a task distinct from every implementation child, so a spec author model never establishes a child tier. Read-only validation or revalidation of a reused artifact is evidence-only.

For each task/problem, allow **three evaluated attempts at the starting solution tier, then one corrective attempt at each higher tier through opus**. The first evaluated solution establishes its starting tier from the actual production model. Preparatory/evidence-only work and a validator model do not establish or consume a solution tier. Once established, that task/problem's solution tier cannot decrease after a passing intermediate gate.

| Starting tier | Initial allowance | Higher-tier corrective allowance | Maximum failed attempts |
| --- | --- | --- | --- |
| haiku | 3 | sonnet: 1; opus: 1 | 5 |
| sonnet | 3 | opus: 1 | 4 |
| opus | 3 | None | 3 |

After three initial failures, dispatch one evidence-informed corrective approach at each higher listed tier. An opus start stops after its third failure; an escalated opus failure stops the run and returns control to the user. An attempt is one approach evaluated for acceptance, even when it proves unworkable before a candidate. Preparatory work, comment review, baseline defect discovery and pre-work dispatch failures consume none. A model switch alone adds no attempt, and a failed acceptance verdict belongs to its evaluated solution.

Keep each task/problem's history through gates, workers, entry points and resumptions. Never rename, split, reparent or re-open work to reset it. Record the task's complexity, actual model, tiers, failures and remaining allocation in the ledger. The conditional reference governs exceptions and terminal recovery. These are workflow instructions, not a hard runtime counter.
