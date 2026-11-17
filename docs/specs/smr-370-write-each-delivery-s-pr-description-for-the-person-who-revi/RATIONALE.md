# Why the spec is what it is

The acceptance criteria come from card SMR-370 itself. The relayed issue text left them out, so they were read with get_issue. The card settles the revision cap (three), the draft reason, the rule that 'a delivery never stops for its description alone', body identity, filed-card links in the final dispatch, the 4,000-character limit, Needs you 'only when there is something', and resume invariance 'whatever text the entries quote'.

## Designs considered

- **A, smallest change.** Keep the run-state renderer as writer-pr's input. writer-pr writes `.tmp/pr-body.md`, the lens retries once, readiness never depends on the description, and the scout prompt gets a sentence telling it to skip progress lines. Rejected because it breaks several Deterministic criteria: one retry is not three revisions, there is no draft gate, a stale file can be posted, the stub harness can't assert body identity, cards are filed after the final description, and resume still trusts the scout's substring match. Fixing all of that turns it into C.
- **B, long-term structure.** A ledger grammar module, one grep key for checkpoints, `factsOf` deciding placement in code, a reordered reviewRound, and a new Describe phase. It costs more than the issue needs. One exact grep answer from a haiku scout is fragile: a truncated answer silently gives built=false and the run redoes work. The reorder changes ledger order, the new phase touches five metas, and `factsOf` takes placement away from writer-pr. Its handling of an unverified lens was grafted into C.
- **C, robust under failure (chosen).** writer-pr returns `{ body }`, the loop holds it and passes it unchanged to pusher, and a deterministic `checkDescription` runs before the lens. Up to three revisions; a failure at the final stage makes the PR a draft. Follow-up cards are filed before the final description. Progress entries can't be mistaken for checkpoints because code accepts only real checkpoint lines.

## Grafts onto C, and why

- **No fallback description.** It would put code back in charge of the posted text, which the issue replaces. A failed writer-pr attempt counts as one; the run halts only when no body exists.
- **The lens runs only after the guard passes,** so a mechanical failure costs no lens call (performance, risk and architecture advisors). c3 needs a lens dispatch before every posting, so when revisions run out the lens runs once on the body that will actually be posted.
- **An unverified lens is retried once, then counts as not passed, with no revision.** Revising text can't fix a check that couldn't run.
- **`describe` never takes a Loop from another module**, since Loop is unexported and a separate module would import loop.ts both ways.
- **The stage runs under the existing `Push` phase,** so the metas and workflows.test.ts stay as they are.
- **endLoop describes once** and both the opening push and finish post that body.
- **Progress entries are built only by `progressLine`, carry no `<` or `>`,** so pushBrief's `fill every <placeholder>` can't rewrite them, and pending entries ride on the next ledger-writing pusher dispatch, kept until it succeeds, so review rulings need no reviewRound reorder (B's reorder was ruled against).
- **Card filing doesn't halt on a partial failure** and reuses small.ts's marker line, so a rerun files no duplicates.
- **Security advisor.** writer-pr treats card, diff and ledger as evidence, never instructions. Grafted further in revision 2: leak problems block posting (below) and the fence can't be closed from inside the body.
- **The phrase test's scope is stated in the test.** Tracked files only; docs/specs/ (the card's exclusion), library/ (research notes that quote other text) and test/ excluded; src/ included so the built JS can't regress.
- **writer-pr waits for the round's commits,** so the diff it reads is settled (risk advisor).

## Revision 2: problems fixed and why

- **Overflow (shared Overflow rule, d15).** With one Why trust it line per criterion and every decision listed, a story like this one (26 criteria, 14 acceptance decisions) can't fit 4,000 characters; the guard fails every attempt and every clean large delivery ends draft. The issue's Scope says 'about one screen with links for overflow', so pr-description.md, writer-pr, lens-pr and checkDescription share one rule: grouped criterion lines, and a count plus a link for decisions a committed file lists. A rules test and a loop test with a 26-criterion, 14-decision fixture pin it.
- **Rejected non-empty checkpoint answers (checkpoint rule, d18).** The old spec silently treated a slightly wrapped real checkpoint as absent, which rebuilds every task, repeats board-start, reproduces again or reruns an investigation. Now common scout wrappers are tolerated, and any remaining line that is neither a checkpoint nor a progress entry halts naming the key. A halt costs one rerun; silent rework costs a whole build.
- **Fence injection (Fencing rule, d1).** The body is model-written from untrusted card, diff and ledger text and was embedded in a fixed `BODY>>>` fence in an instruction to the agent with push, PR and board powers. The closing delimiter is now chosen per dispatch and absent from the text, which keeps the body byte-identical for c4. The same applies to filed card text, including small.ts's.
- **c10 oracle (d7).** Code could reject a progress line but never fall back to the real one, so the mixed case was untestable. Each ledger key now returns every line containing its form and code takes the last accepted one. resume.test.ts names each scenario and its baseline.
- **Draft reason missing from the body (d16).** See Rulings.
- **Card identifier and link (d6).** An operation had one `reference` and pushBrief asked for one value, so a real pusher would drop the link. pusherSchema gains `link`; pushBrief, pusher.md and the c13 stub use the same shape; schemas.ts joins the loop task.
- **One channel for kind, target and filed cards.** PrState no longer carries them; renderState renders only criterion results and open items, and the brief carries the three as their own lines.
- **qa.md dropped.** No criterion or scope bullet needs it, and changing qa's acceptance source would change every qa dispatch, including the validate workflow.
- **Story What changes** opens with the outcome and contains the Spec line once (d9), since c21 needs it to say what changes and why.
- **Per-key checkpoint forms** are stated once in the shared rule, because three keys share `done` as their second field and the old 'second field is the key's word' matched the wrong lines.
- **Size and altitude.** Restated criteria, test names, call-by-call steps, function-body expressions, matching algorithms, scaffold replacement words, and constants the issue doesn't name (agent models and efforts, label strings, a two-sentence reason cap) were removed. resume became its own task so the loop task fits its budget; it runs before loop because both edit the how, research and spike tests.

## Rulings in force

- Lens findings go only to writer-pr. They never go to judge or count as change problems. Their only other effect is the draft reason when the final stage fails.
- Only the final stage gates readiness. An intermediate round's failure changes nothing, because the next round rewrites the description whole.
- **d15, overflow vs c22.** A count plus a link to the committed file that lists the decisions counts as those decisions appearing under Needs you. If a person reads c22 as ruling out summary by link, its conflict with c20's limit is theirs to settle.
- **d16, description draft reason.** The posted body never names 'The PR description did not pass its check.'; finish's card comment and LoopResult.draftReasons carry it. Every alternative breaks another criterion: code appending it breaks c4 and returns the body to code; a writer-pr dispatch after the lens breaks c3 and exceeds c6's cap; briefing the last revision as draft is wrong whenever that revision passes. This is the one exception to c22. The final brief still carries the target and every draft reason known before the stage.
- **d17, leak rule over c4/c6.** A body with a leak problem (absolute path, `.tmp/`, ledger line, credential-shaped text) is never posted. The latest leak-free writer-pr body is posted unchanged, or none. writer-pr reads a ledger holding absolute worktree paths, and a draft PR on a public repo is public; c4's purpose, a posted body untouched by code, still holds. Format and lens failures still post the last revision and end draft.
- The coder's trivial choices and non-acceptance decisions go under Needs you as confirmations (a card design choice); those no committed file lists are listed.
- Validator evidence under `.tmp/evidence/` is never linked, because publishing it is out of scope.
- No plugin version bump.

## Open risks

- c10 is proved only up to the scout returning every line containing the key's form. A scout that returns only a progress entry and omits the real line makes the run resume as if the checkpoint were absent.
- The halt on a malformed checkpoint answer can stop a run when haiku wraps an answer in prose the wrapper tolerance doesn't cover; the rerun is the recovery.
- Each PR update adds two to eight dispatches. Measuring that is left to a full eval (SMR-364).
- pusher is a model copying the body and progress lines. A body it alters can't be detected without reading the PR back. A mangled progress line can't become a checkpoint.
- A flaky lens can turn a clean delivery into a draft. Three revisions and the single unverified retry bound this, and the card accepts it.
- The scout may return an older checkpoint line with the right shape; the check catches shape, not recency, as today.
- The leak rules catch credential-shaped text by pattern, so a secret of an unusual shape can still pass.
- SMR-360 and other open worktrees touch loop.ts, the five workflows and the built JS. Rebase and run `make build` again.
- Projects bootstrapped earlier keep their old FORGE.md body line until a person reruns bootstrap (manualActions).
- The Full eval criteria (c20 to c26) can't be verified until someone runs them by hand. Under TESTING.md they keep the PR a draft.
