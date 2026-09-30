# agentic-slop toolkit for Claude Code

Two independently installable plugins provide six normal entry points. The main session owns the requested outcome, evidence, model selection, and the retry allowance shared across agents and gates for each unresolved problem within one run from user prompt to resolution. Every skill but `ask` allows three failures and then stops for the user; `ask` is read-only and has none. A separate later request, including PR comment review, starts its own budget; reading comments or discovering defects does not consume attempts.

| Plugin      | Normal work                                                                                                                                                                                             | One-time setup                                                                                                                                  | Supporting agents                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Engineering | `shape` produces proposals/specs; explicitly invoked `deliver` implements or repairs through a verified PR.                                                                                             | `bootstrap` creates board and forge declarations, or verifies and fixes existing ones.                                                          | coder, writer, qa, auditor           |
| Library     | `research` investigates and saves cited evidence; `ask` answers from existing library knowledge without internet requests or library writes; `lint` checks the whole library and repairs it on request. | `bootstrap` creates the Markdown library, or verifies and fixes its configuration; Obsidian is optional, with the repository root as the vault. | researcher, librarian, scribe, clerk |

Nontrivial changes require a written spec and fresh validation before production, then a different fresh validator for the candidate. Trivial changes can skip the written spec but still require fresh validation. In `deliver` the main session only orchestrates: the writer produces specs and documentation, the coder produces code and tests. Validation is never done by the main session.

Engineering uses a fresh auditor for spec readiness and document acceptance, or fresh QA for code behavior and tests. One adequate final evaluation can include affected documentation and mechanical checks. Library uses fresh clerks for research specs and persisted research, and for an `ask` answer when the user asks for it verified. Production leaves author artifacts and tests, and the coder runs its tests as it works; validators give the verdict and never repair the candidate. Every validation is a fresh `Agent` dispatch, never a `SendMessage` continuation.

Researchers return new-source findings and provenance. Librarians retrieve existing knowledge read-only. The main session or one designated scribe integrates synthesis and shared metadata after raw-note writers finish. Research uses the source provider the project names.

## Delivery routing

Each agent pins its model and effort in its definition: the writer and auditor run on `opus` at medium effort, the coder and QA on `sonnet` at high effort, and every library agent on `sonnet` at medium effort. A `deliver` run has two budgets of three failures, one for the spec and one for the implementation; when either runs out, the run stops and hands the evidence to the user.

## Review loop

Once the PR opens, `deliver` fires the review the forge declaration names (unless opening fires it) and waits for it with monitors: one until the review starts, then one until it finishes. Each finished review starts a round: findings are sorted into defects and non-issues, the defects are fixed and verified by a fresh QA, and the fix is pushed and reviewed again. After at most three rounds, or once no defect remains, `deliver` reports what was fixed, each non-issue with its reason, and anything left unfixed. Invoking `deliver` with a PR and its findings enters the same loop.

## Ledgers

Only `deliver` keeps a ledger: one append-only file per story worktree at `.tmp/ledger.md`, written and read only by the main session. It logs one line per run, spec revision, dispatch (with agent ID), report, verdict (with its budget's failure count), and next action, so a resumed session reads from the last run line instead of the whole file. Workers never see it; each brief carries what the worker needs. The other skills keep their attempt history in the conversation.

## Project authority

Project authority lives in [`docs/BOARD.md`](docs/BOARD.md), [`docs/FORGE.md`](docs/FORGE.md), and `library/_meta/librarian.md` in the target project. Explicit `deliver` invocation authorizes the task branch/worktree, attributable commits, verified push, PR creation or update, and the declared review trigger on that PR. Implementation requested without `deliver` may remain uncommitted on the default branch; a proposal does not imply filing a card. Every skill assumes the project is bootstrapped; rerun `bootstrap` to verify and fix the setup.

## Install

```bash
claude plugin marketplace add ca77y/agentic-claude
claude plugin install slop-eng@agentic-slop
claude plugin install slop-lib@agentic-slop
```

Either installs alone. `slop-lib` needs nothing else; `slop-eng` uses `slop-lib:librarian` when installed and reads library files directly, saying so, when it is not. Run `/reload-plugins`, or start a new session, after installing or updating to load skills and agents.

`deliver` has model invocation disabled — run it as `/slop-eng:deliver`. Other skills run by qualified name, such as `/slop-lib:research`, or by describing matching work. Dispatch names are plugin-qualified: `slop-eng:coder`, `:writer`, `:qa`, `:auditor`; `slop-lib:researcher`, `:librarian`, `:scribe`, `:clerk`.

`deliver` dispatches several background agents that run git, tests, and the forge CLI, so it is designed for auto-approve or bypass permission mode; in default mode those agents' permission prompts arrive while the main session is waiting.
