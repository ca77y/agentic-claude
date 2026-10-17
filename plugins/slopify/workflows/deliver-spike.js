export const meta = {
  name: 'deliver-spike',
  description:
    'Answer a bounded technical question with a cited findings document that makes no recommendation: the library first, then outside scouts, and an optional throwaway prototype on its own unpushed branch that a fresh qa confirms and that is deleted, never merged',
  whenToUse:
    'Run only when the user invokes /slopify:deliver-spike or asks for the slopify deliver-spike workflow, for a bounded technical question that needs findings, measurements, or a throwaway prototype. Open-ended outside research ("what is the best X") belongs to /slopify:research. Args: {question, projectRoot?, answers?}, or the question as a plain string; projectRoot defaults to the session project directory; answers maps the need ids of a blocked result to the user\'s decisions.',
  phases: [
    { title: 'Locate', detail: 'scout-checkpoint reports the findings document, prototype branch, and worktree' },
    { title: 'Codebase', detail: 'library-reader, scout-feasibility, and scout-code in parallel' },
    { title: 'Outside', detail: 'after library-reader has returned: scout-upstream-docs, scout-known-issues, and scout-prior-art in parallel' },
    { title: 'Plan', detail: 'writer lists the claims, their evidence status, and the measurements needed' },
    { title: 'Prototype', detail: 'pusher creates the prototype branch and worktree; coder builds the throwaway prototype and runs each measurement' },
    { title: 'Findings', detail: 'writer writes the findings document, with no recommendation' },
    { title: 'Validate', detail: 'lens-evidence, lens-question, lens-neutrality, and qa on the prototype, each a fresh dispatch on the new revision' },
    { title: 'Cleanup', detail: 'pusher removes the prototype worktree and deletes its branch' },
  ],
}

// `args` may arrive as the raw string rather than a parsed object. A JSON object is
// the input; any other string is the question.
function normalize(a) {
  if (typeof a !== 'string') return a
  const text = a.trim()
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object') return parsed
    if (typeof parsed === 'string') return { question: parsed.trim() }
  } catch (e) {
    // not JSON: the string is the question
  }
  return { question: text }
}

const input = normalize(args) || {}
const question = typeof input.question === 'string' ? input.question.trim() : ''
const projectRoot = typeof input.projectRoot === 'string' ? input.projectRoot.trim() : ''
const answers = input.answers && typeof input.answers === 'object' ? input.answers : {}

if (!question) {
  return { status: 'not-started', next: 'Ask the user for the spike question, then invoke /slopify:deliver-spike again.' }
}

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
  const decisions = list.some((n) => n.kind === "decision");
  return list.length && list.every((n) => n.kind === "decision")
    ? `Invoke ${cmd} again with the same args and add answers.<id> for each decision. In this session, pass resumeFromRunId to reuse the steps already completed.`
    : `Resolve what each need names, then invoke ${cmd} again with the same args${decisions ? " and answers.<id> for each decision" : ""}, without resumeFromRunId, so every step reads the repository afresh.`;
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

const WORKFLOW = 'deliver-spike'
const MAX_FAILURES = 3

const WHERE = projectRoot
  ? `The project is at ${projectRoot}; address files by absolute path under it.`
  : 'The project is the session project directory; address files by absolute path.'
const NO_OPS =
  'Do not commit, push, create or remove branches or worktrees, open pull requests, or touch cards: pusher alone does that.'
// Rules for every prompt that writes or revises the findings document, and the revision wording.
const MEASURED_RULE =
  'Every measured value in the document must come from a prototype command recorded in the document together with its output. Do not report figures from scouts, from runs that were not saved, or from a validator\'s reruns: drop such a figure rather than cite it. When a validator flags a figure that has no recorded command, remove it or add the recorded command and its output; never add a new unrecorded figure.'
const DOC_REVISION =
  'The document revision is the file\'s own git hash-object (git hash-object <path>); the file may be untracked, so verify it that way and do not look for a commit.'
// The prototype's names come from docs/FORGE.md's "Spike prototypes" binding, read in Locate; the
// script invents none. binding is '' when FORGE.md declares none, and then no prototype is built.
let binding = ''
const auth = () =>
  `The user invoked the deliver-spike workflow. That invocation itself authorizes you to create, and later delete, this spike's own prototype branch and worktree, which are local only, never pushed, and never merged. Name them only as docs/FORGE.md's "Spike prototypes" binding names them:\n${binding}\nFollow docs/FORGE.md for everything else it binds, such as the target branch to branch from. The user's invocation of deliver-spike is the user's request for creating and deleting this prototype branch and worktree, so it lifts any restriction in docs/FORGE.md against them. The invocation authorizes nothing else: no commit, push, pull request, board operation, ledger line, merge, or message.`

// Local producer and operations schemas ------------------------------------

const LIBRARY_SCHEMA = {
  type: 'object',
  required: ['summary', 'supported', 'gaps'],
  properties: {
    summary: { type: 'string', description: 'What the existing library already supports about the question' },
    supported: { ...STRINGS, description: 'Supported claims, each with the library file and heading it comes from' },
    gaps: { ...STRINGS, description: 'What the library does not cover, stale or contested material included' },
  },
}

const WRITER_SCHEMA = {
  type: 'object',
  required: ['produced', 'revision', 'openDecisions', 'storyBlockers', 'tasks', 'docs'],
  properties: {
    produced: { ...STRINGS, description: 'Absolute paths written' },
    revision: { type: 'string', description: 'git hash-object of the main artifact' },
    openDecisions: STRINGS,
    storyBlockers: STRINGS,
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'summary', 'paths'],
        properties: { id: { type: 'string' }, summary: { type: 'string' }, paths: STRINGS },
      },
    },
    docs: STRINGS,
  },
}

const PLAN_SCHEMA = {
  type: 'object',
  required: ['claims', 'openDecisions'],
  properties: {
    claims: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'claim', 'status', 'needsMeasurement', 'measurement'],
        properties: {
          id: { type: 'string', description: 'A short stable id such as c1' },
          claim: { type: 'string' },
          status: { type: 'string', enum: ['supported', 'contested', 'unknown'] },
          needsMeasurement: { type: 'boolean' },
          measurement: { type: 'string', description: 'What to measure and how; an empty string when no measurement is needed' },
        },
      },
    },
    openDecisions: { ...STRINGS, description: 'Questions only the user can settle before the spike can proceed' },
  },
}

const CODER_SCHEMA = {
  type: 'object',
  required: ['changed', 'tests', 'ran', 'revision', 'open', 'specMismatch', 'steps', 'observed', 'measurements'],
  properties: {
    changed: STRINGS,
    tests: STRINGS,
    ran: { ...STRINGS, description: 'command -> result' },
    revision: { type: 'string', description: 'Label <HEAD sha>+<digest> naming the worktree\'s current state; not a git object' },
    open: STRINGS,
    specMismatch: { type: 'string', description: 'Why the approach cannot work as assigned; an empty string when it can' },
    steps: STRINGS,
    observed: { type: 'string' },
    measurements: {
      type: 'array',
      items: {
        type: 'object',
        required: ['claim', 'value', 'command'],
        properties: { claim: { type: 'string' }, value: { type: 'string' }, command: { type: 'string' } },
      },
    },
  },
}

const PUSHER_SCHEMA = {
  type: 'object',
  required: ['done', 'operations', 'unmet'],
  properties: {
    done: { type: 'boolean' },
    operations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['op', 'result', 'reference'],
        properties: { op: { type: 'string' }, result: { type: 'string' }, reference: { type: 'string' } },
      },
    },
    unmet: STRINGS,
  },
}

// Helpers --------------------------------------------------------------------

const attempts = [] // { gate, approach, failed }
const completed = []
const skipped = []
const checkpoint = {} // worktree, branch, findingsDoc: whichever exist

function need(id, kind, what, evidence) {
  return { id, kind, what, evidence }
}

// A blocked result: the step that could not proceed, what it needs, and what a rerun finds.
function stop(step, needs) {
  return blocked(WORKFLOW, step, needs, { completed, checkpoint, attempts })
}

function list(items) {
  return items && items.length ? items.map((x) => `- ${x}`).join('\n') : '- none'
}

function tokens(text) {
  return String(text || '').split(/\s+/).filter(Boolean)
}

function opRef(result, op) {
  const hit = result && result.operations ? result.operations.find((o) => o.op === op) : null
  return hit ? String(hit.reference || '').trim() : ''
}

// A scout result as brief text. A scout that did not return is a gap, not an absence.
function show(title, r) {
  if (!r) return `### ${title}\nNo result: the dispatch did not return, so this is a gap, not an absence.`
  const ev = (r.evidence || []).map((e) => `- ${e.source} (${e.location}): ${e.excerpt}`)
  return `### ${title}\n${r.answer}\nEvidence:\n${list(ev)}\nGaps:\n${list(r.gaps)}`
}

function showLibrary(r) {
  if (!r) return '### library-reader\nNo result: the library-reader did not return, so what the library supports is unknown, not empty.'
  return `### library-reader\n${r.summary}\nSupported:\n${list(r.supported)}\nGaps:\n${list(r.gaps)}`
}

function showMeasurements(ms) {
  return ms && ms.length ? ms.map((m) => `- ${m.claim}: ${m.value} (command: ${m.command})`).join('\n') : '- none reported'
}

function covers(measurements, id) {
  const re = new RegExp('(^|[^A-Za-z0-9_-])' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z0-9_-]|$)')
  return (measurements || []).some((m) => re.test(m.claim))
}

// A verdict passes only when it says pass and nothing blocking remains.
function passed(r) {
  return !!r && r.verdict === 'pass' && !(r.findings || []).some((f) => f.blocking)
}

// A verdict counts only for the revision it judged. When the brief could not name a revision
// (a rerun that found the artifact already written), the verdict must still name what it judged.
function passedOn(r, revision) {
  if (!passed(r)) return false
  return revision ? sameRev(revision, r.evaluated) : !!String(r.evaluated || '').trim()
}

function describe(name, r, revision) {
  if (!r) return `${name}: the dispatch did not return`
  const items = (r.findings || []).map((f) => `${f.location}: ${f.problem}${f.blocking ? '' : ' (non-blocking)'}`)
  if (r.verdict === 'pass' && !items.length && !passedOn(r, revision)) {
    items.push(`judged "${r.evaluated}", not the briefed revision ${revision || '(none named)'}`)
  }
  const limits = r.limits && !absent(r.limits, true) ? `; limits: ${r.limits}` : ''
  return `${name}: ${r.verdict}${items.length ? ` (${items.join('; ')})` : ''}${limits}`
}

// Run a producer until `check` finds no problem, at most MAX_FAILURES times. Every failed
// attempt is recorded. `fatal` stops early on a result that retrying cannot improve.
async function attempt(gate, label, run, check, fatal) {
  let last = ''
  for (let i = 0; i < MAX_FAILURES; i++) {
    const res = await run(last)
    const problem = res ? check(res) : 'the agent did not return'
    if (!problem) return { res, last }
    attempts.push({ gate, approach: label, failed: problem })
    last = problem
    if (res && fatal && fatal(res)) break
  }
  return { res: null, last }
}

const retryNote = (last) => (last ? `\nThe previous attempt failed: ${last}\n` : '')

const slug = slugged(question, 'spike')

// ---- Locate -----------------------------------------------------------------

phase('Locate')
let cp = null
for (let i = 0; i < MAX_FAILURES && !cp; i++) {
  cp = await scout('scout-checkpoint',
    `${WHERE}

Report where this spike stands from its durable checkpoints. Return each key below that exists as an evidence item whose source is the key; leave out a key that does not exist. A spike has no card: read no board.

Spike slug: ${slug}
Question: ${question}

Keys:
- spike-binding: the "Spike prototypes" binding in docs/FORGE.md: its local branch pattern, its worktree pattern, and whether it permits deleting a never-pushed prototype, quoted. Leave the key out when docs/FORGE.md does not exist or has no such binding; invent no names.
- findings-doc: the findings document for this spike, a Markdown file in the main checkout (ignore .git and .worktrees) whose first line under its title is "Spike: ${slug}". Location: its absolute path. Excerpt: "<absolute path> <git hash-object of the file>".
- prototype-branch: the local prototype branch that binding names for the slug above, if it exists. Location and excerpt: the branch name alone. Leave the key out when there is no binding.
- worktree: the prototype worktree that binding names for the slug above, if it exists. Location and excerpt: its absolute path alone. Leave the key out when there is no binding.`,
    { label: 'checkpoint', phase: 'Locate' },
  )
  if (!cp) attempts.push({ gate: 'locate', approach: 'scout-checkpoint', failed: 'the scout did not return' })
}
if (!cp) {
  return stop('locate', [
    need('locate-1', 'prerequisite', 'A scout-checkpoint result for this spike, so a rerun knows what is already done.', 'scout-checkpoint did not return in three dispatches'),
  ])
}
completed.push('locate')

const bindingFact = fact(cp, 'spike-binding')
// The quoted line is "Spike prototypes: none" when the project wants no prototypes. A binding names a branch
// pattern in terms of <slug>; anything else is no binding, and no names are invented.
const bindingBody = bindingFact.replace(/^[\s>*-]*spike prototypes\s*[:\u2014-]?\s*/i, '')
binding = !absent(bindingBody) && /<slug>/i.test(bindingBody) ? bindingFact : ''
const docFact = fact(cp, 'findings-doc')
const docParts = absent(docFact) ? [] : tokens(docFact)
const doc = { path: shaped('path', docParts[0]), revision: shaped('sha', docParts[1]) }
let prototypeBranch = shaped('branch', fact(cp, 'prototype-branch'))
let prototypeWorktree = shaped('path', fact(cp, 'worktree'))
if (doc.path) checkpoint.findingsDoc = doc.path
if (prototypeBranch) checkpoint.branch = prototypeBranch
if (prototypeWorktree) checkpoint.worktree = prototypeWorktree

let measurements = [] // from the coder; empty on a rerun that finds the document already written
let unknowns = []
let protoRevision = ''
let library = null
let prototypeGap = '' // set when claims need a prototype but docs/FORGE.md declares no naming for one

if (doc.path) {
  log(`Findings document ${doc.path} exists; skipping codebase, outside, plan, prototype, and findings`)
  skipped.push('codebase', 'outside', 'plan', 'prototype', 'findings')
} else {
  // ---- Codebase -------------------------------------------------------------

  phase('Codebase')
  const [reader, feasibility, code] = await parallel([
    () =>
      agent(
        `${WHERE}

Report what the project library already supports about this spike's question, so supported work is not repeated. Read library/_meta/librarian.md, then the relevant index and wiki pages and the raw notes behind them. Cite each supported claim to its file and heading, and name gaps, stale material, and contested pages. Make no internet requests and no writes.

Question: ${question}`,
        { agentType: 'slopify:library-reader', label: 'library context', phase: 'Codebase', schema: LIBRARY_SCHEMA },
      ),
    () =>
      scout('scout-feasibility',
        `${WHERE}

The candidate is whatever approach the spike's question asks about. Find where it fits in this codebase, what it would touch, and what blocks it.

Question: ${question}`,
        { label: 'feasibility', phase: 'Codebase' },
      ),
    () =>
      scout('scout-code',
        `${WHERE}

The described change is whatever the spike's question would require of this codebase. Find the code locations and call paths relevant to it, with path:line evidence.

Question: ${question}`,
        { label: 'code', phase: 'Codebase' },
      ),
  ])
  library = reader
  if (!library) attempts.push({ gate: 'codebase', approach: 'library-reader', failed: 'the reader did not return; recorded as a gap' })
  completed.push('codebase')

  // ---- Outside --------------------------------------------------------------
  // Only after library-reader has returned: the outside scouts are told what the library
  // already supports, so they look only for what is missing.

  phase('Outside')
  const libraryText = showLibrary(library)
  const outsideBrief = (task) => `${WHERE}

${task}

Question: ${question}

What the project library already supports (look only for what is missing from it, and do not repeat it):
${libraryText}

Codebase evidence so far:
${show('scout-feasibility', feasibility)}
${show('scout-code', code)}`
  const [upstream, known, prior] = await parallel([
    () =>
      scout('scout-upstream-docs',
        outsideBrief(
          'Find official docs and API references for the one library or service the question turns on, naming it from the question or the codebase evidence below: versions, limits, deprecations. If none is named, report that as a gap.',
        ),
        { label: 'upstream docs', phase: 'Outside' },
      ),
    () =>
      scout('scout-known-issues',
        outsideBrief('Find pitfalls and open bugs relevant to the question in upstream trackers and changelogs.'),
        { label: 'known issues', phase: 'Outside' },
      ),
    () =>
      scout('scout-prior-art',
        outsideBrief('Find GitHub repos, issues, PRs, discussions, and write-ups where others did the same thing.'),
        { label: 'prior art', phase: 'Outside' },
      ),
  ])
  completed.push('outside')

  const evidenceText = [
    showLibrary(library),
    show('scout-feasibility', feasibility),
    show('scout-code', code),
    show('scout-upstream-docs', upstream),
    show('scout-known-issues', known),
    show('scout-prior-art', prior),
  ].join('\n\n')

  // ---- Plan -----------------------------------------------------------------

  phase('Plan')
  // Open decisions get ids derived from their text, so an answer stays with its question
  // whatever else the writer asks. The first plan call never carries answers (so a resumed run
  // replays it); each answer then goes back with its question text.
  let plan = null
  let planFailure = ''
  const sd = await settleDecisions('plan', answers, async (settled) => {
    const planned = await attempt(
      'plan',
      settled.length ? 'writer claim plan with answers' : 'writer claim plan',
      (last) =>
      agent(
        `${WHERE}
${NO_OPS}
Write no files: return the plan.
${retryNote(last)}
List the claims the answer to this spike's question rests on. For each, give a short stable id (c1, c2, ...), the claim, its evidence status from the evidence below (supported, contested, or unknown), and whether it needs a measurement from a throwaway prototype. A claim needs a measurement only when the evidence leaves it contested or unknown and a prototype could settle it; then say what to measure and how. Leave measurement empty otherwise. Settle measurement details yourself (environment, interpreter or tool versions, method, scope, what is included in a timing) and record each as a labelled assumption: put it in the claim's measurement text as "Assumption: ...", so the findings document can state it too. Raise a question in openDecisions only when the spike's question itself is ambiguous in a way no reasonable assumption resolves; never for how to measure. Otherwise leave openDecisions empty.${
          settledText(settled)
        }

Question: ${question}

Evidence:
${evidenceText}`,
        { agentType: 'slopify:writer', label: 'plan claims', phase: 'Plan', schema: PLAN_SCHEMA },
      ),
    (r) => {
      if (!Array.isArray(r.claims)) return 'the plan has no claims list'
      const ids = r.claims.map((c) => c.id)
      if (new Set(ids).size !== ids.length) return 'claim ids are not unique'
      const bad = r.claims.find((c) => c.needsMeasurement && !String(c.measurement || '').trim())
      return bad ? `claim ${bad.id} needs a measurement but names none` : ''
    },
    )
    planFailure = planned.last
    return planned.res
  })
  if (!sd.res) {
    return stop('plan', [need('plan-1', 'validation', 'A claim plan the writer can produce for this question.', planFailure)])
  }
  if (sd.open.length) {
    return stop(
      'plan',
      sd.open.map((d) => need(d.id, 'decision', d.question, 'raised by the claim plan')),
    )
  }
  plan = sd.res
  completed.push('plan')

  // ---- Prototype ------------------------------------------------------------

  const toMeasure = plan.claims.filter((c) => c.needsMeasurement)
  if (!toMeasure.length) {
    log('No claim needs a measurement; no prototype')
    skipped.push('prototype')
  } else if (!binding && !prototypeWorktree) {
    prototypeGap = `No prototype was built: docs/FORGE.md declares no "Spike prototypes" naming, so these claims were not measured: ${toMeasure.map((c) => c.id).join(', ')}`
    log(prototypeGap)
    skipped.push('prototype')
  } else {
    phase('Prototype')
    if (!prototypeWorktree) {
      const made = await attempt(
        'prototype',
        'pusher prototype workspace',
        (last) =>
          agent(
            `${WHERE}
${auth()}
${retryNote(last)}
Create the spike's prototype branch and worktree for the slug "${slug}", named as docs/FORGE.md's "Spike prototypes" binding names them. Branch from the target branch docs/FORGE.md declares. Both are local only, never pushed, never merged; confirm neither was pushed before reusing an existing one. If they already exist from an interrupted run, reuse them. Report the operations \`branch-create\` (reference: the branch name) and \`worktree-add\` (reference: the absolute worktree path). Commit nothing, push nothing, open no pull request, and append no ledger line. Report an operation as unmet only if it fails or the request above does not cover it.`,
            { agentType: 'slopify:pusher', label: 'prototype workspace', phase: 'Prototype', schema: PUSHER_SCHEMA },
          ),
        (r) => (r.unmet && r.unmet.length ? `unmet: ${r.unmet.join('; ')}` : !r.done ? 'the operation did not complete' : !opRef(r, 'worktree-add') ? 'no worktree path was reported' : ''),
        (r) => !!(r.unmet && r.unmet.length),
      )
      if (!made.res) {
        return stop('prototype', [
          need('prototype-1', 'prerequisite', 'A prototype branch and worktree the spike may create (docs/FORGE.md must not prohibit them), so it can measure its claims.', made.last),
        ])
      }
      prototypeWorktree = opRef(made.res, 'worktree-add')
      prototypeBranch = opRef(made.res, 'branch-create') || prototypeBranch
      checkpoint.worktree = prototypeWorktree
      if (prototypeBranch) checkpoint.branch = prototypeBranch
    }

    const claimLines = toMeasure.map((c) => `- ${c.id}: ${c.claim} (measure: ${c.measurement})`).join('\n')
    const built = await attempt(
      'prototype',
      'coder throwaway prototype',
      (last) =>
        agent(
          `${WHERE}
${NO_OPS}
${retryNote(last)}
Build a throwaway prototype in the worktree ${prototypeWorktree} and write only inside it. It measures the claims below to answer the spike's question. It is deleted afterwards and never merged, so keep it as small as the measurements allow. If the worktree already holds prototype work from an interrupted run, inspect it, keep what serves this assignment, and continue from it.

Run every measurement yourself, the way its claim states. Return one measurements entry per claim: claim set to "<claim id>: <claim>", value set to what you observed, and command set to the exact command that produced it. Return in steps what you ran and in observed what you saw. Return in revision the label <HEAD sha>+<digest> for the worktree's current state, where the digest is git hash-object of the output of git -C ${prototypeWorktree} diff HEAD --binary, taken after git add -N on your new files. The revision is a label for the worktree's current state, not a git object: do not look it up in git. If the approach cannot measure a claim, say why in specMismatch.

Question: ${question}

Claims to measure:
${claimLines}

Evidence:
${evidenceText}`,
          { agentType: 'slopify:coder', label: 'build prototype', phase: 'Prototype', schema: CODER_SCHEMA },
        ),
      (r) => {
        if (r.specMismatch && r.specMismatch.trim()) return `unworkable: ${r.specMismatch.trim()}`
        if (!String(r.revision || '').trim()) return 'no prototype revision was returned'
        const missing = toMeasure.filter((c) => !covers(r.measurements, c.id)).map((c) => c.id)
        return missing.length ? `no measurement was returned for ${missing.join(', ')}` : ''
      },
    )
    if (!built.res) {
      return stop('prototype', [
        need('prototype-2', 'validation', `A prototype that measures every claim that needs it (${toMeasure.map((c) => c.id).join(', ')}).`, built.last),
      ])
    }
    measurements = built.res.measurements
    protoRevision = built.res.revision.trim()
    completed.push('prototype')
  }

  // ---- Findings -------------------------------------------------------------

  phase('Findings')
  const written = await attempt(
    'findings',
    'writer findings document',
    (last) =>
      agent(
        `${WHERE}
${NO_OPS}
${retryNote(last)}
Write the spike's findings document. Place it in the main checkout where it best fits the project's documentation, as a new entry, and leave it uncommitted. Its first line under its title is "Spike: ${slug}". Directly after the title block, open with a one-paragraph direct answer to the question that states its conditions (the stated assumptions and what it holds for). Then the question, the findings, the measurements, and the open unknowns. It makes no recommendation and does not rank options. Every claim cites a path:line, library evidence (file and heading), an outside source (URL), or a measurement (its claim id and command). State the plan's labelled assumptions ("Assumption: ...") in the measurements section, next to the measurements they qualify. ${MEASURED_RULE} Write only that one document: produced holds exactly its absolute path, and revision is its git hash-object. Return the open unknowns, one per entry, in openDecisions.

Question: ${question}

Claims and their evidence status:
${plan.claims.map((c) => `- ${c.id} [${c.status}]: ${c.claim}${c.measurement ? ` (measurement: ${c.measurement})` : ''}`).join('\n')}

Measurements from the prototype:
${showMeasurements(measurements)}${
          prototypeGap
            ? `\n\n${prototypeGap}. State each of those claims as unmeasured in the document, and list the missing prototype naming among the open unknowns.`
            : ''
        }

Evidence:
${evidenceText}`,
        { agentType: 'slopify:writer', label: 'findings document', phase: 'Findings', schema: WRITER_SCHEMA },
      ),
    (r) => {
      if (!r.produced || !r.produced.length || !String(r.produced[0]).startsWith('/')) return 'no absolute document path was returned'
      if (!String(r.revision || '').trim()) return 'no document revision was returned'
      return ''
    },
  )
  if (!written.res) {
    return stop('findings', [need('findings-1', 'validation', 'A findings document the writer can produce.', written.last)])
  }
  doc.path = written.res.produced[0]
  doc.revision = written.res.revision.trim()
  unknowns = written.res.openDecisions || []
  if (prototypeGap && !unknowns.some((u) => /prototype/i.test(u))) unknowns = [...unknowns, prototypeGap]
  checkpoint.findingsDoc = doc.path
  completed.push('findings')
}

// ---- Validate ---------------------------------------------------------------
// Every round is fresh dispatches on the revisions that now exist. A round with any
// non-passing verdict is one failure of this gate; the producers then fix from the findings.

phase('Validate')
let verdicts = []
let failures = 0

while (true) {
  const hasPrototype = !!prototypeWorktree
  const docBrief = (task) => `${WHERE}

${task}

Question: ${question}
Findings document: ${doc.path}
Revision judged: ${doc.revision || 'the document as it is now (report its git hash-object in evaluated)'}
${DOC_REVISION}${
    measurements.length ? `\n\nMeasurements the prototype reported:\n${showMeasurements(measurements)}` : ''
  }`
  const [evidenceV, questionV, neutralityV, protoV] = await parallel([
    () => lens('lens-evidence', docBrief('Judge whether every claim in the findings document cites a reachable source or measurement.'), { label: 'evidence', phase: 'Validate' }),
    () => lens('lens-question', docBrief('Judge whether the findings answer the spike\'s question and name what remains unknown.'), { label: 'question', phase: 'Validate' }),
    () => lens('lens-neutrality', docBrief('Judge whether the findings make no recommendation.'), { label: 'neutrality', phase: 'Validate' }),
    () =>
      hasPrototype
        ? agent(
            `${WHERE}

Judge whether the throwaway prototype measures what the findings document says. The acceptance source is the document's measurement claims, and each measurement's claim, value, and command. For each, re-run the command in a temporary copy of the prototype worktree and check that the prototype exercises what the claim says (not a stub), and that the document's stated value agrees with what you observe, allowing for ordinary run-to-run variance. Change nothing in the worktree or the document.

Question: ${question}
Prototype worktree: ${prototypeWorktree}
Prototype revision judged: ${
              (protoRevision ? protoRevision + ' (' + 'a label for the worktree\'s current state, not a git object' + ')' : 'the worktree\'s current state. Name it in evaluated as <HEAD sha>+<digest>, a label and not a git object, computed in a temporary copy: git add -N on new files, then git hash-object of git diff HEAD --binary')
            }
Findings document: ${doc.path}
Document revision: ${doc.revision || 'the document as it is now'}
${DOC_REVISION}

Measurements the prototype reported:
${showMeasurements(measurements)}`,
            { agentType: 'slopify:qa', label: 'confirm prototype', phase: 'Validate', schema: LENS_SCHEMA },
          )
        : Promise.resolve(null),
  ])

  const judged = [
    { name: 'lens-evidence', r: evidenceV, doc: true },
    { name: 'lens-question', r: questionV, doc: true },
    { name: 'lens-neutrality', r: neutralityV, doc: true },
  ]
  if (hasPrototype) judged.push({ name: 'qa', r: protoV, doc: false })

  for (const j of judged) j.revision = j.doc ? doc.revision : protoRevision
  const failing = judged.filter((j) => !passedOn(j.r, j.revision))
  verdicts = judged.map((j) => ({
    verdict: j.name,
    result: j.r ? j.r.verdict : 'no-verdict',
    evaluated: j.r ? j.r.evaluated : '',
    findings: j.r ? j.r.findings : [],
    limits: j.r ? j.r.limits : 'the dispatch did not return',
  }))
  if (!failing.length) break

  failures += 1
  const summary = failing.map((j) => describe(j.name, j.r, j.revision)).join(' | ')
  attempts.push({ gate: 'validate', approach: `document ${doc.revision || doc.path}${protoRevision ? `, prototype ${protoRevision}` : ''}`, failed: summary })
  if (failures >= MAX_FAILURES) {
    return stop('validate', [
      need('validate-1', 'validation', `Findings that pass lens-evidence, lens-question, lens-neutrality${hasPrototype ? ', and a qa confirmation of the prototype' : ''}.`, summary),
    ])
  }

  // Fix: the coder repairs the prototype and re-measures when qa failed; the writer then
  // revises the document from every finding and the measurements as they now stand.
  const protoFail = failing.find((j) => j.name === 'qa')
  if (protoFail) {
    const fixed = await agent(
      `${WHERE}
${NO_OPS}

A fresh qa did not confirm that the throwaway prototype in ${prototypeWorktree} measures what the findings document says. Fix the prototype so it measures what each claim states, or, where the claim as written cannot be measured, report the measurement as it actually is; write only inside that worktree, and supply any prerequisite a finding names as missing if you can. Re-run every measurement and return them as before, claim set to "<claim id>: <claim>", with steps, observed, and the new revision: the label <HEAD sha>+<digest> for the worktree's current state, the digest being git hash-object of git -C ${prototypeWorktree} diff HEAD --binary after git add -N on new files. The revision is a label for the worktree's current state, not a git object: do not look it up in git.

Question: ${question}
Findings document: ${doc.path}

qa findings:
${describe('qa', protoFail.r, protoRevision)}

Measurements so far:
${showMeasurements(measurements)}`,
      { agentType: 'slopify:coder', label: `fix prototype ${failures}`, phase: 'Validate', schema: CODER_SCHEMA },
    )
    if (!fixed || (fixed.specMismatch && fixed.specMismatch.trim())) {
      attempts.push({ gate: 'validate', approach: 'coder prototype fix', failed: fixed ? `unworkable: ${fixed.specMismatch.trim()}` : 'the coder did not return' })
    } else {
      if (fixed.measurements && fixed.measurements.length) measurements = fixed.measurements
      if (String(fixed.revision || '').trim()) protoRevision = fixed.revision.trim()
    }
  }

  const revised = await agent(
    `${WHERE}
${NO_OPS}

Revise the findings document at ${doc.path}, and write only that file. Resolve each finding below without adding a recommendation, and make every measurement claim in it agree with the measurements as they now stand. Keep the first line under its title as "Spike: ${slug}", the opening one-paragraph direct answer with its conditions (updated to agree with the revision), every claim cited, and the open unknowns listed. ${MEASURED_RULE} produced holds exactly its absolute path, revision is its git hash-object, and openDecisions holds the open unknowns, one per entry.

Question: ${question}

Findings from fresh validators:
${failing.map((j) => describe(j.name, j.r, j.revision)).join('\n')}

Measurements:
${showMeasurements(measurements)}`,
    { agentType: 'slopify:writer', label: `revise findings ${failures}`, phase: 'Validate', schema: WRITER_SCHEMA },
  )
  if (!revised || !String(revised.revision || '').trim()) {
    attempts.push({ gate: 'validate', approach: 'writer findings revision', failed: 'the writer did not return a revision' })
  } else {
    doc.revision = revised.revision.trim()
    if (revised.produced && revised.produced[0] && String(revised.produced[0]).startsWith('/')) doc.path = revised.produced[0]
    unknowns = revised.openDecisions || unknowns
    checkpoint.findingsDoc = doc.path
  }
}
completed.push('validate')

// ---- Cleanup ----------------------------------------------------------------

let prototypeDeleted = false
if (!prototypeBranch && !prototypeWorktree) {
  skipped.push('cleanup')
} else {
  phase('Cleanup')
  const cleaned = await attempt(
    'cleanup',
    'pusher prototype removal',
    (last) =>
      agent(
        `${WHERE}
${auth()}
${retryNote(last)}
Remove this spike's prototype: ${prototypeWorktree ? `the worktree at ${prototypeWorktree}` : 'its worktree, if one exists'} and ${prototypeBranch ? `its local branch ${prototypeBranch}` : 'its local branch, if one exists'} (named by docs/FORGE.md's "Spike prototypes" binding for the slug "${slug}"; find them from the worktree list and the branch list). Both are local only, never pushed, never merged. The branch was never pushed or merged and the prototype is throwaway, so delete the worktree and branch even though they are unmerged and the worktree holds uncommitted files. Touch no other branch or worktree, and push nothing. Report the operations \`worktree-remove\` and \`branch-delete\`, then confirm that git worktree list and git branch --list show neither.`,
        { agentType: 'slopify:pusher', label: 'remove prototype', phase: 'Cleanup', schema: PUSHER_SCHEMA },
      ),
    (r) => (r.unmet && r.unmet.length ? `unmet: ${r.unmet.join('; ')}` : !r.done ? 'the operation did not complete' : ''),
    (r) => !!(r.unmet && r.unmet.length),
  )
  if (!cleaned.res) {
    return stop('cleanup', [
      need('cleanup-1', 'prerequisite', 'The prototype worktree and branch removed, as the deliver-spike invocation authorizes for its own local, unpushed prototype.', cleaned.last),
    ])
  }
  prototypeDeleted = true
  completed.push('cleanup')
}

const verdictLine = (v) => `${v.verdict}: ${v.result}, evaluated ${v.evaluated || 'unnamed'}`
const protoVerdict = verdicts.find((v) => v.verdict === 'qa')
const report = [
  `Spike done. Findings document: ${doc.path} (revision ${doc.revision || 'unnamed'}); it makes no recommendation.`,
  `Lens verdicts: ${verdicts.filter((v) => v.verdict !== 'qa').map(verdictLine).join('; ')}.`,
  protoVerdict ? `The measurements come from a throwaway prototype and were independently confirmed by a fresh qa: ${verdictLine(protoVerdict)}.` : 'No prototype was needed, so no qa ran.',
  `Measurements: ${measurements.length ? measurements.map((m) => `${m.claim} = ${m.value} (${m.command})`).join('; ') : 'none this run (see the document)'}.`,
  `Open unknowns: ${unknowns.length ? unknowns.join('; ') : 'none reported this run (see the document)'}.`,
  prototypeDeleted
    ? `The prototype worktree${prototypeBranch ? ` and branch ${prototypeBranch}` : ''} were deleted without merging anything; nothing was pushed.`
    : prototypeGap
      ? `${prototypeGap}; nothing was pushed or merged.`
      : 'No prototype branch existed, so none was deleted; nothing was pushed or merged.',
].join('\n')

return {
  status: 'done',
  workflow: WORKFLOW,
  report,
  skipped,
  attempts,
  document: doc.path,
  revision: doc.revision,
  verdicts,
  measurements,
  unknowns,
  prototypeDeleted,
}
