# Agents improvements

Append-only notes on friction in the pipeline itself — the flow, an agent's instructions, or a
skill. One `###` entry per concrete proposal.

### The spec template does not scaffold the sections the writer is required to produce

**Area**: `agent:writer`

**Observed**: `plugins/ca77y-engineering/agents/writer.md` requires every spec to carry a
**Boundary** section (its authoring rules check each scenario against it by name), **Validation**
scenarios, a **Deviations from the card** section when a criterion is unsatisfiable, and a
**Coordination** note when siblings collide. `docs/_templates/spec.md` scaffolds only
Goal → Design → Requirements → Tasks, and `docs/_templates/CLAUDE.md` pins that order because
"pipeline agents parse that contract". Nothing says where the four mandated sections go relative
to it, so each writer invents a placement — Boundary as a Design subsection here, a top-level
section there — and an auditor or coder looking for one has to search rather than expect it.

**Suggested change**: pin the placement in one of the two places. Either add the four sections to
`docs/_templates/spec.md` as named optional subsections in a fixed position, or state in
`writer.md` where each sits relative to Goal → Design → Requirements → Tasks (e.g. Boundary and
Coordination as the last subsections of Design, Validation as the last Requirement, Deviations
between Design and Requirements).

### The spec-authoring rules assume application code, and read as unsatisfiable on a prose deliverable

**Area**: `agent:writer`

**Observed**: two of the writer's authoring rules are written for a repo with a build and a test
suite — "the `coder` writes one scenario test per Requirements scenario", and Validation must
"include building through that consumer (`docker build .` / `docker compose build`)". On a
prompt-engineering task whose entire deliverable is one Markdown agent definition, there is no
test to write and no consumer to build through, so the rules have to be reinterpreted on the fly
as "one inspectable assertion per scenario" and "check the manifests and the changed-file set".
The task prompt happened to say so explicitly; without that, a writer could reasonably conclude
the spec was unfinishable or invent a test runner for a repo that has none.

**Suggested change**: add a sentence to each of those two rules naming the prose-deliverable case
— when the deliverable is a document rather than code, each scenario must be falsifiable by
reading the changed file, and Validation covers the artifact's real consumers (manifests,
loaders, anything that parses it) instead of a build.
