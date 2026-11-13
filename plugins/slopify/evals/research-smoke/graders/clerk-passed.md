---
type: llm
focus: last_message
---

Pass if the final response says the research finished in a pull request, recorded in a local file such as `.forge/prs/smoke.md`, that names the wiki page answering the question, and that it mentions at least one raw note under `library/raw/`. A review that did not run because none is declared does not count against it. Fail if it says the research is still running, was blocked, or that no pull request was opened.
