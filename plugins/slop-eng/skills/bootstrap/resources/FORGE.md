# Forge declaration

## Repository and access

{{REPOSITORY_REMOTES_AND_PERMITTED_DESTINATIONS}}
{{FORGE_ACCESS_MECHANISM_OR_EXPLICIT_NONE}}

## Branches and workspace

{{TARGET_BRANCH_PROTECTION}}
{{BRANCH_DERIVATION_WORKSPACE_PATH_IGNORE_AND_RECOVERY}}

Temp folder: `.tmp/` relative to the project root unless a different path is configured. Keep its ignore rule aligned with the selected path. Store workflow ledgers in `<temp-folder>/ledgers/` and preserve ledgers and required evidence during scratch cleanup and after completion.
{{USER_OWNED_CLEANUP}}

## Commits and publication

{{COMMIT_CONVENTION_AND_AUTHORIZATION}}
{{LOCAL_CHECKPOINTS_AND_VALIDATED_PUSH_CONDITIONS}}

Configuration alone does not authorize execution. Explicit invocation of a workflow whose endpoint is a PR authorizes its task branch/workspace, attributable commits, verified push, and PR creation or update without a second publication request. An ordinary implementation request outside that workflow may remain local in the default checkout and does not authorize commits or publication. Comments and review requests require explicit user authorization.

## Operations

{{BRANCH_COMMIT_PUSH_CREATE_UPDATE_READ_AND_COMMENT_BINDINGS}}
{{UNAVAILABLE_OPERATIONS_AND_USER_OWNED_DECISIONS}}

## Change artifact and review

{{TITLE_BODY_METADATA_TARGET_AND_ONE_CHANGE_PER_TASK_RULE}}
{{REAL_RETURNED_URL_SOURCE}}
{{REVIEW_TRIGGER_OR_EXPLICIT_NONE_AND_REQUIRED_CHECKS}}

## Restrictions

{{MERGE_FORCE_PUSH_HISTORY_REF_RELEASE_CLEANUP_AND_DESTINATION_RESTRICTIONS}}
