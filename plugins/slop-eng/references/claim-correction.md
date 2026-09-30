# False-claim correction

A claim fixed in one paragraph and left in another is still false, so the unit of correction is the claim everywhere it appears in the candidate: prose, tests, identifiers, comments, tables, and docstrings.

## Inputs

The brief supplies:

- the false claim, the supported meaning, and any qualifier every retained restatement must carry;
- the candidate snapshot, the baseline, and the full file inventory (committed, staged, unstaged, untracked, renamed, and deleted paths), with unrelated work explicitly excluded;
- the source evidence with locations;
- the writer's paths, with code and test changes routed to the main agent;
- where the records are kept.

Report a missing input instead of guessing it.

## Records

The writer produces these and the auditor grades them item by item:

1. **Sentences:** every sentence in the affected passage, connectives and summaries included, with its supporting `path:line` and observed value.
2. **Restatements:** every one in sibling paragraphs, tables, and docstrings, with a disposition and reason. Removed claims are gone, and retained ones carry the qualifier.
3. **Search:** every inventory file searched, with no extension filter, for the claim's distinctive terms and meaningful negations. Every hit, including test names, identifiers, and comments, has a keep or change disposition with a reason; a zero-hit result is explained.

Refresh the records after any change to the wording or the candidate.

## Verdict

The auditor checks the inventory against the baseline, reruns the search, and reports each item as supported, contradicted, or unverified with its location. Missing support, a missed restatement, an inconsistent qualifier, or a stale record blocks acceptance.
