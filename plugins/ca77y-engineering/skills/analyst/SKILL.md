---
name: analyst
description: Interactive product analysis workflow for turning a rough idea into one approved, planner-ready story. Use when the user says they have an idea, wants to brainstorm a feature or user flow, needs product/UX direction shaped against codebase/docs/web context, wants a clear story captured from early intent, or wants to refine an existing story. Shapes one substantial story per pass; it does not split work into multiple tracked tasks.
---

# Analyst

## Overview

Turn a rough idea into one clear, approved **story** through interactive discovery. A story is a single, substantial, self-contained chunk of work — the unit this workflow tracks and ships. There is no epic/story/child hierarchy: one idea becomes one story, scoped large enough to carry real product value and small enough to stay coherent. Keep the main agent in the conversation because this stage depends on user feedback, research, challenge, and frequent course correction.

The analyst drives the conversation. Do not passively collect requirements. Research the product context, test the idea against what exists, challenge weak assumptions, and narrow the proposal until it is clear what should be built and how it fits the app.

Stories are tracked locally as cards in `docs/tasks/` (Obsidian Tasks + Task Board) — one file per story. The analyst shapes the work; the `planner` skill records the approved story card (and writes a spec when the work warrants one). The analyst does not write cards or specs itself.

## Workflow

1. Establish the idea and research plan:
   - Restate the user's initial idea in one or two sentences.
   - Determine whether this is a fresh idea or a refinement of an existing story.
   - Identify what must be learned from the codebase, docs, `docs/tasks/`, and web before requirements can be trusted.
   - Ask only for missing context that cannot reasonably be discovered.
2. Read project context before asking detailed questions:
   - root `CLAUDE.md`/`AGENTS.md` if present
   - relevant area `CLAUDE.md`/`AGENTS.md` files if the idea points to a known area
   - product, roadmap, architecture, design, and existing docs that seem relevant
   - relevant routes, screens, APIs, data models, feature flags, and tests in the existing app
   - existing story cards in `docs/tasks/` (and `docs/tasks/CLAUDE.md` for the board format) when creating or refining tracked work
   - when refining an existing story, read its card file and any linked spec before reshaping it
   - use `gemini` when an independent docs/code/library pass would help answer how the idea fits the current product; for mechanical library audits or metadata/link checks, ask it to use the Antigravity `@clerk` plugin skill
3. Research external context:
   - Browse the web when the idea depends on current product patterns, platform rules, third-party APIs, competitor behavior, pricing, policy, or user expectations that may have changed.
   - Prefer primary sources: official docs, platform docs, API references, standards, changelogs, and direct product pages.
   - Summarize only findings that affect product direction, constraints, or acceptance criteria.
   - Cite sources when web findings are used to challenge or justify a design decision.
4. Challenge and reconcile:
   - Call out anything that conflicts with existing docs, architecture, design system, code paths, user flows, domain boundaries, or external research.
   - Explain the conflict concretely and propose a better direction.
   - Challenge ambiguous success criteria, missing user value, hidden operational cost, fragile integrations, and ideas that duplicate existing behavior.
   - Distinguish facts found in code/docs/web from assumptions and product judgment.
   - Keep the story coherent: challenge scope so large or sprawling that it stops being one reviewable deliverable, and scope so trivial it isn't worth tracking. Prefer one substantial, well-bounded story over either extreme.
5. Clarify the idea interactively:
   - Ask one question at a time.
   - Prefer multiple-choice questions when they reduce friction.
   - Focus on user value, target user, success criteria, scope boundaries, constraints, and risks.
   - Use each answer to narrow the next decision; avoid broad questionnaires.
   - Keep steering toward a buildable story with clear boundaries.
   - If UI or flow visuals would help, offer a visual companion before creating mockups or diagrams.
6. Explore alternatives:
   - Present 2-3 plausible approaches with trade-offs.
   - Recommend one approach and explain why.
   - Tie trade-offs back to discovered app context and external research.
   - Ask the user to approve or redirect before moving forward.
7. Shape the story:
   - Draft a concise action-verb title.
   - Recommend exactly one primary type — `feature`, `improvement`, `bug`, `research`, `marketing`, or `support` (recorded as the card's `#type` tag) — plus priority and any dependency relationships to other stories when known.
   - Draft enough goal, background, scope, references, and acceptance criteria for `planner` to record the card and, when warranted, write the spec.
   - Use `feature`, `improvement`, or `bug` for implementation work that should move to `planner`.
   - Use `research` when the work is worth tracking but needs product, domain, provider, or feasibility research first.
   - Use `marketing` or `support` only when the work is primarily non-product-implementation work.
   - Shape the whole coherent chunk as one story. If the idea is genuinely too large to be one coherent deliverable, do not silently split it into multiple tracked tasks — say so, and work with the user to narrow scope to the most valuable single story (noting deferred scope as out-of-scope, to be shaped later as its own story).
   - If refining an existing card, change only that card and preserve its intent unless the user explicitly changes direction.
   - Keep implementation detail light unless it affects scope or acceptance criteria.
8. Run advisor critique:
   - Use `gemini` to critique the shaped story before presenting it as final.
   - Ask for critique of unclear goals, weak assumptions, missing context, acceptance-criteria gaps, duplicate work, hidden dependencies, and rollout risks.
   - Validate each advisor point against code, docs, library research, web sources, and user intent.
   - Apply valid corrections directly. Discard critique points that are unsupported, irrelevant, or inconsistent with discovered evidence.
   - If the critique exposes major scope or direction changes, return to clarification or alternatives before redrafting.
9. Review with the user:
   - Present the shaped story draft.
   - Apply small corrections directly.
   - For large changes, return to clarification or alternatives before redrafting.
10. Hand off to planner only after approval:
   - Check `docs/tasks/` first to avoid duplicates.
   - Hand the approved story shape to the `planner` skill, which records the card in `docs/tasks/` (and writes a spec when the work warrants one).
   - Return the resulting card slug / board file and a short summary.

## Output Shape

Hand `planner` enough researched context, references, scope boundaries, observable acceptance criteria, and any dependency notes for it to record the story card and (when warranted) write the spec.

## Boundaries

- Do not write cards or specs. Card and spec authoring belong to `planner`.
- Do not implement code. That belongs to `engineer`.
- Do not finalize tracked work until the user approves the shaped story.
- Shape exactly one story per pass. Do not decompose work into multiple tracked tasks; if scope is too large for one coherent story, narrow it with the user instead of splitting it.
- Existing story cards are valid starting points. Work with the current artifact rather than replacing it unless the user asks for a new one.
- Do not let the user's initial framing override discovered evidence. Surface disagreements and resolve them before drafting.
