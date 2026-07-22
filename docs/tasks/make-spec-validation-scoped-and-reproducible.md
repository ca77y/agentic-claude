---
type: story
title: Make a spec's Validation section scoped and reproducible
---

# Make a spec's Validation section scoped and reproducible

- [ ] Make a spec's Validation section scoped and reproducible #improvement 🔼 🆔 make-spec-validation-scoped-and-reproducible
  - A spec's Validation section is treated as a list of commands to run, not as a contract that has to hold. Two failure modes follow: a prescribed command writes outside the spec's own boundary, and the preconditions needed to make a command work are discovered during implementation and then never written down.
  - Background — running the prescribed validation creates a boundary violation: a repository's base branch was not formatter-clean, so the mandated repo-wide format command rewrote eleven files no in-flight unit owned, several of which the same spec explicitly listed under "must not touch". Satisfying both the validation step and the boundary required running the command and then hand-reverting the collateral, which is easy to miss and silently pollutes the story branch.
  - Background — preconditions relayed in a message, not the spec: a spec listed its acceptance commands plainly — build the container image, crawl a localhost port. None worked as written on the machine the work happened on. Three environment facts had to be discovered to get a real pass: the pinned base image's browser-binary guard only resolves on one CPU architecture, so the build needed a platform override; the container binds loopback and is unreachable from the host unless an API token is set; and the host port was already held by a concurrent sibling worktree's container, requiring a port remap rather than stopping the sibling. All three reached the validating agent only through the ephemeral dispatch message. The Validation section still read as if the plain commands sufficed, so anyone re-running acceptance from the spec alone — a later reviewer, or a re-run after the worktree is gone — hits three consecutive failures that look like defects and are not.
  - Scope: `plugins/ca77y-engineering/agents/writer.md` spec-authoring rules, plus the report contract in `coder.md` and `qa.md` that feeds preconditions back.
  - Acceptance criteria:
  - A Validation command that writes to files is scoped to the spec's own boundary, or the spec states the check-only form to use instead.
  - When a spec prescribes a command that can write outside the boundary, it also prescribes verifying the working tree afterwards and reverting collateral.
  - An environment-specific precondition or workaround discovered while executing a Validation step is written back into that Validation section as a precondition note next to the affected command.
  - The `coder` and `qa` return discovered preconditions as part of their report rather than only in conversation, and the `writer`'s docs pass folds them into the durable home along with the rest of the spec.
  - A Validation section is reproducible from the spec alone by someone who was not present for the build.
  - This extends the existing rule that validation must reach every consumer of what the task changes, rather than restating it.
