# Forge declaration

Configuration does not authorize execution; the user's request does. An operation not bound here has no grant.

## Repository

- Remote and permitted push destinations: `origin` (`git@github.com:ca77y/agentic-claude.git`, over SSH); only story branches are pushed, and only to `origin`.
- Forge and how it is reached, without credentials: GitHub `ca77y/agentic-claude`, through the `gh` CLI authenticated as `ca77y`.
- Target branch and its protection: `master`, unprotected; every PR targets it.

## Workspace

- Branch name: the issue's `gitBranchName` from Linear (for example `tokwieci/smr-200-card-content-access`); without an issue, `<commit type>/<slug>`, where `<slug>` is lowercase kebab-case.
- Story worktree path and its ignore rule: `.worktrees/<gitBranchName without its tokwieci/ prefix>` (for example `.worktrees/smr-200-card-content-access`), or `.worktrees/<slug>` without an issue, ignored by `.worktrees/`. Create it with `git fetch origin master` then `git worktree add <path> -b <branch> origin/master`, so unpushed local `master` commits stay out of the PR; recover it for an existing branch with `git worktree add <path> <branch>`. A repair reuses the PR's worktree.
- Worktree preparation: run `make install` in the checkout, so the pre-commit hook and `make check` have their dev tools; it is safe to run again.
- Spike prototypes: the local branch `spike/<slug>` and the worktree `.worktrees/spike-<slug>`, from the spike's slug; the prototype is throwaway, never pushed or merged, and deleting a never-pushed prototype is allowed.
- Cleanup after merge: whoever merges a PR cleans up right after, in the same session: `git worktree remove <path>` for the PR's worktree, `git branch -D <branch>` (a squash merge leaves the branch unmerged in git's eyes), and `git push origin --delete <branch>`. The request to merge authorizes this cleanup.

## Commits and push

- Commit convention: Conventional Commits — `docs`, `feat`, `fix`, `refactor`, `test`, or `chore`, with an optional `(<area>)`; a commit that adds only tests is `test`; every commit on a story branch names the issue. Stage explicit paths, never with `-f`.
- When to push: `git -C <path> push -u origin <branch>` at the end of the first delivery round; `git -C <path> push` at the end of each later round, even when something is still flagged, so every attempt stays in history.
- Merging the target into a story branch, before each push: `git -C <path> fetch origin master`, then `git -C <path> merge --no-edit origin/master`; it brought in a commit when `HEAD` moved. Conclude a resolved conflict with `git -C <path> add -- <paths>` and `git -C <path> commit --no-edit`, and abort one with `git -C <path> merge --abort`.

## Pull request

- Create, update, read, comment: create ready for review with `gh pr create --repo ca77y/agentic-claude --base master --head <branch> --title <title> --body-file <body-file>`, adding `--draft` only for a draft; mark it ready with `gh pr ready <number> --repo ca77y/agentic-claude`, and convert it to a draft with `gh pr ready <number> --undo --repo ca77y/agentic-claude`; the create command's output is the PR URL; update with `gh pr edit <number> --repo ca77y/agentic-claude --body-file <body-file>`, plus `--title` when it changes; read with `gh pr view <number> --repo ca77y/agentic-claude --json title,body,url,createdAt,baseRefName,headRefName,comments,reviews`, `gh pr diff <number> --repo ca77y/agentic-claude`, and `gh api --paginate repos/ca77y/agentic-claude/pulls/<number>/comments` for line-level comments; comment with `gh pr comment <number> --repo ca77y/agentic-claude --body <text>`, apart from the review trigger only for a message the user asks for.
- Title and body: the title is an imperative sentence naming the outcome. The body is written for the person who reviews the PR, whole each round, in four parts in this order, **What changes**, **Needs you**, **Why trust it**, and **Not done**, where **Why trust it** is always present and **Needs you** and **Not done** only when they have something to say; a story's names its spec folder on a `Spec: <folder>` line. No labels, reviewers, assignees, or milestones.
- Review trigger and where findings land: opening the PR fires the Claude Code Review workflow (`.github/workflows/claude-code-review.yml`). After each later round's push, re-fire it with a PR comment whose whole body is `@review`, through the comment binding; a delivery request authorizes that comment. Each run posts its own PR comment from `claude[bot]`, edited in place until it reports the result; findings are in that comment and in line-level review comments. Skipped workflow runs come from other comments and mean nothing.
- Review status, started and finished, as commands that can be polled, with time limits: started when `gh api --paginate repos/ca77y/agentic-claude/issues/<number>/comments --jq '.[] | select(.user.login == "claude[bot]" and .created_at > "<trigger time>") | .id' | head -n 1` prints an id, where the trigger time is the PR's creation or the re-fire comment's; finished when `gh run view <run-id> --repo ca77y/agentic-claude --json status --jq .status` prints `completed`, with the run id from that comment's `actions/runs/<run-id>` link. Read the result with `gh api repos/ca77y/agentic-claude/issues/comments/<id> --jq .body`: a body that says the review was skipped means it was skipped and reviewed nothing; otherwise the review completed only when the body starts with `**Claude finished` and its progress checklist has no unchecked item (a line starting `- [ ]`), and failed if not, since a run can end before it checks or posts its findings. Poll every 30 seconds. A review not started within 15 minutes of its trigger, or not finished within 60 minutes of starting, has failed.
- Required checks: none.

## Restrictions

Autonomous work never does these; an explicit user request for one authorizes it.

- Commit to, check out in a story worktree, or push `master`.
- Merge, enable auto-merge, or close a PR; open a second PR for a story.
- Force-push, amend or rebase pushed history, or delete a branch, tag, or remote ref, apart from the cleanup after a merge.
- Cut a release or tag, touch another repository, or add a remote.
- Remove a worktree, apart from the cleanup after a merge.
