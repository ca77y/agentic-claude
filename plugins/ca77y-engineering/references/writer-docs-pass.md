# writer — docs pass

Loaded on demand by `ca77y-engineering:writer` when the `lead` dispatches it for the docs pass, or routes a docs finding to it after that pass. Everything here binds exactly as if it were written in the agent definition, alongside the definition's own rules, which keep binding.

When a task ships, its spec's durable content is folded into the permanent docs and the spec removed — specs are not archived.

1. Resolve the target: the shipped spec, the areas and behaviours the change touched, and which docs need to exist or change.
2. Read the documentation conventions in your context (structure, where each kind of doc goes, its metadata), the project's docs-writing skill if any, the shipped spec, and the existing feature, flow, and design docs the change affects — update them rather than duplicating.
3. Establish what shipped per *What shipped is the run's diff, not the spec* below, before authoring anything.
4. Author or update docs per the project's per-document conventions (title, metadata block, scope; Mermaid for diagrams): capability behaviour, contracts, requirements → feature docs; user journeys, sequences, end-to-end walkthroughs → flow docs; UI/UX or system/architecture design → design docs.
5. Convert the shipped spec: fold its durable requirements, scenarios, and design into the right home above, reconciling each durable claim against the run's diff; the feature docs are the settled source of truth — merge, never append blindly.
6. Reconcile every paragraph you touch, per *Reconciling what you touch* below.
7. **Remove the converted spec** from the specs area once its durable content has a home.
8. Run the project's format or lint check over your own output, per *Checking your own output* below.
9. Report back to the `lead`, which commits everything.

## What shipped is the run's diff, not the spec

The shipped spec and the shipped code **can disagree by design** — a later `qa` or acceptance-gate finding lands in the code, not the spec — so treat disagreement as normal. Before authoring anything, establish what shipped from two read-only git reads through the story worktree:

- `git -C <worktree> diff <spec-commit>..HEAD` — *what shipped*. At docs-pass time `HEAD` is the last pre-ship round commit; the ship commit does not exist yet, since this pass's output is part of it.
- `git -C <worktree> log <spec-commit>..HEAD` — the round commits' messages, which per `docs/ARCHITECTURE.md`'s *The commit model* name the round's findings each applies and any tests `qa` added: the *reason* behind a difference.

Reconcile **each** durable claim against that diff before folding it into a durable doc. Where they disagree, **the diff is authoritative** — the doc records what the diff contains and the contradicted claim is not written as fact. Where the diff is silent, the spec's **intent** governs — goal, design rationale, requirements. Report every divergence in your Final report.

When the spec commit or round commit references cannot be obtained — none named in the dispatch, the commit not in the worktree's history, `git` unrunnable there — say so in your report, naming what was missing and which claims therefore rest on the spec alone. Never report the spec as reconciled against the diff when it was not.

## Reconciling what you touch

**The unit is the paragraph, and every sentence in it.** Touching a prose block, list item, table row, or diagram puts every sentence in it in scope, not only the lines you edited — editing a paragraph is vouching for it. A Mermaid node label or tree diagram asserting the superseded thing is a sentence here.

**Two standards, both applied.** A sentence contradicting either the shipped system or the project's stated principles is corrected or removed — document only what was built; the principles standard is what makes a sentence about something the project decided not to build correctable. A contradiction is fixed even when the edit that surfaced it was unrelated. Where the principles live is discovered from project context, never hardcoded — the product or principles document where context names one, else the settled source-of-truth docs; where a project states none, say so in your report and check against the shipped tree alone — a sweep that could not run is never reported clean.

**The guard: when the principle may be the stale side, report — do not rewrite it.** A principle states what the product is *for*; when you cannot tell which side is stale, or conclude the principle is, report it and leave the sentence as it stands.

**Check the docs you touched against the wider tree too** — contradictions, stale cross-references, duplication, other docs the merged work now makes wrong — and fix them in the same pass.

## Checking your own output

Before reporting back, run the project's format or lint command — discovered from project context, no tool named here — over the files this pass authored, changed, or removed. Three outcomes:

- **Defined and runnable** — run it, path-scoped where it accepts paths, else in check-only form; never a repo-wide write.
- **Not defined** — a stated outcome, not a failure: skip it, say so in your report, never invent one.
- **Defined but not trustworthy here** — the worktree's status is `provisioning failed` or absent and the command depends on it, or it fails to run at all: report that rather than concluding your docs are clean; the fetch-and-run ban holds. `no dependencies required` is not this case — trust it as `provisioned`.

A failure naming any file in this pass's set is yours: fix and re-run until clean. One naming only files outside it is pre-existing — record and relay, never fix. Where a failure in your own set survives fixing, report **not clean** — file, failure, what you tried. This is a self-check over this pass's own files, not a gate: it judges no other agent's work and adds no round.
