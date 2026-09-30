# Forge declaration

Configuration does not authorize execution; the user's request does. An operation not bound here has no grant.

## Repository

- Remote and permitted push destinations: `origin` (`git@github.com:ca77y/agentic-claude.git`, over SSH); only story branches are pushed, and only to `origin`.
- Forge and how it is reached, without credentials: GitHub `ca77y/agentic-claude`, through the `gh` CLI authenticated as `ca77y`.
- Target branch and its protection: `master`, unprotected; every PR targets it.
- Default working checkout: work happens on `master` in the repository root and is committed only when the user asks. Only a delivery request creates a story branch in its own worktree and ends in a PR.

## Workspace

- Branch name: the issue's `gitBranchName` from Linear (for example `tokwieci/smr-200-card-content-access`); without an issue, `<commit type>/<slug>`, where `<slug>` is lowercase kebab-case.
- Story worktree path and its ignore rule: `.worktrees/<gitBranchName without its tokwieci/ prefix>` (for example `.worktrees/smr-200-card-content-access`), or `.worktrees/<slug>` without an issue, ignored by `.worktrees/`. Create it with `git fetch origin master` then `git worktree add <path> -b <branch> origin/master`, so unpushed local `master` commits stay out of the PR; recover it for an existing branch with `git worktree add <path> <branch>`. A repair reuses the PR's worktree.
- Temp folder: `.tmp/` at the root of each checkout, ignored.
- Cleanup after merge: the user's; on request, `git worktree remove <path>` and `git branch -d <branch>`.

## Commits and push

- Commit convention: Conventional Commits — `docs`, `feat`, `fix`, `refactor`, or `chore`, with an optional `(<area>)`; the spec commit names the issue. Stage explicit paths, never with `-f`.
- When to push: `git -C <path> push -u origin <branch>` once the gates pass, immediately before opening the PR; `git -C <path> push` after each verified repair. Unverified work stays local.

## Pull request

- Create, update, read, comment: create with `gh pr create --repo ca77y/agentic-claude --base master --head <branch> --title <title> --body-file <body-file>`, whose output is the PR URL; update with `gh pr edit <number> --repo ca77y/agentic-claude --body-file <body-file>`, plus `--title` when it changes; read with `gh pr view <number> --repo ca77y/agentic-claude --json title,body,url,baseRefName,headRefName,comments,reviews`, `gh pr diff <number> --repo ca77y/agentic-claude`, and `gh api --paginate repos/ca77y/agentic-claude/pulls/<number>/comments` for line-level comments; comment with `gh pr comment <number> --repo ca77y/agentic-claude --body <text>`, apart from the review trigger only for a message the user asks for.
- Title and body: the title is an imperative sentence naming the outcome. The body has `## Summary`, `## Spec` (the spec path, or none for trivial work), `## Verification`, and `## Review`, created by the first update after the first trigger and growing by one line per trigger comment (its URL from the PR's comments, or the failure), placed before any `## Repair <n>` sections; a repair appends `## Repair <n>` summarizing the findings it addressed without quoting them. No labels, reviewers, assignees, milestones, or drafts.
- Review trigger and where findings land: after opening the PR and after each verified repair push, comment `@codex review` with the comment binding; a delivery request authorizes that comment. Findings arrive from Codex as PR comments, review summaries, and line-level review comments. No reply, or a Codex setup reply, means no review ran. PR bodies never contain `@codex`. Opening fires Codex only if its automatic review is on, which is not visible here, so the trigger comment is always posted.
- Required checks: none.

## Restrictions

Autonomous work never does these; an explicit user request for one authorizes it.

- Commit to, check out in a story worktree, or push `master`.
- Merge, enable auto-merge, or close a PR; open a second PR for a story.
- Force-push, amend or rebase pushed history, or delete a branch, tag, or remote ref.
- Cut a release or tag, touch another repository, or add a remote.
- Remove a worktree.
