---
type: story
title: Give the pipeline a prose-deliverable mode for tasks with no test runner
---

# Give the pipeline a prose-deliverable mode for tasks with no test runner

- [ ] Give the pipeline a prose-deliverable mode for tasks with no test runner #improvement 🔺 🆔 give-pipeline-a-prose-deliverable-mode
  - The `writer`, `coder`, and `qa` loops all assume a repo with a build and a test suite. In this toolkit the deliverable is almost always a Markdown agent definition and there is no test runner, no build, and no validation command — so the assumption is wrong for nearly every task, and each dispatch has to renegotiate it in prose.
  - Background — the writer side: two spec-authoring rules are written for code — "the `coder` writes one scenario test per Requirements scenario" and Validation must "include building through that consumer (`docker build .` / `docker compose build`)". On a prose task there is no test to write and no consumer to build, so the rules get reinterpreted on the fly as "one inspectable assertion per scenario" and "check the manifests and the changed-file set". The task prompt happened to say so; without it a writer could conclude the spec was unfinishable or invent a test runner for a repo that has none.
  - Background — the coder/qa side: `coder.md`'s loop mandates one scenario test per scenario and an unconditional hand-off to the `qa` subagent, and `qa` runs the project's validation. On an agent-definition task there is nothing to run. The `lead` had to override the definition in its prompt ("there is no separate qa step — your tools do not apply here") and the `coder` had to repeat in capitals to `qa` ("there is NO test suite, NO test runner, NO build — do not hunt for one") to stop it searching for a command that does not exist or adding a test file the Boundary forbids. That override lives in an ephemeral dispatch prompt, invisible to the next `lead`, so every artifact-only task pays the same cost.
  - Scope: `plugins/ca77y-engineering/agents/writer.md` (spec-authoring rules), `coder.md` (build loop, step 3 and Rules), and `qa.md` (validation step).
  - Acceptance criteria:
  - `writer.md`'s spec-authoring rules name the prose-deliverable case: when the deliverable is a document rather than code, each Requirements scenario must be falsifiable by reading the changed file, and Validation covers the artifact's real consumers (manifests, loaders, frontmatter, the changed-file set) instead of a build.
  - `coder.md`'s build loop carries a named branch: when the spec's Boundary says the deliverable is a non-code artifact and the repo has no test runner, "one scenario test per scenario" becomes one inspectable assertion per Requirements scenario — quote the line that satisfies it, or name what is missing.
  - The validation step in `coder.md`/`qa.md` reads "run the project's validation — via `ca77y-engineering:qa` where the project has one, or the spec's stated validation procedure where it does not", so the fallback lives in the definitions rather than in each dispatch prompt.
  - Failing to find a test runner or validation command is stated as the expected result for a prose deliverable, not a blocker to report.
  - The branch does not weaken the code path: a task with a real test suite still gets scenario tests and a `qa` run.
  - See [`../CLAUDE.md`](../CLAUDE.md): the agent definitions under `plugins/*/agents/` are the product, so the prose deliverable is the common case, not the exception.
