# researcher — evidence discipline

Loaded on demand by `ca77y-library:researcher` when a search returns empty, fails, or looks suspiciously thin, or when a vendor's current source disagrees with dated reports. Everything here binds exactly as if it were written in the agent definition, alongside the definition's own rules, which keep binding.

The step numbers below are the agent definition's workflow steps.

## An empty search result is a suspected tool fault

- An **empty result set** is a **suspected retrieval fault**, never on its own evidence of non-existence. The call succeeds with zero results, so nothing raises the fault for you — suspect it **actively**, and never record, report, or pass upward an absence-based conclusion resting on an empty result unchecked by a control query.
- **Control query.** On the first empty result from a search path, issue **one** control query with a term that cannot legitimately return zero (`typescript`, say) through the **same path**: same tool, same engine override — **each override is its own path** (`google`, `brave`, `duckduckgo`, ...). The verdict applies to that path only.
  - Control **non-empty** → retrieval works there; an absence-based conclusion from that path is `confirmed absent` — *retrieval was verified working and returned nothing*, not "this does not exist".
  - Control **also empty** → the path is **faulted**; label **every** absence-based conclusion drawn from it `unretrieved, not absent`.
- One control per suspected-faulted path, not one per empty query. Once a path is proven faulted, stop re-querying it and switch to the fallbacks.
- Every absence-based conclusion **drawn from a path that returned empty** carries **exactly one** of the literal labels `confirmed absent` / `unretrieved, not absent`. A conclusion resting on **non-empty but unhelpful** results is not a retrieval fault and takes neither label — report it under uncertainty and source quality.
- **Known-good fallbacks for a faulted path**, routed by corpus:
  - **Hacker News** — fetch `https://hn.algolia.com/api/v1/search?query=<q>&tags=story` as JSON for threads, then `https://hn.algolia.com/api/v1/items/<objectID>` (JSON) for a whole comment tree.
  - **General search** — fetch `https://lite.duckduckgo.com/lite/?q=<query>` **as a page**; `duckduckgo.com/html` returns an anti-bot page.
  - **Reddit** — the `.json` API is 403-blocked; `old.reddit.com` thread pages fetch but are **very token-expensive** — a deliberate last resort.
- Whenever the primary search failed, **name in your report which fallback you used**, so fallback-retrieved evidence is distinguishable from search-retrieved.
- If neither the primary search nor any listed fallback retrieved anything, report that **search was unavailable**, name what you tried, and label every affected conclusion `unretrieved, not absent`. Never report search-blocked gaps as findings.
- A **specific source you could not fetch** is a rejected source (step 5's callout); a **search path that returns nothing** is a retrieval fault (this section); when both happen, record both.

## A vendor's current source versus dated reports is a timeline question

- When a vendor's **current** source (repository `HEAD`, current docs, a current template) contradicts **dated practitioner failure reports**, treat it first as a **timeline question**, not a credibility question.
- Search the source repository's **commit history and blame for the disputed parameter or symbol** across the window the reports span — the current revision alone cannot show a defect that was later removed.
- Check whether the artifact the reporters actually run **auto-upgrades or is version-pinned** — a merged fix is not a fixed user.
- The two checks are independent — run both. Do not conclude user error, and do not dismiss the reports as unverified, until **both** are done.
- If history or blame cannot be retrieved, report the contradiction as **unresolved**, with what you attempted — never resolved in the current source's favour.
