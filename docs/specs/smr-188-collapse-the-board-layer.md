# Collapse the board layer onto a fixed declaration, pin acceptance criteria into the spec, and settle run-local scratch

- **Status**: Draft
- **Task**: SMR-188
- **Last Updated**: 2026-08-06
- **Document Scope**: One unit of work: the problem, change, and observable behavior that proves it ships

---

## Goal

### The problem

The pipeline reaches its board through an intermediate artifact — a `board-profile.md`
that the `board` skill resolves once per run and writes *beside* the story worktree. That
artifact is a transcription of `docs/ISSUE_TRACKING.md`, it is a cache the skill's own
*Hard rules* forbid trusting ("a profile left from an earlier run is a **hint**, not a
resolution — re-probe before trusting it", `plugins/ca77y-engineering/skills/board/SKILL.md:84`),
and it lives outside an isolated session's write boundary. Three consequences follow, and
this story removes all three at once.

1. **A layer that only restates the repo.** The declaration already says which board, which
   statuses, which card shape, and what may be written. The profile copies it and adds four
   run-local facts (when/by whom it resolved, the probe call and result, the card's resolved
   branch name, `Unresolved: nothing`) that belong in the ledger, plus one thing the
   declaration genuinely lacks — concrete bindings for `comment` and `update`.
2. **Criteria re-read and re-interpreted at every gate.** The `auditor` reaches the board on
   three separate dispatches per run and re-derives the same criteria each time, with nothing
   proving the three readings agree.
3. **Scratch outside the write boundary.** The ledger and the findings files sit next to the
   worktree by design, which is exactly where an isolated session cannot write them.

### The change

Seven interlocking parts, one PR, because a half-migrated board layer — some agents reading
a profile others no longer write — is worse than either end state:

1. The declaration's path becomes the fixed convention `docs/ISSUE_TRACKING.md`.
2. The `board` skill keeps only its **authoring** job.
3. `board-profile.md` and the probe step are deleted; the declaration carries the semantics,
   and gains `comment` / `update` bindings.
4. The `AGENTS_IMPROVEMENTS.md` path is fixed the same way, in all ten copies of the
   *Process feedback* paragraph.
5. The card's acceptance criteria are pinned into the spec as a labelled verbatim copy,
   licensed by a **mechanical equality check** the `lead` runs twice.
6. Board access becomes **caller-granted**: `writer` keeps read + search; the `auditor` has
   none in the `lead`'s two gates and keeps read + search in the `analyst`'s advisor gate.
7. Run-local scratch moves to `tmp/ledger.md` and `tmp/findings-round-<N>.md` **inside** the
   story worktree, untracked via one committed `.gitignore` entry.

Plus the repo's own tenets, reconciled in the same PR, because the story cannot ship a fixed
path while the repo's instructions call one a defect.

### Value

The pipeline loses a mandatory-invalidation cache, a synthetic probe call, and one of its
three scratch files outright. The gates gain a per-criterion label they can grade against
without three independent readings of the card. The remaining scratch moves inside the write
boundary, so the ordinary file tools reach it and no `bash` escape hatch is needed.

### Non-goals

- Bumping any plugin `version`. `ca77y-engineering` stays `2.3.0`, `ca77y-library` `1.0.0`,
  in all four manifests.
- Changing what the ledger or the findings files **contain**, or when they are written.
- Changing the commit model, the two human status gates, or which transitions the pipeline
  may make.
- Re-running the acceptance gate on a fix run against an open PR. The spec, and with it the
  transcription, is gone by then; the card stays the source.
- Making the root `CLAUDE.md`'s verification snippets *runnable under session isolation* —
  SMR-186 owns that. This story removes none of them and rewrites the `grep` pattern inside
  exactly one.
- Adding a hard dependency from `ca77y-engineering` to `ca77y-library`.

### This is a prose deliverable

The repo ships no `package.json`, no lockfile, and no test runner. The worktree's
dependency-provisioning status is **not provisioned — no install step**, which is the correct
state here and not a failure. Every artifact this story changes is Markdown, two `.json`
manifests, and one `.gitignore`. Consequently **there is no scenario test to write**: each
scenario below is falsifiable by reading a named file or by running a named shell command
whose expected output is stated, and the *Validation* section is the whole validation
procedure. `qa` runs that section rather than looking for a runner it will not find.

---

## Acceptance criteria (verbatim transcription)

> **Source**: card `SMR-188`, read from Linear via the `read` binding on **2026-08-06**, at
> status `In Progress`, **after** this spec pass's criterion correction was applied to the
> card (see *Deviations from the card*). That correction touched the `## Out of scope`
> section only; the `## Acceptance criteria` section is byte-identical before and after it,
> so the ordering rule part 5 introduces is satisfied trivially on this run.
>
> This is a **copy, not a summary** — one card bullet per `ACn` line, in card order, `n = 64`.
> What licenses the copy is not a promise that it is faithful: it is the `lead`'s mechanical
> equality check, run after this spec pass and again before every acceptance-gate dispatch.
> **Normalisation permitted by that check, and nothing else:** Linear's `-`-to-`*` bullet
> rewrite, and its wrapping of bare URLs in `<…>`. No criterion below contains a bare URL or
> an inline issue mention, so no normalisation is actually exercised on this card.
>
> This section is **run-local**: it dies with the spec at the docs pass, and the card stays
> the durable source.

- **AC1** — Every agent and skill that reaches the board names the declaration at the fixed path `docs/ISSUE_TRACKING.md`, and no shipped instruction tells a reader to discover that path from context.
- **AC2** — A run on a project whose `docs/ISSUE_TRACKING.md` is absent is not blocked, and the shipped wording names what happens instead.
- **AC3** — The template used to author a missing declaration is read only when the file is absent.
- **AC4** — The `lead` carries wording for a project with no declaration that does not depend on invoking the `board` skill.
- **AC5** — Neither `lead` nor `analyst` instructs invoking the `board` skill as a per-run step.
- **AC6** — The decision whether `board` remains a skill is recorded in `docs/ARCHITECTURE.md` with its rationale.
- **AC7** — The shipped `board` skill names `references/authoring-issue-tracking.md` and states which of its jobs loads it.
- **AC8** — The `board` skill's frontmatter `description` no longer describes resolving a profile for the pipeline to work from.
- **AC9** — No `.md` file under `plugins/`, under `docs/`, or at the repository root refers to a board profile or `board-profile.md`, in body prose or in frontmatter, including where the phrase is split across a line break.
- **AC10** — Neither `plugins/ca77y-engineering/plugin.json` nor `plugins/ca77y-engineering/.claude-plugin/plugin.json` describes the `board` skill as resolving a board profile.
- **AC11** — Those two manifests carry the same `version` as each other.
- **AC12** — `docs/CLAUDE.md` no longer states that the `board` skill resolves the tracking declaration.
- **AC13** — No shipped instruction tells any agent to probe a binding, and none forbids writing through an unprobed binding.
- **AC14** — `docs/ISSUE_TRACKING.md` binds `comment` and `update` to concrete calls.
- **AC15** — The shipped wording states, for each run-local fact the deleted profile carried, whether it is now recorded in the ledger or dropped.
- **AC16** — The phrase "discover that folder from context, never hardcode it" appears nowhere under `plugins/`.
- **AC17** — All ten files carrying the *Process feedback* paragraph name `docs/AGENTS_IMPROVEMENTS.md` at a fixed path.
- **AC18** — That paragraph still resolves to exactly two distinct variants across those ten files.
- **AC19** — The root `CLAUDE.md` section *The improvements log is cleared as it is converted* is byte-identical to its state at `f87eedc`.
- **AC20** — `README.md` and `docs/ARCHITECTURE.md` no longer assert that the improvements-log path is resolved from context or never hardcoded.
- **AC21** — `docs/_templates/spec.md` carries a section for the verbatim acceptance-criteria transcription, with per-criterion labels and a stamp naming the card identifier and the state it was read at.
- **AC22** — The `writer`'s spec pass is instructed to transcribe the card's `## Acceptance criteria` verbatim, one behaviour per line, labelled `AC1`…`ACn`.
- **AC23** — The shipped wording states that the transcription is taken after any criterion correction the spec pass makes on the card.
- **AC24** — The `lead` performs a mechanical equality check between the spec's transcription and the card's criteria after the spec pass, and again before every acceptance-gate dispatch including each re-audit round.
- **AC25** — The equality check normalises only the `-`-to-`*` bullet rewrite and the bare-URL wrapping.
- **AC26** — The `lead` skill states that the equality check is a comparison and not a judgement of whether any criterion is met.
- **AC27** — A failed equality check routes to a respec rather than to grading.
- **AC28** — The shipped wording explains why a checked verbatim copy is permitted where a paraphrase is not, rather than asserting the copy is faithful.
- **AC29** — The spec gate verifies every `ACn` maps to at least one requirement or scenario, and treats a requirement mapped to no `ACn` as a finding unless it is explicitly marked deliberate scope.
- **AC30** — A criterion whose owning mechanism is not a build step maps validly under that rule.
- **AC31** — The acceptance gate returns a verdict per `ACn` label.
- **AC32** — `auditor.md` grants no board access in the two gates the `lead` dispatches, and states that it has none there.
- **AC33** — `auditor.md` states that its board access is granted per dispatch by the caller.
- **AC34** — The story-advisor gate the `analyst` dispatches retains board read and search, and board-side duplicate detection is still performed somewhere in an `analyst` run.
- **AC35** — `analyst.md` names no board profile in its advisor-gate dispatch.
- **AC36** — `auditor.md` no longer instructs reading criteria from the board or refusing a restatement.
- **AC37** — The shipped wording names where board-side duplicate detection happens in a `lead` run, given the auditor no longer performs it there.
- **AC38** — `writer.md` retains both read and search access to the board.
- **AC39** — `coder.md` and `qa.md` still grant no board access.
- **AC40** — The canonical caller-granted board paragraph is byte-identical in `plugins/ca77y-engineering/agents/writer.md` and `plugins/ca77y-engineering/agents/auditor.md`.
- **AC41** — The root `CLAUDE.md`'s drift check for that paragraph matches its new opening and prints `1`.
- **AC42** — The root `CLAUDE.md` prose describing that paragraph names the same two files the check covers.
- **AC43** — Every drift check the root `CLAUDE.md` still carries prints the value that file says it prints.
- **AC44** — The shipped wording names, for a session the harness has isolated into the story worktree, the directory, both filenames, and the tool used to write the ledger and each findings file.
- **AC45** — The stated method writes the ledger and each findings file with the ordinary file tools, and needs no `bash` command for any scratch write.
- **AC46** — The shipped wording names the mechanism that guarantees no commit step can sweep a scratch file into a story commit.
- **AC47** — The resolution requires exactly one committed ignore entry in a target project, documented as a setup requirement alongside the entry for that project's worktree directory.
- **AC48** — A file-tool write to `tmp/` inside the story worktree, made after the session has entered that worktree by `path`, is performed during this story's own run rather than asserted.
- **AC49** — `docs/ARCHITECTURE.md` records that write's outcome together with the dispatch mode the run was invoked in, so that "the guard never fired" is distinguishable from "the guard was never attempted".
- **AC50** — `docs/ARCHITECTURE.md` stops stating that nothing shipped verifies whether `path`-form entry clears the write guard on either outcome that settles the question — the run met the guard and entering by `path` cleared it, or the run met the guard and entering by `path` did not clear it — and it records which of the two occurred.
- **AC51** — On either outcome that does not settle the question — a background run whose guard never fired, or a foreground run that could not have met it — `docs/ARCHITECTURE.md` states that the question is still open and names which of the two left it open.
- **AC52** — An outcome where the guard was met and entering by `path` did not clear it is escalated as a blocker on this story rather than shipped as a quietly closed fact, because it falsifies the premise that the relocated scratch can be written at all. The escalation is **in addition to** recording which outcome occurred, not instead of it.
- **AC53** — `docs/ARCHITECTURE.md` records the rationale for the settled scratch location, and names each of the four rejected alternatives with the reason it was rejected.
- **AC54** — The `lead`'s *Invoked on an open PR* recovery step recovers from the card's handoff comment, the PR description, and `git log`, and treats a surviving `tmp/ledger.md` as a bonus rather than something recovery depends on.
- **AC55** — `docs/ARCHITECTURE.md` and `README.md` describe the same scratch location and the same reason as the `lead` skill.
- **AC56** — The ledger and the findings files are written at `tmp/ledger.md` and `tmp/findings-round-<N>.md`, with no branch qualifier in either name.
- **AC57** — This repository's committed `.gitignore` carries a `tmp/` entry alongside its `.worktrees/` entry.
- **AC58** — `docs/PRODUCT.md` § *Requirements it places on target repos* states both ignore entries — the worktree directory and `tmp/` — as setup requirements a target repo must satisfy, and the `README.md` setup prose agrees with it.
- **AC59** — No shipped instruction states that run-local scratch lives beside, or outside, the story worktree.
- **AC60** — The shipped wording states that run-local scratch does not outlive the story worktree, and names the durable records recovery uses instead.
- **AC61** — The root `CLAUDE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, and `README.md` contain no statement that a fixed declaration path is a defect or that the declaration may live anywhere the project's context documents it.
- **AC62** — `docs/PRODUCT.md` states that the declaration's location is a convention while which board is used, and how it is reached, stay resolved from the declaration.
- **AC63** — No file in `plugins/ca77y-library/` dispatches, or declares a dependency on, any `ca77y-engineering` agent or skill.
- **AC64** — The `version` in every `plugins/*/plugin.json` and every `plugins/*/.claude-plugin/plugin.json` is unchanged by this story.

---

## Design

### The migration surface, regenerated at `f87eedc`

Every figure below was regenerated in this worktree at `f87eedc` during the spec pass. Where
it differs from the card's, the difference is stated.

| Measure | At `f87eedc` | Card's figure |
| --- | --- | --- |
| `board profile` / `board-profile`, **matching lines**, `*.md` only | 27 across 9 files (26 body + 1 frontmatter) | same |
| …**occurrences** per line, `*.md` | 31 | not stated |
| …occurrences **wrap-aware**, `*.md` | **33** | not stated (card states the two per-file deltas) |
| …occurrences wrap-aware, `*.json` | 2 (both `ca77y-engineering` manifests) | "not covered by either count" |
| **Total wrap-aware, all file types** | **35** | not stated |
| Files where a wrap hides an occurrence | exactly 2 — root `CLAUDE.md` (§ *The board is resolved, never hardcoded*) and `docs/ARCHITECTURE.md` (§ *Two plugins, one optional edge*); 4 wrap-aware vs 3 per line in each | same |
| Bare word `profile`, `*.md` | **106** across 10 files — `lead/SKILL.md` 31, `board/SKILL.md` 19, `writer.md` 13, `analyst.md` 13, `README.md` 9, `auditor.md` 8, `ARCHITECTURE.md` 7, `CLAUDE.md` 4, `ISSUE_TRACKING.md` 1, `references/authoring-issue-tracking.md` 1 | same |
| Bare word `profile`, all file types | **108** (the 106 plus 1 per manifest) | not stated |
| *Process feedback* paragraph | 10 files, exactly 2 byte-identical clusters (7 + 3, as the card names them) | same |
| Files documenting the scratch location | exactly 3 — `lead/SKILL.md`, `docs/ARCHITECTURE.md`, `README.md` | same |
| `board/SKILL.md` | 113 lines, the 8 sections the card names | same |
| Output-asserting snippets in root `CLAUDE.md` | **4** — see *Deviations from the card* | 3 (corrected on the card) |
| Manifest versions | `ca77y-engineering` `2.3.0` / `2.3.0`; `ca77y-library` `1.0.0` / `1.0.0` | same |

**All 108 bare-`profile` occurrences are about the board profile.** Each was read during the
spec pass; none is an unrelated use of the word. That makes **zero** the correct target for
the residual check below, with no allow-list.

### The scan method — wrap-aware and file-type-agnostic

The card names a partial migration as this story's main risk, and both of the obvious sweeps
fail on it: a per-line `grep` misses the two wrapped occurrences, and an `--include='*.md'`
sweep misses both manifests. So the requirements are checked by **two independent scans**,
and neither is the `grep` that already missed an occurrence.

**Scan A — wrap-aware, all tracked `*.md` and `*.json`.** Normalises every whitespace run to
one space *before* matching, so a phrase split across a line break is found:

```bash
# Run from the story worktree root. Baseline at f87eedc: TOTAL 35. Target: TOTAL 0.
python3 - <<'PY'
import re, subprocess
files = [f for f in subprocess.check_output(['git','ls-files'], text=True).split()
         if f.endswith(('.md', '.json'))
         and not f.startswith('.obsidian/')
         and not f.startswith('docs/specs/')]
total = 0
for f in files:
    t = re.sub(r'\s+', ' ', open(f).read())
    n = len(re.findall(r'board[ -]profile', t, re.I))
    if n:
        print(f'{n:3d}  {f}')
        total += n
print('TOTAL', total)
PY
```

**Scan B — the wrap-immune cross-check.** The bare word cannot be split by a line break, so
this scan cannot be fooled by wrapping at all, and it is blind to file type:

```bash
# Run from the story worktree root. Baseline at f87eedc: 108. Target: 0.
git ls-files \
  | grep -E '\.(md|json)$' \
  | grep -vE '^\.obsidian/|^docs/specs/' \
  | tr '\n' '\0' | xargs -0 grep -ohiE 'profile' | wc -l
```

Both exclude `docs/specs/`, because this spec quotes the phrase it is removing; the docs pass
deletes the spec, so the final post-docs-pass run of both scans covers the whole tree with no
exclusion but `.obsidian/`. Any residual hit at ship time is a **named exception with a
reason in the report**, never a silent survivor.

### Part 1 — the declaration at a fixed path

`docs/ISSUE_TRACKING.md` becomes the one place every board-touching agent reads. What goes:
the *Discovery order* instruction to take the path from context, and the rule forbidding a
search for a file the context does not point at. What stays untouched: the rule that no agent
may assert a **tracker** — a card path, a status symbol, a card field — as a fact about the
project. Fixing where the *declaration* lives asserts nothing about the tracker, because the
declaration is still what says which board, which statuses, and what may be written.

Absent-file behaviour is not "blocked". The shipped wording says what happens instead: the
run proceeds trackerless off the spec, and the recommendation to write a declaration is
relayed. The authoring template is read **only at create time**, so the common path — the
file exists — costs no context.

### Part 2 — the `board` skill keeps only authoring

The `Resolve` half goes: *Discovery order*, *A binding is not resolved until it has been
probed*, *The profile*, and the profile template. `lead` and `analyst` stop invoking it per
run. **It remains a skill** — the judgement to record with its rationale in
`docs/ARCHITECTURE.md`: the `Author` half is substantial, it owns
`references/authoring-issue-tracking.md`, `docs/PRODUCT.md` advertises it as help for writing
a declaration, and it is a legitimate user-invocable setup and inspection entry point.
Collapsing it to one line would orphan that reference. Its frontmatter `description` stops
describing a per-run resolver.

### Part 3 — the profile and the probe go

The artifact, the probe step, the "never write through a binding that was not probed" rule
wherever it appears, and the `lead`'s *Re-resolve the board* step are all removed. With no
profile to validate, the `lead`'s first real operation — reading the card at step 1 — fails
informatively on its own, before any write.

`docs/ISSUE_TRACKING.md` gains concrete bindings for **`comment`** and **`update`**, the two
operations its *Operations* section never bound and only the profile did.

The four run-local facts the profile carried are each explicitly disposed of in the shipped
wording — recorded in the ledger, or dropped:

| Fact | Disposition |
| --- | --- |
| When and by whom it resolved | **Dropped.** The ledger's own existence and the run it belongs to carry it. |
| The probe call and its result | **Dropped.** Part 3 deletes the probe. |
| The card's resolved `gitBranchName` | **Ledger.** It already records the branch and the worktree. |
| `Unresolved: nothing` | **Dropped.** An unbound operation is now read from the declaration at the point of use. |

### Part 4 — the improvements-log path

The clause "discover that folder from context, never hardcode it" leaves the *Process
feedback* paragraph in all **ten** files, and the paragraph keeps its **two**-cluster
structure (7 files in the plain variant; `ca77y-library/agents/{clerk,librarian,scribe}.md`
in the variant with the extra library clause). The matching assertions in `README.md`
("resolved from project context, never a hardcoded path") and `docs/ARCHITECTURE.md`
§ *The self-improvement channel* flip too.

The root `CLAUDE.md` section *The improvements log is cleared as it is converted* is
**out of bounds** and must stay byte-identical to `f87eedc`.

### Part 5 — the pinned transcription and its guard

The spec carries the card's `## Acceptance criteria` verbatim, one behaviour per line,
labelled `AC1`…`ACn`, stamped with the card identifier and the state it was read at.
`docs/_templates/spec.md` gains the section; it has none today.

**Why a checked copy is permitted where a paraphrase is not.** The shipped wording must state
the reason rather than assert the copy is faithful. The existing rules — the `lead`'s "name
the card and the profile, not the criteria" and `auditor.md`'s "do not accept a restatement"
— are aimed at *paraphrase*, whose failure mode is drift toward what the work already does.
A copy has the same failure mode **unless something proves it did not happen**. That proof is
the `lead`'s mechanical equality check: it runs after the spec pass and again before **every**
acceptance-gate dispatch, including each re-audit round, because a fresh auditor each round
would otherwise grade an unguarded copy. The check normalises **only** Linear's `-`-to-`*`
bullet rewrite and its `<…>` wrapping of bare URLs. A mismatch routes to a **respec**, never
to grading a stale list.

Comparing two strings is not judging whether a criterion is met, so the new duty does not
breach the rule that the `lead` never judges acceptance — and the skill says so in those
terms.

**Ordering.** `writer.md` already authorises correcting a criterion the design proves
unsatisfiable, on the card, during the spec pass. The transcription is taken **after** any
such correction. Without that ordering the check fails on exactly the path the pipeline
exists to support. *(This run exercises it: a correction was made — see* Deviations *— and
the transcription above was taken after it.)*

**The gates.** The spec gate checks every `ACn` maps to at least one requirement or scenario,
and treats a requirement mapped to no `ACn` as a finding unless explicitly marked deliberate
scope. A criterion whose owning mechanism is **not a build step** maps validly under that
rule. The acceptance gate returns a verdict **per `ACn`**.

The transcription is run-local and dies with the spec at the docs pass; the card stays the
durable source. The live drift window is therefore spec-gate → build, because
`docs/ISSUE_TRACKING.md` already freezes criteria between the build and the gate that judges
it.

### Part 6 — board access becomes caller-granted

| Role | Board access after this story |
| --- | --- |
| `lead` | read, the two status transitions, comment, PR attachment — plus the two new equality checks |
| `writer`, spec pass | **read and search.** The sibling sweep cannot come from a prompt; on the SMR-184 run it found two real contradictions, one in the source card itself |
| `auditor`, in the `lead`'s two gates | **none**, and it says so |
| `auditor`, in the `analyst`'s advisor gate | read and search, **granted by that caller** |
| `analyst` | unchanged (search, read, create), minus the profile |
| `coder`, `qa` | none — unchanged; a no-regression check, not an edit |

**The named rewrite.** `auditor.md`'s `## The acceptance gate` currently sets its standard as
"the card's acceptance criteria **as the profile's `read` binding returns them**", falling
back to the spec only when there is no board. That **inverts**: the spec's labelled
transcription becomes the standard and the card is not read at all. Treat that section as an
explicit rewrite, not something to infer from parts 5 and 6. The same file's "Read the
criteria from the board yourself; do not accept a restatement" goes with it.

**The consequence to state, not let lapse.** With the auditor off the board in the
spec-readiness gate, that gate loses board-side duplicate detection. The `writer`'s sibling
sweep becomes the **only** board-side duplicate check in a `lead` run, and the shipped wording
names it as such.

**The canonical paragraph survives in both files, renamed.** "Working from the board profile."
is byte-identical in `writer.md` and `auditor.md` today because both received an identical
profile. Neither receives one afterwards, but **both still receive board access from their
caller** — the `writer` always, the `auditor` only from the `analyst`. So one statement is
true of both without divergence: *your access is whatever the caller named; you read the
declaration at `docs/ISSUE_TRACKING.md`; where the caller named nothing you have none and say
so.* That is what keeps it a genuine shared paragraph rather than two files that merely look
alike.

**Therefore the drift check survives with a new pattern.** The root `CLAUDE.md`'s second
drift-check snippet **and the prose describing it** are updated, not removed: the `grep`
pattern becomes the paragraph's new opening, over the same two files, and it must still print
`1`. The rejected alternative — let the two contracts diverge and delete the check — would
drop the only guard on a paragraph that still exists twice. The five-file worktree paragraph
and the manifest-parity loop are untouched.

### Part 7 — run-local scratch inside the worktree

**Settled by the owner on 2026-08-06, and not reopened by the build.** The ledger and the
findings files move to `tmp/ledger.md` and `tmp/findings-round-<N>.md` inside the story
worktree, kept untracked by **one committed** `.gitignore` entry. `tmp/` is the owner's
explicit choice, taken over a recommendation to namespace the directory against a collision
in a target project. The build settles exactly one mechanical question: whether the entry is
written **anchored** (`/tmp/`) or **unanchored** (`tmp/`) — a choice about match depth, not a
renaming.

**The branch qualifier goes.** It existed only because one shared directory held every
story's scratch. It also removes a quirk: a `/` in the branch name made the old path nest —
`.worktrees/<branch>.ledger.md` resolves to `.worktrees/tokwieci/smr-…ledger.md` today.

**The guard against a sweep is the ignore entry itself**, stated at that level deliberately:
`lead/SKILL.md`'s commit model names no specific git invocation, so pinning the rationale to
`git add -A` would assert more than the shipped wording does. Verified in this worktree at
`git version 2.55.0` — see *Citations and assumptions*.

**Durability changes, and that is the real cost.** Scratch inside the worktree dies with the
worktree; `git worktree remove` takes it, and this repo removes the worktree once the PR
merges. So the `lead`'s *Invoked on an open PR* recovery rests on records durable by
construction — the card's handoff comment, the PR description, and `git log` — with a
surviving `tmp/ledger.md` a **bonus**, not what recovery depends on. The SMR-184 ledger
reached ~19 KB, which is exactly why the durable record has to be the card and the PR.

**The imposition on a target repo is one line, and the first such line is already
mandatory.** A repo adopting the toolkit must already ignore its worktree directory or drown
in untracked noise, and this repo commits exactly that entry (`.gitignore:12`,
`.worktrees/`, under `# Story worktrees`). Verified at `f87eedc`: **that requirement is
nowhere documented.** `docs/PRODUCT.md` § *Requirements it places on target repos* names the
vault, its plugins, and the docs paths and says nothing about ignoring anything; `README.md`
mentions `.worktrees/` being gitignored only incidentally, inside its context-discipline
paragraph. So the build **establishes** the setup requirement in that `PRODUCT.md` section,
covering **both** entries together, and the `README.md` setup prose agrees with it.

**The three surfaces that document the location all currently assert the inverse** — that
these files live *next to* the worktree, outside it, so no commit step can reach them. The
assertion is **deleted**, not repointed:

- `plugins/ca77y-engineering/skills/lead/SKILL.md` — *Paths, not content*, *The ledger*, and
  the workspace-recovery step under *Invoked on an open PR*.
- `docs/ARCHITECTURE.md` — the orchestration-state paragraph under *A flat topology*.
- `README.md` — the context-discipline paragraph.

`board/SKILL.md`'s own scratch statement sits inside *The profile*, which part 3 deletes, so
nothing survives there.

**The ledger's structure does not change.** With file tools working inside the worktree it
stays exactly as it is today, relocated.

#### The write demonstration, and what this run actually observed

The card requires the write to be **demonstrated, not asserted**, and requires the record to
name the **dispatch mode** alongside the outcome — because without the mode, "guard never met"
reads identically whether the run was a background job that never saw a refusal or a
foreground run that never could.

**Observed on this run, and to be built on rather than re-derived** *(reported by the `lead`
during the spec pass; the `writer` did not and cannot observe the top-level session's own
dispatch mode)*:

- **Dispatch mode**: the `lead` session runs as a **background job**.
- Its harness context states the session is configured to work **in place** rather than
  isolating into a worktree.
- Its **first write of the run** — a `Write` to `.worktrees/board-profile.md`, i.e. *outside*
  any worktree — **succeeded without `EnterWorktree`**.
- Therefore **the write guard never fired**.

That is **outcome 3** of the card's four-way partition: *background job, guard never fired*.
It does **not** settle whether `path`-form entry clears the guard, because the mechanism was
never exercised. The shipped `docs/ARCHITECTURE.md` text must therefore:

| Criterion | How it resolves on outcome 3 |
| --- | --- |
| **AC48** | Satisfied by a real write, not an assertion — the `lead` performs a file-tool write to `tmp/` inside the worktree once the build has landed the `.gitignore` entry, and reports the result. This is **separable** from the guard question: the write proves the location is writable; it does not test a guard that never fired. |
| **AC49** | Satisfied: the paragraph records the outcome **and** the dispatch mode (background job), so "guard never fired" is distinguishable from "guard never attempted". |
| **AC50** | **Antecedent false, so vacuously satisfied.** Its condition is "on either outcome that settles the question", and neither settling outcome occurred. The `docs/ARCHITECTURE.md` sentence "Nothing shipped verifies that `path`-form entry clears it either" therefore **stays**, and the shipped text says explicitly why it stays. The acceptance gate must grade AC50 on that reasoning rather than as unmet. |
| **AC51** | **The live criterion.** The paragraph states the question is still open and names which of the two non-settling branches left it open: *the run was a background job but the guard never fired* (not: a foreground run that could not have met it). |
| **AC52** | Not triggered — the guard was not met, so there is no "met and not cleared" outcome to escalate. If the `lead`'s later `tmp/` write is refused, that **is** an escalation as a blocker on this story, in addition to recording the outcome. |

**Do not write the guard question as settled**, and do not let the paragraph imply the run
tested something it did not.

**The neighbouring paragraph.** `docs/ARCHITECTURE.md`'s *Where the remedy is stated* needs no
change on this point: the `lead`'s first write is still that step's ledger — now inside the
worktree rather than beside it.

#### The four rejected alternatives, recorded in `docs/ARCHITECTURE.md`

1. **Keep the current location**, writing through plain single `bash` commands. Rejected **on
   principle**: if the design must reach for a shell escape hatch because the tool that exists
   for writing files is refused, on a path taken before every dispatch and every turn end, the
   design is broken. It also rests on an unverified claim — that `bash` reaches outside the
   boundary at all — evidenced only by one background run.
2. **A per-clone `.git/info/exclude` entry.** Unnecessary once a single committed entry is
   accepted, unverified for linked worktrees, and writing the main repo's `.git/` sits uneasily
   with the never-write-the-root-checkout rule even though `.git` is not the working tree.
3. **A pathspec exclusion at commit time** (`git add -A ':(exclude)tmp/'`). Needs no ignore
   file, but every commit step has to remember it, and forgetting once sweeps scratch into a
   story commit. The ignore entry buys the same outcome with nothing to forget.
4. **Reusing the worktree directory's own name inside the worktree**, relying on the ignore
   pattern the project must already have. Rejected: it depends on that pattern being
   depth-agnostic rather than anchored, which the toolkit cannot dictate, and a `.worktrees/`
   nested inside a worktree reads as a mistake to whoever finds it.

### Reconciling the repo's own tenets, in the same PR

The story cannot ship a fixed path while the repo's instructions forbid one.

- **Root `CLAUDE.md` § *The board is resolved, never hardcoded*** — retitle and rewrite.
  **Keep** the load-bearing half ("No agent may name a tracker, a card path, a status symbol,
  or a card field as a fact about 'the project'"), which this story does not weaken. **Drop**
  the clause making the declaration's own path context-derived, and invert the pointer
  paragraph's rationale.
- **`docs/PRODUCT.md` § *Principles*** — "The board is resolved, never assumed" and
  "Hardcoded paths are a defect" both take the carve-out: the declaration's *location* is a
  convention; everything about the tracker stays resolved from the declaration. Under
  *Requirements it places on target repos*, "That requirement covers the **docs and library**
  …, not the board" must now include the declaration, and "canonically in an
  `ISSUE_TRACKING.md` … **or anywhere else its context already documents itself**" loses its
  trailing clause — that clause is the direct contradiction.
- **`docs/ARCHITECTURE.md`** — the `board` skill / profile paragraph, and *The
  self-improvement channel*.
- **`README.md`** — ***Bring your own board*** is a **structural rewrite**, not a phrase
  deletion: its Probe table row, its discovery-fallback chain, and its blocked/none resolution
  logic are all mechanism this story removes. Budget judgement for it. Also the
  board-resolution table row, the "never writes through a binding that was not probed" claim,
  the improvements-log paragraph, and the Layout tree's `board/SKILL.md` comment.
- **`docs/CLAUDE.md`** — its layout entry reads "`ISSUE_TRACKING.md` # How this repo's board
  is reached; the board skill resolves it", which part 2 makes false.
- **`docs/_templates/CLAUDE.md`** — its rule "Keep the spec order `Goal -> Design ->
  Requirements -> Tasks`; pipeline agents parse that contract" becomes incomplete once
  `spec.md` gains the transcription section. *(Not named on the card; found during the spec
  pass and added to scope as a doc the merged work makes wrong.)*
- **Both `ca77y-engineering` manifests.** `plugins/ca77y-engineering/plugin.json` and
  `plugins/ca77y-engineering/.claude-plugin/plugin.json` each describe the `board` skill as
  resolving into a board profile, in `description`. These are `.json`, so every `*.md` sweep
  misses them. Edit both together per the manifest-parity rule, and change **only** the
  description — `version` stays put. Note their wording differs today ("the pipeline works
  from" vs "every board-touching agent works from"); parity is required on `version`, not on
  description prose.

### Boundary

**In bounds** (paths relative to the story worktree root):

- `docs/ISSUE_TRACKING.md`
- `plugins/ca77y-engineering/skills/board/SKILL.md` and
  `plugins/ca77y-engineering/skills/board/references/authoring-issue-tracking.md`
- `plugins/ca77y-engineering/skills/lead/SKILL.md`
- `plugins/ca77y-engineering/agents/{analyst,auditor,writer,coder,qa}.md`
- `plugins/ca77y-library/agents/{clerk,librarian,researcher,scribe}.md` — **the *Process
  feedback* paragraph only**
- `plugins/ca77y-engineering/plugin.json` and
  `plugins/ca77y-engineering/.claude-plugin/plugin.json` — **`description` only**
- `CLAUDE.md`, `README.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`
- `docs/_templates/spec.md`, `docs/_templates/CLAUDE.md`
- `.gitignore`
- this spec, `docs/specs/smr-188-collapse-the-board-layer.md`
- `docs/AGENTS_IMPROVEMENTS.md` — **append-only**, per the *Process feedback* rule

**Out of bounds, and a finding if touched:**

- The `version` field in **any** of the four manifests (AC64).
- Root `CLAUDE.md` § *The improvements log is cleared as it is converted* — byte-identical to
  `f87eedc` (AC19).
- Root `CLAUDE.md`'s five-file worktree drift check and the manifest-parity loop — content
  unchanged; they are only *re-run* (AC43).
- `plugins/ca77y-library/plugin.json` and `plugins/ca77y-library/.claude-plugin/plugin.json`.
- Any dispatch relationship between the two plugins (AC63): part 4 edits four `ca77y-library`
  agent files, but only their own prose about a project-level path.
- `.obsidian/`, `.github/`, `docs/issues/`, `docs/README.md`, `docs/_templates/story.md`,
  `.claude-plugin/marketplace.json`.
- The existing entry in `docs/AGENTS_IMPROVEMENTS.md` (about the writer's citation rule): this
  story neither converts nor retires it, so it stays.

**Every scenario below is runnable inside this Boundary.** Each asserts over a file the
Boundary permits, using `git`, `grep`, or `python3` — all present in the worktree and none
dependent on project dependencies, which is what makes the *not provisioned* status
harmless here. Two things fall outside it, both named with their owning mechanism under
*Criteria no build step can satisfy*: **AC48**, which no build step can perform at all, and
**AC52's escalation action**, which only the `lead` can take. AC52's *shipped wording* is inside
the Boundary and tasked at T19a.

### Coordination

Five overlaps, all real at `f87eedc`. **Whichever of any pair lands second reconciles with
the other's shipped wording rather than restating or reverting it.**

- **`lead/SKILL.md`** — also edited by **SMR-187** (step 7, *Final handoff*), **SMR-182**
  (step 7), **SMR-144** (the spec-commit point, which is exactly where part 5 inserts its
  first equality check).
- **`writer.md`** — also edited by **SMR-183**, **SMR-185**, **SMR-179**, **SMR-181**,
  **SMR-157**.
- **`auditor.md`** — also edited by **SMR-183**, **SMR-185**.
- **`coder.md` / `qa.md`** — also edited by **SMR-157**, **SMR-181**.
- **`README.md`** — also edited by **SMR-181**, **SMR-182**. **`docs/ARCHITECTURE.md`** — also
  by **SMR-183**. **`docs/_templates/`** — also by **SMR-136**.

**Shared-infrastructure collisions** — this story scopes four things a sibling may also
provision. Detected by a sibling sweep over the board's `search` binding during the spec pass:

1. **A provenance stamp in `docs/_templates/`.** This story adds a card-identifier-and-state
   stamp to `spec.md`; **SMR-136** adds a commit-or-date verification stamp to `story.md`.
   *If SMR-136 lands first, reuse its stamp shape rather than inventing a second one.*
2. **A provenance-citation convention.** **SMR-185** requires "the file path plus the line or
   key that shows it" at a named commit; **SMR-136** requires a commit-or-date stamp; this
   story requires the card-identifier stamp. *Whichever lands first establishes the shape;
   the later one adopts it.*
3. **The root `CLAUDE.md` snippets.** **SMR-186** may move all of them into a checked-in
   script; this story rewrites one snippet's `grep` pattern in place. *If SMR-186 lands first,
   change the pattern inside whatever form it left behind rather than restoring a bash fence.*
4. **A new project-level scratch directory.** This story adds `tmp/` plus **the only ignore
   entry any card adds**; **SMR-151** floats a committed `docs/_pending-readme/<slug>.md`.
   Same class of decision, opposite tracking posture. *If SMR-151 lands first, do not fold its
   directory into the ignore entry — it is meant to be committed.*

**Not a collision, recorded so it is not mistaken for one:** SMR-181 adds a named "tell-sweep"
convention to `coder.md` and `writer.md` and deliberately declines to make it a byte-identical
canonical pair, so it adds no `grep` pattern.

**SMR-187 is not shipped**, so this run executes the **shipped** (pre-change) definitions in
every pass it dispatches, including the docs pass — regardless of what the branch says. The
build must not assume its own changed wording retroactively governs this run.

### Deviations from the card

**One criterion-adjacent correction, applied to the card during this spec pass**
(the profile's write authority permits correcting card content; the `## Acceptance criteria`
section was **not** touched, so the transcription above is unaffected).

- **Card sentence, `## Out of scope`, at read time:** *"The three `CLAUDE.md` verification
  snippets as a runnability problem — SMR-186 owns that. This story only **removes** one of
  the three."*
- **Why it could not stand.** It contradicts the card's own settled resolution twice over:
  part 6 says the second drift-check snippet is *"**updated, not removed**"*, and the
  References note says *"there are still three snippets either way, so neither card's count
  changes — only the pattern inside one of them."* More decisively, **AC41** requires that
  check to still exist and print `1`. A build reading the out-of-scope line as licence to
  delete a snippet would make AC41 unsatisfiable. Two of the card's three statements agree the
  check survives; the out-of-scope line is the stale one, a leftover from the rejected
  "let the contracts diverge and delete the check" alternative part 6 names.
- **Second defect in the same sentence — a regenerated count.** At `f87eedc` the root
  `CLAUDE.md` carries **four** output-asserting snippets, not three: the two
  canonical-paragraph `grep`s (each *"should print `1`"*, fences at lines 50–54 and 63–66),
  the cross-plugin dispatch-name `grep` pair (*"This should print nothing"*, fence at 85–88),
  and the manifest-parity loop (*"Every plugin should print `ok`"*, fence at 152–158). **AC43**
  says "Every drift check the root `CLAUDE.md` still carries prints the value that file says
  it prints" — so it covers all four, and *Validation* below runs all four.
- **What the card now says.** The bullet was rewritten to: keep the runnability carve-out to
  SMR-186; state that this story **removes none of them** and changes only the `grep` pattern
  inside one; record the four-snippet count with the correction's date and commit; and note
  that SMR-186's "three checks" framing predates the count, with whichever card ships second
  reconciling it.
- **Follow-up it implies:** SMR-186's own body says "The three checks are this repo's only
  drift guards" and cites `CLAUDE.md:40-44`, `53-56`, `94-100` — all three line ranges already
  stale at `f87eedc`, and the count wrong. Reported as a board follow-up on that card rather
  than edited here, because it is that story's own scope.

**No other criterion was corrected.** Every remaining count the card asserts was regenerated
and matched (see the table under *The migration surface*).

**One card figure left as-is because it cannot be re-verified:** "the profile the SMR-184 run
produced is 60 lines". That file has since been overwritten by this run's profile (74 lines),
so the original is unrecoverable. The claim is not load-bearing — part 7's resolution
explicitly does not rest on it — and it is recorded here as unverifiable rather than
silently accepted.

### Citations and assumptions

Per the spec-pass citation rule, each load-bearing claim about something outside this repo is
cited at a resolved version, or marked as an assumption with why it could not be cited. One
citation per independently-falsifiable mechanism.

**Cited — `git`, resolved version `git version 2.55.0` (read in this worktree):**

1. *An ignore entry makes a path invisible to a staging command.*
   `git -C <repo> check-ignore -v .worktrees/anything.md` → `.gitignore:12:.worktrees/	.worktrees/anything.md`, exit 0.
2. *Staging an ignored path requires an explicit force flag.*
   `git add -h` → `-f, --[no-]force      allow adding otherwise ignored files`.
3. *A non-force staging command adds an ignored path nothing, and says so.*
   `git add --dry-run .worktrees/` → `The following paths are ignored by one of your .gitignore files:` / `hint: Use -f if you really want to add them.`, with nothing staged.

   **Stated precondition, because it is the one way this mechanism fails:** an ignored path
   that is **already tracked** continues to be staged by `git add -A`. `tmp/` is never
   tracked in this design, so the precondition holds — but the shipped wording must not claim
   the ignore entry protects an already-tracked file.

**Cited — the harness, at the version running this session, by tool description rather than
path-and-line:**

4. *`EnterWorktree`'s `path` form enters an existing worktree and its `name` form creates a
   new one under `.claude/worktrees/`; on a session's first entry from the launch directory
   the `path` form accepts a path registered in `git worktree list` for the owning
   repository.* Read from the `EnterWorktree` tool description as loaded in this session.
   **Marked as a non-path-and-line citation:** the harness is in no dependency tree and ships
   as a compiled binary, so no file and line exists. This is the gap
   `docs/AGENTS_IMPROVEMENTS.md`'s existing entry proposes closing; until it is, the citation
   is the tool description at the running version, and it may change between versions — so the
   spec states the mechanism rather than pinning behaviour to a version number.

**Assumptions — explicitly unverified:**

- **A1 — The write guard exists.** That some harness configurations refuse every file write
  until the session has isolated itself is recorded by exactly one observation, readable at
  `git show 8443f64:docs/AGENTS_IMPROVEMENTS.md` (the entry *A background-session write guard
  rejects the project's own worktree location*). No tool description documents it, so it
  cannot be cited from any artifact. **What would settle it:** another live run that meets the
  guard. **This run did not** — see outcome 3 above.
- **A2 — `path`-form entry clears that guard.** SMR-184's shipped but unverified assumption.
  Part 7's premise is that the relocated scratch is writable once the session has entered by
  `path`. **This run leaves A2 open**, because the guard never fired. `docs/ARCHITECTURE.md`
  must say so rather than record it as settled.
- **A3 — `bash` reaches outside the isolation boundary while file tools do not.** The rejected
  alternative 1 rests on this; it is evidenced only by the same single observation and is
  **not** relied on by the chosen resolution.

**Alternative causes named, per the scenario rule.** Two scenarios below assert an observable
outcome that a broken mechanism could still produce, so each names its alternative cause and
says where the mechanism is really covered:

- **S11.4** (`git status` shows nothing for `tmp/`) would also be green if `tmp/` were simply
  empty. The scenario therefore requires a file to exist in `tmp/` first, and the mechanism
  itself is covered by citations 1–3 above plus **S11.5**, which observes `check-ignore`
  directly.
- **S13.1** (a file-tool write to `tmp/` succeeds) would also be green in a session no guard
  ever applied to — which is exactly what happened on this run. It is therefore **not**
  evidence that `path`-form entry clears the guard; that mechanism stays **assumption A2**,
  and **S13.3** requires the shipped text to say so.

---

## Requirements

### Requirement 1: The tracking declaration is read at one fixed path

Covers **AC1, AC2, AC3, AC4**.

#### Scenario: No shipped instruction derives the declaration's path from context

- **WHEN** every file in the Boundary that reaches the board is read
- **THEN** each names `docs/ISSUE_TRACKING.md` as the declaration's path
- **AND** no shipped instruction tells a reader to discover, search for, or take that path
  from context — `grep -rniE 'path (your|its) context gives|discovery order|do not go searching for it' plugins/ docs/ CLAUDE.md README.md`
  returns nothing *(AC1)*

#### Scenario: An absent declaration does not block a run

- **WHEN** the shipped `lead` and `board` wording is read for the case where
  `docs/ISSUE_TRACKING.md` does not exist
- **THEN** it states the run proceeds — trackerless, criteria from the spec, no transitions —
  and names that outcome explicitly rather than leaving it to be inferred *(AC2)*
- **AND** that wording does not depend on invoking the `board` skill to reach it *(AC4)*

#### Scenario: The authoring template is loaded only when it is needed

- **WHEN** `plugins/ca77y-engineering/skills/board/SKILL.md` is read
- **THEN** it states that `references/authoring-issue-tracking.md` is read **only** when the
  declaration is absent or being repaired, and never on a run where it exists *(AC3, AC7)*

### Requirement 2: The `board` skill keeps only its authoring job

Covers **AC5, AC6, AC7, AC8**.

#### Scenario: Neither orchestrator invokes the skill per run

- **WHEN** `plugins/ca77y-engineering/skills/lead/SKILL.md` and
  `plugins/ca77y-engineering/agents/analyst.md` are read
- **THEN** neither instructs invoking `ca77y-engineering:board` as a step of its run
- **AND** `grep -n 'ca77y-engineering:board' plugins/ca77y-engineering/skills/lead/SKILL.md plugins/ca77y-engineering/agents/analyst.md`
  returns no line that is a per-run instruction *(AC5)*

#### Scenario: The resolver half is gone and the authoring half is intact

- **WHEN** the shipped `board/SKILL.md` is read
- **THEN** the sections *Discovery order*, *A binding is not resolved until it has been
  probed*, and *The profile* (including the profile template) are absent
- **AND** it names `references/authoring-issue-tracking.md` and states which of its jobs
  loads it *(AC7)*
- **AND** its frontmatter `description` describes no per-run resolution and no profile
  *(AC8)*

#### Scenario: The judgement to keep it a skill is recorded

- **WHEN** `docs/ARCHITECTURE.md` is read
- **THEN** it records that `board` remains a skill, with the rationale: a substantial
  authoring half, ownership of `references/authoring-issue-tracking.md`, the `docs/PRODUCT.md`
  advertisement, and its role as a user-invocable setup and inspection entry point *(AC6)*

### Requirement 3: The board profile and the probe leave the toolkit entirely

Covers **AC9, AC10, AC11, AC12, AC13**.

#### Scenario: The wrap-aware scan finds nothing, in any file type

- **WHEN** **Scan A** (see *Design*) is run in the story worktree
- **THEN** it prints `TOTAL 0` — where the baseline at `f87eedc` is `TOTAL 35`
- **AND** because it normalises whitespace before matching, the two occurrences that wrap
  across a line break in the root `CLAUDE.md` and `docs/ARCHITECTURE.md` are covered, and
  because it selects on `git ls-files` rather than `--include='*.md'`, both `.json` manifests
  are covered *(AC9, AC10)*

#### Scenario: The wrap-immune cross-check independently agrees

- **WHEN** **Scan B** (see *Design*) is run in the story worktree
- **THEN** it prints `0` — where the baseline at `f87eedc` is `108`
- **AND** any nonzero residual is reported as a **named exception with its reason**, never
  left as a silent survivor *(AC9, AC10)*
- **Note**: this scan cannot be defeated by a line break at all, which is why it and Scan A
  are both required rather than either alone

#### Scenario: The manifests lose the profile and keep their version

- **WHEN** both `ca77y-engineering` manifests are read
- **THEN** neither `description` describes the `board` skill as resolving a board profile
  *(AC10)*
- **AND** both carry the same `version`, still `2.3.0` *(AC11, AC64)*

#### Scenario: The docs index stops crediting the skill with resolving the declaration

- **WHEN** `docs/CLAUDE.md` is read
- **THEN** its layout entry for `ISSUE_TRACKING.md` no longer says the `board` skill resolves
  it *(AC12)*

#### Scenario: No instruction mentions probing a binding

- **WHEN** `grep -rniE 'prob(e|ed|ing)' plugins/ docs/ CLAUDE.md README.md` is run,
  excluding `docs/specs/`
- **THEN** no hit instructs an agent to probe a binding, and none forbids writing through an
  unprobed binding — in particular the `lead`'s "never write through a binding the `board`
  skill did not probe" and the README's "never writes through a binding that was not probed"
  are gone *(AC13)*

### Requirement 4: The declaration binds every operation the pipeline uses

Covers **AC14, AC15**.

#### Scenario: `comment` and `update` are bound to concrete calls

- **WHEN** `docs/ISSUE_TRACKING.md` § *Operations* is read
- **THEN** it binds `comment` and `update` to concrete calls, alongside the five it already
  binds *(AC14)*

#### Scenario: Each run-local fact the profile carried is accounted for

- **WHEN** the shipped wording is read
- **THEN** each of the four facts is named with its disposition — recorded in the ledger, or
  dropped — matching the table under *Part 3* in this spec, with none left unstated *(AC15)*

### Requirement 5: The improvements-log path is fixed, in all ten copies

Covers **AC16, AC17, AC18, AC19, AC20**.

#### Scenario: The discovery clause is gone from every copy

- **WHEN** `grep -rn 'discover that folder from context, never hardcode it' plugins/` is run
- **THEN** it returns nothing *(AC16)*

#### Scenario: All ten copies name the fixed path

- **WHEN** the *Process feedback* paragraph in each of the ten files is read — `analyst`,
  `auditor`, `coder`, `qa`, `writer`, `lead/SKILL.md`, and
  `ca77y-library/agents/{researcher,clerk,librarian,scribe}.md`
- **THEN** each names `docs/AGENTS_IMPROVEMENTS.md` at a fixed path *(AC17)*

#### Scenario: The two-cluster structure survives

- **WHEN** the ten paragraphs are compared as whole paragraphs
- **THEN** exactly **two** distinct variants remain — the 7-file plain variant and the 3-file
  variant carrying the extra library clause *(AC18)*
- **AND** the check is a whole-paragraph comparison, not a first-line `grep`, because this
  paragraph is not one of the two the root `CLAUDE.md` guards per-line

#### Scenario: The clearing section and the wider assertions

- **WHEN** the root `CLAUDE.md` § *The improvements log is cleared as it is converted* is
  diffed against `f87eedc`
- **THEN** it is byte-identical *(AC19)*
- **AND** `README.md` and `docs/ARCHITECTURE.md` § *The self-improvement channel* no longer
  assert the improvements-log path is resolved from context or never hardcoded *(AC20)*

### Requirement 6: The spec carries a labelled, verbatim, stamped transcription

Covers **AC21, AC22, AC23**.

#### Scenario: The template gains the section

- **WHEN** `docs/_templates/spec.md` is read
- **THEN** it carries a section for the verbatim acceptance-criteria transcription, with
  per-criterion labels and a stamp naming the card identifier and the state it was read at
  *(AC21)*
- **AND** `docs/_templates/CLAUDE.md`'s spec-order rule is reconciled with the new section

#### Scenario: The spec pass is instructed to transcribe, not summarise

- **WHEN** `plugins/ca77y-engineering/agents/writer.md` spec pass is read
- **THEN** it instructs transcribing the card's `## Acceptance criteria` **verbatim**, one
  behaviour per line, labelled `AC1`…`ACn` *(AC22)*

#### Scenario: The ordering rule is stated where the correction is authorised

- **WHEN** `writer.md`'s criterion-correction rule is read
- **THEN** the shipped wording states the transcription is taken **after** any criterion
  correction the spec pass makes on the card, and says why — otherwise the equality check
  fails on exactly the path the pipeline exists to support *(AC23)*
- **AND** *this spec exercises that rule on its own run*: a correction was applied to
  SMR-188's `## Out of scope` before the transcription above was taken, and the transcription
  section says so

### Requirement 7: The `lead` guards the transcription with a mechanical equality check

Covers **AC24, AC25, AC26, AC27, AC28**.

#### Scenario: The check runs twice, and before every re-audit round

- **WHEN** `lead/SKILL.md` is read
- **THEN** it performs a mechanical equality check between the spec's transcription and the
  card's criteria **after the spec pass**, and **again before every acceptance-gate
  dispatch** — including each re-audit round of the up-to-three-round loop, stated as such
  and not only for the first *(AC24)*

#### Scenario: The normalisation is exactly two rewrites

- **WHEN** the check's wording is read
- **THEN** it normalises **only** the `-`-to-`*` bullet rewrite and the wrapping of bare URLs
  in `<…>`, and nothing else *(AC25)*

#### Scenario: The check is not a judgement

- **WHEN** `lead/SKILL.md` is read
- **THEN** it states plainly that comparing two strings is not judging whether a criterion is
  met, so the new duty does not breach the rule that the `lead` never judges acceptance
  *(AC26)*

#### Scenario: A mismatch routes to a respec

- **WHEN** the check fails at either point
- **THEN** the shipped wording routes to a **respec**, never to grading a stale list *(AC27)*

#### Scenario: The exemption is explained, not asserted

- **WHEN** the wording licensing the copy is read — in `lead/SKILL.md`, `writer.md`, and
  `auditor.md`
- **THEN** it explains **why** a checked verbatim copy is permitted where a paraphrase is not
  — the anti-drift rule keeps its full force and the copy earns its exemption from the check —
  rather than asserting the copy is faithful *(AC28)*

### Requirement 8: Both gates work per `ACn` label

Covers **AC29, AC30, AC31**.

#### Scenario: The spec gate checks the mapping both ways

- **WHEN** `auditor.md`'s spec-readiness wording is read
- **THEN** it verifies every `ACn` maps to at least one requirement or scenario
- **AND** treats a requirement mapped to no `ACn` as a finding **unless** it is explicitly
  marked deliberate scope *(AC29)*

#### Scenario: A non-build criterion maps validly

- **WHEN** a criterion's owning mechanism is not a build step — documentation the docs pass
  owns, a manual reproduction, or a step only the `lead`'s own session can perform
- **THEN** the shipped rule states it maps validly, and `writer.md`'s existing requirement to
  name that owning mechanism is what makes the mapping checkable *(AC30)*

#### Scenario: The acceptance gate returns a verdict per label

- **WHEN** `auditor.md`'s `## The acceptance gate` is read
- **THEN** it returns a verdict **per `ACn` label** *(AC31)*

### Requirement 9: Board access is granted per dispatch by the caller

Covers **AC32, AC33, AC34, AC35, AC36, AC37, AC38, AC39**.

#### Scenario: The auditor has no board access in the lead's two gates

- **WHEN** `auditor.md` is read
- **THEN** it grants no board access in the spec-readiness gate or the acceptance gate, and
  **states that it has none there** rather than leaving it to be inferred from an absence
  *(AC32)*
- **AND** it states that its board access is **granted per dispatch by the caller** *(AC33)*

#### Scenario: The acceptance-gate standard inverts

- **WHEN** `auditor.md`'s `## The acceptance gate` is read
- **THEN** the standard is the spec's labelled transcription, not "the card's acceptance
  criteria as the profile's `read` binding returns them"
- **AND** the instruction "Read the criteria from the board yourself; do not accept a
  restatement" is gone *(AC36)*

#### Scenario: The advisor gate keeps its access, and the analyst names no profile

- **WHEN** `analyst.md`'s advisor-gate dispatch is read
- **THEN** it names the declaration rather than a board profile *(AC35)*
- **AND** the story-advisor gate retains board **read and search**, and board-side duplicate
  detection is still performed somewhere in an `analyst` run *(AC34)*

#### Scenario: Duplicate detection in a lead run is named, not left to lapse

- **WHEN** the shipped wording is read
- **THEN** it names where board-side duplicate detection happens in a `lead` run, given the
  auditor no longer performs it there — the `writer`'s sibling sweep, stated as the only such
  check in a `lead` run *(AC37)*

#### Scenario: The writer keeps read and search; the coder and qa keep none

- **WHEN** `writer.md`, `coder.md`, and `qa.md` are read
- **THEN** `writer.md` retains both **read** and **search** access, with the sibling sweep
  named as why search is needed *(AC38)*
- **AND** `coder.md` still states it gets no board access, and `qa.md` still mentions no board
  at all — a no-regression check, not an edit *(AC39)*

### Requirement 10: The canonical shared paragraph survives, renamed, with its guard

Covers **AC40, AC41, AC42, AC43**.

#### Scenario: The paragraph is byte-identical in both files

- **WHEN** the caller-granted board paragraph in `writer.md` and `auditor.md` is compared
- **THEN** the two copies are byte-identical *(AC40)*
- **AND** its content is true of both agents without divergence: access is whatever the caller
  named, the declaration is at `docs/ISSUE_TRACKING.md`, and where the caller named nothing
  the agent has none and says so

#### Scenario: The drift check is updated, not removed, and prints 1

- **WHEN** the root `CLAUDE.md`'s second drift-check snippet is run as written
- **THEN** it matches the paragraph's **new opening**, covers the same two files, and prints
  `1` *(AC41)*
- **AND** the prose describing it names the same two files the check covers *(AC42)*

#### Scenario: Every drift check the file still carries prints what it claims

- **WHEN** all **four** output-asserting snippets in the root `CLAUDE.md` are run — the
  five-file worktree paragraph `grep` (`1`), the renamed two-file paragraph `grep` (`1`), the
  cross-plugin dispatch-name `grep` pair (nothing), and the manifest-parity loop (`ok` for
  every plugin)
- **THEN** each prints the value that file says it prints *(AC43)*
- **Note**: the count is **four**, not three — see *Deviations from the card*. Only the second
  snippet's pattern changes; the other three are unchanged in content and only re-run.

### Requirement 11: Run-local scratch lives inside the story worktree

Covers **AC44, AC45, AC46, AC56, AC57, AC59**.

#### Scenario: The location, both filenames, and the tool are all named

- **WHEN** `lead/SKILL.md` is read for a session the harness has isolated into the story
  worktree
- **THEN** it names the directory `tmp/`, both filenames `tmp/ledger.md` and
  `tmp/findings-round-<N>.md`, and the **ordinary file tools** as what writes them *(AC44)*
- **AND** neither name carries a branch qualifier *(AC56)*

#### Scenario: No scratch write needs a shell

- **WHEN** the stated method is read
- **THEN** every scratch write is an ordinary file-tool write, and no `bash` command is
  required for any of them *(AC45)*

#### Scenario: The ignore entry is named as the anti-sweep mechanism

- **WHEN** the shipped wording is read
- **THEN** it names the **committed ignore entry itself** as the mechanism guaranteeing no
  commit step can sweep a scratch file into a story commit, stated at the level of "any
  non-force staging command skips ignored paths" rather than pinned to a particular git
  invocation *(AC46)*
- **AND** it does **not** claim the entry protects a path that is already tracked — see
  citation 3's precondition

#### Scenario: An ignored `tmp/` is invisible to a staging command

- **WHEN** a file exists at `tmp/ledger.md` in the story worktree **and** the `.gitignore`
  entry has landed
- **THEN** `git -C <worktree> status --porcelain` reports nothing for `tmp/`
- **AND** `git -C <worktree> add --dry-run tmp/` stages nothing and prints the
  `hint: Use -f if you really want to add them.` advice *(AC46)*
- **Alternative cause named**: an empty `tmp/` would also produce a clean `status`. The
  scenario therefore requires the file to exist first, and the mechanism is separately
  observed by the next scenario and by citations 1–3

#### Scenario: The ignore rule is observed directly

- **WHEN** `git -C <worktree> check-ignore -v tmp/ledger.md` is run
- **THEN** it exits `0` and names the `.gitignore` line that matched, proving the mechanism
  rather than only its symptom *(AC57)*

#### Scenario: The repo's own `.gitignore` carries the entry

- **WHEN** `.gitignore` is read
- **THEN** it carries a `tmp/` entry alongside the existing `.worktrees/` entry, under
  `# Story worktrees` *(AC57)*
- **AND** the build has settled anchored (`/tmp/`) versus unanchored (`tmp/`) and the choice
  is consistent with what `check-ignore` reports above

#### Scenario: No instruction survives saying scratch lives outside the worktree

- **WHEN** `grep -rniE 'next to the worktree|beside the worktree|outside it|\.worktrees/<branch>\.' plugins/ docs/ README.md CLAUDE.md`
  is run, excluding `docs/specs/`
- **THEN** no hit states that run-local scratch lives beside, or outside, the story worktree
  *(AC59)*
- **AND** in particular the three surfaces that assert the inverse today — `lead/SKILL.md`
  (*Paths, not content*, *The ledger*, the recovery step), `docs/ARCHITECTURE.md` (the
  orchestration-state paragraph), and `README.md` (the context-discipline paragraph) — have
  the assertion **deleted**, not repointed

### Requirement 12: One committed ignore entry, documented as a setup requirement

Covers **AC47, AC58**.

#### Scenario: The requirement is exactly one line, and it is documented

- **WHEN** the shipped wording is read
- **THEN** the resolution requires **exactly one** committed ignore entry in a target project
- **AND** it is documented as a setup requirement **alongside** the entry for that project's
  worktree directory *(AC47)*

#### Scenario: `PRODUCT.md` establishes both entries and `README.md` agrees

- **WHEN** `docs/PRODUCT.md` § *Requirements it places on target repos* is read
- **THEN** it states **both** ignore entries — the worktree directory and `tmp/` — as setup
  requirements a target repo must satisfy
- **AND** the `README.md` setup prose agrees with it *(AC58)*
- **Note**: neither statement exists at `f87eedc`, so this is an **establishment**, not an
  addition beside an existing sentence

### Requirement 13: The write is demonstrated, and the guard question is reported honestly

Covers **AC48, AC49, AC50, AC51, AC52**. **Most of this *is* a build step.** AC49, AC50 and
AC51 are ordinary `docs/ARCHITECTURE.md` prose the `coder` writes at T19, and so is AC52's
shipped-wording half at T19a; what the build cannot reach is only **AC48** (the live write) and
**AC52's escalation action** — see *Criteria no build step can satisfy*. What makes AC49–AC51
unusual is not unreachability but a split input: the `lead` supplies the observation the
paragraph states.

#### Scenario: A real file-tool write is performed during this run

- **WHEN** the `.gitignore` entry has landed in the story worktree
- **THEN** the **`lead`'s own session** performs a file-tool write to `tmp/` inside the story
  worktree, and reports the result — asserted nowhere *(AC48)*
- **Alternative cause named**: this write succeeding proves the **location** is writable. It
  is **not** evidence that `path`-form entry clears the write guard, because on this run the
  guard never fired. That mechanism stays **assumption A2**

#### Scenario: The record names the outcome and the dispatch mode together

- **WHEN** `docs/ARCHITECTURE.md` is read
- **THEN** it records the write's outcome **together with** the dispatch mode the run was
  invoked in — for this run, **a background job whose write guard never fired** — so that "the
  guard never fired" is distinguishable from "the guard was never attempted" *(AC49)*

#### Scenario: The open question stays open, and says which branch left it open

- **WHEN** `docs/ARCHITECTURE.md`'s *The write guard itself is a stated assumption* paragraph
  is read
- **THEN** it states the question of whether `path`-form entry clears the guard is **still
  open**, and names which of the two non-settling branches left it open — *a background run
  whose guard never fired*, not a foreground run that could not have met it *(AC51)*
- **AND** its sentence "Nothing shipped verifies that `path`-form entry clears it either"
  **stays**, with the shipped text saying explicitly why it stays *(AC50, antecedent false)*
- **AND** the paragraph does **not** describe the guard question as settled

#### Scenario: A refusal would be escalated, not quietly recorded

- **WHEN** the `lead`'s `tmp/` write is refused, or a future run meets the guard and `path`
  entry does not clear it
- **THEN** that outcome is escalated as a **blocker on this story**, because it falsifies the
  premise that the relocated scratch can be written at all
- **AND** the escalation is **in addition to** recording which outcome occurred, not instead
  of it *(AC52)*
- **Note for the acceptance gate**: on this run the guard was not met, so AC52 is **not
  triggered**; it is graded on the shipped wording carrying the escalation rule, not on an
  escalation having happened

### Requirement 14: The decision, the alternatives, and honest recovery are recorded

Covers **AC53, AC54, AC55, AC60**.

#### Scenario: The rationale and all four rejected alternatives are recorded

- **WHEN** `docs/ARCHITECTURE.md` is read
- **THEN** it records the rationale for the settled scratch location
- **AND** names **each of the four** rejected alternatives with the reason it was rejected —
  the current location via `bash`, `.git/info/exclude`, a commit-time pathspec exclusion, and
  reusing the worktree directory's own name *(AC53)*

#### Scenario: Open-PR recovery rests on durable records

- **WHEN** `lead/SKILL.md` § *Invoked on an open PR* is read
- **THEN** its recovery step recovers from the card's handoff comment, the PR description, and
  `git log`
- **AND** treats a surviving `tmp/ledger.md` as a **bonus** rather than something recovery
  depends on *(AC54)*
- **AND** its *Re-resolve the board* step is gone *(AC13)*

#### Scenario: The three surfaces agree on location and reason

- **WHEN** `docs/ARCHITECTURE.md`, `README.md`, and `lead/SKILL.md` are compared
- **THEN** all three describe the same scratch location and the same reason *(AC55)*

#### Scenario: Durability is stated, with the durable records named

- **WHEN** the shipped wording is read
- **THEN** it states that run-local scratch **does not outlive the story worktree**, and names
  the durable records recovery uses instead — the card's handoff comment, the PR description,
  and `git log` *(AC60)*

### Requirement 15: The repo's own tenets stop forbidding a fixed declaration path

Covers **AC61, AC62**.

#### Scenario: No tenet calls a fixed declaration path a defect

- **WHEN** the root `CLAUDE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, and `README.md`
  are read
- **THEN** none contains a statement that a fixed declaration path is a defect, or that the
  declaration may live anywhere the project's context documents it *(AC61)*
- **AND** in particular `docs/PRODUCT.md`'s clause "or anywhere else its context already
  documents itself" is gone, and its "Hardcoded paths are a defect" principle carries the
  carve-out

#### Scenario: The carve-out is stated precisely

- **WHEN** `docs/PRODUCT.md` is read
- **THEN** it states that the declaration's **location** is a convention, while **which board
  is used and how it is reached stay resolved from the declaration** *(AC62)*
- **AND** the root `CLAUDE.md` keeps its load-bearing half — no agent may name a tracker, a
  card path, a status symbol, or a card field as a fact about "the project"

### Requirement 16: No-regression invariants

Covers **AC63, AC64**. *(Marked **deliberate scope**: these are checks the story must not
break, not behaviour it adds.)*

#### Scenario: The cross-plugin edge stays soft

- **WHEN** the two cross-plugin `grep`s from the root `CLAUDE.md` are run
- **THEN** both return nothing, and no file in `plugins/ca77y-library/` dispatches or declares
  a dependency on any `ca77y-engineering` agent or skill *(AC63)*
- **AND** the four `ca77y-library` agent files this story edits changed only their *Process
  feedback* paragraph

#### Scenario: No version moves

- **WHEN** the manifest-parity loop is run and the four `version` fields are diffed against
  `f87eedc`
- **THEN** every plugin prints `ok`, `ca77y-engineering` reads `2.3.0`, `ca77y-library` reads
  `1.0.0`, and `git diff f87eedc -- '**/plugin.json'` shows no `version` line changed *(AC64,
  AC11)*

---

## Validation

There is **no test runner in this repository** and none is added. The following *is* the
validation procedure; `qa` runs it in the story worktree and reports pass/fail per item. All
commands are run with `git -C <worktree>` or from the worktree root; none depends on project
dependencies, which is why the *not provisioned — no install step* status is harmless here.

1. **Scan A** (wrap-aware, all file types) → `TOTAL 0`. Baseline `f87eedc`: `TOTAL 35`.
2. **Scan B** (wrap-immune bare word, all file types) → `0`. Baseline `f87eedc`: `108`. Any
   residual is a named exception with a reason.
3. `grep -rn 'discover that folder from context, never hardcode it' plugins/` → nothing.
4. **Whole-paragraph** comparison of the *Process feedback* paragraph across the ten files →
   exactly **2** distinct variants, in a 7/3 split.
5. `git -C <worktree> diff f87eedc -- CLAUDE.md` → the hunk set contains **no** change inside
   § *The improvements log is cleared as it is converted*.
6. **All four** root-`CLAUDE.md` output-asserting snippets, run as written:
   worktree-paragraph `grep` → `1`; renamed two-file paragraph `grep` → `1`; the two
   cross-plugin `grep`s → nothing; the manifest-parity loop → `ok` for both plugins.
7. `git -C <worktree> diff f87eedc -- '**/plugin.json'` → no `version` line changed; all four
   read `2.3.0` / `2.3.0` / `1.0.0` / `1.0.0`.
8. `git -C <worktree> check-ignore -v tmp/ledger.md` → exit `0`, naming the matched
   `.gitignore` line.
9. With a file present at `tmp/ledger.md`: `git -C <worktree> status --porcelain` reports
   nothing for `tmp/`, and `git -C <worktree> add --dry-run tmp/` stages nothing.
10. `grep -rniE 'prob(e|ed|ing)' plugins/ docs/ CLAUDE.md README.md` (excluding
    `docs/specs/`) → no instruction to probe a binding, and none forbidding an unprobed write.
11. `grep -rniE 'next to the worktree|beside the worktree|\.worktrees/<branch>\.' plugins/ docs/ README.md CLAUDE.md`
    (excluding `docs/specs/`) → no hit places run-local scratch outside the worktree.
12. **Read-through, per `ACn`.** Every criterion above whose evidence is prose rather than a
    command is checked by reading the named file and section. `qa` reports which `ACn` each
    read-through covered.
13. **Post-docs-pass re-run of Scans A and B with no `docs/specs/` exclusion** → both `0`,
    once the spec is removed. This is the only validation item that runs after step 7 of the
    pipeline.

**Consumers reached.** The root `CLAUDE.md`'s four snippets are consumers of the files this
story edits **by name**, and item 6 runs all four rather than trusting the two the story
touches. The two `.json` manifests are consumers no `*.md` sweep reaches, and items 1, 2 and
7 cover them. `.gitignore` is consumed by every staging command, and items 8–9 exercise it
directly rather than by inspection. There is no `Dockerfile`, compose file, or build script in
this repo, so no image or package build is a consumer.

---

## Criteria no build step can satisfy

Two entries only, per the spec-pass rule. **Each is a criterion no dispatched agent can close
at all, and each has a Tasks entry carrying the "not the `coder`'s task" marker** — T26 and
T27 respectively. Nothing else in this spec qualifies; the table below is exhaustive.

| Criterion | Owning mechanism | Task | When |
| --- | --- | --- | --- |
| **AC48** | The **`lead`'s own session** performs the file-tool write to `tmp/` inside the story worktree and reports the result. No dispatched agent can do it: the observation is about the top-level session's own write path. | **T26** *(marked)* | After the `.gitignore` entry lands — i.e. after the build commit, before the acceptance gate |
| **AC52**, the **escalation-action half only** | The **`lead`** escalates, as a blocker on this story, if the guard was met and `path` entry did not clear it, or if its own `tmp/` write is refused. Only the `lead` can perform the escalation. | **T27** *(marked)* | Whenever observed |

**AC52's other half is an ordinary build deliverable.** The criterion has two halves, and only
one of them is unreachable by the build: the *shipped wording carrying the escalation rule* is
prose in `lead/SKILL.md`, written by the `coder`, and it is what Requirement 13's grading note
tells the acceptance gate to grade — since on this run the guard was not met, so no escalation
event exists to grade. That half is tasked at **T19a**, tagged `(AC52)` — not at T19, which
targets `docs/ARCHITECTURE.md` and carries no `AC52` tag.

### Ordinary Build deliverables whose *content* the `lead` supplies

**AC6, AC49, AC50, AC51, AC53** are **not** in the table above: each is a normal
build-satisfiable criterion, authored by the `coder` in `docs/ARCHITECTURE.md` during Build, at
the unmarked task **T19**. They are recorded here only because of a split that is easy to
misread as unreachability:

- **The deliverable is the `coder`'s; the *input* is the `lead`'s.** For **AC49, AC50, AC51**
  the paragraph is ordinary prose, but its content depends on an observation only the `lead`
  can make — the write's outcome and the dispatch mode the run was invoked in. The `lead` names
  both in the coder's dispatch prompt, and this spec already records the observation (**outcome
  3: background job, guard never fired**) so the coder is never left to infer it. **T27** is
  what obliges the `lead` to supply it.
- **If the observation changes** — the `lead`'s later `tmp/` write behaves differently from
  what this spec records — the **docs pass** reconciles the paragraph, per T28.
- **AC6 and AC53** need no external input at all. They are in `docs/ARCHITECTURE.md` rather
  than the docs pass's own output only because the card places the tenet reconciliation in the
  build's scope; the docs pass therefore reconciles these rather than authoring them.

---

## Tasks

Ordered for execution. Parts 1–4 and 6–7 are independent enough to be done in any order; part
5's template change should precede its `writer.md` change so the template is the reference.

- [ ] **T1** — Rewrite `docs/ISSUE_TRACKING.md`: state the fixed path convention; bind
      `comment` and `update` to concrete calls; state each of the four run-local facts'
      disposition. *(AC1, AC14, AC15)*
- [ ] **T2** — Reduce `plugins/ca77y-engineering/skills/board/SKILL.md` to its authoring job:
      delete *Discovery order*, *A binding is not resolved until it has been probed*, *The
      profile* and its template; rewrite the frontmatter `description`; state that
      `references/authoring-issue-tracking.md` loads only on the authoring path. *(AC3, AC7,
      AC8, AC13)*
- [ ] **T3** — Reconcile `references/authoring-issue-tracking.md`'s one `profile` sentence
      with T2. *(AC9)*
- [ ] **T4** — `lead/SKILL.md`: delete *Resolving the board*'s profile machinery and the
      *Re-resolve the board* step; state absent-declaration behaviour without invoking the
      skill — naming what happens instead, so an absent declaration is not a blocked run;
      remove the "never write through a binding the `board` skill did not probe" boundary.
      *(AC1, AC2, AC4, AC5, AC13)*
- [ ] **T5** — `analyst.md`: stop invoking the skill per run; name the declaration, not a
      profile, in the advisor-gate dispatch; keep search/read/create. *(AC5, AC35)*
- [ ] **T6** — Delete the "discover that folder from context, never hardcode it" clause from
      the *Process feedback* paragraph in **all ten** files, preserving the 7/3 two-cluster
      split byte-identically within each cluster. *(AC16, AC17, AC18)*
- [ ] **T7** — Flip the matching assertions in `README.md` and `docs/ARCHITECTURE.md`
      § *The self-improvement channel*. *(AC20)*
- [ ] **T8** — `docs/_templates/spec.md`: add the transcription section with `ACn` labels and
      the card-identifier-and-state stamp; reconcile `docs/_templates/CLAUDE.md`'s spec-order
      rule. *(AC21)*
- [ ] **T9** — `writer.md`: instruct the verbatim labelled transcription; state the
      after-correction ordering and why; explain why a checked copy is permitted where a
      paraphrase is not; keep read **and** search with the sibling sweep named as the reason.
      *(AC22, AC23, AC28, AC38)*
- [ ] **T10** — `lead/SKILL.md`: add the mechanical equality check — after the spec pass and
      before **every** acceptance-gate dispatch including each re-audit round; the exactly-two
      normalisations; the comparison-not-judgement statement; the respec routing. Insert the
      first check at the spec-commit point (the region SMR-144 also edits). *(AC24, AC25,
      AC26, AC27, AC28)*
- [ ] **T11** — `auditor.md`: rewrite `## The acceptance gate` so the labelled transcription is
      the standard and the card is not read; delete "Read the criteria from the board
      yourself…"; return a verdict per `ACn`; add the spec gate's both-ways mapping check with
      the non-build-criterion allowance. *(AC29, AC30, AC31, AC36)*
- [ ] **T12** — `auditor.md`: state zero board access in the `lead`'s two gates, and that
      access is caller-granted per dispatch; keep the `analyst`'s advisor gate at read +
      search. *(AC32, AC33, AC34)*
- [ ] **T13** — Rename and rewrite the canonical shared paragraph to caller-granted semantics,
      **byte-identically** in `writer.md` and `auditor.md`. *(AC40)*
- [ ] **T14** — Root `CLAUDE.md`: update the second drift-check snippet's `grep` pattern to the
      paragraph's new opening and the prose describing it; verify it prints `1`. Do **not**
      remove it. *(AC41, AC42)*
- [ ] **T15** — Name where board-side duplicate detection happens in a `lead` run, given the
      auditor no longer performs it there. *(AC37)*
- [ ] **T16** — Verify `coder.md` and `qa.md` still grant no board access; change nothing else
      in them. *(AC39)*
- [ ] **T17** — `.gitignore`: add the `tmp/` entry beside `.worktrees/` under
      `# Story worktrees`, settling anchored versus unanchored, and confirm with
      `check-ignore`. *(AC57)*
- [ ] **T18** — `lead/SKILL.md`: relocate scratch to `tmp/ledger.md` and
      `tmp/findings-round-<N>.md` with no branch qualifier; name the file tools as what writes
      them; name the ignore entry as the anti-sweep mechanism without pinning it to a git
      invocation; delete the outside-the-worktree assertion in *Paths, not content*, *The
      ledger*, and the recovery step; state the durability cost and the durable records
      recovery uses. *(AC44, AC45, AC46, AC54, AC56, AC59, AC60)*
- [ ] **T19** — `docs/ARCHITECTURE.md`: repoint the orchestration-state paragraph; record the
      `board`-remains-a-skill judgement; record the scratch rationale and all four rejected
      alternatives; record the write outcome **with the dispatch mode**, state the guard
      question still open and which branch left it open, and keep the "nothing shipped
      verifies" sentence with the reason it stays. *(AC6, AC49, AC50, AC51, AC53, AC55, AC59)*
- [ ] **T19a** — `lead/SKILL.md`: author the **shipped wording carrying the escalation rule** —
      that an outcome where the guard was met and `path` entry did not clear it is escalated as
      a blocker on the story rather than shipped as a quietly closed fact, and that the
      escalation is **in addition to** recording which outcome occurred, not instead of it.
      This is the half of AC52 the build owns and the half Requirement 13's grading note tells
      the acceptance gate to grade; T27 covers only performing the escalation. *(AC52)*
- [ ] **T20** — `README.md`: structurally rewrite ***Bring your own board*** (Probe row,
      discovery-fallback chain, blocked/none logic); fix the board-resolution table row, the
      unprobed-binding claim, the context-discipline paragraph, the Layout tree's
      `board/SKILL.md` comment, and the setup prose to agree with `PRODUCT.md`. *(AC9, AC13,
      AC55, AC58, AC59, AC61)*
- [ ] **T21** — `docs/PRODUCT.md`: carve out the declaration's location in *Principles*;
      include the declaration in the *Requirements it places on target repos* clause; drop "or
      anywhere else its context already documents itself"; **establish** both ignore entries
      as setup requirements. *(AC47, AC58, AC61, AC62)*
- [ ] **T22** — Root `CLAUDE.md`: retitle and rewrite § *The board is resolved, never
      hardcoded*, keeping its load-bearing half and inverting the pointer paragraph's
      rationale; leave § *The improvements log is cleared as it is converted* untouched.
      *(AC19, AC61)*
- [ ] **T23** — `docs/CLAUDE.md`: fix the `ISSUE_TRACKING.md` layout entry. *(AC12)*
- [ ] **T24** — Both `ca77y-engineering` manifests: rewrite the `board` skill's `description`
      clause in each, **`version` untouched**. *(AC10, AC11, AC64)*
- [ ] **T25** — Run the whole *Validation* section; report per item and per `ACn`. This is the
      owning task for the criteria satisfied by **verification rather than authoring**: the four
      root-`CLAUDE.md` snippets printing what the file claims (Validation item 6), and the
      cross-plugin edge staying soft (item 6's two `grep`s). *(AC43, AC63)*
- [ ] **T26** — *(**Not the `coder`'s task** — the `lead`'s own session.)* After T17 lands,
      perform a file-tool write to `tmp/` inside the story worktree and report the result.
      *(AC48)*
- [ ] **T27** — *(**Not the `coder`'s task** — the `lead`'s.)* Supply the observed outcome and
      dispatch mode to T19's author, and escalate as a blocker on this story if the guard was
      met and `path` entry did not clear it, or if T26's write is refused. *(AC52)*
- [ ] **T28** — *(**Not the `coder`'s task** — the docs pass.)* Convert this spec into
      `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, and `README.md`, remove it from
      `docs/specs/`, and re-run Validation items 1–2 with no `docs/specs/` exclusion.
