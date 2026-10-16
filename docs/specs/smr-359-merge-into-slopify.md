# SMR-359: Merge slop-lib into slop-eng as `slopify`

Linear story SMR-359. Acceptance source: the card, quoted verbatim under [Acceptance criteria](#acceptance-criteria).

## Problem and outcome

The repository ships two plugins, `slop-eng` and `slop-lib`, kept apart by rules that cost more than they give: `slop-eng` may use `slop-lib` only with a reported fallback (`plugins/slop-eng/skills/shape/SKILL.md:11`), `slop-lib` may never name a `slop-eng` agent (root `CLAUDE.md:11`), and SMR-358 would otherwise add a `scout-library` that duplicates the librarian to respect that boundary.

Outcome: one plugin, `slopify`, at version `0.1.0`. It holds the engineering skills and agents plus the library's agents (prefixed `library-`), the `ask` and `lint` skills, a `research` workflow in place of the `research` skill, and one `bootstrap` skill that sets up the board and forge declarations and the research library.

## Scope

In scope (from the card):

- Rename `slop-eng` to `slopify`: directory, `plugin.json` name and description, marketplace entry, and every `slop-eng:` reference.
- Set `slopify`'s version to `0.1.0`.
- Move `slop-lib`'s agents, skills, references, and resources into `slopify`; remove `plugins/slop-lib` and its marketplace entry.
- Rename the library agents: `librarian` → `library-reader`, `researcher` → `library-researcher`, `scribe` → `library-scribe`, `clerk` → `library-clerk`. Their `model` and `effort` stay as they are.
- Replace the `research` skill with a `research` workflow, the plugin's first.
- Merge the two `bootstrap` skills into one.
- `ask` and `lint` stay skills.
- Update `README.md`, root `CLAUDE.md`, `.githooks/pre-commit`, and the evals for one plugin.

Out of scope (from the card): changing what the library agents, `ask`, or `lint` do; the engineering workflows and the scout, lens, and advisor agents (SMR-358); the target project's `library/` layout, including the `library/_meta/librarian.md` filename; migration for existing installs.

Also not part of this PR: creating the `slopify--v0.1.0` tag. Repo convention is an annotated tag `<plugin>--v<version>` (for example `slop-eng--v4.1.1`), and `docs/FORGE.md` forbids autonomous tagging. The tag is cut after merge, on the user's request.

## Approach

### Path mapping

Every tracked path under `plugins/slop-eng` and `plugins/slop-lib` (from `git ls-files plugins`). Use `git mv` so history follows. "Unchanged" means the file moves with no edits beyond renaming `slop-eng:`/`slop-lib:` references and agent names.

| Current path                                                          | New path or disposition                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugins/slop-eng/.claude-plugin/plugin.json`                         | `plugins/slopify/.claude-plugin/plugin.json`: `name` `slopify`, `version` `0.1.0`, new description covering engineering and library                                                                                                                                                 |
| `plugins/slop-eng/agents/{auditor,coder,qa,writer}.md`                | `plugins/slopify/agents/{auditor,coder,qa,writer}.md`                                                                                                                                                                                                                               |
| `plugins/slop-eng/references/*.md` (5 files)                          | `plugins/slopify/references/*.md`, same names                                                                                                                                                                                                                                       |
| `plugins/slop-eng/skills/bootstrap/SKILL.md`                          | `plugins/slopify/skills/bootstrap/SKILL.md`, rewritten as the merged skill (see [bootstrap](#merged-bootstrap))                                                                                                                                                                     |
| `plugins/slop-eng/skills/bootstrap/references/{board,forge}.md`       | `plugins/slopify/skills/bootstrap/references/{board,forge}.md`                                                                                                                                                                                                                      |
| `plugins/slop-eng/skills/bootstrap/resources/{BOARD,FORGE}.md`        | `plugins/slopify/skills/bootstrap/resources/{BOARD,FORGE}.md`                                                                                                                                                                                                                       |
| `plugins/slop-eng/skills/deliver/**` (4 files)                        | `plugins/slopify/skills/deliver/**`                                                                                                                                                                                                                                                 |
| `plugins/slop-eng/skills/shape/**` (2 files)                          | `plugins/slopify/skills/shape/**`; `SKILL.md:11` names `slopify:library-reader` and drops the "when that plugin isn't installed" fallback                                                                                                                                           |
| `plugins/slop-eng/evals/bootstrap-triggers/**`                        | `plugins/slopify/evals/bootstrap-triggers/**`, grader matches `(?:slopify:)?bootstrap`                                                                                                                                                                                              |
| `plugins/slop-eng/evals/deliver-not-automatic/**`                     | `plugins/slopify/evals/deliver-not-automatic/**`, grader matches `(?:slopify:)?deliver`                                                                                                                                                                                             |
| `plugins/slop-eng/evals/deliver-smoke/**` (7 files)                   | `plugins/slopify/evals/deliver-smoke/**`; prompt uses `/slopify:deliver`, graders use `slopify:<agent>`                                                                                                                                                                             |
| `plugins/slop-eng/evals/shape-triggers/**`                            | `plugins/slopify/evals/shape-triggers/**`, grader matches `(?:slopify:)?shape`                                                                                                                                                                                                      |
| `plugins/slop-lib/.claude-plugin/plugin.json`                         | Deleted; its description is folded into `slopify`'s                                                                                                                                                                                                                                 |
| `plugins/slop-lib/agents/librarian.md`                                | `plugins/slopify/agents/library-reader.md`; `name: library-reader`, heading "Library reader"                                                                                                                                                                                        |
| `plugins/slop-lib/agents/researcher.md`                               | `plugins/slopify/agents/library-researcher.md`; `name: library-researcher`; receives the retrieval rules from `retrieval.md` that it lacks (below)                                                                                                                                  |
| `plugins/slop-lib/agents/scribe.md`                                   | `plugins/slopify/agents/library-scribe.md`; `name: library-scribe`; "A fresh clerk" → "A fresh `library-clerk`"                                                                                                                                                                     |
| `plugins/slop-lib/agents/clerk.md`                                    | `plugins/slopify/agents/library-clerk.md`; `name: library-clerk`; "Fresh report-only contract" section unchanged                                                                                                                                                                    |
| `plugins/slop-lib/references/{clerk,scribe}-*.md` (6 files)           | `plugins/slopify/references/`, same names (no collision with the engineering references)                                                                                                                                                                                            |
| `plugins/slop-lib/skills/ask/SKILL.md`                                | `plugins/slopify/skills/ask/SKILL.md`; dispatch names `slopify:library-reader`, `slopify:library-clerk`; "suggest `research`" → "suggest running `/slopify:research`"                                                                                                               |
| `plugins/slop-lib/skills/lint/SKILL.md`                               | `plugins/slopify/skills/lint/SKILL.md`; dispatch names `slopify:library-clerk`, `slopify:library-scribe`                                                                                                                                                                            |
| `plugins/slop-lib/skills/bootstrap/SKILL.md`                          | Deleted; merged into `plugins/slopify/skills/bootstrap/SKILL.md`                                                                                                                                                                                                                    |
| `plugins/slop-lib/skills/bootstrap/references/{obsidian,scaffold}.md` | `plugins/slopify/skills/bootstrap/references/{obsidian,scaffold}.md`                                                                                                                                                                                                                |
| `plugins/slop-lib/skills/bootstrap/resources/**` (15 files)           | `plugins/slopify/skills/bootstrap/resources/**`, same tree (`library/**`, `obsidian/**`, `root-claude-md-library-section.md`); content unchanged                                                                                                                                    |
| `plugins/slop-lib/skills/research/SKILL.md`                           | Deleted; its procedure becomes `plugins/slopify/workflows/research.js`                                                                                                                                                                                                              |
| `plugins/slop-lib/skills/research/references/retrieval.md`            | Deleted; the rules `library-researcher.md` lacks (keep an unfetched source in the library's unretrieved-lead format; identify the version and time window of conflicting material, and leave the contradiction explicit when version evidence is out of reach) move into that agent |
| `plugins/slop-lib/skills/research/references/persistence.md`          | Deleted; its orchestration rules (exclusive raw-note paths, one integrator after raw notes finish, final clerk brief contents) become the workflow's sequencing and briefs; its content rules already live in `scribe-raw-notes.md` and `scribe-integration.md`                     |
| `plugins/slop-lib/evals/ask-triggers/**`                              | `plugins/slopify/evals/ask-triggers/**`; `ask-fired` matches `(?:slopify:)?ask`; `research-not-fired` observes the Workflow tool (see [evals](#evals))                                                                                                                              |
| `plugins/slop-lib/evals/bootstrap-triggers/**`                        | `plugins/slopify/evals/bootstrap-library-triggers/**` (renamed to avoid the collision), frontmatter `name: bootstrap-library-triggers`, grader matches `(?:slopify:)?bootstrap`                                                                                                     |
| `plugins/slop-lib/evals/lint-triggers/**`                             | `plugins/slopify/evals/lint-triggers/**`; `lint-fired` matches `(?:slopify:)?lint`; `research-not-fired` observes the Workflow tool                                                                                                                                                 |
| `plugins/slop-lib/evals/research-triggers/**`                         | `plugins/slopify/evals/research-triggers/**`; `research-fired` observes the Workflow tool; `ask-not-fired` matches `(?:slopify:)?ask`                                                                                                                                               |
| (new)                                                                 | `plugins/slopify/workflows/research.js`                                                                                                                                                                                                                                             |
| (new)                                                                 | `plugins/slopify/evals/research-smoke/**` (see [evals](#evals))                                                                                                                                                                                                                     |

Eval results: `plugins/*/evals/results/` is gitignored, and no results file is tracked or present in this worktree (`git ls-files plugins | grep results` and `ls plugins/*/evals/results` both find nothing). Nothing moves; any local results directory is left to the developer.

Design choice: reference files keep their names (`clerk-*.md`, `scribe-*.md`). The agent rename doesn't require renaming them, and keeping the names keeps the diff to moves.

The `retrieval.md` rules that move into `library-researcher.md` relocate existing behavior from the deleted skill. They don't change what the agent does: under the skill, the same rules governed how retrieval was briefed and handled, and researchers did that retrieval. The workflow has no prose of its own to carry them, so they now live with the agent that retrieves.

### Repository files outside `plugins/`

- `.claude-plugin/marketplace.json`: one entry `{ "name": "slopify", "source": "./plugins/slopify", "description": … }`. The top-level description says one plugin, not "two independently installable".
- `.githooks/pre-commit`: `for target in . plugins/slopify; do`.
- Root `CLAUDE.md`:
  - The intro says the repo is the source of one plugin, `slopify`.
  - Drop the `slop-lib`/`slop-eng` independence bullet.
  - Add one "Writing plugin text" bullet: "Workflows (`workflows/<name>.js`) orchestrate and dispatch the plugin's agents by `slopify:<agent>`; agents stay leaves."
  - The contract bullet names `qa`, `auditor`, and `library-clerk`.
  - Drop the two `slop-eng:`/`slop-lib:` greps.
  - The contract check loops over `plugins/slopify/agents/{auditor,qa,library-clerk}.md`.
  - The release commands become the two `claude plugin eval` commands in criterion 9, both granting `Workflow`.
  - Design choice: add one check that every `agentType: 'slopify:<name>'` in `plugins/slopify/workflows/*.js` has a matching `plugins/slopify/agents/<name>.md`. It should print nothing when consistent, like the other checks.
- `README.md`: one plugin and one table, covering engineering and library work, the `research` workflow, and the merged `bootstrap`. Install becomes `claude plugin install slopify@agentic-slop`. Dispatch names become `slopify:coder`, `:writer`, `:qa`, `:auditor`, `:library-reader`, `:library-researcher`, `:library-scribe`, `:library-clerk`. Drop the "Either installs alone" fallback sentence. Two entry points are explicitly invoked: `deliver` as `/slopify:deliver`, and the `research` workflow as `/slopify:research <question>` or by asking to run the slopify research workflow. The other skills also run when you describe matching work.
- `docs/specs/board-and-forge-declarations.md` and `docs/issues/*` stay as they are: they are historical entries, which the card allows.

### `research` workflow

`plugins/slopify/workflows/research.js` follows the plugin workflow format seen in installed plugins (`claude-security/workflows/scan.js`, `code-modernization/workflows/portfolio-assess.js`). It starts with a pure-literal `export const meta = { name: 'research', description, whenToUse, phases }` and then runs plain JS through `agent`, `parallel`, `phase`, `log`, and `args`. It has no filesystem access and doesn't use `Date.now()` or `Math.random()`. It sets the packaging SMR-358 follows.

- Invocation (decided): the workflow runs only when invoked explicitly, like `deliver` today. The user runs `/slopify:research <question>` or asks to run the slopify research workflow, and the model then calls Workflow with `{"name": "slopify:research", "args": …}`. There is no wrapper skill: the model calls the Workflow tool only on an explicit request by name, by slash command, or from a skill whose instructions call it.
- `description` says what the workflow does: investigate a question from new sources and persist evidence and cited synthesis in the project library. `whenToUse` says to run it only when the user invokes `/slopify:research` or asks for the slopify research workflow, that answers from the existing library belong to `ask`, and what the args are.
- Args: `{ question, projectRoot? }`. `args` may arrive as a plain string. Normalize a JSON string to an object; a non-JSON string is the question. With no question (a bare invocation), return `{ started: false, next: "Ask the user for the research question, then invoke again." }` and dispatch nothing. Assumption: without `projectRoot`, agents work in the session's project directory.
- Phases. Each `agent()` call is a new dispatch, so every validator is fresh. Every agent is `slopify:<name>` with a JSON `schema` for its return.
  1. Context: `library-reader` returns what the library already supports, so supported work isn't repeated.
  2. Spec: `library-scribe` writes the research spec in the project's spec location (normally `docs/specs/`) and returns its path, a revision digest, the bounded sub-questions, and the planned raw notes (one per canonical source: path, source, and the sub-questions it serves). A fresh `library-clerk` judges that exact revision for research-spec readiness. On fail or unverified, a new `library-scribe` revises it from the findings and a new `library-clerk` judges again. This preserves the skill's gate: the clerk passes the spec before retrieval.
  3. Retrieve: one `library-researcher` per sub-question, in `parallel`, through the provider the library conventions name.
  4. Persist: one `library-scribe` raw-note writer per cited source, in `parallel`, each with an exclusive path: the spec's planned path for that source, otherwise a path derived from the source. A writer receives the findings of every sub-question whose evidence cites its source, whichever sub-questions the plan lists. A written note keeps its path, and a later plan that moves it is sent back to the spec scribe. A planned source no evidence cites becomes an unretrieved lead. After all writers return, exactly one `library-scribe` integrates the synthesis, index, taxonomy, and log, including the deferred metadata, and returns the authoritative list of raw notes.
  5. Validate: a fresh `library-clerk` checks the changed paths, the draft answer, the raw evidence, the spec revision, and the affected links and metadata. On fail or unverified, a new `library-scribe` repairs from the findings and a new `library-clerk` revalidates.
- Material spec change after retrieval starts: the gate re-runs. This keeps the skill's rule "Revise and revalidate the spec when it changes materially". A change is material when it moves the question, scope, evidence standards, or planned artifacts. Researchers flag one through a `specIssue` field in their schema, and the final clerk through a `specIssue` finding. The workflow then returns to phase 2: a new `library-scribe` revises the spec, and a new fresh `library-clerk` must pass the new revision. Only after that does retrieval or persistence continue, for the affected sub-questions. Each revision counts against the spec gate's budget.
- Attempts: three failures per gate (spec, persisted research). On the third, return `{ done: false }` with the approaches, why each failed, and what is needed.
- Result: `done: true` only after the final clerk passes. The result includes the answer, artifact paths, the clerk verdict, gaps, contradictions, and retrieval limits. A supported inconclusive result counts as done. Blocked retrieval is reported as blocked.
- Design choice: the spec is always written. The skill's "trivial fix skips the spec" path existed for in-place edits, and a research run is never one.

### Merged `bootstrap`

`plugins/slopify/skills/bootstrap/SKILL.md` keeps both skills' steps and rules in one procedure:

- The description covers engineering and library setup: create, or verify and fix, `docs/BOARD.md`, `docs/FORGE.md`, the research library, and the root `CLAUDE.md` pointer, with optional Obsidian settings. Use it for project setup, not research, content maintenance, or external board or forge operations.
- Steps:
  1. Inspect the existing declarations, `library/`, and root `CLAUDE.md`.
  2. Take facts from the repository, and ask the user every board, forge, and source-provider choice until each is unambiguous.
  3. Write one setup spec covering both parts.
  4. A fresh `auditor` validates the spec, briefed that the declarations and library conventions are outputs, not missing prerequisites.
  5. Draft the declarations from `references/board.md` and `references/forge.md`. Produce the library scaffold from `references/scaffold.md` directly or through `library-scribe` with exclusive paths. Add Obsidian settings only on request, after reading `references/obsidian.md`.
  6. A fresh `auditor` validates the declarations and a fresh `library-clerk` validates the scaffold, both against the spec.
- Root `CLAUDE.md` pointer (decided): exactly today's library-bootstrap behavior (`scaffold.md`, library `SKILL.md` step 4). If a root `CLAUDE.md` exists, merge `resources/root-claude-md-library-section.md` into its matching section without duplicating it, and add a library entry to its layout when appropriate. If none exists, don't create one; report that no pointer was added.
- Coverage (decided): `bootstrap` always sets up both the board and forge declarations and the library. "No board" and "no forge" stay recordable choices inside the declarations.
- Kept rules: keep project customizations, never touch raw notes or wiki pages, configuring an operation never authorizes it, report a permission-broadening conflict, three attempts per outcome, and the report contents.
- Design choice: the setup spec goes to the `auditor` because it covers both parts. The scaffold goes to `library-clerk` because it owns the library conventions.

### Evals

Harness behavior, verified empirically by the coordinator on Claude Code 2.1.301 with a probe plugin (`workflows/echo.js`, agent `wfprobe:echoer`):

- A plugin workflow is exposed as the slash command `/<plugin>:<name>` and called as Workflow with input `{"name": "<plugin>:<name>", "args": …}`, where `args` may be a plain string.
- `claude plugin eval` withholds Workflow unless the case lists it in its `allowed_tools` and the run passes `--allow-tools Workflow`. With both, a `tool_used` grader on `tool: Workflow` matches the call.
- The run waits for the workflow to finish, and an `llm` grader on `last_message` sees the workflow's result.

Grader types, from the 2.1.301 eval schema: `regex`, `tool_order`, `tool_used`, `file_exists`, `llm`, and `baseline`.

- `file_exists` takes a `path` glob and matches only files created during the run.
- `regex` can target a file's contents with `target: { source: file, path: <exact path> }`. It takes `flags` and `match` (`contains`, `not_contains`, or `count:N`).

Cases:

- `research-triggers`: the prompt names the workflow: "Run the slopify research workflow on: current approaches to rate limiting, and save the evidence to our research library."
  - `allowed_tools: [Skill, Workflow]`.
  - `research-fired`: `type: tool_used`, `tool: Workflow`, `input_match: '"name"\s*:\s*"slopify:research"'`.
  - `ask-not-fired` is kept, matching `(?:slopify:)?ask` with `min: 0`, `max: 0`.
- `ask-triggers` and `lint-triggers`:
  - Prompts unchanged.
  - `allowed_tools: [Skill, Workflow]`, so a wrong research call is possible and would be caught.
  - `research-not-fired`: `type: tool_used`, `tool: Workflow`, `input_match: '"name"\s*:\s*"slopify:research"'`, `min: 0`, `max: 0`.
- `research-smoke` (tag `smoke`), so criterion 6 is checked on files and not on the agent's claim:
  - `scaffold.sh` sets up a git repo with:
    - `docs/BOARD.md` and `docs/FORGE.md`, as in `deliver-smoke`.
    - A library built from the bundled templates, with tokens resolved and `library/_meta/librarian.md` naming the source provider as "local files under `sources/`; no internet". Its `_meta/log.md` has only the `- Initialized …` entry, and its index has no page lines.
    - One source, `sources/token-bucket.md`, with a distinctive fact.
  - Prompt: `/slopify:research How does the token-bucket algorithm in sources/token-bucket.md limit request rates?`
  - `allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Agent, Workflow]`, `max_turns: 80`, `timeout_seconds: 1800`, `runs: 1`.
  - Graders:
    - `workflow-fired`: `tool_used`, `tool: Workflow`, `input_match: '"name"\s*:\s*"slopify:research"'`.
    - `spec-written`: `file_exists`, `path: docs/specs/*.md`.
    - `raw-note-created`: `file_exists`, `path: library/raw/*.md`. Only created files count, so the scaffold's `raw/README.md` doesn't satisfy it.
    - `synthesis-created`: `file_exists`, `path: library/wiki/*.md`.
    - `index-lists-raw`: `regex`, `target: { source: file, path: library/_meta/index.md }`, `pattern: '^- \[\[(library/)?raw/'`, `flags: m`.
    - `index-lists-wiki`: the same grader with `pattern: '^- \[\[(library/)?wiki/'`.
    - `log-entry`: `regex`, `target: { source: file, path: library/_meta/log.md }`, `pattern: '^- (?!Initialized)\S'`, `flags: m`.
    - `clerk-passed`: `llm` on `last_message`. The criteria are that the final message reports the research finished and an independent validator (the `library-clerk`, or a reviewer described as fresh, separate, or final) passed it, and mentions at least one raw note under `library/raw/` and the synthesis page under `library/wiki/` (not every file; a relative path is fine).
  - Citation inspection: the raw note's and synthesis's paths are chosen at run time, so no exact-path `regex` grader can reach them. That check runs as a script over the scaffold dir that `--keep-temp` preserves (`$d`); see criterion 6.

## Constraints and dependencies

- Root `CLAUDE.md` rules apply. Text stays minimal and describes the current state. Skills orchestrate. Agents are leaves that dispatch only `Explore`. Conditional detail lives in references, addressed with `${CLAUDE_PLUGIN_ROOT}/…` or `${CLAUDE_SKILL_DIR}/…`. Nothing hardcodes a tracker, forge, branch, commit convention, or review trigger.
- The `research` workflow references no plugin files, because it has no filesystem access. Agents read their own references.
- `qa`, `auditor`, and `library-clerk` keep their "Fresh report-only contract" sections identical.
- Library agents keep `model: sonnet`, `effort: medium`, and their `disallowedTools`.
- Formatting: `.prettierignore`'s `plugins/*/skills/*/resources/` still covers the moved resources.
- SMR-358 depends on this story. Its workflows follow `research.js`'s packaging.
- The version is `0.1.0` as the card requires. No other bump.

## Acceptance criteria

Each criterion is quoted from the card, followed by how it will be verified. Commands run from the worktree root.

1. "The marketplace lists exactly one plugin, `slopify`, and `plugins/slop-eng` and `plugins/slop-lib` no longer exist."
   `jq -r '.plugins[].name' .claude-plugin/marketplace.json` prints exactly `slopify`, and `test ! -e plugins/slop-eng && test ! -e plugins/slop-lib && echo ok` prints `ok`.
2. "`slopify`'s `plugin.json` declares version `0.1.0`."
   `jq -r '.name, .version' plugins/slopify/.claude-plugin/plugin.json` prints `slopify` and `0.1.0`, and `claude plugin validate --strict plugins/slopify` passes.
3. "No file in the repository references `slop-eng` or `slop-lib`, except historical entries in `docs/`."
   `git grep -n -e slop-eng -e slop-lib -- ':!docs/'` prints nothing. `git grep -l -e slop-eng -e slop-lib -- docs/` lists only `docs/specs/` and `docs/issues/` entries.
4. "`slopify` ships the agents `library-reader`, `library-researcher`, `library-scribe`, and `library-clerk`, and no unprefixed library agent."
   `grep -h '^name:' plugins/slopify/agents/*.md | sort` prints `auditor`, `coder`, `library-clerk`, `library-reader`, `library-researcher`, `library-scribe`, `qa`, and `writer`, and nothing else. For each renamed pair, `diff <(git show master:plugins/slop-lib/agents/<old>.md | grep -E '^(model|effort):') <(grep -E '^(model|effort):' plugins/slopify/agents/library-<new>.md)` prints nothing.
5. "`slopify` ships a `research` workflow and no `research` skill."
   `test -f plugins/slopify/workflows/research.js && test ! -e plugins/slopify/skills/research && echo ok` prints `ok`, and `research.js`'s `meta.name` is `research`. The `research-triggers` eval passes, which shows the explicit request calls Workflow `slopify:research`. The `ask-triggers` and `lint-triggers` `research-not-fired` graders pass.
6. "The `research` workflow persists cited evidence and synthesis to the project library, and a fresh `library-clerk` passes it before it reports done."
   - Static check: reading `research.js` shows that the final `library-clerk` dispatch comes after integration, that each verdict comes from a new `agent()` call, and that `done: true` is returned only on a `pass` verdict.
   - File checks: every deterministic `research-smoke` grader passes (`workflow-fired`, `spec-written`, `raw-note-created`, `synthesis-created`, `index-lists-raw`, `index-lists-wiki`, `log-entry`), and so does `clerk-passed`.
   - Citation inspection: on the scaffold dir `$d` preserved by the `--keep-temp` smoke run in criterion 9, each of these prints at least one line:
     ```bash
     grep -l 'sources/token-bucket.md' "$d"/library/raw/????-??-??-*.md              # raw note records the source
     grep -lE '\[\[(library/)?raw/[^]|#]+#\^e[0-9]+' "$d"/library/wiki/*.md          # synthesis cites a raw-note evidence anchor
     grep -E '^- \[\[(library/)?(raw|wiki)/' "$d"/library/_meta/index.md            # index entries
     grep -E '^- [^I]' "$d"/library/_meta/log.md                                     # log entry beyond initialization
     ```
7. "`slopify` ships one `bootstrap` skill; on an empty project it creates `docs/BOARD.md`, `docs/FORGE.md`, and `library/`, and on a configured project it verifies and fixes them while keeping project customizations."
   `ls -d plugins/slopify/skills/*bootstrap*` prints one path. Manual run of `/slopify:bootstrap` in an empty scratch git repo: all three paths exist afterwards, and no root `CLAUDE.md` is created. Manual run in a scratch copy of a configured project, with a custom board entry and a custom taxonomy tag plus a deliberate defect such as an unresolved `{{TODAY}}` token: the defect is fixed, and `diff` shows both customizations kept. The `bootstrap-triggers` and `bootstrap-library-triggers` evals pass.
8. "`slopify` ships the skills `ask`, `lint`, and `bootstrap`."
   `ls plugins/slopify/skills` includes `ask`, `bootstrap`, and `lint` (alongside `deliver` and `shape`).
9. "The `CLAUDE.md` consistency checks pass for the single plugin, and the trigger and smoke evals pass for `slopify`."
   The updated `CLAUDE.md` check block prints nothing except the contract check's `1`. These commands pass every case:
   ```bash
   claude plugin eval plugins/slopify --tag trigger --runs 1 --allow-tools Workflow --ablation none --trust-plugin
   claude plugin eval plugins/slopify --tag smoke --allow-tools Bash Write Edit Agent Workflow --scaffold --keep-temp --ablation none --trust-plugin
   ```

## Tasks

Task 1 comes first. Tasks 2 to 6 then write disjoint files and can run in parallel.

1. Move and rename. `git mv` every path in the mapping table, and delete the files marked deleted. Write `plugin.json`, `marketplace.json`, and `.githooks/pre-commit`.
2. Agents and references to them. Rename the four library agents' `name` fields and headings. Fold the `retrieval.md` rules into `library-researcher.md`. Update dispatch names in `shape`, `ask`, `lint`, and `deliver`, and the `library-scribe` "fresh clerk" line.
3. `research` workflow. Write `workflows/research.js` per [above](#research-workflow).
4. `bootstrap` merge. Write the merged `skills/bootstrap/SKILL.md`.
5. Evals. Apply the grader and prompt renames, the Workflow-tool graders, `bootstrap-library-triggers`, and `research-smoke`.
6. Docs. Update `README.md` and root `CLAUDE.md`, including the new workflow `agentType` check.

## Open decisions

None. Settled during review:

- `research` is invoked explicitly, with no wrapper skill.
- The root `CLAUDE.md` pointer keeps today's behavior: merged into an existing file, never created.
- `bootstrap` always sets up both parts.
- Workflow eval support was verified empirically.
