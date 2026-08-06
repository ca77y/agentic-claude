# <Spec title>

- **Status**: Draft
- **Task**: <slug>
- **Last Updated**: YYYY-MM-DD
- **Document Scope**: One unit of work: the problem, change, and observable behavior that proves it ships

---

## Goal

The problem, proposed change, user value, and explicit non-goals.

## Acceptance criteria (verbatim transcription)

> **Source**: card `<identifier>`, read from `<board>` via the `read` binding on **<date>**,
> at status `<status>`, **after** this spec pass's criterion correction was applied to the
> card (see *Deviations from the card*), if any. This is a **copy, not a summary** — one
> card bullet per `ACn` line, in card order, `n = <count>`. The `auditor`'s mechanical
> equality check, performed in each gate that uses this section, licenses the copy —
> not a promise that it is faithful; delete this note if the card has no acceptance
> criteria to transcribe.

- **AC1** — <verbatim, one behaviour per line>

## Design

Architecture, data flow, dependencies, risks, and alternatives. Link settled design in `docs/ARCHITECTURE.md` instead of repeating it.

## Requirements

### Requirement: <observable capability>

#### Scenario: <name>

- **WHEN** <trigger or action>
- **THEN** <observable result>

## Tasks

- [ ] Implementation checklist ordered for execution

## Already satisfied criteria

Every `ACn` that needs nothing built — already true of the code and prose that exist, checked against them rather than asserted. Drop this section, the same way the transcription section is dropped, when every criterion needs work.

**Entries use `→`, not the `—` the transcription above uses.** The `auditor`'s mechanical equality check greps for the transcription's `- **ACn** — ` lines; reusing that shape here would put every entry in this section in reach of a comparator that greps for it, and this convention is what keeps the two sections apart.

- **AC1** → what satisfies it (the file, or files, and the commit where a commit is what settled it) · what `qa` re-validates against the post-build tree · whether this task's own changes also touch that surface (an edit site is satisfied *and* at risk)
