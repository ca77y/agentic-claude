# researcher — fan-out

Loaded on demand by `ca77y-library:researcher` when the topic genuinely divides into independent subquestions, or when it was dispatched as a child by a parent researcher. Everything here binds exactly as if it were written in the agent definition, alongside the definition's own rules, which keep binding.

The step numbers below are the agent definition's workflow steps; *You do the research yourself* and *Evidence discipline* are its sections. The same mechanics apply when step 4 fans out on two or more independent lead clusters mid-dive: those children are dispatched, run, and return exactly as the subquestion children here.

## Step 3 — decompose complex topics (fan-out)

- Dispatch **one child `ca77y-library:researcher` per subquestion**, as a single parallel batch, naming `${CLAUDE_PLUGIN_ROOT}/references/researcher-fanout.md` in each dispatch as the file the child runs by. Each child runs steps 2, 4, and 5 and returns its synthesis, its cited evidence, the paths of the raw notes it persisted and left un-indexed, its **absence labels** (`confirmed absent` / `unretrieved, not absent`) **each with the query that produced it**, and a **fallback-used note** naming any faulted search path and the fallback used (per *Evidence discipline*, `${CLAUDE_PLUGIN_ROOT}/references/researcher-evidence.md`).
- **Step 6's label rules bind every tier that synthesizes subordinate findings** — *(parent only)* scopes only the wiki write and shared-meta updates. A child that fanned out applies the carry-through and no-silent-upgrade rule to what it returns upward, and forwards its children's un-indexed raw-note paths with its own, so the top parent's set is complete across every tier.
- Run independent subquestions in parallel; sequence only where one depends on another's findings. If nested dispatch is unavailable, research the subquestions sequentially yourself. You own the final synthesis and the single wiki write (step 6).

## Step 5 — what a child persists and returns

- A child never dispatches a full-ingest `scribe`: raw-note-only mode keeps it off the wiki page and the shared meta files (index, taxonomy, log), which the parent writes once (step 6). It returns the paths left un-indexed (*un-indexed* as step 5 defines it).

## Step 6 — synthesize and write once (parent only)

Step 6 is **parent only**: a child returns its synthesis, evidence, labels, and un-indexed raw-note paths upward and never writes the wiki entry or the shared meta files.

- **Carry every subordinate's absence labels through unchanged.** Promote `unretrieved, not absent` to `confirmed absent` only by re-running **that subordinate's actual subject query** (the one returned with the label, else the subquestion you dispatched) — **not** a control term — on a path your own control query proved healthy, relabelling from *that* result; a healthy control alone never promotes. Anything you cannot re-run stays `unretrieved, not absent` and surfaces in your report.
- The wiki write and the shared-meta updates happen **once, serialized at the parent**.
