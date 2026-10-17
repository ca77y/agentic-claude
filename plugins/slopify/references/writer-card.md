# Story and bug report

Write the content to the draft path the brief names, and only there, in the card shape `docs/BOARD.md` declares. Filing it is `pusher`'s job. When the draft updates an existing card, read the current card through the board's read binding first, and preserve the fields the brief doesn't ask you to change.

## Story

Cover the problem and outcome, scope and exclusions, observable acceptance criteria (one behavior each), dependencies, and evidence, keeping assumptions and decisions apart. State what is wanted and why, never how to build it: no approach, design, or implementation. When the brief supplies advisor views, synthesize them and state which you adopted and why.

Record each open decision in the draft as one line, `<!-- open-decision <id>: <question> -->`, with `id` matching `[a-z0-9-]+`, and report the same ids. When the brief supplies answers, apply each one in the draft, remove its marker, and report anything still open.

## Bug report

Cover the evidence, the steps to reproduce, the expected outcome, and the observed outcome, each consistent with the reproduction the brief names: its path, the commands it runs, and their output. Cite the reproduction rather than paraphrasing it, and add no diagnosis or fix the evidence doesn't show.
