---
name: ask
description: Answer a question, comparison, or synthesis from the existing project library, citing its evidence and exposing gaps or staleness. Does not initiate internet research, persist content, or perform maintenance.
---

Answer the question in the conversation from the existing project library. This is read-only: no internet research, no library writes, no maintenance. If a good answer needs new sources, say so and suggest `research`.

1. Read `library/_meta/librarian.md`, then the relevant index and wiki pages and the raw notes behind them. For a broad question, dispatch `slop-lib:librarian` for the retrieval.
2. Answer directly. Cite each consequential claim to its file and heading, keep what the library says separate from your inference, and flag conflicts, staleness, and gaps. A search that finds nothing shows what the library lacks, not that the thing doesn't exist; "the library can't support this" is a valid answer.
3. If the user asks for a verified answer, dispatch a fresh `slop-lib:clerk` with the exact draft and its cited sources, and report its verdict with the answer.
