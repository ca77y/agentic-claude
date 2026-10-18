export const meta = {
  name: 'research',
  description:
    'Investigate a question from new sources and persist the evidence and a cited synthesis in the project library, which a fresh library-clerk must pass before the workflow reports done',
  whenToUse:
    'Run only when the user invokes /slopify:research or asks for the slopify research workflow. Answers from the existing library belong to the ask skill. Args: {question, projectRoot?}, or the question as a plain string; projectRoot defaults to the session project directory.',
  phases: [
    { title: 'Context', detail: 'library-reader reports what the library already supports' },
    { title: 'Spec', detail: 'library-scribe writes the research spec; a fresh library-clerk must pass it' },
    { title: 'Retrieve', detail: 'one library-researcher per sub-question' },
    { title: 'Persist', detail: 'library-scribe raw notes, then one integrator for synthesis and metadata' },
    { title: 'Validate', detail: 'a fresh library-clerk judges the persisted research' },
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

if (!question) {
  return { started: false, next: 'Ask the user for the research question, then invoke again.' }
}

const WHERE = projectRoot
  ? `The project is at ${projectRoot}; address files by absolute path under it.`
  : 'The project is the session project directory; address files by absolute path.'
const BOUNDS =
  'Research informs decisions: make no product decisions, file no tickets, implement nothing, and publish nothing.'
const MAX_FAILURES = 3

const STRINGS = { type: 'array', items: { type: 'string' } }

const CONTEXT_SCHEMA = {
  type: 'object',
  required: ['summary', 'supported', 'gaps'],
  properties: {
    summary: { type: 'string', description: 'What the existing library already supports about the question' },
    supported: { ...STRINGS, description: 'Supported claims, each with the library file and heading it comes from' },
    gaps: { ...STRINGS, description: 'What the library does not cover, stale or contested material included' },
  },
}

const SPEC_SCHEMA = {
  type: 'object',
  required: ['path', 'revision', 'date', 'subQuestions', 'changedSubQuestions', 'plannedRawNotes'],
  properties: {
    path: { type: 'string', description: 'Absolute path of the spec' },
    date: { type: 'string', description: 'Today\'s date as YYYY-MM-DD, the one the spec and the raw-note names use' },
    plannedRawNotes: {
      type: 'array',
      description:
        'The raw notes the research will produce: one note per canonical source, as the library conventions require, at the path the conventions name for raw notes. The same plan is written in the spec as its planned artifacts',
      items: {
        type: 'object',
        required: ['path', 'source', 'subQuestions'],
        properties: {
          path: { type: 'string', description: 'Absolute path of the raw note, derived from the source (never from a sub-question id)' },
          source: { type: 'string', description: 'The canonical source the note records: a URL, or a project file path' },
          subQuestions: { ...STRINGS, description: 'Ids of the sub-questions whose evidence belongs in this note' },
        },
      },
    },
    revision: { type: 'string', description: 'A digest of the exact revision written, such as a content hash or line count with the last heading' },
    subQuestions: {
      type: 'array',
      description: 'The bounded sub-questions to retrieve, each with a short stable id',
      items: {
        type: 'object',
        required: ['id', 'question'],
        properties: { id: { type: 'string' }, question: { type: 'string' } },
      },
    },
    changedSubQuestions: { ...STRINGS, description: 'Ids of sub-questions that are new or whose retrieval must be redone after a revision; all ids for the first draft' },
  },
}

// A spec issue is material only when the question, scope, evidence standards, or planned
// artifacts must change. A minor note, a style point, or "nothing material" is not material.
function SPEC_ISSUE_SCHEMA(doing) {
  return {
    type: 'object',
    required: ['material', 'change'],
    properties: {
      material: {
        type: 'boolean',
        description: `true only if, while ${doing}, you found that the spec's question, scope, evidence standards, or planned artifacts must change for the research to be sound; false for anything else, including minor notes`,
      },
      change: {
        type: 'string',
        description: 'When material is true, the change needed and which of question, scope, evidence standards, or planned artifacts it moves; otherwise an empty string',
      },
    },
  }
}

function materialIssue(issue) {
  return !!issue && issue.material === true && typeof issue.change === 'string' && issue.change.trim().length > 3
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['verdict', 'findings', 'evidence', 'specIssue'],
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail', 'unverified'] },
    findings: { ...STRINGS, description: 'Each finding with the path or claim it concerns; empty on pass' },
    evidence: { type: 'string', description: 'What was checked and how' },
    specIssue: SPEC_ISSUE_SCHEMA('judging'),
  },
}

const RESEARCH_SCHEMA = {
  type: 'object',
  required: ['findings', 'sources', 'contradictions', 'limits', 'specIssue'],
  properties: {
    sources: {
      type: 'array',
      description:
        'Every distinct source whose content the findings quote or rest on to answer the question, one entry per canonical source. Leave out the research spec, the library conventions and templates, and any file you read only for orientation',
      items: {
        type: 'object',
        required: ['url', 'title', 'origin'],
        properties: {
          url: { type: 'string', description: 'Canonical URL, or project file path' },
          title: { type: 'string' },
          origin: { type: 'string', description: 'When url is a library raw note, the canonical source that note records in its source field; otherwise an empty string' },
        },
      },
    },
    findings: { ...STRINGS, description: 'Each as: claim <- source (URL, title, author); retrieved date; published/version date; supporting passage (quote | paraphrase | inference)' },
    contradictions: STRINGS,
    limits: { ...STRINGS, description: 'Failed or thin retrievals with query, provider, and observation; unfetched leads' },
    specIssue: SPEC_ISSUE_SCHEMA('retrieving'),
  },
}

const RAW_SCHEMA = {
  type: 'object',
  required: ['produced', 'deferredMetadata', 'skipped', 'reason'],
  properties: {
    produced: { ...STRINGS, description: 'Absolute paths of the raw notes written or appended; an empty array when you deliberately wrote nothing' },
    skipped: { type: 'boolean', description: 'true only when you deliberately wrote nothing because the evidence has nothing for this source' },
    reason: { type: 'string', description: 'When skipped is true, why nothing was written; otherwise an empty string' },
    deferredMetadata: { ...STRINGS, description: 'Index, taxonomy, or log entries left for the integrator' },
  },
}

const INTEGRATION_SCHEMA = {
  type: 'object',
  required: ['answer', 'rawNotes', 'synthesis', 'metadata', 'gaps', 'contradictions', 'limits'],
  properties: {
    answer: { type: 'string', description: 'The cited answer to the question, as far as the evidence allows' },
    rawNotes: {
      ...STRINGS,
      description:
        'The authoritative current list: absolute paths of every raw note of this research that exists after your work. Leave out notes that were merged or deleted',
    },
    synthesis: { ...STRINGS, description: 'Absolute paths of the wiki and topic pages written or updated' },
    metadata: { ...STRINGS, description: 'Absolute paths of the index, taxonomy, and log files updated' },
    gaps: STRINGS,
    contradictions: STRINGS,
    limits: STRINGS,
  },
}

const attempts = []
let specFailures = 0
let persistFailures = 0
let persisted = null // latest integration or repair result
let pendingWritten = [] // raw notes written since the last integration returned
let pendingDeferred = [] // deferred metadata not yet integrated
let writtenFor = [] // {source, sub}: evidence of a sub-question already written to that source's note
let sourcePaths = [] // {source, path}: where each source's raw note was written; new evidence never clears it
let pendingExisting = [] // library raw notes the research cites, for the integrator
let pendingLeads = [] // planned sources with no retrieved evidence, for the integrator
const retrievalTries = {} // sub-question id -> researcher attempts without a result
const MAX_RETRIEVAL_TRIES = 2
let currentRaw = [] // the authoritative current list of raw notes; the latest structured list wins

function blocked(gate, needs) {
  return {
    done: false,
    gate,
    attempts,
    needs,
  }
}

// A clerk that returns no verdict is dispatched again under its own bound: that is not a failure of the
// gate it judges and sends no producer to revise. Null when the bound is spent.
async function clerkVerdict(prompt, opts) {
  for (let i = 1; i <= MAX_FAILURES; i++) {
    const v = await agent(prompt, opts)
    if (v) return v
    attempts.push({ gate: 'validator', approach: opts.label, failed: 'the clerk did not return a verdict' })
  }
  return null
}

// POSIX (/x), drive-letter (C:\x, C:/x), and UNC (\\host\x) paths are absolute.
const ABSOLUTE = /^(?:\/|[A-Za-z]:[\\/]|\\\\)/

// Only absolute Markdown paths count as paths; anything else in an agent's report is prose.
function onlyPaths(items) {
  const out = []
  for (const x of Array.isArray(items) ? items : []) {
    if (typeof x === 'string') {
      const t = x.trim()
      if (ABSOLUTE.test(t) && !/[\r\n]/.test(t) && /\.md$/i.test(t) && !out.includes(t)) out.push(t)
    }
  }
  return out
}

function toAbs(p) {
  const t = typeof p === 'string' ? p.trim() : ''
  if (!t || ABSOLUTE.test(t) || !projectRoot) return t
  const sep = projectRoot.includes('\\') && !projectRoot.includes('/') ? '\\' : '/'
  return `${projectRoot.replace(/[\\/]+$/, '')}${sep}${t.replace(/^\.[\\/]/, '')}`
}

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i

// Compare sources by a simple normal form: single forward slashes, lower case, and no plain fragment,
// utm_* tracking parameter, scheme, leading www., leading ./, or trailing slash. Other query
// parameters and hash routes (#/, #!) stay, because they can name a different source
// (watch?v=A, item?id=1).
function normSource(x) {
  return String(x || '')
    .trim()
    .replace(/\\/g, '/')
    .toLowerCase()
    .replace(/#(?![/!]).*$/, '')
    .replace(/\?(.*)$/, (m, q) => {
      const kept = q.split('&').filter(param => param && !/^utm_/.test(param))
      return kept.length ? `?${kept.join('&')}` : ''
    })
    .replace(SCHEME, '')
    .replace(/\/{2,}/g, '/')
    .replace(/^www\./, '')
    .replace(/^\.\//, '')
    .replace(/\/+(\?|$)/, '$1')
}

const FILE_PATH = /^(\/|[a-z]:\/)/

// A URL has a scheme other than file://.
function isUrl(x) {
  const t = String(x || '').trim()
  return SCHEME.test(t) && !/^file:\/\//i.test(t)
}

// With a project root, a relative file path means the file under it.
function canon(x) {
  const t = String(x || '').trim()
  return !t || SCHEME.test(t) || ABSOLUTE.test(t) || !projectRoot ? t : toAbs(t)
}

// Sources match exactly, except that a relative project path (when the project root is unknown)
// matches the absolute file path that ends in it. A URL matches only itself.
function sameSource(a, b) {
  const x = normSource(canon(a))
  const y = normSource(canon(b))
  if (!x || !y) return false
  if (x === y) return true
  const [long, short] = x.length >= y.length ? [x, y] : [y, x]
  return FILE_PATH.test(long) && long.endsWith('/' + short)
}

// A project path inside the library (a raw note, wiki page, or convention file) is never a
// source. A URL is never a project path.
function inLibrary(u) {
  return !isUrl(u) && /(^|\/)library\/(raw|wiki|_meta)\//.test(normSource(u))
}

// Compare paths with forward slashes, no repeated slashes, and a lower-case drive letter.
function normPath(p) {
  return String(p || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^([a-z]):/i, (m, d) => `${d.toLowerCase()}:`)
    .replace(/(.)\/{2,}/g, '$1/')
}

function isWritten(path) {
  const x = normPath(path)
  return [...currentRaw, ...pendingWritten].some(w => normPath(w) === x)
}

// source -> path of every raw note written so far that still exists
function writtenPairs() {
  const pairs = []
  for (const e of sourcePaths) {
    if (isWritten(e.path) && !pairs.some(q => sameSource(q.source, e.source))) pairs.push(e)
  }
  return pairs
}

// Raw notes are append-only and one per source, so a plan must not put a written source's note at
// another path. Each such move is a finding for the spec reviser.
function movedNotes(plan) {
  const moved = []
  for (const n of plan) {
    const w = n.source && writtenPairs().find(q => sameSource(q.source, n.source))
    if (w && normPath(w.path) !== normPath(n.path)) {
      moved.push(`The raw note for ${n.source} is already written at ${w.path}; keep that path (the plan puts it at ${n.path}).`)
    }
  }
  return moved
}

const FIXED_PATHS =
  'These source-to-path pairs are fixed: raw notes are append-only and one per source, so the path of a written note is never a spec or research issue. Do not ask to move one.'

function pairsText() {
  const pairs = writtenPairs()
  return pairs.length ? pairs.map(q => `- ${q.source} -> ${q.path}`).join('\n') : '- none'
}

// The integrator's and every repair's rawNotes is the authoritative current list; the latest
// structured list supersedes earlier ones. An empty or path-free list is not trusted.
function adoptRawList(result) {
  const latest = onlyPaths(result && result.rawNotes)
  if (latest.length) currentRaw = latest
  else log('The scribe returned no raw-note paths; keeping the workflow\'s own list')
}

function list(items) {
  return items && items.length ? items.map(x => `- ${x}`).join('\n') : '- none'
}

// ---- Context ---------------------------------------------------------------

phase('Context')
const context = await agent(
  `${WHERE}

Report what the project library already supports about this question, so supported work isn't repeated. Read library/_meta/librarian.md, then the relevant index and wiki pages and the raw notes behind them. Cite each supported claim to its file and heading, and name gaps, stale material, and contested pages. Make no internet requests and no writes.

Question: ${question}`,
  { agentType: 'slopify:library-reader', label: 'library context', phase: 'Context', schema: CONTEXT_SCHEMA },
)
if (!context) {
  return blocked('Context', ['The library-reader did not return; check that the project has a library (run /slopify:bootstrap) and invoke again.'])
}

// ---- Spec gate -------------------------------------------------------------

let spec = null

// Write or revise the spec, then have a fresh library-clerk judge that exact revision.
// A failed or unverified verdict, and each revision forced by a spec issue, count against the budget.
async function passSpec(reason, issues) {
  phase('Spec')
  let findings = issues
  let why = reason
  while (true) {
    const revising = spec !== null
    const draft = await agent(
      `${WHERE}
${BOUNDS}

${revising ? `Revise the research spec at ${spec.path}. ${why}` : 'Write the research spec.'} Put it in the project's spec location (normally docs/specs/), and write only that file. It states the question, scope, evidence standards, planned artifacts, convention fit, acceptance, the bounded sub-questions to retrieve (each with a short stable id), and the raw notes to produce: one raw note per canonical source, as the library conventions require, at the conventional path derived from the source and not from a sub-question id, each naming the sub-questions whose evidence it holds. Return that plan as plannedRawNotes. It sets how good the evidence must be, not what the answer is, and it allows a supported uncertain answer. Read ${'`'}library/_meta/librarian.md${'`'} for the conventions. List in changedSubQuestions the ids that are new or whose retrieval must be redone${revising ? '' : ' (all of them for a first draft)'}.

Question: ${question}

What the library already supports:
${context.summary}
Supported:
${list(context.supported)}
Gaps:
${list(context.gaps)}
${revising ? `\nRaw notes already written by this run, as source -> path (keep each exactly: a raw note is append-only and one per source, so a written note is never moved):\n${pairsText()}` : ''}
${findings && findings.length ? `\nFindings to resolve:\n${list(findings)}` : ''}`,
      { agentType: 'slopify:library-scribe', label: revising ? 'revise spec' : 'draft spec', phase: 'Spec', schema: SPEC_SCHEMA },
    )
    if (!draft) {
      specFailures += 1
      attempts.push({ gate: 'spec', approach: 'library-scribe spec draft', failed: 'the scribe did not return' })
    } else {
      spec = { ...draft, plannedRawNotes: (draft.plannedRawNotes || []).map(n => ({ ...n, path: toAbs(n.path) })) }
      const moved = movedNotes(spec.plannedRawNotes)
      if (moved.length) {
        // Not judged: the file and the plan must agree, so the scribe revises again.
        specFailures += 1
        findings = moved
        why = 'The revision moved raw notes that are already written; keep their paths.'
        attempts.push({ gate: 'spec', approach: `spec revision ${spec.revision}`, failed: moved.join('; ') })
        log(`Spec revision ${spec.revision} moves written raw notes; sending it back to the scribe`)
        if (specFailures >= MAX_FAILURES) return false
        continue
      }
      const verdict = await clerkVerdict(
        `${WHERE}

Judge the research spec at ${spec.path}, revision ${spec.revision}, for research-spec readiness: the question's fit, the authorized scope, evidence standards that allow a supported uncertain answer, planned artifacts, convention fit (library/_meta/librarian.md), and verifiable acceptance. Judge that exact revision, including its planned raw notes (below): one note per canonical source and the conventional paths. Set specIssue.material to true only if the spec itself must change (its question, scope, evidence standards, or planned artifacts); minor notes are not material.

Question: ${question}

Planned raw notes:
${JSON.stringify(spec.plannedRawNotes, null, 2)}

Raw notes already written, as source -> path:
${pairsText()}
${FIXED_PATHS}`,
        { agentType: 'slopify:library-clerk', label: 'judge spec', phase: 'Spec', schema: VERDICT_SCHEMA },
      )
      if (!verdict) return false
      if (verdict.verdict === 'pass') {
        return true
      }
      specFailures += 1
      findings = verdict.findings
      attempts.push({
        gate: 'spec',
        approach: `spec revision ${spec.revision}`,
        failed: `${verdict.verdict}: ${verdict.findings.join('; ')}`,
      })
      why = 'A fresh library-clerk did not pass it; resolve its findings.'
    }
    if (specFailures >= MAX_FAILURES) return false
  }
}

if (!(await passSpec('', []))) {
  return blocked('Spec', ['A spec a fresh library-clerk will pass; see the findings in attempts.'])
}

// ---- Retrieve, persist, validate ------------------------------------------

const evidence = {} // sub-question id -> researcher result
let pending = spec.subQuestions.map(s => s.id) // sub-questions to (re)retrieve
let verdict = null

// The sources a sub-question's evidence cites. Library paths are never sources: a cited raw note
// is an existing note to cite (its origin only counts a planned source as covered), and other
// library files are dropped. The spec is not a source either.
function citedSources(id) {
  const ev = evidence[id]
  const usable = []
  const notes = []
  for (const x of ev.sources || []) {
    if (inLibrary(x.url)) {
      if (/(^|\/)library\/raw\//.test(normSource(x.url))) notes.push({ path: canon(x.url), origin: x.origin || '' })
      else log(`Sub-question ${id}: dropped library path ${x.url} as a source`)
    } else if (normSource(x.url) && !sameSource(spec.path, x.url)) usable.push(x)
  }
  if (!usable.length && !notes.length && (ev.findings || []).length) {
    for (const n of spec.plannedRawNotes) if (n.source && n.subQuestions.includes(id)) usable.push({ url: n.source, title: '' })
  }
  return { usable, notes }
}

// A short deterministic hash (base 36, multiplier 31) of the full source key.
function hashOf(text) {
  let h = 0
  for (const ch of text) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0
  return (h >>> 0).toString(36)
}

// <the most specific part of the source>-<hash of the whole key>: the last path segments relative
// to the project root (or of the URL), the tail of them kept, so distinct sources never share a
// path, in this run or across runs.
function slugOf(key) {
  const root = normSource(projectRoot)
  let part = root && key.startsWith(`${root}/`) ? key.slice(root.length + 1) : key
  part = part.split('/').slice(-3).join('/')
  const words = part.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(-48).replace(/^-+/, '')
  return `${words || 'source'}-${hashOf(key)}`
}

// Where this run's raw notes live, taken from the plan when it names one.
function rawDir() {
  for (const n of spec.plannedRawNotes) {
    const m = normPath(n.path).match(/^(.*\/library\/raw)\/[^/]+$/i)
    if (m) return m[1]
  }
  return projectRoot ? `${normPath(projectRoot).replace(/\/+$/, '')}/library/raw` : 'library/raw'
}

// Every job gets its exclusive path in code: the source's written path, else its planned path,
// else <library>/raw/<date>-<slug of the source>.md, distinct from every other path in the batch.
function assignPaths(jobs) {
  const taken = new Set([...currentRaw, ...pendingWritten, ...sourcePaths.map(q => q.path), ...spec.plannedRawNotes.map(n => n.path)].map(normPath))
  for (const job of jobs) {
    const known = sourcePaths.find(q => sameSource(q.source, job.source))
    const planned = spec.plannedRawNotes.find(n => n.source && sameSource(n.source, job.source))
    if (known || planned) {
      job.path = (known || planned).path
    } else {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(spec.date || '') ? `${spec.date}-` : ''
      const base = `${rawDir()}/${date}${slugOf(job.key)}`
      let candidate = `${base}.md`
      for (let n = 2; taken.has(normPath(candidate)); n += 1) candidate = `${base}-${n}.md`
      job.path = candidate
    }
    taken.add(normPath(job.path))
  }
}

// One writer per source. It receives the evidence of every sub-question that cites the source,
// whichever sub-questions the plan lists; coverage is per (source, sub-question).
function buildJobs(leads) {
  const jobs = []
  const origins = []
  for (const s of spec.subQuestions) {
    if (!evidence[s.id]) continue
    const { usable, notes } = citedSources(s.id)
    for (const note of notes) {
      if (!pendingExisting.includes(note.path)) pendingExisting.push(note.path)
      if (note.origin) origins.push(note.origin)
    }
    if ((evidence[s.id].findings || []).length && !usable.length && !notes.length) log(`Sub-question ${s.id}: findings cite no usable source; no raw note will hold them`)
    for (const src of usable) {
      if (writtenFor.some(e => e.sub === s.id && sameSource(e.source, src.url))) continue
      let job = jobs.find(j => sameSource(j.source, src.url))
      if (!job) {
        const planned = spec.plannedRawNotes.find(n => n.source && sameSource(n.source, src.url))
        job = { key: normSource(canon(planned ? planned.source : src.url)), source: planned ? planned.source : src.url, title: src.title, path: '', subs: [] }
        jobs.push(job)
      }
      if (!job.subs.includes(s.id)) job.subs.push(s.id)
    }
  }
  assignPaths(jobs)
  for (const n of spec.plannedRawNotes) {
    const covered =
      jobs.some(j => sameSource(j.source, n.source)) ||
      writtenFor.some(e => sameSource(e.source, n.source)) ||
      origins.some(o => sameSource(o, n.source)) ||
      isWritten(n.path)
    if (n.source && !covered) {
      leads.push(`${n.source}: planned for ${n.path}, but no retrieved evidence cites it; record it as an unretrieved lead, not as evidence`)
    }
  }
  return jobs
}

function jobPrompt(job) {
  const target = `Write the one raw note for the source ${job.source}${job.title ? ` (${job.title})` : ''} at ${job.path}. That path is yours alone; use it exactly, and if the note already exists, append a dated section instead of rewriting it. The one exception: if another raw note already holds this same canonical source, append to that note instead and return its path.`
  const material = job.subs.map(id => ({ id, question: spec.subQuestions.find(s => s.id === id).question, evidence: evidence[id] }))
  return `${WHERE}
${BOUNDS}

Assignment: raw notes. ${target} Record only the findings that rest on that source; other sources have their own writers. The library keeps one raw note per canonical source, so before writing, search the raw notes' source fields for the canonical source. Write only that note, and leave the index, taxonomy, and log untouched; return their entries as deferred metadata. In produced, return the absolute path of the note you wrote or appended. If the evidence has nothing for this source, write nothing and return skipped true with the reason.

Research spec: ${spec.path} (revision ${spec.revision})

Evidence:
${JSON.stringify(material, null, 2)}`
}

while (true) {
  // Retrieve
  if (pending.length) {
    phase('Retrieve')
    const toRun = spec.subQuestions.filter(s => pending.includes(s.id))
    const results = await parallel(
      toRun.map(s => () =>
        agent(
          `${WHERE}
${BOUNDS}

Investigate this one sub-question of the research spec at ${spec.path} (revision ${spec.revision}), through the source provider the library conventions name (library/_meta/librarian.md). Meet the spec's evidence standards. List in sources only the sources whose content your findings quote or rest on to answer the question; never the spec, the library conventions, or files you read only for orientation. If you rely on a note already in the library, give its path as url and the canonical source it records in origin. Set specIssue.material to true only if the spec itself must change (its question, scope, evidence standards, or planned artifacts); minor notes are not material.

Question: ${question}
Sub-question ${s.id}: ${s.question}

Already supported by the library:
${list(context.supported)}`,
          { agentType: 'slopify:library-researcher', label: `retrieve ${s.id}`, phase: 'Retrieve', schema: RESEARCH_SCHEMA },
        ),
      ),
    )
    const issues = []
    const retry = []
    toRun.forEach((s, i) => {
      if (results[i]) {
        retrievalTries[s.id] = 0
        evidence[s.id] = results[i]
        if (materialIssue(results[i].specIssue)) issues.push(`Sub-question ${s.id}: ${results[i].specIssue.change}`)
        else if (results[i].specIssue && results[i].specIssue.change) log(`Sub-question ${s.id}: non-material spec note ignored`)
      } else {
        retrievalTries[s.id] = (retrievalTries[s.id] || 0) + 1
        if (retrievalTries[s.id] < MAX_RETRIEVAL_TRIES) {
          retry.push(s.id)
          log(`Sub-question ${s.id}: no researcher result; retrieving it again`)
        } else {
          // No evidence: recorded as a retrieval limit, and no raw note is written for it.
          evidence[s.id] = { findings: [], sources: [], contradictions: [], limits: ['The researcher did not return.'], specIssue: { material: false, change: '' } }
          log(`Sub-question ${s.id}: no researcher result after ${retrievalTries[s.id]} attempts; recorded as a retrieval limit`)
        }
      }
    })
    // New evidence for a sub-question has to be written again.
    for (const s of toRun) if (evidence[s.id] && !retry.includes(s.id)) writtenFor = writtenFor.filter(e => e.sub !== s.id)
    pending = []
    persisted = null
    if (issues.length) {
      // A material spec change: the new revision must pass a fresh clerk before work continues.
      specFailures += 1
      attempts.push({ gate: 'spec', approach: 'spec revision forced by retrieval', failed: issues.join('; ') })
      if (specFailures >= MAX_FAILURES) return blocked('Spec', ['A spec that survives retrieval; see attempts.'])
      if (!(await passSpec('Researchers reported a material spec issue; revise it.', issues))) {
        return blocked('Spec', ['A spec a fresh library-clerk will pass; see the findings in attempts.'])
      }
      pending = spec.changedSubQuestions.filter(id => spec.subQuestions.some(s => s.id === id))
      for (const s of spec.subQuestions) if (!evidence[s.id] && !pending.includes(s.id)) pending.push(s.id)
      for (const id of retry) if (!pending.includes(id)) pending.push(id)
      continue
    }
    if (retry.length) {
      pending = retry
      continue
    }
  }

  // Persist
  if (!persisted) {
    phase('Persist')
    const leads = []
    let todo = buildJobs(leads)
    pendingLeads.push(...leads.filter(l => !pendingLeads.includes(l)))
    while (todo.length) {
      const raw = await parallel(
        todo.map(job => () =>
          agent(jobPrompt(job), {
            agentType: 'slopify:library-scribe',
            label: `raw note ${job.path ? job.path.split(/[\\/]/).pop() : job.key.slice(0, 40)}`,
            phase: 'Persist',
            schema: RAW_SCHEMA,
          }),
        ),
      )
      const failed = []
      raw.forEach((r, i) => {
        const paths = r ? onlyPaths(r.produced) : []
        if (r && !paths.length && r.skipped === true && typeof r.reason === 'string' && r.reason.trim()) {
          // A deliberate no-op is not a failure; the source becomes an unretrieved lead.
          const lead = `${todo[i].source || todo[i].key}: no raw note written (${r.reason.trim()}); record it as an unretrieved lead, not as evidence`
          if (!pendingLeads.includes(lead)) pendingLeads.push(lead)
          pendingDeferred.push(...(r.deferredMetadata || []))
          for (const sub of todo[i].subs) writtenFor.push({ source: todo[i].source, sub })
          return
        }
        if (!paths.length) {
          failed.push(todo[i])
          return
        }
        // A writer that returns another source's path judged the two to be one canonical source:
        // record this source against that path instead of failing the write.
        const own = normPath(paths[0]) === normPath(todo[i].path)
        const holder = !own && sourcePaths.find(q => normPath(q.path) === normPath(paths[0]) && !sameSource(q.source, todo[i].source))
        if (holder) log(`Raw note ${paths[0]} holds both ${holder.source} and ${todo[i].source}; the scribe judged them one canonical source, so they share it`)
        for (const p of paths) if (!pendingWritten.includes(p)) pendingWritten.push(p)
        pendingDeferred.push(...(r.deferredMetadata || []))
        if (!sourcePaths.some(q => sameSource(q.source, todo[i].source))) sourcePaths.push({ source: todo[i].source, path: paths[0] })
        for (const sub of todo[i].subs) writtenFor.push({ source: todo[i].source, sub })
      })
      todo = failed
      if (todo.length) {
        persistFailures += 1
        attempts.push({ gate: 'persist', approach: `raw notes for ${todo.map(j => j.key).join(', ')}`, failed: 'the scribe returned no note path' })
        if (persistFailures >= MAX_FAILURES) return blocked('Persist', ['A raw note for every planned source; see attempts.'])
        log(`Raw-note writers returned no path for ${todo.length} note(s); retrying them`)
      }
    }
    for (const p of pendingWritten) if (!currentRaw.includes(p)) currentRaw.push(p)

    // Exactly one integrator, after every raw-note write has returned.
    const integrated = await agent(
      `${WHERE}
${BOUNDS}

Assignment: integration. You are the only writer of the synthesis and shared metadata for this batch. All raw-note writes have finished. Integrate the research spec at ${spec.path} (revision ${spec.revision}) into the library: write the wiki synthesis that answers the question with each consequential claim cited to its raw-note evidence anchor, and complete the index, taxonomy, and log, including the deferred metadata below. Never overwrite raw notes with synthesis, and keep uncertainty, contradictions, and unretrieved leads visible. Report each raw note's disposition. In rawNotes, return the authoritative current list of this research's raw notes (absolute paths).

Question: ${question}

Raw notes written by this run:
${list(currentRaw)}

Raw notes written since the last integration:
${list(pendingWritten)}

Deferred metadata:
${list(pendingDeferred)}

Library raw notes the research cites (existing notes: cite them, do not rewrite them or re-append their evidence):
${list(pendingExisting)}

Planned sources with no retrieved evidence (keep each visible as an unretrieved lead in the library's format; cite nothing about its contents):
${list(pendingLeads)}

Retrieval limits and contradictions reported by researchers:
${JSON.stringify(
  spec.subQuestions.filter(s => evidence[s.id]).map(s => ({ id: s.id, contradictions: evidence[s.id].contradictions, limits: evidence[s.id].limits })),
  null,
  2,
)}`,
      { agentType: 'slopify:library-scribe', label: 'integrate', phase: 'Persist', schema: INTEGRATION_SCHEMA },
    )
    if (!integrated) {
      persistFailures += 1
      attempts.push({ gate: 'persist', approach: 'integration', failed: 'the integrator did not return' })
      if (persistFailures >= MAX_FAILURES) return blocked('Persist', ['A completed integration; see attempts.'])
      continue
    }
    persisted = integrated
    adoptRawList(persisted)
    pendingWritten = []
    pendingDeferred = []
    pendingLeads = []
    pendingExisting = []
  }

  // Validate: a fresh clerk, after integration.
  phase('Validate')
  verdict = await clerkVerdict(
    `${WHERE}

Validate the persisted research: the changed paths, the draft answer, the raw evidence, the spec revision, and the affected links and metadata. Check that scope against the library conventions (library/_meta/librarian.md) and the cited sources, not the whole library. Set specIssue.material to true only if the spec itself must change (its question, scope, evidence standards, or planned artifacts); minor notes are not material.

Question: ${question}
Spec: ${spec.path} (revision ${spec.revision})
Raw notes:
${list(currentRaw)}
Written raw notes, as source -> path. ${FIXED_PATHS}
${pairsText()}
Synthesis:
${list(onlyPaths(persisted.synthesis))}
Metadata:
${list(onlyPaths(persisted.metadata))}

Draft answer:
${persisted.answer}`,
    { agentType: 'slopify:library-clerk', label: 'validate research', phase: 'Validate', schema: VERDICT_SCHEMA },
  )

  if (!verdict) return blocked('Persist', ['A verdict from a fresh library-clerk on the persisted research; see attempts.'])
  if (verdict.verdict === 'pass') {
    const artifacts = {
      spec: spec.path,
      rawNotes: currentRaw,
      synthesis: onlyPaths(persisted.synthesis),
      metadata: onlyPaths(persisted.metadata),
    }
    return {
      done: true,
      answer: persisted.answer,
      artifacts,
      verdict: { verdict: verdict.verdict, evidence: verdict.evidence },
      report: [
        `Research done; a fresh library-clerk passed it (${verdict.evidence}).`,
        `Spec: ${artifacts.spec}`,
        `Raw notes: ${artifacts.rawNotes.join(', ') || 'none'}`,
        `Synthesis: ${artifacts.synthesis.join(', ') || 'none'}`,
        `Index and log: ${artifacts.metadata.join(', ') || 'none'}`,
      ].join('\n'),
      gaps: persisted.gaps,
      contradictions: persisted.contradictions,
      limits: persisted.limits,
    }
  }

  persistFailures += 1
  const findings = verdict.findings
  attempts.push({
    gate: 'persist',
    approach: `integration validated as ${verdict.verdict}`,
    failed: findings.join('; '),
  })
  if (persistFailures >= MAX_FAILURES) {
    return blocked('Persist', ['Persisted research a fresh library-clerk will pass; see the findings in attempts.'])
  }

  if (materialIssue(verdict.specIssue)) {
    // The spec itself must change: revise, re-pass the gate, then redo the affected work.
    specFailures += 1
    attempts.push({ gate: 'spec', approach: 'spec revision forced by validation', failed: verdict.specIssue.change })
    if (specFailures >= MAX_FAILURES) return blocked('Spec', ['A spec that survives validation; see attempts.'])
    if (!(await passSpec('The final validation reported a material spec issue; revise it.', [verdict.specIssue.change]))) {
      return blocked('Spec', ['A spec a fresh library-clerk will pass; see the findings in attempts.'])
    }
    pending = spec.changedSubQuestions.filter(id => spec.subQuestions.some(s => s.id === id))
    for (const s of spec.subQuestions) if (!evidence[s.id] && !pending.includes(s.id)) pending.push(s.id)
    persisted = null
    continue
  }

  // Repair: a new scribe, the only writer, then a new clerk on the next pass.
  phase('Persist')
  const repaired = await agent(
    `${WHERE}
${BOUNDS}

Assignment: integration repair. You are the only writer. A fresh library-clerk did not pass the persisted research. Repair exactly these findings in the files they concern, without researching new questions, and keep uncertainty and contradictions visible. Then return the same report as the integration; rawNotes is the authoritative current list of this research's raw notes after your repair, without any note you merged or deleted.

Spec: ${spec.path} (revision ${spec.revision})
Question: ${question}

Findings:
${list(findings)}

Current artifacts:
Raw notes:
${list(currentRaw)}
Synthesis:
${list(onlyPaths(persisted.synthesis))}
Metadata:
${list(onlyPaths(persisted.metadata))}`,
    { agentType: 'slopify:library-scribe', label: 'repair', phase: 'Persist', schema: INTEGRATION_SCHEMA },
  )
  if (repaired) {
    persisted = repaired
    adoptRawList(persisted)
  } else attempts.push({ gate: 'persist', approach: 'repair', failed: 'the scribe did not return' })
}
