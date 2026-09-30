---
name: deliver
description: Deliver a change through a verified pull request, or repair an existing PR from its review findings.
disable-model-invocation: true
argument-hint: "<task, card, or PR with findings>"
---

Invoking this skill asks for delivery through a pull request. It authorizes the story branch and worktree, commits, a push once the gates pass, opening or updating this task's PR, and the declared review trigger on that PR, fired again after each round's verified push. It does not authorize merging, releases, or any other message. Every board and forge operation follows `docs/BOARD.md` and `docs/FORGE.md`; never rewrite a declaration to grant yourself authority.

## Workspace and ledger

Create or reuse the story worktree that `docs/FORGE.md` declares; for a PR repair, use the worktree of that PR's branch. Address it by absolute path in every command and brief (`git -C <path>`, absolute file paths), because the shell's working directory can reset. If the harness requires isolation before writes, enter that worktree with `EnterWorktree` by `path`; the `name` form creates a second worktree.

The ledger is always `.tmp/ledger.md` at the worktree root. It is yours alone: workers never see it, so every brief carries everything the worker needs. Before the first write, read `${CLAUDE_SKILL_DIR}/references/ledger.md`. Link the ledger in the final response.

## Gates

A change is nontrivial when it alters behavior, contracts, data, architecture, configuration semantics, or procedures, or needs a design decision. Size doesn't decide; when unsure, treat it as nontrivial. Typos, formatting, and similarly settled edits are trivial.

Nontrivial work runs in this order:

1. `slop-eng:writer` writes or updates the spec; brief it as `${CLAUDE_SKILL_DIR}/references/specification.md` describes. Read enough of the repository, or dispatch `Explore`, to brief it.
2. A fresh `slop-eng:auditor` passes that exact spec revision. The writer fixes the findings, and a new auditor revalidates, until it passes.
3. `slop-eng:coder` implements against the spec, and `slop-eng:writer` updates affected documentation.
4. A fresh `slop-eng:qa` validates the final candidate, including affected documentation. The producers fix the findings, and a new QA revalidates, until it passes.

If implementation shows the spec is wrong, the writer revises it and the work returns to step 2 for the affected part. Never weaken a criterion to make a candidate pass. Trivial work skips the spec but still goes to a producer and a fresh validator.

When a finding says a document states something false, read `${CLAUDE_PLUGIN_ROOT}/references/claim-correction.md`, brief the producer with its inputs, and give the auditor every record.

## Fresh validation

A verdict counts only when it comes from a validator that has not seen the work being produced; an agent that wrote, repaired, or already judged the candidate carries the assumptions the verdict is meant to test. So every verdict is a new `Agent` dispatch — `slop-eng:qa` for executable behavior and tests, `slop-eng:auditor` for specs, documents, and declarations — never a `SendMessage` continuation or a fork.

Brief the validator as you would a colleague reviewing cold: the user's requirements, the project path and rules, the exact candidate and spec revisions, and earlier validator findings as places to recheck. Never pass on the producer's report, results, or suggested checks: the validator decides what to check from the spec, so the producer's view can't steer the verdict. One QA pass may cover the documentation it can judge; add an auditor only for expertise QA lacks. A verdict covers only the revision it judged; a later edit makes it stale. Never substitute another agent for a validator, or judge the work yourself.

## Orchestration

You orchestrate and never edit the work yourself: `slop-eng:writer` produces specs and documentation, `slop-eng:coder` produces code and tests. You own decisions, briefs, commits, board and forge operations, and the final response. Give each worker the outcome, the acceptance source, the absolute paths it may write, the other active writers, and its task ID. Continue a worker that holds useful context with `SendMessage`; its report arrives as a notification, so end your turn instead of polling. Ask the user only when a missing decision blocks sound progress.

## Attempts

The run has two budgets of three failures each: one for the spec and one for the implementation. A failure is a failed verdict, or an approach abandoned as unworkable before reaching one; reading findings, reproducing a baseline, and unverified verdicts are not failures. The budgets exist so that stuck work reaches the user instead of burning tokens on variations of one idea. If a spec defect surfaces during implementation, reopen the spec with its count and pause the implementation. A failed QA inside a review round counts toward the implementation budget; the rounds themselves have their own limit.

When either budget reaches three, stop all workers with `TaskStop` and return what was tried, why each attempt failed, and the decision or extra attempts you need. Further attempts need the user's explicit authorization.

## The card

When the work is card-backed, handle the card as `docs/BOARD.md` declares for delivery: its status transitions, attaching the PR, and any other operation it binds, each at the point and under the conditions the declaration states.

## Review loop

After the PR opens, fire the review through the declaration's review-trigger binding, unless the declaration says opening fires it. Then wait for it with `Monitor`, using the declaration's review-status binding: one monitor until the review has started, then a new one until it has finished. Re-arm a monitor that expires, and end your turn while it runs. A review that fails, or doesn't start or finish within the declaration's time limits, ends the loop: report it. Without a PR or a declared review there is no loop; with a declared trigger but no status binding, report the review as fired and not awaited.

A finished review starts a round. Read `${CLAUDE_SKILL_DIR}/references/review-round.md` and sort the findings into defects and non-issues, giving each non-issue its reason. If no defect remains, the loop ends. Otherwise the producers fix the defects, a fresh QA passes the candidate, you push and update the PR, and you fire and wait for the review again. Allow three rounds: after the third round's fix, wait for its review, sort its findings for the report, and stop.

A PR repair the user invokes enters this loop at its first round, with the findings it was given.

## Completion

Delivery is complete when the review loop ends. Report the PR, the verification behind it, each review round's findings and what was fixed, every non-issue with its reason, anything left unfixed, and material limits. If a gate or forge operation can't complete, keep the work and state the unmet condition instead of reporting success.
