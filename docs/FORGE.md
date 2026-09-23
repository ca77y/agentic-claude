# The forge

This declaration binds repository and publication operations to the destinations below. Authorization comes from the user's actual request and established conversation scope. Configuring an operation does not request its execution. Explicit invocation of the deliver skill requests a PR endpoint and authorizes the corresponding task workspace, commits, verified push, and PR creation or update without another publication request. Missing bindings block the affected operation while authorized local preparation may continue.

## The repository

**GitHub** — `ca77y/agentic-claude`.
<https://github.com/ca77y/agentic-claude>

One remote, `origin` — `git@github.com:ca77y/agentic-claude.git`, over SSH. There is no
fork or upstream. The checkout is canonical, and `origin` is the only push destination.

## Reaching it

The **`gh` CLI**, already authenticated on this machine as `ca77y`; git operations use
SSH. The GitHub MCP server connected in this workspace is deliberately unused by these bindings. No
credentials live in this repository or belong in this file.

## Branches and worktrees

- **Default working checkout** — implementation requested without the deliver skill may remain an uncommitted local change on `master` in the repository root. Explicit deliver invocation requests a PR and uses the story branch and worktree. Other requested commit/PR endpoints or explicit isolation requests also use a separate branch and worktree.
- **Target branch** — `master`. Every story branches from it and every PR targets it.
  Automated operations never commit to it, check it out in a story worktree, or push it.
- **Story worktrees** — `.worktrees/<card-id>-<slug>` at the repository root, covered by
  the committed `.gitignore` entry `.worktrees/`. The issue identifier leads the directory
  name — the branch name's leading `tokwieci/` is dropped rather than nested — so
  `ls .worktrees/` and `git worktree list` name each story without a lookup:
  `.worktrees/smr-200-card-content-access`. A run with no issue uses the slug alone.
- **Temp folder** — `.tmp/` at the root of the current checkout or worktree, covered
  by the committed `/.tmp/` entry. Store workflow ledgers in `.tmp/ledgers/`;
  preserve ledgers and their required evidence during scratch cleanup and after completion.
- **Branch name** — the issue's `gitBranchName`, read through [`BOARD.md`](./BOARD.md).
  Linear supplies a legal ref such as
  `tokwieci/smr-200-card-content-access`. Without
  an issue, use `<type>/<lowercase-kebab-slug>`.
- **Removal** — after the PR merges, the human runs `git worktree remove <path>` and
  deletes the branch. Neither operation has an automated grant.

## Commits

The commit convention is **Conventional Commits**. Use `docs:` or `docs(<area>):` for
specification and documentation, `feat:` or `feat(<area>):` for a build, and `fix:` or
`fix(<area>):` for a fix round. A message names the issue when it adds the spec, and a
pre-ship fix names the round whose findings it applies. Illustrative subjects:

```text
docs(spec): add SMR-200 spec for card-content access
feat(cards): support scoped card-content refinement
fix(cards): correct the reference target for review round 1
```

Push once when the PR opens. Before that, the spec, build, and pre-ship round commits
stay local in the worktree. After the PR exists, push each fix round once its affected
validation and acceptance checks pass. Intermediate repair checkpoints stay local;
an unresolved blocking finding prevents publication.
Never force-push, amend or rebase pushed history, or push `master`.

## Operations

- **branch** — create new work with
  `git worktree add .worktrees/<card-id>-<slug> -b <branch> master`; recover a missing
  worktree for an existing story branch with
  `git worktree add .worktrees/<card-id>-<slug> <branch>`. The directory and branch differ
  deliberately: `<branch>` is Linear's `gitBranchName` verbatim.
- **remove a worktree** — `git worktree remove <path>` — *the human's, after merge*.
- **commit** — `git -C <worktree> add <paths>` (never `-f`), then
  `git -C <worktree> commit`.
- **push** — `git -C <worktree> push -u origin <branch>` the first time, immediately
  before the PR opens; `git -C <worktree> push` on each later verified fix round.
- **open the change** —
  `gh pr create --repo ca77y/agentic-claude --base master --head <branch> --title <title> --body-file <path>`.
  Its output is the PR URL; that output is the link, never a constructed pattern.
- **update the change** —
  `gh pr edit <number> --repo ca77y/agentic-claude --body-file <path>`, with `--title`
  when the title changes.
- **comment on the change** —
  `gh pr comment <number> --repo ca77y/agentic-claude --body <text>`.
- **read the change** —
  `gh pr view <number> --repo ca77y/agentic-claude --json title,body,url,baseRefName,headRefName`
  and `gh pr diff <number> --repo ca77y/agentic-claude`.
- **fire the review** —
  `gh pr comment <number> --repo ca77y/agentic-claude --body '@codex review'`.
  Explicit deliver invocation authorizes this one message after the PR opens and after
  each validated fix push on an existing PR.
- **merge** — *not available*. Merging and the merge method are the human's.

## The change artifact

A **GitHub pull request**, one per story, opened against `master`. A fix run reuses the
same PR and branch.

- **Title** — an imperative sentence naming the outcome, not a commit subject.
- **Description** — Markdown under applicable `##` headings, in this order:
  `## Task` · `## Spec` · `## What was built` · `## Tests` ·
  `## Gates and rounds` · `## Acceptance gate` · `## Docs` ·
  `## Production hazards / blockers` · `## Board follow-ups` ·
  `## Commits (<n>)` · `## Card status` · `## Review` ·
  `## Remaining risks / follow-ups`. Drop inapplicable sections rather than leaving
  them empty. A fix run appends `## Review round <n> — addressed`.
- **Link** — exactly the URL printed by `gh pr create`; attaching it to Linear is
  governed by [`BOARD.md`](./BOARD.md).
- **Labels, reviewers, assignees, milestones, and draft state** — unused here.

## The review

**Codex**, OpenAI's GitHub app, mentioned on the PR. It is installed on the repository and
configured on Codex's side — nothing in this repository fires it, and `.github/workflows/`
holds `claude.yml` alone.

- **Fired** by a PR comment with a `@codex` mention — `@codex review` for a review of the
  whole diff. `@claude` is a different handle, bound to the general assistant, and does
  **not** fire a review.
- **Re-fired** the same way, with another `@codex review`, once a fix round is pushed.
- **Whether a review also runs automatically when a PR opens** is a Codex-side setting this
  repository does not declare, so do not assume it: fire the review after opening the PR.
- **Findings** land as comments on the PR. They re-enter delivery only when the user
  invokes the deliver skill again with them or with the PR.
- **Nothing waits for it.** No poll, baseline diff, or watch for a first comment; a run
  ends with the PR open and reported as not yet reviewed.
- **Silence is not a clean bill.** There is no workflow run and so no log — a review that
  never fired looks exactly like one that found nothing. Check the PR's comments for
  Codex's reply before treating a diff as reviewed.

No CI or required status check is currently defined in the repository.

## Operation conditions

- **Read PR or diff** — the requested task requires that information from the bound repository.
- **Create or recover workspace** — an explicit deliver invocation, another requested commit/PR endpoint, or explicit isolation request authorizes one story branch and worktree under `.worktrees/`, following the configured derivation. Recover the existing story branch/worktree for repair; do not create a second workspace.
- **Commit** — the user explicitly invoked deliver or otherwise requested a commit or PR endpoint. Stage only attributable paths in the authorized story worktree, without forced staging, and use Conventional Commits. A local-change-only request does not authorize commits.
- **Push** — the user explicitly invoked deliver or otherwise requested publication of the same change, and required validation and acceptance have passed. Push only the story branch to `origin`; first push when opening the PR, later pushes for verified repairs. Keep intermediate checkpoints local; blocking findings prevent a push.
- **Open PR** — the user explicitly invoked deliver or otherwise requested a PR. Open one against `master` in the bound repository and retain its real returned URL. Reuse the existing PR for story repair.
- **Update PR** — the explicit deliver invocation or other requested publication/repair scope includes that same PR; title/body must reflect the same change and preserve unused metadata restrictions. Do not widen scope or create another PR.
- **Trigger review** — explicit deliver invocation authorizes one `@codex review` comment after the PR opens and one after each verified fix push on that PR. Record the observed result; later findings resume through a user request.
- **Comment** — any other PR comment requires the user's explicit authorization for that message. Configuration alone does not authorize communication.
- **Remove worktree or branch** — user-controlled cleanup after merge; no automated grant.

The following operations have no automated grant:

- Never merge or enable auto-merge.
- Never force-push, amend a pushed commit, rebase a pushed branch, or delete a branch,
  tag, or remote ref.
- Never push `master`, commit to it, or check it out in a story worktree.
- Never open a second PR for a story, and never close one.
- Never cut a release or tag.
- Never touch another repository or add another remote.
