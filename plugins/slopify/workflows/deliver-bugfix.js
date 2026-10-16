export const meta = {
  name: 'deliver-bugfix',
  description:
    "Deliver a bug fix through a verified pull request: scouts gather evidence, a coder writes a regression test that shows the failure and a fresh lens-repro confirms it, a writer writes a spec only as large as the fix that a fresh lens-scope must pass, a coder fixes, a fresh qa and lens-regression validate that the test fails before the fix and passes after it, pusher publishes, and review-pr runs the review loop",
  whenToUse:
    "Run only when the user invokes /slopify:deliver-bugfix or asks for the slopify deliver-bugfix workflow. Args: {bug, projectRoot?, answers?}, or the bug as a plain string; bug is a card identifier or URL, or the report text; projectRoot defaults to the session project directory; answers maps a decision id from a blocked result to its answer when rerunning.",
  phases: [
    {
      title: "Locate",
      detail:
        "scout-card reads the report, then scout-checkpoint reports the run's durable state",
    },
    {
      title: "Workspace",
      detail: "pusher creates or recovers the worktree and starts delivery",
    },
    {
      title: "Gather",
      detail: "scout-code, scout-tests, and scout-history in parallel",
    },
    {
      title: "Reproduce",
      detail:
        "coder writes a regression test that shows the failure; lens-repro judges it",
    },
    {
      title: "Spec",
      detail: "writer writes the small spec: bug, cause, fix, test, verification",
    },
    {
      title: "Spec gate",
      detail:
        "lens-scope (and lens-consistency when the spec changes a documented contract) must pass; pusher commits the spec and the test",
    },
    { title: "Fix", detail: "coder fixes and leaves the regression test as it is" },
    {
      title: "Validate",
      detail:
        "qa and lens-regression judge the candidate; pusher commits the fix",
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

// kind: 'story' | 'decision' | 'prerequisite' | 'validation' | 'input'
function blocked(workflow, step, needs, extra) {
  return { status: "blocked", workflow, step, needs, ...(extra || {}) };
}
// END slopify family schemas

// ---- Local schemas ----------------------------------------------------------

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

const REPRO_CODER_SCHEMA = {
  ...CODER_SCHEMA,
  required: [...CODER_SCHEMA.required, "steps", "observed"],
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
// input; any other string is the bug report.
function normalize(a) {
  if (typeof a !== "string") return a;
  const text = a.trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed;
    if (typeof parsed === "string") return { bug: parsed.trim() };
  } catch (e) {
    // not JSON: the string is the story
  }
  return { bug: text };
}

const input = normalize(args) || {};
const storyArg = typeof input.bug === "string" ? input.bug.trim() : "";
const projectRoot =
  typeof input.projectRoot === "string" ? input.projectRoot.trim() : "";
const answers =
  input.answers && typeof input.answers === "object" ? input.answers : {};

if (!storyArg) {
  return {
    status: "not-started",
    next: "Ask the user for the bug: a card identifier or URL, or the report text. Then invoke again.",
  };
}

// ---- Constants and state ----------------------------------------------------

const WORKFLOW = "deliver-bugfix";
const MAX_FAILURES = 3;
const RERUN =
  "Invoke /slopify:deliver-bugfix again with the same args; add answers.<id> for each decision. In this session, pass resumeFromRunId to reuse completed steps.";
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
  "Authorization, from the user's invocation of /slopify:deliver-bugfix: the story branch and worktree, attributable commits, a push once the gates have passed, opening or updating this task's PR, and the declared review trigger. It does not authorize merging, releases, any other message, rewriting docs/BOARD.md or docs/FORGE.md, or changing a card's content. Work exactly as docs/BOARD.md and docs/FORGE.md declare; an operation that is not bound is unmet, never improvised. Stage explicit paths only.";

const completed = [];
const skipped = [];
const attempts = [];
const verification = [];
const limits = [];
const failures = { reproduce: 0, spec: 0, implementation: 0 };
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
// A scout's "no value" comes in many spellings: empty, "none", "none: no branch name given".
const isNone = (v) =>
  !String(v || "").trim() ||
  /^\s*(none|absent|missing|n\/a|not found)(?![\w/-]|\.\w)/i.test(String(v));
const clean = (v) => (isNone(v) ? "" : String(v).trim());
const val = (res, key) => clean(fact(res, key));
// A checkpoint or card value counts as present only in its expected shape, never as prose.
const shaped = (v, re) => (re.test(String(v || "")) ? String(v).trim() : "");
const PATH_RE = /^\/[\w@.+\- /]+$/; // an absolute path
const REL_PATH_RE = /^[\w@.+/-]+$/; // a relative path
const REF_RE = /^(https?:\/\/\S+|[\w@.+/#-]+(?: ?\d+)?)$/; // a PR URL, path, or number
const HEX_RE = /^[0-9a-f]{7,64}$/i;
const splitList = (v) =>
  isNone(v)
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
function sameRevision(evaluated, revision) {
  const e = String(evaluated || "");
  const r = String(revision || "");
  return !!r && (e.includes(r) || e.includes(r.slice(0, 12)));
}
// A verdict is usable only when it is on the revision it was briefed with and is coherent: a
// fail names a blocking finding, a pass names none. A null or unusable verdict is re-run, not fixed.
function usable(v, revision) {
  if (!v || !sameRevision(v.evaluated, revision)) return false;
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
    const lim = v.limits && !isNone(v.limits) ? v.limits : "";
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
function callCoder(prompt, label, phaseTitle, schema) {
  return agent(prompt, {
    agentType: "slopify:coder",
    label,
    phase: phaseTitle,
    schema: schema || CODER_SCHEMA,
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
    { label: "read spec tasks", phase: "Fix" },
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
Read the one card this delivery names, through the read bindings in docs/BOARD.md, or, when the argument below is the bug report text itself, take that text as the report. Report these evidence items, each with source set to the item name and excerpt set to its value; leave out an item that does not exist:
- card: the card identifier, or none when the argument is report text or there is no board
- story-source: card, text, or none
- story: the report text exactly as you wrote it for hashing (title line, empty line, body), or the argument verbatim for report text
- story-revision: the story revision digest
- field-re: the field regex you used for it
- branch: the branch name the board gives the card, or the single word none
- spec-path: the repository-relative spec path docs/BOARD.md's naming gives this card, built from the card identifier and the card title's lowercase kebab slug as the declaration's pattern says (for example docs/specs/<identifier>-<slug>.md), or the single word none
- relations: related, blocking, and blocked-by cards
- linked-specs: specs the card links
Change nothing on the board or forge.

Argument:
<<<ARG
${storyArg}
ARG>>>`,
  { label: "read the bug report", phase: "Locate" },
);
if (!cardRes) {
  return stop("locate", [
    need("locate", 1, "prerequisite", "A readable bug report: the card, or the report text.", "scout-card did not return"),
  ]);
}
const storySource = ((/^\s*(card|text|none)\b/i.exec(fact(cardRes, "story-source")) || [])[1] || "").toLowerCase();
const story = storySource === "text" ? storyArg : fact(cardRes, "story");
const storyRevision = shaped(fact(cardRes, "story-revision"), HEX_RE);
if (!story || storySource === "none") {
  return stop("locate", [
    need("locate", 1, "input", "A bug report the board can read, or the report text.", (cardRes.gaps || []).join("; ") || cardRes.answer),
  ]);
}
if (!storyRevision) {
  return stop("locate", [
    need("locate", 1, "prerequisite", "The story revision digest from scout-card.", cardRes.answer),
  ]);
}
const cardId = shaped(val(cardRes, "card"), /^\S{1,100}$/);
const boardBranch = shaped(val(cardRes, "branch"), REL_PATH_RE);
const slug = slugOf(cardId) || slugOf(storyArg);
// The card title is the first line of a card-backed report; its lowercase kebab slug names the spec.
const titleSlug = (storySource === "card" ? story.split("\n")[0].replace(/^#+\s*/, "") : "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 60)
  .replace(/-+$/, "");
const specRel =
  shaped(val(cardRes, "spec-path"), /^[\w@.+/-]+\.md$/) ||
  `docs/specs/${[cardId.toLowerCase().replace(/[^a-z0-9]+/g, "-"), titleSlug].filter(Boolean).join("-") || slug}.md`;
const STORY_BLOCK = `The bug report, verbatim, is the acceptance source (story revision ${storyRevision}):
<<<BUG
${story}
BUG>>>`;

const cpRes = await scout("scout-checkpoint",
  `${WHERE}
Report where this run stands. It is the delivery of the fix for ${cardId ? `card ${cardId}` : `the bug "${slug}"`}${boardBranch ? `; the board gives the branch name ${boardBranch}` : ""}. The spec path, relative to the worktree root, is ${specRel}.
Report these keys, each as an evidence item with source set to the key; leave out a key that does not exist:
- worktree, branch, head, dirty (comma-separated paths relative to the worktree root, or none), ledger
- ledger-story: the story revision on the last done spec line
- ledger-test: the comma-separated test paths on the most recent done spec line that has a test field
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
const cpWorktree = shaped(val(cpRes, "worktree"), PATH_RE);
if (cpWorktree.startsWith("/")) state.worktree = cpWorktree.replace(/\/+$/, "");
state.branch = shaped(val(cpRes, "branch"), REL_PATH_RE) || boardBranch;
state.ledger = shaped(val(cpRes, "ledger"), PATH_RE);
state.pr = shaped(val(cpRes, "pr").split("\n")[0].trim(), REF_RE);
const cpDirty = splitList(fact(cpRes, "dirty")).filter((p) => REL_PATH_RE.test(p) && !/^\.tmp(\/|$)/.test(p));
const cpSpec = parseSpec(val(cpRes, "spec"));
if (cpSpec) {
  state.specPath = cpSpec.path;
  state.specHash = cpSpec.hash;
  state.specExists = true;
}
// With the spec already on disk, its revision is its checkpointed hash until a writer revises it.
let specRevision = state.specHash;
const doneSpec = parseDoneSpec(val(cpRes, "done-spec"));
const doneImpl = parseDoneImplement(val(cpRes, "done-implement"));
const donePub = parseDonePublish(val(cpRes, "done-publish"));
const ledgerStory = shaped(val(cpRes, "ledger-story"), HEX_RE) || (doneSpec ? doneSpec.story : "");

// The currency chain: each link depends on the one before it. A bug's done spec also
// names the committed regression test.
// A done spec line written after a spec revision may omit the test; an earlier line then knows it.
const ledgerTests = (doneSpec && doneSpec.test ? doneSpec.test : val(cpRes, "ledger-test"))
  .split(",")
  .map((t) => t.trim())
  .filter((t) => REL_PATH_RE.test(t));
const specCurrent =
  !!doneSpec &&
  ledgerTests.length > 0 &&
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
      `Create or recover the worktree and branch that docs/FORGE.md declares for the fix of ${cardId ? `card ${cardId}` : `the bug "${slug}"`}${boardBranch ? ` (the board gives the branch name ${boardBranch})` : ""}. ${cardId ? "Then perform the delivery-start operation docs/BOARD.md declares for the card (for example its status transition), only as bound." : "There is no card, so perform no board operation."} Change no card content.`,
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
      need("workspace", 1, "prerequisite", "The absolute path of the worktree.", JSON.stringify(r.operations)),
    ]);
  }
  state.worktree = wt.replace(/\/+$/, "");
  state.branch = opRef(r, "branch") || state.branch;
  done("workspace");
}
if (!state.ledger) state.ledger = `${state.worktree}/.tmp/ledger.md`;
if (!state.specPath) state.specPath = `${state.worktree}/${specRel}`;
else if (!state.specPath.startsWith("/")) state.specPath = `${state.worktree}/${state.specPath}`;

// ---- Gather, reproduce, spec ------------------------------------------------

let gathered = "";
let repro = { tests: [], files: [], revision: "", observed: "", steps: [] }; // the committed or just-passed regression test
let specCommit = doneSpec ? doneSpec.commit : "";
const fixTouched = new Set(); // paths the fix coder reported changing, for the commit
const touched = new Set();

if (specCurrent) {
  repro.tests = ledgerTests.map((t) => rel(t)).filter(Boolean);
  repro.files = repro.tests;
}

const isSpec = (p) => within(p, state.specPath);

// A coder writes the regression test, then a fresh lens-repro judges it.
async function reproduce(extra) {
  let pending = extra || [];
  while (true) {
    phase("Reproduce");
    const dirtyNow = unique([...(specCurrent ? [] : cpDirty), ...touched]).filter((p) => !isSpec(p));
    const r = await callCoder(
      `${WHERE}
Work in the worktree ${state.worktree}; address every file by absolute path under it. ${NO_WRITES}

Write a regression test that shows the reported failure, and change no production code: write only test files and test support, in the project's test location. The test must fail now, for the reported reason. Run it to show that, and return the tests you wrote or changed, the steps to reproduce, and what you observed. Report the revision you leave as your instructions describe. If you cannot reproduce the failure, say so in open and leave tests empty.

${STORY_BLOCK}

Evidence:
${gathered}
${dirtyNow.length ? `\n${DIRTY_SENTENCE}\nPaths:\n${list(dirtyNow)}\n` : ""}${pending.length ? `\nResolve these findings:\n${list(pending)}\n` : ""}`,
      "write the regression test",
      "Reproduce",
      REPRO_CODER_SCHEMA,
    );
    let problem = "";
    if (!r) problem = "the coder did not return";
    else if (!(r.tests || []).length)
      problem = `the coder wrote no regression test${(r.open || []).length ? `: ${r.open.join("; ")}` : ""}`;
    if (r) for (const p of [...(r.changed || []), ...(r.tests || [])]) touched.add(rel(p));
    if (!problem) {
      const jr = await judge(
        [
          {
            name: "lens-repro",
            call: () =>
              lens("lens-repro",
                `${WHERE}
Judge whether the regression test(s) below reliably show the reported failure on the current production code in the worktree ${state.worktree}. Revision: ${r.revision}. ${candidateNote(r.revision)}
Tests:
${list(r.tests)}

${STORY_BLOCK}${pending.length ? `\n\nEarlier findings to recheck:\n${list(pending)}` : ""}`,
                { label: "repro", phase: "Reproduce" },
              ),
          },
        ],
        r.revision,
        "reproduce",
      );
      if (jr.stop) return jr.stop;
      const v = jr.verdicts[0];
      record("lens-repro", v, r.revision);
      if (passed(v)) {
        // The test and any fixtures or helpers the reproduction needed all belong to the spec commit.
        const files = unique([...(r.changed || []), ...r.tests].map(rel)).filter((f) => f && !/^\.tmp(\/|$)/.test(f) && !isSpec(f));
        repro = { tests: r.tests.map(rel), files, revision: r.revision, observed: r.observed || "", steps: r.steps || [] };
        done("reproduce");
        return null;
      }
      pending = blockingOf("lens-repro", v).map(findingText);
      problem = pending.join("; ");
    } else pending = [problem];
    if (fail("reproduce", "regression test", problem)) {
      return stop("reproduce", [
        need("reproduce", 1, "story", "a reproducible report", attempts.filter((a) => a.gate === "reproduce").map((a) => a.failed).join(" | ")),
      ]);
    }
  }
}

async function specGate(findings) {
  let pending = findings || [];
  while (true) {
    phase("Spec");
    const exists = state.specExists;
    const w = await callWriter(
      `${WHERE}
Work in the worktree ${state.worktree}; address every file by absolute path. ${exists ? `Revise the spec at ${state.specPath} against the bug report below.` : `Write the spec at ${state.specPath}.`} Write only that one file. ${NO_WRITES}

Write a spec only as large as the fix needs: the bug, its cause, the fix, the regression test, and how the fix is verified. The regression test is already written; it is not yours to change:
${list(repro.tests)}
What it shows: ${repro.observed || "(see the test)"}
Return one task for the fix (id, summary, and the production paths it may write, relative to the worktree root, files or directories, no globs), and in docs the documentation files that state a contract the fix changes (empty when none).

Story authority: you may clarify an ambiguous point of the report in the spec without changing its meaning, keeping the original wording beside the clarification. A report that is wrong, or a bug that cannot be fixed as reported, is a story blocker: report it in storyBlockers. ${DECIDE}
${answersFor("spec")}
${STORY_BLOCK}

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
      problem = "the spec needs a fix task with the production paths it may write";
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
The worktree is ${state.worktree}. ${what}
Spec: ${state.specPath}, revision ${specRevision}. Set evaluated to exactly that revision.

${STORY_BLOCK}${pending.length ? `\n\nEarlier findings to recheck:\n${list(pending)}` : ""}`;
    const items = [
      { name: "lens-scope", call: () => lens("lens-scope", brief("Judge whether the spec covers the report's failure and its fix, with no added or dropped scope."), { label: "scope", phase: "Spec gate" }) },
    ];
    // lens-consistency joins only when the spec changes a documented contract.
    if (plan.docs.length)
      items.push({ name: "lens-consistency", call: () => lens("lens-consistency", brief("Judge whether the spec agrees with the repository's constraints and its existing specs."), { label: "consistency", phase: "Spec gate" }) });
    const jd = await judge(items, specRevision, "spec-gate");
    if (jd.stop) return jd.stop;
    jd.verdicts.forEach((v, k) => record(items[k].name, v, specRevision));
    if (!jd.verdicts.every(passed)) {
      pending = jd.verdicts.flatMap((v, k) => blockingOf(items[k].name, v)).map(findingText);
      if (fail("spec", `spec revision ${specRevision}`, pending.join("; "))) return exhausted("spec-gate", "spec");
      continue;
    }

    const c = await callPusher(
      pushBrief(
        `Commit exactly these files together in one commit, staged by explicit path: the spec ${state.specPath} and the regression test with the fixtures and helpers its reproduction needs:\n${list(repro.files.map((t) => `${state.worktree}/${t}`))}\nA file with no uncommitted change needs no staging. First check that the spec's git hash-object is ${specRevision}; if it differs, commit nothing and report that as unmet. Use the commit convention docs/FORGE.md declares. Do not push.`,
        [`done spec ${state.specPath}@${specRevision} commit <the new commit's sha> story ${storyRevision} test ${repro.tests.join(",")}`],
      ),
      "commit the spec and the test",
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
  for (const s of ["gather", "reproduce", "spec", "spec-gate"]) skip(s);
} else {
  phase("Gather");
  const CTX = `${WHERE}\nThe worktree is ${state.worktree}; look there.\n${STORY_BLOCK}\n`;
  const [sCode, sTests, sHistory] = await parallel([
    () => scout("scout-code", `${CTX}Find the code locations and call paths relevant to this bug, including where the failure originates.`, { label: "code", phase: "Gather" }),
    () => scout("scout-tests", `${CTX}Find the existing tests that cover the area of this bug, where a regression test belongs, and how to run the tests.`, { label: "tests", phase: "Gather" }),
    () => scout("scout-history", `${CTX}Find from git history and blame when and why behavior in the area of this bug was last changed.`, { label: "history", phase: "Gather" }),
  ]);
  gathered = [show("Code", sCode), show("Tests", sTests), show("History", sHistory)].join("\n");
  done("gather");

  const noRepro = await reproduce([]);
  if (noRepro) return noRepro;
  gathered += `\nReproduction: ${repro.steps.join("; ") || "(see the test)"}\nObserved: ${repro.observed}`;

  const stopped = await specGate([]);
  if (stopped) return stopped;
}

// ---- Fix and validate -------------------------------------------------------

let candidate = "";

function fixPaths() {
  return unique([...plan.tasks.flatMap((t) => t.paths), ...plan.docs]);
}

// One coder fixes; findings, when given, are what a fresh validator found in `judged`.
// Returns {stop} | {mismatch} | {ok: true, candidate}.
async function fix(findings, judged) {
  while (true) {
    phase(judged ? "Validate" : "Fix");
    const dirtyNow = unique([...(specCurrent ? cpDirty : []), ...fixTouched]).filter((p) => !isSpec(p));
    const r = await callCoder(
      `${WHERE}
Work in the worktree ${state.worktree}; address every file by absolute path under it. ${NO_WRITES}

Fix the bug. Assigned paths (write only these): ${fixPaths().join(", ")}
The regression test is already committed and passed an independent check; leave these files exactly as they are:
${list(repro.tests)}
If the spec cannot be implemented as written, or the regression test cannot pass with a correct fix, say why in specMismatch and stop; never weaken the test or a criterion to fit.

Spec: ${state.specPath} (revision ${specRevision}), validated before coding.
${STORY_BLOCK}

Run the focused tests as you work, including the regression test, which must pass after the fix. Report the revision you leave as your instructions describe.
${dirtyNow.length ? `\n${DIRTY_SENTENCE}\nPaths:\n${list(dirtyNow)}\n` : ""}${findings && findings.length ? `\nFix these findings, reported by an independent validator of candidate ${judged}, and change only what they require:\n${list(findings.map(findingText))}\n` : ""}`,
      judged ? "fix the findings" : "fix the bug",
      judged ? "Validate" : "Fix",
    );
    if (!r) {
      if (fail("implementation", "fix", "the coder did not return")) return { stop: exhausted(judged ? "validate" : "fix", "implementation") };
      continue;
    }
    for (const p of [...(r.changed || []), ...(r.tests || [])]) fixTouched.add(rel(p));
    for (const o of r.open || []) limits.push(`open: ${o}`);
    if (r.specMismatch && r.specMismatch.trim()) return { mismatch: r.specMismatch.trim() };
    if (!r.revision) {
      return { stop: stop(judged ? "validate" : "fix", [need(judged ? "validate" : "fix", 1, "prerequisite", "The candidate code revision.", "the coder reported none")]) };
    }
    return { ok: true, candidate: r.revision };
  }
}

async function validate(first) {
  let cand = first.candidate;
  let findings = null;
  let prior = [];
  while (true) {
    if (findings) {
      const f = await fix(findings, cand);
      if (f.stop || f.mismatch) return f;
      cand = f.candidate;
      findings = null;
    }
    phase("Validate");
    const base = specCommit
      ? `the commit ${specCommit}^ (resolve it with git rev-parse), the parent of the commit that added the regression test and the spec, so without the fix`
      : "the parent of the commit that added the regression test (find that commit with git log), so without the fix";
    const items = [
      {
        name: "qa",
        call: () =>
          callQa(
            `${WHERE}
Validate the candidate in the worktree ${state.worktree} against the validated spec and the bug report. Candidate revision: ${cand}. ${candidateNote(cand)}
Spec: ${state.specPath}, revision ${specRevision}.
Changed paths:
${list([...fixTouched, ...repro.tests])}

${STORY_BLOCK}

Run the project's tests and the checks the spec requires, judge that the bug is fixed and that nothing regressed, and judge any affected documentation.${prior.length ? `\n\nEarlier findings to recheck:\n${list(prior)}` : ""}`,
            "qa",
            "Validate",
          ),
      },
      {
        name: "lens-regression",
        call: () =>
          lens("lens-regression",
            `${WHERE}
Judge whether the regression test(s) fail before the fix and pass after it.
Tests:
${list(repro.tests)}
Before: the base revision is ${base}. It is a real commit: export it with git archive into a temporary directory, copy the test files in from the worktree ${state.worktree}, and run them there; never change the worktree. After: run the tests in the worktree ${state.worktree} as it stands now, with HEAD plus its uncommitted changes. The candidate label "${cand}" is an identifier for that state, not a git object, so do not resolve it with git. Report it back unchanged in evaluated.

${STORY_BLOCK}${prior.length ? `\n\nEarlier findings to recheck:\n${list(prior)}` : ""}`,
            { label: "regression", phase: "Validate" },
          ),
      },
    ];
    const jd = await judge(items, cand, "validate");
    if (jd.stop) return { stop: jd.stop };
    jd.verdicts.forEach((v, k) => record(items[k].name, v, cand));
    if (jd.verdicts.every(passed)) return { ok: true, candidate: cand };
    findings = jd.verdicts.flatMap((v, k) => blockingOf(items[k].name, v));
    prior = findings.map(findingText);
    if (fail("implementation", `candidate ${cand}`, prior.join("; "))) return { stop: exhausted("validate", "implementation") };
  }
}

if (implCurrent) {
  skip("fix");
  skip("validate");
} else {
  while (true) {
    if (!plan) {
      plan = await recoverPlan();
      if (!plan) {
        return stop("fix", [
          need("fix", 1, "prerequisite", `The fix task and documentation list in the spec at ${state.specPath}.`, "scout-docs could not read them"),
        ]);
      }
    }
    const f = await fix(null, "");
    let next = f;
    if (f.ok) {
      done("fix");
      next = await validate(f);
    }
    if (next.stop) return next.stop;
    if (next.mismatch) {
      // The spec goes back to its gate with the spec budget. The regression test already failed on the
      // unfixed code and passed lens-repro, and the uncommitted fix is in the worktree now, so the
      // reproduction is not run again.
      if (fail("spec", "fix against the spec and the test", next.mismatch)) return exhausted("spec", "spec");
      const stopped = await specGate([`The fix step reports the spec cannot be implemented as written, or the regression test cannot pass with a correct fix: ${next.mismatch}. The regression test is fixed; revise the spec, or report a story blocker if the report itself is the problem.`]);
      if (stopped) return stopped;
      continue;
    }
    candidate = next.candidate;
    break;
  }
  done("validate");
  // The validators judged the whole worktree: commit every dirty path within the fix's assigned paths,
  // from the checkpoint's dirty list and the coder's reports, and report the rest.
  const dirtyAll = unique([...(specCurrent ? cpDirty : []), ...fixTouched]).filter((p) => p && !/^\.tmp(\/|$)/.test(p) && !isSpec(p));
  const commitPaths = dirtyAll.filter((p) => fixPaths().some((s) => within(p, s)));
  const outside = dirtyAll.filter((p) => !commitPaths.includes(p));
  if (outside.length) limits.push(`Uncommitted paths outside the assigned paths, not committed: ${outside.join(", ")}`);
  const c = await callPusher(
    pushBrief(
      `Commit exactly these paths as they stand, staged by explicit path, with the commit convention docs/FORGE.md declares. Do not push. Commit nothing else, even if the worktree holds other uncommitted changes. If every path is already committed, make no commit and record the current HEAD sha in the ledger line.\nPaths:\n${list(commitPaths)}`,
      [`done implement commit <the new commit's sha> spec ${state.specHash}`],
    ),
    "commit the fix",
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
      `Push the branch ${state.branch || ""} as docs/FORGE.md declares. ${state.pr ? `A PR exists (${state.pr}); update it as docs/FORGE.md declares and perform no board operation.` : "Open the PR as docs/FORGE.md declares, then perform the board operations docs/BOARD.md declares for when the PR opens (for example attaching it and a status transition)."} The PR describes the bug and the fix, links the spec at ${state.specPath}, and lists this verification:\n${list(verification.map((v) => `${v.agent}: ${v.verdict} on ${v.evaluated}`))}\nThen fire the review trigger docs/FORGE.md declares, unless opening the PR fires it; if none is declared, fire none and do not report that as unmet. Change no card content.`,
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
let review = null;
try {
  review = await workflow("slopify:review-pr", {
    pr: state.pr,
    worktree: state.worktree,
    spec: state.specPath,
    story,
    test: repro.tests.join(","),
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
done("review");

return {
  status: "done",
  workflow: WORKFLOW,
  skipped,
  attempts,
  completed,
  pr: state.pr,
  spec: state.specPath,
  regressionTests: repro.tests,
  verification,
  review,
  limits,
  report: makeReport([`Spec: ${state.specPath}.`, `Regression test(s): ${repro.tests.join(", ")}.`]),
};
