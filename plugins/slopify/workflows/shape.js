export const meta = {
  name: 'shape',
  description:
    'Turn an idea into a durable story with observable acceptance criteria: scouts and the library gather evidence, the what-and-why advisors judge it, a writer drafts the story, and fresh lenses validate it; no spec is written',
  whenToUse:
    'Run only when the user invokes /slopify:shape or asks for the slopify shape workflow. Args: {idea, card?, file?: boolean, projectRoot?, answers?}, or the idea as a plain string; card names an existing card to start from, file: true files or updates the story card, projectRoot defaults to the session project directory, and answers maps an open-decision id to its answer when rerunning.',
  phases: [
    { title: 'Locate', detail: 'scout-card and scout-related-cards, then scout-checkpoint' },
    { title: 'Gather', detail: 'library-reader, scout-docs, and scout-code' },
    { title: 'Advise', detail: 'advisor-value, advisor-scope, advisor-alternatives, and advisor-fit in parallel' },
    { title: 'Draft', detail: 'writer drafts the story in the draft file, or resolves its marked open decisions' },
    { title: 'Validate', detail: 'lens-criteria and lens-solution-free judge the draft revision' },
    { title: 'File', detail: 'pusher files or updates the story card, only when file is true' },
  ],
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

// `args` may arrive as the raw string rather than a parsed object. A JSON object is
// the input; any other string is the idea.
function normalize(a) {
  if (typeof a !== 'string') return a
  const text = a.trim()
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object') return parsed
    if (typeof parsed === 'string') return { idea: parsed.trim() }
  } catch (e) {
    // not JSON: the string is the idea
  }
  return { idea: text }
}

const input = normalize(args) || {}
const str = v => (typeof v === 'string' ? v.trim() : '')
const idea = str(input.idea)
const cardArg = str(input.card)
const projectRoot = str(input.projectRoot).replace(/\/+$/, '')
const wantFile = input.file === true
const answers = input.answers && typeof input.answers === 'object' && !Array.isArray(input.answers) ? input.answers : {}

if (!idea) {
  return { status: 'not-started', next: 'Ask the user for the idea, problem, or evidence to shape, then invoke again.' }
}

const NAME = 'shape'
const MAX_FAILURES = 3
const WHERE = projectRoot
  ? `The project is at ${projectRoot}; address files by absolute path under it.`
  : 'The project is the session project directory; address files by absolute path.'
const READ_ONLY = 'Report only: change nothing, and perform no board or forge operation.'
const PRODUCER_BOUNDS =
  'Do not commit, push, or perform any board or forge operation; another agent does that.'

const completed = []
const skipped = []
const attempts = []
const checkpoint = {}

function stop(step, needs) {
  return blocked(NAME, step, needs, { completed: [...completed], checkpoint: { ...checkpoint }, attempts })
}

function done(step) {
  if (!completed.includes(step)) completed.push(step)
}

function skip(step) {
  if (!skipped.includes(step)) skipped.push(step)
  done(step)
}

function hasAnswer(id) {
  return Object.prototype.hasOwnProperty.call(answers, id) && String(answers[id]).trim() !== ''
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// A card identifier or URL is one token; prose such as "no card found" is not an identifier.
const idOf = (v) => shaped('id', v)

const CONTEXT_SCHEMA = {
  type: 'object',
  required: ['summary', 'supported', 'gaps'],
  properties: {
    summary: { type: 'string', description: 'What the existing library already supports about the idea' },
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
    openDecisions: { ...STRINGS, description: 'Ids of the open decisions still marked in the artifact' },
    storyBlockers: { ...STRINGS, description: 'What prevents the artifact from being written' },
    tasks: {
      type: 'array',
      description: 'Always an empty array here',
      items: {
        type: 'object',
        required: ['id', 'summary', 'paths'],
        properties: { id: { type: 'string' }, summary: { type: 'string' }, paths: STRINGS },
      },
    },
    docs: { ...STRINGS, description: 'Always an empty array here' },
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
        properties: {
          op: { type: 'string' },
          result: { type: 'string' },
          reference: { type: 'string', description: 'A card id, commit sha, PR URL or path, or worktree path' },
        },
      },
    },
    unmet: { ...STRINGS, description: 'Each operation that could not be performed as declared, and why' },
  },
}

function show(label, r) {
  if (!r) return `### ${label}\nThe scout did not return: treat this as a gap, not an absence.`
  const ev = (r.evidence || []).map(e => `- ${e.source} (${e.location}): ${e.excerpt}`).join('\n') || '- none'
  const gaps = (r.gaps || []).map(g => `- ${g}`).join('\n') || '- none'
  return `### ${label}\n${r.answer}\nEvidence:\n${ev}\nGaps:\n${gaps}`
}

function showLibrary(r) {
  if (!r) return '### Library\nThe library-reader did not return: treat this as a gap, not an absence.'
  const list = items => (items && items.length ? items.map(x => `- ${x}`).join('\n') : '- none')
  return `### Library\n${r.summary}\nSupported:\n${list(r.supported)}\nGaps:\n${list(r.gaps)}`
}

function findingsText(v) {
  const list = (v.findings || []).map(f => `- ${f.blocking ? '[blocking] ' : ''}${f.location}: ${f.problem}`)
  return list.length ? list.join('\n') : '- none'
}

// What keeps a lens verdict from counting as a pass; an empty array is a pass.
function problems(name, v, revision) {
  if (!v) return [`${name} did not return a verdict`]
  const out = []
  if (v.verdict !== 'pass') out.push(`${name} ${v.verdict}\n${findingsText(v)}\nLimits: ${v.limits}`)
  else if ((v.findings || []).some(f => f.blocking)) out.push(`${name} passed with blocking findings\n${findingsText(v)}`)
  else if (!sameRev(revision, v.evaluated)) {
    out.push(`${name} judged "${v.evaluated}", not revision ${revision}`)
  }
  return out
}

// ---- Locate ----------------------------------------------------------------

phase('Locate')
const readCard = (retry) =>
  scout('scout-card',
    `${WHERE}
${READ_ONLY}

Read the one card this idea starts from, if any. Card named in the args: ${cardArg || 'none'}. If none is named there, read the card the idea itself names by identifier or URL; if it names none, or the project has no board, report that. Return the card's identifier as the evidence item card-id (omit the item when there is no card). The story revision is not needed for this run.

Idea: ${idea}`,
    { label: retry ? 'read card (again)' : 'read card', phase: 'Locate' },
  )
let [cardR, relatedR] = await parallel([
  () => readCard(false),
  () =>
    scout('scout-related-cards',
      `${WHERE}
${READ_ONLY}

Search the board for cards that duplicate, overlap, conflict with, or depend on this outcome. If the project has no board, report that.

Idea: ${idea}`,
      { label: 'related cards', phase: 'Locate' },
    ),
])

// A scout that returns nothing is not a board with no card: ask once more. The card the args name
// is the card, whatever the scout reports; the File step must update it, never create another.
if (!cardR && cardArg) cardR = await readCard(true)
const cardId = idOf(fact(cardR, 'card-id')) || idOf(cardArg)
const slug = slugify(cardId) || slugged(idea, 'idea')
const draftRel = `.tmp/shape/${slug}.md`
const draftPath = projectRoot ? `${projectRoot}/${draftRel}` : draftRel

let cp = null
for (let i = 1; i <= MAX_FAILURES && !cp; i++) {
  cp = await scout('scout-checkpoint',
    `${WHERE}
${READ_ONLY}

Report where a shape run stands from its durable checkpoints. The run's draft file is ${draftPath} (under the project's ignored .tmp/ folder). Return one evidence item per key that exists, with source set to the key and excerpt set to its value; omit a key that does not exist.

Keys:
- draft: present only when the draft file exists; its value is its absolute path, then "@", then its git hash-object digest.
- draft-open: the ids of the open decisions still marked in the draft, comma-separated, or "none". Find them with: grep -oE '<!-- (open-decision [a-z0-9-]+|filed [^ ]+)' ${draftPath}
- draft-filed: the card id from a "filed" marker in the draft, from the same grep; omit when there is no such marker.

Idea: ${idea}`,
    { label: `checkpoint${i > 1 ? ` (attempt ${i})` : ''}`, phase: 'Locate' },
  )
  if (!cp) attempts.push({ gate: 'locate', approach: 'scout-checkpoint', failed: 'the scout did not return' })
}
if (!cp) {
  return stop('locate', [
    { id: 'locate-1', kind: 'prerequisite', what: 'A scout-checkpoint report of the draft file, so a rerun never overwrites an existing draft', evidence: 'scout-checkpoint did not return in three dispatches' },
  ])
}
done('locate')

// A draft exists only when the checkpoint reports "<path>@<digest>" for this run's draft path;
// a missing-file note, an empty value, or any other prose means there is no draft.
const draftValue = fact(cp, 'draft')
const draftMatch = draftValue.match(/^(\S+)@([0-9a-f]{7,64})$/i)
const draftExists = !!draftMatch && draftMatch[1].endsWith(draftRel)
// draft-open's value is its excerpt alone: an empty excerpt means no marker, never the location.
const openItem = (cp.evidence || []).find(e => e.source === 'draft-open')
const openValue = openItem ? String(openItem.excerpt || '').trim() : ''
const openFromCheckpoint = draftExists && !absent(openValue) ? openValue.split(',').map(x => x.trim()).filter(id => /^[a-z0-9-]+$/.test(id)) : []
const filedValue = fact(cp, 'draft-filed')
const draftFiled = draftExists ? idOf(filedValue) : ''
if (draftExists) checkpoint.draft = draftPath
if (draftFiled) checkpoint.filed = draftFiled

let draftRev = draftExists ? draftMatch[2] : ''
let openIds = openFromCheckpoint
const advisorViews = []

// ---- Gather and advise (a draft already exists: skipped) --------------------

let evidenceText = ''
if (draftExists) {
  skip('gather')
  skip('advise')
} else {
  phase('Gather')
  const [libR, docsR, codeR] = await parallel([
    () =>
      agent(
        `${WHERE}

Report what the project library already supports about this idea, so supported work isn't repeated. Read library/_meta/librarian.md, then the relevant index and wiki pages and the raw notes behind them. Cite each supported claim to its file and heading, and name gaps, stale material, and contested pages. Make no internet requests and no writes. If the project has no library, say so as a gap.

Idea: ${idea}`,
        { agentType: 'slopify:library-reader', label: 'library context', phase: 'Gather', schema: CONTEXT_SCHEMA },
      ),
    () =>
      scout('scout-docs',
        `${WHERE}
${READ_ONLY}

Find the documentation and specs that make claims about what this idea covers.

Idea: ${idea}`,
        { label: 'docs', phase: 'Gather' },
      ),
    () =>
      scout('scout-code',
        `${WHERE}
${READ_ONLY}

Find where the product already does or touches this idea: the code locations and call paths.

Idea: ${idea}`,
        { label: 'code', phase: 'Gather' },
      ),
  ])
  evidenceText = [show('Card', cardR), show('Related cards', relatedR), showLibrary(libR), show('Docs', docsR), show('Code', codeR)].join('\n\n')
  done('gather')

  phase('Advise')
  const ADVISORS = [
    { name: 'advisor-value', run: (p, o) => advise('advisor-value', p, o) },
    { name: 'advisor-scope', run: (p, o) => advise('advisor-scope', p, o) },
    { name: 'advisor-alternatives', run: (p, o) => advise('advisor-alternatives', p, o) },
    { name: 'advisor-fit', run: (p, o) => advise('advisor-fit', p, o) },
  ]
  const advice = {}
  let waiting = ADVISORS
  let adviseFailures = 0
  while (waiting.length) {
    const results = await parallel(
      waiting.map(a => () =>
        a.run(
          `${WHERE}
${READ_ONLY}

Judge this idea from your one angle, from the evidence below plus reading the repository. You judge; you do not decide.

Idea: ${idea}

Evidence:
${evidenceText}`,
          { label: a.name.replace('advisor-', ''), phase: 'Advise' },
        ),
      ),
    )
    const missing = []
    waiting.forEach((a, i) => (results[i] ? (advice[a.name] = results[i]) : missing.push(a)))
    waiting = missing
    if (missing.length) {
      adviseFailures += 1
      attempts.push({ gate: 'advise', approach: 'what-and-why advisors', failed: `${missing.map(a => a.name).join(', ')} did not return` })
      if (adviseFailures >= MAX_FAILURES) {
        return stop('advise', [
          { id: 'advise-1', kind: 'prerequisite', what: `A judgement from ${missing.map(a => a.name).join(', ')}`, evidence: 'the advisor did not return in three dispatches' },
        ])
      }
    }
  }
  for (const a of ADVISORS) advisorViews.push({ name: a.name, judgement: advice[a.name].judgement, conditions: advice[a.name].conditions })
  evidenceText += `\n\n### Advisors\n${JSON.stringify(advice, null, 2)}`
  done('advise')
}

// ---- Draft -----------------------------------------------------------------

function draftOk(w) {
  return !!w && Array.isArray(w.produced) && w.produced.length > 0 && w.produced.every(p => String(p).endsWith(draftRel)) && str(w.revision) !== ''
}

function decisionNeeds(ids) {
  return ids.map(id => ({
    id,
    kind: 'decision',
    what: `Answer open decision ${id}; its question is in the marker in the draft`,
    evidence: `<!-- open-decision ${id}: … --> in ${draftPath}`,
  }))
}

// A writer that reports a story blocker, or open decisions that answers doesn't settle while it
// wrote no draft, stops the run at once: retrying could never show the user the reason.
function earlyStop(w, step) {
  if (!w) return null
  const blockers = (w.storyBlockers || []).map(b => String(b).trim()).filter(Boolean)
  if (blockers.length) {
    return stop(
      step,
      blockers.map((b, i) => ({ id: `draft-${i + 1}`, kind: 'input', what: b, evidence: 'reported by the writer while working on the story' })),
    )
  }
  if (!draftOk(w)) {
    const unanswered = (w.openDecisions || []).map(x => String(x).trim()).filter(id => id && !hasAnswer(id))
    if (unanswered.length) return stop(step, decisionNeeds(unanswered))
  }
  return null
}

// Marked open decisions that answers doesn't settle block the run; settled ones go to a writer
// that applies the answers. Returns a blocked result, or null once no decision is open.
async function settle() {
  let resolves = 0
  while (openIds.length) {
    const unanswered = openIds.filter(id => !hasAnswer(id))
    if (unanswered.length) {
      return stop('draft', decisionNeeds(unanswered))
    }
    if (resolves >= MAX_FAILURES) {
      return stop('draft', [
        { id: 'draft-resolve', kind: 'validation', what: `The writer to apply the answers for ${openIds.join(', ')} in the draft`, evidence: 'the markers were still open after three resolving dispatches' },
      ])
    }
    resolves += 1
    const given = openIds.map(id => `- ${id}: ${answers[id]}`).join('\n')
    const w = await agent(
      `Address files by absolute path.
${PRODUCER_BOUNDS}

Resolve the open decisions in the story draft at ${draftPath}, and write only that file. Apply each answer below in the draft, remove that decision's marker line, and report in openDecisions the ids that are still marked. Return in revision the git hash-object digest of the draft, and in produced its absolute path. Return tasks and docs as empty arrays.

Answers:
${given}`,
      { agentType: 'slopify:writer', label: `resolve ${openIds.join(' ')}`, phase: 'Draft', schema: WRITER_SCHEMA },
    )
    const earlyResolve = earlyStop(w, 'draft')
    if (earlyResolve) return earlyResolve
    if (!draftOk(w)) {
      attempts.push({ gate: 'draft', approach: `resolve ${openIds.join(', ')}`, failed: 'the writer did not return a draft revision at the draft path' })
      continue
    }
    draftRev = str(w.revision)
    openIds = (w.openDecisions || []).map(s => String(s).trim()).filter(Boolean)
  }
  return null
}

phase('Draft')
if (!draftExists) {
  let draftFailures = 0
  while (true) {
    const w = await agent(
      `Address files by absolute path.
${PRODUCER_BOUNDS}

Write the story for this idea at ${draftPath}, and write only that file (create its folder if needed). Use the card shape the project's board declaration gives: problem and outcome, scope and exclusions, observable acceptance criteria, dependencies, and evidence. State the problem, outcome, scope, and criteria, never how to build them. Write no spec and no approach. Synthesize the advisors' views: say in the story what you adopted and why, and what you set aside and why.

Decide anything that does not change the story's outcome (naming, types, edge cases with an obvious default) yourself, and record it in the draft as a labelled assumption (a line starting "Assumption:"). Mark an open decision only for a choice that changes what the story delivers or whom it serves and that the evidence cannot settle: one line in the draft, <!-- open-decision <id>: <question> -->, with id matching [a-z0-9-]+, and return the same ids in openDecisions. Put anything that stops a story from being written in storyBlockers. Return in revision the git hash-object digest of the draft, and in produced its absolute path. Return tasks and docs as empty arrays.

Idea: ${idea}

Evidence:
${evidenceText}`,
      { agentType: 'slopify:writer', label: draftFailures ? `draft story (attempt ${draftFailures + 1})` : 'draft story', phase: 'Draft', schema: WRITER_SCHEMA },
    )
    const early = earlyStop(w, 'draft')
    if (early) return early
    if (draftOk(w)) {
      draftRev = str(w.revision)
      openIds = (w.openDecisions || []).map(s => String(s).trim()).filter(Boolean)
      checkpoint.draft = draftPath
      break
    }
    draftFailures += 1
    attempts.push({ gate: 'draft', approach: 'writer story draft', failed: w ? 'the writer wrote outside the draft path or returned no revision' : 'the writer did not return' })
    if (draftFailures >= MAX_FAILURES) {
      return stop('draft', [
        { id: 'draft-1', kind: 'validation', what: `A story draft written at ${draftPath} with a revision`, evidence: 'the writer did not produce one in three dispatches' },
      ])
    }
  }
}
{
  const blockedOnDecision = await settle()
  if (blockedOnDecision) return blockedOnDecision
}
if (draftExists && !openFromCheckpoint.length) skip('draft')
else done('draft')

// ---- Validate --------------------------------------------------------------

// A filed draft is not judged or revised again: the card already holds this story, and a revision here
// would leave the card behind the draft.
let verdicts = []
let validateFailures = 0
let round = 0
if (draftFiled) skip('validate')
else {
phase('Validate')
while (true) {
  round += 1
  const [crit, free] = await parallel([
    () =>
      lens('lens-criteria',
        `${WHERE}

Judge the story draft at ${draftPath}, revision ${draftRev}. Judge that exact revision only, and name it as evaluated.`,
        { label: `criteria (round ${round})`, phase: 'Validate' },
      ),
    () =>
      lens('lens-solution-free',
        `${WHERE}

Judge the story draft at ${draftPath}, revision ${draftRev}. Judge that exact revision only, and name it as evaluated.`,
        { label: `solution-free (round ${round})`, phase: 'Validate' },
      ),
  ])
  verdicts = [
    { lens: 'lens-criteria', result: crit },
    { lens: 'lens-solution-free', result: free },
  ]
  const bad = [...problems('lens-criteria', crit, draftRev), ...problems('lens-solution-free', free, draftRev)]
  if (!bad.length) break
  validateFailures += 1
  attempts.push({ gate: 'validate', approach: `story draft revision ${draftRev}`, failed: bad.join('; ') })
  if (validateFailures >= MAX_FAILURES) {
    return stop('validate', [
      { id: 'validate-1', kind: 'validation', what: 'A story draft that lens-criteria and lens-solution-free both pass', evidence: bad.join('\n') },
    ])
  }
  // The writer revises from the findings; the next round judges the new revision.
  while (true) {
    const w = await agent(
      `Address files by absolute path.
${PRODUCER_BOUNDS}

Revise the story draft at ${draftPath} (revision ${draftRev}) to resolve the findings below, and write only that file. Keep the problem, outcome, and scope the story already states; state no implementation. Keep any open-decision marker you do not settle, and decide anything that does not change the story's outcome yourself as a labelled assumption. Return in revision the git hash-object digest of the revised draft, in produced its absolute path, and in openDecisions the ids still marked. Return tasks and docs as empty arrays.

Findings:
${bad.join('\n\n')}`,
      { agentType: 'slopify:writer', label: `revise story (round ${round})`, phase: 'Validate', schema: WRITER_SCHEMA },
    )
    const earlyRevise = earlyStop(w, 'validate')
    if (earlyRevise) return earlyRevise
    if (draftOk(w)) {
      draftRev = str(w.revision)
      openIds = (w.openDecisions || []).map(s => String(s).trim()).filter(Boolean)
      break
    }
    validateFailures += 1
    attempts.push({ gate: 'validate', approach: 'writer revision of the story draft', failed: w ? 'the writer wrote outside the draft path or returned no revision' : 'the writer did not return' })
    if (validateFailures >= MAX_FAILURES) {
      return stop('validate', [
        { id: 'validate-1', kind: 'validation', what: 'A revised story draft for the lenses to judge', evidence: bad.join('\n') },
      ])
    }
  }
  const blockedOnDecision = await settle()
  if (blockedOnDecision) return blockedOnDecision
}
done('validate')
}

// ---- File ------------------------------------------------------------------

let filed = draftFiled || null
if (draftFiled) skip('file')
else if (wantFile) {
  phase('File')
  const cardLine = cardId
    ? `The idea came from the existing card ${cardId}: update that card with the story.`
    : 'The idea came from no existing card: create a card for the story.'
  let pusherFailures = 0
  while (true) {
    const p = await agent(
      `${WHERE}

Authorization: the user invoked the shape workflow with file: true, which authorizes exactly this: file the story below as a card, through the project's board declaration (docs/BOARD.md), then append the filed marker to the draft. Perform no other operation: no commit, branch, worktree, push, pull request, review trigger, merge, or message, and no change to any other card. Work exactly as the board declaration binds it; report an operation that is not bound, or a project with no board, in unmet, and improvise nothing.

File the story at ${draftPath}, revision ${draftRev}, exactly as written; change no word of it. Add one trailing line to the card body, <!-- shape-draft ${slug} -->, which is not part of the story and lets a rerun find this card. ${cardId ? '' : `Before creating, search the board for a card whose body holds that line; if one exists, it is this story's card: update it instead of creating another. `}${cardLine}

The moment the card operation succeeds, and before anything else that can fail (a read-back, a label, a status), append the line <!-- filed <card id> --> to the end of the draft. Return the card operation first in operations, with the card id as its reference. When there is no board, perform nothing and return the draft path in unmet.`,
      { agentType: 'slopify:pusher', label: pusherFailures ? `file story card (attempt ${pusherFailures + 1})` : 'file story card', phase: 'File', schema: PUSHER_SCHEMA },
    )
    if (p && p.unmet && p.unmet.length) {
      attempts.push({ gate: 'file', approach: 'pusher card filing', failed: p.unmet.join('; ') })
      // The card operation can succeed and a later step fail: name the cause that is true.
      const made = (p.operations || []).find(o => o.reference && o.reference !== draftPath)
      if (made) {
        checkpoint.filed = made.reference
        return stop('file', [
          { id: 'file-1', kind: 'prerequisite', what: `The "filed" marker appended to ${draftPath}: card ${made.reference} was filed, but a step after it failed`, evidence: p.unmet.join('; ') },
        ])
      }
      return stop('file', [
        { id: 'file-1', kind: 'prerequisite', what: 'A board declaration that binds creating or updating a story card', evidence: p.unmet.join('; ') },
      ])
    }
    if (p && p.done && p.operations && p.operations.length) {
      const op = p.operations.find(o => o.reference) || p.operations[0]
      filed = op.reference || 'filed'
      checkpoint.filed = filed
      break
    }
    pusherFailures += 1
    attempts.push({ gate: 'file', approach: 'pusher card filing', failed: p ? 'the pusher reported the filing as not done' : 'the pusher did not return' })
    if (pusherFailures >= MAX_FAILURES) {
      return stop('file', [
        { id: 'file-1', kind: 'prerequisite', what: 'The story card filed through the board declaration', evidence: 'the pusher did not complete it in three dispatches' },
      ])
    }
  }
  done('file')
}

const criteriaVerdict = (verdicts.find(v => v.lens === 'lens-criteria') || {}).result
const report = [
  `Advisors: ${advisorViews.length ? advisorViews.map(a => `${a.name.replace('advisor-', '')} ${a.judgement}`).join('; ') : 'not run (a draft already existed)'}`,
  criteriaVerdict ? `lens-criteria: ${criteriaVerdict.verdict} at revision ${draftRev}` : `lens-criteria: not run (the draft was already filed at revision ${draftRev})`,
  `Story draft: ${draftPath}`,
  filed ? `Filed: ${filed}` : 'Filed: no (file was not requested)',
].join('\n')

return {
  status: 'done',
  workflow: NAME,
  skipped,
  attempts,
  report,
  story: draftPath,
  revision: draftRev,
  verdicts: verdicts.map(v => ({ lens: v.lens, verdict: v.result.verdict, evaluated: v.result.evaluated, findings: v.result.findings, limits: v.result.limits })),
  advisors: advisorViews,
  filed,
}
