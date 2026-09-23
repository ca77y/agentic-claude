# Card authoring

Read only when a requested card operation applies. The main skill's authority and validation rules remain mandatory.

Read the project's `docs/BOARD.md` for tracker identity, tool bindings, card schema, statuses, human gates, and operation-based write conditions. Establish the exact target from the request; use bound read/search operations to locate related cards when relevant. A product-fit or duplicate audit is validation and must use a fresh validator. Missing access is a disclosed evidence gap.

Prepare the requested card content using the board's shape: problem and intended outcome, scope/exclusions, observable acceptance criteria, material dependencies, and evidence. Keep assumptions and decisions separate. Inspect existing content before proposing an update and preserve unrelated fields. A proposal with unresolved material decisions remains a draft.

Create/update only if the actual request authorizes that operation and the declaration supplies its conditions and bindings. A proposal-only request does not authorize filing. Missing bindings block that operation; preserve the local proposal. Explicit engineering bootstrap can create or repair declarations, but ordinary shaping does not rewrite authority.

Use the declared initial status for creation. Never cross a human gate, change product intent, or rewrite acceptance criteria to match an implementation. Comments or notifications to other people require explicit user authorization. Give the validator the proposed content and acceptance source; validation does not grant permission to submit. Any post-write content or round-trip check also belongs to a fresh validator. Return the actual saved identity or the prepared artifact and blocked operation.
