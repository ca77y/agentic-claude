# Testing

How this project is booted, checked, and validated.

## Platform

{{WEB_IOS_ANDROID_CLI_OR_SERVICE}}

## Tools

Each tool, with a pinned install line, for example Playwright, Maestro, or a simulator MCP server.

{{TOOLS}}

## Setup

- Installing dependencies: {{INSTALL_COMMAND}}
- Where the env file comes from: {{ENV_SOURCE}}
- Seed data: {{SEED_DATA}}
- Where the test account comes from, never a personal logged-in session: {{TEST_ACCOUNT}}

## Boot

- Command: {{BOOT_COMMAND}}
- Readiness probe, a URL and port or a simulator name and OS: {{READINESS_PROBE}}
- Timeout: {{BOOT_TIMEOUT}}
- How each worktree gets its own port or simulator: {{PER_WORKTREE_ISOLATION}}

## Checks

Each command is expected to exit 0.

- Format: {{FORMAT_COMMAND}}
- Lint: {{LINT_COMMAND}}
- Typecheck: {{TYPECHECK_COMMAND}}
- Unit tests: {{UNIT_TEST_COMMAND}}

## Categories

The kinds of change this project recognizes, for example UI, API, data or migration, background job, copy, and config. Every acceptance criterion is filed under one category, or marked `uncategorized` when none fits. Repeat this block for each category.

### {{CATEGORY_NAME}}

- Covers, the paths or kinds of change: {{CATEGORY_COVERS}}
- Validation path, the steps that prove a change in this category works, for example "run the named flow in the app and capture screenshots", "run the integration suite and call the endpoint", or "run the migration on seed data and diff the schema": {{CATEGORY_VALIDATION_PATH}}
- Required evidence: {{CATEGORY_EVIDENCE}}
- When a criterion in this category can't be verified, the pull request is `ready` or stays `draft`: {{CATEGORY_READY_OR_DRAFT}}

### Uncategorized

When a criterion fits no category, the pull request is `ready` or stays `draft`: {{UNCATEGORIZED_READY_OR_DRAFT}}

Anything other than `ready` in these settings, including no statement, means `draft`.

## Flows

Named, deterministic flows the validation paths use. Each is a Playwright spec, a Maestro file, or a list of steps, with stable selectors: roles, labels, test ids, or accessibility identifiers.

{{FLOWS}}

## Evidence

Where captured evidence goes, for example traces, screenshots, recordings, or logs.

{{EVIDENCE_LOCATIONS}}

## Blind spots

What the tooling can't observe, for example native alerts, push notifications, or payments. A check that touches one returns `cannot-verify`, never `pass`.

{{BLIND_SPOTS_OR_NONE}}

## Teardown

Optional: how to stop the app and release the port or simulator.

{{TEARDOWN_OR_NONE}}
