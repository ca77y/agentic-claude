---
type: story
title: Stop the docs pass routing to doc categories the project may not have
---

# Stop the docs pass routing to doc categories the project may not have

- [ ] Stop the docs pass routing to doc categories the project may not have #improvement 🔽 🆔 soften-the-docs-pass-routing-table
  - `writer.md`'s docs pass gives a fixed routing table — capability behaviour to "the feature docs", journeys to "the flow docs", UI/system design to "the design docs" — and asks the final report which content went to features / flows / designs. A project without those categories has no row that fits, and followed literally the table produces an invented doc that merely restates agent prose.
  - Background: this project routes durable content to `PRODUCT.md`, `ARCHITECTURE.md`, and the root `README.md`, and `docs/CLAUDE.md` states that prose about how an agent should behave belongs in the agent definition and *not* in docs at all — so the correct outcome for an agent-definition change is to create no doc. The `lead` had hit this before: its dispatch prompt spent a paragraph pre-empting it ("Do NOT invent a features/flows/designs doc entry that just restates the agent prose"), a manual workaround for something the definition should say itself.
  - Scope: `plugins/ca77y-engineering/agents/writer.md`, docs pass (step 3–4) and its final-report template.
  - Acceptance criteria:
  - The docs-pass routing table is stated as an example mapping by kind (behaviour / journey / design), not as a fixed target set — the project's documentation conventions name the actual documents, which may be a different set entirely.
  - The docs pass handles the case the table has no row for: when the project's conventions say the durable home for this content *is* the artifact already changed (e.g. the agent definition itself), the correct output is no new doc, reported as such.
  - The final-report template no longer asks which of features / flows / designs received content when the project has no such categories.
  - Followed literally, the docs pass no longer invents a features/flows/designs entry that restates agent prose, which `docs/CLAUDE.md` forbids.
  - See [`../CLAUDE.md`](../CLAUDE.md) for this project's actual durable-doc routing.
