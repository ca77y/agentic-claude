---
type: story
title: Define what a spec's verbatim file fence is normative about
---

# Define what a spec's verbatim file fence is normative about

- [ ] Define what a spec's verbatim file fence is normative about #improvement 🔽 🆔 define-what-verbatim-means-in-a-spec-fence
  - A spec that prescribes a file's contents "verbatim" in a fenced block is offering a byte-level contract it cannot keep: the project's formatter reformats code embedded in Markdown differently from the real file, so the block and the file it prescribes are never byte-identical, and no downstream agent knows which one is canonical.
  - Background: the `quality-gate-ci` spec prescribed `lint-staged.config.mjs` "verbatim" in a ` ```js ` fence. `prettier --check .` covers `docs/`, and inside the fence prettier collapsed the task array onto one 106-character line, while the real `.mjs` file must stay wrapped across five lines to satisfy the same prettier run. Neither the `coder` nor `qa` could use the block as a byte-level contract — `qa` had to diff both and reason about which prettier considered canonical. The spec anticipated this for `build.yml` ("modulo whatever `prettier --write` does to it") but not for the `.mjs`, and that escape hatch only works because a reader knows to ignore formatting: a real content deviation would look identical.
  - Scope: `plugins/ca77y-engineering/agents/writer.md`, or one line in `docs/_templates/spec.md` — stated once, wherever the spec's parse contract already lives.
  - Acceptance criteria:
  - Fenced file contents in a spec are defined as normative in **content only, never formatting**, and the committed file's formatting is whatever the project's formatter produces for that file's own extension.
  - The rule is stated once, in a place both `qa` and the `auditor` already read, so neither re-derives what "verbatim" means per spec.
  - Alternatively or additionally, the `writer` fences prescriptive file contents in a language the project's formatter does not rewrite, so the block survives a repo-wide format check unchanged.
  - A genuine content deviation between the fence and the file is distinguishable from a formatting one.
  - Cross-links [`format-the-spec-before-the-lead-commits-it`](format-the-spec-before-the-lead-commits-it.md): both stem from the project formatter treating the spec as a source file.
