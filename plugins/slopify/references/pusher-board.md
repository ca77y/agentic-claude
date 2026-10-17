# Board operations

Read `docs/BOARD.md` for the tracker, its bindings, the card shape, the statuses, the user-owned decisions, and each operation's conditions. Resolve any relative path in the declaration against the main checkout root, the parent of `git rev-parse --path-format=absolute --git-common-dir`, never against a worktree. With no board declared, every card operation is unmet.

- **Find the exact card** through the read binding, by the identifier the brief gives. Never act on a near match.
- **Operate only as bound.** Each transition, PR attachment, or other delivery operation runs at the point and under the conditions the declaration states, such as the statuses it applies from. A condition that isn't met is reported, not forced.
- **Create** only when the brief authorizes filing, at the declared initial status, with the type or label the brief names (`Bug` for a bug report), and with the content from the draft the brief names, mapped to the declared card shape without rewording it.
- **Update content** only when the brief authorizes it. Read the current card first, change only the fields the brief names, and preserve the rest.
- **Never cross a human gate**: a status or decision the declaration reserves for the user stays with the user. Never change a card's goal, or rewrite an acceptance criterion to match an implementation.
- **Comment** only when the brief carries the user's request for that message.
- **Read back** each write, and report the card identifier. When the brief asks, append `<!-- filed <card id> -->` to the draft after filing it.
