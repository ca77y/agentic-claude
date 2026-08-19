# lead — gate escalations

Loaded on demand by `ca77y-engineering:lead` when a gate outcome escalates past plain routing: a problem survives the `junior-coder`'s three attempts (the promotion), the acceptance gate grades a criterion **mis-worded**, or the post-commit-1 lint floor is trusted and failing. Everything here binds exactly as if it were written in the skill definition, alongside the definition's own rules, which keep binding — *When a gate finds a problem* still routes, and *The 3× rule* is still the one hard stop.

## The promotion — the 3× rule's one carve-out

**Its one carve-out is a promotion, and it fires once.** Where the coder in play is the `junior-coder` and a problem survives its three attempts, dispatch a fresh `ca77y-engineering:senior-coder` to finish the task, with the fresh-dispatch payload from *Dispatch, resume, and collection* — naming `${CLAUDE_PLUGIN_ROOT}/references/coder-fix-round.md`, by path, as the file the senior reads first, since this dispatch opens on findings — the full findings set as it stands, and **what the junior already tried and why it did not close**. Record the promotion in the ledger with what tripped it. It replaces the tier: every later round goes to the senior, the score re-routes nothing, and the senior gets its **own** three attempts, after which the hard stop applies unmodified. A coder already the senior (by score, fallback, or promotion) has no second carve-out; the carve-out is the coder's alone — a spec gate or a returning review finding is bounded by the plain rule.

## A mis-worded criterion at the acceptance gate (step 6)

A **mis-worded** finding routes to nobody in this run (the `coder` cannot reword a card, and `docs/BOARD.md` bars a post-build criterion correction). Escalate it to the human — the **one gate outcome the run proceeds past**, to the docs pass and the PR, once every other criterion is met. Name it in the PR description, the card's handoff comment (step 8), and the *Final handoff*; the correction belongs to a **later run's spec pass** on the corrected card.

## The post-commit-1 lint floor, trusted and failing (step 3)

The floor itself is run per step 3 of the skill definition — once per run, immediately after commit 1, before the `coder` is dispatched, per *Running a project command*. This is what happens when it is trusted and failing:

- **Which failure is this run's.** A failure naming **any path commit 1 landed** is this run's — route it to the `writer` per *When a gate finds a problem* and commit the fix as the spec-format-fix commit before dispatching the `coder`; a failure naming **only paths outside commit 1** is pre-existing — record and relay it, never route, fix, or stop on it.
- **The floor-driven fix is re-formatted and backstopped.** Run the format step over the `writer`'s fix before committing it. Where it touched the *Acceptance criteria (verbatim transcription)* block, re-enter the spec-readiness gate first; where not, the acceptance gate's equality check (step 6) is the named backstop.
