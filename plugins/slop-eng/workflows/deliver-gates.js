export const meta = {
  name: 'deliver-gates',
  description: 'Run the delivery gates (spec, build, verify) with fresh validators and failure budgets',
  whenToUse: 'Started by the deliver skill; not a direct entry point.',
  phases: [
    { title: 'Spec', detail: 'writer drafts, a fresh auditor judges' },
    { title: 'Build', detail: 'coder implements, writer updates documentation' },
    { title: 'Verify', detail: 'a fresh validator judges the candidate' },
  ],
}

const BUDGET = 3
const input = typeof args === 'string' ? JSON.parse(args) : args || {}
const mode = input.mode || 'hard'
const failures = { spec: 0, implementation: 0, ...(input.failures || {}) }
const attempts = []
let specRevision = null
let auditCount = 0
let verifyCount = 0

const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail', 'unverified'] },
    revision: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          problem: { type: 'string' },
          blocking: { type: 'boolean' },
          area: { type: 'string', enum: ['spec', 'code', 'docs'] },
        },
        required: ['location', 'problem', 'blocking', 'area'],
      },
    },
    limits: { type: 'string' },
  },
  required: ['verdict', 'revision', 'findings', 'limits'],
}

const REPORT = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['done', 'spec_defect', 'unworkable', 'blocked'] },
    changed: { type: 'array', items: { type: 'string' } },
    open: { type: 'string' },
  },
  required: ['status', 'changed', 'open'],
}

class Stop {
  constructor(status, blocker, findings) {
    this.status = status
    this.blocker = blocker || null
    this.findings = findings || []
  }
}

function header() {
  return [
    `Project: ${input.worktree}. Address it by absolute path; the story branch started at ${input.base}.`,
    `Request: ${input.request}`,
    `Acceptance source, verbatim:\n${input.acceptance}`,
    input.context ? `Context:\n${input.context}` : '',
    input.decision ? `The user decided: ${input.decision}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function list(findings) {
  return findings.map((f, i) => `${i + 1}. ${f.location}: ${f.problem}`).join('\n')
}

function specLine() {
  if (!input.spec) return 'Spec: none; this is easy work.'
  return specRevision
    ? `Validated spec: ${input.spec} at revision ${specRevision}.`
    : `Validated spec: ${input.spec}.`
}

function record(gate, role, outcome, revision, findings) {
  attempts.push({ gate, role, outcome, revision: revision || null, findings: findings || [] })
}

function fail(gate, role, revision, findings) {
  failures[gate]++
  record(gate, role, 'fail', revision, findings)
  log(`${gate} failure ${failures[gate]}/${BUDGET}`)
  if (failures[gate] >= BUDGET) throw new Stop('budget_exhausted', `${gate} budget spent`, findings)
}

async function produce(role, gate, task, label, phaseName) {
  const brief = `${header()}\n\n${task}\n\nOther active writers: none while you run.`
  const report = await agent(brief, { agentType: `slop-eng:${role}`, schema: REPORT, label, phase: phaseName })
  if (!report) throw new Stop('blocked', `${label} returned nothing`)
  if (report.status === 'blocked') throw new Stop('blocked', `${label}: ${report.open}`)
  if (report.status === 'unworkable') {
    fail(gate, role, null, [{ location: label, problem: report.open, blocking: true, area: gate === 'spec' ? 'spec' : 'code' }])
    return produce(role, gate, `${task}\n\nAn earlier approach was abandoned as unworkable: ${report.open}`, label, phaseName)
  }
  return report
}

async function judge(role, task, earlier, label, phaseName) {
  const recheck = earlier.length ? `\n\nEarlier validator findings, as places to recheck:\n${list(earlier)}` : ''
  const brief = `${header()}\n\n${task}${recheck}`
  const verdict = await agent(brief, { agentType: `slop-eng:${role}`, schema: VERDICT, label, phase: phaseName })
  if (!verdict) throw new Stop('blocked', `${label} returned nothing`)
  if (verdict.verdict === 'unverified') {
    record(phaseName === 'Spec' ? 'spec' : 'implementation', role, 'unverified', verdict.revision, verdict.findings)
    throw new Stop('blocked', `${label} could not verify: ${verdict.limits}`, verdict.findings)
  }
  return verdict
}

async function specGate(reason) {
  if (!input.spec) throw new Stop('blocked', `the work needs a spec change and has no spec: ${reason}`)
  phase('Spec')
  const write = reason
    ? `Revise the spec at ${input.spec}: ${reason}`
    : `Write the spec at ${input.spec}.`
  await produce(
    'writer',
    'spec',
    `${write} It covers what ${input.skillDir}/references/specification.md asks of a delivery spec. You may write only ${input.spec}.`,
    'writer:spec',
    'Spec',
  )
  let earlier = []
  for (;;) {
    auditCount++
    const verdict = await judge(
      'auditor',
      `Judge the readiness of the spec at ${input.spec}; record its \`git hash-object\` as the revision. Challenge the design where the approach is high-risk or uncertain.`,
      earlier,
      `auditor:spec#${auditCount}`,
      'Spec',
    )
    if (verdict.verdict === 'pass') {
      specRevision = verdict.revision
      record('spec', 'auditor', 'pass', verdict.revision)
      return
    }
    fail('spec', 'auditor', verdict.revision, verdict.findings)
    earlier = verdict.findings
    await produce(
      'writer',
      'spec',
      `Fix these findings in the spec at ${input.spec}, never by weakening a criterion. You may write only ${input.spec}.\n${list(verdict.findings)}`,
      'writer:spec-fix',
      'Spec',
    )
  }
}

const claims = `Where a finding says a document states something false, follow ${input.pluginRoot}/references/claim-correction.md and keep its records in ${input.worktree}/.tmp/claim-records.md.`

async function build(findings) {
  phase('Build')
  const byArea = (area) => (findings || []).filter((f) => f.area === area)
  if (findings && byArea('spec').length) {
    await specGate(`these findings say the spec is wrong:\n${list(byArea('spec'))}`)
    return build(null)
  }
  const single = mode === 'easy' ? input.producer || 'coder' : null
  const coderTask = findings
    ? `Fix these findings, adding regression tests where they are missing:\n${list(single === 'coder' ? findings : byArea('code'))}`
    : `Implement the request with regression tests. ${specLine()}`
  const writerTask = findings
    ? `Fix these documentation findings. ${claims}\n${list(single === 'writer' ? findings : byArea('docs'))}`
    : single === 'writer'
      ? `Make the requested documentation change. ${claims}`
      : 'Update the documentation the change affects so it describes the system as it now is; leave the code and tests as they are.'

  if (single !== 'writer' && (!findings || single === 'coder' || byArea('code').length)) {
    const report = await produce('coder', 'implementation', `${coderTask}\nWrite code, tests, and configuration only; leave documentation and the spec to the writer.`, 'coder', 'Build')
    if (report.status === 'spec_defect') {
      await specGate(`the coder reports the spec is wrong: ${report.open}`)
      return build(null)
    }
  }
  if (single === 'writer' || (!single && (!findings || byArea('docs').length))) {
    await produce('writer', 'implementation', `${writerTask} ${specLine()}`, 'writer:docs', 'Build')
  }
}

async function verify() {
  const role = mode === 'easy' && input.producer === 'writer' ? 'auditor' : 'qa'
  let earlier = input.findings || []
  for (;;) {
    phase('Verify')
    verifyCount++
    const verdict = await judge(
      role,
      `Judge the candidate: the working tree of ${input.worktree}, uncommitted and untracked content included, against ${input.base}. ${specLine()} Find the changed paths yourself, and judge correctness, acceptance, and the documentation the change affects in one pass. If ${input.worktree}/.tmp/claim-records.md exists, grade it as ${input.pluginRoot}/references/claim-correction.md describes. Record as the revision the HEAD commit plus a digest of uncommitted and untracked content.`,
      earlier,
      `${role}#${verifyCount}`,
      'Verify',
    )
    if (verdict.verdict === 'pass') {
      record('implementation', role, 'pass', verdict.revision)
      return verdict.revision
    }
    fail('implementation', role, verdict.revision, verdict.findings)
    earlier = verdict.findings
    const blocking = verdict.findings.filter((f) => f.blocking)
    await build(blocking.length ? blocking : verdict.findings)
  }
}

let result
try {
  if (mode === 'hard') await specGate(null)
  await build(mode === 'repair' ? input.findings || [] : null)
  const candidate = await verify()
  result = { status: 'passed', candidate, findings: [], blocker: null }
} catch (e) {
  if (!(e instanceof Stop)) throw e
  result = { status: e.status, candidate: null, findings: e.findings, blocker: e.blocker }
}

return {
  ...result,
  mode,
  spec: input.spec ? { path: input.spec, revision: specRevision } : null,
  failures,
  attempts,
}
