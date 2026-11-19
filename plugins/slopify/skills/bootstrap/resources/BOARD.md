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
- Story format: {{STORY_TEMPLATE_MAPPING}}
- Bug format: {{BUG_TEMPLATE_MAPPING}}
- Spike format: {{SPIKE_TEMPLATE_MAPPING}}
- Deliverable: the label `Deliverable` marks a story card the shaping process filed with no open question left and every check passed, and comes off when shaping the card again leaves a question open. Only a card with this label can go through a full story delivery.
- Shaped: the label `Shaped` marks a card the shaping process filed, and is added every time it files or updates one. Shaping a card with this label again only applies the answers its comments give, without new grounding or advice.
- Unreproducible: the label `Unreproducible` marks a Bug card whose bug an automated fix could not reproduce.

## Statuses

- Statuses: {{STATUSES}}
- User-owned decisions: {{USER_DECISIONS}}

## Delivery

- When delivery starts: {{ON_START}}
- When the PR opens: {{ON_PR_OPEN}}
- When the PR's review is clean: {{ON_READY}}
- On a later round: {{ON_LATER_ROUND}}

## Other conditions

- Filing a card: {{CREATE_CONDITION}}
- Editing card content: {{EDIT_CONDITION}}
- Comments: {{COMMENT_CONDITION}}

Never rewrite an acceptance criterion to match an implementation.
