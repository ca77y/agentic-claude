# lead — the `--fast` flag

Loaded on demand by `ca77y-engineering:lead` when `--fast` is on the invocation, before the first dispatch. Everything here binds exactly as if it were written in the skill definition, alongside the definition's own rules, which keep binding.

## The `--fast` flag

**`--fast` is the user's, arrives on the invocation, and changes exactly one thing: the model each dispatch runs on.** Without it, omit `model:` from every `Agent` call — each agent runs on its own frontmatter pin. With it, pass `model:` explicitly on every dispatch, one tier down the ladder `opus → sonnet → haiku`, **haiku the floor**:

| Dispatch | Pinned | With `--fast` |
| --- | --- | --- |
| `ca77y-engineering:writer` | `sonnet` | `haiku` |
| `ca77y-engineering:auditor` | `sonnet` | `haiku` |
| `ca77y-engineering:junior-coder` | `haiku` | `haiku` — unchanged |
| `ca77y-engineering:senior-coder` | `opus` | `sonnet` |
| `ca77y-engineering:qa` | `opus` | `sonnet` |

**It steps the model and nothing else.** Not which agent — the build still routes on the **Coding complexity** score (step 4) and a promotion still goes to the senior. **Not effort** — a dispatch carries no effort parameter, so every agent keeps its frontmatter effort; never report a run as stepped down in effort. Not your own model. Not the workers' dispatches — pass the flag into no prompt. **Never turn it on or off yourself.** Look the model up in this table, never derive it from a pin, after the tier is decided. Record in the ledger whether it is in play and the model passed per dispatch; state it in the handoff.
