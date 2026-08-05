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

### The docs pass reads a spec the build was allowed to deviate from

**Area**: agent:writer

**Observed**: The docs pass is told to convert "the shipped spec" and to "document only what was
actually built", but nothing tells it those two can disagree — and by design they often do. A
spec is committed once and never revised; every later gate finding that changes the design lands
in the *code*, leaving the spec's Design section describing a shape that was then abandoned. On
SMR-178 the spec's plan table (twice) required the `auditor`'s freshness claim to be generalised
to "every round **and every caller** … the `analyst`'s story advisor gate"; the acceptance gate
found the "both callers" half unsourceable to `SKILL.md` and the `coder` removed it in the final
commit. The spec still describes the pre-fix design. Only an explicit warning in the docs-pass
dispatch prompt stopped that rejected claim being folded into `ARCHITECTURE.md` as durable fact —
i.e. the safeguard was a human noticing, not a step the pass performs.

**Suggested change**: Make the run's own diff, not the spec, the authority for *what shipped* in
the docs pass. Add a step before authoring: diff the spec commit against `HEAD` and read the
round commits' messages, then reconcile each durable claim the spec makes against what the diff
actually contains; where they disagree, the diff wins and the divergence is named in the docs-pass
report. The spec keeps its role as the source of *durable intent* (goal, design rationale,
requirements) — it simply stops being trusted for the shipped shape of anything a gate touched.

### A background-session write guard rejects the project's own worktree location

**Area**: flow

**Observed**: Run as a background job, this session's harness refused every file write until the
session had "isolated" itself, and the only mechanism it accepts is `EnterWorktree`. The root
`CLAUDE.md` tells a `lead` the opposite — that `EnterWorktree` "is deliberately not used for
this" because "it only accepts worktrees under `.claude/worktrees/`, not `.worktrees/<branch>`"
— so a `lead` following the repo's own instructions hits a guard it has been told not to use the
remedy for, after the worktree already exists. Writes were rejected both in the repository root
*and* inside the freshly created story worktree, so relocating the work would not have helped.
The `CLAUDE.md` claim is also incomplete: `EnterWorktree`'s `name` form is what is restricted to
`.claude/worktrees/`; its **`path` form accepts any worktree already registered in
`git worktree list`**, which is exactly what `git worktree add .worktrees/<branch>` produces.
Entering the story worktree by path satisfied the guard with the worktree left exactly where the
project wants it. Nothing moved. Two costs remained: run-local scratch files that must live
*next to* the worktree rather than inside it (the ledger, the board profile, the round findings)
still fall outside the isolation boundary and can only be written through `bash`, and once
isolated, a compound `bash` command touching a path outside the worktree is refused as "too
complex to verify", so those writes must be split into plain single commands.

**Suggested change**: Correct the root `CLAUDE.md` paragraph — keep the rule that the worktree
lives at `.worktrees/<branch>` and is addressed by absolute path, but replace "`EnterWorktree` is
deliberately not used" with the precise version: do not use its `name` form, which would relocate
the worktree; where a harness requires session isolation, enter the already-created worktree by
`path`, which leaves the location untouched. The `lead` skill could name the same fallback, since
a `lead` invoked as a background job will meet this guard on its first write every time, and the
failure arrives as a rejected edit with no indication that a compliant remedy exists.

### The root `CLAUDE.md`'s own verification snippets cannot be run in an isolated session

**Area** — `flow`

**Observed** — The root `CLAUDE.md` ships three copy-pasteable verification snippets that specs
then require agents to run: the two duplicated-paragraph drift `grep`s and the manifest-parity
`for` loop. In a worktree-isolated session all three are refused verbatim by the harness guard
with *"this command is too complex to verify that it stays inside the worktree; break it into
plain, separate commands"* — the `grep`s because of the `{coder,writer,qa,auditor}.md` brace
expansion and the trailing pipeline, the parity check because it is a `for` loop with command
substitution. On SMR-154 the spec's Tasks entry and a Requirements scenario both name these
snippets as the verification, so `qa` had to hand-translate each into a single plain command
(explicit file paths instead of braces; one `python3 -c` printing both manifest versions) before
it could report a result. Absolute `git -C <worktree> …` is accepted, so the canonical addressing
rule itself is fine — it is specifically these three snippets that do not survive isolation.

**Suggested change** — Make the checks runnable where they are documented, rather than leaving
each agent to reinvent an isolation-safe equivalent and risk reporting a refusal as a failure.
Either rewrite the three snippets in the root `CLAUDE.md` in plain, brace-free, one-command-each
form, or move them into a small checked-in script the guard can accept as a single invocation and
have `CLAUDE.md` point at it. Whichever form is chosen, keep the expected output (`1`, `1`, and
`ok` per plugin) stated beside it, since that is what a spec's Tasks entry cites.
