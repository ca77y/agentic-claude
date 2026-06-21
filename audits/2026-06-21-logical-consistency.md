# Logical Consistency — resolved

> Triaged 2026-06-21. Every one of the original audit's 25 claims was re-verified against
> the live agent files first; the 3 false positives + 1 misread were dropped. All real
> findings are now resolved — the clear in-repo defects were fixed directly, and the five
> decisions/scaffold items were settled from your inline answers (kept below as the trail).
> **All edits are uncommitted in the working tree.**

## ✅ Fixed directly (single correct, in-repo fix)

- **H1 — engineer had no no-result handling on its code-review gate** *(the one functional gap)*.
  An exhausted `agy` **plus** an empty `gemini` result read as "clean" and the unit shipped
  unreviewed. `engineer.md` now blocks the unit on a genuine no-result (reviewer bullet +
  step 6 "actually completed" + a boundary), mirroring `lead`/`writer`/`analyst`. Defense-in-depth:
  `lead.md` step 10 re-reviews (or holds) any unit whose engineer reports a blocked gate.
- **M3 — researcher's library-health loop had no cap** → `researcher.md` step 7 now caps the
  audit→fix→re-audit cycle at 2–3 rounds and reports the unresolved findings instead of looping.
  (The hard-fail `agy` case stays a hard block, untouched.)
- **L1 — README documented the agy syntax with `@`** (a silent no-op per `gemini.md`/SKILL.md) →
  README §gemini now uses the namespaced `/code-review:code-review`, `/code-review:pr-code-review`,
  `/ca77y-library:{librarian,scribe,clerk}`; the researcher narrative drops the sigil to plain names.
- **L3 — spec `Status: … | Shipped`** was unreachable (writer converts-and-deletes) → trimmed to
  `Draft | Approved | In Progress` in `product-owner.md`. *(Say the word and I'll drop the whole
  write-once field too.)*
- **L5 — lead never named which spec is the engineer's own** → `lead.md` step 8 hands the explicit
  spec path/slug; `engineer.md` step 1 confirms *that* spec, not a guess.
- **L7 — `lead` step 9 "merge" was a no-op for a single unit** → single-unit carve-out added.
- **L8 — writer removed the spec *before* its audit gate** (blocked audit = lost spec, unresumable)
  → `writer.md` reordered: fold in step 4, **remove only after the audit passes** (new step 8); a
  blocked gate leaves the spec intact. `lead.md` step 11 gets a defined exit.
- **L10 — `@librarian/@scribe/@clerk` sigils in prose** → dropped to plain role names.
- **L2 — engineering manifest version drift** — already fixed by the optimization pass (root → `0.8.3`).
  *(The recurring-drift guard is the optimization audit's Q-A — you chose a CLAUDE.md "check before
  bumping" instruction, which still needs writing; tracked there.)*

## ✅ Settled from your answers

- **M1 — `[<]` Ready / first approval gate** → *you: "my own gate to what I want to work on next… no
  formal process; lead should accept tasks from any state."* **Applied:** dropped `[<]` Ready from the
  legend (`analyst.md`, README) and made it explicit that the `lead` starts an invoked story from
  **any** board state (`lead.md` step 1, README). Approval stays off-board = the act of invoking the lead.
- **M2 — acceptance-criteria granularity** → *you: "enumerate."* **Applied:** the `analyst.md` card
  template now has a discrete `Acceptance criteria:` sub-section with one checkable `- [ ]` item per
  criterion (+ a rule that they're individually checkable, never a prose blob); `lead.md` step 10 treats
  each enumerated item as one acceptance gate. **⚠ External follow-up:** the vault's Templater **card
  scaffold** (`docs/_templates/`, in the target vault — not this repo) must be updated to emit this same
  shape, or the scaffold and `analyst.md` will disagree.
- **L4 — stale `status: backlog` frontmatter** → *you: "drop status."* **Applied:** removed the
  `status:` line from the card template and the `status` mention in `analyst.md`; the checkbox is the
  sole source of truth. **⚠ Same external follow-up** as M2 — drop `status:` from the vault card scaffold too.
- **L6 — code-review diff scope** → *you: "no need to add a dir, cwd should be enough; make sure the
  engineer commits so the lead has already-committed changes."* **Applied:** no `--add-dir` (kept cwd
  grounding). Engineers already commit each unit (`engineer.md` step 6), so `lead.md` step 10 now reviews
  the **committed `story-base..story-head` range** post-merge, and `gemini.md` code-review mode notes a
  post-merge review must name the committed range (an uncommitted-diff review would see nothing).
- **L9 — where library agents write `AGENTS_IMPROVEMENTS.md`** → *you: "doesn't matter, throwaway file,
  no changes."* **No change.**

---

*The one open thread is external to this repo: the target vault's Templater **card scaffold** must be
updated to match the M2 (enumerated `Acceptance criteria:`) and L4 (no `status:` frontmatter) changes.
I can do that when working in the vault repo. Provenance: raw 25-finding audit output at
`/private/tmp/claude-501/-Users-catty-Workspace-agents/b2542f9e-e6d7-4a7f-b85a-eb85d519422e/tasks/wt7xx3g4s.output`.*
