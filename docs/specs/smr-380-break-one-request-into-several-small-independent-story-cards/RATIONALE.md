# Why the spec is what it is

The issue asks for one run of slopify to turn a larger request into a capped set of story cards. Each card must meet the story contract, be grounded, carry relations to the cards it depends on, and never duplicate a card already on the board. The spec builds this as a split mode of `shape` on top of the code as it is on master. That code includes `MAX_CRITERIA` and `tooBig()` from 9d51d77, which the worktree branch did not have yet.

## Designs considered

- **A, smallest change that fits the existing patterns (chosen).** A split mode of `shape`: Ground once, plan once, then run the existing per-card steps (read, adviseAll, write, refine, file) for each part, filing one card at a time and never more than the cap. Every advisor judged it proceed-with-conditions, and each condition is a graft below.
- **B, best long-term structure.** Move the single-card pipeline into `lib/card.ts`, with set mode in `lib/card-set.ts`. Rejected: no criterion needs about fifteen functions moved out of a `shape.ts` that 9d51d77 and 6fcf3ab changed recently, and moving them in the same diff that changes them makes a single-mode regression hard to review. Its set line names only the request, so on a rerun, whether a part is covered rests on advisor-fit choosing among up to 20 similar cards. Its advisor-scope revision loop, COVERAGE_SCHEMA, free-string scope parameter, and a Kahn sort that duplicates `waves()` add concepts the issue doesn't ask for. It also let a model-read cap exceed what the user authorized. Grafted from B: cap before drafting, batches, `d.done`, the Create binding, and a separate planner agent.
- **C, most robust under failure.** Sequential, catching each part's halt, relation verify and repair, rerun heal, `partial` status. Rejected: `Halt` has no kind (`src/slopify/lib/loop.ts` class Halt has only step and needs), so catching per part would repeat an H3 budget or stop halt, or a systemic H2 such as an unbound relation, for every remaining part, against SHAPE.md's halt contract. The rerun heal writes relations onto cards the run didn't file, such as the hand-filed SMR-381 to SMR-401. That goes beyond the issue's authorization ("up to the cap, and nothing more"). It also leans on `includeRelations`, which has a reported stale-data bug. The `partial` status, repair dispatches, and `relation` op are machinery no criterion needs, and fully sequential drafting makes the run very long. Grafted from C: the request-scoped hidden line, attempts counted before dispatch, refusing an invalid cap, the Create binding, the planner's `omitted` list, and word counts.

## Grafts and the reason for each

- **Hidden line per part = request slug + part key.** Two requests that both have a part called `shopping-cart` must not share a line, or the second would see itself as covered and file nothing.
- **Cap before drafting; covered parts don't count.** No tokens are spent drafting cards that can't be filed. Ordering by dependencies first means the cap cuts dependents, never the parts they depend on.
- **Attempts counted before each pusher dispatch.** A create whose read-back fails (done:false) may still have created a card, so it uses a slot. The guarantee is "never more than N", not "always N".
- **The cap arg wins; a stated cap can only lower the limit (security).** The request's own text is untrusted model input. A planner that reads "cap 50" must not authorize 50. meta.whenToUse tells the main session to pass the user's cap as `cap`. An invalid present cap is refused, not defaulted, because it is the authorization limit.
- **Order with `waves()` (architecture).** It already exists in `lib/rules.ts`, keeps forward edges, and falls back to plan order on a cycle or an unknown id. A second topological sort would be copied logic.
- **Bounded waves that hold the first Halt (architecture).** `parallel()` turns a throw into null (`src/runtime.d.ts`), so a halt inside a wave would be lost. The changeHoldingHalt pattern in loop.ts keeps the first one and rethrows it after the wave, so `stopOf` still returns Stopped. Filing stays sequential and in order, so relations can name cards filed earlier in the same run.
- **`d.done` per filed card.** A halt partway through then lists the cards already filed in `completed`, and a rerun finds them by their hidden lines.
- **Relations bound on Create and Update.** docs/BOARD.md bound only removing relations, and an operation that isn't bound is not performed. The bootstrap reference and template carry the binding, so a project using the plugin gets it, as AGENTS.md requires. BOARD.md's Dependencies line stays unchanged: it is still true.
- **A separate planner agent, writer-split.** It keeps writer-card's one role and avoids a plan file that nothing reads. Its output is typed (PLAN_SCHEMA), as plugin-code.md asks. Each `omitted` entry goes into the report, so a part the planner leaves out is named.
- **Sanitized, index-prefixed part ids (security).** Model-chosen keys end up in draft paths and hidden lines.
- **Checked ids only (security).** A duplicateOf or overlaps id counts only when it equals a location in that part's scout-related-cards evidence. The plugin names no tracker, so the "identifier pattern" is one token, not a board-specific regex (d10). Each pusher brief names exactly one create and never an update to an existing card.
- **Required-parts gate only in split mode (simplify).** In split mode it decides whether a card is filed. Single mode keeps its refine and writer schema, so its tests don't churn. `overlaps` is an optional field on FIT_SCHEMA rather than a second schema.
- **Parts reported as name plus word count, with 0 words rejected in code (C, testability).** This catches "present but empty". A test pins REQUIRED_PARTS to card-templates.md so the two can't drift.
- **Pure helpers in `lib/split.ts` (architecture).** Cap parsing, ordering, selection, and the report can be unit tested, and shape.ts stays one orchestration.
- **Test design (testability).** The pusher returns a fresh id per call and the fake board stores blockedBy, so the relation test asserts the exact id. A deterministic brief test stands in for the Full eval criterion. A halt-partway test proves Stopped names the first card and a rerun files only the missing one.
- **Confirm the live relation write by hand (risk).** The issue asks for this before the relation criterion is built on it. It writes a real card, so it is a manual action, not a task.

## Rulings in force

- Split mode is selected by `split: true` and takes the request as `idea`. It refuses `card` (splitting an existing card is out of scope) and any kind but story.
- A split run never updates, relates onto, or marks an existing card. Covered parts are only reported.
- A part still missing a required part after the last revision is not filed and does not take a cap slot. Its slot is not refilled, because selection happened before drafting. So a run can file fewer than the cap while uncovered parts remain, and the report names them.
- A dependency whose part got no card records no relation, and the report says so.
- c4 (Full eval) cannot run here: the `make eval` target is under SMR-364, and the Cookidoo pages are in another project's library. It is reported cannot-verify, so the PR stays draft under TESTING.md. It must never run against the live board, which holds SMR-381 to SMR-401.

## Open risks

- Rerun stability depends on the planner reusing the same part keys. When keys drift, the hidden line misses and coverage falls to advisor-fit's judgement, which can file a near-duplicate on a live rerun. The deterministic tests cover both routes with stable stubs.
- Whether Linear records blockedBy on create is known only from the MCP tool schema until the manual check is done.
- Cost: each part runs one scout, four advisors, the writer, and up to four check rounds. Grounding once and bounded waves limit this, but a 20-card run can hit an H3 budget halt. The cards filed before the halt stay filed, and a rerun skips them.
- writer-card's `parts` report is trusted the way `criteria` is for tooBig. lens-template still checks every draft as a second layer.
- If the planner leaves a whole-set constraint out of `constraints`, every card misses it. Only the Full eval run can show this.
- Projects bootstrapped before this change lack the relation binding. Their first dependent card halts with H2 until bootstrap is rerun (a manual action).
