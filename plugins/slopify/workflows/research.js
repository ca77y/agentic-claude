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
  required: ['path', 'revision', 'subQuestions', 'changedSubQuestions', 'plannedRawNotes'],
  properties: {
    path: { type: 'string', description: 'Absolute path of the spec' },
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
        required: ['url', 'title'],
        properties: { url: { type: 'string', description: 'Canonical URL, or project file path' }, title: { type: 'string' } },
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
  required: ['produced', 'deferredMetadata'],
  properties: {
    produced: { ...STRINGS, description: 'Absolute paths of the raw notes written or appended; an empty array when none' },
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
let currentRaw = [] // the authoritative current list of raw notes; the latest structured list wins

function blocked(gate, needs) {
  return {
    done: false,
    gate,
    attempts,
    needs,
  }
}

// Only absolute Markdown paths count as paths; anything else in an agent's report is prose.
function onlyPaths(items) {
  const out = []
  for (const x of Array.isArray(items) ? items : []) {
    if (typeof x === 'string') {
      const t = x.trim()
      if (/^\/[^\n]*\.md$/.test(t) && !out.includes(t)) out.push(t)
    }
  }
  return out
}

function toAbs(p) {
  const t = typeof p === 'string' ? p.trim() : ''
  if (!t || t.startsWith('/') || !projectRoot) return t
  return `${projectRoot.replace(/\/+$/, '')}/${t.replace(/^\.\//, '')}`
}

function normSource(x) {
  return String(x || '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '')
}

function sameSource(a, b) {
  const x = normSource(a)
  const y = normSource(b)
  return !!x && !!y && (x === y || x.endsWith('/' + y) || y.endsWith('/' + x))
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
${revising ? `\nRaw notes already written by this run (keep their planned paths unless the revision requires otherwise):\n${list(currentRaw)}` : ''}
${findings && findings.length ? `\nFindings to resolve:\n${list(findings)}` : ''}`,
      { agentType: 'slopify:library-scribe', label: revising ? 'revise spec' : 'draft spec', phase: 'Spec', schema: SPEC_SCHEMA },
    )
    if (!draft) {
      specFailures += 1
      attempts.push({ gate: 'spec', approach: 'library-scribe spec draft', failed: 'the scribe did not return' })
    } else {
      spec = { ...draft, plannedRawNotes: (draft.plannedRawNotes || []).map(n => ({ ...n, path: toAbs(n.path) })) }
      const verdict = await agent(
        `${WHERE}

Judge the research spec at ${spec.path}, revision ${spec.revision}, for research-spec readiness: the question's fit, the authorized scope, evidence standards that allow a supported uncertain answer, planned artifacts, convention fit (library/_meta/librarian.md), and verifiable acceptance. Judge that exact revision, including its planned raw notes (below): one note per canonical source and the conventional paths. Set specIssue.material to true only if the spec itself must change (its question, scope, evidence standards, or planned artifacts); minor notes are not material.

Question: ${question}

Planned raw notes:
${JSON.stringify(spec.plannedRawNotes, null, 2)}`,
        { agentType: 'slopify:library-clerk', label: 'judge spec', phase: 'Spec', schema: VERDICT_SCHEMA },
      )
      if (verdict && verdict.verdict === 'pass') return true
      specFailures += 1
      findings = verdict ? verdict.findings : ['The clerk did not return a verdict.']
      attempts.push({
        gate: 'spec',
        approach: `spec revision ${spec.revision}`,
        failed: verdict ? `${verdict.verdict}: ${verdict.findings.join('; ')}` : 'the clerk did not return',
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
const dirty = new Set() // sub-questions whose evidence has no raw note yet
let verdict = null

// One writer per planned raw note, plus one per retrieved source the plan does not cover.
function buildJobs(ids) {
  const idSet = new Set(ids)
  const jobs = []
  for (const n of spec.plannedRawNotes) {
    const subs = n.subQuestions.filter(id => idSet.has(id))
    if (subs.length) jobs.push({ kind: 'planned', key: n.path, path: n.path, source: n.source, title: '', subs })
  }
  const extra = new Map()
  for (const id of ids) {
    for (const src of evidence[id].sources || []) {
      const own = sameSource(spec.path, src.url) || normSource(src.url).includes('library/_meta/')
      const covered = own || spec.plannedRawNotes.some(n => (n.source ? sameSource(n.source, src.url) : n.subQuestions.includes(id)))
      const key = normSource(src.url)
      if (covered || !key) continue
      if (!extra.has(key)) {
        const job = { kind: 'new', key, path: '', source: src.url, title: src.title, subs: [] }
        extra.set(key, job)
        jobs.push(job)
      }
      if (!extra.get(key).subs.includes(id)) extra.get(key).subs.push(id)
    }
  }
  return jobs
}

function jobPrompt(job) {
  const target =
    job.kind === 'planned'
      ? `Write the one planned raw note at ${job.path} for the source ${job.source}. That path is yours alone.`
      : `Write exactly one raw note for the source ${job.source}${job.title ? ` (${job.title})` : ''}, which the spec's plan does not cover, at the conventional raw-note path with a slug derived from the source (not from a sub-question).`
  const material = job.subs.map(id => ({ id, question: spec.subQuestions.find(s => s.id === id).question, evidence: evidence[id] }))
  return `${WHERE}
${BOUNDS}

Assignment: raw notes. ${target} Record only the findings that rest on that source; other sources have their own writers. The library keeps one raw note per canonical source: before creating the note, search the raw notes' source fields for the canonical source, and if a note for it already exists, append a dated section to that note instead of rewriting it. Write only that note, and leave the index, taxonomy, and log untouched; return their entries as deferred metadata. In produced, return the absolute path of the note you wrote or appended.

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

Investigate this one sub-question of the research spec at ${spec.path} (revision ${spec.revision}), through the source provider the library conventions name (library/_meta/librarian.md). Meet the spec's evidence standards. List in sources only the sources whose content your findings quote or rest on to answer the question; never the spec, the library conventions, or files you read only for orientation. Set specIssue.material to true only if the spec itself must change (its question, scope, evidence standards, or planned artifacts); minor notes are not material.

Question: ${question}
Sub-question ${s.id}: ${s.question}

Already supported by the library:
${list(context.supported)}`,
          { agentType: 'slopify:library-researcher', label: `retrieve ${s.id}`, phase: 'Retrieve', schema: RESEARCH_SCHEMA },
        ),
      ),
    )
    const issues = []
    toRun.forEach((s, i) => {
      if (results[i]) {
        evidence[s.id] = results[i]
        if (materialIssue(results[i].specIssue)) issues.push(`Sub-question ${s.id}: ${results[i].specIssue.change}`)
        else if (results[i].specIssue && results[i].specIssue.change) log(`Sub-question ${s.id}: non-material spec note ignored`)
      } else {
        evidence[s.id] = { findings: [], sources: [], contradictions: [], limits: ['The researcher did not return.'], specIssue: { material: false, change: '' } }
        log(`Sub-question ${s.id}: no researcher result; recorded as a retrieval limit`)
      }
    })
    for (const s of toRun) dirty.add(s.id)
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
      continue
    }
  }

  // Persist
  if (!persisted) {
    phase('Persist')
    const ids = spec.subQuestions.filter(s => evidence[s.id] && dirty.has(s.id)).map(s => s.id)
    const written = []
    const deferred = []
    let todo = buildJobs(ids)
    for (const id of ids) {
      if (!todo.some(j => j.subs.includes(id))) log(`Sub-question ${id}: no planned note and no source; nothing to persist`)
    }
    while (todo.length) {
      const raw = await parallel(
        todo.map(job => () =>
          agent(jobPrompt(job), {
            agentType: 'slopify:library-scribe',
            label: `raw note ${job.kind === 'planned' ? job.path.split('/').pop() : job.key.slice(0, 40)}`,
            phase: 'Persist',
            schema: RAW_SCHEMA,
          }),
        ),
      )
      const failed = []
      raw.forEach((r, i) => {
        const paths = r ? onlyPaths(r.produced) : []
        if (!paths.length) {
          failed.push(todo[i])
          return
        }
        for (const p of paths) if (!written.includes(p)) written.push(p)
        deferred.push(...(r.deferredMetadata || []))
      })
      todo = failed
      if (todo.length) {
        persistFailures += 1
        attempts.push({ gate: 'persist', approach: `raw notes for ${todo.map(j => j.key).join(', ')}`, failed: 'the scribe returned no note path' })
        if (persistFailures >= MAX_FAILURES) return blocked('Persist', ['A raw note for every planned source; see attempts.'])
        log(`Raw-note writers returned no path for ${todo.length} note(s); retrying them`)
      }
    }
    for (const id of ids) dirty.delete(id)
    for (const p of written) if (!currentRaw.includes(p)) currentRaw.push(p)

    // Exactly one integrator, after every raw-note write has returned.
    const integrated = await agent(
      `${WHERE}
${BOUNDS}

Assignment: integration. You are the only writer of the synthesis and shared metadata for this batch. All raw-note writes have finished. Integrate the research spec at ${spec.path} (revision ${spec.revision}) into the library: write the wiki synthesis that answers the question with each consequential claim cited to its raw-note evidence anchor, and complete the index, taxonomy, and log, including the deferred metadata below. Never overwrite raw notes with synthesis, and keep uncertainty, contradictions, and unretrieved leads visible. Report each raw note's disposition. In rawNotes, return the authoritative current list of this research's raw notes (absolute paths).

Question: ${question}

Raw notes written by this run:
${list(currentRaw)}

Raw notes written in this pass:
${list(written)}

Deferred metadata:
${list(deferred)}

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
  }

  // Validate: a fresh clerk, after integration.
  phase('Validate')
  verdict = await agent(
    `${WHERE}

Validate the persisted research: the changed paths, the draft answer, the raw evidence, the spec revision, and the affected links and metadata. Check that scope against the library conventions (library/_meta/librarian.md) and the cited sources, not the whole library. Set specIssue.material to true only if the spec itself must change (its question, scope, evidence standards, or planned artifacts); minor notes are not material.

Question: ${question}
Spec: ${spec.path} (revision ${spec.revision})
Raw notes:
${list(currentRaw)}
Synthesis:
${list(onlyPaths(persisted.synthesis))}
Metadata:
${list(onlyPaths(persisted.metadata))}

Draft answer:
${persisted.answer}`,
    { agentType: 'slopify:library-clerk', label: 'validate research', phase: 'Validate', schema: VERDICT_SCHEMA },
  )

  if (verdict && verdict.verdict === 'pass') {
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
  const findings = verdict ? verdict.findings : ['The clerk did not return a verdict.']
  attempts.push({
    gate: 'persist',
    approach: `integration validated as ${verdict ? verdict.verdict : 'no verdict'}`,
    failed: findings.join('; '),
  })
  if (persistFailures >= MAX_FAILURES) {
    return blocked('Persist', ['Persisted research a fresh library-clerk will pass; see the findings in attempts.'])
  }

  if (verdict && materialIssue(verdict.specIssue)) {
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
