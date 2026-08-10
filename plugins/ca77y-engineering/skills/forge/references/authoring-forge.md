# Authoring `FORGE.md`

Load this only when a project's forge declaration has to be **written or repaired**. Reading back an existing one needs nothing from this file — `SKILL.md` alone covers that.

`FORGE.md` is the project's own answer to *how does a change get from a branch to a reviewed change*. The `lead` reads it directly, before it creates a workspace; a human maintains it. It is prose a person can read, not config — but every claim in it has to be true enough to bind a command to.

## Where it goes, and what it is called

Exactly `docs/FORGE.md` — a fixed path, the same way `docs/BOARD.md` and `docs/AGENTS_IMPROVEMENTS.md` are fixed. Do not rename it, do not split it across files, and do not write it anywhere else. If the project already documents its branch model somewhere — a `CONTRIBUTING.md`, a section of a `CLAUDE.md` — the new file **points at that page and fills the gaps it leaves** rather than restating it; two declarations that can disagree are worse than one that is thin.

**Where `docs/BOARD.md` already binds a fact, do not restate it here.** The rule that settles which file owns what: **the declaration that owns the *consumer* of a fact names it, and cites the other.** A branch name derived from a card is consumed by git, so this file owns it and cites the board declaration for the field it reads. The authority to attach a link to a card is consumed by the board, so that file owns it and cites this one for where the link comes from. Shape statements ("one story is one card is one change") may appear in both; only **bindings** are single-sourced.

## If the user says a declaration already exists

Take them at their word — and do not go hunting for it, and do not write a second one. What matters is only whether it is at the fixed path. Tell them so, and give them the fix:

1. **Move the file to `docs/FORGE.md`,** or write a new declaration there that points at the existing page and fills its gaps, per *Where it goes* above.
2. Then invoke the skill again — it will read the file directly, at that path, and report what it currently says, including anything the declaration leaves unbound.

Offer to make that move yourself if they want, subject to the same rule as everything else here: only when they invoked the skill directly, never mid-run.

## Write it only when the user asked for it

- **The user invoked the skill directly** → interview them, write the file, and tell them what to check. A `lead` that stopped for a missing declaration and sent them here counts as this case: no run is in progress by the time you are reached.
- **A run is somehow in progress** → never write it. Put the draft in your report and let the user decide. **Never write it so a stopped `lead` can continue** — the stop is the design, and a declaration authored to unblock somebody is a guess wearing the authority of a project document.
- **Never write credentials, tokens, cookies, credentialed clone URLs, or private endpoints into it.** Name the mechanism and say it is already authenticated ("the `gh` CLI, already logged in on this machine"). If a reader would need a secret to use what the file describes, describe it differently.

## What it must answer

Ten questions. Ask the user only what the project cannot tell you — read the rest from `git remote -v`, `git branch`, the ignore file, `git log`, the workflows directory, and the shape of changes that have already merged.

1. **Which repository, and which remote does the pipeline push to?** Name and URL; whether this checkout is a fork with an upstream, and if so which remote is never pushed.
2. **What is the target branch, and may anything push it directly?** The pipeline's answer is always no — ask so that the branch's name is right, and so that any allowed merge *into* a story branch is recorded.
3. **Where do story worktrees live, and is that directory committed to the ignore file?** If it is not, report it: a missing entry means an ordinary commit step can sweep a whole worktree into a story commit.
4. **How is a branch named?** The source of the name — a field on a card (say which, and that it is read through `docs/BOARD.md`), a slug, a prefix convention — and the fallback for a run that names no card.
5. **What convention do commit messages follow, and what must a message name?** Read three real subjects off a **story branch**, not off the default branch: a squash-merging repository's default branch shows change titles, not the commit convention.
6. **When does a push happen, and what may never be rewritten?** Push timing is a real design fact — it decides whether pre-ship round commits are recoverable off the machine at all.
7. **Is there a forge? Which one, what does it call a change, and how is it reached?** A CLI that is already authenticated, an MCP server that is already connected, a documented endpoint, or none. Where two mechanisms are present, say which one the bindings use and that the other is deliberately unused.
8. **What is the concrete call for each operation?** *branch · remove a worktree · commit · push · open the change · update it · comment on it · read it back · re-fire the review · merge.* Mark one *not available* rather than omitting it — an unbound operation is a real answer, and the pipeline behaves differently on each.
9. **What must a change's description carry, and what does it open against?** The section set, the title's shape, whether a later fix round appends or rewrites, and which forge metadata is deliberately unused.
10. **Who reviews an opened change, how is that review fired and re-fired — and what may the pipeline write?** The exhaustive authority, then what stays the human's: merging, force-pushing, rewriting pushed history, deleting refs, tagging, releasing.

## The template

````markdown
# The forge

How this project gets a story from a branch to a reviewed change, read directly at this
fixed path — `docs/FORGE.md` — by the `lead`, before it creates a workspace. Keep it
true, because the pipeline binds real commands to what it says, and because a run
**stops** rather than guess when this file is missing.

## The repository

<Which repository, and which remote the pipeline pushes to. Fork and upstream, if any.>

## Reaching it

<The forge mechanism: a CLI that is already authenticated, an MCP server and its tools,
a documented endpoint — or **none**. Where two are present, which one the bindings use.
No credentials here.> | *there is no forge*

## Branches and worktrees

- **Target branch** — `<name>`. <What branches off it, and that nothing pushes it.>
- **Story worktrees** — `<directory>/<branch>`, covered by the committed ignore entry
  `<entry>`.
- **Branch name** — <where the name comes from, and the fallback when a run names no
  card>.
- **Removal** — <who removes a worktree and its branch, and when>.

## Commits

<The message convention, with two or three real subjects from a story branch. What a
message must additionally name.>

<When a push happens.> Never <the rewrites this project forbids>.

## Operations

- **branch** — <call>
- **remove a worktree** — <call> — *<whose, and when>*
- **commit** — <call>
- **push** — <call> | *not available*
- **open the change** — <call>. <Where the link comes from.> | *not available*
- **update the change** — <call> | *not available*
- **comment on the change** — <call> | *not available*
- **read the change** — <call> | *not available*
- **re-fire the review** — <call> | *not available*
- **merge** — *not available*

## The change artifact

<What the forge calls it, and the word this project uses. One per story, opened against
the target branch, never a second one.>

- **Title** — <its shape, and what happens to it on merge>
- **Description** — <the section set, in order, and whether a fix round appends>
- **Link** — <that it is the open binding's own output, never constructed>
- **<Metadata this project deliberately does not set>** — unused here.

| *there is no change artifact — a run ends at its last commit on the story branch*

## The review

<Who reviews an opened change, how the review is fired, how it is re-fired — the literal
trigger — where findings land, how they re-enter the pipeline, and that nothing waits on
it.> | *no review is configured — say so rather than naming a trigger*

<Any required check the change must satisfy, or that there is none.>

## What the pipeline may write

<The exhaustive list. Default: a branch, a worktree, and commits in it — nothing that
leaves the machine.>

Everything else is the human's, and is reported rather than done:

- **Never merge**, and never enable auto-merge.
- **Never force-push, amend a pushed commit, rebase a pushed branch, or delete a branch,
  a tag, or a remote ref.**
- **Never push the target branch**, commit to it, or check it out in a worktree.
- **Never open a second change for a story, and never close one.**
- **Never cut a release or a tag.**
- **Never touch another repository**, and never add a second remote.
````

## Worked examples

Four shapes, none privileged. Copy the closest and cut what does not apply.

**A hosted forge over an authenticated CLI** (GitHub via `gh`, and the same shape for anything else with a first-party command). *Reaching it:* the command, and that it is already logged in for whoever runs the pipeline — name no token. *Operations:* `gh pr create --base <branch> --head <branch> --title … --body-file …`, `gh pr edit`, `gh pr comment`, `gh pr view --json`, `gh pr diff`. *The change artifact:* a pull request; the description's section set; the link is whatever `gh pr create` printed. *The review:* a workflow in the repository, fired on the change opening and re-fired by a literal comment trigger — **read the workflow's own condition to get that trigger exactly right.** A guessed trigger fires nothing, and a review that never ran looks identical to one that found nothing.

**A hosted forge whose change is called something else** (GitLab via `glab`). The example that earns its slot on naming: the change is a **merge request**, and the declaration records that word — the pipeline's behaviour does not change, but everything it says to a human does. *Operations:* `glab mr create --target-branch`, `glab mr update`, `glab mr note`. *The review:* frequently not a bot at all, but an approval rule plus a pipeline — so *re-fire the review* is *not available*, and the declaration says the review is a human approval, which the `lead` then reports rather than trying to trigger. *Worth stating:* whether the project squashes, since that decides whether the change's title or the branch's commit subjects reach the target branch.

**A forge over MCP.** *Reaching it:* the forge's MCP server, already connected in this workspace — name the tools for creating a change, updating it, commenting, and reading it back. *Worth stating explicitly:* **a push is usually still git, not MCP.** This is where MCP-only setups most often leave a hole — a declaration that binds *open the change* to a tool but leaves *push* unbound describes a pipeline that cannot ship, because there is nothing at the remote for the change to be opened against. Bind both, or mark push unavailable on purpose and say what that means.

**No forge at all.** A repository with a remote but nothing hosted in front of it, or a local-only repository. *The forge:* **none.** *Operations:* branch, commit, and push bound; open, update, comment, re-fire, and merge all *not available*. *The change artifact:* none — the run's output is a named branch and a commit range. *The review:* a human reading the branch. **This is a complete declaration, not a missing one:** the `lead` runs the whole pipeline against it and ends at its last commit, reporting the branch, the range, and the description content it would otherwise have posted. A file that says *no forge* works; only a file that is absent stops a run.

## Before calling it done

- **Check the file landed at `docs/FORGE.md`, exactly.** The `lead` reads that one path directly, before it creates a workspace, and nothing points at it for the pipeline's sake.
- **Verify it read-only against the real repository.** `git remote get-url <remote>` resolves; `git rev-parse --verify <target-branch>` exists; one change that has already merged is located through the *read* binding. **Never verify with a write** — no throwaway branch, no test change, no probe comment.
- **Run the branch-naming rule by hand against one real card** and check that it produces a legal ref — no spaces, no `..`, no trailing `/` — and that the worktree path it implies is writable.
- **Check every operation** the project wants available is bound, and every one it does not is marked *not available* rather than left out.
- **Check the worktree directory has a committed ignore entry**, and that the run-local scratch path does too. Report a missing one, and offer to add it rather than adding it silently.
- **Check the review section names a trigger a human can actually fire**, taken from the workflow's own condition — or says plainly that there is none.
- **Check no credential got written down**, including inside a clone URL or a command.
- **Check nothing here restates a binding `docs/BOARD.md` already owns** — that file supplies a card's identity; this one supplies only the branch derived from it.
- Hand the user the file's path, what you verified read-only and against what, and the one or two things you had to assume.
