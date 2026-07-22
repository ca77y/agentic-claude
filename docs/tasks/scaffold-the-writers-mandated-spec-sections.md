---
type: story
title: Pin where the writer's mandated spec sections live
---

# Pin where the writer's mandated spec sections live

- [ ] Pin where the writer's mandated spec sections live #improvement 🔼 🆔 scaffold-the-writers-mandated-spec-sections
  - `writer.md` requires every spec to carry four sections its authoring rules check by name — **Boundary**, **Validation** scenarios, a **Deviations from the card** section when a criterion is unsatisfiable, and a **Coordination** note when siblings collide — but nothing says where they sit relative to the canonical Goal → Design → Requirements → Tasks order. Each writer invents a placement, and an auditor or coder looking for one has to search rather than expect it.
  - Background: `docs/_templates/spec.md` scaffolds only Goal → Design → Requirements → Tasks, and `docs/_templates/CLAUDE.md` pins that order because "pipeline agents parse that contract". The four mandated sections have no scaffolded home, so Boundary shows up as a Design subsection in one spec and a top-level section in another.
  - Scope: pin the placement in exactly one of `plugins/ca77y-engineering/agents/writer.md` or `docs/_templates/spec.md` — not both.
  - Acceptance criteria:
  - The four mandated sections have a defined, fixed placement relative to Goal → Design → Requirements → Tasks, stated in exactly one place.
  - If placed in the template: `spec.md` scaffolds them as named optional subsections in that fixed position. If in `writer.md`: the definition states each section's position relative to the four canonical sections (e.g. Boundary and Coordination as the last subsections of Design, Validation as the last Requirement, Deviations between Design and Requirements).
  - The chosen placement keeps intact the parse contract `docs/_templates/CLAUDE.md` pins.
  - An auditor or coder can locate any of the four sections by its fixed position without reading the whole spec.
  - Boundary's placement is consistent with the authoring rule that checks each scenario against it by name.
  - See [`../_templates/spec.md`](../_templates/spec.md) and [`../_templates/CLAUDE.md`](../_templates/CLAUDE.md).
