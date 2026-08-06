# Agents improvements

Append-only notes on friction in the pipeline itself — the flow, an agent's instructions, or a
skill. One `###` entry per concrete proposal.

Entries are triaged periodically: a solvable finding becomes an issue on the board (see [`ISSUE_TRACKING.md`](./ISSUE_TRACKING.md))
and a finding already resolved or foreclosed by shipped work is removed. Clearing an entry is part
of converting it, not a follow-up — see *The improvements log is cleared as it is converted* in the
root [`CLAUDE.md`](../CLAUDE.md). The log is empty when every recorded finding has been converted
or retired.

### The citation rule has no path for a claim about the harness itself

**Area**: `agent:writer`

**Observed**: On SMR-184's spec pass every load-bearing claim was about the **harness** —
`EnterWorktree`'s `name` versus `path` forms — not about a package in the project's dependency
tree. `writer.md:56` requires "a path-and-line reference inside that package's own installed or
vendored source", and the harness satisfies neither half: it is not in any dependency tree, and it
ships as one compiled binary (`~/.local/share/claude/versions/<version>`), so no line number
exists. The rule's escape hatch — mark it an assumption — understates what is actually available:
the tool description *is* readable from the installed binary with `grep -a -o`, at a pinned
version, which is a genuine citation, just not a path-and-line one. Marking a citable claim as an
unverified assumption is a worse outcome than citing it in the form that exists.

**Suggested change**: Add one clause to that rule for behaviour of the harness or any other
non-vendored, non-source-shipped dependency: cite the **installed artifact plus the extraction
command that reproduces the quoted text**, at the resolved version, in place of a path-and-line —
and note that a tool description can change between versions, so the spec states the mechanism
rather than pinning behaviour to a version. Keep the assumption marking for what genuinely cannot
be read, such as a runtime policy with no text in the artifact (the write guard in this same
story's case).

### The owning-mechanism rule has no category for the lead's own session

**Area**: `agent:writer`

**Observed**: On SMR-188's spec pass, one acceptance criterion required "a file-tool write to
`tmp/` inside the story worktree, made after the session has entered that worktree by `path`,
[to be] performed during this story's own run rather than asserted". No dispatched agent can
satisfy it: the observation is about the **top-level orchestrating session's own write path**,
so only the `lead` can perform it. `writer.md`'s rule *A criterion no automated build step can
satisfy gets a named owning mechanism* enumerates exactly two owners — "documentation the docs
pass owns, a manual reproduction someone has to run and record the results of" — and the
`lead`'s own session is neither. Worse, three neighbouring criteria needed the `lead`'s
observation (the outcome, and the dispatch mode the run was invoked in) as an **input to a file
the `coder` edits**, which is a shape the rule does not describe at all: the owner of the edit
and the owner of its content are different agents. The spec had to invent both categories to
keep those criteria mappable under the same pass's spec-gate rule.

**Suggested change**: Extend that rule's owner list with two cases. First, **the orchestrating
`lead`'s own session**, for a criterion about the session's own environment — its dispatch
mode, whether a harness guard fired, what its first write did — which no dispatched agent is
positioned to observe. Second, a **split-ownership** case: where a criterion's edit belongs to
one agent but its content is an observation only the `lead` can supply, the spec names both,
and says how the observation reaches the editing agent (the dispatch prompt) and what the
editing agent writes if it has not arrived. Both should keep the existing requirement of a
Tasks entry marked as not the `coder`'s task.

### A sweep-shaped criterion maps validly to a task list that covers only some of the files it sweeps

**Area**: `agent:auditor`

**Observed**: On SMR-188's build, `AC1` was sweep-shaped — "no shipped instruction tells a reader
to discover that path from context" — and the spec's task list enumerated per-file edits (T1–T24).
`auditor.md:24`'s spec-gate rule checks the mapping **both ways** between each `ACn` and the
requirements/scenarios, and that mapping was satisfied: `AC1` had requirements, and every
requirement had an `ACn`. But no rule checks that the *task list* covers every file the sweep
would reach. `plugins/ca77y-engineering/skills/board/references/authoring-issue-tracking.md` was
tasked at T3 for one named sentence only, so four separate sentences in that same file kept
teaching the discovery-from-context model `AC1` abolishes, and the build shipped them.
Requirement↔criterion mapping is the wrong altitude to catch this: the criterion was mapped, the
requirement was mapped, and the gap was between the requirement and the files.

**Suggested change**: Add one clause to the spec gate: where a criterion is phrased as a sweep
over a file class — "no shipped instruction", "no `.md` under `plugins/`", "all N files carrying
X" — verify the Tasks list either names every file that sweep reaches, or names the file set with
the exclusions and the reason. A criterion whose own *Validation* command would fail on a file no
task touches is a not-ready finding, not a build risk to discover afterwards. This is cheap to
check because a sweep-shaped criterion always implies a runnable command, and running it against
the base commit enumerates the file set the tasks have to cover.

### The findings file is the lead's write, but nothing says so where a lead would look

**Area**: `skill:lead`

**Observed**: On SMR-188's qa round 2, the dispatch prompt instructed `qa` to write its own
findings to `tmp/findings-round-2.md` inside the worktree, describing that as the branch's
shipped convention. The harness refused the write outright — a subagent is not permitted to
write report files, and must return findings as text. The shipped text is in fact correct and
unambiguous *about ownership*: `lead/SKILL.md:54` and `:56` are addressed to the `lead`, and it
is the `lead` that writes `tmp/findings-round-<N>.md` from the report a worker returns. But
neither `qa.md` nor `lead/SKILL.md` states that ownership as a rule anyone would notice while
composing a dispatch, so the misreading is easy and it costs a wasted worker round trip. Worse,
the refusal is indistinguishable at a glance from the refusal `lead/SKILL.md:56` says to escalate
as a **blocker on this story** — a lead that took it at face value would have escalated a
non-event and stalled the run.

**Suggested change**: Two clauses. In `lead/SKILL.md`'s *Paths, not content*, say explicitly that
the findings file is written **by the lead** from what the worker returns as text, and that a
dispatched worker is never asked to write it. And qualify the escalation trigger at `:56` so it
fires on a refusal *of the path or location* — the write guard, isolation, or a permission on
`tmp/` — rather than on any refusal whatsoever, since a refusal grounded in the caller's role or
the content's kind says nothing about whether the relocated scratch is writable.

### A cross-file *Validation* item that counts files must enumerate them

**Area**: `agent:writer`

**Observed**: On SMR-188, a *Validation* item asked for a whole-paragraph comparison of one shared
paragraph "across the ten files", giving the expected result (exactly two variants, in a 7/3
split) but never listing the ten paths. The obvious way to collect them — globbing the agent
definitions under `plugins/*/agents/` — yields **nine**, because the tenth carrier is a skill file,
not an agent. Nine files still produce two variants and still show a 3-file minority cluster, so
the under-covered run reports a clean pass that looks exactly like the correct one; only the
majority count differs, from 7 to 6, and nothing in the item says 7 is the number to expect per
cluster rather than just the split's shape. `qa` caught it here only by separately grepping the
tree for the paragraph and finding a tenth carrier the glob had missed.

**Suggested change**: When a *Validation* item asserts a count or a partition **over a file set**,
have the spec enumerate that set — inline, or as the exact command that generates it — rather than
naming its size in prose. A stated cardinality with no stated membership is checkable only by a
reader who independently rediscovers the membership, and the failure mode is silent: a plausible
glob that misses a member still satisfies the item's stated shape. This is the same hazard as the
sweep-shaped-criterion entry above, one layer down: there the tasks under-covered a file set the
criterion swept, here the check itself does.
