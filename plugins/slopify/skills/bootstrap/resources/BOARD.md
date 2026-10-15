# Board declaration

Configuration does not authorize execution; the user's request does. An operation not bound here has no grant.

## Board

- Tracker, project, and team: {{BOARD_IDENTITY_OR_NONE}}
- Access, without credentials: {{ACCESS}}

## Operations

- Locate, read, search: {{READ_BINDINGS}}
- Create, with initial status: {{CREATE_BINDING}}
- Transition: {{TRANSITION_BINDING}}
- Update content and relations: {{UPDATE_BINDING}}
- Attach a PR: {{PR_LINK_BINDING}}
- Comment: {{COMMENT_BINDING}}

## Cards

- Identity and spec naming: {{IDENTITY}}
- Type and priority: {{TYPE_AND_PRIORITY}}
- Dependencies: {{DEPENDENCIES}}
- Body and acceptance criteria format: {{BODY_AND_ACCEPTANCE}}

## Statuses

- Statuses: {{STATUSES}}
- User-owned decisions: {{USER_DECISIONS}}

## Delivery

- When delivery starts: {{ON_START}}
- When the PR opens: {{ON_PR_OPEN}}
- On a repair run: {{ON_REPAIR}}

## Other conditions

- Filing a card: {{CREATE_CONDITION}}
- Editing card content: {{EDIT_CONDITION}}
- Comments: {{COMMENT_CONDITION}}

Never rewrite an acceptance criterion to match an implementation.
