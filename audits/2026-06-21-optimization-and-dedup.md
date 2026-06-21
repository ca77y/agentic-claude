# Optimization & Dedup — closed

> Triaged 2026-06-21; all decisions made. Original audit had 20 surviving findings; the
> 10 verification-rejected ones were dropped (they remove load-bearing context — do not
> pursue). **No open questions remain.**

## Applied

- **Engineering manifest version drift** — bumped `plugins/ca77y-engineering/plugin.json`
  `0.8.0` → `0.8.3` to match the Claude manifest + actual release. (library already synced.)
- **"Nextflick" hardcoding** — scrubbed all 9 occurrences in the three library agents →
  "the project's …". README L84 left as the canonical-example contract.
- **Dead README roster comment** — L344 → `# subagent definitions`.
- **Version-sync guard (A)** — added to `CLAUDE.md` as a "check before pushing a bump"
  instruction + a JSON-value-parsing snippet (immune to the trailing-comma difference
  between the two manifests). Advisory; if ever wanted enforced, the same snippet drops
  into a git `pre-push` hook.

## Decided — no change

- **README/manifest duplication (C)** — keep as-is. README is **not** a plugin component
  (the loader reads only the manifest + declared agents/skills/commands/hooks), so the card
  legend there costs zero agent context.
- **Low-value in-file prose trims (D)** — skipped. The repetition in those tuned /
  recently-hardened prompts is intentional belt-and-suspenders.
- **Centralize the `AGENTS_IMPROVEMENTS` block (B)** — **keep the duplication.** The
  `@file`-import route doesn't work (verified: `@path` import is CLAUDE.md-only; agent/skill
  bodies are used verbatim; and `@` is non-portable to agy). An authoring-time inliner was
  the alternative, but the ~96 reclaimed lines aren't worth the generator + marker
  machinery, so the block stays inline and self-contained in all 12 files.
