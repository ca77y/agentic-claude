---
type: story
title: Distinguish a worktree that needs no dependencies from one whose provisioning failed
---

# Distinguish a worktree that needs no dependencies from one whose provisioning failed

- [ ] Distinguish a worktree that needs no dependencies from one whose provisioning failed #improvement 🔽 🆔 distinguish-no-dependencies-from-failed-provisioning
  - The provisioning-status handover introduced by [`install-dependencies-in-story-worktrees`](install-dependencies-in-story-worktrees.md) collapses two states with opposite meanings into one negative status. A project with no install step at all is benign — nothing was needed, nothing is missing. A project that needs dependencies and whose install failed is a real gap that poisons any command depending on them. The receiver rule keys off "absent or negative", so an agent handed a negative status cannot tell which of the two it has.
  - Background: raised by the PR reviewer on [#8](https://github.com/ca77y/agentic-claude/pull/8) as an explicitly non-blocking observation — wording polish, not a defect. It does not currently produce a wrong result, because the trust rule is already scoped to *"the output of any command that depends on the project's installed dependencies"*, so a no-dependency project is not spuriously blocked. This card is about a reader having to reconstruct that reasoning rather than being told it. This repo is itself a no-dependency project, so the benign case is the one an agent meets first here.
  - The risk is an over-literal reader: an agent that sees a negative status and hesitates, or reports a provisioning problem, on a project that never had dependencies to provision.
  - Scope: the canonical "Addressing the story worktree." paragraph, duplicated byte-identically across `plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md`, plus `lead.md`'s worktree-creation step that emits the status. See the root [`CLAUDE.md`](../../CLAUDE.md) for the parity check that must pass before pushing — the paragraph is a single physical line, so the check covers the whole contract.
  - Acceptance criteria:
  - "No dependencies required" is a distinct status from a provisioning failure, and is not phrased as a negative or a deficiency.
  - The receiver rule reacts to the two differently: a no-dependency worktree is trustworthy and needs no report, a failed provisioning is reported and not self-remedied.
  - The `lead`'s worktree-creation step states which of the two it emits when the project has no install step it can detect.
  - The paragraph stays one physical line and byte-identical across all five files, so the drift check still prints `1`.
  - Stays project-agnostic: no ecosystem or package manager is named.
