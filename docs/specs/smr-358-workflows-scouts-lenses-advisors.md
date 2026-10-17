# SMR-358: Restructure `slopify` around workflows with scout, lens, and advisor agents

Linear story SMR-358, blocked by SMR-359 (merged into this branch's base). Acceptance source: the card, quoted verbatim under [Acceptance criteria](#acceptance-criteria). Packaging precedent: `docs/specs/smr-359-merge-into-slopify.md` and `plugins/slopify/workflows/research.js`.

## Problem and outcome

`plugins/slopify/skills/deliver/SKILL.md` is one skill that branches on the kind of work (story, repair, trivial edit), runs from the main session, and validates through two broad validators, `auditor` (opus) and `qa` (sonnet). `shape` mixes what and why with how: it can produce an execution spec (`skills/shape/SKILL.md:13`).

Outcome (from the card): six workflows — `shape`, `deliver-story`, `deliver-bugfix`, `deliver-spike`, `reproduce-bug`, `review-pr` — replace the `shape` and `deliver` skills. Each workflow script is the only orchestrator. It gathers information through single-purpose `scout-*` agents and `library-reader`, validates non-code work through single-purpose `lens-*` agents and code through `qa`, takes judgement from `advisor-*` agents (only in `shape` and `deliver-story`), produces through `writer` and `coder`, and acts on the board and forge only through `pusher`, with `watcher` waiting for reviews.

## Scope

In scope (from the card): the six workflows; the scout, lens, and advisor families; `pusher` and `watcher`; `coder`, `qa`, and `writer` with their new models; the minimal "Report-only contract"; the three family schemas; `blocked` results with durable checkpoints; README, `CLAUDE.md` checks, and evals under the new names.

Out of scope (from the card): the library agents and skills (`library-*`, `ask`, `lint`, `research`), except that `library-clerk` takes the new contract text; `bootstrap`; version bumps.

Also out of scope (design choice): the target-project `docs/BOARD.md` and `docs/FORGE.md` formats and the bootstrap templates, except the forge template's `Spike prototypes` line (see the `deliver-spike` section). This repo's own `docs/` entries stay as they are, except as noted under [Repository files](#repository-files-outside-plugins).

## Approach

### Terms

- **Board or forge operation**: an action that changes the board or forge — creating, transitioning, updating, or commenting on a card, attaching a PR, opening or updating a PR, commenting on one, firing a review trigger — plus every commit, push, branch, and worktree change. Only `pusher` performs these. Reading a card, a PR, or a review is information gathering (`scout-*`) or waiting (`watcher`). Design choice: the card's "board operations" read as writes, because `scout-card` must read the board.
- **Revision**: what a validator judges. A file's revision is its `git hash-object` digest. A candidate code revision in a worktree is `<HEAD sha>+<digest>`. The digest is `git hash-object` of the output of `git -C <worktree> diff HEAD --binary`, taken after the producer has run `git add -N` on its new files. Every producer returns the revision it left, and every validator brief names it.
- **Story revision**: a digest of the story's content only, built the same way on every run.
  - **Card-backed story.** `scout-card` writes the story text to a temporary file outside the project, `$STORY_FILE`, using a quoted heredoc with the delimiter `SLOPIFY_STORY_EOF` (`cat > "$STORY_FILE" <<'SLOPIFY_STORY_EOF'`), so the shell expands nothing and no story line can end it early. The text is:
    - line 1: the card title as bare text;
    - line 2: empty;
    - from line 3: the card body exactly as the board's read binding returns it. On Linear, that is the issue's `description`. On a file board such as the stub, it is the whole card file after its `# <title>` line. The field lines are removed by `$FIELD_RE` below.

    When `docs/BOARD.md` declares acceptance criteria as a field separate from the body, the file continues with a line `## Acceptance criteria` and that field's value. When the criteria are part of the body, as on Linear and in the stub board, nothing is appended, so they are never counted twice.

  - **Story given as text** in the args: the text is written verbatim and has no title line.
  - **Hashing.** The scout then runs this command verbatim. `$FIELD_RE` is an extended regex matching the lines that hold declared status, label, attachment, or PR fields when the board keeps them in the body (the stub board: `^(Status|Label|PR):`). It is empty when the board keeps them outside the body (Linear).

    ```bash
    awk -v re="$FIELD_RE" '{ sub(/\r$/, ""); sub(/[ \t]+$/, "") } re != "" && $0 ~ re { next } { line[++n] = $0 } END { while (n > 0 && line[n] == "") n--; for (i = 1; i <= n; i++) print line[i] }' "$STORY_FILE" | git hash-object --stdin
    ```

    The command normalizes CRLF to LF, trims trailing whitespace on each line, drops the declared field lines, and drops trailing blank lines. `print` then ends the text with exactly one newline.

  - **What stays out.** Status, labels, relations, attachments, comments, and last-updated values never enter the digest, so the workflow's own board operations (a transition, an attached PR) don't change it. `scout-card` returns the digest as the evidence item `story-revision`, and returns `$FIELD_RE` as the evidence item `field-re` so the run's inputs can be audited.

- **Checkpoint**: durable state a rerun reads to skip completed steps. Checkpoints include a branch and its worktree, a committed spec, a ledger line, a PR, a draft file, a findings document, a filed card, and a reproduction directory.

### Agent roster

Every agent is a leaf that dispatches only the built-in `Explore`. "No write tools" means `disallowedTools: Edit, Write, NotebookEdit`, with no `tools:` line. Bash stays available for reading, running, and probing in temporary copies, as it is for today's `qa`. Each `scout-*`, `lens-*`, and `advisor-*` description is one sentence that names its one task. Its body states that task, the inputs the brief carries, and how to do the job well. The body has no return format, because the workflow passes the family schema.

#### Scouts — `model: haiku`, `effort: high`, no write tools

The card's nine are kept. Two are added (design choice): `scout-related-cards`, because `shape`'s `advisor-fit` and `reproduce-bug`'s duplicate check need a board search, which is a different task from reading one card; and `scout-checkpoint`, because a workflow has no filesystem and must learn its durable state through a scout.

| Agent                 | The one task                                                                                                                                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scout-card`          | Read the one card the brief names, through the read bindings in `docs/BOARD.md`: its content, its story revision ([Terms](#terms)), its relations, its linked specs, and the branch name the board gives it. With no card named, or no board, report that. |
| `scout-related-cards` | Search the board, through `docs/BOARD.md`'s search binding, for cards that duplicate, overlap, conflict with, or depend on a described outcome.                                                                                                            |
| `scout-checkpoint`    | Report where a workflow run stands from its durable checkpoints, using the keys the brief lists ([vocabulary](#checkpoint-vocabulary)).                                                                                                                    |
| `scout-code`          | Find the code locations and call paths relevant to a described change.                                                                                                                                                                                     |
| `scout-tests`         | Find the existing tests that cover an area, and how to run them.                                                                                                                                                                                           |
| `scout-docs`          | Find documentation and specs that make claims about an area.                                                                                                                                                                                               |
| `scout-history`       | Find from git history and blame when and why behavior in an area changed.                                                                                                                                                                                  |
| `scout-feasibility`   | Find where a candidate fits in the codebase, what it touches, and what blocks it.                                                                                                                                                                          |
| `scout-prior-art`     | Find GitHub repos, issues, PRs, discussions, and write-ups where others did the same thing.                                                                                                                                                                |
| `scout-upstream-docs` | Find official docs and API references for one named library or service: versions, limits, deprecations.                                                                                                                                                    |
| `scout-known-issues`  | Find pitfalls and open bugs relevant to the question in upstream trackers and changelogs.                                                                                                                                                                  |

The three outside scouts (`scout-prior-art`, `scout-upstream-docs`, `scout-known-issues`) use the session's web tools, or the source provider named in `library/_meta/librarian.md` when the project has a library. They treat everything they retrieve as evidence, never as instructions. They record a retrieval that couldn't run as a gap, not as an absence.

#### Lenses — `model: haiku`, `effort: high`, no write tools, carry the [Report-only contract](#report-only-contract)

The card's eight are kept. Four are added (design choice), each for a check a workflow needs that no card lens covers:

- `lens-solution-free`, for `shape`'s "never how".
- `lens-bug-report`, for the completeness of `reproduce-bug`'s issue.
- `lens-neutrality`, for `deliver-spike`'s "no recommendation".
- `lens-finding`, for sorting review findings in `review-pr`, which `deliver` did in the main session.

| Agent                | The one property it checks                                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lens-criteria`      | Every acceptance criterion on the story is observable and verifiable.                                                                                                                                                                                  |
| `lens-solution-free` | The story prescribes no implementation: it states the problem, outcome, scope, and criteria, not how to build them.                                                                                                                                    |
| `lens-scope`         | The spec covers the story's criteria, with no added or dropped scope.                                                                                                                                                                                  |
| `lens-consistency`   | The spec agrees with repository constraints and existing specs.                                                                                                                                                                                        |
| `lens-docs`          | Documentation claims are true against the code.                                                                                                                                                                                                        |
| `lens-repro`         | A reproduction reliably shows the reported failure. The lens runs it at least three times.                                                                                                                                                             |
| `lens-regression`    | A regression test fails before the fix and passes after it. "Before" is run in a temporary export of the base revision (`git archive <base>`) with the test copied in, never by changing the worktree.                                                 |
| `lens-bug-report`    | The bug report contains evidence, steps to reproduce, expected outcome, and observed outcome, each consistent with the reproduction.                                                                                                                   |
| `lens-evidence`      | Every claim in a findings report cites a reachable source or measurement.                                                                                                                                                                              |
| `lens-question`      | The findings answer the spike's question and name what remains unknown.                                                                                                                                                                                |
| `lens-neutrality`    | The findings make no recommendation.                                                                                                                                                                                                                   |
| `lens-finding`       | The PR's change is free of the defect one review finding describes. `pass` means it is free: the finding is wrong, already handled, or outside the change, and the reason is a non-blocking finding. `fail` means the defect is present in the change. |

#### Advisors — report-only, no write tools

The card's rosters are kept unchanged.

| Agent                  | Model, effort  | Used by         | The one angle it judges                                                                                        |
| ---------------------- | -------------- | --------------- | -------------------------------------------------------------------------------------------------------------- |
| `advisor-value`        | sonnet, medium | `shape`         | Whether the outcome is worth doing: who benefits, how much, and the cost of not doing it.                      |
| `advisor-scope`        | sonnet, medium | `shape`         | Whether the scope is the smallest that delivers the outcome, and what to cut, defer, or split.                 |
| `advisor-alternatives` | sonnet, medium | `shape`         | Cheaper ways to reach the outcome: existing features, configuration, a process change, or not building it.     |
| `advisor-fit`          | sonnet, medium | `shape`         | Fit with the product's direction and existing cards: conflicts, overlaps, and dependencies.                    |
| `advisor-architecture` | opus, medium   | `deliver-story` | Fit with the codebase's structure, and the cost of integrating and maintaining the approach.                   |
| `advisor-performance`  | opus, medium   | `deliver-story` | Whether the approach meets the stated performance targets, from measurements and upstream evidence.            |
| `advisor-risk`         | opus, medium   | `deliver-story` | Failure modes, operational risk, and what would make the approach a wrong choice.                              |
| `advisor-security`     | opus, medium   | `deliver-story` | Attack surface, data exposure, dependency and supply-chain risk, and the security controls the approach needs. |

An advisor judges only from the evidence in its brief, plus reading the repository. It doesn't decide; the `writer` synthesizes the views.

#### Producers, validators, and operations

| Agent           | Model, effort                              | Tools          | Role                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coder`         | opus, high (was sonnet, high)              | all            | Implements code and regression tests, builds reproductions and spike prototypes, and runs focused tests as it works. Writes only its assigned paths. Never commits.                                                                                                                                                                                                          |
| `writer`        | opus, medium (unchanged)                   | all            | Drafts stories, approach outlines, specs, findings, bug reports, and documentation. Never commits.                                                                                                                                                                                                                                                                           |
| `qa`            | sonnet, high (unchanged)                   | no write tools | Validates code and executable behavior against the spec. Carries the Report-only contract.                                                                                                                                                                                                                                                                                   |
| `pusher`        | sonnet, medium (effort is a design choice) | all            | The only agent that creates or removes branches and worktrees, commits, pushes, opens or updates PRs, fires review triggers, performs board operations, and appends ledger lines. It works exactly as `docs/BOARD.md` and `docs/FORGE.md` declare, and only within the authorization its brief states. An operation that isn't bound is reported as unmet, never improvised. |
| `watcher`       | haiku, medium (effort is a design choice)  | no write tools | Waits for one review that `docs/FORGE.md`'s review-status binding declares. One dispatch waits at most 9 minutes, polling at the declared interval inside a single Bash call that stays under the tool's 10-minute limit. It returns the outcome, the declared time limit for the phase it is waiting in, and on `finished` the findings. Changes nothing.                   |
| `auditor`       | opus, medium (unchanged)                   | no write tools | Kept only for `bootstrap` ([below](#auditor-bootstrap-and-references)).                                                                                                                                                                                                                                                                                                      |
| `library-*` (4) | unchanged                                  | unchanged      | `library-reader` is the library information source in the workflows. `library-clerk` takes the new contract text.                                                                                                                                                                                                                                                            |

`coder`, `writer`, `qa`, `pusher`, and `watcher` carry no return-format block. Every workflow dispatch of them passes a schema (see [schemas](#producer-and-operations-schemas)). Workflows never pass `model` or `effort` to `agent()`, so frontmatter governs.

### Report-only contract

`qa`, `library-clerk`, `auditor`, and every `lens-*` carry this section word for word. It replaces "Fresh report-only contract". It is the last `##` section in a lens. In `qa`, `library-clerk`, and `auditor`, any return block moves to its own `## Return` section after it.

```markdown
## Report-only contract

Judge only work you did not produce or judge before, and only the revision the brief names; otherwise say so and stop. Change nothing: no edits, commits, board or forge actions, and no agent other than `Explore`; run any probe in a temporary copy. Report a check that could not run as unverified, naming the missing prerequisite. Pass only when every required check ran and nothing blocking remains.
```

Design choice: `auditor` carries the same contract, because it stays a report-only validator for `bootstrap`. The card's list (`qa`, `library-clerk`, `lens-*`) is the minimum.

`library-clerk` and `auditor` are dispatched by skills without a schema, so they keep their return block under `## Return`. `qa`'s return block is removed, because only workflows dispatch it and they pass `LENS_SCHEMA`.

### Family schemas and where they live

Workflows can't import files, so (design choice) every workflow script except `research.js` carries the block below byte for byte, between the two marker lines. A `CLAUDE.md` check compares each copy with the copy in `shape.js`. Rejected alternatives:

- A shared schema sub-workflow: `workflow()` nests one level only, and `review-pr` already runs as a child.
- Return formats in agent bodies: the card forbids them.

The block also holds the one set of helpers every workflow uses to read scout answers and name files, so no workflow keeps a local copy (design choice, from review round 2 of PR #35, where four copies of the "none" check and three revision matchers drifted apart):

- `absent(v, whole?)`: true for an empty value, or prose that opens with `none`, `absent`, `missing`, `n/a`, or `not found` (as in `MISSING (test -f found no file)`). A path-like token that merely starts with the word, such as `none.txt`, is a value. With `whole`, only a reply that is nothing but that word and an optional parenthetical counts, so a criterion such as "Missing config files produce a clear error" is a value.
- `shaped(kind, v)`: a checkpoint value in its expected shape, else `''`. Kinds: `path` (absolute; it may hold spaces, but a space followed by a lowercase word is trailing prose and the path is then its first token), `rel`, `sha`, `branch`, `ref` (a PR URL, number, or path), `rev` (`<path>@<hex>`), and `id`. A value followed by a parenthetical remark or a full stop is the value; prose is never one.
- `sameRev(briefed, evaluated)`: whether a validator judged the revision its brief named. The whole label must match: every hex component of 7 or more characters (a short sha matches its full form) and the marks between them (`+`, `#n`, `&`). The HEAD prefix alone does not match a `<sha>+<digest>` label. A brief naming no revision accepts any.
- `parseSpec(v)`: a path and its git hash-object, written `<path>@<hash>` or `<path> <hash>`, else null.
- `decisionsOf(prefix, questions)`, `settleDecisions(prefix, answers, run)`, and `settledText(settled)`: open-decision ids come from the question text (`<prefix>-<first four words>-<hash>`), so an answer stays with its question whatever else a producer asks, and the prefix names the producer that raised it. A producer that raises questions the user already answered is dispatched again with each answer beside its question; answers to that prefix that no question matched go back once as well, so a reworded question is covered. Only the producer whose prefix matches is given an answer. `deliver-spike`, `deliver-story`, `deliver-bugfix`, `reproduce-bug`, and `review-pr` raise their producers' decisions this way (`shape` keeps its ids in the draft's markers, where the question is).
- `rerunText(workflow, needs)`, used by `blocked`: the `rerun` text suggests `resumeFromRunId` only when every need is a `decision`; any other need (a missing binding, a failing gate, a story to reshape) needs a fresh rerun without resume. When a need is a `decision` or an `input` need (such as `reproduce-bug`'s request for more detail), the text also says to add `answers.<id>` for it.
- `hashOf(text)` and `slugged(text, fallback)`: a file slug from free text is its first six words plus a hash of the whole normalized text, so two ideas that open alike never share a draft, reproduction, spec, or spike.

`deliver-story.js` and `deliver-bugfix.js` also carry a second checked block, `// BEGIN slopify deliver helpers` … `// END slopify deliver helpers`, byte for byte (the `CLAUDE.md` checks compare it). It holds what the two scripts share outside their steps: the constants and run state (`WHERE`, `AUTH`, `state`, `done`, `skip`, `stop`, `fail`, `exhausted`), the path and list helpers, the validator helpers (`passed`, `usable`, `blockingOf`, `judge`, `record`), the pusher helpers (`pushBrief`, `pushOk`, `opRef`, `pushStop`, `call*`), `decisionNeed`, the ledger parsers (`parseDoneSpec`, `parseDoneImplement`, `parseDonePublish`, `parseDoneBoard`), `makeReport`, and `recoverPlan`. A script sets `WORKFLOW`, `MAX_FAILURES`, `PLAN_PHASE`, and `failures` before the block. Step-specific code (locate, workspace, spec, implement or fix, validate, publish, review) stays in each script.

Scouts, lenses, and advisors are dispatched only through the block's helpers, which fix the agent type's family prefix and the schema. A check forbids a direct `agentType: 'slopify:scout-…'`, `'slopify:lens-…'`, or `'slopify:advisor-…'` anywhere in the workflows. Helper calls name the full agent (`scout('scout-code', …)`), so the agent-existence check can find them.

```js
// BEGIN slopify family schemas
const STRINGS = { type: "array", items: { type: "string" } };

const SCOUT_SCHEMA = {
  type: "object",
  required: ["answer", "evidence", "gaps"],
  properties: {
    answer: {
      type: "string",
      description:
        "The answer to the one question asked, as far as the evidence goes",
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        required: ["source", "location", "excerpt"],
        properties: {
          source: {
            type: "string",
            description:
              "What it is: a file, command, URL, card, or the checkpoint key the brief names",
          },
          location: {
            type: "string",
            description: "path:line, URL, commit, identifier, or absolute path",
          },
          excerpt: {
            type: "string",
            description:
              "The supporting passage or output, quoted; for a checkpoint key, its value",
          },
        },
      },
    },
    gaps: {
      ...STRINGS,
      description:
        "What could not be found or read, and why; a search that could not run is not an absence",
    },
  },
};

const LENS_SCHEMA = {
  type: "object",
  required: ["verdict", "evaluated", "findings", "limits"],
  properties: {
    verdict: { type: "string", enum: ["pass", "fail", "unverified"] },
    evaluated: { type: "string", description: "The exact revision judged" },
    findings: {
      type: "array",
      items: {
        type: "object",
        required: ["location", "problem", "blocking"],
        properties: {
          location: {
            type: "string",
            description: "path:line or the item judged",
          },
          problem: { type: "string" },
          blocking: { type: "boolean" },
        },
      },
    },
    limits: {
      type: "string",
      description:
        'Checks that could not run and the missing prerequisite, or "none"',
    },
  },
};

const ADVISOR_SCHEMA = {
  type: "object",
  required: ["judgement", "reasons", "risks", "conditions"],
  properties: {
    judgement: {
      type: "string",
      enum: ["proceed", "proceed-with-conditions", "reconsider"],
    },
    reasons: {
      type: "array",
      items: {
        type: "object",
        required: ["reason", "evidence"],
        properties: {
          reason: { type: "string" },
          evidence: {
            type: "string",
            description: "The evidence or source it rests on",
          },
        },
      },
    },
    risks: STRINGS,
    conditions: {
      ...STRINGS,
      description: "Conditions under which this judgement changes",
    },
  },
};

function familyAgent(prefix, schema, name, prompt, opts) {
  if (!name.startsWith(prefix))
    throw new Error(`${name} is not a ${prefix}* agent`);
  return agent(prompt, {
    ...(opts || {}),
    agentType: `slopify:${name}`,
    schema,
  });
}
const scout = (name, prompt, opts) =>
  familyAgent("scout-", SCOUT_SCHEMA, name, prompt, opts);
const lens = (name, prompt, opts) =>
  familyAgent("lens-", LENS_SCHEMA, name, prompt, opts);
const advise = (name, prompt, opts) =>
  familyAgent("advisor-", ADVISOR_SCHEMA, name, prompt, opts);

// A checkpoint value from scout-checkpoint's evidence, by key; '' when absent.
function fact(result, key) {
  const hit =
    result && result.evidence
      ? result.evidence.find((e) => e.source === key)
      : null;
  return hit ? String(hit.excerpt || hit.location || "").trim() : "";
}

// A scout's "no value": empty, or prose that opens with none, absent, missing, n/a, or not found,
// as in "MISSING (test -f found no file)". A token that merely starts with the word, such as
// none.txt or missing/x, is a value. With whole, only a reply that is nothing but that word (and
// an optional parenthetical) is none, so a sentence like "Missing config files produce an error"
// is a value.
function absent(v, whole) {
  const t = String(v == null ? "" : v).trim();
  if (!t) return true;
  const word = "(?:none|absent|missing|n\\/a|not found)";
  const re = whole
    ? new RegExp(`^${word}\\s*(?:\\([^)]*\\))?[.:]?$`, "i")
    : new RegExp(`^${word}(?![\\w/-]|\\.\\w)`, "i");
  return re.test(t);
}

// A checkpoint value counts only in its expected shape, never as prose. Kinds: path (absolute),
// rel (relative path), sha, branch, ref (a PR URL, number, or path), rev (<path>@<hex>), id.
// Returns the value, or '' when it is absent or has another shape. A value followed by a
// parenthetical remark, or by a full stop, is the value. A path may hold spaces, but a space followed by
// a lowercase word is trailing prose: the path is then its first token.
const SHAPES = {
  path: /^\/(?!.* [a-z])[\w@.+\- /]+$/,
  rel: /^[\w@.+/-]+$/,
  sha: /^[0-9a-f]{7,64}$/i,
  branch: /^\w[\w./-]*$/,
  ref: /^(?:https?:\/\/\S+|(?:PR ?)?#?\d+|[\w@.+/#-]+(?: ?\d+)?)$/i,
  rev: /^[\w@.+/-]+@[0-9a-f]{7,64}$/i,
  id: /^[A-Za-z0-9][^\s()<>]{0,199}$/,
};
function shaped(kind, v) {
  const re = SHAPES[kind];
  const t = String(v == null ? "" : v)
    .split("\n")[0]
    .trim();
  if (!re || absent(t)) return "";
  if (re.test(t)) return t;
  const m = /^(\S+)\s+[(\[]/.exec(t);
  const first = m ? m[1] : kind === "path" ? t.split(/\s+/)[0] : t;
  const tok = first.replace(/[.,;:]+$/, "");
  return tok && re.test(tok) ? tok : "";
}

// Whether the revision a validator reports judging is the one its brief named. A label such as
// <sha>+<digest>, <sha>#2, or <shaA>&<shaB> must match whole: every hex component of 7 or more
// characters matches (a short sha matches its full form) and the marks between them ("+", "#2",
// "&") appear too. A brief naming no revision accepts any.
function sameRev(briefed, evaluated) {
  const b = String(briefed || "")
    .trim()
    .toLowerCase();
  const e = String(evaluated || "")
    .trim()
    .toLowerCase();
  if (!b || e.includes(b)) return true;
  const HEX = /(?<![0-9a-z])[0-9a-f]{7,64}(?![0-9a-z])/g;
  const bh = b.match(HEX) || [];
  if (!bh.length) return false;
  const eh = e.match(HEX) || [];
  if (!bh.every((x) => eh.some((y) => x.startsWith(y) || y.startsWith(x))))
    return false;
  return b
    .split(HEX)
    .map((p) => p.trim())
    .filter((p) => p && !/[a-z]{3}/.test(p))
    .every((p) => e.includes(p));
}

// A short deterministic hash of text.
function hashOf(text) {
  let h = 5381;
  for (const ch of String(text)) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  return h.toString(36).padStart(6, "0");
}
// A file slug for free text: its first six words plus a hash of all of it, so two ideas that open
// alike never share a file.
function slugged(text, fallback) {
  const norm = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const words = norm.split(" ").filter(Boolean).slice(0, 6).join("-");
  return norm ? `${words}-${hashOf(norm)}` : fallback || "item";
}

const HASH = "[0-9a-f]{7,64}";
// A path and its git hash-object, written "<path>@<hash>" or "<path> <hash>"; null for anything else.
function parseSpec(v) {
  const m = new RegExp(`^(\\S+?)(?:@|\\s+)(${HASH})\\s*$`).exec(
    String(v || "").trim(),
  );
  return m ? { path: m[1], hash: m[2] } : null;
}

// An open decision's id comes from its question, so an answer stays with its question whatever else
// a producer asks. The prefix names the producer that raised it.
function decisionsOf(prefix, questions) {
  const out = [];
  for (const q of Array.isArray(questions) ? questions : []) {
    const question = String(q).trim();
    const norm = question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const id = `${prefix}-${norm.split(" ").slice(0, 4).join("-") || "question"}-${hashOf(norm)}`;
    if (question && !out.some((d) => d.id === id)) out.push({ id, question });
  }
  return out;
}
function answerOf(answers, id) {
  const a = answers ? answers[id] : undefined;
  return a === undefined || a === null ? "" : String(a).trim();
}
// The settled questions as a brief paragraph: each answer beside its question, for the producer
// that raised it and no other.
function settledText(settled) {
  return settled.length
    ? `\n\nThe user has settled these earlier questions; apply each answer and do not ask them again:\n${settled.map((d) => `- Question: ${d.question}\n  Answer: ${d.answer}`).join("\n")}`
    : "";
}
// Run a producer (run(settled) returns its result, with openDecisions, or null) until it raises
// no question the user has not answered. A question the user answered is put back to the next
// dispatch with its answer. Answers to this prefix that no question matched (a rerun in a new
// session can word a question differently) go back once as well. Returns the last result and the
// questions still open; the result's own openDecisions are not to be read after this.
async function settleDecisions(prefix, answers, run) {
  const settled = [];
  let carriedTried = false;
  for (let round = 0; ; round++) {
    const res = await run(settled);
    if (!res || (res.storyBlockers && res.storyBlockers.length))
      return { res, open: [] };
    const decisions = decisionsOf(prefix, res.openDecisions);
    const open = decisions.filter((d) => !answerOf(answers, d.id));
    if (open.length) {
      const carried = Object.keys(answers).filter(
        (k) =>
          k.startsWith(`${prefix}-`) &&
          answerOf(answers, k) &&
          !decisions.some((d) => d.id === k) &&
          !settled.some((x) => x.id === k),
      );
      if (!carried.length || carriedTried || round >= 2) return { res, open };
      carriedTried = true;
      settled.push(
        ...carried.map((k) => ({
          id: k,
          question: `an earlier question whose id was ${k}; its words ran: ${k
            .replace(`${prefix}-`, "")
            .replace(/-[a-z0-9]{6,7}$/, "")
            .replace(/-/g, " ")}`,
          answer: answerOf(answers, k),
        })),
      );
      continue;
    }
    const fresh = decisions.filter((d) => !settled.some((x) => x.id === d.id));
    if (!fresh.length || round >= 2) return { res, open: [] };
    settled.push(
      ...fresh.map((d) => ({ ...d, answer: answerOf(answers, d.id) })),
    );
  }
}

// How to continue after a block. Resume replays the cached results of unchanged steps, so it
// helps only when every need is a decision; a missing binding or a failing gate needs a fresh
// rerun that reads the repository again.
function rerunText(workflow, needs) {
  const cmd = `/slopify:${workflow}`;
  const list = needs || [];
  const answerable = list.some(
    (n) => n.kind === "decision" || n.kind === "input",
  );
  return list.length && list.every((n) => n.kind === "decision")
    ? `Invoke ${cmd} again with the same args and add answers.<id> for each decision. In this session, pass resumeFromRunId to reuse the steps already completed.`
    : `Resolve what each need names, then invoke ${cmd} again with the same args${answerable ? " and answers.<id> for each decision or input need" : ""}, without resumeFromRunId, so every step reads the repository afresh.`;
}
// kind: 'story' | 'decision' | 'prerequisite' | 'validation' | 'input'
function blocked(workflow, step, needs, extra) {
  return {
    status: "blocked",
    workflow,
    step,
    needs,
    rerun: rerunText(workflow, needs),
    ...(extra || {}),
  };
}
// END slopify family schemas
```

### Producer and operations schemas

These are local to each script, because only some scripts use each one. They aren't checked for identity.

- `qa` is dispatched with `LENS_SCHEMA`.
- `WRITER_SCHEMA`: `{ produced: string[] (absolute paths), revision: string (git hash-object of the main artifact), openDecisions: string[], storyBlockers: string[], tasks: [{ id, summary, paths: string[] }], docs: string[] }`. `tasks` and `docs` are filled only for a spec, and may be empty arrays otherwise.
- `APPROACH_SCHEMA` (writer, `deliver-story`): `{ approach: string, alternatives: string[], dependencies: string[] (outside libraries or services the approach relies on), openDecisions: string[], storyBlockers: string[] }`.
- `PLAN_SCHEMA` (writer, `deliver-spike`): `{ claims: [{ id, claim, status: 'supported'|'contested'|'unknown', needsMeasurement: boolean, measurement: string }], openDecisions: string[] }`.
- `CODER_SCHEMA`: `{ changed: string[], tests: string[], ran: string[] (command → result), revision: string, open: string[], specMismatch: string ('' when none) }`. A reproduction or prototype run also returns `steps: string[]`, `observed: string`, and `measurements: [{ claim, value, command }]`. The schema declares these with empty-array or empty-string values allowed.
- `PUSHER_SCHEMA`: `{ done: boolean, operations: [{ op, result, reference }], unmet: string[] }`. `reference` carries a commit sha, a PR URL or path, a card id, or a worktree path.
- `WATCHER_SCHEMA`: `{ outcome: enum['finished','failed','timed-out','pending','not-declared'], waitingFor: enum['start','finish',''], limitMinutes: number, reference: string, findings: [{ id, location, text }] }`. The outcomes mean:
  - `pending`: the dispatch's 9-minute wait ended with the review not yet started or finished.
  - `timed-out`: a declared time limit, measured from the trigger or start time the review status shows, has passed. This holds whatever word the declaration uses for that case.
  - `failed`: the review ran and did not complete.

  A script with no clock bounds the wait by counting dispatches. For each phase (`start`, then `finish`), it re-dispatches `watcher` while the outcome is `pending`, up to `ceil(limitMinutes / 9) + 1` dispatches. When that count is reached, it treats the review as `timed-out`. An undeclared or zero `limitMinutes` means no limit: a fixed cap of 12 dispatches bounds the phase instead, and the report says the wait was capped because no limit is declared.

### Common workflow conventions

- Packaging follows `research.js`. Each script starts with a pure-literal `export const meta = { name, description, whenToUse, phases }`. `name` equals the file's basename. `phases` details name every scout, lens, and advisor the phase dispatches. This is the workflow's declaration of what it dispatches. `whenToUse` says to run the workflow only when the user invokes `/slopify:<name>` or asks for the slopify `<name>` workflow, and lists the args.
- Args: `args` may be a JSON string or a plain string. Normalize them as `research.js` does. A plain string fills the workflow's primary field (named per workflow below). With no primary field, return `{ status: 'not-started', next: '<what to ask the user>' }` and dispatch nothing. Every workflow accepts `projectRoot?` (default: the session project directory) and `answers?` (`{ [needId]: string }`).
- Dispatch: `parallel()` is used wherever steps are independent. Each verdict is a new `agent()` call made after the revision it judges exists, and its prompt names that revision. Nothing continues an earlier agent.
- Budgets: three failures per gate per run (`MAX_FAILURES = 3`). A failure is a `fail` verdict, an `unverified` verdict whose missing prerequisite a producer could supply, or a producer reporting the approach unworkable. When a gate reaches three, the workflow returns `blocked(…, [{ id, kind: 'validation', what, evidence }], { attempts })`. A rerun is a new run with fresh budgets.
- Authorization: the invocation is the user's request. The deliver workflows and `review-pr` authorize what `deliver` authorized: the story branch and worktree, attributable commits, a push once the gates pass, opening or updating this task's PR, and the declared review trigger, re-fired after each verified push. `reproduce-bug` authorizes filing one `Bug` card. `deliver-spike` authorizes creating, and then deleting, its own unpushed prototype branch and worktree. `shape` authorizes filing or updating the story card only when args set `file: true`. No workflow authorizes merging, releases, or other messages. Every `pusher` brief states the authorization it carries, and `pusher` never rewrites a declaration.
- Story authority (card requirement): the deliver workflows pass the story to every producer verbatim, as the acceptance source. They never brief `pusher` to change a card's content. When the writer returns `storyBlockers`, or the work proves the story unbuildable as stated, the workflow returns `blocked(…, [{ kind: 'story', … }])` naming the blocker, for the story to go back through `shape`. A deliver workflow may only clarify an ambiguous criterion in the spec without changing its meaning, keeping the original wording beside the clarification. A criterion that is wrong — one whose meaning would have to change for the story to be buildable or correct — is a `story` blocker, never a spec correction. `writer-specification.md` changes to say exactly this (see [references](#auditor-bootstrap-and-references)).
- Dirty-work briefing: a producer dispatched in a worktree whose `dirty` checkpoint lists paths (from an interrupted run) receives dirty paths as follows:
  - A step with a single `coder` (`deliver-bugfix` `reproduce` and `fix`) gives that coder every dirty path except the spec.
  - A step with several producers gives each the dirty paths within its assigned paths.
  - `review-pr`'s Fix step splits by location: dirty paths under documentation or the spec go to the `writer`, and all others go to the `coder`, matching how the round's findings are split.

  Its brief says: "Uncommitted changes in these paths come from an interrupted run of this step; inspect them, keep what serves your assignment, and continue from them rather than starting over." This applies to `deliver-story` `implement`, `deliver-bugfix` `reproduce` and `fix`, and `review-pr`'s Fix step. In `deliver-story` `implement`, dirty paths outside every producer's assigned paths are listed in the result's `limits`, and are not committed, because `pusher` stages explicit paths only.

- Results: `{ status: 'done', workflow, skipped: [step ids skipped from checkpoints], attempts, … }`, or `blocked`, or `not-started`.

#### `blocked` result and reruns

```js
{
  status: 'blocked',
  workflow: 'deliver-story',            // the workflow that stopped (a child's own name when review-pr stopped)
  step: 'spec',                         // the step id that could not proceed
  needs: [{ id: 'spec-1', kind: 'story' | 'decision' | 'prerequisite' | 'validation' | 'input',
            what: 'what is needed, in one sentence', evidence: 'the finding, verdict, or report behind it' }],
  completed: ['locate', 'workspace', 'gather', 'approach', 'advise'],
  checkpoint: { worktree, branch, spec, ledger, pr, draft },   // whichever exist, as absolute paths or references
  attempts: [{ gate, approach, failed }],
  rerun: 'Invoke /slopify:<name> again with the same args and add answers.<id> for each decision. In this session, pass resumeFromRunId to reuse the steps already completed.'   // when every need is a decision; otherwise: resolve the needs and rerun without resumeFromRunId
}
```

Reruns skip completed steps in two ways:

- **In the same session, through workflow resume.** Rerun with the same args plus `answers`, passing `resumeFromRunId`. A decision id comes from the question text and starts with its producer's prefix; the producer's prompt carries `answers[id]` beside its question, and no other step's prompt does. Every earlier `agent()` call is therefore unchanged and replays from the cache. Resume applies when nothing the earlier steps read has changed: after an interruption, or when the fix is an answer. The `rerun` text therefore offers it only when every need is a `decision`; a prerequisite such as a missing binding, or a failing gate, needs a fresh rerun, because resume would replay the cached checkpoint and block the same way.
- **Across sessions, or after the story or repository changed, through durable checkpoints.** Rerun without resume. The first step is always a `scout-checkpoint` dispatch, so the run skips every step its checkpoint proves complete and still current. A changed story revision invalidates the spec checkpoint: the writer revises the spec from the new story, and it passes the spec gate again.

#### Checkpoint vocabulary

The workflow tells `scout-checkpoint` which keys to report. The scout returns each key that exists as an evidence item, with `source` set to the key and `excerpt` set to its value.

- `worktree`, `branch`, `head`, `dirty`: the story or prototype worktree, from `docs/FORGE.md`'s naming. `dirty` lists the paths with uncommitted changes, ignoring `.tmp/`, or is `none`. Design choice: `scout-checkpoint` is dispatched after `scout-card` returns, never alongside it. `scout-card` returns the card identifier and the board's branch name, which are what `docs/FORGE.md`'s naming derives from. Without a card, the workflow passes a slug from the primary field (lowercased words joined by `-`, first six words, then a short hash of the whole text).
- `ledger`: the ledger's absolute path.
- `fired-head` (`review-pr`): the sha after `head` on the last `review <n> fired` line, the head that review judges.
- `done-board-start`, `done-board-pr`: the last `done board-start` and `done board-pr` lines.
- `pushed-head` and `unpushed` (`review-pr`): the head commit of the PR's branch as the remote has it, and how many local commits the pushed head lacks, or `none`.
- `ledger-story`, `done-spec`, `done-implement`, `done-publish`, `review-fired`, `review-ended`: the values on the matching ledger lines ([Ledger](#ledger)). `review-fired` and `review-ended` are the highest round numbers after the last `done publish` line.
- `spec`: the current spec path and its `git hash-object`, written `<absolute path>@<hash>`; the parsers also accept a space.
- `pr`: the open PR for the branch, read through `docs/FORGE.md`'s read binding.
- `draft`, `draft-open`, `draft-filed`, `findings-doc`, `repro-dir`, `bug-card`, `prototype-branch`: the per-workflow artifacts named below.

#### Ledger

`plugins/slopify/skills/deliver/references/ledger.md` moves to `plugins/slopify/references/pusher-ledger.md`. It is reworded for `pusher` as its only writer. The file stays `.tmp/ledger.md` at the story worktree root, it stays append-only, and `pusher` stamps the time. Lines:

```
<time> run <n>: <workflow> <primary arg> | worktree <path> | branch <name>
<time> done spec <path>@<spec hash> commit <sha> story <story revision> [test <path>]
<time> done implement commit <sha> spec <spec hash> [pushed]
<time> done board-start <card id>
<time> done board-pr <pr reference>
<time> done publish <pr reference> commit <sha>
<time> review <n> fired <trigger time> [head <sha>]
<time> review <n> ended <finished|failed|timed-out>: <defects fixed, non-issues, unverified, or none>
```

**Currency chain.** A rerun skips a step only when its checkpoint is current, and each link depends on the one before it:

- `done spec` is current when its spec hash equals the current spec file's hash, and its story revision equals `scout-card`'s `story-revision`.
- `done implement` is current when `done spec` is current and its `spec` hash equals that same current hash.
- `done publish` is current when `done implement` is current and the last `done implement` line either precedes the last `done publish` line or is marked `pushed`. A review round's push writes `pushed`.

`done board-start` and `done board-pr` record the card's delivery-start operation and the board operations for when the PR opens, in the dispatch that does them (`done board-pr` before `done publish`). A rerun that finds the worktree, or the PR, but no such line performs only the missing board operation, since it may have failed after its forge step.

So a revised spec re-runs `implement`, `validate`, and `publish` (which updates the existing PR instead of opening one). A changed story re-runs everything from `spec`.

**Review rounds.** Round `n` handles review `n`. Rounds are numbered from the last `done publish` line, and `publish` fires review 1. Lines are written as follows:

- The `publish` dispatch writes `done publish …` and `review 1 fired …`. When opening the PR fires the review, the trigger time is the PR's creation time.
- Round `n`'s push dispatch writes `review <n> ended …` and `review <n+1> fired …`.
- A round that ends the loop without a push (clean, `failed`, or `timed-out`) writes no line, because no `pusher` dispatch exists just to write the ledger.

Resume rule: take the highest `review <n> fired` after the last `done publish`. When the worktree also holds commits the PR's pushed head lacks (`unpushed`), the round's fix was committed but never pushed: `review-pr` resumes at `push` for that round, without sorting review `n` again, and judges findings against the pushed head, never an unpushed local commit. The same holds when the pushed head is beyond the `head` on the last `review <n> fired` line: the fix was pushed, and the steps after the push (pull request update, re-fire, ledger lines) are finished without sorting review `n` again. The resume dispatch also writes a `done spec` line when the committed spec's hash differs from the ledger's last one, so a later deliver rerun finds it current.

- Resume at round `n` by waiting for review `n`. A review that already finished comes back from the first `watcher` dispatch at once. Its findings are sorted again by new `lens-finding` dispatches; re-sorting is idempotent.
- When `n` is 4, it is the final review after round 3. It is waited for and sorted for the report, and nothing is fixed.

Worked example:

| Event                                                                 | Lines appended                                                        | A rerun at this point resumes at                         |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------- |
| `publish` opens PR 7 at commit `a1`                                   | `done publish PR 7 commit a1`; `review 1 fired t0`                    | round 1: wait for review 1                               |
| Round 1: two defects fixed, `qa` passes, push `b2`                    | `review 1 ended finished: fixed 2, non-issues 1`; `review 2 fired t1` | round 2: wait for review 2                               |
| The session dies while waiting for review 2                           | none                                                                  | round 2: wait for review 2 (returns at once if finished) |
| Round 2: one defect fixed, push `c3`                                  | `review 2 ended finished: fixed 1`; `review 3 fired t2`               | round 3                                                  |
| Round 3: one defect fixed, push `d4`                                  | `review 3 ended finished: fixed 1`; `review 4 fired t3`               | the final review: wait, sort, report                     |
| Review 4 finishes with one finding; it is sorted and reported unfixed | none                                                                  | the final review again (idempotent)                      |

`review-pr` invoked by the user on a PR whose worktree has no ledger, or a ledger with no `done publish` line, starts at round 1. With `findings` in its args, round 1 uses those findings and skips the wait. Its first push creates the ledger, with a `run` line, `review 1 ended …`, and `review 2 fired …`, so later reruns follow the resume rule. A rerun before that first push starts at round 1 again. Re-sorting round 1's findings is idempotent, and fixes already committed show as non-issues ("already handled").

Every `pusher` brief carries the lines to append for the step it completes. A checkpoint is therefore recorded in the same dispatch that makes it durable, and no dispatch exists only to write the ledger. The ledger is used by `deliver-story`, `deliver-bugfix`, and `review-pr`. Design choice: `shape`, `deliver-spike`, and `reproduce-bug` need no ledger, because their checkpoints are artifacts (draft, findings document, reproduction directory, filed card).

### Workflows

"‖" marks agents dispatched together in `parallel()`. Every validation loop is: the producer fixes from the findings, then new validator dispatches judge the new revision, within the gate's budget.

#### `shape` — `workflows/shape.js`

Args: `{ idea, card?, file?: boolean, projectRoot?, answers? }`. The primary field is `idea`. Draft path: `<projectRoot>/.tmp/shape/<slug>.md` (`.tmp/` is ignored). Design choice: the draft lives in `.tmp/`, since `shape` writes no spec and files a card only when asked.

Draft markers (design choice):

- The writer records each open decision in the draft as one line, `<!-- open-decision <id>: <question> -->`, with `id` matching `[a-z0-9-]+`. It returns the same ids in `openDecisions`.
- `pusher`, after filing, appends `<!-- filed <card id> -->` to the draft.
- `scout-checkpoint` reports `draft` (path and hash), `draft-open` (the open-decision ids still marked, comma-separated, or `none`), and `draft-filed` (the card id, or absent). It finds them with `grep -oE '<!-- (open-decision [a-z0-9-]+|filed [^ ]+)' <draft>`.

| Step       | Dispatches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Skip when                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `locate`   | `scout-card` (the `card`, or the card the idea names, if any) ‖ `scout-related-cards`; then `scout-checkpoint` (keys `draft draft-open draft-filed`, with the slug from the card identifier, or else from the idea)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | never                                                                                                  |
| `gather`   | `library-reader` ‖ `scout-docs` ‖ `scout-code` (where the product already does or touches this)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `draft` exists                                                                                         |
| `advise`   | `advisor-value` ‖ `advisor-scope` ‖ `advisor-alternatives` ‖ `advisor-fit`, each with the idea and all scout and library evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `draft` exists                                                                                         |
| `draft`    | `writer` (`WRITER_SCHEMA`) writes the story at the draft path, and only there, in the card shape `docs/BOARD.md` declares: problem and outcome, scope and exclusions, observable acceptance criteria, dependencies, evidence. It synthesizes the advisors' views and states what it adopted and why. It writes no spec and no approach. When `draft` exists with `draft-open` not `none` and `answers` holds those ids, it is instead dispatched to resolve them: it applies each answer in the draft, removes that marker, and reports anything still open. When `answers` lacks an open id, no writer runs, and the workflow returns `blocked(kind: 'decision')` naming the still-marked ids.                                                             | `draft` exists and `draft-open` is `none` (a draft with marked open decisions is not a completed step) |
| `validate` | `lens-criteria` ‖ `lens-solution-free` on the draft revision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | never (a verdict covers only its revision)                                                             |
| `file`     | `pusher`, through `docs/BOARD.md`: when the idea came from an existing card (`scout-card` found one, or the `card` arg names one; a `scout-card` that returns nothing is asked once more), it updates that card; otherwise it creates one, after searching the board for a card whose body ends with the draft's `<!-- shape-draft <slug> -->` line, so a rerun never files twice. Either way, it appends the `filed` marker to the draft the moment the card operation succeeds, before any step that can fail; when only a later step fails, the blocked need names the written card, not the board declaration. With no board, `pusher` returns the draft as `unmet`, and the workflow returns `blocked(kind: 'prerequisite')`, as `reproduce-bug` does. | `file` is not `true`, or `draft-filed` exists (a card was already filed from this draft)               |

After `draft`, marked open decisions that `answers` doesn't settle give `blocked(kind: 'decision')`, and `validate` and `file` don't run. Result: `{ story: <draft path>, revision, verdicts, advisors: [{ name, judgement, conditions }], filed: <card id or null> }`.

#### `deliver-story` — `workflows/deliver-story.js`

Args: `{ story, projectRoot?, answers? }`. The primary field is `story`: a card identifier or URL, or the story text. Spec path: the one `docs/BOARD.md` names, or `docs/specs/<slug>.md` in the worktree. "Current" in this table follows the [currency chain](#ledger).

| Step        | Dispatches                                                                                                                                                                                                                                                                                                                                                                                                                                          | Skip when                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `locate`    | `scout-card`. A story with no acceptance criteria gives `blocked(kind: 'story')`. Then `scout-checkpoint` (keys `worktree branch head dirty ledger ledger-story done-spec done-implement done-publish review-fired review-ended spec pr`), briefed with the card identifier and branch name `scout-card` returned.                                                                                                                                  | never                                                                                                              |
| `workspace` | `pusher`: create or recover the story worktree per `docs/FORGE.md`; perform the card's delivery-start operation per `docs/BOARD.md`; ledger `run` and `done board-start` lines; a rerun with the worktree but no `done board-start` performs only the delivery-start operation                                                                                                                                                                      | `worktree` exists (the `run` line then rides on the next `pusher` dispatch)                                        |
| `gather`    | `scout-code` ‖ `scout-tests` ‖ `scout-docs` ‖ `scout-history` ‖ `library-reader`                                                                                                                                                                                                                                                                                                                                                                    | `done spec` is current                                                                                             |
| `approach`  | `writer` (`APPROACH_SCHEMA`) outlines the approach from the story and evidence. Then `scout-upstream-docs` ‖ `scout-known-issues`, one pair per `dependencies` entry (none when empty).                                                                                                                                                                                                                                                             | `done spec` is current                                                                                             |
| `advise`    | `advisor-architecture` ‖ `advisor-performance` ‖ `advisor-risk` ‖ `advisor-security` on the approach and all evidence                                                                                                                                                                                                                                                                                                                               | `done spec` is current                                                                                             |
| `spec`      | `writer` (`WRITER_SCHEMA`) writes the spec: the story verbatim as the acceptance source, the approach, each advisor's view as adopted or rejected with its reason, how each criterion is verified, and `tasks` with disjoint `paths` plus the `docs` to update. When a spec exists but isn't current, the writer revises it against the new story. `storyBlockers` give `blocked(kind: 'story')`; `openDecisions` give `blocked(kind: 'decision')`. | `done spec` is current                                                                                             |
| `spec-gate` | `lens-scope` ‖ `lens-consistency` on the spec revision. Both must pass. Then `pusher` commits the spec, with ledger `done spec`.                                                                                                                                                                                                                                                                                                                    | `done spec` is current                                                                                             |
| `implement` | One `coder` per `tasks` entry, ‖ when their paths are disjoint (otherwise in sequence), ‖ `writer` for `docs`. When `dirty` lists paths, each producer is told that uncommitted work from an interrupted run exists in its paths, and to continue from it rather than start over. A coder's `specMismatch` sends the work back to `spec` with the spec budget.                                                                                      | `done implement` is current. Never skipped only because the worktree is dirty: a producer that never ran must run. |
| `validate`  | `qa` (`LENS_SCHEMA`) on the candidate revision, the spec revision, and the changed paths ‖ `lens-docs` when `docs` is non-empty. A finding located in the spec goes back through `spec-gate`, never to a coder. Then `pusher` commits the implementation, with ledger `done implement`.                                                                                                                                                             | `done implement` is current                                                                                        |
| `publish`   | `pusher`: push; open the PR per `docs/FORGE.md`, or update it when one exists; perform the board's "PR opens" operations on first opening; fire the review trigger unless opening fires it; ledger `done board-pr` (before the trigger), `done publish`, and `review 1 fired`                                                                                                                                                                       | `done publish` is current                                                                                          |
| `review`    | `workflow('slopify:review-pr', { pr, worktree, spec, story, projectRoot, answers })`                                                                                                                                                                                                                                                                                                                                                                | never                                                                                                              |

Result: `{ pr, spec, verification: [qa and lens verdicts], review: <review-pr result> }`. If `review-pr` returns `blocked`, `deliver-story` returns that result unchanged, adding `completed` for its own steps.

#### `deliver-bugfix` — `workflows/deliver-bugfix.js`

Args: `{ bug, projectRoot?, answers? }`. The primary field is `bug`: a card or the report text. No advisors.

| Step        | Dispatches                                                                                                                                                                                                                   | Skip when                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `locate`    | `scout-card`; then `scout-checkpoint`, with the keys as `deliver-story`                                                                                                                                                      | never                       |
| `workspace` | `pusher`, as `deliver-story`                                                                                                                                                                                                 | `worktree` exists           |
| `gather`    | `scout-code` ‖ `scout-tests` ‖ `scout-history`                                                                                                                                                                               | `done spec` is current      |
| `reproduce` | `coder` writes a regression test that shows the reported failure, and changes no production code. Then `lens-repro` judges it. Not reproducible within budget gives `blocked(kind: 'story', what: 'a reproducible report')`. | `done spec` is current      |
| `spec`      | `writer` writes a spec only as large as the fix needs: the bug, its cause, the fix, the regression test, and how it is verified                                                                                              | `done spec` is current      |
| `spec-gate` | `lens-scope`. Then `pusher` commits the spec and the regression test together, with ledger `done spec … test <path>`. They are therefore never part of `dirty`.                                                              | `done spec` is current      |
| `fix`       | `coder` fixes, leaving the regression test as `lens-repro` passed it. It is briefed about `dirty` work as in `deliver-story`.                                                                                                | `done implement` is current |
| `validate`  | `qa` ‖ `lens-regression` (base revision = the commit before the `done spec` commit, i.e. without the fix; candidate revision). Then `pusher` commits, with ledger `done implement`.                                          | `done implement` is current |
| `publish`   | as `deliver-story`                                                                                                                                                                                                           | `done publish` is current   |
| `review`    | `workflow('slopify:review-pr', …)`                                                                                                                                                                                           | never                       |

Design choice: the bugfix spec gate is `lens-scope` alone, to keep the spec as small as the fix. `lens-consistency` joins only when the writer's spec changes a documented contract (the writer reports this in `docs`).

#### `deliver-spike` — `workflows/deliver-spike.js`

Args: `{ question, projectRoot?, answers? }`. The primary field is `question`. No advisors, and no ledger. The findings document is written in the main checkout, uncommitted: `docs/FORGE.md` keeps work on the default checkout uncommitted unless the user asks, and the spike merges nothing. The prototype lives on its own branch and worktree, named only by the `Spike prototypes` line of `docs/FORGE.md` (the bootstrap forge template carries it: the local branch and worktree patterns in terms of the spike's slug, and permission to delete a never-pushed prototype), and is never pushed or merged. The workflow invents no names: when the declaration has no such line, no prototype is built, the findings say which claims went unmeasured, and the missing naming is listed among the open unknowns. `whenToUse` says that open-ended outside research ("what is the best X") belongs to `/slopify:research`.

| Step        | Dispatches                                                                                                                                                                                                                                                                                       | Skip when                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `locate`    | `scout-checkpoint` (keys `spike-binding` — the `Spike prototypes` line of `docs/FORGE.md`, absent when there is none — `findings-doc` — a doc whose first line under its title is `Spike: <slug>` — `prototype-branch`, `worktree`). No `scout-card` is dispatched, because a spike has no card. | never                                                                                |
| `codebase`  | `library-reader` ‖ `scout-feasibility` ‖ `scout-code`                                                                                                                                                                                                                                            | `findings-doc` exists                                                                |
| `outside`   | After `library-reader` has returned: `scout-upstream-docs` ‖ `scout-known-issues` ‖ `scout-prior-art`, each told what the library already supports, so they look only for what is missing                                                                                                        | `findings-doc` exists                                                                |
| `plan`      | `writer` (`PLAN_SCHEMA`) lists the claims, the evidence status of each, and the measurements needed                                                                                                                                                                                              | `findings-doc` exists                                                                |
| `prototype` | When any claim needs a measurement and `docs/FORGE.md` has a `Spike prototypes` line: `pusher` creates the prototype branch and worktree. Then `coder` builds the throwaway prototype there and runs each measurement (`measurements`).                                                          | no measurement is needed, `docs/FORGE.md` has no such line, or `findings-doc` exists |
| `findings`  | `writer` writes the document entry where it best fits the project's docs: `Spike: <slug>`, the question, findings, measurements, and open unknowns. It makes no recommendation. Every claim cites a `path:line`, library evidence, an outside source, or a measurement.                          | `findings-doc` exists                                                                |
| `validate`  | `lens-evidence` ‖ `lens-question` ‖ `lens-neutrality` on the document revision ‖ `qa` (when a prototype exists): the prototype measures what the document's measurement claims say. Writer and coder fixes follow; the prototype's fixes are re-measured.                                        | never                                                                                |
| `cleanup`   | `pusher` removes the prototype worktree and deletes its local branch                                                                                                                                                                                                                             | `prototype-branch` is absent                                                         |

Result: `{ document: <path>, revision, verdicts, measurements, unknowns, prototypeDeleted: boolean }`.

#### `reproduce-bug` — `workflows/reproduce-bug.js`

Args: `{ report, projectRoot?, answers? }`. The primary field is `report`. The reproduction directory is `<projectRoot>/.tmp/repro/<slug>/` (ignored). The `coder`'s only writable path is that directory, so no production code changes.

| Step              | Dispatches                                                                                                                                                                                                                               | Skip when                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `locate`          | `scout-card` (if the report names a card) ‖ `scout-related-cards` (an existing `Bug` card for this report gives `bug-card`); then `scout-checkpoint` (keys `repro-dir`, with the slug from the card identifier, or else from the report) | never                                                  |
| `gather`          | `scout-code` ‖ `scout-tests` ‖ `scout-history`                                                                                                                                                                                           | `bug-card` exists                                      |
| `reproduce`       | `coder` writes and runs a reproduction script or test in the reproduction directory, returning `steps` and `observed`                                                                                                                    | `bug-card` exists, or `repro-dir` holds a reproduction |
| `validate-repro`  | `lens-repro`. Not reproducible within budget gives `blocked(kind: 'input', what: 'more detail to reproduce the report')`.                                                                                                                | `bug-card` exists                                      |
| `report`          | `writer` drafts the issue at `<repro dir>/issue.md` in the board's card shape: evidence, steps to reproduce, expected outcome, observed outcome                                                                                          | `bug-card` exists                                      |
| `validate-report` | `lens-bug-report` on the draft revision                                                                                                                                                                                                  | `bug-card` exists                                      |
| `file`            | `pusher` files it as a `Bug` card at the declared initial status through `docs/BOARD.md`. With no board, it returns the draft as `unmet`, and the workflow returns `blocked(kind: 'prerequisite')`.                                      | `bug-card` exists (result: that card, `filed: false`)  |

Result: `{ card, issue: <draft path>, reproduction: <dir>, verdicts }`.

#### `review-pr` — `workflows/review-pr.js`

Args: `{ pr, worktree?, spec?, story?, test?, findings?, exclude?, projectRoot?, answers? }`. The primary field is `pr`. As a child of `deliver-story` or `deliver-bugfix`, it receives `pr`, `worktree`, `spec`, `story`, and `exclude` from the parent, through `workflow('slopify:review-pr', args)`, one level deep. `exclude` lists the dirty paths the parent left out of its own commit (outside its assigned paths, reported in its `limits`); the review loop never stages or briefs them. A defect is routed by the kind of file: Markdown and prose text files (and the spec) go to the documentation writer, while code, and build or dependency files such as `requirements*.txt` and `CMakeLists.txt`, go to the coder. It calls no `workflow()` itself. `MAX_ROUNDS = 3`.

1. `locate`: acceptance source. When `spec` and `story` are both absent and `scout-card` finds no card for the PR, the acceptance source for every `qa` and `lens-finding` brief is the PR's description (read by `scout-checkpoint` as key `pr`, its excerpt holding the description) plus the round's findings classified `fail`. `qa` judges that the fixes resolve those findings without regressing the PR's described behavior. Then `scout-checkpoint` (keys `worktree branch head dirty ledger review-fired review-ended spec pr`), briefed with the PR. Then `scout-card` (the PR's card, for the acceptance source), unless `story` was given. Here the checkpoint comes first, because the PR is what identifies the card. With no worktree, `pusher` recovers it per `docs/FORGE.md`. The starting point follows the [resume rule](#ledger): round `review-fired`, or round 1 when there is no `review … fired` line. When `review-fired` is 4, only the final review remains.
2. For each round `r` from the starting round to `MAX_ROUNDS`:
   1. **Wait**: `watcher` dispatches for review `r`, bounded as `WATCHER_SCHEMA` describes. In round 1, `findings` given in args skip the wait. `not-declared` ends the loop, with no review. `failed` or `timed-out` ends the loop and is reported.
   2. **Sort**: one `lens-finding` per finding, ‖. `fail` means the defect is present, so it is fixed. `pass` means a non-issue, reported with its reason. `unverified` is reported as unverified with its missing prerequisite, and isn't fixed. Design choice, because a fix needs a confirmed defect: neither `qa` nor a later review could otherwise show that the fix addressed something real, and an unconfirmed change risks scope the spec doesn't cover. When no finding is `fail`, the loop ends. It is reported as a clean review only when no finding is `unverified`.
   3. **Fix**: `coder` takes code defects ‖ `writer` takes spec and documentation defects, on disjoint paths. When a defect needs a material spec change, the writer revises the spec, and `lens-scope` ‖ `lens-consistency` must pass the new revision before code fixes continue. A defect that would change the story gives `blocked(kind: 'story')`.
   4. **Validate**: `qa` ‖ `lens-docs` (when documentation changed) on the new candidate. The budget is three failures per run.
   5. **Push**: `pusher` commits, pushes, updates the PR per `docs/FORGE.md`'s repair binding, and re-fires the trigger. It appends ledger `review <r> ended …` and `review <r+1> fired …`, plus `done implement commit <sha> spec <hash> pushed`. When the spec was revised, it first appends `done spec` for the new revision. This keeps the parent's currency chain true for a later rerun.
3. After round 3's push, `watcher` waits for review 4. `lens-finding` sorts its findings for the report, and the workflow stops without fixing them.

`done publish` is current when `done implement` is current and the last `done implement` line either precedes the last `done publish` line or is marked `pushed`. Round pushes therefore never reset round numbering.

Result: `{ pr, rounds: [{ round, defectsFixed, nonIssues: [{ finding, reason }], unverified, verdict }], review: <final outcome>, unfixed }`.

### `auditor`, `bootstrap`, and references

- `auditor` is kept for `bootstrap`, which is out of scope and dispatches it twice (`skills/bootstrap/SKILL.md:10,12`). Its description narrows to setup: "Fresh, report-only validator for a setup spec and the board and forge declarations it produces." It carries the new contract. Its pointer to `claim-correction.md` is removed. `auditor-readiness.md` and `auditor-acceptance.md` stay. `bootstrap` needs no edit. Rejected alternative: re-pointing `bootstrap` to lenses, which would edit an out-of-scope skill and split its whole-setup judgement across single-property agents.
- `claim-correction.md` is deleted. It assumes a main session that compiles inventories and briefs both parties. Its remaining users (`writer`, `auditor`, `deliver`) lose their pointers, and false documentation claims are now caught by `lens-docs`.
- `skills/shape/` and `skills/deliver/` are deleted with their references:
  - `cards.md`: card preparation moves to the new `references/writer-card.md` (story and bug content in the board's card shape; read the current card before an update). Card operations move to the new `references/pusher-board.md` (find the exact card, operate only as bound, never cross a human gate or rewrite criteria, initial status on create).
  - `ledger.md` becomes `references/pusher-ledger.md` ([above](#ledger)).
  - `review-round.md`: its sorting rules move into `lens-finding`'s body, and its fix-and-push sequence into `review-pr.js`.
  - `specification.md`: its brief contents become the `deliver-story` and `deliver-bugfix` writer prompts. `writer-specification.md` holds the writer's side. Its second paragraph changes to: "When a supplied acceptance criterion is ambiguous, clarify it in the spec without changing its meaning, and keep the original wording beside the clarification. When one is wrong, report it as a story blocker instead of correcting it; never change the goal or a criterion's meaning."
- New `references/pusher-forge.md` covers branch, worktree, commit, push, PR, and review-trigger operations exactly as `docs/FORGE.md` binds them. It says to stage explicit paths, and to report an unbound operation as unmet.
- New `references/writer-findings.md` covers the spike findings document: the `Spike: <slug>` line, findings, measurements, open unknowns, no recommendation, and a citation on every claim.
- `writer.md` points to `writer-specification.md`, `writer-documentation.md`, `writer-card.md`, and `writer-findings.md`. Its line "A fresh auditor judges the result" becomes "A fresh validator judges the result".
- `pusher.md` points to `pusher-board.md`, `pusher-forge.md`, and `pusher-ledger.md`.

### File mapping

| Path                                                                                                      | Disposition                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugins/slopify/skills/shape/**`, `plugins/slopify/skills/deliver/**`                                    | Deleted (`git rm`); content relocated as listed above                                                                                                                                                                                                                                                                                                                                              |
| `plugins/slopify/workflows/{shape,deliver-story,deliver-bugfix,deliver-spike,reproduce-bug,review-pr}.js` | New                                                                                                                                                                                                                                                                                                                                                                                                |
| `plugins/slopify/workflows/research.js`                                                                   | Unchanged                                                                                                                                                                                                                                                                                                                                                                                          |
| `plugins/slopify/agents/scout-*.md` (11), `lens-*.md` (12), `advisor-*.md` (8), `pusher.md`, `watcher.md` | New                                                                                                                                                                                                                                                                                                                                                                                                |
| `plugins/slopify/agents/coder.md`                                                                         | `model: opus`; return block removed; "the main agent integrates your work" → "`pusher` commits it"                                                                                                                                                                                                                                                                                                 |
| `plugins/slopify/agents/writer.md`                                                                        | `description`: "Production leaf that drafts or revises a story, approach outline, spec, findings document, bug report, or documentation from supplied sources; a fresh validator judges it, and it never implements code." The `claim-correction.md` pointer is removed; "A fresh auditor judges the result" becomes "A fresh validator judges the result"; return block removed; same commit line |
| `plugins/slopify/agents/qa.md`                                                                            | New contract section; return block removed                                                                                                                                                                                                                                                                                                                                                         |
| `plugins/slopify/agents/library-clerk.md`, `auditor.md`                                                   | New contract section; return block under `## Return`; `auditor` description and pointers as above                                                                                                                                                                                                                                                                                                  |
| `plugins/slopify/references/writer-specification.md`                                                      | Second paragraph replaced: ambiguous criteria are clarified without changing their meaning; wrong ones are reported as story blockers. Last sentence: "filing it is the main agent's job" → "filing it is `pusher`'s job"                                                                                                                                                                          |
| `plugins/slopify/references/claim-correction.md`                                                          | Deleted                                                                                                                                                                                                                                                                                                                                                                                            |
| `plugins/slopify/references/{pusher-board,pusher-forge,pusher-ledger,writer-card,writer-findings}.md`     | New                                                                                                                                                                                                                                                                                                                                                                                                |
| `plugins/slopify/.claude-plugin/plugin.json`                                                              | `description` rewritten for the workflows and agent families; `version` unchanged                                                                                                                                                                                                                                                                                                                  |
| `.claude-plugin/marketplace.json`                                                                         | Plugin `description`: "auditor" → "lens", "deliver" → "deliver workflows"                                                                                                                                                                                                                                                                                                                          |
| `README.md`, `CLAUDE.md`                                                                                  | See below                                                                                                                                                                                                                                                                                                                                                                                          |
| `plugins/slopify/evals/**`                                                                                | See [Evals](#evals)                                                                                                                                                                                                                                                                                                                                                                                |

### Repository files outside `plugins/`

- `CLAUDE.md`:
  - The intro: "only the deliver workflows and `review-pr` use a worktree, as `docs/FORGE.md` declares."
  - The workflow bullet: "Workflows (`workflows/<name>.js`) are the only orchestrators: they dispatch every agent by `slopify:<agent>`, dispatch scouts, lenses, and advisors only through the helpers in the shared family-schema block, which every workflow except `research.js` carries byte for byte, and never pass `model` or `effort`."
  - New bullet: "A `scout-*`, `lens-*`, or `advisor-*` agent has exactly one task, has no return format, and gets its schema from the workflow; a new need gets a new agent."
  - New bullet: "Only `pusher` commits, pushes, or performs board and forge operations."
  - The contract bullet: "`qa`, `library-clerk`, `auditor`, and every `lens-*` share their \"Report-only contract\" section word for word; edit them together."
  - The checks block is replaced by the one below. Its lead-in becomes "These print nothing when the plugin is consistent:". The final `1` is replaced by printing nothing.
- `README.md` is rewritten for the current state:
  - One table: Shape (`/slopify:shape`), Delivery (`/slopify:deliver-story`, `deliver-bugfix`, `deliver-spike`, `review-pr`), Bugs (`/slopify:reproduce-bug`), Library (`research`, `ask`, `lint`), and Setup (`bootstrap`). Each row lists the agents its workflows dispatch.
  - The agent families, with their models.
  - The Report-only contract rule, and fresh verdicts.
  - `blocked` results and reruns: the in-session resume and the checkpoints.
  - The ledger.
  - The review loop.
  - Project authority.
  - Install.
  - That every workflow runs only when invoked explicitly. This is a change for `shape`, which no longer runs automatically.
  - The permission-mode note.
  - The `deliver`-skill-specific prose is dropped.
- `docs/specs/*` and `docs/issues/*` are historical and stay. `.githooks/pre-commit` and `.gitignore` are unchanged: `/.tmp/` already covers drafts, reproductions, and ledgers.

New `CLAUDE.md` checks block:

````bash
grep -rnE '@review|`gh`|gh pr |origin/|mcp__plugin_linear' plugins/
grep -rnE '\b(master|trunk)\b|branch `main`' plugins/
grep -rnoE '\$\{CLAUDE_(PLUGIN_ROOT|SKILL_DIR)\}/[A-Za-z0-9_./-]+\.md' plugins/ | while IFS=: read -r file _ ref; do
  plugin=$(echo "$file" | sed -E 's#^(plugins/[^/]+)/.*#\1#')
  skill=$(echo "$file" | sed -E 's#^(.*/skills/[^/]+)/.*#\1#')
  target=$(echo "$ref" | sed -e "s#\${CLAUDE_PLUGIN_ROOT}#$plugin#" -e "s#\${CLAUDE_SKILL_DIR}#$skill#")
  [ -f "$target" ] || echo "MISSING $file -> $target"
done
grep -ohE "agentType:[[:space:]]*.slopify:[a-z0-9-]+|\b(scout|lens|advise)\(.(scout|lens|advisor)-[a-z0-9-]+" plugins/slopify/workflows/*.js | sed -E 's/.*(slopify:|\(.)//' | sort -u | while read -r name; do
  [ -f "plugins/slopify/agents/$name.md" ] || echo "MISSING agent $name"
done
grep -ohE "workflow\(.slopify:[a-z0-9-]+" plugins/slopify/workflows/*.js | sed 's/.*slopify://' | sort -u | while read -r name; do
  [ -f "plugins/slopify/workflows/$name.js" ] || echo "MISSING workflow $name"
done
grep -nE "agentType:[[:space:]]*.slopify:(scout|lens|advisor)-|\b(model|effort):|slopify:auditor" plugins/slopify/workflows/*.js
grep -nE '^(## )?Return|^```' plugins/slopify/agents/scout-*.md plugins/slopify/agents/lens-*.md plugins/slopify/agents/advisor-*.md
block() { awk '/^\/\/ BEGIN slopify family schemas$/{f=1} f; /^\/\/ END slopify family schemas$/{f=0}' "$1"; }
ref=$(block plugins/slopify/workflows/shape.js)
[ -n "$ref" ] || echo "MISSING schema block plugins/slopify/workflows/shape.js"
for f in plugins/slopify/workflows/*.js; do
  [ "$f" = plugins/slopify/workflows/research.js ] || [ "$(block "$f")" = "$ref" ] || echo "SCHEMA DRIFT $f"
done
contract() { awk '/^## Report-only contract$/{f=1;next} /^## /{f=0} f' "$1"; }
ref=$(contract plugins/slopify/agents/qa.md)
[ -n "$ref" ] || echo "MISSING contract plugins/slopify/agents/qa.md"
for f in plugins/slopify/agents/library-clerk.md plugins/slopify/agents/auditor.md plugins/slopify/agents/lens-*.md; do
  [ "$(contract "$f")" = "$ref" ] || echo "CONTRACT DRIFT $f"
done
fm() { grep -qx "model: $2" "$1" && grep -qx "effort: $3" "$1" || echo "FRONTMATTER $1"; }
nowrite() { grep -qx 'disallowedTools: Edit, Write, NotebookEdit' "$1" && ! grep -q '^tools:' "$1" || echo "WRITE TOOLS $1"; }
for f in plugins/slopify/agents/scout-*.md plugins/slopify/agents/lens-*.md; do fm "$f" haiku high; nowrite "$f"; done
for n in value scope alternatives fit; do fm "plugins/slopify/agents/advisor-$n.md" sonnet medium; done
for n in architecture performance risk security; do fm "plugins/slopify/agents/advisor-$n.md" opus medium; done
for f in plugins/slopify/agents/advisor-*.md; do nowrite "$f"; done
fm plugins/slopify/agents/coder.md opus high; fm plugins/slopify/agents/writer.md opus medium; fm plugins/slopify/agents/qa.md sonnet high
````

The second `grep -nE` line catches direct family dispatch, `model` and `effort` overrides, and `auditor` in any workflow. `meta` never uses those keys. `research.js` has none of them today: `grep -nE '\b(model|effort):|slopify:auditor' plugins/slopify/workflows/research.js` prints nothing.

### Evals

The release commands in `CLAUDE.md` stay as they are. They already grant `Workflow`.

Removed:

- `shape-triggers/graders/shape-fired.md` (a Skill grader).
- `deliver-not-automatic/graders/deliver-not-fired.md`.
- `deliver-smoke/` (it becomes `deliver-bugfix-smoke/`, with `git mv` for `case.yaml` and `scaffold.sh`). Its four graders are deleted, because the `tool_order` graders on main-session `Agent` calls can't observe a workflow's dispatches.

Trigger cases (tag `trigger`, `allowed_tools: [Skill, Workflow]`, `max_turns: 8`, `timeout_seconds: 90`, as in `research-triggers`):

| Case                      | Prompt                                                                                                                       | Grader                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------ |
| `shape-triggers`          | Run the slopify shape workflow on this idea: add a `--json` output flag to our CLI.                                          | `shape-fired`: `tool_used`, `tool: Workflow`, `input_match: '"name"\s*:\s*"slopify:shape"'`                         |
| `deliver-story-triggers`  | Run the slopify deliver-story workflow for this story: add a `--json` output flag to our CLI that prints the result as JSON. | `deliver-story-fired`, same form with `slopify:deliver-story`                                                       |
| `deliver-bugfix-triggers` | Run the slopify deliver-bugfix workflow: `add` in `calc.py` subtracts instead of adding.                                     | `deliver-bugfix-fired`                                                                                              |
| `deliver-spike-triggers`  | Run the slopify deliver-spike workflow: can our CLI stream its output as JSON lines at 1,000 lines per second?               | `deliver-spike-fired`                                                                                               |
| `reproduce-bug-triggers`  | Run the slopify reproduce-bug workflow: `add` in `calc.py` returns 0 for `add(2, 2)`.                                        | `reproduce-bug-fired`                                                                                               |
| `review-pr-triggers`      | Run the slopify review-pr workflow on PR 12.                                                                                 | `review-pr-fired`                                                                                                   |
| `shape-not-automatic`     | Write a story with observable acceptance criteria for adding a `--json` output flag to our CLI.                              | `shape-not-fired`: `tool_used`, `tool: Workflow`, `input_match: '"name"\s*:\s*"slopify:shape"'`, `min: 0`, `max: 0` |
| `deliver-not-automatic`   | (prompt unchanged) Fix the typo in the README and open a pull request for it.                                                | `deliver-not-fired`: `tool_used`, `tool: Workflow`, `input_match: '"name"\s*:\s*"slopify:(deliver-                  | review-pr | reproduce-bug)'`, `min: 0`, `max: 0` |

The library and bootstrap trigger cases are unchanged.

Smoke cases (tag `smoke`): `allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Agent, Workflow]`, `max_turns: 80`, `timeout_seconds: 3600`, `runs: 1`. Each case dir has `case.yaml` (as `deliver-smoke`), `prompt.md`, `scaffold.sh`, and `graders/`. Each scaffold:

- runs `git init -q -b main` and seeds `calc.py` (`add` returns `a - b`) and `test_calc.py`. In `deliver-bugfix-smoke` and `reproduce-bug-smoke`, `test_calc.py` tests only `add(0, 0) == 0`, which passes with the bug, so the coder must add the case that fails. The other cases seed `deliver-smoke`'s `test_calc.py`;
- for cases with the stub forge only (`deliver-story-smoke`, `deliver-bugfix-smoke`, `deliver-spike-smoke`, `review-pr-smoke`), adds `origin` as a local bare remote: `git init -q --bare .forge/remote.git && git remote add origin "$PWD/.forge/remote.git"`. `shape-smoke` and `reproduce-bug-smoke` have "No forge" and add no remote;
- writes `.gitignore` with `.worktrees/`, `/.tmp/`, `/.forge/`, `/.board/`, and `__pycache__/`;
- writes the stub declarations below, and commits.

No case reaches a real forge or Linear. The scaffolds must pass the `CLAUDE.md` greps: no `origin/`, `gh pr `, `master`, or `trunk`.

Every stub path under `.forge/` and `.board/` is relative to the main checkout root: the scaffold's directory, which is the parent of `git rev-parse --path-format=absolute --git-common-dir`. It is never relative to a story or prototype worktree. Both stubs say so in their first bullet, and `pusher-forge.md` and `pusher-board.md` tell `pusher` to resolve a declaration's relative paths against the main checkout root. As a result `pusher` writes `.forge/prs/smoke.md`, `.forge/reviews/…`, and `.board/*.md` there, and the graders' paths (relative to the scaffold dir) find them.

Stub `docs/FORGE.md` (cases that publish or review). `<branch>` is per case; the review lines appear only in `review-pr-smoke`:

```markdown
# Forge declaration

Configuration does not authorize execution; the user's request does.

## Repository

- Paths in this declaration are relative to the main checkout root, never to a worktree.
- Remote and permitted push destinations: `origin`, the local bare repository `.forge/remote.git`; only the story branch is pushed.
- Forge: a local stub. A pull request is the file `.forge/prs/smoke.md`.
- Target branch and its protection: `main`; automated work never commits to it.

## Workspace

- Branch name: `<branch>`. Story worktree: `.worktrees/smoke`, created with `git worktree add .worktrees/smoke -b <branch> main`, or `git worktree add .worktrees/smoke <branch>` when the branch exists.
- Temp folder: `.tmp/` at the root of each checkout, ignored.

## Commits and push

- Commit convention: Conventional Commits. Push with `git -C <worktree> push -u origin <branch>` once the gates pass, and `git -C <worktree> push` after each verified repair.

## Pull request

- Create or update: write `.forge/prs/smoke.md` with `# <title>`, then `## Summary`, `## Spec`, `## Verification`; a repair appends `## Repair <n>`.
- Review trigger and status: none.

## Restrictions

- Never merge, force-push, or rewrite history.
```

In `review-pr-smoke`, the last line under Pull request is replaced by:

- "Review trigger: opening the PR requested review 1; re-fire review `n` by creating `.forge/reviews/smoke-<n>.requested`."
- "Review status: review `n` has finished when `.forge/reviews/smoke-<n>.md` exists, and its findings are that file's list items. Poll every 10 seconds; a review not finished within 2 minutes of its trigger has timed out."

In `deliver-spike-smoke`, Workspace adds "Spike prototypes: the local branch `spike/<slug>` and the worktree `.worktrees/spike-<slug>`, from the spike's slug; the prototype is never pushed, and deleting a never-pushed prototype is allowed.", and Restrictions adds: "Deleting the spike's own unpushed prototype branch and worktree is allowed."

Stub `docs/BOARD.md` (cases with a board):

```markdown
# Board declaration

Configuration does not authorize execution; the user's request does.

## Board

- Paths in this declaration are relative to the main checkout root, never to a worktree.
- Tracker: local Markdown cards, one file per card under `.board/`.

## Operations

- Locate, read, search: read and search `.board/*.md`.
- Create: write `.board/BUG-<n>.md` for a bug, `n` one more than the highest existing bug number (starting at 1), with `Status: Backlog` and `Label: Bug` lines under the title.
- Transition: rewrite the card's `Status:` line.
- Attach a PR: add a `PR: <path>` line under the status line.

## Cards

- Identity and spec naming: the file name without `.md` (`STORY-1`); a spec is `docs/specs/<lowercase identifier>-<slug>.md`.
- Body: `# <title>`, the status and label lines, then the applicable sections of `## Why`, `## Scope`, `## Out of scope`, `## Acceptance criteria`, or for a bug `## Evidence`, `## Steps to reproduce`, `## Expected`, `## Observed`.

## Delivery

- When delivery starts: set `Status: In Progress`. When the PR opens: attach it and set `Status: In Review`.

Never rewrite an acceptance criterion to match an implementation.
```

Cases without a board write the `deliver-smoke` one-line "No board" declaration:

```markdown
# Board declaration

No board: there are no card operations. Acceptance comes from the user's request.
```

Cases without a forge write the "No forge" declaration:

```markdown
# Forge declaration

Configuration does not authorize execution; the user's request does.

No forge: there is no remote, and no branch, push, pull request, or review operation. Work stays in the main checkout, uncommitted.
```

Per case:

| Case                   | Board    | Forge                                                    |
| ---------------------- | -------- | -------------------------------------------------------- |
| `shape-smoke`          | stub     | No forge                                                 |
| `deliver-story-smoke`  | stub     | stub, branch `feat/smoke`                                |
| `deliver-bugfix-smoke` | No board | stub, branch `fix/smoke`                                 |
| `deliver-spike-smoke`  | No board | stub, branch `spike/smoke`, plus the deletion permission |
| `reproduce-bug-smoke`  | stub     | No forge                                                 |
| `review-pr-smoke`      | No board | stub, branch `fix/smoke`, plus the review lines          |

| Case                   | Scaffold specifics                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Prompt                                                                                                          | Graders                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shape-smoke`          | Stub board and "No forge"; `mkdir -p docs/specs`, so the spec location exists and is empty                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `/slopify:shape Let users of calc.py multiply two numbers.`                                                     | `workflow-fired` (Workflow, `slopify:shape`); `draft-written`: `file_exists` `.tmp/shape/*.md`; `llm` on `last_message`: it reports the story path, the four what-and-why advisors' judgements, a passing `lens-criteria` verdict, observable acceptance criteria, and that no spec was written                                                                                                                                                                                       |
| `deliver-story-smoke`  | Stub board with `.board/STORY-1.md` (`Status: Todo`, `Label: Feature`): "Add `mul(a, b)` to `calc.py`", criteria "`mul(3, 4)` returns 12" and "a unit test covers `mul`"; stub forge with branch `feat/smoke`; `add` already correct                                                                                                                                                                                                                                                                                                                         | `/slopify:deliver-story STORY-1`                                                                                | `workflow-fired`; `spec-written`: `file_exists` `.worktrees/smoke/docs/specs/story-1-*.md`; `code`: `regex` `.worktrees/smoke/calc.py` `def mul`; `pushed`: `file_exists` `.forge/remote.git/refs/heads/feat/smoke`; `pr-opened`: `file_exists` `.forge/prs/smoke.md`; `card-in-review`: `regex` `.board/STORY-1.md` `^Status: In Review$` (`flags: m`); `llm`: it reports the four how advisors, `lens-scope` and `lens-consistency` passing before coding, `qa` passing, and the PR |
| `deliver-bugfix-smoke` | "No board"; stub forge with branch `fix/smoke`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `/slopify:deliver-bugfix \`add\` in \`calc.py\` subtracts instead of adding. Fix it so it returns the sum.`     | `workflow-fired`; `fixed`: `regex` `.worktrees/smoke/calc.py` `return a \+ b`; `main-untouched`: `regex` `calc.py` `return a - b`; `pushed`: `file_exists` `.forge/remote.git/refs/heads/fix/smoke`; `pr-opened`: `file_exists` `.forge/prs/smoke.md`; `llm`: it reports that a regression test failed before the fix and passed after it (`lens-regression`), that `qa` passed, and the PR                                                                                           |
| `deliver-spike-smoke`  | "No board"; stub forge with story branch `story/smoke`, the `Spike prototypes` line, and the deletion permission; a library resolved from the bundled resources as in `research-smoke`, provider "local files under `sources/`; no internet"                                                                                                                                                                                                                                                                                                                 | `/slopify:deliver-spike Can add in calc.py sum one million pairs in under one second in this project's Python?` | `workflow-fired`; `main-untouched`: `regex` `calc.py` `return a - b`; `llm`: it names the findings document's path, reports a measurement from a prototype that a fresh `qa` confirmed, open unknowns, no recommendation, `library-reader` consulted before outside scouts, and the prototype branch deleted                                                                                                                                                                          |
| `reproduce-bug-smoke`  | Stub board, no cards; `test_calc.py` without a failing case                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `/slopify:reproduce-bug add(2, 2) in calc.py returns 0 instead of 4.`                                           | `workflow-fired`; `filed`: `file_exists` `.board/BUG-1.md`; `regex` graders on `.board/BUG-1.md`: `^Label: Bug$`, `^## Evidence`, `^## Steps to reproduce`, `^## Expected`, `^## Observed` (each `flags: m`); `main-untouched`: `regex` `calc.py` `return a - b`                                                                                                                                                                                                                      |
| `review-pr-smoke`      | Stub forge with branch `fix/smoke` and the review lines. On `fix/smoke`: `calc.py` gets `div(a, b)` returning `a // b` with the docstring "Return a divided by b as a float". The branch is pushed with `git push -q -u origin fix/smoke`, `.worktrees/smoke` is created with `git worktree add .worktrees/smoke fix/smoke`, `.forge/prs/smoke.md` exists, and `.forge/reviews/smoke-1.md` lists two findings: "`div` floors the result; its docstring promises true division" (a defect) and "Rename `add` to `plus` for consistency" (outside the change). | `/slopify:review-pr .forge/prs/smoke.md`                                                                        | `workflow-fired` (`slopify:review-pr`); `fixed`: `regex` `.worktrees/smoke/calc.py` `return a / b`; `refired`: `file_exists` `.forge/reviews/smoke-2.requested`; `llm`: round 1 fixed the `div` defect after a fresh `qa` passed, reported the rename as a non-issue with a reason, and the loop ended when review 2 came back `timed-out`                                                                                                                                            |

For `deliver-spike-smoke`, the run is also inspected with `--keep-temp` (criterion 22).

## Constraints and dependencies

- Root `CLAUDE.md` rules apply: minimal current-state text; agents are leaves that dispatch only `Explore` (`docs/issues/nested-subagent-result-routing.md`); nothing hardcodes a tracker, forge, branch, commit convention, or review trigger. Workflows and agents name `docs/BOARD.md` and `docs/FORGE.md` and read bindings from them.
- Workflow runtime (Claude Code 2.1.301, verified by the coordinator):
  - no filesystem;
  - no `Date.now()`, `Math.random()`, or argless `new Date()`;
  - `meta` is a pure literal;
  - `workflow()` nests one level only;
  - an agent dispatched by `agent({ agentType: '<plugin>:<agent>' })` from a plugin workflow runs on its frontmatter `model` (probe: a `model: haiku` agent ran on `claude-haiku-5-5`). Frontmatter therefore pins every agent's model, and the workflows pass no `model` or `effort`;
  - `agent()` returns `null` for a dead or skipped agent. A `null` verdict is a failed attempt, never a pass, and a `null` scout is a gap.
- Workflows are invoked only explicitly (`/slopify:<name>`, or by naming the workflow). `shape` therefore changes from model-triggered to explicit. This is the card's choice of a workflow, and the `shape-not-automatic` eval records it.
- The library agents, `ask`, `lint`, `research`, and `bootstrap` keep their behavior. `library-clerk`'s only change is the contract text and its return section. `auditor` changes as stated.
- No version bump (card).

## Acceptance criteria

Each criterion is quoted from the card, followed by how it is verified. Commands run from the worktree root. The [`CLAUDE.md` checks block](#repository-files-outside-plugins) is "the checks".

1. "`slopify` ships the workflows `shape`, `deliver-story`, `deliver-spike`, `deliver-bugfix`, `reproduce-bug`, and `review-pr`, and no longer ships the `shape` or `deliver` skills."
   `ls plugins/slopify/workflows` prints exactly `deliver-bugfix.js deliver-spike.js deliver-story.js research.js reproduce-bug.js review-pr.js shape.js`. `for f in plugins/slopify/workflows/*.js; do grep -q "^  name: '$(basename "$f" .js)'," "$f" || echo "NAME $f"; done` prints nothing. `test ! -e plugins/slopify/skills/shape && test ! -e plugins/slopify/skills/deliver && echo ok` prints `ok`. `claude plugin validate --strict plugins/slopify` passes.
2. "`slopify` ships several `scout-*`, `lens-*`, and `advisor-*` agent types, plus `coder`, `qa`, `writer`, `pusher`, and `watcher`."
   `grep -h '^name:' plugins/slopify/agents/*.md | sort` lists exactly the [roster](#agent-roster): 11 scouts, 12 lenses, 8 advisors, `coder`, `qa`, `writer`, `pusher`, `watcher`, `auditor`, and the four `library-*`. Each file's `name` equals its basename: `for f in plugins/slopify/agents/*.md; do grep -qx "name: $(basename "$f" .md)" "$f" || echo "$f"; done` prints nothing.
3. "Every `scout-*` and `lens-*` agent declares `model: haiku` and `effort: high`, and has no write tools."
   The checks' `fm` and `nowrite` loops print nothing.
4. "Every what-and-why advisor declares `model: sonnet` and `effort: medium`; every how advisor declares `model: opus` and `effort: medium`; no advisor has write tools."
   The checks' advisor loops print nothing. `ls plugins/slopify/agents/advisor-*.md | wc -l` prints `8`.
5. "`coder` declares `model: opus` and `effort: high`; `writer` declares `model: opus` and `effort: medium`; `qa` declares `model: sonnet` and `effort: high`."
   The checks' last line prints nothing.
6. "Each `scout-*`, `lens-*`, and `advisor-*` agent's description and body name exactly one task."
   A reviewer (a fresh `lens-consistency` dispatch, or the PR reviewer) reads each file against the roster table. Each description is one sentence naming the table's task, the body states that task and no other, and no file says "also" for a second job. Mechanical aid: `for f in plugins/slopify/agents/{scout,lens,advisor}-*.md; do sed -n 's/^description: //p' "$f" | grep -c '\. [A-Z]' | grep -qx 0 || echo "MULTI-SENTENCE $f"; done` prints nothing.
7. "Each workflow gathers information only through `scout-*` agents and `library-reader`, and validates non-code work only through `lens-*` agents, with `qa` for code."
   `grep -ohE "agentType:[[:space:]]*.slopify:[a-z0-9-]+" plugins/slopify/workflows/{shape,deliver-story,deliver-bugfix,deliver-spike,reproduce-bug,review-pr}.js | sed 's/.*slopify://' | sort -u` prints only `coder`, `library-reader`, `pusher`, `qa`, `watcher`, and `writer`, with no `Explore`, `general-purpose`, `auditor`, or `library-clerk`. Every other dispatch goes through `scout(`, `lens(`, or `advise(`. Reading the scripts shows no producer or `pusher` prompt that asks it to gather information as a step's output.
8. "Each verdict in a workflow comes from a fresh agent dispatch, never a continuation of a producer or earlier validator."
   `grep -n 'SendMessage' plugins/slopify/workflows/*.js` prints nothing. The `resumeFromRunId` mention in the `rerun` text concerns rerunning a whole workflow, not continuing an agent. Reading the scripts shows that every `lens(` and `qa` call sits inside its validation loop after the producer call it judges, and that its prompt names the revision returned by that producer call.
9. "`qa`, `library-clerk`, and every `lens-*` agent carry the same \"Report-only contract\" section, and the `CLAUDE.md` check confirms it."
   The checks' `contract` loop prints nothing. `grep -c '^## Report-only contract$' plugins/slopify/agents/{qa,library-clerk}.md plugins/slopify/agents/lens-*.md` prints `1` for every file. Changing one word in one lens makes the loop print `CONTRACT DRIFT` for that file. This is a manual negative test, reverted afterwards.
10. "Every scout, lens, and advisor dispatch passes its family's schema, and no scout, lens, or advisor body defines its own return format."
    The checks' direct-dispatch grep, `SCHEMA DRIFT` loop, and `Return` grep print nothing. The helpers in the shared block are the only path that sets a `scout-`, `lens-`, or `advisor-` agent type, and each fixes its family's schema.
11. "`shape` produces a story with observable acceptance criteria after parallel judgements from the what-and-why advisors, validated by `lens-criteria`, and writes no spec."
    `shape-smoke` passes. Reading `shape.js` shows the four `advise(` calls inside one `parallel()` before the writer's draft, and `lens('lens-criteria'` on the draft revision. The writer's only write path in `shape.js` is the draft path under `.tmp/shape/`: `grep -nE 'docs/specs|spec location|WRITER_SCHEMA.*spec' plugins/slopify/workflows/shape.js` prints nothing, and the `draft` prompt names exactly one path, the draft path. On the `shape-smoke` `--keep-temp` dir `$d`, nothing is written under the project's spec location: `git -C "$d" status --porcelain --untracked-files=all -- docs/specs` prints nothing, and `find "$d/docs/specs" -type f` lists no file (the scaffold creates the directory empty).
12. "`shape` dispatches only what-and-why advisors and `deliver-story` only how advisors."
    `grep -ohE "advise\('advisor-[a-z]+'" plugins/slopify/workflows/shape.js | sort -u` prints exactly the four what-and-why advisors. The same grep on `deliver-story.js` prints exactly the four how advisors. On the other scripts it prints nothing.
13. "`deliver-story` writes the story's spec after parallel `advisor-*` judgements on the approach, and the spec passes `lens-scope` and `lens-consistency` before any code is written."
    Reading `deliver-story.js` shows `approach` → `parallel` advisors → `spec` writer → `lens-scope` ‖ `lens-consistency` → the first `coder` call, with no `coder` call reachable before both pass. `deliver-story-smoke` passes.
14. "`deliver-bugfix` and `deliver-spike` dispatch no `advisor-*` agent."
    `grep -nE "advise\(" plugins/slopify/workflows/deliver-bugfix.js plugins/slopify/workflows/deliver-spike.js | grep -v '^[^:]*:[0-9]*:const advise'` prints nothing.
15. "No deliver workflow changes the story's goal, scope, or acceptance criteria; one that finds the story unbuildable stops and reports the blocker."
    Reading the scripts shows that every `pusher` brief in `deliver-*.js` and `review-pr.js` names only workspace, commit, push, PR, review-trigger, ledger, and the board's declared delivery operations (transition, attach). No brief edits card content. `storyBlockers` and story-changing defects return `blocked` with `kind: 'story'`. Manual test: in a `deliver-story-smoke` scaffold whose `STORY-1` criterion reads "`mul(3, 4)` returns 12 and `mul(3, 4)` returns 13", `/slopify:deliver-story STORY-1` returns `status: 'blocked'`, `kind: 'story'`. `.board/STORY-1.md` is unchanged except its `Status:` line, and no `calc.py` change exists in the worktree.
16. "`deliver-story` and `deliver-bugfix` end in an opened or updated PR that passed `qa` and the workflow's `lens-*` validation."
    `deliver-story-smoke` and `deliver-bugfix-smoke` pass, including `pr-opened` and the `llm` graders. Reading the scripts shows `publish` reachable only after `validate` passes (`qa`, and `lens-docs` or `lens-regression`) and after the spec gate passes.
17. "`deliver-bugfix` adds a regression test that fails before the fix and passes after it."
    `deliver-bugfix-smoke`'s `llm` grader passes. On its `--keep-temp` dir, `git -C "$d/.worktrees/smoke" diff --stat main` lists a test file. Running that test against `main`'s `calc.py` fails, and running it in the worktree passes.
18. "`reproduce-bug` files a `Bug` issue containing evidence, steps to reproduce, expected outcome, and observed outcome, and changes no production code."
    `reproduce-bug-smoke` passes: `filed`, the five `regex` graders, and `main-untouched`. On the `--keep-temp` dir, `git -C "$d" status --porcelain` prints nothing, because `.tmp/` and `.board/` are ignored.
19. "`review-pr` stops after three review rounds or a clean review, and each round's fixes pass a fresh `qa` before `pusher` pushes them."
    Reading `review-pr.js` shows `MAX_ROUNDS = 3`, a loop exit on no defect, and in each round `qa` (a new call) before the `pusher` push call, with the push skipped unless `qa` passed. `review-pr-smoke` passes.
20. "Only `pusher` commits, pushes, or performs forge and board operations."
    `grep -nE 'commit|push|PR|card' plugins/slopify/workflows/*.js` shows commit, push, PR-write, and card-write instructions only in `pusher` briefs. Other briefs only say not to. `grep -nE 'git (commit|push)|worktree (add|remove)|branch -[dD]' plugins/slopify/agents/*.md plugins/slopify/references/*.md` matches only `pusher*` files. `coder.md` and `writer.md` say they never commit.
21. "A workflow that cannot proceed returns a `blocked` result naming what it needs, and a rerun after the fix skips steps already completed."
    Reading the scripts shows every early `return` is `blocked(…)` (or `not-started` for missing args), with non-empty `needs`. Manual test on the criterion 15 scaffold: fix the criterion to "`mul(3, 4)` returns 12", then rerun `/slopify:deliver-story STORY-1` in a new session. The result is `done`, and its `skipped` includes `workspace`. Rerun it once more after it is done: `skipped` includes `gather`, `approach`, `advise`, `spec`, `spec-gate`, `implement`, `validate`, and `publish`, and no `coder` runs.
22. "`deliver-spike` writes its evidence — findings, measurements, and open unknowns — to a document entry with no recommendation, merges no production code, and deletes its prototype branch."
    `deliver-spike-smoke` passes. On its `--keep-temp` dir: `grep -rl --exclude-dir=.git --exclude-dir=.worktrees '^Spike: ' "$d"` prints exactly one document, under `$d/docs/` (where the writer places it, because `docs/` is the scaffold's only documentation location), and it has findings, measurements, and unknowns sections. `git -C "$d" branch --list 'spike/*'` prints nothing. `git -C "$d" worktree list | wc -l` prints `1`. `git -C "$d" log --oneline main | wc -l` prints `1` (only the seed commit). `grep -c 'return a - b' "$d/calc.py"` prints `1`. `lens-neutrality` passed, per the result.
23. "`deliver-spike` may have `coder` build a throwaway prototype on its own branch to measure a claim; a fresh `qa` confirms the prototype measures what the findings say, and the prototype is never merged."
    Reading `deliver-spike.js` shows the `pusher` prototype workspace before the `coder` prototype call, `qa` in `validate` judging the prototype against the document revision, no push or PR in any `pusher` brief, and `cleanup` deleting the branch. Criterion 22's `--keep-temp` checks show nothing merged.
24. "`deliver-spike` dispatches `library-reader` before any outside scout, and its findings cite codebase locations, library evidence, outside sources, or prototype measurements for every claim."
    Reading `deliver-spike.js` shows the `outside` step's `parallel` awaits the `library-reader` result first, and passes it into the outside scouts' prompts. `lens-evidence` passes in `deliver-spike-smoke`, and its `llm` grader confirms the order.
25. "The `CLAUDE.md` consistency checks print nothing except the final `1` (or its replacement), and the trigger and smoke evals pass."
    Correction, with the original kept: the final `1` is replaced by checks that print nothing, so "print nothing except the final `1`" becomes "print nothing". The card allows this as "its replacement". The checks block prints nothing. These pass every case:
    ```bash
    claude plugin eval plugins/slopify --tag trigger --runs 1 --allow-tools Workflow --ablation none --trust-plugin
    claude plugin eval plugins/slopify --tag smoke --allow-tools Bash Write Edit Agent Workflow --scaffold --keep-temp --ablation none --trust-plugin
    ```

## Tasks

Task 0 comes first. Tasks 1–9 write disjoint paths and can run in parallel. Each is self-contained from this spec: the shared block, the contract text, the schemas, and the stub declarations are given above verbatim. Task 10 runs last.

0. **Runtime probe** (no repo writes; results go to the coordinator). On Claude Code 2.1.301, with a throwaway plugin, confirm:
   - a single Bash call in a workflow subagent can poll for up to 9 minutes (`watcher`'s per-dispatch wait). If not, lower the per-dispatch wait to what works, and the dispatch-count bound in `WATCHER_SCHEMA` scales with it;
   - Workflow accepts `resumeFromRunId` with a `name` for a plugin workflow. If not, the in-session rerun uses checkpoints only, and the `rerun` text drops `resumeFromRunId`.
1. **Scouts**: `plugins/slopify/agents/scout-*.md` (11).
2. **Lenses and contract holders**: `plugins/slopify/agents/lens-*.md` (12), `library-clerk.md`, `auditor.md`.
3. **Advisors**: `plugins/slopify/agents/advisor-*.md` (8).
4. **Producers and operations**:
   - `plugins/slopify/agents/{coder,writer,qa,pusher,watcher}.md`;
   - `plugins/slopify/references/{pusher-board,pusher-forge,pusher-ledger,writer-card,writer-findings}.md`;
   - `plugins/slopify/references/writer-specification.md`: replace its second paragraph with the clarification-only rule quoted under [references](#auditor-bootstrap-and-references), and change its last sentence to "A requested card is prepared as local content; filing it is `pusher`'s job.";
   - delete `plugins/slopify/references/claim-correction.md`.
5. **`shape` and `reproduce-bug`**: `plugins/slopify/workflows/{shape,reproduce-bug}.js`.
6. **`deliver-story` and `deliver-bugfix`**: `plugins/slopify/workflows/{deliver-story,deliver-bugfix}.js`.
7. **`deliver-spike`**: `plugins/slopify/workflows/deliver-spike.js`.
8. **`review-pr`**: `plugins/slopify/workflows/review-pr.js`.
9. **Evals**: `plugins/slopify/evals/{shape-triggers,deliver-story-triggers,deliver-bugfix-triggers,deliver-spike-triggers,reproduce-bug-triggers,review-pr-triggers,shape-not-automatic,deliver-not-automatic,shape-smoke,deliver-story-smoke,deliver-bugfix-smoke,deliver-spike-smoke,reproduce-bug-smoke,review-pr-smoke}/**`, with `deliver-smoke` moved to `deliver-bugfix-smoke` and its old graders removed.
10. **Docs and removal** (last, after 1–9 land):
    - delete `plugins/slopify/skills/{shape,deliver}/`;
    - rewrite `README.md`;
    - update `CLAUDE.md`, `plugins/slopify/.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`;
    - run the checks block and fix any output by sending it back to the owning task.

## Open decisions

None that block implementation. To confirm in Task 0, with the fallbacks stated there:

- a 9-minute Bash poll inside one `watcher` dispatch;
- `resumeFromRunId` with a named plugin workflow.
