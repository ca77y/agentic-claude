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
