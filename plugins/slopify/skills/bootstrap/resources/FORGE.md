# Forge declaration

Configuration does not authorize execution; the user's request does. An operation not bound here has no grant.

## Repository

- Remote and permitted push destinations: {{REMOTES_AND_DESTINATIONS}}
- Forge and how it is reached, without credentials: {{FORGE_ACCESS_OR_NONE}}
- Target branch and its protection: {{TARGET_BRANCH_AND_PROTECTION}}

## Workspace

- Branch name: {{BRANCH_DERIVATION}}
- Story worktree path and its ignore rule: {{WORKTREE_PATH_AND_IGNORE}}
- Worktree preparation: {{WORKTREE_PREPARATION_OR_NONE}}
- Cleanup after merge: {{CLEANUP_OWNER}}
- Spike prototypes: {{SPIKE_PROTOTYPES_OR_NONE}}

## Commits and push

- Commit convention: {{COMMIT_CONVENTION}}
- When to push: {{PUSH_CONDITIONS}}

## Pull request

- Create, update, read, comment: {{PR_BINDINGS}}
- Title and body: {{TITLE_AND_BODY}}
- Review trigger, whether opening the PR fires it, and where findings land: {{REVIEW_TRIGGER_OR_NONE}}
- Review status, as commands that can be polled: started, finished, how to read the result, including one that skipped the change or ended before every step finished; the poll interval; and each phase's time limit and what it is measured from: {{REVIEW_STATUS_OR_NONE}}
- Required checks: {{CHECKS_OR_NONE}}

## Restrictions

Autonomous work never does these; an explicit user request for one authorizes it.

{{RESTRICTIONS}}
