# Forge declaration

Configuration does not authorize execution; the user's request does. An operation not bound here has no grant.

## Repository

- Remote and permitted push destinations: {{REMOTES_AND_DESTINATIONS}}
- Forge and how it is reached, without credentials: {{FORGE_ACCESS_OR_NONE}}
- Target branch and its protection: {{TARGET_BRANCH_AND_PROTECTION}}
- Default working checkout: {{DEFAULT_CHECKOUT}}

## Workspace

- Branch name: {{BRANCH_DERIVATION}}
- Story worktree path and its ignore rule: {{WORKTREE_PATH_AND_IGNORE}}
- Temp folder: `.tmp/` at the root of each checkout, ignored.
- Cleanup after merge: {{CLEANUP_OWNER}}

## Commits and push

- Commit convention: {{COMMIT_CONVENTION}}
- When to push: {{PUSH_CONDITIONS}}

## Pull request

- Create, update, read, comment: {{PR_BINDINGS}}
- Title and body: {{TITLE_AND_BODY}}
- Review trigger and where findings land: {{REVIEW_TRIGGER_OR_NONE}}
- Review status, started and finished, as commands that can be polled, with time limits: {{REVIEW_STATUS_OR_NONE}}
- Required checks: {{CHECKS_OR_NONE}}

## Restrictions

Autonomous work never does these; an explicit user request for one authorizes it.

{{RESTRICTIONS}}
