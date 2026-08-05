# Agents improvements

Append-only notes on friction in the pipeline itself — the flow, an agent's instructions, or a
skill. One `###` entry per concrete proposal.

Entries are triaged periodically: a solvable finding becomes an issue on the board (see [`ISSUE_TRACKING.md`](./ISSUE_TRACKING.md))
and a finding already resolved or foreclosed by shipped work is removed. The log is empty when
every recorded finding has been converted or retired.

### The dispatch contract has semantic mirrors with no drift guard

**Area**: flow

**Observed**: The root `CLAUDE.md` guards two paragraphs that are duplicated *byte-identically*
across files, with a `grep | sort -u | wc -l` check for each. It guards nothing for the contract
that is duplicated *semantically*: how the `lead` dispatches, resumes, and collects from a worker
is asserted in `skills/lead/SKILL.md`, restated for users in `README.md`, and restated again from
the worker's side in each `agents/*.md` ("the lead dispatches it once and **resumes** it with qa
and acceptance-gate findings"). On SMR-167 the `lead` skill stopped guaranteeing the resume, and
because the spec's Boundary correctly walled the worker definitions off, `coder.md` was left
telling a freshly dispatched coder that it had been resumed with prior context. No check in the
repo can catch that: the wordings differ by design, so no byte-comparison applies.

**Suggested change**: When a spec changes one side of a semantic mirror, require its Boundary
section to enumerate the other sides and state, per side, whether it is being changed now or
carried as a named follow-up — rather than only listing files the build must not touch. The
enumeration is the deliverable; the drift is invisible without it, and "out of scope" currently
reads the same whether the other side was checked or never looked at.

### A spec's negative constraint reaches the artifact as prose instead of being obeyed

**Area**: flow

**Observed**: SMR-178's spec instructed, as a note to its author, *"Nothing is said about why it
might not hold one (see Non-goals)"*. The build shipped that instruction as a sentence in the
agent's own voice — `coder.md:36` now ends *"Nothing here says why the `lead` might not hold one
for you"* — so a constraint on what to omit became text a dispatched coder reads about itself.
This is the same defect class SMR-149 shipped two nets for, and its own qa round found it inside
its own fix (*"Both new passages had explained why the rule sits where it sits — the defect class
this story exists to stop, appearing in its own fix"*). Those nets landed only in `scribe` and
`clerk`, scoped to the research library's published pages; nothing covers the `coder` editing an
agent definition or the `writer` authoring a spec, which is where the pipeline's own prose is
written.

**Suggested change**: Give the `coder` and the `writer` the receiving-side rule the library crew
already has, scoped to prose in the artifact's own voice: a spec's non-goals, "verify only" rows,
and parenthetical notes to the author are constraints to satisfy, never sentences to transcribe —
a shipped line that narrates what the document does not say, or why a rule sits where it sits, is
cut to the operative instruction. A cheap tell-sweep catches most of it (*"Nothing here says"*,
*"this section does not"*, *"see Non-goals"* surviving into the artifact).

### A spec's claims about the project's own files carry no citation discipline

**Area**: flow

**Observed**: The `writer`'s authoring rules require a path-and-line citation for any claim about
a **third-party or vendored dependency**, and nothing equivalent for a claim about the project's
own files — even though the latter is what a prose-deliverable spec is almost entirely made of.
SMR-178's spec states, in *How this is validated* → *Consumers of the changed files*, that the
agent definitions are loaded "by `plugins/ca77y-engineering/.claude-plugin/plugin.json`, which
lists each by path in its `agents` array, and by the mirrored root
`plugins/ca77y-engineering/plugin.json`". The root manifest carries only `name`, `description`
and `version`; it has no `agents` array. The spec elsewhere claims exactly this discipline for
itself — *"Every quoted claim above is a claim about this repository's own files, given with a
path and a line number … and verifiable by reading them"* — but that sentence covers the quoted
Design claims, not the consumer analysis, so the readiness gate had nothing to check the
consumer claim against. It reached qa round 2 unchallenged and harmed nothing here only because
the build changed no file's registration.

**Suggested change**: Extend the citation rule to load-bearing claims about the project's own
files — the ones a Validation or Boundary section rests on, such as which consumer loads a
changed file — requiring the path plus the line or key that shows it, at the commit named. It is
cheaper than the dependency rule (the file is in the worktree) and it gives the `auditor` a
concrete thing to open, instead of a plausible sentence about the repo that reads the same
whether it was verified or assumed.
