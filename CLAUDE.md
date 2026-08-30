# Working on ca77y-agentic

Notes for editing **this toolkit repo**. The plugins themselves discover everything
from their target project's context — this file is for maintaining the repo, not for
runtime agent behavior.

## Worktrees

Where story worktrees live, what they branch off, and how they are named is this repo's
own [`docs/FORGE.md`](docs/FORGE.md) — the same declaration the pipeline reads. Do not
restate it here; in summary, `.worktrees/<branch>` at the repo root (gitignored), one
story branch per worktree off `master`, the root checkout staying on `master` and never
holding a story branch, and the worktree and its branch removed once the PR merges.
Where this summary and the declaration disagree, the declaration is right.

Dispatched agents address the worktree by its absolute path, not by cwd: git calls
carry `-C <path>`, and file tools take an absolute path under `<path>`. Do not use
`EnterWorktree`'s `name` form for this — it creates a second worktree on a new branch
under `.claude/worktrees/`, leaving this story's tree behind — so do not "fix" the
location to match it.

Where a harness requires a session to isolate itself before it will write, the remedy
is the `path` form: enter the worktree that was already created at `.worktrees/<branch>`,
which the tool accepts on the session's first entry from the launch directory — the
`lead`'s own session; a dispatched worker, whose working directory was pinned at
launch, cannot reach this worktree that way and stays on absolute-path addressing.
`git worktree add` registered `.worktrees/<branch>` in `git worktree list`, which is
why the tool accepts it. Entering an existing worktree leaves it exactly where this
project puts it — nothing moves, and the addressing rule above is unchanged.

This repo has no install or bootstrap step of its own (no `package.json`, no lockfile),
so a story worktree here needs no dependency provisioning — a `lead` running the
pipeline on this repo records the status as *no dependencies required* and
proceeds.

That addressing convention — together with the rest of the worktree contract every
dispatched agent carries: the dependency-provisioning status handed over with the path,
the rule that the root checkout may be **read** for dependency and vendor sources but
**never written**, and the ban on invoking a project CLI through a bare fetch-and-run —
lives as one canonical "Addressing the story worktree." paragraph duplicated
**byte-identically** across six files — the five worker agents plus the `lead` skill
(the skill creates the worktree and names it to every dispatch, so it carries the
paragraph verbatim):
`plugins/ca77y-engineering/agents/{junior-coder,senior-coder,writer,qa,auditor}.md` and
`plugins/ca77y-engineering/skills/lead/SKILL.md`. There is no
shared-include mechanism across these `.md` files, so the copies are deliberate — but
they carry the same drift hazard as the two manifests below: sharpen the wording in one
and the others silently fall out of sync. **Whenever you edit that paragraph, edit all
six and verify they still match before you push** (this should print `1` — a single
distinct copy across all six files):

```bash
grep -h '^\*\*Addressing the story worktree\.\*\*' \
  plugins/ca77y-engineering/agents/{junior-coder,senior-coder,writer,qa,auditor}.md \
  plugins/ca77y-engineering/skills/lead/SKILL.md | sort -u | wc -l
```

The same hazard applies to a second, shorter canonical paragraph: **"Board access is
granted by your caller."**, carried by the two agents whose access is decided by the
caller that dispatches them, rather than being a fixed fact about the agent — `writer`
and `auditor`. (The `lead` skill carries its own wording for reading the fixed
declaration directly, which is deliberately different prose; do not try to unify the
two.) Edit both copies together — this should also print `1`:

```bash
grep -h '^\*\*Board access is granted by your caller\.\*\*' \
  plugins/ca77y-engineering/agents/{writer,auditor}.md | sort -u | wc -l
```

## The two coder tiers differ by model, never by contract

`junior-coder` and `senior-coder` are **one agent definition shipped twice**. Their
frontmatter differs — `name`, `description`, the `model` that is the whole point of the
split (`haiku` and `opus`), and the `effort` each tier runs at (`xhigh` and `high`, per
*Model and effort assignment* in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the
junior tier is the higher of the two on purpose) — and **everything below the frontmatter
is byte-identical**. That is not an accident to be tidied up: the `lead` routes between them
on the spec's **Coding complexity** score alone, so any behavioural difference between the
two files would make the score a silent behaviour switch instead of a cost decision, and a
task would be built to a different contract depending on how the `writer` scored it.

This is why the shared body keeps **generic `coder` role language** ("What a fresh coder
carries", "the `coder`'s own fix") and second-person "you" throughout. Do not specialise
it — no "as the junior, escalate earlier", no senior-only rule. A tier-specific fact
belongs in that file's `description`, which is the only place the two may legitimately
disagree. **Whenever you edit either body, apply the same edit to the other and verify
before you push** — this should print the `ok` line and nothing else:

```bash
body() { awk 'f>1{print} /^---$/{f++}' "$1"; }
diff <(body plugins/ca77y-engineering/agents/junior-coder.md) \
     <(body plugins/ca77y-engineering/agents/senior-coder.md) \
  && echo "ok: coder bodies identical"
```

`body` strips everything up to and including the closing `---` fence rather than a fixed
line count. The two frontmatters happen to be the same length today, so an offset-based
`tail -n +7` would also pass — but it would break silently the moment either tier gains or
loses a frontmatter line, comparing the files skewed and reporting drift that is not there.
The fence-based form has no offset to keep in sync; leave it that way.

## `--fast` restates the model pins — keep the `Pinned` column honest

The `analyst` and `lead` skills each accept a `--fast` flag that steps every dispatch
one model tier down (`opus → sonnet → haiku`, haiku the floor), and each carries a table
of what that resolves to, inline in its `SKILL.md` — deliberately not an on-demand
reference, because the flag is a frequent companion of a normal run, not a rare branch
(see *Branches load on demand* below for that distinction). Those tables have a
**`Pinned` column restating the agent's own frontmatter `model:`** — deliberately,
because an orchestrator cannot read another plugin's frontmatter at run time and has to
carry the mapping. That makes it a copy, and copies drift: **change any
agent's `model:` and the two tables silently start lying.** Run this whenever you touch
a pin (every row should print `ok`; `auditor` appears twice because both tables dispatch
it):

```bash
grep -hoE '`ca77y-(engineering|library):[a-z-]+` \| `(haiku|sonnet|opus)`' \
  plugins/ca77y-engineering/skills/lead/SKILL.md \
  plugins/ca77y-engineering/skills/analyst/SKILL.md \
| tr -d '`|' | sed 's/ca77y-//; s/:/ /' | while read -r plug agent pin; do
    real=$(awk -F': ' '/^model: /{print $2; exit}' "plugins/ca77y-$plug/agents/$agent.md")
    [ "$pin" = "$real" ] && echo "ok    $agent  $pin" || echo "DRIFT $agent  table=$pin  frontmatter=$real"
  done
```

`effort` is deliberately **not** in those tables and must not be added: a dispatch takes
no effort parameter, so `--fast` cannot move it and a column implying otherwise would be
a promise the harness cannot keep. The rationale for the whole arrangement is in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) under *`--fast` steps the model, and only
the model*.

## Branches load on demand — the body is the happy path

An agent or skill body carries **one happy path plus its guardrails**. A branch the role
takes only sometimes — a second mode it is dispatched in (the coder's fix round, the
writer's docs pass, the auditor's acceptance gate), a rare gate outcome (the lead's
promotion, a `mis-worded` grade, a failing lint floor), a recovery path, a fan-out — lives
in a **reference file** the role reads when the branch fires, so a dispatch never pays
for a mode it is not running. The rule for where a sentence goes: **who decides the
branch decides where it lives.** Decided by the dispatcher → the text leaves the body and
the `lead` names the file in the dispatch; decided by the role at run time → the trigger
stays in the body as one hard imperative naming the condition and the file, the handling
moves out; a guardrail that holds on the happy path (never provision the worktree, the
equality check before grading, the 3× stop) **stays in the body** however conditionally
it is phrased. Moving is not trimming: a rule moved to a reference is still a rule.

Where they live and how they are addressed — the harness substitutes both placeholders
anywhere they appear in agent and skill content:

- **Agent references** at the **plugin root**, `plugins/<plugin>/references/<file>.md`,
  addressed as `${CLAUDE_PLUGIN_ROOT}/references/<file>.md`. Never under `agents/`,
  which the harness scans for agent definitions.
- **Skill references** beside the skill, `skills/<name>/references/<file>.md`, addressed
  as `${CLAUDE_SKILL_DIR}/references/<file>.md`.

The drift hazard is a pointer to a file that was renamed or never created — the role
reads the pointer, the read fails, and it improvises the branch. This resolves every
pointer in every plugin and should print only `ok` lines:

```bash
grep -rnoE '\$\{CLAUDE_(PLUGIN_ROOT|SKILL_DIR)\}/references/[a-z-]+\.md' plugins/ \
| while IFS=: read -r file _ ref; do
    case "$ref" in
      *PLUGIN_ROOT*) root=$(echo "$file" | sed -E 's#^(plugins/[^/]+)/.*#\1#') ;;
      *)             root=$(echo "$file" | sed -E 's#^(.*/skills/[^/]+)/.*#\1#') ;;
    esac
    target="$root/references/${ref##*/}"
    [ -f "$target" ] && echo "ok    $file -> $target" || echo "MISSING $file -> $target"
  done
```

The canonical duplicated paragraphs above stay in the **bodies** — the drift greps read
the bodies, and a reference file is not loaded by every dispatch. A reference file that
needs the forge declaration says "the forge declaration", never `docs/FORGE.md`, so the
reader count in the forge section stays at three.

## Two plugins — keep the cross-plugin edge soft

The repo ships `ca77y-engineering` (pipeline: `auditor`, `junior-coder`,
`senior-coder`, `qa`, `writer`, plus the `analyst`, `lead`, `board`, and `forge` skills) and `ca77y-library` (research crew:
`researcher`, `librarian`, `scribe`, `clerk`, plus the `bootstrap` skill). They install
independently, and **no
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
grep -rn 'ca77y-engineering:\(researcher\|librarian\|scribe\|clerk\|bootstrap\)' plugins/
grep -rn 'ca77y-library:\(analyst\|auditor\|junior-coder\|senior-coder\|qa\|writer\|lead\|board\|forge\)' plugins/
```

The rationale for the split is recorded in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) under *Two plugins, one optional edge*.

## The board is declared, never hardcoded — at a fixed path

No agent may name a tracker, a card path, a status symbol, or a card field as a fact
about "the project". All of it comes from the fixed declaration at
[`docs/BOARD.md`](docs/BOARD.md) — bindings for locate/read/search/create/transition
(plus comment and update where the project authorises them), the card shape, the status
vocabulary, the visibility rule, and the write authority. When editing an agent, treat
any concrete tracker detail as a bug
unless it is explicitly framed as *one board's realization* of a semantic (the
README's Obsidian Tasks example, the analyst's format-quirk rule).

The declaration's own **path** is the one tracker fact this repo *does* hardcode, and
deliberately: every board-touching agent reads `docs/BOARD.md` directly, with no per-run
resolution step and no discovery order in between. That is narrower than it
sounds — fixing where the declaration lives asserts nothing about the board itself,
because the declaration is still what says which board, which statuses, and what may be
written. The path is fixed, so the file does not move; this link is a convenience for a
human reader, not the mechanism any agent relies on.

## The repository and its forge are declared, never hardcoded — at a fixed path

No agent may name a remote, a clone URL, a target branch, a branch pattern, a
commit-message convention, a forge, a forge CLI, a change-artifact command, or a review
trigger as a fact about "the project". All of it comes from the fixed declaration at
[`docs/FORGE.md`](docs/FORGE.md) — the repository and its remote, the target branch, the
worktree directory, where a branch name comes from, the commit convention and when a
push happens, bindings for branch/commit/push and for opening, updating, commenting on,
reading back, and re-firing the review on a change, what the change's description must
carry, the review and its trigger, and the write authority. Same fixed-path rationale as
the board: fixing where the declaration lives asserts nothing about the forge itself,
because the declaration is still what says which repository, which branch, and what may
be pushed.

**One asymmetry with the board is deliberate — do not "fix" it.** An absent
`docs/BOARD.md` lets a run proceed trackerless; an absent `docs/FORGE.md` **stops the
`lead` before it creates a workspace.** A status written to the wrong board is bad but
recoverable; a branch pushed to a remote the pipeline inferred, or a change opened
against a base it guessed, is a write into somebody else's repository that cannot be
taken back. The `forge` skill exists to author the file, and never authors it to unblock
a stopped run.

**Two registers, deliberately not unified.** An agent may say "PR" where it **names,
prohibits, or describes** — that is the familiar realization, the same license the
README's Obsidian Tasks example has. Role language ("the change") is for sentences that
**bind**, and appears in only three places, because only they must cover a forgeless
project: `docs/FORGE.md`, `plugins/ca77y-engineering/skills/forge/**`, and the `lead`'s
no-forge paragraph. Do not sweep one register into the other.

There is no canonical duplicated paragraph here, and no third drift grep, because forge
access does not vary by caller the way board access does: the `lead` has all of it,
every other role has none, permanently. What is worth checking instead is the negative —
that no agent has started naming a forge, and that the rename and the boundary held.
These should each print nothing, except the third, which prints exactly the three files
that may read the declaration:

```bash
grep -rnE '@codex|`gh`|gh pr |GitHub app|Codex GitHub|origin/' \
  plugins/ca77y-engineering/agents/ \
  plugins/ca77y-engineering/skills/{lead,board}/ plugins/ca77y-library/
grep -rnE '\b(master|trunk)\b|branch `main`|origin/main' plugins/
grep -rl 'docs/FORGE\.md' plugins/   # lead/SKILL.md, forge/SKILL.md, authoring-forge.md
grep -rn 'gitBranchName' docs/ plugins/   # exactly one line, in docs/FORGE.md
```

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
