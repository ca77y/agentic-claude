# False-claim correction briefs

Read when preparing a correction for a documentation-accuracy finding. Treat the claim across the candidate as the correction unit, including prose, tests, identifiers, comments, tables, and source documentation. This procedure applies to direct production by the main agent as well as delegated writer work; it does not replace the specification gate, fresh validation, or shared failure budget.

Before production, include in the correction brief:

- The finding, false claim, intended supported meaning, and any material qualifier that every retained restatement must carry.
- The acceptance source, validated spec where applicable, exact candidate snapshot and comparison baseline, and a complete candidate file inventory. Include attributable committed, staged, unstaged, and untracked changes, and renamed and deleted paths. Explicitly exclude unrelated work; do not derive the inventory from a prose or extension filter. Account for deletions and report unreadable files as gaps.
- Supplied source evidence, with locations and observed values or behavior; identify missing support rather than inventing it.
- Assigned write paths and concurrent owners. Give the writer read access to the whole candidate inventory; route required code/test changes and other out-of-scope writes to the main agent or authorized production owner. A search hit does not expand write authority.
- A durable evidence output path retained with the ledger, and the required sentence, restatement, and final-search records described below. The main agent remains the sole ledger writer.

Require the writer to follow its documentation correction procedure: structured evidence for every sentence in the affected passage, including connective and summary sentences, citing supporting `path:line` and observed value; separate dispositions for every restatement in sibling paragraphs, related tables, and source docstrings; and, after wording settles, a search of all candidate files for distinctive terms and meaningful negations without an extension filter. Each hit needs a keep/change disposition and reason, including test names, identifiers, and inline comments. No fixed table schema is required. Unsupported sentences and incomplete coverage remain unresolved.

Integrate corrections through their authorized owners. Refresh affected sentence/restatement evidence and repeat the whole candidate search after wording or candidate changes; do not hand off stale records or leave pending change dispositions as completed work. Give a newly dispatched document auditor the final snapshot, baseline and inventory, finding, source evidence, and all correction records. Require item-by-item source grading of sentences, restatements, and search dispositions, including consistent material qualifiers. Record the verdict and unresolved findings in the ledger under the existing gates and attempt budget.
