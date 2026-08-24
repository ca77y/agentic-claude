# The forge

How this project gets a story from a branch to a reviewed change, read directly at this
fixed path — `docs/FORGE.md` — by the `lead`, before it creates a workspace. Keep it
true, because the pipeline binds real commands to what it says, and because a run
**stops** rather than guess when this file is missing.

## The repository

**GitHub** — `ca77y/agentic-claude`.
<https://github.com/ca77y/agentic-claude>

One remote, `origin` — `git@github.com:ca77y/agentic-claude.git`, over SSH. There is no
fork and no upstream: the checkout the pipeline runs in is the canonical one, and
`origin` is the only place anything is ever pushed.

## Reaching it

The **`gh` CLI**, already authenticated on this machine — the `ca77y` account, its token
in the system keyring, git operations over SSH. Nothing to authenticate; no credentials
live in this repo, and none belong in this file.

The GitHub MCP server is also connected in this workspace and is **not** what the
pipeline uses. One mechanism per operation, and here it is `gh`: every binding below is
a shell command, never a tool call.

## Branches and worktrees

- **Target branch** — `master`. Every story branches off it, every change opens against
  it, and nothing in the pipeline commits to it, checks it out in a worktree, or pushes
  it. A long-running branch may take `master` *into* itself with an ordinary merge; that
  is the only direction traffic ever runs.
- **Story worktrees** — `.worktrees/<card-id>-<slug>`, at the repository root, one per
  story, covered by the committed `.gitignore` entry `.worktrees/` (alongside `/tmp/`, for
  the run-local scratch at the root of each worktree). **The issue's identifier leads the
  directory name**, so `ls .worktrees/`, a `git worktree list`, and a stray process's
  working directory each name their story without a lookup:
  `.worktrees/smr-148-make-the-coder-demonstrate-each-pinning-test-red-not-just`.
  That means dropping the branch name's leading `tokwieci/` rather than letting it nest —
  a nested path buries the identifier one level down, which is the opposite of the point.
  A run that names no issue has no identifier to lead with and takes the descriptive slug
  alone; it is the only kind of directory here that does not start with one.
- **Branch name** — the executing issue's own `gitBranchName` field, read from Linear
  through [`BOARD.md`](./BOARD.md)'s *read* binding. Linear supplies it already formed
  (`tokwieci/smr-148-make-the-coder-demonstrate-each-pinning-test-red-not-just`), and it
  is where the one name shared by the issue, the branch, the spec file, and the PR comes
  from. Where a run names no issue, branch as `<type>/<slug>` on the same lowercase-kebab
  slug the spec file takes.
- **Removal** — once the PR merges, the worktree and its branch go: `git worktree remove
  <path>`, then delete the branch. GitHub does not delete it (`deleteBranchOnMerge` is
  off). That is the human's step, after the merge — the pipeline never removes a worktree
  and never deletes a branch.

## Commits

**Conventional Commits, type prefix only — no scope.** `docs:` for a spec or a
documentation pass, `feat:` for a build, `fix:` for a fix round. From this repo's own
story branches:

```text
docs: add spec for SMR-148 pinning-demonstration obligation
feat: make the coder demonstrate each pinning test red
fix: address qa round 1 findings on the pinning-demonstration rule
docs: fold the pinning-demonstration rule into README/ARCHITECTURE
```

A pre-ship round commit names, in that same subject, **which round's findings it
applies** — `qa round 1`, `PR review` — and its body names any tests the previous round
added. That is what lets the next fresh dispatch read a diff as a reason rather than as
a difference.

**Push once, when the PR opens.** The story branch has no remote before that, so every
commit up to it — the spec, the spec-format-fix commit where the floor produced one, each
pre-ship round — stays local in the worktree. After the PR is open, each fix round is
pushed as it is committed. Never force-push, never amend or rebase a pushed commit, and
never push `master`.

## Operations

- **branch** — created with the worktree, in one step:
  `git worktree add .worktrees/<card-id>-<slug> -b <branch> master`. The directory and
  the branch differ deliberately: `<branch>` is Linear's `gitBranchName` verbatim, while
  the directory drops its leading `tokwieci/` so the identifier leads.
- **remove a worktree** — `git worktree remove <path>` — *the human's, after the merge.*
- **commit** — `git -C <worktree> add <paths>` (never `-f`, so ignored scratch cannot be
  swept in) then `git -C <worktree> commit`.
- **push** — `git -C <worktree> push -u origin <branch>` the first time, at PR-open time;
  `git -C <worktree> push` on each fix round after.
- **open the change** —
  `gh pr create --base master --head <branch> --title <title> --body-file <path>`. Its
  output is the PR's URL; **that** is the link, never one assembled from a pattern.
- **update the change** — `gh pr edit <number> --body-file <path>`, and `--title` for the
  title.
- **comment on the change** — `gh pr comment <number> --body <text>`.
- **read the change** — `gh pr view <number> --json title,body,url,baseRefName,headRefName`
  and `gh pr diff <number>`. This is the recovery path on a fix run whose worktree is gone.
- **re-fire the review** — `gh pr comment <number> --body "@review rerun the PR review"`.
  The literal `@review` is the trigger; see *The review*.
- **merge** — *not available.* Merging, and the merge method, are the human's.

## The change artifact

A **GitHub pull request**. *PR* is the word this repo uses for it, in its documentation
and in the pipeline's prose. One per story, opened against `master`, and never a second
one for the same story: a fix run reuses the open PR and its branch.

- **Title** — an imperative sentence naming the outcome, not a Conventional Commits
  subject: *Make the coder demonstrate each pinning test red, not just name it*. The
  repository squash-merges, so this title becomes `master`'s commit subject with the PR
  number appended.
- **Description** — Markdown under `##` headings, in this order, dropping any that does
  not apply rather than leaving it empty: `## Task` (the issue identifier and its URL,
  then what the task was and why) · `## Spec` (its path, its gate outcome, and that it
  was converted and removed) · `## What was built` · `## Tests` · `## Gates and rounds` ·
  `## Acceptance gate` · `## Docs` · `## Production hazards / blockers` ·
  `## Board follow-ups` · `## Commits (<n>)` · `## Card status` · `## Review` ·
  `## Remaining risks / follow-ups`. A later fix round **appends** a
  `## Review round <n> — addressed` section rather than rewriting what is already there.
- **Link** — whatever `gh pr create` printed. Attaching it to the issue is the board's
  business, authorised by [`BOARD.md`](./BOARD.md) under *attach the PR*; this file is
  only where the link comes from.
- **Labels, reviewers, assignees, milestones, draft state** — unused here. Do not set
  them.

## The review

**A repository workflow** — `.github/workflows/claude-code-review.yml`, running
`anthropics/claude-code-action` with the `code-review` plugin.

- **Fired** automatically when a PR is **opened** — `pull_request: [opened]` only, not on
  push and not on synchronize. Pushing a fix round does not re-fire it.
- **Re-fired** by a comment containing the literal `@review`, on the PR or on a review
  thread. `@claude` is a different handle, bound to the general assistant, and does
  **not** fire this review.
- **Findings** land as inline comments on the PR. They re-enter the pipeline only when a
  human invokes `ca77y-engineering:lead` again with them, or with the PR.
- **Nothing waits for it.** The pipeline does not poll, diff baselines, or watch for a
  first comment: a run ends with the PR open and reported as not yet reviewed.

There is no other CI — no test job, no lint job, no required status check. A PR is
mergeable as soon as a human is satisfied with it.

## What the pipeline may write

The `lead` alone writes anything here. Permitted, and expected:

- **branch and worktree** — one of each per story, under `.worktrees/`, off `master`.
- **commit** — in the story worktree only, per the commit model.
- **push** — the story branch to `origin`: once when the PR opens, then once per fix
  round.
- **open one PR** — against `master`, carrying the description above.
- **update that PR's description**, and **comment on it** — including the `@review`
  re-fire.

Everything else is the human's, and is reported rather than done:

- **Never merge**, and never enable auto-merge.
- **Never force-push, amend a pushed commit, rebase a pushed branch, or delete a branch,
  a tag, or a remote ref.**
- **Never push `master`**, commit to it, or check it out in a worktree.
- **Never open a second PR for a story, and never close one.**
- **Never cut a release or a tag** — and note that a version bump is separately a human
  decision, per the root [`CLAUDE.md`](../CLAUDE.md).
- **Never touch another repository**, and never add a second remote.

No other agent reaches git except to read: the `writer`'s docs pass runs `git diff` and
`git log` inside the story worktree against commit references it was handed, and that is
the whole of it.
