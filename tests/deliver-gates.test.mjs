// Dry runs of the deliver workflows against stub agents: node --test tests/*.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dir = new URL('../plugins/slop-eng/workflows/', import.meta.url)
const source = (name) => readFileSync(new URL(name, dir), 'utf8').replace(/^export const meta/m, 'const meta')
const AsyncFunction = (async () => {}).constructor

const ARGS = {
  request: 'Fix add',
  acceptance: 'add returns the sum',
  worktree: '/w',
  base: 'abc',
  spec: '/w/docs/specs/add.md',
  pluginRoot: '/p',
  skillDir: '/p/skills/deliver',
}

// verdicts: queued answers per role, consumed in order; anything unqueued passes or reports done.
async function run(file, args, queued = {}) {
  const calls = []
  const agent = async (prompt, opts) => {
    const role = opts.agentType.replace('slop-eng:', '')
    calls.push({ role, label: opts.label, prompt })
    const next = (queued[opts.label] || queued[role] || []).shift()
    if (next !== undefined) return next
    return opts.schema.properties.verdict
      ? { verdict: 'pass', revision: `rev${calls.length}`, findings: [], limits: 'none' }
      : { status: 'done', changed: [], open: 'none' }
  }
  const workflow = (name, childArgs) => {
    assert.equal(name, 'slop-eng:deliver-gates')
    return new AsyncFunction('args', 'agent', 'phase', 'log', 'workflow', source('deliver-gates.js'))(childArgs, agent, () => {}, () => {}, workflow)
  }
  const result = await new AsyncFunction('args', 'agent', 'phase', 'log', 'workflow', source(file))(args, agent, () => {}, () => {}, workflow)
  return { result, labels: calls.map((c) => c.label), calls }
}

const fail = (area = 'code') => ({
  verdict: 'fail',
  revision: 'r',
  findings: [{ location: 'calc.py:2', problem: 'wrong', blocking: true, area }],
  limits: 'none',
})

test('hard work runs the gates in order', async () => {
  const { result, labels } = await run('deliver-gates.js', { ...ARGS, mode: 'hard' })
  assert.deepEqual(labels, ['writer:spec', 'auditor:spec#1', 'coder', 'writer:docs', 'qa#1'])
  assert.equal(result.status, 'passed')
  assert.equal(result.spec.revision, 'rev2')
})

test('args may arrive as a JSON string', async () => {
  const { result } = await run('deliver-gates.js', JSON.stringify({ ...ARGS, mode: 'hard' }))
  assert.equal(result.status, 'passed')
})

test('validator briefs hold no producer report', async () => {
  const { calls } = await run('deliver-gates.js', { ...ARGS, mode: 'hard' }, {
    coder: [{ status: 'done', changed: ['calc.py'], open: 'PRODUCER-NOTE' }],
  })
  for (const c of calls.filter((c) => c.role === 'qa' || c.role === 'auditor')) {
    assert.ok(!c.prompt.includes('PRODUCER-NOTE'))
  }
})

test('a spec failure loops back to the writer and a new auditor', async () => {
  const { result, labels } = await run('deliver-gates.js', { ...ARGS, mode: 'hard' }, { auditor: [fail('spec')] })
  assert.deepEqual(labels.slice(0, 4), ['writer:spec', 'auditor:spec#1', 'writer:spec-fix', 'auditor:spec#2'])
  assert.equal(result.failures.spec, 1)
})

test('a third implementation failure stops with every attempt', async () => {
  const { result, labels } = await run('deliver-gates.js', { ...ARGS, mode: 'hard' }, { qa: [fail(), fail(), fail()] })
  assert.equal(result.status, 'budget_exhausted')
  assert.equal(result.failures.implementation, 3)
  assert.equal(result.attempts.filter((a) => a.outcome === 'fail').length, 3)
  assert.equal(labels.at(-1), 'qa#3')
  assert.equal(result.findings.length, 1)
})

test('QA findings route by area', async () => {
  const { labels } = await run('deliver-gates.js', { ...ARGS, mode: 'hard' }, { qa: [fail('docs')] })
  assert.deepEqual(labels.slice(4), ['qa#1', 'writer:docs', 'qa#2'])
})

test('a spec finding from QA reopens the spec gate', async () => {
  const { labels } = await run('deliver-gates.js', { ...ARGS, mode: 'hard' }, { qa: [fail('spec')] })
  assert.deepEqual(labels.slice(5), ['writer:spec', 'auditor:spec#2', 'coder', 'writer:docs', 'qa#2'])
})

test('a coder spec defect reopens the spec with its count kept', async () => {
  const { result, labels } = await run('deliver-gates.js', { ...ARGS, mode: 'hard', failures: { spec: 1 } }, {
    coder: [{ status: 'spec_defect', changed: [], open: 'criterion 2 contradicts 1' }],
  })
  assert.deepEqual(labels, ['writer:spec', 'auditor:spec#1', 'coder', 'writer:spec', 'auditor:spec#2', 'coder', 'writer:docs', 'qa#1'])
  assert.equal(result.failures.spec, 1)
})

test('easy work skips the spec', async () => {
  const { result, labels } = await run('deliver-gates.js', { ...ARGS, spec: undefined, mode: 'easy' })
  assert.deepEqual(labels, ['coder', 'qa#1'])
  assert.equal(result.spec, null)
})

test('easy documentation work goes to the writer and an auditor', async () => {
  const { labels } = await run('deliver-gates.js', { ...ARGS, spec: undefined, mode: 'easy', producer: 'writer' })
  assert.deepEqual(labels, ['writer:docs', 'auditor#1'])
})

test('repair starts at the producers and adds to the passed counts', async () => {
  const findings = [{ location: 'calc.py:2', problem: 'wrong', blocking: true, area: 'code' }]
  const { result, labels, calls } = await run('deliver-repair.js', { ...ARGS, findings, failures: { spec: 0, implementation: 2 } }, { qa: [fail()] })
  assert.deepEqual(labels, ['coder', 'qa#1'])
  assert.equal(result.mode, 'repair')
  assert.equal(result.status, 'budget_exhausted')
  assert.ok(calls[1].prompt.includes('calc.py:2: wrong'))
})

test('unverified, blocked, and null results return blocked', async () => {
  const unverified = { verdict: 'unverified', revision: 'r', findings: [], limits: 'python3 missing' }
  for (const [queued, reason] of [
    [{ qa: [unverified] }, 'python3 missing'],
    [{ coder: [{ status: 'blocked', changed: [], open: 'which base?' }] }, 'which base?'],
    [{ coder: [null] }, 'returned nothing'],
  ]) {
    const { result } = await run('deliver-gates.js', { ...ARGS, mode: 'hard' }, queued)
    assert.equal(result.status, 'blocked')
    assert.match(result.blocker, new RegExp(reason))
  }
})

test('an abandoned approach costs a failure and retries', async () => {
  const { result, labels } = await run('deliver-gates.js', { ...ARGS, mode: 'easy', spec: undefined }, {
    coder: [{ status: 'unworkable', changed: [], open: 'regex approach' }],
  })
  assert.deepEqual(labels, ['coder', 'coder', 'qa#1'])
  assert.equal(result.failures.implementation, 1)
})

test('every dispatched agent exists in the plugin', async () => {
  const roles = new Set()
  for (const [args, queued] of [
    [{ ...ARGS, mode: 'hard' }, { qa: [fail('spec')] }],
    [{ ...ARGS, spec: undefined, mode: 'easy', producer: 'writer' }, {}],
  ]) {
    const { calls } = await run('deliver-gates.js', args, queued)
    calls.forEach((c) => roles.add(c.role))
  }
  assert.deepEqual([...roles].sort(), ['auditor', 'coder', 'qa', 'writer'])
  for (const role of roles) readFileSync(new URL(`../agents/${role}.md`, dir))
})
