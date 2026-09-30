# Board and forge declarations

## Scope

Rewrite `docs/BOARD.md` and `docs/FORGE.md` for the current `slop-eng` plugin, following the bootstrap templates in `plugins/slop-eng/skills/bootstrap/resources/` and the rules in `plugins/slop-eng/skills/bootstrap/references/`. The declarations are the outputs of this work.

## Facts and sources

- Board: Linear, project `Agentic Claude`, team `Smerfy` (`SMR`), reached through the connected Linear MCP server (`mcp__plugin_linear_linear__*`).
- `get_project`: project URL <https://linear.app/ca77y/project/agentic-claude-e233525564c3>. Linear rewrites `-` bullets to `*` and wraps bare URLs in `<…>` on save (observed on earlier cards).
- Statuses (`list_issue_statuses`): Backlog, Todo, In Progress, In Review, Done, Canceled, Duplicate.
- Tool schemas: `get_issue` reads by identifier or UUID, including archived cards (a URL returns 400; take the identifier from it), accepts `includeRelations`, and returns the git branch name (`gitBranchName`); `list_issues` searches by `project`, `query`, `state`, `label`, `priority`, with `includeArchived`, `limit` (default 50, at most 250), and `cursor`, and returns `hasNextPage` and a `cursor` for the next page; `get_issue` returns `archivedAt` for an archived card; `save_issue` creates (with `team`, `project`, `state`) and updates (with `id`), and accepts `state`, `description`, `labels` (replaces the set) or `addLabels`/`removeLabels`, `priority`, append-only `links` (each needs `url` and `title`), and append-only `blockedBy`/`blocks` (removed with `removeBlockedBy`/`removeBlocks`); `save_comment` takes `issueId` and `body`.
- Forge (`git remote -v`, `gh auth status`): GitHub `ca77y/agentic-claude`, one remote `origin` (`git@github.com:ca77y/agentic-claude.git`) over SSH, `gh` authenticated as `ca77y`.
- Protection (`gh api …/branches/master/protection` 404, `…/rulesets` empty): `master` is unprotected. `.github/workflows/` holds `claude.yml` and `claude-code-review.yml`; no required checks.
- `gh pr --help` and the GitHub REST API: `gh pr create` prints the PR URL; `gh pr edit`, `gh pr view --json …,comments,reviews` (the flags `--json` and `--comments` cannot combine), `gh pr diff`, and `gh pr comment` exist; line-level review comments are read with `gh api --paginate repos/<owner>/<repo>/pulls/<number>/comments` (30 per page without `--paginate`). `git worktree add <path> <branch>` recovers a worktree for an existing branch; `git worktree remove` and `git branch -d` clean up.
- `.gitignore`: covers `.worktrees/` and `/.tmp/`.
- `get_issue` on SMR issues: `gitBranchName` has the form `tokwieci/smr-<n>-<slug>`.
- `.github/workflows/claude-code-review.yml`: runs the `code-review` plugin with `--comment` on `pull_request` opened, and on an `issue_comment` or `pull_request_review_comment` containing `@review`; it uses the `CLAUDE_CODE_OAUTH_TOKEN` secret, which exists (`gh secret list`). Its last PR-open run succeeded (`gh run list`).
- `git worktree add <path> -b <branch> origin/master` after `git fetch origin master` creates a story branch; `git push -u origin <branch>` sets its upstream.
- `list_issues`: every card in the project is archived; archived cards appear only with `includeArchived: true`, and a `query` on this project returns none of them.

## Choices (user)

- Work happens on `master` in the repository root; only a delivery request creates a story branch in a worktree and ends in a PR.
- A story branches from `origin/master` after a fetch, so unpushed local `master` commits stay out of PRs.
- Branch: the card's `gitBranchName`; without a card, `<commit type>/<lowercase-kebab-slug>`. Worktree: `.worktrees/<gitBranchName without its tokwieci/ prefix>`, or `.worktrees/<slug>` without a card. A repair reuses the PR's worktree.
- Commits follow Conventional Commits (`docs`, `feat`, `fix`, `refactor`, `chore`, with an optional area); the spec commit names the issue.
- Push once the gates pass, immediately before opening the PR, and after each verified repair; unverified work stays local.
- One PR per story against `master`. Title: an imperative sentence naming the outcome. Body: `## Summary`, `## Spec` (the spec path, or none for trivial work), `## Verification`, `## Review`, one line per re-fire comment (its URL, or the failure), added with the update binding after it fires and placed before any `## Repair <n>` sections; a repair appends `## Repair <n>` summarizing the findings it addressed without quoting them. No labels, reviewers, assignees, milestones, or drafts.
- The Claude Code Review workflow reviews PRs: opening fires it, and a PR comment containing `@review` re-fires it after each verified repair push; each run posts its own `claude[bot]` PR comment (author `claude` in `gh pr view`), edited in place; the review for a trigger is the first such comment created after it, it ran only when that comment reports Claude finished, and its findings are there and in line-level review comments; skipped runs come from comments without `@review` and mean nothing.
- Cards are created in Backlog, only when the user asks. Card content is edited only when the user asks, never changing the goal. Card comments and PR comments other than the review trigger are posted only when the user asks for that message.
- Delivery on a card never refuses. At start: from Backlog or Todo, move it to In Progress (asking for delivery is the user's readiness decision); in any other status, leave it and, for Done, Canceled, or Duplicate, report it. When the PR opens: attach the PR; move the card to In Review only if it is In Progress. A repair run does no card operation. An archived card (`archivedAt` set) gets no card write; report it.
- A wrong acceptance criterion is corrected in the spec, not on the card.
- Readiness outside delivery, Done, Canceled, Duplicate, and goal changes stay with the user.
- Cleanup after merge (removing the worktree and branch) happens only on the user's request.
- Restrictions bind autonomous work only; an explicit user request lifts them.

## Preserve

From the declarations at `ccb0d79`: staging explicit paths, never with `-f`; only story branches are pushed, and only to `origin`; the Linear formatting note. Card shape (identity, spec naming `docs/specs/<lowercase identifier>-<slug>.md`, the type labels Bug, Improvement, Feature, priorities 1–4, blocking relations and no sub-issues, body sections `## Why`, `## Scope`, `## Out of scope`, `## Acceptance criteria`, `## References`, one criterion per line), and the restrictions: never commit to, check out in a story worktree, or push `master`; never merge, enable auto-merge, or close a PR, or open a second PR for a story; never force-push, amend or rebase pushed history, or delete a branch, tag, or remote ref; never cut a release or tag, touch another repository, or add a remote; never remove a worktree.

## Acceptance

1. Each declaration follows its template's sections, slot labels, and fixed lines, one line per slot, except the Restrictions block, which has one restriction per line.
2. Every binding and value traces to a fact, choice, or preserve item above, and every read binding runs read-only against a real card or PR while every write binding matches its tool schema or `--help`; no credential appears.
3. Neither declaration names a plugin agent, skill, slash command, or model; naming the repository's review workflow is allowed.
4. Every choice above is stated, each rule once, with no contradiction between the two files.
5. The board's Delivery section states the card operation for every status at delivery start, at PR open, and on repair.
6. Every Preserve item is present, and merging is marked unavailable to autonomous work.
7. The forge's restrictions state that they bind autonomous work and an explicit user request lifts them.
8. The bound duplicate search, run read-only, returns an archived card of the project and follows `cursor` until `hasNextPage` is false.
