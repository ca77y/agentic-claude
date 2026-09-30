---
name: shape
description: Turn an idea, problem, or evidence into a durable proposal, specification, or board-ready story with observable acceptance criteria. Use for shaping an outcome; implementation requires a delivery request.
argument-hint: "<idea, problem, or evidence>"
---

Turn the idea, problem, or evidence into the requested proposal, spec, or board-ready story, and stop there. Implementation needs a `deliver` invocation, and filing a card needs the user to ask for it.

## Context

Read the goal, the relevant product and repository constraints, existing proposals or cards, and the supplied evidence. Link factual premises to their evidence, and label assumptions and product decisions separately. If the project has a research library, `slop-lib:librarian` can retrieve from it; when that plugin isn't installed, read the library files directly and say so in the final response.

Read `docs/BOARD.md` only for a board operation, and `${CLAUDE_SKILL_DIR}/references/cards.md` before preparing one. The user's request authorizes an operation within the declaration's conditions; the declaration alone never does.

## The artifact

State the problem and intended outcome, scope and exclusions, observable acceptance criteria, constraints and dependencies, open decisions, and supporting evidence. An execution spec goes in the project's spec location, normally `docs/specs/`, and adds the intended approach, how each criterion will be verified, and, when the work splits into independent parts, the tasks it breaks into.

Draft directly or delegate to `slop-eng:writer`.

## Readiness

A proposal is ready only when a fresh `slop-eng:auditor` passes its exact revision for fit, consistency, feasibility, evidence, and verifiable criteria. The auditor is a new `Agent` dispatch, never a `SendMessage` continuation, so its verdict is independent of the drafting. Fix and revalidate with a new auditor. Nothing is ready while a material decision is open; a clearly labeled draft is a valid result. A trivial edit with settled intent needs no spec but still a fresh auditor.

## Attempts

Allow three failed audits within this request; an approach abandoned as unworkable also counts. On the third failure, stop all workers and return the three approaches, why each failed, and the decision or extra attempts you need.

## Report

Return the artifact path, the readiness verdict with its evidence, and the open decisions.
