# agentic-slop toolkit for Claude Code

Two independently installable plugins provide five normal entry points. The main session owns the requested outcome, evidence, model selection, and the retry allowance shared across agents and gates for each unresolved problem within one run from user prompt to resolution. Delivery uses complexity-based routing with three initial attempts per task/problem followed by one per higher model tier through opus; standalone shaping, library work, and bootstrap retain a three-failure limit. A separate later request, including PR comment review, starts its own budget; reading comments or discovering defects does not consume attempts.

| Plugin | Normal work | One-time setup | Supporting agents |
| --- | --- | --- | --- |
| Engineering | `shape` produces proposals/specs; explicitly invoked `deliver` implements or repairs through a verified PR. | `bootstrap` creates or completes board and forge declarations. | coder, writer, qa, auditor |
| Library | `research` investigates and saves cited evidence; `ask` answers from existing library knowledge without internet requests or library writes. | `bootstrap` creates or safely completes the Markdown library; Obsidian is optional. | researcher, librarian, scribe, clerk |

Nontrivial changes require a written spec and fresh validation before production, then a different fresh validator for the candidate. Trivial changes can skip the written spec but still require fresh validation. Production delegation is optional; the main session can do scoped production work directly. Validation is never done by the main session: a missing validator blocks the affected gate.

Engineering uses a fresh auditor for spec readiness and document acceptance, or fresh QA for code behavior and tests. One adequate final evaluation can include affected documentation and mechanical checks. Library uses fresh clerks for research specs, answers, evidence, and integrity. Production leaves author artifacts and tests; validators report findings and execute checks without repairing the candidate. Every validation is a fresh `Agent` dispatch, never a `SendMessage` continuation.

Researchers return new-source findings and provenance. Librarians retrieve existing knowledge read-only. The main session or one designated scribe integrates synthesis and shared metadata after raw-note writers finish. Research uses the source provider the project names and reports its absence without substituting another.

## Delivery routing

Engineering execution specs carry overall and per-task complexity scores (1–10) with rationales. The [delivery matrix](plugins/slop-eng/skills/deliver/SKILL.md#complexity-and-model-selection) dispatches `haiku` for scores 1–4, `sonnet` for 5–8, and `opus` for 9–10, with sonnet as the calibration anchor and justified stronger starts recorded. A task gets three attempts at its starting tier, then one corrective attempt at each higher tier; an opus failure after that stops the run. Spec production and implementation keep separate retry histories: a stronger spec author does not impose its model on child tasks. Agent definitions pin no model — every dispatch passes one — and effort is not a dispatch parameter.

`--fast` on `deliver` or `shape` steps every dispatch one tier down (`opus → sonnet → haiku`, haiku the floor), validators included. It changes no score, gate, or allowance.

## Review loop

`deliver` fires the review the forge declaration names once the PR opens (unless the declaration says opening fires it), then ends with the PR open and reported as not yet reviewed; it never waits on or polls the review. Review findings come back by invoking `deliver` again with the findings or the PR: a repair run on the same branch and PR that pushes the verified fix and re-fires the declared review.

## Ledgers

Every entry point, including bootstrap, keeps a durable ledger owned by the main session. It records progress, returned agent IDs, assignments, gate evidence, and failure history before waits and handoffs. Engineering delivery also records overall/task complexity, intended and actual model, selection rationale and per-tier escalation state. Reuse it across skills and resumptions of that run; a separate later user request gets a new ledger and count, with prior ledgers retained as context. Project ledgers use `<temp-folder>/ledgers/<run-id>.md`, with the temp folder read from the forge declaration and defaulting to `.tmp/` under the project root; without a project, `~/.claude/ledgers/`. Ledger writes verify Git ignore protection first and add a local exclude rule when needed. Each plugin ships a template: [engineering](plugins/slop-eng/skills/deliver/assets/ledger.md) and [library](plugins/slop-lib/skills/research/assets/ledger.md).

## Project authority

Project authority lives in [`docs/BOARD.md`](docs/BOARD.md), [`docs/FORGE.md`](docs/FORGE.md), and `library/_meta/librarian.md` in the target project. Explicit `deliver` invocation authorizes the task branch/worktree, attributable commits, verified push, PR creation or update, and the declared review trigger on that PR. Implementation requested without `deliver` may remain uncommitted on the default branch; a proposal does not imply filing a card. Normal work consumes setup without running bootstrap.

## Install

```bash
claude plugin marketplace add ca77y/agentic-claude
claude plugin install slop-eng@agentic-slop
claude plugin install slop-lib@agentic-slop
```

Either installs alone. `slop-lib` needs nothing else; `slop-eng` uses `slop-lib:librarian` when installed and reads library files directly, saying so, when it is not. Start a new session after installing or updating to reload skills and agents.

`deliver` has model invocation disabled — run it as `/slop-eng:deliver`. Other skills run by qualified name, such as `/slop-lib:research`, or by describing matching work. Dispatch names are plugin-qualified: `slop-eng:coder`, `:writer`, `:qa`, `:auditor`; `slop-lib:researcher`, `:librarian`, `:scribe`, `:clerk`.
