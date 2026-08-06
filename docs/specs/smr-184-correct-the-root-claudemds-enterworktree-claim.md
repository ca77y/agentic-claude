# Correct the root CLAUDE.md's EnterWorktree claim and give the lead an isolation fallback

- **Status**: Draft
- **Task**: SMR-184
- **Last Updated**: 2026-08-06
- **Document Scope**: One unit of work: replace the root `CLAUDE.md`'s blanket "`EnterWorktree` is deliberately not used" claim with the `name`-form-only truth plus the `path`-form remedy, and name that remedy in the `lead` skill where it creates the worktree

---

## Goal

The root [`CLAUDE.md`](../../CLAUDE.md) tells a `lead` that `EnterWorktree` "is
deliberately not used" for story worktrees. That is true only of the tool's `name` form.
Its `path` form enters a worktree that already exists, and on first entry from the launch
directory it accepts any path registered in `git worktree list` for the owning repository
— which is exactly what `git worktree add .worktrees/<branch>` produces. A session the
harness requires to isolate itself before it will write therefore has one compliant
remedy, and the repo's own instructions currently rule it out, after the worktree already
exists.

**The change.** Two documents, one correction each:

1. Root `CLAUDE.md`, Worktrees section: keep the location rule and the absolute-path
   addressing convention verbatim in substance, attribute the `.claude/worktrees/`
   restriction to the `name` form specifically, and state the `path`-form remedy and that
   it leaves the worktree at `.worktrees/<branch>`.
2. `plugins/ca77y-engineering/skills/lead/SKILL.md`: name the same remedy once, where the
   skill creates the worktree, because a `lead` invoked as a background job meets the
   guard on its first file write every time and the failure arrives as a rejected edit
   with no indication that a compliant remedy exists.

**Value.** A `lead` that meets the write guard finds the remedy stated where it is already
looking, and the worktree stays at `.worktrees/<branch>`. Nothing relocates, and no
existing addressing rule changes.

**Non-goals.**

- No relocation of story worktrees to `.claude/worktrees/`. SMR-140 weighed that
  alignment (its second acceptance criterion was exactly that option) and settled on
  absolute-path addressing; this story preserves that decision rather than reopening it.
- No edit to the canonical `**Addressing the story worktree.**` paragraph, in any of the
  five files that carry it. The `lead`'s fallback goes **outside** that paragraph.
- No change to how run-local scratch files (ledger, board profile, round findings) are
  located or written — that is SMR-188, which this story blocks and which starts from a
  session already isolated by `path`.
- No change to the three verification snippets in the root `CLAUDE.md` that the same
  guard also refuses — that is SMR-186, a different region of the same file.
- No widening of the fallback to dispatched workers (`coder`, `writer`, `qa`, `auditor`).
  See *The dispatched-worker case* below.
- No plugin version bump. Versions are a manual human decision per the root
  `CLAUDE.md`; the `version` in every `plugins/*/plugin.json` and
  `plugins/*/.claude-plugin/plugin.json` is unchanged by this story.

## Design

### The text being corrected

Sourced from this worktree at `b8c5911` (the branch's base), not from the card's
`d80e258` line numbers. In this tree the Worktrees section runs `CLAUDE.md:7-57` (the next
header, `## Two plugins — keep the cross-plugin edge soft`, is at line 58) and the sentence
at issue is `CLAUDE.md:14-17`, reading in full:

> Dispatched agents address the worktree by its absolute path, not by cwd: git calls
> carry `-C <path>`, and file tools take an absolute path under `<path>`. `EnterWorktree`
> is deliberately not used for this — it only accepts worktrees under `.claude/worktrees/`,
> not `.worktrees/<branch>` — so do not "fix" the location to match it.

Two of its three claims survive: absolute-path addressing with `-C <path>`, and the
instruction not to relocate the worktree. The middle claim — that `EnterWorktree` is not
used and only accepts `.claude/worktrees/` — is what is wrong, and it is the claim a
guarded session acts on.

`EnterWorktree` is named in exactly **one** place in this tree:
`CLAUDE.md:15`. Verified at `b8c5911` with
`grep -rn 'EnterWorktree' --include='*.md' <worktree>` → one hit. (The card's `## Why`
said it "otherwise appears only in the `docs/AGENTS_IMPROVEMENTS.md` entry this story is
sourced from"; that entry was cleared at `5b6d6d0` when it was converted into this card,
per the root `CLAUDE.md`'s clear-as-you-convert rule, so it is no longer in the tree. The
substance is unchanged and slightly stronger — `CLAUDE.md:15` is now the only mention
anywhere — and the card's sentence was corrected on the board during this spec pass, with
the entry's readable location added: `8443f64`, lines 99-126.) So the correction has
exactly one instructional site to fix, and no sibling copy to keep in sync.

### What the harness actually does

The harness is not a vendored dependency; it ships as a single compiled binary, so a
path-and-line citation is not available. Each claim below is cited to the **installed
version this run executes under** — `/Users/catty/.local/share/claude/versions/2.1.223`
(Claude Code 2.1.223, the target of the `~/.local/bin/claude` symlink) — and each is
independently reproducible by extracting the `EnterWorktree` tool description from that
binary, read-only:

```bash
grep -a -o 'Pass \\`path\\` instead of \\`name\\`.\{0,900\}' /Users/catty/.local/share/claude/versions/2.1.223
```

The strings that citation yields, one per distinct mechanism:

- **The `name` form creates a new worktree under `.claude/worktrees/`.** Cited:
  *"In a git repository: creates a new git worktree inside `.claude/worktrees/` on a new
  branch."* This is the claim the current `CLAUDE.md` sentence generalises from — the
  restriction is real, and it belongs to this form only.
- **The `path` form enters a worktree that already exists, and on first entry from the
  launch directory accepts any path in the owning repository's `git worktree list`.**
  Cited: *"Pass `path` instead of `name` to switch the session into a worktree that
  already exists (e.g., one you just created with `git worktree add`). On first entry from
  the launch directory, the path must appear in `git worktree list` for the repository
  that owns it — the current repository or, in a multi-repo workspace, a repository nested
  inside it; paths registered by neither are rejected."* `.worktrees/<branch>` created by
  `git worktree add` satisfies that condition, so no relocation is needed.
- **The `path` form is restricted to `.claude/worktrees/` for a session already inside a
  worktree and for an agent whose cwd was pinned at launch.** Cited: *"Switching with
  `path` also works when the session is already in a worktree … and from agents whose
  working directory was pinned at launch (subagent isolation or explicit cwd). In both
  cases the target must be a worktree under `.claude/worktrees/` of the same repository."*
  This is what confines the remedy to the `lead`'s own first entry — see below.

**Version caveat.** Those are the strings in 2.1.223. A tool description can change
between harness versions, so the shipped prose states the mechanism (`name` creates and
relocates; `path` enters what exists) rather than pinning a version, and no scenario in
this spec asserts a harness behaviour as a repo fact.

### The write guard itself — stated assumption, not a documented contract

**Assumption (unverified by any citable contract).** Run as a background job, the harness
refuses every file write until the session has isolated itself, and `EnterWorktree` is the
only mechanism it accepts; entering the already-created story worktree by `path` satisfied
that guard with the worktree left in place; and the refusal applied both in the repository
root *and* inside the freshly created worktree, so relocating the work would not have
helped.

- **Why it cannot be cited.** No `EnterWorktree` (or other) tool description in 2.1.223
  documents a write guard, and the guard is a runtime policy, not text in the binary that
  can be pointed at. The only record is an empirical observation from one run, made by the
  session that hit it: `git show 8443f64:docs/AGENTS_IMPROVEMENTS.md`, lines 99-126 (the
  entry *"A background-session write guard rejects the project's own worktree location"*,
  removed at `5b6d6d0` when it was converted into SMR-184).
- **What would settle it.** A fresh background `lead` run that meets the guard and reports
  whether `path`-form entry clears it. That is a live-pipeline validation, which
  `docs/PRODUCT.md` (Direction) says is the only way to settle a behaviour change — it is
  **not** something this story's build can produce, and it is named as a follow-up below
  rather than as a Tasks entry.
- **Consequence for this spec.** Every scenario below observes *text in two files*. Text
  landing in a file is fully explained by an editor writing it, and says nothing about
  whether the remedy works — so a green run of these scenarios must not be read as
  confirming the assumption. The mechanism is covered only by this assumption marking, and
  the correction is still worth shipping on its own terms: the `name`/`path` distinction is
  cited independently of the guard, and the current sentence is wrong about the tool
  whether or not any session ever meets a guard.

### The corrected `CLAUDE.md` paragraph

The **propositions** are binding; the exact wording is the coder's, provided it keeps the
paragraph's voice and stays in the Worktrees section. A suggested form:

> Dispatched agents address the worktree by its absolute path, not by cwd: git calls
> carry `-C <path>`, and file tools take an absolute path under `<path>`. Do not use
> `EnterWorktree`'s `name` form for this — it creates a worktree under
> `.claude/worktrees/`, which would relocate the story branch's tree — so do not "fix"
> the location to match it. Where a harness requires a session to isolate itself before
> it will write, the remedy is the `path` form: enter the worktree that was already
> created at `.worktrees/<branch>`, which the tool accepts on first entry because
> `git worktree add` registered it in `git worktree list`. That leaves the worktree
> exactly where this project puts it — nothing moves, and the addressing rule above is
> unchanged.

Note what the replacement must **not** do: it must not drop "so do not 'fix' the location
to match it", and it must not weaken the first sentence, because both are separately
graded criteria.

### The `lead` skill's fallback

`plugins/ca77y-engineering/skills/lead/SKILL.md` mentions `EnterWorktree` nowhere today
and carries no isolation guidance at all. The fallback is added as one statement, in step
2 (*Create the workspace*), immediately after the **Branch and worktree** bullet — the
guard hits on the first file write, which for a `lead` is the ledger written at the end of
that same step, so this is where a `lead` is standing when it needs the remedy.

Three constraints shape it:

- **Outside the canonical paragraph.** The `**Addressing the story worktree.**` paragraph
  at `SKILL.md:16` is not touched. Putting the fallback inside it would force a
  five-file byte-identical edit for no benefit and put the drift check at risk.
- **Stated once.** `docs/ARCHITECTURE.md` (*Three ways an obligation gets repeated*)
  names a second independently readable statement of one duty inside a single file as the
  failure mode to avoid. Step 2 is the single site; anything else that needs it points at
  step 2 rather than restating it.
- **Project-agnostic.** `SKILL.md` is product prose that runs on other people's repos, so
  it must not name `.worktrees/<branch>` as a fact about "the project" — it says *the
  worktree you just created, wherever the project's context places it*. `EnterWorktree` is
  a harness tool, universal to every target project, so naming it is not a hardcoded
  project detail.

A suggested form for the new bullet:

> - **If the harness will not write until the session is isolated.** Some sessions — a
>   background job in particular — are refused every file write until they have isolated
>   themselves, and `EnterWorktree` is the only mechanism accepted. Enter the worktree you
>   just created **by `path`**, never by `name`: the `name` form creates a second worktree
>   in the harness's own directory and leaves this story's branch behind, while the `path`
>   form takes the worktree where the project already put it. Everything after that is
>   unchanged — the worktree stays where it is, and every dispatch still names its
>   absolute path.

**One deliberate addition beyond the card's two scope bullets.** The *Invoked on an open
PR* section (`SKILL.md:129`) tells a fix run to recover or recreate the worktree, and a
fix run is just as likely to be a background job — so it meets the same guard, having
skipped step 2's prose. It gains a **pointer** ("…including step 2's isolation step if the
harness requires it"), not a restatement, which keeps the stated-once rule intact. This is
one clause beyond the card's literal scope; it is called out here so the `lead` can cut it
if it would rather keep the diff to exactly the card's two bullets. Requirement 8 covers
it separately from the card-derived requirements so cutting it costs nothing else.

### The dispatched-worker case

Deliberately out of scope, on the citation above: from an agent whose cwd was pinned at
launch — which is every `coder`, `writer`, `qa`, and `auditor` dispatch — the `path` form
is restricted to worktrees under `.claude/worktrees/`. The unrestricted "any worktree in
`git worktree list`" behaviour this story relies on is first entry from the launch
directory, i.e. the `lead`'s own session.

**Assumption, carried over from the card and equally unverified:** the write guard is
believed to apply only to a session with no established worktree boundary, so dispatched
workers are believed not to meet it. If the build finds otherwise, that is a separate
story — the only `path`-form remedy available to a pinned agent is relocation to
`.claude/worktrees/`, which SMR-140 settled against — and the build reports it rather than
widening this fix.

### Boundary

**Files this story may change:**

- `CLAUDE.md` — the Worktrees section only, and within it only the sentence at lines
  14-17. Lines 9-12 (location, one branch per worktree, cleanup), 19-22 (the
  no-install-step status), and 24-56 (the duplication rules and their snippets) stay as
  they are.
- `plugins/ca77y-engineering/skills/lead/SKILL.md` — step 2's *Create the workspace*
  block, plus the one pointer clause in *Invoked on an open PR* described above.
- `docs/specs/smr-184-correct-the-root-claudemds-enterworktree-claim.md` — this spec,
  removed by the docs pass.
- `docs/AGENTS_IMPROVEMENTS.md` — already carries one appended process-feedback entry from
  this spec pass. Append-only, and **not the `coder`'s** to touch unless it hits its own
  pipeline friction; it appears in the diff and is accounted for in the Boundary so the
  "nothing else changed" scenario stays true.

**Files this story must not change:** the canonical paragraph in any of
`plugins/ca77y-engineering/agents/{coder,writer,qa,auditor}.md` or at `SKILL.md:16`; any
fenced snippet in `CLAUDE.md` (four of them in this tree — lines 40-44, 53-56, 75-78 and
the manifest-parity loop at 142-148; SMR-186 owns three); any `plugin.json`; `README.md` and
`docs/ARCHITECTURE.md` (docs pass — see Tasks).

**No build, test, or install step exists in this repo** (no `package.json`, no lockfile;
the worktree's provisioning status for this run is *not provisioned — no install step*),
and no CI workflow or container build references either changed file by name — the two
`.github/workflows/*.yml` files are Claude review actions and name neither. So there is no
consumer to build through: validation is reading the two changed files and running the
repo's own drift checks, and every scenario below is executable with `grep`/`git` inside
the worktree.

### Coordination with sibling cards

Sibling sweep run 2026-08-06 through the profile's `search` binding
(`list_issues` on project `Agentic Claude`, full-text `query: EnterWorktree`, plus direct
reads of every card SMR-184 links).

- **SMR-186** edits the same file, different region (the three fenced snippets). The two
  can ship in either order; whichever lands second rebases onto the other's text rather
  than reapplying a stale copy of `CLAUDE.md`.
- **SMR-187** and **SMR-188** both edit `SKILL.md` — SMR-187 in step 7 / *Context
  discipline* / *Final handoff*, SMR-188 in the scratch-location rules at lines 42, 44 and
  129. This story's step-2 bullet does not collide with either; the *Invoked on an open PR*
  pointer touches the same paragraph SMR-188 lists at line 129, so whichever lands second
  reconciles with the other's shipped wording.
- **SMR-186's guard problem lands on this story's own validation.** The `CLAUDE.md`
  five-file drift check, which criterion 8 requires running, is one of the three snippets
  SMR-186 exists to fix: run verbatim from an isolated session it is refused as too
  complex to verify. This story does **not** rewrite it. Validation below therefore states
  the plain-command equivalent to use when the running session is isolated, and that
  hand-translation is a validation step only — no edit to the snippet in `CLAUDE.md`.
- **SMR-187's hazard applies to this run.** A subagent's definition and a skill are loaded
  from the *installed* plugin, not from the worktree, so the fallback shipped here does not
  govern the `lead` running this story. That is expected and is SMR-187's problem, not a
  defect in this build.

### Risks

- **The correction could over-reach into a recommendation.** The shipped prose should say
  what the remedy *is* when a harness demands isolation, not instruct every `lead` to
  isolate itself. Isolation stays a harness-imposed condition; an unguarded session keeps
  working exactly as it does today, from the launch directory.
- **The instruction not to relocate could be lost in the rewrite.** It is a separately
  graded criterion (6) precisely because the rewritten sentence is where it would go
  missing.
- **The remedy is only as good as the assumption above.** If a live run shows `path`-form
  entry does not clear the guard, the shipped prose is wrong in a new way. That is why the
  follow-up validation card is named rather than assumed.

## Requirements

### Requirement: The root `CLAUDE.md` no longer claims `EnterWorktree` is unused

*Card criterion 1.*

#### Scenario: the blanket claim is gone

- **WHEN** the Worktrees section of `CLAUDE.md` is read in the worktree after the change
- **THEN** it contains no statement that `EnterWorktree` is not used, is deliberately not
  used, or is unavailable for story worktrees — `grep -n 'deliberately not used' CLAUDE.md`
  returns nothing, and no reworded equivalent appears anywhere in the section

### Requirement: The `.claude/worktrees/` restriction is attributed to the `name` form

*Card criterion 2.*

#### Scenario: the restriction names its form

- **WHEN** the corrected sentence is read
- **THEN** it ties `.claude/worktrees/` specifically to `EnterWorktree`'s `name` form
  (naming that form), and makes no claim that the tool as a whole only accepts worktrees
  under `.claude/worktrees/`

### Requirement: The `path`-form remedy is stated for a session that must isolate

*Card criterion 3.*

#### Scenario: the remedy is stated where the reader already is

- **WHEN** a reader of the Worktrees section is a session the harness requires to isolate
  itself before it may write
- **THEN** that section tells them to enter the **already-created** worktree by `path`,
  and does so without requiring them to consult any other file

### Requirement: Entering by `path` is stated to leave the worktree in place

*Card criterion 4.*

#### Scenario: the location is stated as unchanged

- **WHEN** the corrected sentence is read
- **THEN** it states that entering by `path` leaves the worktree at `.worktrees/<branch>`
  — that nothing moves and no relocation is involved

### Requirement: Absolute-path addressing survives the edit

*Card criterion 5.*

#### Scenario: the addressing convention is intact

- **WHEN** the Worktrees section is read after the change
- **THEN** it still instructs dispatched agents to address the worktree by absolute path
  rather than cwd, with `-C <path>` on git calls and absolute paths under `<path>` for
  file tools

### Requirement: The do-not-relocate instruction survives the edit

*Card criterion 6.*

#### Scenario: relocation is still refused

- **WHEN** the Worktrees section is read after the change
- **THEN** it still instructs the reader not to relocate story worktrees to match
  `EnterWorktree`, and `git -C <worktree> diff b8c5911 -- CLAUDE.md` shows no change to
  the location rule at lines 9-12

### Requirement: The `lead` skill names the isolation fallback

*Card criterion 7.*

#### Scenario: the fallback is in the skill, where the worktree is created

- **WHEN** `plugins/ca77y-engineering/skills/lead/SKILL.md` is read at step 2 (*Create the
  workspace*)
- **THEN** it names entering the existing worktree by `path` as the remedy when a harness
  refuses writes pending session isolation, and names the `name` form as the thing not to
  use because it would relocate the worktree

#### Scenario: stated once, and project-agnostic

- **WHEN** the whole of `SKILL.md` is searched for the fallback
- **THEN** exactly one passage states the duty (any other mention is a pointer to it, not
  a second readable statement of it), and that passage names no project-specific worktree
  path — it refers to the worktree the skill just created, wherever the project's context
  places it

### Requirement: A fix run on an open PR can reach the same remedy

*This requirement is the one deliberate addition beyond the card's scope bullets (see
Design). It is separable: cutting it leaves requirements 1-7 and 9 intact.*

#### Scenario: the recovery step points at the remedy

- **WHEN** the *Invoked on an open PR* section is read by a fix run that has just
  recovered or recreated the worktree
- **THEN** it points at step 2's isolation step for the case where the harness refuses
  writes, without restating the duty

### Requirement: The canonical paragraph and the rest of the tree are untouched

*Card criterion 8, plus the Boundary.*

#### Scenario: five-file drift check still reports one distinct copy

- **WHEN** the root `CLAUDE.md`'s five-file drift check is run in the worktree
- **THEN** it reports a single distinct copy of the `**Addressing the story worktree.**`
  paragraph across `plugins/ca77y-engineering/agents/{coder,writer,qa,auditor}.md` and
  `plugins/ca77y-engineering/skills/lead/SKILL.md` — printing `1` when the snippet is run
  as written, or five **identical paragraph lines** (the bare paragraph text, with no
  line-number prefix, so the five outputs are literally comparable) when run as the
  plain-command equivalent an isolated session requires (below)

#### Scenario: nothing else changed

- **WHEN** `git -C <worktree> diff --stat b8c5911` is read
- **THEN** the only changed files are `CLAUDE.md`,
  `plugins/ca77y-engineering/skills/lead/SKILL.md`, this spec, and
  `docs/AGENTS_IMPROVEMENTS.md` — the last carrying an appended process-feedback entry from
  the spec pass, not a product of the build; no `plugin.json` version changes; and the
  `SKILL.md` diff does not touch line 16's canonical paragraph

### Requirement: Validation runs from the shipping session

#### Scenario: the checks are executable as given

- **WHEN** the validating session runs the checks below in the worktree, whether or not the
  harness has isolated it
- **THEN** each check completes and reports its documented result, with any isolated-session
  hand-translation taken from this spec rather than invented, and no edit made to the
  snippets in `CLAUDE.md`

The checks, all read-only, all inside the worktree:

1. **Five-file paragraph identity** — as the root `CLAUDE.md` presents it (expected: `1`).
   Isolated-session equivalent: five plain commands, **no `-n`**, expected to print five
   byte-identical paragraph lines that can be compared directly —

   ```
   grep '^\*\*Addressing the story worktree\.\*\*' plugins/ca77y-engineering/agents/coder.md
   grep '^\*\*Addressing the story worktree\.\*\*' plugins/ca77y-engineering/agents/writer.md
   grep '^\*\*Addressing the story worktree\.\*\*' plugins/ca77y-engineering/agents/qa.md
   grep '^\*\*Addressing the story worktree\.\*\*' plugins/ca77y-engineering/agents/auditor.md
   grep '^\*\*Addressing the story worktree\.\*\*' plugins/ca77y-engineering/skills/lead/SKILL.md
   ```

   `-n` must **not** be added: the paragraph sits at a different line in each file
   (`coder.md:14`, `writer.md:10`, `qa.md:10`, `auditor.md:14`, `SKILL.md:16` at
   `b8c5911`), so a line-number prefix makes five identical paragraphs print as five
   different lines and the comparison stops meaning anything. The single-command original
   avoids this the same way, via `grep -h`.

2. **Board-profile paragraph identity** — the second drift check in `CLAUDE.md` (expected:
   `1`). Isolated-session equivalent: two plain commands, same shape, same no-`-n` rule,
   expected to print two byte-identical paragraph lines —

   ```
   grep '^\*\*Working from the board profile\.\*\*' plugins/ca77y-engineering/agents/writer.md
   grep '^\*\*Working from the board profile\.\*\*' plugins/ca77y-engineering/agents/auditor.md
   ```

   Neither file is edited by this story, so this check only confirms no collateral damage.

3. **Manifest parity** — the `CLAUDE.md` loop (expected: `ok` per plugin). Its `for` loop
   with command substitution is the shape an isolated session refuses, so the isolated
   path is the one to expect to need. Isolated-session equivalent: four plain commands, one
   per manifest file, compared by eye per plugin —

   ```
   python3 -c "import json;print(json.load(open('plugins/ca77y-engineering/plugin.json'))['version'])"
   python3 -c "import json;print(json.load(open('plugins/ca77y-engineering/.claude-plugin/plugin.json'))['version'])"
   python3 -c "import json;print(json.load(open('plugins/ca77y-library/plugin.json'))['version'])"
   python3 -c "import json;print(json.load(open('plugins/ca77y-library/.claude-plugin/plugin.json'))['version'])"
   ```

   Expected at `b8c5911`, and expected unchanged by this story: `2.3.0`, `2.3.0`, `1.0.0`,
   `1.0.0` — the two values within each plugin equal, and all four identical to what
   `b8c5911` carries. A story that changes any of them has bumped a version, which this
   story must not do.
4. **Mention sweep** — `grep -rn 'EnterWorktree' --include='*.md' <worktree>`, one plain
   command. Expected after the build, in exactly four files and no others:
   `CLAUDE.md` (the corrected sentence), `plugins/ca77y-engineering/skills/lead/SKILL.md`
   (the new step-2 bullet plus the *Invoked on an open PR* pointer), this spec (until the
   docs pass removes it), and `docs/AGENTS_IMPROVEMENTS.md` (this run's process-feedback
   entry, which quotes the `name`/`path` distinction). The graded property is that **no
   other instructional file** gains a mention — in particular none of
   `plugins/ca77y-engineering/agents/*.md`, `README.md`, or `docs/ARCHITECTURE.md` at build
   time; `README.md` and `docs/ARCHITECTURE.md` may gain one later, in the docs pass.
5. **Diff inspection** — `git -C <worktree> diff b8c5911 -- CLAUDE.md plugins/ca77y-engineering/skills/lead/SKILL.md`,
   one plain command. Read for requirements 1-8 by inspection, since every criterion here
   is a property of prose. Expected non-empty after the build; expected to touch only the
   Worktrees sentence in `CLAUDE.md` and the two `SKILL.md` sites named in the Boundary.

## Tasks

- [ ] Rewrite `CLAUDE.md:14-17` per *The corrected `CLAUDE.md` paragraph*: keep sentence
      one and the do-not-relocate instruction, attribute `.claude/worktrees/` to the
      `name` form, state the `path`-form remedy and that the worktree stays at
      `.worktrees/<branch>`. Change nothing else in the Worktrees section.
- [ ] Add the isolation-fallback bullet to `SKILL.md` step 2, after **Branch and
      worktree** — one statement, outside the canonical paragraph, with no
      project-specific path.
- [ ] Add the one pointer clause in *Invoked on an open PR* to step 2's isolation step
      (the deliberate addition; drop it if the `lead` cut it).
- [ ] Run the five checks in *Validation*, using the isolated-session equivalents if the
      session is isolated, and record each result. Do not edit the snippets in `CLAUDE.md`
      — that is SMR-186.
- [ ] **Not the `coder`'s task — owned by the docs pass (`writer`, step 7).** Reconcile
      the shipped `lead` behaviour into `README.md`'s workspace-creation step (line ~309,
      per `docs/CLAUDE.md`: the README is the user-facing description of every agent) and
      `docs/ARCHITECTURE.md`'s *The story worktree contract* (line ~265), then convert and
      remove this spec. No card criterion covers these two files, which is why the owner is
      named here rather than left to be rediscovered by the acceptance gate.
- [ ] **Not the `coder`'s task — follow-up card, named in the `lead`'s handoff.** A live
      background `lead` run that meets the write guard and reports whether `path`-form
      entry clears it — the only thing that converts this spec's stated assumption into a
      verified one, and the same relationship SMR-180 has to SMR-154. No build step can
      produce it.
