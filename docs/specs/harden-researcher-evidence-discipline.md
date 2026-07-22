# Harden the researcher's evidence discipline

- **Status**: Draft
- **Task**: harden-researcher-evidence-discipline
- **Last Updated**: 2026-07-22
- **Document Scope**: One unit of work: the problem, change, and observable behavior that proves it ships

---

## Goal

The `researcher` agent definition has no rule for telling a **broken retrieval tool** apart from a **genuine absence of evidence**, and no rule for **reading a source repository across time**. Both gaps have produced confidently wrong research repeatedly:

- A web-search tool returned an empty result array for every query across three engine overrides. An empty array is not an error, so agents read it as "no such thing exists" and shipped absence-based conclusions. In a later fan-out the same fault hit three of four agents; two ran a control query, got an empty array back, and correctly downgraded their conclusions — the third reported search-blocked gaps as findings.
- Two agents in that same fan-out independently rediscovered the same two search workarounds after roughly eight wasted calls each; a third found neither and reported gaps the other two had already routed around.
- A pass read a vendor's infrastructure template at `HEAD`, found no `wal_level` override, and dismissed dated user reports as "should work in theory". The reports were true: a commit had introduced a hardcoded `wal_level = replica` and a later commit removed it. Reading `HEAD` alone cannot see a defect that existed in the window the reports came from, and version-pinned images mean users keep running the pre-fix build long after the fix lands.

**The change**: revise `plugins/ca77y-engineering/agents/researcher.md` so the definition carries (a) a retrieval-fault rule with a control query, two fixed absence labels, and a named list of known-good fallbacks, and (b) a rule that reads a contradiction between a vendor's current source and dated practitioner reports as a timeline question rather than a credibility question.

**The value**: the failure modes are caught by the definition rather than by whichever agent instance happens to be careful. Because a fan-out's child agents are instances of this same definition, one edit covers the parent and every child.

### Non-goals

- **No version bump.** `plugins/ca77y-engineering/plugin.json` and `plugins/ca77y-engineering/.claude-plugin/plugin.json` stay untouched at `1.6.2`. A single bump lands later, once this PR and its two sibling PRs have all merged — three PRs in total. See *Coordination*.
- **No `README.md` or `docs/ARCHITECTURE.md` edit.** Both are shared surfaces two sibling stories are editing concurrently. `docs/ARCHITECTURE.md` is linked from the card as context to read (the self-improvement channel), not as a file to change. The README's `### researcher` section describes the seven workflow steps and stays factually correct after this change — it becomes *less complete*, not wrong. See *Coordination* for the follow-up this owes.
- **No edits to `agents/reviewer.md`, `agents/writer.md`, or `agents/auditor.md`** — sibling stories own those files right now.
- **No new agent, no manifest change, no tooling.** This is a prompt edit to one existing, already-whitelisted definition.
- **No edit outside this spec's stated surface.** That surface is exactly: the new `## Evidence discipline` section, the pointer line in workflow step 4, the child-return list in workflow step 3, the synthesis rule in workflow step 6, and the `## Output shape` items. Everything else in the file — the frontmatter, the `## How you reach the library` section and its library-crew contract, workflow steps 1, 2, 5, 7, 8, the existing `## Output shape` item ordering, `## Boundaries`, and `## Process feedback` — is left as it stands. *(Only the frontmatter and the boundary of the diff are checked by scenario; the rest of this preservation claim is untested by design and rests on the end-to-end coherence read.)*

## Design

### What this deliverable is

The deliverable is a **revised Markdown agent definition** — a prompt — not application code. This repo ships no application code and has no test suite: `plugins/ca77y-engineering/agents/*.md` *is* the product (see `docs/ARCHITECTURE.md`, "Repository shape"). Validation is therefore a **read-through of the revised definition against each acceptance criterion, one at a time**, plus a small set of mechanical scope checks. The Validation requirement below states that path explicitly so the `coder` runs it and the acceptance gate can rerun it.

### Placement in `researcher.md`

The current file is `Workflow` (8 numbered steps) → `Output shape` → `Boundaries` → `Process feedback`. The new rules are **cross-cutting discipline**, not a ninth step: they apply inside step 4 (the deep dive), inside step 3's fan-out, and to the report in step 8. Putting them in the numbered workflow would imply a sequence position they do not have.

So:

1. Add one new top-level section, **`## Evidence discipline`**, placed **after `## Workflow` and before `## Output shape`**, with two subsections — one for retrieval faults, one for reading a repository across time.
2. Add a one-line pointer from workflow step 4 to that section, so the rule is reachable at the point of use.
3. Extend `## Output shape` with the two reporting obligations (retrieval-fault status and fallback used; timeline resolution of a source-vs-reports contradiction), folding into the existing numbered list rather than appending a parallel list.

Keep the additions proportionate to the file's existing density — imperative one-liners in the voice of the surrounding text, not essays. *(Style guidance only; untested by design.)*

### Reconciling criterion 1 with criterion 2

Criterion 1 says an empty result is "never evidence of absence"; criterion 2 permits labelling a conclusion **"confirmed absent"**. These are not in conflict, and the definition must make the sequencing explicit or a reader will see a contradiction:

- An **unverified** empty result is never evidence of absence. That is criterion 1, and it governs the moment the empty result arrives.
- The **control query** is what converts the unverified empty result into evidence about the *tool*. Only after the control returns a healthy non-empty result may an absence conclusion drawn from that path be labelled `confirmed absent`. If the control also returns empty, the path is faulted and every absence conclusion drawn from it is `unretrieved, not absent`.

### One control query per path, not per query

The control query is scoped to the **search path** that produced the empty result — the same tool and the same engine override — because the observed fault was per-path (empty across `google`, `brave`, and `duckduckgo` overrides, each needing its own verdict). One control query per suspected-faulted path, not one per empty query, keeps the cost at one extra call per path while still covering the card's requirement. Once a path is proven faulted, re-querying it is waste: the definition must send the researcher to the named fallbacks instead. That is the mechanism by which criterion 3's list actually saves the ~8 wasted calls per agent the card records.

### Tool-agnostic — what that constrains, and what it does not

The card requires the rules be tool-agnostic: name the **failure signature** and the **required response**, never a specific MCP server's tool name or schema. Concretely:

- **Forbidden**: MCP tool identifiers (e.g. an `mcp__*` function name), a specific search tool's parameter names, its response-field names, or instructions that only parse against one server's schema. Write "the web search returns an empty result set" — not a named tool returning a named field.
- **Required, and not a violation**: the public HTTP endpoints of criterion 3. Naming `hn.algolia.com`, `lite.duckduckgo.com`, and `old.reddit.com` with their URL shapes is the *entire point* of that criterion — they must be read, not rediscovered. A vendor-hosted public URL is not an MCP tool schema. The `coder` must not over-apply the tool-agnostic rule and generalize these into a description.
- Engine names may appear as **examples of an override value** (`google`, `brave`, `duckduckgo`) when illustrating that a fault can be per-path; they must not be written as a required parameter of a named tool.

### Fan-out propagation (derived from the card's background, beyond its literal criteria)

The card's evidence is drawn from parallel fan-outs, and the `researcher` dispatches **children of its own definition**. Every rule here therefore reaches children automatically — but the *parent* owns the final synthesis and the single wiki write, so a child's labels and fallback notes are lost unless the parent is told to carry them. The definition must require that a child's absence labels and fallback report survive into the parent's synthesis unchanged, and that a parent never upgrades a child's `unretrieved, not absent` to `confirmed absent` without running its own control query on a healthy path. This is **R6** below — an addition beyond the five criteria, flagged here so the acceptance gate knows it is deliberate and not a misreading of the card.

### Risks

- **Bloat.** The file is 100 lines of dense imperative prose. An over-long addition dilutes the rest. Mitigated by the placement rule above and by keeping each rule to its failure signature plus response.
- **Over-generalization.** The tool-agnostic instruction, applied too literally, deletes the exact URLs criterion 3 requires. Mitigated by the explicit carve-out above and by R3's scenarios, which assert the literal endpoint strings.
- **Under-specified "confirmed absent".** A single working search proving a term absent is weaker evidence than the label sounds. The card fixes the two label strings, so the spec keeps them; the definition should state that `confirmed absent` means "retrieval was verified working and returned nothing", not "this does not exist".

### Boundary

**Files the `coder` may change**: `plugins/ca77y-engineering/agents/researcher.md` — and nothing else.

Explicitly out of bounds: both `plugins/ca77y-engineering/*plugin.json` manifests (no version bump), `README.md`, `docs/ARCHITECTURE.md`, `plugins/ca77y-engineering/agents/reviewer.md`, `agents/writer.md`, `agents/auditor.md`, and every other agent definition.

`docs/AGENTS_IMPROVEMENTS.md` is the one exception: any pipeline agent may append to it under its own standing process-feedback rule, append-only and duplicate-checked. It is not part of this task's diff and no requirement here depends on it.

Every scenario below is runnable inside this Boundary: each one is either a read of `researcher.md` itself, or a mechanical check over the working tree (`git diff --name-only`, `git status`, a JSON parse, a `grep`). No scenario needs a file the Boundary forbids touching.

### Coordination

- **`give-scribe-a-raw-note-only-mode` also edits `researcher.md`.** That card (Todo, not yet in flight) scopes changes to the researcher's *fan-out dispatch wording* in workflow step 5, so it can name the scribe's new raw-note-only mode. This spec touches a **new** section plus step 4's pointer line and the `Output shape` list, so the edits do not overlap textually — but if that story lands first, re-read step 5 before editing and rebase onto its wording rather than reverting it.
- **The version bump is shared with two sibling PRs.** Stories `give-reviewer-a-worktree-review-contract` (on `agents/reviewer.md`) and `generalize-audit-findings-to-the-property` (on `agents/writer.md` + `agents/auditor.md`) are in flight in their own worktrees. All three PRs — this one and those two — leave both manifests at `1.6.2`; one bump lands after all three merge. If a sibling has already bumped when this branch rebases, do not bump again — verify parity with the root `CLAUDE.md` check instead.
- **The README `### researcher` section update is owed, deferred deliberately.** `docs/CLAUDE.md` says the root `README.md` is the user-facing description of every agent and must be updated when an agent's behavior changes. This spec defers that because two sibling stories are editing the README concurrently and a three-way conflict on one shared file costs more than it buys. Follow-up: fold the evidence-discipline prose into the README's `### researcher — deep-dive research that grows the library` section in the same PR that carries the shared version bump. The `writer`'s docs pass on this task should raise it rather than silently skip it.

## Requirements

### Requirement: An empty search result is a suspected tool fault

The definition states that an empty web-search result set is a **suspected retrieval fault**, and is never on its own evidence that the thing searched for does not exist.

#### Scenario: The rule is stated in the definition

- **WHEN** `plugins/ca77y-engineering/agents/researcher.md` is read
- **THEN** it contains a rule stating that a web search returning an empty result set is treated as a suspected tool fault, and explicitly that it is never treated as evidence of absence

#### Scenario: Empty is distinguished from an error

- **WHEN** that rule is read
- **THEN** it states that an empty result is not an error signal — the call succeeds — which is precisely why the fault has to be actively suspected rather than waited for

#### Scenario: No absence conclusion is recorded from an unverified empty result

- **WHEN** that rule is read
- **THEN** it forbids recording, reporting, or passing to a parent any absence-based conclusion resting on an empty result that has not been checked by the control query of the next requirement

#### Scenario: The rule is reachable from the deep dive

- **WHEN** workflow step 4 (*Run the deep dive (agent-steered)*) is read
- **THEN** it carries a pointer to the `## Evidence discipline` section, so the rule is reachable at the point of use rather than only from the top of the file

### Requirement: A control query decides the absence label

On an empty result the researcher issues one control query whose term cannot legitimately return zero, and uses the outcome to label every absence-based conclusion.

#### Scenario: The control query is defined

- **WHEN** the definition is read
- **THEN** it instructs the researcher, on the first empty result from a search path, to issue **one** control query using a term that cannot legitimately return zero, and gives at least one concrete example term (such as `typescript`)

#### Scenario: The control runs on the same path that failed

- **WHEN** the control-query rule is read
- **THEN** it requires the control query to go through the same search path — same tool, same engine override — that produced the empty result, and states that the verdict applies to that path only

#### Scenario: The control also returns empty

- **WHEN** the definition describes a control query that itself returns an empty result set
- **THEN** it requires the path to be declared faulted, and **every** absence-based conclusion drawn from that path to be labelled `unretrieved, not absent`

#### Scenario: The control returns results

- **WHEN** the definition describes a control query that returns a healthy non-empty result set
- **THEN** it permits an absence-based conclusion from that path to be labelled `confirmed absent`, and defines that label as "retrieval was verified working and returned nothing" rather than "this does not exist"

#### Scenario: Every absence-based conclusion in the report carries exactly one label

- **WHEN** the definition is read
- **THEN** it requires each absence-based conclusion in the researcher's report to carry exactly one of the two literal labels `confirmed absent` or `unretrieved, not absent`, with no unlabelled third state

#### Scenario: One control per path, and a faulted path is abandoned

- **WHEN** the control-query rule is read
- **THEN** it scopes the control to one query per suspected-faulted path rather than one per empty query, and instructs the researcher to stop re-querying a path once it is proven faulted and switch to the named fallbacks

### Requirement: The known-good fallbacks are named in the definition

The fallbacks are written into the definition so they are read rather than rediscovered.

#### Scenario: The Hacker News endpoints are named

- **WHEN** the definition is read
- **THEN** it names the HN Algolia **search** endpoint `https://hn.algolia.com/api/v1/search?query=<q>&tags=story` for finding threads and the **item** endpoint `https://hn.algolia.com/api/v1/items/<objectID>` for whole comment trees, both fetched directly as JSON

#### Scenario: The DuckDuckGo lite endpoint is named

- **WHEN** the definition is read
- **THEN** it names `https://lite.duckduckgo.com/lite/?q=<query>` fetched **as a page** as a general search proxy, and records that the regular `duckduckgo.com/html` endpoint returns an anti-bot page

#### Scenario: The Reddit access route is named with its constraint

- **WHEN** the definition is read
- **THEN** it states that Reddit's `.json` API is 403-blocked, that `old.reddit.com` thread pages fetch fine, and that those pages are very token-expensive — so they are a deliberate last resort rather than a default

#### Scenario: The fallbacks are reached by rule, not by rediscovery

- **WHEN** the definition describes a search path proven faulted by its control query
- **THEN** it directs the researcher to the named fallback list as the next action, instead of leaving the recovery route to be worked out per run

### Requirement: The report names the fallback that was used

Whenever the primary search failed, the researcher reports which fallback it used.

#### Scenario: The reporting obligation is stated

- **WHEN** the definition is read
- **THEN** it requires the report to name which fallback was used whenever the primary search failed, so a reader can tell retrieved-by-fallback evidence from retrieved-by-search evidence

#### Scenario: The obligation is wired into the output shape

- **WHEN** the `## Output shape` section is read
- **THEN** it carries an item covering retrieval-fault status: which search paths were faulted, which fallbacks were used, and the resulting absence labels

#### Scenario: Every fallback failed too

- **WHEN** the definition describes a run where neither the primary search nor any listed fallback retrieved anything
- **THEN** it requires the report to say search was unavailable and name what was tried, and to label all affected conclusions `unretrieved, not absent` rather than reporting the gaps as findings

### Requirement: A source-versus-reports contradiction is read as a timeline question

When a vendor's current source contradicts dated practitioner failure reports, the researcher treats the disagreement as a timeline question, not a credibility question.

#### Scenario: The framing rule is stated

- **WHEN** the definition is read
- **THEN** it states that when a vendor's current source (repository `HEAD`, current docs, a current template) contradicts dated practitioner failure reports, the disagreement is first treated as a timeline question rather than a credibility question

#### Scenario: Commit history and blame are searched over the reports' window

- **WHEN** that rule is read
- **THEN** it requires searching the source repository's commit history and blame for the **specific parameter or symbol in dispute**, across the window the dated reports span — not only reading the current revision — and notes that `HEAD` cannot show a defect that existed and was later removed

#### Scenario: The deployed artifact's upgrade behavior is checked

- **WHEN** that rule is read
- **THEN** it requires checking whether the artifact the reporters actually run auto-upgrades or is version-pinned, because a pinned image keeps users on a pre-fix build long after the fix lands

#### Scenario: User error is a conclusion of last resort

- **WHEN** that rule is read
- **THEN** it forbids concluding user error, or dismissing the reports as unverified, until both the history search and the upgrade-behavior check have been done

#### Scenario: The history is inaccessible

- **WHEN** the definition describes commit history or blame that cannot be retrieved
- **THEN** it requires the contradiction to be reported as unresolved, with what was attempted, rather than resolved in the current source's favour

#### Scenario: The resolution reaches the report

- **WHEN** the `## Output shape` section is read
- **THEN** its contradictions item requires a source-versus-reports contradiction to be reported with its timeline resolution — the commit or window that explains it, or an explicit statement that the timeline could not be established

### Requirement: A child's evidence labels survive the parent's synthesis

*(Derived from the card's fan-out background; beyond its five literal criteria — see Design.)* A fan-out's children are instances of this same definition, and the parent owns the single synthesis.

#### Scenario: Children report their retrieval status upward

- **WHEN** workflow step 3 (*Decompose complex topics (fan-out)*) is read
- **THEN** its list of what a child `ca77y-engineering:researcher` returns includes that child's absence labels and its fallback-used note, alongside the synthesis, cited evidence, and raw-note paths it already lists

#### Scenario: The parent does not silently upgrade a label

- **WHEN** workflow step 6 (*Synthesize into a wiki entry*) is read
- **THEN** it forbids the parent from promoting a child's `unretrieved, not absent` to `confirmed absent` without running its own control query on a healthy path, and requires unresolved ones to surface in the parent's report

### Requirement: The change stays inside its boundary and stays tool-agnostic

#### Scenario: Only the researcher definition changed

- **WHEN** `git status --porcelain` and `git diff --name-only` are run in the worktree after the build
- **THEN** the only modified tracked file is `plugins/ca77y-engineering/agents/researcher.md` (plus, if present, an appended `docs/AGENTS_IMPROVEMENTS.md` entry and this spec file)

#### Scenario: No version bump

- **WHEN** `plugins/ca77y-engineering/plugin.json` and `plugins/ca77y-engineering/.claude-plugin/plugin.json` are read
- **THEN** both still parse as JSON, both still carry `"version": "1.6.2"`, and the Claude manifest's `agents` array still lists `./agents/researcher.md`

#### Scenario: The frontmatter contract is intact

- **WHEN** the revised `researcher.md` frontmatter is read
- **THEN** `name: researcher`, `model: sonnet`, and `effort: high` are unchanged, and the `description` field is either unchanged or edited only to describe the same agent

#### Scenario: No MCP tool identifier or schema leaks in

- **WHEN** the diff of `researcher.md` is searched for MCP tool identifiers (`mcp__`), named tool functions, and named request/response schema fields
- **THEN** none are present — the new rules name the failure signature ("the search returns an empty result set") and the response, while the public HTTP endpoints required by the fallback requirement remain written out in full

### Requirement: Validation is a criterion-by-criterion read-through

This repo has no test suite and ships no executable code, so validation is a documented read, not a test run. The `coder` performs it before reporting built, and the acceptance gate can rerun it unchanged.

#### Scenario: Each acceptance criterion is checked on its own

- **WHEN** the build is complete
- **THEN** the revised `plugins/ca77y-engineering/agents/researcher.md` is read once per acceptance criterion — five reads, one criterion at a time — and each read records the specific lines that satisfy that criterion, or names the gap

#### Scenario: The derived fan-out requirement is checked too

- **WHEN** the five criterion reads are complete
- **THEN** a sixth read checks the fan-out propagation requirement (R6) — that workflow step 3 lists the child's absence labels and fallback note among what a child returns, and that workflow step 6 forbids the parent upgrading a child's label without its own control query — recording the lines that satisfy it or naming the gap, since R6 is this spec's own addition and no card criterion would catch its absence

#### Scenario: The literal strings are checked mechanically

- **WHEN** the revised file is searched for `hn.algolia.com/api/v1/search`, `hn.algolia.com/api/v1/items`, `lite.duckduckgo.com/lite`, `old.reddit.com`, `confirmed absent`, and `unretrieved, not absent`
- **THEN** every one of those strings is present, and both label strings additionally appear inside the workflow's fan-out and synthesis steps, not only inside the `## Evidence discipline` section

#### Scenario: The boundary checks are run

- **WHEN** validation runs
- **THEN** it includes the working-tree scope check, the two-manifest JSON parse and `1.6.2` version check, the frontmatter check, and the MCP-identifier search from the boundary requirement above, with each result recorded

#### Scenario: The definition still reads as one coherent document

- **WHEN** the revised file is read end to end in one pass
- **THEN** the new section does not contradict, duplicate, or orphan any existing instruction — in particular the existing step 5 rule on recording unretrievable leads (the `> [!warning] Rejected sources` callout) and the new fallback rules are reconciled rather than stated twice in different words

## Tasks

- [ ] Re-read `plugins/ca77y-engineering/agents/researcher.md` end to end and the card's five acceptance criteria before editing.
- [ ] Add the `## Evidence discipline` section between `## Workflow` and `## Output shape`.
- [ ] Write the retrieval-fault subsection: empty result is a suspected tool fault and never evidence of absence; one control query per faulted path on the same path, with an example term; the two label outcomes and their definitions; abandon a proven-faulted path.
- [ ] Write the named-fallback list into that subsection: HN Algolia search and item endpoints, the DuckDuckGo `lite` endpoint fetched as a page (with `duckduckgo.com/html` noted as anti-bot), `old.reddit.com` thread pages with the `.json` API noted as 403-blocked and the pages noted as token-expensive.
- [ ] Write the repository-across-time subsection: timeline before credibility; commit history and blame for the disputed parameter over the reports' window; auto-upgrade versus version-pinned check; user error only after both; unresolved when history is inaccessible.
- [ ] Add the one-line pointer from workflow step 4 to the new section.
- [ ] Add the fan-out propagation rules to workflow steps 3 and 6 (children return labels and fallback notes; the parent does not upgrade a label without its own control query).
- [ ] Extend `## Output shape` with the retrieval-fault/fallback item and the timeline resolution of contradictions, reconciled with existing items 5 and 7 rather than appended as duplicates.
- [ ] Reconcile the new fallback rules with the existing step 5 "leads found but not retrieved" rule so the two do not restate each other.
- [ ] Run the validation read-through: five criterion-by-criterion reads plus the sixth read for R6 (fan-out propagation), the literal-string search, the working-tree scope check, the two-manifest parse and version check, the frontmatter check, the MCP-identifier search, and one end-to-end coherence read.
- [ ] Report the validation results, including which lines satisfy each of the five criteria and which satisfy R6.
- [ ] Flag the deferred README follow-up in the report handed back with the built work — the `### researcher — deep-dive research that grows the library` section owes evidence-discipline prose in the shared version-bump PR — so the `lead` carries it into the PR description and the `writer`'s docs pass raises it rather than silently skipping it.
