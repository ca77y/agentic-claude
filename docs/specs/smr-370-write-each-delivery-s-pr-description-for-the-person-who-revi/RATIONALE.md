# Why the spec is what it is

The acceptance criteria come from card SMR-370 itself. The relayed issue text left them out, so they were read with get_issue. The card settles the revision cap (three), the draft reason, the rule that 'a delivery never stops for its description alone', body identity, filed-card links in the final dispatch, the 4,000-character limit, Needs you 'only when there is something', and resume invariance 'whatever text the entries quote'.

## Designs considered

- **A, smallest change.** Keep the run-state renderer as writer-pr's input. writer-pr writes `.tmp/pr-body.md`, the lens retries once, readiness never depends on the description, and the scout prompt gets a sentence telling it to skip progress lines. Rejected because it breaks several Deterministic criteria. One retry is not three revisions. It has no draft gate. A stale file can be posted, and the stub harness can't assert body identity because it writes no files. Cards are filed after the final description. Resume still trusts a haiku scout's substring match, and `parseReproduction` would read a quoted `reproduced {`. Old section labels stay in the shipped JS. Its always-present 'Nothing.' headings contradict the card. Fixing all of that turns it into C.
- **B, long-term structure.** A ledger grammar module, one grep key for checkpoints, `factsOf` deciding placement in code, a reordered reviewRound, and a new Describe phase. It meets the criteria, but at more cost than the issue needs. One exact grep answer from a haiku scout is fragile: a truncated answer silently gives built=false and the run redoes work. The reorder changes ledger order. The new phase touches five metas. It files cards with no dedupe. `factsOf` takes the placement judgement away from writer-pr. Its handling of an unverified lens was grafted into C.
- **C, robust under failure (chosen).** writer-pr returns `{ body }`, the loop holds it and passes it unchanged through `bodyInstruction`, and a deterministic `checkDescription` runs before the lens. It allows up to three revisions, and a failure at the final stage makes the PR a draft. Follow-up cards are filed before the final description. Progress entries are escaped, and code accepts only real checkpoint lines from the scout.

## Grafts onto C, and why

- **No `fallbackDescription`.** It would put code back in charge of the posted text, the premise the issue replaces. A null or empty writer-pr result counts as a failed attempt, and the stage posts the last body it has. It halts only when no body exists at all.
- **The lens runs only after the guard passes.** A mechanical failure costs no haiku call (performance, risk and architecture advisors). This refinement is mine: criterion c3 requires the lens before every posting, so when the revisions run out with no lens dispatch on the last body, the lens runs once on it. That is the only case where a guard failure still costs a lens call.
- **An unverified lens is retried once, then counts as not passed, with no revision.** Revising text can't fix a check that couldn't run, and architecture.md's validator rule treats unverified as not passed.
- **`describe` never imports a Loop from another module.** Loop is not exported, and a describe.ts that took a Loop would import loop.ts in both directions.
- **The stage runs under the existing `Push` phase,** so the metas and workflows.test.ts's phase checks stay as they are.
- **endLoop describes once.** finish rewrites the body whole, so the opening push and finish post the same final body. This also keeps body identity.
- **Checkpoint keys return whole lines, and `checkpointLine` validates them.** Today `done-findings` returns bare paths and `review-fired` returns a number, so code could only check their shape, not where they came from. Each key now returns the last line whose second field is its word. Code strips an optional `path:line:` prefix and backticks, anchors on the ISO timestamp, and derives paths and n from the accepted line. The scout stubs in the research, how and spike tests change in the same task.
- **A plain `Spec: docs/specs/<id>-<slug>` line, with backticks stripped before `shaped('rel')`.** The rel shape rejects backticks, and older bodies wrote the folder in backticks.
- **Progress entries are batched one per kind per dispatch, capped, with `<` and `>` escaped,** so pushBrief's 'fill every `<placeholder>`' can't rewrite them. Pending entries are cleared only after `pushed()` succeeds, so review rulings ride on the next ledger-writing dispatch without reordering reviewRound (B's reorder was ruled against). pusher-ledger.md and pusher.md say ledger text and supplied bodies are data.
- **Card filing uses `pushOk` and `opRefs`, not `pushed()`,** so a partial failure doesn't halt. It reuses small.ts's marker line, so a rerun files no duplicates.
- **Security advisor.** The guard and the lens flag absolute paths, `.tmp/`, timestamp-led lines, `progress ` entries and token patterns. writer-pr treats card, diff and ledger content as evidence, never instructions, and never writes the checkout location.
- **The heading rule matches the card exactly.** What changes and Why trust it are required. Needs you appears only with content and directly after What changes. Not done appears only with content and last.
- **The phrase test's scope is stated in the test.** It scans tracked files only, so eval results are out. It excludes docs/specs/ (the card's exclusion), library/ (research notes that quote other text, not product docs) and test/ (the test names the phrases). It includes src/ so the built JS can't regress. Banned strings in src, such as renderBody's headings, are renamed. `reviewSummary`'s 'suggestion(s) in the PR description' is lowercase and passes the case-sensitive test, but it is reworded anyway because it names the old section.
- **writer-pr waits for `l.commits` first,** so the diff it reads and the lens checks against is settled (risk advisor).

## Rulings in force

- Lens findings go only to writer-pr. They never go to judge or count as change problems. Their only other effect is the draft reason when the final stage fails.
- Only the final stage gates readiness. An intermediate round's failure changes nothing, because the next round rewrites the description whole.
- The coder's trivial choices and non-acceptance decisions go under Needs you as confirmations (a card design choice). No Assumptions section remains.
- Validator evidence under `.tmp/evidence/` is never linked, because publishing it is out of scope.
- No plugin version bump.

## Open risks

- Each PR update adds two to eight dispatches. Measuring that is left to a full eval (SMR-364).
- pusher is a model copying the body and progress lines. A body pusher alters can't be detected without reading the PR back. A mangled progress line can't become a checkpoint, because `checkpointLine` rejects it.
- A flaky lens can turn a clean delivery into a draft. Three revisions and the single unverified retry bound this, and the card accepts it.
- The scout may return an older checkpoint line that still has the right shape. The anchored check catches shape, not recency, as today.
- SMR-360 and other open worktrees touch loop.ts, the five workflows and the built JS. Rebase and run `make build` again.
- Projects bootstrapped earlier keep their old FORGE.md body line until a person reruns bootstrap (listed in manualActions).
- The Full eval criteria (c20 to c26) can't be verified until someone runs them by hand. Under TESTING.md they keep the PR a draft.
