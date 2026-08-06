# Working on ca77y-agentic

Notes for editing **this toolkit repo**. The plugins themselves discover everything
from their target project's context — this file is for maintaining the repo, not for
runtime agent behavior.

## Worktrees

Story worktrees live in `.worktrees/<branch>` at the repo root (gitignored). One story
branch per worktree, branched off `master`; the root checkout stays on `master` and
never has a story branch checked out. Remove the worktree and its branch once the PR
merges.

Dispatched agents address the worktree by its absolute path, not by cwd: git calls
carry `-C <path>`, and file tools take an absolute path under `<path>`. Do not use
`EnterWorktree`'s `name` form for this — it creates a worktree under
`.claude/worktrees/`, which would relocate the story branch's tree — so do not "fix"
the location to match it. Where a harness requires a session to isolate itself before
it will write, the remedy is the `path` form: enter the worktree that was already
created at `.worktrees/<branch>`, which the tool accepts on first entry because
`git worktree add` registered it in `git worktree list`. That leaves the worktree
exactly where this project puts it — nothing moves, and the addressing rule above is
unchanged.

This repo has no install or bootstrap step of its own (no `package.json`, no lockfile),
so a story worktree here needs no dependency provisioning — a `lead` running the
pipeline on this repo records the status as *not provisioned: no install step* and
proceeds.

That addressing convention — together with the rest of the worktree contract every
dispatched agent carries: the dependency-provisioning status handed over with the path,
the rule that the root checkout may be **read** for dependency and vendor sources but
**never written**, and the ban on invoking a project CLI through a bare fetch-and-run —
lives as one canonical "Addressing the story worktree." paragraph duplicated
**byte-identically** across five files — the four worker agents plus the `lead` skill
(the skill creates the worktree and names it to every dispatch, so it carries the
paragraph verbatim):
`plugins/ca77y-engineering/agents/{coder,writer,qa,auditor}.md` and
`plugins/ca77y-engineering/skills/lead/SKILL.md`. There is no
shared-include mechanism across these `.md` files, so the copies are deliberate — but
they carry the same drift hazard as the two manifests below: sharpen the wording in one
and the others silently fall out of sync. **Whenever you edit that paragraph, edit all
five and verify they still match before you push** (this should print `1` — a single
distinct copy across all five files):

```bash
grep -h '^\*\*Addressing the story worktree\.\*\*' \
  plugins/ca77y-engineering/agents/{coder,writer,qa,auditor}.md \
  plugins/ca77y-engineering/skills/lead/SKILL.md | sort -u | wc -l
```

The same hazard applies to a second, shorter canonical paragraph: **"Working from the
board profile."**, carried by the two agents that *receive* a resolved board profile
rather than resolving one — `writer` and `auditor`. (The `lead` skill and the `analyst`
invoke the `board` skill themselves and carry their own resolver wording, which is
deliberately different prose; do not try to unify the four.) Edit both copies together
— this should also print `1`:

```bash
grep -h '^\*\*Working from the board profile\.\*\*' \
  plugins/ca77y-engineering/agents/{writer,auditor}.md | sort -u | wc -l
```

## Two plugins — keep the cross-plugin edge soft

The repo ships `ca77y-engineering` (pipeline: `analyst`, `auditor`, `coder`, `qa`,
`writer`, plus the `lead` and `board` skills) and `ca77y-library` (research crew:
`researcher`, `librarian`, `scribe`, `clerk`). They install independently, and **no
plugin manifest can declare a dependency on another plugin** — so the only thing keeping
that true is how the agents are written:

- `ca77y-library` must never dispatch or assume a `ca77y-engineering` agent or skill.
- Every `ca77y-engineering` → `ca77y-library` dispatch must **degrade**: the caller needs
  a documented fallback and must report having used it. Today there is exactly one such
  edge — the `analyst` optionally pulling `ca77y-library:librarian` / `:clerk` — and
  adding a hard one silently breaks the pipeline for anyone who installed it alone.

Dispatch names are plugin-qualified, so **moving an agent between plugins means rewriting
every `ca77y-<plugin>:<agent>` string that names it.** This should print nothing:

```bash
grep -rn 'ca77y-engineering:\(researcher\|librarian\|scribe\|clerk\)' plugins/
grep -rn 'ca77y-library:\(analyst\|auditor\|coder\|qa\|writer\|lead\|board\)' plugins/
```

The rationale for the split is recorded in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) under *Two plugins, one optional edge*.

## The board is resolved, never hardcoded

No agent may name a tracker, a card path, a status symbol, or a card field as a fact
about "the project". All of it comes from the `board` skill's resolved **board
profile** — bindings for locate/read/search/create/transition, the card shape, the
status vocabulary, the visibility rule, and the write authority. When editing an agent,
treat any concrete tracker detail as a bug unless it is explicitly framed as *one
board's realization* of a semantic (the README's Obsidian Tasks example, the analyst's
format-quirk rule).

Work tracking for this repo — the board, its statuses, and what agents may write to it —
is declared in [`docs/ISSUE_TRACKING.md`](docs/ISSUE_TRACKING.md). That line is not
decoration: the `board` skill reads the declaration at the path its **context** gives it
and never searches for one, so a declaration nothing points at is invisible on the runs
where nobody happens to grep for it. Keep the pointer here whenever the file moves.

## The improvements log is cleared as it is converted

[`docs/AGENTS_IMPROVEMENTS.md`](docs/AGENTS_IMPROVEMENTS.md) is an append-only log of
friction in the pipeline itself. Triage turns each `###` entry into a card on the board —
and **removing the entry is part of converting it, not a follow-up.** Do it in the same
pass and the same commit, automatically, without asking first: an entry that already has
a card is noise, and one left behind is re-triaged by the next run and filed a second
time under a new identifier.

The rule is per entry, not per batch — clear each one as its card lands, so a run that
converts four of seven findings leaves exactly the three it did not. Retire an entry the
same way, with no card, when shipped work has already resolved or foreclosed it. Either
way the removal commit's message names what settled it: the card identifier, or the
commit that made it moot. That message is the only surviving trace of the finding, so it
carries the identifier — never delete an entry without one.

Two entries do **not** clear. A finding whose card was filed and then marked `Duplicate`
or `Canceled` was never converted, so its entry stays. And a finding an analyst declined
to file — because it judged the fit analysis against it — stays too, with the reason
recorded, rather than vanishing because someone ran a triage pass over it.

An empty file is the expected steady state, not a sign the log is unused.

## Version management is a manual human process

Bumping any plugin's `version` is **a deliberate human decision, never an automated
step.** Do not change a version — in either manifest — unless the human has
**explicitly requested that version bump in this session.** Shipping a feature, fix,
or refactor does **not** on its own justify a bump: leave the versions untouched and
let the human decide when and to what. Agents (leads included) must not bump versions
as part of finishing a task.

## When a version bump *is* requested: both manifests must agree

Every plugin ships **two** manifests that must always carry the same `version`:

- `plugins/<plugin>/plugin.json` — root manifest (mirrors the Claude one)
- `plugins/<plugin>/.claude-plugin/plugin.json` — Claude

These have silently drifted before (engineering sat at `0.8.3` in the Claude manifest
while the root manifest stayed `0.8.0`). **Whenever you change a version, verify both
manifests of every plugin under `plugins/*` match before you push:**

```bash
for d in plugins/*/; do
  r=$(python3 -c "import json;print(json.load(open('${d}plugin.json'))['version'])")
  c=$(python3 -c "import json;print(json.load(open('${d}.claude-plugin/plugin.json'))['version'])")
  [ "$r" = "$c" ] && echo "ok    ${d%/}  $r" || echo "DRIFT ${d%/}  root=$r  claude=$c"
done
```

Every plugin should print `ok`. Investigate any `DRIFT` line before pushing.
