---
name: planner
description: Interactive planning workflow that records an approved task as a local board card and, for bigger work, writes its spec under docs/specs/. Use when the user has a shaped idea, an approved task, an epic child, or an existing card and wants it captured in docs/tasks/ — and a goal/design/requirements/scenarios/tasks spec prepared when the work is large enough to need one.
---

# Planner

## Overview

Turn an approved, shaped task into tracked work. Planner owns two artifacts:

1. **Task card** — always. One checkbox in a board file under `docs/tasks/`, in the Obsidian Tasks format. This is the unit of work tracking.
2. **Spec** — only for bigger work. One file at `docs/specs/<slug>.md` (`goal -> design -> requirements/scenarios -> tasks`). Small, self-contained tasks ship from the card alone with no spec.

Keep the main agent in the conversation: the user validates the card (type, scope, priority, dependencies) and, when a spec is warranted, its scenarios and tasks before execution.

Read `docs/tasks/CLAUDE.md` and `docs/specs/README.md` in the target repo for the board format, status model, and spec lifecycle before writing.

## Task cards

Cards live in board files under `docs/tasks/`:

- One file per epic: `docs/tasks/<epic-slug>.md`.
- Standalone work that is not under an epic: `docs/tasks/backlog.md`.

Each card is a single Tasks-format checkbox. The slug is the stable id used for the branch (`feat/<slug>`) and the spec filename (`docs/specs/<slug>.md`).

```markdown
- [ ] <action-verb title> #<type> <priority> 🆔 <slug> [⛔ <dep-slug>] [📅 <due>]
```

- **Status** is the checkbox symbol (status-based workflow): `[ ]` Todo · `[<]` Ready to start · `[/]` In Progress · `[?]` In Review · `[x]` Done · `[-]` Cancelled. New cards start at `[ ]`.
- **Type** is exactly one tag — the primary workflow label: `#feature`, `#improvement`, `#bug`, `#research`, `#marketing`, or `#support`.
- **Priority** is a Tasks emoji when known: `🔺` highest, `⏫` high, `🔼` medium, `🔽` low.
- **Id** is `🆔 <slug>` (lowercase kebab-case); other cards depend on it via `⛔ <slug>`.
- Put planner-ready context (background, scope, acceptance criteria, references) in the card's body lines or, for bigger work, in the spec it links to. Do not paste long research into the card; link `docs/library/`, docs, and code paths.

### Primary type, by central outcome

- `#bug` if the central problem is broken behavior.
- `#feature` if the central outcome is a new capability.
- `#improvement` if the central outcome improves existing behavior.
- `#research` if the work needs product, domain, provider, or feasibility research before it can become implementation work.
- `#marketing` / `#support` only when the work is primarily non-product-implementation work; if such work needs product changes, record a separate `#feature`/`#improvement`/`#bug`.

Epics are a board file (frontmatter `type: epic`) that holds child cards, not a single checkbox. Analyst decomposes epics; planner records each approved child card under the epic file with native `⛔` dependencies for sequencing.

## When to also write a spec

Write a spec when the work is large or uncertain enough that the engineer benefits from a contract: multiple requirements, non-trivial design or data-flow decisions, several scenarios, cross-area changes, migrations, or real regression risk. Skip the spec for small, self-contained changes whose acceptance criteria fit cleanly in the card. When in doubt, ask the user. When a spec exists, link it from the card body (`[spec](../specs/<slug>.md)`).

## Workflow

1. Load context: root and area `CLAUDE.md`/`AGENTS.md`; `docs/tasks/CLAUDE.md`; `docs/specs/README.md`; the shaped task or existing card; related docs and code — especially settled capability specs in `docs/features/` and in-flight specs in `docs/specs/`.
2. Confirm the planning workspace:
   - Plan in the current repository workspace on the base branch, normally `master`. Do not create or switch to a story branch, and do not create or select a worktree for planning.
   - If the current branch is not the base branch, ask before continuing unless project instructions allow planning on the current branch.
   - In the final handoff, state that `engineer` owns branch/worktree setup.
3. Resolve the slug and target board file:
   - Choose a lowercase kebab-case slug; reuse the existing one if the card already exists.
   - Standalone work → `docs/tasks/backlog.md`; epic child → `docs/tasks/<epic-slug>.md`. Avoid duplicate cards — update the existing card instead.
4. Draft or update the card with exactly one type tag, status `[ ]`, priority, `🆔 <slug>`, and `⛔` dependencies. Keep scope and acceptance criteria observable.
5. Decide spec-worthiness (see above). If a spec is warranted, draft `docs/specs/<slug>.md` per `docs/specs/README.md`:
   - metadata block: `**Status**`, `**Task**` (the card slug, or `none`), `**Last Updated**`
   - `## Goal`: problem, proposed change, user value, out of scope
   - `## Design`: architecture, data flow, dependencies, risks, alternatives — brief and inline
   - `## Requirements`: requirements with observable, testable scenarios
   - `## Tasks`: implementation checklist ordered for execution
   - Apply type emphasis: `#feature` (new capability, integration, new-behavior scenarios, docs hooks); `#improvement` (current vs desired state, migration/compatibility, regression scenarios); `#bug` (expected vs actual, reproduction, failing regression scenario, fix tasks, validation).
6. Run advisor critique:
   - Ask `gemini` (audit mode) to critique the card and any spec before final approval. Treat it as a required gate, not best-effort.
   - If `gemini` cannot run (limits, timeouts, tool errors), do not mark the work ready: free completed agents, retry, and only continue after it completes. If it still cannot run, stop and report the blocked advisor gate; the main agent reruns it later or gets an explicit user waiver.
   - Validate critique with evidence; apply valid points; discard unsupported ones. Rerun critique after non-mechanical edits.
7. Review with the user as the final approval gate:
   - Present the card (and spec summary / key scenarios) only after advisor critique is handled.
   - Include advisor status: completed, rerun after edits, waived by explicit user instruction, or blocked. Never downgrade a skipped gate to an ordinary uncertainty.
   - Apply small corrections directly; for large scope/behavior/scenario changes, update card and spec coherently and rerun critique.
8. Finish only when the user approves:
   - Write/update the card in `docs/tasks/`, and the spec in `docs/specs/` when one was warranted.
   - Return the card slug and board file, the spec path (or "no spec — card only"), the sections created/updated, the planning branch, advisor status, and remaining uncertainties.
   - Hand off to `engineer` only after approval; tell it to create or reuse an implementation worktree/branch (`feat/<slug>`) from the card and spec.

## Templates

Use the template for the chosen primary type to shape card body / spec content; load only the one you need from `${CLAUDE_PLUGIN_ROOT}/references/templates/` (`feature.md`, `improvement.md`, `bug.md`, `epic.md`). The repo may provide stronger Templater scaffolds under `docs/_templates/`; prefer those when present.

## Scenario standards

Write each scenario so `engineer` can create one scenario test from it: observable behavior; trigger, action, expected result; no private implementation details; one requirement per scenario; separate actors, failure modes, and edge cases.

## Boundaries

- Do not implement code, create branches/worktrees, or open PRs. Those belong to `engineer`.
- Do not silently change scope; call out significant changes and ask for approval.
- Do not write a spec for `research`, `marketing`, or `support` work, or for an epic, until it is refined into a concrete `#feature`/`#improvement`/`#bug` card.
- Do not force a spec onto small, self-contained work; the card is enough.
- Do not proceed to execution until the user approves.
- Do not claim work is ready when advisor critique was skipped, failed, timed out, or blocked, unless the user explicitly waives that gate.
