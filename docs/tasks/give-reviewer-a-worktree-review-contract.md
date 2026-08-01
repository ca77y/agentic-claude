---
type: story
title: Give the reviewer an explicit contract for reviewing an uncommitted worktree
---

# Give the reviewer an explicit contract for reviewing an uncommitted worktree

- [x] Give the reviewer an explicit contract for reviewing an uncommitted worktree #improvement 🔺 🆔 give-reviewer-a-worktree-review-contract #important
  - The pipeline commits only at PR time, so the `reviewer` is nearly always pointed at an uncommitted working-tree diff. Claude Code's built-in code-review skill is written end to end for a GitHub pull request. Roughly half its steps are unreachable against uncommitted work, so every reviewer silently improvises a substitute procedure — and the definition tells it to relay findings "as-is" from a skill that never produced them in the prescribed form.
  - Background: this has now been reported five separate times by five different reviewers, each rediscovering the same adaptation from scratch. The unreachable steps are consistent across every report: the opening pull-request eligibility check (closed / draft / already reviewed), the pass that reads previous pull requests touching these files and their review comments, the step 7 re-check of that eligibility, and the final step that posts the result via `gh pr comment` in a fixed format built from permalinks requiring a full commit SHA. No SHA exists for lines that live only in the working tree, so the mandated citation format cannot be produced at all.
  - Background — the confidence gate goes ad hoc: the skill filters findings by a 0–100 confidence score, keeping those at or above 80. When the surrounding procedure is improvised, that gate is applied by feel rather than by the specified rubric, so what actually reaches the `coder` varies per invocation. One report also observed a reviewer whose tool set contained no subagent-launch tool at all, making the prescribed fan-out unexecutable and the whole procedure inline — the passes are the contract, and the fan-out is only an optimization, but nothing says so.
  - The skill itself belongs to Claude Code and is not ours to change; the contract for using it against a local target is.
  - Scope: `plugins/ca77y-engineering/agents/reviewer.md`. Do not weaken the existing rule that findings are relayed without editorializing.
  - **Stale reference, noted 2026-08-01:** there is no `reviewer.md` in the plugin any more — the local review role is `qa`'s (`plugins/ca77y-engineering/agents/qa.md`), and the agent roster is analyst, auditor, clerk, coder, lead, librarian, qa, researcher, scribe, writer. The scope line above is left as written because it records where the work actually landed at the time; read "reviewer" as "the local-review role, now `qa`" if this card is used as a starting point for a future search.
  - Acceptance criteria:
  - The definition names the target modes the reviewer handles — uncommitted working tree, local commit range, pull request — and states which skill steps do not apply to each.
  - For a non-pull-request target the reviewer skips the eligibility and re-eligibility checks and the `gh` comment delivery, and returns findings to the caller instead.
  - For a non-pull-request target the citation format is specified as file path plus line range, replacing SHA permalinks.
  - Historical context for a non-pull-request target comes from the repository's own history over the touched paths, replacing the prior-pull-request pass.
  - The definition states that the skill's passes are the contract and its fan-out is an optimization, so a reviewer that cannot fan out runs the same passes sequentially and says so in its report.
  - The confidence threshold that decides what is reported is stated explicitly, so it does not vary per invocation.
  - The reviewer reports which target mode it used and which steps it skipped.
