# Agents improvements

Append-only notes on friction in the pipeline itself — the flow, an agent's instructions, or a
skill. One `###` entry per concrete proposal.

Entries are triaged periodically: a solvable finding becomes an issue on the board (see [`ISSUE_TRACKING.md`](./ISSUE_TRACKING.md))
and a finding already resolved or foreclosed by shipped work is removed. Clearing an entry is part
of converting it, not a follow-up — see *The improvements log is cleared as it is converted* in the
root [`CLAUDE.md`](../CLAUDE.md). The log is empty when every recorded finding has been converted
or retired.

### The repo's canonical verification commands cannot be run as written from a story worktree

**Area**: flow

**Observed**: Root `CLAUDE.md` publishes its four maintenance checks (the five-file "Addressing the
story worktree." grep, the two-file "Board access" grep, the two cross-plugin greps, and the
manifest-parity loop) as compound shell — brace expansion, a `for` loop with command substitution,
`&&` chains. Specs cite them verbatim as validation steps: `SMR-143`'s V2 and V4 say "the root
`CLAUDE.md` … greps still print `1` each" and "the root `CLAUDE.md` manifest-parity loop prints
`ok`". A worktree-isolated agent session refuses those commands outright — "this command is too
complex to verify that it stays inside the worktree; break it into plain, separate commands" — so
every worker that runs V2/V4 burns refused round-trips rediscovering that the published form does
not execute, then hand-decomposes the loop into per-file greps and loses the loop's actual output
shape (`ok` / `DRIFT` lines) in the process.

**Suggested change**: In root `CLAUDE.md`, give each canonical check a plain single-command form
alongside the readable one (e.g. the manifest check as one `grep -H '"version"'` over the four
manifest paths, the greps already single commands with paths spelled out rather than brace-
expanded), and note that a worktree-isolated session must run the plain form. Specs can then cite a
command that actually runs where the pipeline runs it.

### A fix round can close a finding away from the location the finding cited, with nothing checking the citation

**Area**: flow

**Observed**: Review findings carry a `path:line` location, and the `lead` routes them to the
`coder` as prose. On `SMR-143` a finding filed against `researcher.md:84` ("loose use of
indexed/index") was addressed by adding a definition paragraph to a *different* file
(`scribe.md:40`) that scopes itself to "wherever this file or `researcher.md` calls a raw note
indexed". `researcher.md:84` was never edited and still carries the two senses it was cited for in
one sentence ("to **index**, taxonomy-check, and log the pass" alongside "as what to **index**"),
and `researcher.md` gained no pointer to the new definition even though the definition claims to
govern it. The round was nonetheless reported as fixing the finding. Nothing in the loop compares
the fix's edit sites against the finding's cited location, so a fix that lands adjacent to the
citation reads as identical to one that lands on it.

**Suggested change**: Carry each finding's cited `path:line` through the fix round as data, not
just prose: have the `coder` state, per finding, either that it edited the cited location or why
the cited location is correct as-is given the fix elsewhere, and have the `lead` pass the cited
locations to `qa` so the re-audit can check each citation directly instead of re-deriving it from
the diff.

### Nothing checks a story branch against master's tip before push, and every story conflicts in the improvements log

**Area**: flow

**Observed**: On `SMR-143`'s final pre-push `qa` pass, `git diff master --stat` in the story worktree
reported `plugins/ca77y-engineering/agents/writer.md` and `skills/lead/SKILL.md` as changed — files
the story never touched — because master had advanced one commit (`#28`) since the branch point. The
scope check reads as an out-of-scope-edit finding until you notice it is merge-base drift and re-run
against `git merge-base master HEAD`. The real problem surfaced only on a `git merge-tree
--write-tree master HEAD` dry run: the branch **conflicts** with master in `docs/AGENTS_IMPROVEMENTS.md`.
That conflict is structural, not incidental — the flow instructs every agent on every story to append
to that one file, so any two stories in flight at once collide there by construction, and no step in
the run checks for it before the `lead` pushes and the PR is declared ready.

**Suggested change**: Two parts. (1) Where the flow asks for a changed-file scope check, specify the
merge base (`git -C <worktree> diff $(git -C <worktree> merge-base master HEAD)..HEAD --stat`), not
`git diff master`, so drift is never mistaken for a story's own edits. (2) Add a mergeability check to
the `lead`'s ship step — `git merge-tree --write-tree master HEAD`, which is read-only and needs no
checkout — and have it resolve an `AGENTS_IMPROVEMENTS.md` conflict by keeping both sides' entries
(the file is append-only, so that is always the correct resolution) before pushing.
