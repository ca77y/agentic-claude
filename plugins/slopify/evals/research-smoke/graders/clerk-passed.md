---
type: llm
focus: last_message
---

Pass if the final response says the research finished and that a separate validator or reviewer (the `library-clerk`, or a reviewer described as fresh, separate, or final) checked and passed it, and it mentions at least one raw note file under `library/raw/` and the synthesis page under `library/wiki/`. It need not list every file, and a relative path is fine. Fail if it says the research is still running, was blocked, or failed validation, or if either kind of file is not mentioned.
