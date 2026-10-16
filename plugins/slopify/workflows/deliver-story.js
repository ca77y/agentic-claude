export const meta = {
  name: 'deliver-story',
  description:
    "Deliver a story through a verified pull request: scouts and the library gather evidence, the how advisors judge the approach, a writer writes a spec that fresh lenses must pass before any code, coders implement, a fresh qa validates, pusher publishes, and review-pr runs the review loop",
  whenToUse:
    "Run only when the user invokes /slopify:deliver-story or asks for the slopify deliver-story workflow. Args: {story, projectRoot?, answers?}, or the story as a plain string; story is a card identifier or URL, or the story text; projectRoot defaults to the session project directory; answers maps a decision id from a blocked result to its answer when rerunning.",
  phases: [
    {
      title: "Locate",
      detail:
        "scout-card reads the story, then scout-checkpoint reports the run's durable state",
    },
    {
      title: "Workspace",
      detail: "pusher creates or recovers the story worktree and starts delivery",
    },
    {
      title: "Gather",
      detail:
        "scout-code, scout-tests, scout-docs, scout-history, and library-reader in parallel",
    },
    {
      title: "Approach",
      detail:
        "writer outlines the approach; scout-upstream-docs and scout-known-issues per dependency",
    },
    {
      title: "Advise",
      detail:
        "advisor-architecture, advisor-performance, advisor-risk, and advisor-security in parallel",
    },
    {
      title: "Spec",
      detail: "writer writes or revises the spec from the story and the advice",
    },
    {
      title: "Spec gate",
      detail:
        "lens-scope and lens-consistency must pass the spec revision, then pusher commits it",
    },
    {
      title: "Implement",
      detail: "one coder per task and a writer for documentation",
    },
    {
      title: "Validate",
      detail:
        "qa and lens-docs judge the candidate revision, then pusher commits it",
    },
    {
      title: "Publish",
      detail: "pusher pushes, opens or updates the PR, and fires the review",
    },
    {
      title: "Review",
      detail: "the review-pr workflow runs the review loop as a sub-workflow",
    },
  ],
};

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
// parenthetical remark, or by a full stop, is the value.
const SHAPES = {
  path: /^\/[\w@.+\- /]+$/,
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
  const tok = (m ? m[1] : t).replace(/[.,;:]+$/, "");
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

// kind: 'story' | 'decision' | 'prerequisite' | 'validation' | 'input'
function blocked(workflow, step, needs, extra) {
  return { status: "blocked", workflow, step, needs, ...(extra || {}) };
}
// END slopify family schemas

// ---- Local schemas ----------------------------------------------------------

const CONTEXT_SCHEMA = {
  type: "object",
  required: ["summary", "supported", "gaps"],
  properties: {
    summary: {
      type: "string",
      description: "What the existing library already supports about the story",
    },
    supported: {
      ...STRINGS,
      description:
        "Supported claims, each with the library file and heading it comes from",
    },
    gaps: {
      ...STRINGS,
      description:
        "What the library does not cover, stale or contested material included",
    },
  },
};

const APPROACH_SCHEMA = {
  type: "object",
  required: [
    "approach",
    "alternatives",
    "dependencies",
    "openDecisions",
    "storyBlockers",
  ],
  properties: {
    approach: { type: "string" },
    alternatives: STRINGS,
    dependencies: {
      ...STRINGS,
      description:
        "Outside libraries or services the approach relies on; empty when none",
    },
    openDecisions: {
      ...STRINGS,
      description: "Decisions only the user can make; empty when none",
    },
    storyBlockers: {
      ...STRINGS,
      description:
        "Reasons the story is unbuildable or contradictory as stated; empty when none",
    },
  },
};

const WRITER_SCHEMA = {
  type: "object",
  required: [
    "produced",
    "revision",
    "openDecisions",
    "storyBlockers",
    "tasks",
    "docs",
  ],
  properties: {
    produced: { ...STRINGS, description: "Absolute paths written" },
    revision: {
      type: "string",
      description: "git hash-object of the main artifact",
    },
    openDecisions: {
      ...STRINGS,
      description: "Decisions only the user can make; empty when none",
    },
    storyBlockers: {
      ...STRINGS,
      description:
        "Reasons the story is unbuildable or a criterion is wrong as stated; empty when none",
    },
    tasks: {
      type: "array",
      description: "Spec only: the tasks, with disjoint paths; empty otherwise",
      items: {
        type: "object",
        required: ["id", "summary", "paths"],
        properties: {
          id: { type: "string" },
          summary: { type: "string" },
          paths: {
            ...STRINGS,
            description:
              "Files or directories the task may write, relative to the worktree root, no globs",
          },
        },
      },
    },
    docs: {
      ...STRINGS,
      description:
        "Spec only: documentation files to update, relative to the worktree root; empty otherwise",
    },
  },
};

const CODER_SCHEMA = {
  type: "object",
  required: ["changed", "tests", "ran", "revision", "open", "specMismatch"],
  properties: {
    changed: { ...STRINGS, description: "Paths changed, relative to the worktree root" },
    tests: { ...STRINGS, description: "Test paths added or changed" },
    ran: { ...STRINGS, description: "Each command and its result" },
    revision: {
      type: "string",
      description: "The revision left, as the brief defines it",
    },
    open: STRINGS,
    specMismatch: {
      type: "string",
      description:
        "Why the spec cannot be implemented as written, or an empty string when it can",
    },
    steps: STRINGS,
    observed: { type: "string" },
    measurements: {
      type: "array",
      items: {
        type: "object",
        required: ["claim", "value", "command"],
        properties: {
          claim: { type: "string" },
          value: { type: "string" },
          command: { type: "string" },
        },
      },
    },
  },
};

const PUSHER_SCHEMA = {
  type: "object",
  required: ["done", "operations", "unmet"],
  properties: {
    done: { type: "boolean" },
    operations: {
      type: "array",
      items: {
        type: "object",
        required: ["op", "result", "reference"],
        properties: {
          op: { type: "string" },
          result: { type: "string" },
          reference: {
            type: "string",
            description:
              "A commit sha, PR URL or path, card id, or worktree path",
          },
        },
      },
    },
    unmet: STRINGS,
  },
};

// ---- Args -------------------------------------------------------------------

// `args` may arrive as the raw string rather than a parsed object. A JSON object is the
// input; any other string is the story.
function normalize(a) {
  if (typeof a !== "string") return a;
  const text = a.trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed;
    if (typeof parsed === "string") return { story: parsed.trim() };
  } catch (e) {
    // not JSON: the string is the story
  }
  return { story: text };
}

const input = normalize(args) || {};
const storyArg = typeof input.story === "string" ? input.story.trim() : "";
const projectRoot =
  typeof input.projectRoot === "string" ? input.projectRoot.trim() : "";
const answers =
  input.answers && typeof input.answers === "object" ? input.answers : {};

if (!storyArg) {
  return {
    status: "not-started",
    next: "Ask the user for the story: a card identifier or URL, or the story text. Then invoke again.",
  };
}

// ---- Constants and state ----------------------------------------------------

const WORKFLOW = "deliver-story";
const MAX_FAILURES = 3;
const RERUN =
  "Invoke /slopify:deliver-story again with the same args; add answers.<id> for each decision. In this session, pass resumeFromRunId to reuse completed steps.";
const WHERE = projectRoot
  ? `The project is at ${projectRoot}; address files by absolute path under it.`
  : "The project is the session project directory; address files by absolute path.";
const NO_WRITES =
  "Do not commit, push, branch, or change the board or forge; pusher does that.";
const DIRTY_SENTENCE =
  "Uncommitted changes in these paths come from an interrupted run of this step; inspect them, keep what serves your assignment, and continue from them rather than starting over.";
const DECIDE =
  "Decide anything that does not change the story's goal, scope, or acceptance criteria, and record it as a labelled assumption (\"Assumption: ...\"). Raise openDecisions only for a choice that would change the outcome or contradict the story; otherwise leave openDecisions empty.";
// The candidate is the worktree's current state; its label is an identifier, not a git object.
const candidateNote = (cand) =>
  `The candidate is the worktree's current state: HEAD plus its uncommitted changes. "${cand}" is an identifier for that state, not a git object, so do not resolve it with git. Report it back unchanged in evaluated.`;
const AUTH =
  "Authorization, from the user's invocation of /slopify:deliver-story: the story branch and worktree, attributable commits, a push once the gates have passed, opening or updating this task's PR, and the declared review trigger. It does not authorize merging, releases, any other message, rewriting docs/BOARD.md or docs/FORGE.md, or changing a card's content. Work exactly as docs/BOARD.md and docs/FORGE.md declare; an operation that is not bound is unmet, never improvised. Stage explicit paths only.";

const completed = [];
const skipped = [];
const attempts = [];
const verification = [];
const limits = [];
const failures = { spec: 0, implementation: 0 };
const state = {
  worktree: "",
  branch: "",
  ledger: "",
  specPath: "",
  specHash: "",
  specExists: false,
  pr: "",
};
let runLinePending = true;

function done(step) {
  completed.push(step);
}
function skip(step) {
  skipped.push(step);
  completed.push(step);
}
function need(step, n, kind, what, evidence) {
  return { id: `${step}-${n}`, kind, what, evidence: evidence || "" };
}
function stop(step, needs) {
  const checkpoint = {};
  if (state.worktree) checkpoint.worktree = state.worktree;
  if (state.branch) checkpoint.branch = state.branch;
  if (state.specExists) checkpoint.spec = state.specPath;
  if (state.ledger) checkpoint.ledger = state.ledger;
  if (state.pr) checkpoint.pr = state.pr;
  return blocked(WORKFLOW, step, needs, {
    completed: [...completed],
    checkpoint,
    attempts,
    rerun: RERUN,
  });
}
// Count a failure against a gate; true when the gate's budget is spent.
function fail(gate, approach, failed) {
  failures[gate] += 1;
  attempts.push({ gate, approach, failed });
  return failures[gate] >= MAX_FAILURES;
}
function exhausted(step, gate) {
  const last = attempts.filter((a) => a.gate === gate).slice(-MAX_FAILURES);
  return stop(step, [
    need(
      step,
      1,
      "validation",
      `A ${gate} that passes its gate; ${MAX_FAILURES} attempts failed.`,
      last.map((a) => `${a.approach}: ${a.failed}`).join(" | "),
    ),
  ]);
}

// ---- Helpers ----------------------------------------------------------------

const list = (items) =>
  items && items.length ? items.map((x) => `- ${x}`).join("\n") : "- none";
const slugOf = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join("-");
const clean = (v) => (absent(v) ? "" : String(v).trim());
const val = (res, key) => clean(fact(res, key));
const isRel = (p) => shaped("rel", p) === p;
const splitList = (v) =>
  absent(v)
    ? []
    : v
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

function rel(p) {
  let t = String(p || "").trim().replace(/^\.\//, "");
  if (state.worktree && t.startsWith(state.worktree + "/"))
    t = t.slice(state.worktree.length + 1);
  return t.replace(/\/+$/, "");
}
function within(p, scope) {
  const a = rel(p);
  const b = rel(scope);
  return !!a && !!b && (a === b || a.startsWith(b + "/"));
}
function overlaps(x, y) {
  return x.some((p) => y.some((q) => within(p, q) || within(q, p)));
}
function pathOf(location) {
  const m = /^(.*?)(?::\d+(?:-\d+)?)?$/.exec(String(location || "").trim());
  return rel(m ? m[1] : location);
}
function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

// Evidence from a scout, for a later prompt. A null scout is a gap, not an absence.
function show(label, r) {
  if (!r) return `${label}: the scout returned nothing, which is a gap, not an absence`;
  const ev = (r.evidence || [])
    .map((e) => `  - ${e.source} @ ${e.location}: ${e.excerpt}`)
    .join("\n");
  const gaps = r.gaps && r.gaps.length ? `\n  Gaps: ${r.gaps.join("; ")}` : "";
  return `${label}: ${r.answer}${ev ? `\n${ev}` : ""}${gaps}`;
}

function passed(v) {
  return (
    !!v &&
    v.verdict === "pass" &&
    !(v.findings || []).some((f) => f.blocking)
  );
}
// A verdict is usable only when it is on the revision it was briefed with and is coherent: a
// fail names a blocking finding, a pass names none. A null or unusable verdict is re-run, not fixed.
function usable(v, revision) {
  if (!v || !revision || !sameRev(revision, v.evaluated)) return false;
  const blocking = (v.findings || []).some((f) => f.blocking);
  if (v.verdict === "fail") return blocking;
  if (v.verdict === "pass") return !blocking;
  return true;
}
// What a fixer can act on: a fail's blocking findings, and what an unverified verdict could not check.
function blockingOf(name, v) {
  if (!v || v.verdict === "pass") return [];
  const out = (v.findings || []).filter((f) => f.blocking).map((f) => ({ from: name, ...f }));
  if (v.verdict === "unverified") {
    const lim = v.limits && !absent(v.limits, true) ? v.limits : "";
    out.push({
      from: name,
      location: name,
      problem: `could not check${lim ? `: ${lim}` : " (no reason given)"}`,
      blocking: true,
    });
  }
  return out;
}
// Dispatch validators, and re-run any whose verdict is missing or on another revision. Those
// re-runs have their own bound and spend neither the spec nor the implementation budget.
async function judge(items, revision, step) {
  const out = new Array(items.length).fill(null);
  let rounds = 0;
  while (true) {
    const todo = items.map((_, i) => i).filter((i) => !usable(out[i], revision));
    if (!todo.length) return { verdicts: out };
    if (rounds >= MAX_FAILURES) {
      attempts.push({
        gate: "validator",
        approach: `${todo.map((i) => items[i].name).join(", ")} on ${revision}`,
        failed: "no usable verdict after repeated dispatches",
      });
      return {
        stop: stop(step, [
          need(step, 1, "validation", `A usable verdict from ${todo.map((i) => items[i].name).join(", ")} on revision ${revision}.`, `${rounds} dispatches returned no verdict, a verdict on another revision, or a fail with no blocking finding`),
        ]),
      };
    }
    if (rounds > 0)
      attempts.push({
        gate: "validator",
        approach: `re-run ${todo.map((i) => items[i].name).join(", ")}`,
        failed: "no verdict, or a verdict on another revision",
      });
    const res = await parallel(todo.map((i) => () => items[i].call()));
    todo.forEach((i, k) => (out[i] = res[k]));
    rounds += 1;
  }
}
const findingText = (f) =>
  `${f.from} (${f.blocking ? "blocking" : "note"}) at ${f.location}: ${f.problem}`;
function record(name, v, revision) {
  verification.push({
    agent: name,
    verdict: v ? v.verdict : "none",
    evaluated: v ? v.evaluated : revision,
    findings: v ? (v.findings || []).length : 0,
  });
}

// Ledger lines ride on the next pusher dispatch; the run line goes first.
function takeLines(lines) {
  const out = [];
  if (runLinePending) {
    out.push(
      `run <n, one more than the highest run number in the ledger, or 1>: ${WORKFLOW} ${storyArg
        .replace(/\s+/g, " ")
        .slice(0, 80)} | worktree ${state.worktree || "<the worktree path>"} | branch ${state.branch || "<the branch name>"}`,
    );
    runLinePending = false;
  }
  return out.concat(lines || []);
}
function pushBrief(instruction, lines, ledgerNote) {
  const ln = takeLines(lines);
  return `${WHERE}
You are the only agent in this workflow that acts on the board and forge. ${AUTH}

Worktree: ${state.worktree || "(not created yet)"}. Ledger: ${ledgerNote || `${state.worktree}/.tmp/ledger.md`}.

${instruction}

${
  ln.length
    ? `Append these lines, in this order, to the ledger (create it, with its directory, if absent). Stamp each with the current time in front and fill every <placeholder> from what you just did:\n${ln.map((l) => `- ${l}`).join("\n")}`
    : "Append no ledger lines."
}

Report each operation you performed as an operations entry, named worktree, branch, delivery-start, commit, push, pr, review-trigger, or ledger, with its reference. Set done only when every operation asked for is complete; list each one that is unbound or failed in unmet.`;
}

const pushOk = (r) =>
  !!r && r.done === true && !(r.unmet && r.unmet.length);
const opRef = (r, name) => {
  const o = ((r && r.operations) || []).find(
    (x) => String(x.op).toLowerCase() === name,
  );
  return o ? String(o.reference || "").trim() : "";
};
function pushStop(step, r) {
  return stop(step, [
    need(
      step,
      1,
      "prerequisite",
      "An operation that docs/BOARD.md or docs/FORGE.md bind, and the authorization to run it.",
      r ? (r.unmet || []).join("; ") || "pusher reported the work incomplete" : "pusher did not return",
    ),
  ]);
}

// Each dispatch of a producer, validator, or operator names its agent type literally.
function callWriter(prompt, label, phaseTitle, schema) {
  return agent(prompt, {
    agentType: "slopify:writer",
    label,
    phase: phaseTitle,
    schema,
  });
}
function callCoder(prompt, label, phaseTitle) {
  return agent(prompt, {
    agentType: "slopify:coder",
    label,
    phase: phaseTitle,
    schema: CODER_SCHEMA,
  });
}
function callQa(prompt, label, phaseTitle) {
  return agent(prompt, {
    agentType: "slopify:qa",
    label,
    phase: phaseTitle,
    schema: LENS_SCHEMA,
  });
}
function callPusher(prompt, label, phaseTitle) {
  return agent(prompt, {
    agentType: "slopify:pusher",
    label,
    phase: phaseTitle,
    schema: PUSHER_SCHEMA,
  });
}
function callReader(prompt, label, phaseTitle) {
  return agent(prompt, {
    agentType: "slopify:library-reader",
    label,
    phase: phaseTitle,
    schema: CONTEXT_SCHEMA,
  });
}

// Answers belong to the step that raised the id, and only that step's prompt carries them.
function answersFor(step) {
  const mine = Object.entries(answers).filter(([id]) => id.startsWith(`${step}-`));
  return mine.length
    ? `\nThe user has answered decisions an earlier run of this step raised; treat each as settled and do not raise it again:\n${mine.map(([id, a]) => `- ${id}: ${a}`).join("\n")}\n`
    : "";
}

// ---- Checkpoint parsing -----------------------------------------------------

// A ledger value is "<line number>|<line text>" when the scout numbered it, else the bare line.
function ledgerLine(v) {
  const m = /^(\d+)\|([\s\S]*)$/.exec(String(v || "").trim());
  return m ? { n: Number(m[1]), text: m[2].trim() } : { n: NaN, text: String(v || "").trim() };
}
const HASH = "[0-9a-f]{7,64}";
function parseDoneSpec(v) {
  if (!v) return null;
  const l = ledgerLine(v);
  const m = new RegExp(
    `done spec (.*)@(${HASH})\\s+commit\\s+(\\S+)\\s+story\\s+(${HASH})(?:\\s+test\\s+(.+))?\\s*$`,
  ).exec(l.text);
  return m
    ? { n: l.n, path: m[1].trim(), hash: m[2], commit: m[3], story: m[4], test: (m[5] || "").trim() }
    : null;
}
function parseDoneImplement(v) {
  if (!v) return null;
  const l = ledgerLine(v);
  const m = new RegExp(
    `done implement\\s+commit\\s+(\\S+)\\s+spec\\s+(${HASH})(\\s+pushed)?\\s*$`,
  ).exec(l.text);
  return m ? { n: l.n, commit: m[1], spec: m[2], pushed: !!m[3] } : null;
}
function parseDonePublish(v) {
  if (!v) return null;
  const l = ledgerLine(v);
  return /done publish\s+\S/.test(l.text) ? { n: l.n } : null;
}
function parseSpec(v) {
  const m = new RegExp(`^(\\S+?)(?:@|\\s+)(${HASH})\\s*$`).exec(String(v || "").trim());
  return m ? { path: m[1], hash: m[2] } : null;
}

// A short account of what passed, for the session to relay.
function makeReport(extra) {
  const outcome = (r) => {
    if (!r) return "none";
    const o = r.review !== undefined ? r.review : r.status;
    const text = typeof o === "string" ? o : JSON.stringify(o);
    const rounds = Array.isArray(r.rounds) ? `${r.rounds.length} round(s)` : "";
    const unfixed = Array.isArray(r.unfixed) && r.unfixed.length ? `${r.unfixed.length} finding(s) left unfixed` : "";
    return [text, rounds, unfixed].filter(Boolean).join("; ");
  };
  return [
    `${WORKFLOW} done.`,
    ...(extra || []),
    verification.length
      ? `Verification this run: ${verification.map((v) => `${v.agent} ${v.verdict} on ${v.evaluated}`).join("; ")}.`
      : "Verification: every gate was already satisfied by earlier checkpoints; no new verdicts this run.",
    skipped.length ? `Skipped from checkpoints: ${skipped.join(", ")}.` : "",
    `PR: ${state.pr}.`,
    `Review: ${outcome(review)}.`,
    limits.length ? `Limits: ${limits.join(" | ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ---- Plan -------------------------------------------------------------------

let plan = null; // { tasks: [{id, summary, paths}], docs: [path] }

// With the spec already committed, the tasks and docs come back from the spec itself.
async function recoverPlan() {
  const r = await scout("scout-docs",
    `${WHERE}
Read the spec at ${state.specPath} and report only its task list and the documentation it says to update; quote the spec, claim nothing of your own. Report one evidence item per task: source "task:<id>", location the spec path, excerpt a JSON object {"summary": "...", "paths": ["..."]} with the task's paths relative to the worktree root. Report one evidence item with source "docs" and excerpt a JSON array of the documentation paths to update (an empty array when none). Quote the spec; make no changes.`,
    { label: "read spec tasks", phase: "Implement" },
  );
  const tasks = [];
  let docs = [];
  for (const e of (r && r.evidence) || []) {
    try {
      if (/^task:/.test(e.source)) {
        const j = JSON.parse(e.excerpt);
        tasks.push({
          id: e.source.slice(5),
          summary: String(j.summary || ""),
          paths: (j.paths || []).map(rel),
        });
      } else if (e.source === "docs") {
        docs = JSON.parse(e.excerpt).map(rel);
      }
    } catch (err) {
      // an unreadable item is dropped; an empty plan stops the run below
    }
  }
  return tasks.length ? { tasks, docs } : null;
}

// ---- Locate -----------------------------------------------------------------

phase("Locate");
const cardRes = await scout("scout-card",
  `${WHERE}
Read the one card this delivery names, through the read bindings in docs/BOARD.md, or, when the argument below is the story text itself, take that text as the story. Report these evidence items, each with source set to the item name and excerpt set to its value; leave out an item that does not exist:
- card: the card identifier, or none when the argument is story text or there is no board
- story-source: card, text, or none
- story: the story text exactly as you wrote it for hashing (title line, empty line, body), or the argument verbatim for story text
- story-revision: the story revision digest
- field-re: the field regex you used for it
- criteria: the story's acceptance criteria, one per line, or the single word none when it states none
- branch: the branch name the board gives the card, or the single word none
- spec-path: the repository-relative spec path docs/BOARD.md's naming gives this card, built from the card identifier and the card title's lowercase kebab slug as the declaration's pattern says (for example docs/specs/<identifier>-<slug>.md), or the single word none
- relations: related, blocking, and blocked-by cards
- linked-specs: specs the card links
Change nothing on the board or forge.

Argument:
<<<ARG
${storyArg}
ARG>>>`,
  { label: "read the story", phase: "Locate" },
);
if (!cardRes) {
  return stop("locate", [
    need("locate", 1, "prerequisite", "A readable story: the card, or the story text.", "scout-card did not return"),
  ]);
}
const storySource = ((/^\s*(card|text|none)\b/i.exec(fact(cardRes, "story-source")) || [])[1] || "").toLowerCase();
const story = storySource === "text" ? storyArg : fact(cardRes, "story");
const storyRevision = shaped("sha", fact(cardRes, "story-revision"));
if (!story || storySource === "none") {
  return stop("locate", [
    need("locate", 1, "input", "A story the board can read, or the story text.", (cardRes.gaps || []).join("; ") || cardRes.answer),
  ]);
}
if (!storyRevision) {
  return stop("locate", [
    need("locate", 1, "prerequisite", "The story revision digest from scout-card.", cardRes.answer),
  ]);
}
const criteria = fact(cardRes, "criteria");
// Only a bare "none" reply means no criteria; a criterion that opens with "Missing ..." is one.
if (absent(criteria, true) && !/\n/.test(criteria.trim())) {
  return stop("locate", [
    need("locate", 1, "story", "The story states no acceptance criteria; it needs observable ones from shape.", cardRes.answer),
  ]);
}
const cardId = shaped("id", val(cardRes, "card"));
const boardBranch = shaped("branch", val(cardRes, "branch"));
const slug = slugOf(cardId) || slugged(storyArg, "story");
// The card title is the first line of a card-backed story; its lowercase kebab slug names the spec.
const titleSlug = (storySource === "card" ? story.split("\n")[0].replace(/^#+\s*/, "") : "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 60)
  .replace(/-+$/, "");
const specRel =
  [shaped("rel", val(cardRes, "spec-path"))].filter((p) => /\.md$/.test(p))[0] ||
  `docs/specs/${[cardId.toLowerCase().replace(/[^a-z0-9]+/g, "-"), titleSlug].filter(Boolean).join("-") || slug}.md`;
const STORY_BLOCK = `The story, verbatim, is the acceptance source (story revision ${storyRevision}):
<<<STORY
${story}
STORY>>>`;

const cpRes = await scout("scout-checkpoint",
  `${WHERE}
Report where this run stands. It is the delivery of ${cardId ? `card ${cardId}` : `the story "${slug}"`}${boardBranch ? `; the board gives the branch name ${boardBranch}` : ""}. The story's spec path, relative to the worktree root, is ${specRel}.
Report these keys, each as an evidence item with source set to the key; leave out a key that does not exist:
- worktree, branch, head, dirty (comma-separated paths relative to the worktree root, or none), ledger
- ledger-story: the story revision on the last done spec line
- done-spec, done-implement, done-publish: the last such ledger line, with its leading timestamp removed and the ledger line number put in front as "<line number>|"
- review-fired, review-ended
- spec: "<absolute path>@<git hash-object>" of the spec at the path above
- pr: the PR reference on the first line, then its description`,
  { label: "read checkpoints", phase: "Locate" },
);
if (!cpRes) {
  return stop("locate", [
    need("locate", 1, "prerequisite", "The run's checkpoints, to know which steps are complete.", "scout-checkpoint did not return"),
  ]);
}
const sameHash = (a, b) => !!a && !!b && (a.startsWith(b) || b.startsWith(a));
const cpWorktree = shaped("path", val(cpRes, "worktree"));
if (cpWorktree.startsWith("/")) state.worktree = cpWorktree.replace(/\/+$/, "");
state.branch = shaped("branch", val(cpRes, "branch")) || boardBranch;
state.ledger = shaped("path", val(cpRes, "ledger"));
state.pr = shaped("ref", val(cpRes, "pr"));
const cpDirty = splitList(fact(cpRes, "dirty")).filter((p) => isRel(p) && !/^\.tmp(\/|$)/.test(p));
// Only the story worktree's copy of the spec counts. Before the worktree exists a scout can only
// report the main checkout's copy, and a path outside the worktree is another file.
const cpSpecRaw = parseSpec(val(cpRes, "spec"));
const cpSpec =
  cpSpecRaw && state.worktree
    ? {
        ...cpSpecRaw,
        path: cpSpecRaw.path.startsWith("/") ? cpSpecRaw.path : `${state.worktree}/${rel(cpSpecRaw.path)}`,
      }
    : null;
if (cpSpec && cpSpec.path.startsWith(state.worktree + "/")) {
  state.specPath = cpSpec.path;
  state.specHash = cpSpec.hash;
  state.specExists = true;
}
// With the spec already on disk, its revision is its checkpointed hash until a writer revises it.
let specRevision = state.specHash;
const doneSpec = parseDoneSpec(val(cpRes, "done-spec"));
const doneImpl = parseDoneImplement(val(cpRes, "done-implement"));
const donePub = parseDonePublish(val(cpRes, "done-publish"));
const ledgerStory = shaped("sha", val(cpRes, "ledger-story")) || (doneSpec ? doneSpec.story : "");

// The currency chain: each link depends on the one before it.
const specCurrent =
  !!doneSpec &&
  state.specExists &&
  sameHash(doneSpec.hash, state.specHash) &&
  !!ledgerStory &&
  sameHash(ledgerStory, storyRevision);
const implCurrent = specCurrent && !!doneImpl && sameHash(doneImpl.spec, state.specHash);
const publishCurrent =
  implCurrent && !!donePub && (doneImpl.pushed || (doneImpl.n < donePub.n));
done("locate");

// ---- Workspace --------------------------------------------------------------

phase("Workspace");
if (state.worktree) {
  skip("workspace");
} else {
  const r = await callPusher(
    pushBrief(
      `Create or recover the story worktree and branch that docs/FORGE.md declares for ${cardId ? `card ${cardId}` : `the story "${slug}"`}${boardBranch ? ` (the board gives the branch name ${boardBranch})` : ""}. ${cardId ? "Then perform the delivery-start operation docs/BOARD.md declares for the card (for example its status transition), only as bound." : "There is no card, so perform no board operation."} Change no card content.`,
      [],
      "<worktree>/.tmp/ledger.md at the root of the worktree you create or recover",
    ),
    "create the worktree",
    "Workspace",
  );
  if (!pushOk(r)) return pushStop("workspace", r);
  const wt = opRef(r, "worktree");
  if (!wt.startsWith("/")) {
    return stop("workspace", [
      need("workspace", 1, "prerequisite", "The absolute path of the story worktree.", JSON.stringify(r.operations)),
    ]);
  }
  state.worktree = wt.replace(/\/+$/, "");
  state.branch = opRef(r, "branch") || state.branch;
  done("workspace");
}
if (!state.ledger) state.ledger = `${state.worktree}/.tmp/ledger.md`;
if (!state.specPath) state.specPath = `${state.worktree}/${specRel}`;

// ---- Spec -------------------------------------------------------------------

let gathered = "";
let approachText = "(the approach is in the existing spec)";
let adviceText = "(the advisors' views are in the existing spec)";
let specCommit = doneSpec ? doneSpec.commit : "";
const ADVISORS = [
  "advisor-architecture",
  "advisor-performance",
  "advisor-risk",
  "advisor-security",
];

// Write or revise the spec, then have fresh lenses judge that exact revision, then commit it.
async function specGate(findings) {
  let pending = findings || [];
  while (true) {
    phase("Spec");
    const exists = state.specExists;
    const w = await callWriter(
      `${WHERE}
Work in the story worktree ${state.worktree}; address every file by absolute path. ${exists ? `Revise the spec at ${state.specPath} against the story below.` : `Write the spec at ${state.specPath}.`} Write only that one file. ${NO_WRITES}

The spec holds: the problem and intended outcome, scope, and exclusions; the story verbatim as the acceptance source; the approach, with each advisor's view recorded as adopted or rejected and the reason; observable acceptance criteria, one behavior each, and how each is verified; and the tasks it breaks into. Return the tasks (id, summary, and paths each task may write, relative to the worktree root, files or directories, no globs, disjoint between tasks, and including the test files the task adds) and the documentation files to update as docs.

Story authority: you may clarify an ambiguous criterion in the spec without changing its meaning, keeping the original wording beside the clarification. A criterion that is wrong, or a story that cannot be built as stated, is a story blocker: report it in storyBlockers and change nothing about the goal, scope, or criteria. ${DECIDE}
${answersFor("spec")}
${STORY_BLOCK}

Approach:
${approachText}

The advisors' views:
${adviceText}

Evidence:
${gathered || "(see the existing spec)"}
${pending.length ? `\nResolve these findings:\n${list(pending)}` : ""}`,
      exists ? "revise the spec" : "write the spec",
      "Spec",
      WRITER_SCHEMA,
    );
    let problem = "";
    if (!w) problem = "the writer did not return";
    else if (w.storyBlockers && w.storyBlockers.length) {
      return stop(
        "spec",
        w.storyBlockers.map((b, i) => need("spec", i + 1, "story", b, "reported by the spec writer")),
      );
    } else if (w.openDecisions && w.openDecisions.length) {
      return stop(
        "spec",
        w.openDecisions.map((d, i) => need("spec", i + 1, "decision", d, "reported by the spec writer")),
      );
    } else if (!w.revision) problem = "the writer returned no spec revision";
    else if (!(w.produced || []).some((p) => rel(p) === rel(state.specPath)))
      problem = `the writer did not write the spec at ${state.specPath}`;
    else if (!w.tasks || !w.tasks.length || w.tasks.some((t) => !t.paths || !t.paths.length))
      problem = "the spec needs at least one task, and every task needs paths";
    if (problem) {
      pending = [problem];
      if (fail("spec", "spec draft", problem)) return exhausted("spec", "spec");
      continue;
    }
    state.specExists = true;
    specRevision = w.revision;
    plan = { tasks: w.tasks.map((t) => ({ ...t, paths: t.paths.map(rel) })), docs: (w.docs || []).map(rel) };
    done("spec");

    phase("Spec gate");
    const brief = (what) => `${WHERE}
The story worktree is ${state.worktree}. ${what}
Spec: ${state.specPath}, revision ${specRevision}. Set evaluated to exactly that revision.

${STORY_BLOCK}${pending.length ? `\n\nEarlier findings to recheck:\n${list(pending)}` : ""}`;
    const j = await judge(
      [
        { name: "lens-scope", call: () => lens("lens-scope", brief("Judge whether the spec covers the story's criteria, with no added or dropped scope."), { label: "scope", phase: "Spec gate" }) },
        { name: "lens-consistency", call: () => lens("lens-consistency", brief("Judge whether the spec agrees with the repository's constraints and its existing specs."), { label: "consistency", phase: "Spec gate" }) },
      ],
      specRevision,
      "spec-gate",
    );
    if (j.stop) return j.stop;
    const [ls, lc] = j.verdicts;
    record("lens-scope", ls, specRevision);
    record("lens-consistency", lc, specRevision);
    if (!(passed(ls) && passed(lc))) {
      pending = [...blockingOf("lens-scope", ls), ...blockingOf("lens-consistency", lc)].map(findingText);
      if (fail("spec", `spec revision ${specRevision}`, pending.join("; "))) return exhausted("spec-gate", "spec");
      continue;
    }

    const c = await callPusher(
      pushBrief(
        `Commit exactly this file, staged by explicit path: ${state.specPath}. First check that its git hash-object is ${specRevision}; if it differs, commit nothing and report that as unmet. If the file is already committed at that hash, make no commit and record the current HEAD sha in the ledger line. Use the commit convention docs/FORGE.md declares. Do not push.`,
        [`done spec ${state.specPath}@${specRevision} commit <the new commit's sha> story ${storyRevision}`],
      ),
      "commit the spec",
      "Spec gate",
    );
    if (!pushOk(c)) return pushStop("spec-gate", c);
    state.specHash = specRevision;
    specCommit = opRef(c, "commit");
    done("spec-gate");
    return null;
  }
}

if (specCurrent) {
  for (const s of ["gather", "approach", "advise", "spec", "spec-gate"]) skip(s);
} else {
  // Gather
  phase("Gather");
  const CTX = `${WHERE}\nThe story worktree is ${state.worktree}; look there.\n${STORY_BLOCK}\n`;
  const [sCode, sTests, sDocs, sHistory, lib] = await parallel([
    () => scout("scout-code", `${CTX}Find the code locations and call paths relevant to implementing this story.`, { label: "code", phase: "Gather" }),
    () => scout("scout-tests", `${CTX}Find the existing tests that cover the area this story changes, and how to run them.`, { label: "tests", phase: "Gather" }),
    () => scout("scout-docs", `${CTX}Find the documentation and specs that make claims about the area this story changes.`, { label: "docs", phase: "Gather" }),
    () => scout("scout-history", `${CTX}Find from git history and blame when and why behavior in the area this story changes was last changed.`, { label: "history", phase: "Gather" }),
    () =>
      callReader(
        `${CTX}Report what the project library already supports about this story, so supported work is not repeated. Cite each supported claim to its file and heading, and name gaps and stale or contested material. Make no internet requests and no writes.`,
        "library context",
        "Gather",
      ),
  ]);
  gathered = [
    show("Code", sCode),
    show("Tests", sTests),
    show("Docs", sDocs),
    show("History", sHistory),
    lib
      ? `Library: ${lib.summary}\n  Supported:\n${list(lib.supported)}\n  Gaps:\n${list(lib.gaps)}`
      : "Library: the library reader returned nothing, which is a gap, not an absence",
  ].join("\n");
  done("gather");

  // Approach
  phase("Approach");
  let approach = null;
  while (!approach) {
    const a = await callWriter(
      `${WHERE}
Work in the story worktree ${state.worktree}. Outline the approach for this story from the story and the evidence. Write no files; return the outline. ${NO_WRITES} Never change the story's goal, scope, or criteria. ${DECIDE}

Return: approach (concretely how to build it); alternatives (considered, and why not); dependencies (each outside library or service the approach relies on, one per entry, empty when none); openDecisions (only what the user must decide, empty when none); storyBlockers (why the story is unbuildable or contradictory as stated, empty when none).
${answersFor("approach")}
${STORY_BLOCK}

Evidence:
${gathered}`,
      "outline the approach",
      "Approach",
      APPROACH_SCHEMA,
    );
    if (a) approach = a;
    else if (fail("spec", "approach outline", "the writer did not return")) return exhausted("approach", "spec");
  }
  if (approach.storyBlockers && approach.storyBlockers.length) {
    return stop(
      "approach",
      approach.storyBlockers.map((b, i) => need("approach", i + 1, "story", b, "reported by the approach writer")),
    );
  }
  if (approach.openDecisions && approach.openDecisions.length) {
    return stop(
      "approach",
      approach.openDecisions.map((d, i) => need("approach", i + 1, "decision", d, "reported by the approach writer")),
    );
  }
  const deps = approach.dependencies || [];
  const outside = await parallel(
    deps.flatMap((d) => [
      () => scout("scout-upstream-docs", `${WHERE}\nFind the official docs and API references for ${d}: versions, limits, and deprecations relevant to this approach.\n\nApproach:\n${approach.approach}`, { label: `upstream ${d}`.slice(0, 48), phase: "Approach" }),
      () => scout("scout-known-issues", `${WHERE}\nFind pitfalls and open bugs relevant to using ${d} this way in upstream trackers and changelogs.\n\nApproach:\n${approach.approach}`, { label: `known issues ${d}`.slice(0, 48), phase: "Approach" }),
    ]),
  );
  deps.forEach((d, i) => {
    gathered += `\n${show(`Upstream docs for ${d}`, outside[2 * i])}\n${show(`Known issues for ${d}`, outside[2 * i + 1])}`;
  });
  approachText = `${approach.approach}\nAlternatives considered:\n${list(approach.alternatives)}\nDependencies:\n${list(deps)}`;
  done("approach");

  // Advise
  phase("Advise");
  const adviseBrief = `${WHERE}
Judge the approach below for this story, from your one angle, using only this evidence and the repository (read-only).

${STORY_BLOCK}

Approach:
${approachText}

Evidence:
${gathered}`;
  const advice = await parallel([
    () => advise('advisor-architecture', adviseBrief, { label: "architecture", phase: "Advise" }),
    () => advise('advisor-performance', adviseBrief, { label: "performance", phase: "Advise" }),
    () => advise('advisor-risk', adviseBrief, { label: "risk", phase: "Advise" }),
    () => advise('advisor-security', adviseBrief, { label: "security", phase: "Advise" }),
  ]);
  adviceText = ADVISORS.map((name, i) => {
    const a = advice[i];
    if (!a) return `${name}: no judgement returned`;
    return `${name}: ${a.judgement}\n  Reasons:\n${a.reasons.map((r) => `  - ${r.reason} (${r.evidence})`).join("\n")}\n  Risks:\n${list(a.risks)}\n  Conditions:\n${list(a.conditions)}`;
  }).join("\n");
  done("advise");

  const stopped = await specGate([]);
  if (stopped) return stopped;
}

// ---- Implement and validate -------------------------------------------------

const touched = new Set(); // every path a producer reported changing, for the commit
const startDirty = cpDirty;
const fixScopes = []; // paths a fix job was assigned beyond the tasks' own, validated with the rest
let candidate = "";
let docsJobs = [];

function jobPrompt(job, jobs, ctx) {
  const others = jobs.filter((j) => j !== job);
  const dirtyIn = (ctx.dirty || []).filter((p) => job.paths.some((s) => within(p, s)));
  const fnd = (ctx.findings && ctx.findings[job.id]) || [];
  return `${WHERE}
Work in the story worktree ${state.worktree}; address every file by absolute path under it. ${NO_WRITES}

Task ${job.id}: ${job.summary}
Assigned paths (write only these): ${job.paths.join(", ")}
${others.length ? `Other writers are active in: ${others.map((o) => `${o.id} (${o.paths.join(", ")})`).join("; ")}. Do not touch their paths.` : "No other writer is active."}

Spec: ${state.specPath} (revision ${specRevision}). It was validated before any code was written; implement against it. If it cannot be implemented as written, say why in specMismatch and stop; never weaken a criterion to fit.
${STORY_BLOCK}
${
  job.kind === "writer"
    ? "Update the listed documentation so it states what the spec and the implementation do; every claim must be true against the code. In revision, return the git hash-object of the main file you changed."
    : "Implement the task and the tests that would catch it regressing. Run the focused tests as you work. Report the revision you leave as your instructions describe."
}
${dirtyIn.length ? `\n${DIRTY_SENTENCE}\nPaths:\n${list(dirtyIn)}\n` : ""}${fnd.length ? `\nFix these findings, reported by an independent validator of candidate ${ctx.judged}, and change only what they require:\n${list(fnd.map(findingText))}\n` : ""}`;
}

// Coders run first, then writers, so documentation is written against code that exists. Within
// a stage, producers with disjoint paths run together; otherwise one after another.
async function runJobs(jobs, ctx) {
  const results = new Array(jobs.length).fill(null);
  for (const kind of ["coder", "writer"]) {
    const idx = jobs.map((_, i) => i).filter((i) => jobs[i].kind === kind);
    const part = idx.map((i) => jobs[i]);
    if (!part.length) continue;
    const call = (j) => {
      const prompt = jobPrompt(j, part, ctx);
      return kind === "writer"
        ? callWriter(prompt, `docs ${j.id}`, ctx.phase, WRITER_SCHEMA)
        : callCoder(prompt, `code ${j.id}`, ctx.phase);
    };
    const disjoint = !part.some((a, i) => part.some((b, k) => k > i && overlaps(a.paths, b.paths)));
    let res;
    if (part.length > 1 && disjoint) res = await parallel(part.map((j) => () => call(j)));
    else {
      res = [];
      for (const j of part) res.push(await call(j));
    }
    idx.forEach((i, k) => (results[i] = res[k]));
  }
  return results;
}

function noteWork(results) {
  for (const r of results) {
    for (const p of [...(r.changed || []), ...(r.tests || []), ...(r.produced || [])]) touched.add(rel(p));
    for (const o of r.open || []) limits.push(`open: ${o}`);
  }
}

// The candidate label is an identifier for the worktree's current state, built from what the
// producers report: the coders' revisions (a lone coder's own is the true digest), plus the
// documentation writers' revisions. After a writer-only fix, the previous code label carries on.
function candidateAfter(ran, prev) {
  const code =
    unique(ran.filter((x) => x.kind === "coder" && x.result.revision).map((x) => x.result.revision)).join("&") ||
    String(prev || "").split("~")[0];
  const docs = unique(ran.filter((x) => x.kind === "writer").map((x) => x.result.revision || "unrevised"));
  if (!code) return "";
  return docs.length ? `${code}~docs-${docs.join(",")}` : code;
}

// What gets committed: the paths the validators judged, within the tasks' and documentation's assigned
// paths and the paths a fix job was assigned, from the checkpoint's dirty list and what the producers
// reported. The rest is reported.
function commitSet(scopes) {
  const all = unique([...startDirty, ...touched]).filter((p) => p && !/^\.tmp(\/|$)/.test(p) && !within(p, state.specPath));
  const inScope = all.filter((p) => scopes.some((s) => within(p, s)));
  const outside = all.filter((p) => !inScope.includes(p));
  if (outside.length)
    limits.push(`Uncommitted paths outside the assigned paths, not committed: ${outside.join(", ")}`);
  return inScope;
}

// Returns {stop} | {mismatch} | {ok: true, candidate}.
async function implement() {
  phase("Implement");
  const jobs = plan.tasks.map((t) => ({ id: t.id, kind: "coder", summary: t.summary, paths: t.paths }));
  docsJobs = plan.docs.length
    ? [{ id: "docs", kind: "writer", summary: "Update the documentation the spec lists", paths: plan.docs }]
    : [];
  const all = [...jobs, ...docsJobs];
  const dirtyNow = unique([...startDirty, ...touched]);
  const ran = [];
  let todo = all;
  while (todo.length) {
    const res = await runJobs(todo, { dirty: dirtyNow, phase: "Implement" });
    const failed = [];
    todo.forEach((j, i) => (res[i] ? ran.push({ kind: j.kind, id: j.id, result: res[i] }) : failed.push(j)));
    noteWork(res.filter(Boolean));
    if (failed.length) {
      if (fail("implementation", `producers ${failed.map((j) => j.id).join(", ")}`, "the producer did not return"))
        return { stop: exhausted("implement", "implementation") };
    }
    todo = failed;
  }
  const mismatch = ran.map((x) => x.result.specMismatch).filter((m) => m && m.trim());
  if (mismatch.length) return { mismatch: mismatch.join("; ") };
  done("implement");
  return { ok: true, candidate: candidateAfter(ran, ""), ran };
}

// Fresh qa and lenses judge the candidate; producers fix; new validators judge again.
async function validate(first) {
  let cand = first.candidate;
  if (!cand)
    return { stop: stop("validate", [need("validate", 1, "prerequisite", "The candidate code revision.", "no producer or scout reported it")]) };
  const jobs = [...plan.tasks.map((t) => ({ id: t.id, kind: "coder", summary: t.summary, paths: t.paths })), ...docsJobs];
  let findings = null;
  let prior = [];
  let fixRound = 0;
  while (true) {
    if (findings) {
      phase("Validate");
      const byJob = {};
      const other = [];
      const looksLikePath = (p) => /^[\w@.+/-]+$/.test(p) && /[./]/.test(p);
      for (const f of findings) {
        const p = pathOf(f.location);
        const j = looksLikePath(p) ? jobs.find((x) => x.paths.some((s) => within(p, s))) : null;
        if (j) (byJob[j.id] = byJob[j.id] || []).push(f);
        else other.push(f);
      }
      const fixJobs = jobs.filter((j) => byJob[j.id] && byJob[j.id].length);
      if (other.length) {
        const extra = other.map((f) => pathOf(f.location)).filter(looksLikePath);
        fixJobs.push({
          id: "fix",
          kind: "coder",
          summary: "Fix findings that fall outside the task paths",
          paths: unique([...jobs.filter((j) => j.kind === "coder").flatMap((j) => j.paths), ...extra]),
        });
        byJob.fix = other;
      }
      for (const j of fixJobs) fixScopes.push(...j.paths);
      const res = await runJobs(fixJobs, { dirty: [], findings: byJob, judged: cand, phase: "Validate" });
      const ran = [];
      const failed = [];
      fixJobs.forEach((j, i) => (res[i] ? ran.push({ kind: j.kind, id: j.id, result: res[i] }) : failed.push(j)));
      noteWork(res.filter(Boolean));
      const mismatch = ran.map((x) => x.result.specMismatch).filter((m) => m && m.trim());
      if (mismatch.length) return { mismatch: mismatch.join("; ") };
      if (failed.length) {
        if (fail("implementation", `fix for ${failed.map((j) => j.id).join(", ")}`, "the producer did not return"))
          return { stop: exhausted("validate", "implementation") };
        continue; // the findings stay pending; try the fix again
      }
      // A fix that leaves the label unchanged still produced new work: make the label new.
      const next = candidateAfter(ran, cand);
      cand = next && next === cand ? `${next}#${++fixRound}` : next;
      if (!cand)
        return { stop: stop("validate", [need("validate", 1, "prerequisite", "The candidate code revision after the fix.", "no producer or scout reported it")]) };
      findings = null;
    }

    phase("Validate");
    const changedList = [...touched];
    const items = [
      {
        name: "qa",
        call: () =>
          callQa(
            `${WHERE}
Validate the candidate in the story worktree ${state.worktree} against the validated spec and the story. Candidate revision: ${cand}. ${candidateNote(cand)}
Spec: ${state.specPath}, revision ${specRevision}.
Changed paths:
${list(changedList)}

${STORY_BLOCK}

Run the project's tests and the checks the spec requires, judge regression coverage, and judge each acceptance criterion and the affected documentation.${prior.length ? `\n\nEarlier findings to recheck:\n${list(prior)}` : ""}`,
            "qa",
            "Validate",
          ),
      },
    ];
    if (plan.docs.length)
      items.push({
        name: "lens-docs",
        call: () =>
          lens("lens-docs",
            `${WHERE}
Judge whether the documentation claims in these files are true against the code in the story worktree ${state.worktree}. Candidate revision: ${cand}. ${candidateNote(cand)}
Files:
${list(plan.docs)}${prior.length ? `\n\nEarlier findings to recheck:\n${list(prior)}` : ""}`,
            { label: "docs", phase: "Validate" },
          ),
      });
    const jd = await judge(items, cand, "validate");
    if (jd.stop) return { stop: jd.stop };
    jd.verdicts.forEach((v, i) => record(items[i].name, v, cand));
    if (jd.verdicts.every(passed)) return { ok: true, candidate: cand };
    findings = jd.verdicts.flatMap((v, i) => blockingOf(items[i].name, v));
    prior = findings.map(findingText);
    if (fail("implementation", `candidate ${cand}`, prior.join("; "))) return { stop: exhausted("validate", "implementation") };
  }
}

let validated = null;
if (implCurrent) {
  skip("implement");
  skip("validate");
} else {
  while (true) {
    if (!plan) {
      plan = await recoverPlan();
      if (!plan) {
        return stop("implement", [
          need("implement", 1, "prerequisite", `The tasks and documentation list in the spec at ${state.specPath}.`, "scout-docs could not read them"),
        ]);
      }
    }
    const impl = await implement();
    let next = impl;
    if (impl.ok) next = await validate(impl);
    if (next.stop) return next.stop;
    if (next.mismatch) {
      // The work goes back to the spec, with the spec budget.
      if (fail("spec", "implementation against the spec", next.mismatch)) return exhausted("spec", "spec");
      const stopped = await specGate([`The implementation reports the spec cannot be implemented as written: ${next.mismatch}`]);
      if (stopped) return stopped;
      continue;
    }
    validated = next;
    break;
  }
  done("validate");
  const commitPaths = commitSet([...plan.tasks.flatMap((t) => t.paths), ...plan.docs, ...fixScopes]);
  const c = await callPusher(
    pushBrief(
      `Commit exactly these paths as they stand, staged by explicit path, with the commit convention docs/FORGE.md declares. Do not push. Commit nothing else, even if the worktree holds other uncommitted changes. If every path is already committed, make no commit and record the current HEAD sha in the ledger line.\nPaths:\n${list(commitPaths)}`,
      [`done implement commit <the new commit's sha> spec ${state.specHash}`],
    ),
    "commit the implementation",
    "Validate",
  );
  if (!pushOk(c)) return pushStop("validate", c);
}

// ---- Publish ----------------------------------------------------------------

phase("Publish");
if (publishCurrent) {
  skip("publish");
} else {
  const r = await callPusher(
    pushBrief(
      `Push the story branch ${state.branch || ""} as docs/FORGE.md declares. ${state.pr ? `A PR exists (${state.pr}); update it as docs/FORGE.md declares and perform no board operation.` : "Open the PR as docs/FORGE.md declares, then perform the board operations docs/BOARD.md declares for when the PR opens (for example attaching it and a status transition)."} The PR describes the story, links the spec at ${state.specPath}, and lists this verification:\n${list(verification.map((v) => `${v.agent}: ${v.verdict} on ${v.evaluated}`))}\nThen fire the review trigger docs/FORGE.md declares, unless opening the PR fires it; if none is declared, fire none and do not report that as unmet. Change no card content.`,
      [
        `done publish <the PR reference> commit <HEAD sha>`,
        `review 1 fired <trigger time; the PR's creation time when opening it fires the review> (write this line only if a review was requested)`,
      ],
    ),
    "publish the PR",
    "Publish",
  );
  if (!pushOk(r)) return pushStop("publish", r);
  state.pr = opRef(r, "pr") || state.pr;
  if (!state.pr) {
    return stop("publish", [
      need("publish", 1, "prerequisite", "The PR reference.", JSON.stringify(r.operations)),
    ]);
  }
  done("publish");
}

// ---- Review -----------------------------------------------------------------

phase("Review");
if (!state.pr) {
  return stop("review", [
    need("review", 1, "prerequisite", "The PR reference, to start the review.", "the checkpoint and the ledger name no PR"),
  ]);
}
let review = null;
try {
  review = await workflow("slopify:review-pr", {
    pr: state.pr,
    worktree: state.worktree,
    spec: state.specPath,
    story,
    projectRoot: projectRoot || undefined,
    answers,
  });
} catch (e) {
  return stop("review", [
    need("review", 1, "prerequisite", "The review-pr workflow, which could not run.", String(e && e.message ? e.message : e)),
  ]);
}
if (!review) {
  return stop("review", [
    need("review", 1, "prerequisite", "A result from the review-pr workflow.", "it returned nothing"),
  ]);
}
if (review.status === "blocked") {
  return {
    ...review,
    completed: [...completed, ...(review.completed || []).map((s) => `review-pr:${s}`)],
  };
}
if (review.status !== "done") {
  return stop("review", [
    need("review", 1, "prerequisite", "A finished review of the PR.", `the review-pr workflow returned status ${JSON.stringify(review.status)}`),
  ]);
}
done("review");

return {
  status: "done",
  workflow: WORKFLOW,
  skipped,
  attempts,
  completed,
  pr: state.pr,
  spec: state.specPath,
  verification,
  review,
  limits,
  report: makeReport([`Spec: ${state.specPath}.`]),
};
