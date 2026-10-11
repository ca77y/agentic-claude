---
name: deliver
description: Deliver a change through a verified pull request, or repair an existing PR from its review findings.
disable-model-invocation: true
argument-hint: "<task, card, or PR with findings>"
---

Invoking this skill asks for delivery through a pull request. It authorizes the story branch and worktree, commits, a push once the gates pass, opening or updating this task's PR, and the declared review trigger on that PR, fired again after each round's verified push. It does not authorize merging, releases, or any other message. Every board and forge operation follows `docs/BOARD.md` and `docs/FORGE.md`; never rewrite a declaration to grant yourself authority.

## Workspace and ledger

Create or reuse the story worktree that `docs/FORGE.md` declares; for a PR repair, use the worktree of that PR's branch. Address it by absolute path in every command (`git -C <path>`, absolute file paths), because the shell's working directory can reset. If the harness requires isolation before writes, enter that worktree with `EnterWorktree` by `path`; the `name` form creates a second worktree.

The ledger is always `.tmp/ledger.md` at the worktree root. Before the first write, read `${CLAUDE_SKILL_DIR}/references/ledger.md`. Link the ledger in the final response.

## Gates

A change is hard when it alters behavior, contracts, data, architecture, configuration semantics, or procedures, or needs a design decision; a bug fix alters behavior. Size doesn't decide; when unsure, treat it as hard. Typos, formatting, and similarly settled edits are easy.

The `slop-eng:deliver-gates` workflow runs the gates: it dispatches the writer, coder, and fresh validators, and keeps the spec and implementation budgets of three failures each. You never edit the work or judge it yourself.

Read enough of the repository, or dispatch `Explore`, to fill the workflow's `args`, an object:

- `mode`: `hard` or `easy`; `producer`: for easy work, `coder` or, for a documentation-only change, `writer`.
- `request`: the user's request; `acceptance`: the acceptance source verbatim, which is the card for card-backed work.
- `worktree`: its absolute path; `base`: the commit the story branch started from.
- `spec`: for hard work, the absolute spec path in the project's spec location, named as `docs/BOARD.md` declares.
- `context`: the repository and product evidence, existing specs to reuse, project rules, and the checks the project requires.
- `pluginRoot`: `${CLAUDE_PLUGIN_ROOT}`; `skillDir`: `${CLAUDE_SKILL_DIR}`.
- `failures`: the run's counts so far, when continuing it; `decision`: the user's answer, when rerunning after `blocked`.

The workflow returns a `status`:

- `passed`: commit the spec and the change as `docs/FORGE.md` declares, then open the PR.
- `blocked`: its `blocker` names the missing decision or prerequisite. Ask the user, or report it, then run the workflow again with `decision` and the returned `failures`.
- `budget_exhausted`: return its `attempts`, why each failed, and the decision or extra attempts you need. Further attempts need the user's explicit authorization.

Report every acceptance-criterion correction the spec records.

## The card

When the work is card-backed, handle the card as `docs/BOARD.md` declares for delivery: its status transitions, attaching the PR, and any other operation it binds, each at the point and under the conditions the declaration states.

## Review loop

After the PR opens, fire the review through the declaration's review-trigger binding, unless the declaration says opening fires it. Then wait for it with `Monitor`, using the declaration's review-status binding: one monitor until the review has started, then a new one until it has finished. Re-arm a monitor that expires, and end your turn while it runs. A review that fails, or doesn't start or finish within the declaration's time limits, ends the loop: report it. Without a PR or a declared review there is no loop; with a declared trigger but no status binding, report the review as fired and not awaited.

A finished review starts a round. Read `${CLAUDE_SKILL_DIR}/references/review-round.md` and sort the findings. If no defect remains, the loop ends. Otherwise run `slop-eng:deliver-repair` with the same `args`, the defects as `findings`, and the run's `failures`; act on its `status` as above, and on `passed` commit, push, update the PR, and fire and wait for the review again. Allow three rounds: after the third round's fix, wait for its review, sort its findings for the report, and stop.

A PR repair the user invokes enters this loop at its first round, with the findings it was given, as a new run with zero failures.

## Completion

Delivery is complete when the review loop ends. Report the PR, the verification behind it, each review round's findings and what was fixed, every non-issue with its reason, anything left unfixed, and material limits. If a gate or forge operation can't complete, keep the work and state the unmet condition instead of reporting success.
