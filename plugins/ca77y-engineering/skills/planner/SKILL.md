---
name: planner
description: Interactive planning workflow for turning an approved Linear story into a spec — one spec file per story under docs/specs/. Use when the user has a Linear story or approved story draft and wants the goal, design, requirements/scenarios, and tasks prepared, reviewed, critiqued, and corrected before implementation.
---

# Planner

## Overview

Turn an approved planner-ready Linear story into a single spec file through an interactive review loop. Keep the main agent in the conversation because the user should validate scope, scenarios, and tasks before execution.

One story produces one spec file at `docs/specs/<story-id>-<slug>.md`. The spec is the implementation contract: `goal -> design -> requirements/scenarios -> tasks`. Adapt the planning emphasis based on whether the Linear story is a `Feature`, `Improvement`, or `Bug`; do not invent separate workflows per story type. See `docs/specs/README.md` for the file format and lifecycle.

## Workflow

1. Load project context:
   - root `CLAUDE.md` / `AGENTS.md` if present
   - relevant area `CLAUDE.md` files
   - the Linear story or approved story draft
   - related docs and code paths — especially settled capability specs in `docs/features/` and any in-flight specs in `docs/specs/`
2. Confirm the planning workspace:
   - Planner works in the current repository workspace on the base planning branch, normally `master`.
   - Do not create or switch to a story branch.
   - Do not create or select a git worktree for planning.
   - If the current branch is not the project base branch, ask the user before continuing unless project instructions explicitly allow planning on the current branch.
   - Keep the spec file in `docs/specs/` in the current workspace.
   - In the final approval handoff, state that `engineer` owns branch/worktree setup for implementation.
3. Confirm the Linear story is planner-ready:
   - It must have exactly one primary workflow label.
   - Planner-ready labels are `Feature`, `Improvement`, and `Bug`.
   - If the story is `Epic`, `Research`, `Marketing`, or `Support`, do not write a spec until the user converts or refines it into a concrete `Feature`, `Improvement`, or `Bug`.
   - If the story has no primary workflow label, or conflicting primary labels, stop and ask for the Linear story to be corrected with the `linear-story` subagent.
4. Resolve the spec file:
   - Name it `docs/specs/<story-id>-<slug>.md` using the Linear story id and a lowercase kebab-case slug.
   - If no Linear story exists, set `**Story**: none` in the spec and make that explicit in the final summary.
   - Avoid creating a duplicate spec for a story that already has one in `docs/specs/`; update the existing file instead.
5. Draft the single spec file with these sections (per `docs/specs/README.md`):
   - metadata block: `**Status**`, `**Story**`, `**Last Updated**`
   - `## Goal`: problem, proposed change, user value, out of scope
   - `## Design`: architecture, data flow, dependencies, risks, alternatives — brief and inline
   - `## Requirements`: requirements with scenarios that are observable and testable
   - `## Tasks`: implementation checklist ordered for execution
6. Apply the type-specific emphasis:
   - `Feature`: specify the new capability, user value, integration with existing architecture, new behavior scenarios, tests, and documentation hooks.
   - `Improvement`: specify current state, desired state, changed behavior, migration or compatibility concerns, regression risk, and regression scenarios around existing behavior.
   - `Bug`: specify expected vs actual behavior, evidence or reproduction steps, impact, corrected behavior, a failing regression scenario, fix tasks, and validation.
7. Run advisor critique:
   - Ask `gemini` to critique the spec before final approval.
   - Ask whether the spec is ready for the next step, simple enough, aligned with the product, and free of underspecified requirements or missing context.
   - Treat advisor critique as a required gate, not a best-effort check.
   - If `gemini` cannot start because of agent limits, timeouts, tool errors, or temporary unavailability, do not mark the spec ready. Free completed agents when possible, retry the critique, and only continue after it completes.
   - If the critique still cannot run after a retry, stop and report the blocked advisor gate to the main agent or user. The main agent must either rerun the missing critique later or get an explicit user waiver before presenting the spec as ready for approval.
   - Validate critique points with evidence before applying changes.
   - Discard critique points that are unsupported or out of scope.
   - If changes are large, update the full spec coherently and rerun critique.
   - If any critique-triggered edits are made after a successful critique, rerun advisor critique unless the edits are strictly mechanical typo, formatting, or metadata fixes.
8. Review with the user as the final approval gate:
   - Present the spec summary and important scenario/task choices only after advisor critique has been handled.
   - Include advisor status in the review handoff: completed, rerun after edits, waived by explicit user instruction, or blocked.
   - Never hide or downgrade a skipped advisor check as an ordinary uncertainty.
   - Apply small user corrections directly.
   - For large scope, behavior, architecture, or scenario changes, update goal/design/requirements/tasks coherently and rerun advisor critique before returning to user review.
9. Finish only when the user approves the spec:
   - Return the spec path.
   - List the sections created or updated.
   - State the planning workspace and branch that contain the approved spec.
   - State advisor status and remaining uncertainties.
   - Hand off to `engineer` only after approval, and tell it to create or reuse an implementation worktree/branch from the approved spec.

## Scenario Standards

Write each scenario so `engineer` can create one scenario test from it:

- Describe observable behavior.
- Include trigger, action, and expected result.
- Avoid private implementation details.
- Keep each scenario focused on one requirement.
- Separate different actors, failure modes, and edge cases into distinct scenarios.

## Boundaries

- Do not implement code. That belongs to `engineer`.
- Do not create a PR. That belongs to `engineer` or PR-specific skills.
- Do not create branches or worktrees. Planning stays in the current base-branch workspace.
- Do not silently change Linear story scope; call out significant changes and ask for approval.
- Do not turn `Epic`, `Research`, `Marketing`, or `Support` stories directly into implementation specs unless the user first refines the work into a `Feature`, `Improvement`, or `Bug`.
- Do not proceed to execution until the user approves the spec.
- Do not claim a spec is ready for approval when advisor critique was skipped, failed, timed out, or blocked, unless the user explicitly waives that gate.
