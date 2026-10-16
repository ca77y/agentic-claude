export const meta = {
  name: 'reproduce-bug',
  description:
    'Reproduce a reported bug in an ignored reproduction directory without changing production code, then file a Bug card with evidence, steps to reproduce, expected outcome, and observed outcome, each validated by a fresh lens',
  whenToUse:
    'Run only when the user invokes /slopify:reproduce-bug or asks for the slopify reproduce-bug workflow. Args: {report, projectRoot?, answers?}, or the report as a plain string; projectRoot defaults to the session project directory, and answers maps a need id to its answer when rerunning.',
  phases: [
    { title: 'Locate', detail: 'scout-card and scout-related-cards, then scout-checkpoint' },
    { title: 'Gather', detail: 'scout-code, scout-tests, and scout-history' },
    { title: 'Reproduce', detail: 'coder builds and runs a reproduction in the reproduction directory only' },
    { title: 'Validate reproduction', detail: 'lens-repro runs the reproduction at least three times' },
    { title: 'Report', detail: 'writer drafts the issue in the reproduction directory' },
    { title: 'Validate report', detail: 'lens-bug-report judges the draft revision against the reproduction' },
    { title: 'File', detail: 'pusher files one Bug card through the board declaration' },
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

// kind: 'story' | 'decision' | 'prerequisite' | 'validation' | 'input'
function blocked(workflow, step, needs, extra) {
  return { status: "blocked", workflow, step, needs, ...(extra || {}) };
}
// END slopify family schemas

// `args` may arrive as the raw string rather than a parsed object. A JSON object is
// the input; any other string is the report.
function normalize(a) {
  if (typeof a !== 'string') return a
  const text = a.trim()
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object') return parsed
    if (typeof parsed === 'string') return { report: parsed.trim() }
  } catch (e) {
    // not JSON: the string is the report
  }
  return { report: text }
}

const input = normalize(args) || {}
const str = v => (typeof v === 'string' ? v.trim() : '')
const report = str(input.report)
const projectRoot = str(input.projectRoot).replace(/\/+$/, '')
const answers = input.answers && typeof input.answers === 'object' && !Array.isArray(input.answers) ? input.answers : {}

if (!report) {
  return { status: 'not-started', next: 'Ask the user for the bug report: what fails, and what was expected instead. Then invoke again.' }
}

const NAME = 'reproduce-bug'
const MAX_FAILURES = 3
const RERUN =
  'Invoke /slopify:reproduce-bug again with the same args; add answers.<id> for each decision. In this session, pass resumeFromRunId to reuse completed steps.'
const WHERE = projectRoot
  ? `The project is at ${projectRoot}; address files by absolute path under it.`
  : 'The project is the session project directory; address files by absolute path.'
const READ_ONLY = 'Report only: change nothing, and perform no board or forge operation.'
const PRODUCER_BOUNDS =
  'Do not commit, push, or perform any board or forge operation; another agent does that.'
// How a reproduction directory's revision is computed (the coder's own form).
const REPRO_REVISION = 'find <dir> -type f | sort | xargs git hash-object | git hash-object --stdin'

const completed = []
const skipped = []
const attempts = []
const checkpoint = {}
const verdicts = []

function stop(step, needs) {
  return blocked(NAME, step, needs, { completed: [...completed], checkpoint: { ...checkpoint }, attempts, rerun: RERUN })
}

function done(step) {
  if (!completed.includes(step)) completed.push(step)
}

function skip(step) {
  if (!skipped.includes(step)) skipped.push(step)
  done(step)
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function words(text) {
  return (String(text).toLowerCase().match(/[a-z0-9]+/g) || []).slice(0, 6).join('-')
}

function none(v) {
  return !v || /^(none|absent|n\/a)\b/i.test(v)
}

const WRITER_SCHEMA = {
  type: 'object',
  required: ['produced', 'revision', 'openDecisions', 'storyBlockers', 'tasks', 'docs'],
  properties: {
    produced: { ...STRINGS, description: 'Absolute paths written' },
    revision: { type: 'string', description: 'git hash-object of the main artifact' },
    openDecisions: { ...STRINGS, description: 'Questions only the user can answer, such as an expected outcome the report leaves unstated' },
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

const CODER_SCHEMA = {
  type: 'object',
  required: ['changed', 'tests', 'ran', 'revision', 'open', 'specMismatch', 'steps', 'observed', 'measurements'],
  properties: {
    changed: { ...STRINGS, description: 'Absolute paths written' },
    tests: { ...STRINGS, description: 'Reproduction scripts or tests written' },
    ran: { ...STRINGS, description: 'Each command run, as command → result' },
    revision: { type: 'string', description: 'The revision left, in the form the brief names' },
    open: { ...STRINGS, description: 'Blockers or unworkable approaches' },
    specMismatch: { type: 'string', description: 'Empty when none' },
    steps: { ...STRINGS, description: 'The steps that reproduce the failure, in order' },
    observed: { type: 'string', description: 'What the reproduction observed' },
    measurements: {
      type: 'array',
      description: 'Empty here',
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
  else if (!String(v.evaluated || '').includes(revision.slice(0, 7))) {
    out.push(`${name} judged "${v.evaluated}", not revision ${revision}`)
  }
  return out
}

function record(lensName, v) {
  verdicts.push({ lens: lensName, verdict: v.verdict, evaluated: v.evaluated, findings: v.findings, limits: v.limits })
}

// ---- Locate ----------------------------------------------------------------

phase('Locate')
const [cardR, relatedR] = await parallel([
  () =>
    scout('scout-card',
      `${WHERE}
${READ_ONLY}

Read the one card this bug report names by identifier or URL, if any. If it names none, or the project has no board, report that. Return the card's identifier as the evidence item card-id (omit the item when there is no card). The story revision is not needed for this run.

Report: ${report}`,
      { label: 'read card', phase: 'Locate' },
    ),
  () =>
    scout('scout-related-cards',
      `${WHERE}
${READ_ONLY}

Search the board for cards that duplicate, overlap, or conflict with this bug report. If an existing Bug card reports this same bug, return it as the evidence item bug-card, with its identifier as the excerpt; return that item only for a Bug card about this same failure. If the project has no board, report that.

Report: ${report}`,
      { label: 'related cards', phase: 'Locate' },
    ),
])

const cardId = fact(cardR, 'card-id')
const slug = slugify(cardId) || words(report) || 'report'
const reproRel = `.tmp/repro/${slug}`
const reproDir = projectRoot ? `${projectRoot}/${reproRel}` : reproRel
const issuePath = `${reproDir}/issue.md`

let cp = null
for (let i = 1; i <= MAX_FAILURES && !cp; i++) {
  cp = await scout('scout-checkpoint',
    `${WHERE}
${READ_ONLY}

Report where a reproduce-bug run stands from its durable checkpoints. The run's reproduction directory is ${reproDir} (under the project's ignored .tmp/ folder). Return one evidence item per key that exists, with source set to the key and excerpt set to its value; omit a key that does not exist.

Keys:
- repro-dir: present only when the directory holds a reproduction: a runnable script or test, and the notes file recording its steps and observed output. Its value is the directory's absolute path, then "@", then its revision, computed from the directory with its issue.md left out: find <dir> -type f ! -name issue.md | sort | xargs git hash-object | git hash-object --stdin
- bug-card: the identifier of an existing Bug card that reports this same bug, read through the board declaration; omit when there is none. The related-cards search found: ${fact(relatedR, 'bug-card') || 'none'}

Report: ${report}`,
    { label: `checkpoint${i > 1 ? ` (attempt ${i})` : ''}`, phase: 'Locate' },
  )
  if (!cp) attempts.push({ gate: 'locate', approach: 'scout-checkpoint', failed: 'the scout did not return' })
}
if (!cp) {
  return stop('locate', [
    { id: 'locate-1', kind: 'prerequisite', what: 'A scout-checkpoint report of the reproduction directory and any existing Bug card', evidence: 'scout-checkpoint did not return in three dispatches' },
  ])
}
done('locate')

const bugCard = fact(cp, 'bug-card') || fact(relatedR, 'bug-card')
const reproValue = fact(cp, 'repro-dir')
const reproHeld = !none(reproValue)
if (!none(bugCard)) checkpoint.bugCard = bugCard
if (reproHeld) checkpoint.reproduction = reproDir

if (!none(bugCard)) {
  // A Bug card already reports this bug: nothing to reproduce or file.
  for (const s of ['gather', 'reproduce', 'validate-repro', 'report', 'validate-report', 'file']) skip(s)
  return {
    status: 'done',
    workflow: NAME,
    skipped,
    attempts,
    card: bugCard,
    issue: null,
    reproduction: reproHeld ? reproDir : null,
    verdicts,
    filed: false,
  }
}

// ---- Gather ----------------------------------------------------------------

phase('Gather')
const [codeR, testsR, historyR] = await parallel([
  () =>
    scout('scout-code',
      `${WHERE}
${READ_ONLY}

Find the code locations and call paths relevant to this bug report.

Report: ${report}`,
      { label: 'code', phase: 'Gather' },
    ),
  () =>
    scout('scout-tests',
      `${WHERE}
${READ_ONLY}

Find the existing tests that cover the area this bug report concerns, and how to run them.

Report: ${report}`,
      { label: 'tests', phase: 'Gather' },
    ),
  () =>
    scout('scout-history',
      `${WHERE}
${READ_ONLY}

Find from git history and blame when and why behavior in the area this bug report concerns changed.

Report: ${report}`,
      { label: 'history', phase: 'Gather' },
    ),
])
const evidenceText = [show('Card', cardR), show('Code', codeR), show('Tests', testsR), show('History', historyR)].join('\n\n')
done('gather')

// ---- Reproduce and validate the reproduction -------------------------------

let reproRev = reproHeld ? reproValue.slice(reproValue.lastIndexOf('@') + 1).trim() : ''
let reproSteps = []
let reproObserved = ''
let lastFindings = []

function reproOk(c) {
  return !!c && str(c.revision) !== '' && Array.isArray(c.steps) && c.steps.length > 0 && str(c.observed) !== ''
}

async function buildRepro(why) {
  return agent(
    `${WHERE}
${PRODUCER_BOUNDS}

${why}

Your only writable path is the reproduction directory ${reproDir} (create it if needed): change no production code, no existing test, and nothing outside it. Write and run a reproduction script or test there that shows the reported failure. Record its steps and its observed output in a notes file in that directory, so a later run can read them. Return in steps the steps that reproduce the failure, in observed what the reproduction showed, and in revision the directory's digest, computed as: ${REPRO_REVISION} (with <dir> the reproduction directory). Return measurements as an empty array. If the failure does not reproduce, say so in open and leave steps empty.

Report: ${report}

Evidence:
${evidenceText}`,
    { agentType: 'slopify:coder', label: lastFindings.length ? 'revise reproduction' : 'reproduce', phase: 'Reproduce', schema: CODER_SCHEMA },
  )
}

if (reproHeld) skip('reproduce')

let reproFailures = 0
if (!reproHeld) {
  phase('Reproduce')
  while (true) {
    const c = await buildRepro('Reproduce the reported bug.')
    if (reproOk(c)) {
      reproRev = str(c.revision)
      reproSteps = c.steps
      reproObserved = c.observed
      checkpoint.reproduction = reproDir
      break
    }
    reproFailures += 1
    attempts.push({ gate: 'reproduce', approach: 'coder reproduction', failed: c ? `no reproduction: ${(c.open || []).join('; ') || 'steps or observed output missing'}` : 'the coder did not return' })
    if (reproFailures >= MAX_FAILURES) {
      return stop('reproduce', [
        { id: 'reproduce-1', kind: 'input', what: 'More detail to reproduce the report', evidence: 'no reproduction showed the reported failure in three attempts' },
      ])
    }
  }
  done('reproduce')
}

phase('Validate reproduction')
let reproVerdict = null
let validateReproFailures = 0
while (true) {
  reproVerdict = await lens('lens-repro',
    `${WHERE}

Judge the reproduction in ${reproDir}, revision ${reproRev} (${REPRO_REVISION}, with its issue.md, if any, left out). Run it at least three times. The report it must show: ${report}

${reproSteps.length ? `The steps to run: ${reproSteps.join(' | ')}` : 'The directory holds the steps in its notes file.'}`,
    { label: `repro (revision ${reproRev.slice(0, 7)})`, phase: 'Validate reproduction' },
  )
  const bad = problems('lens-repro', reproVerdict, reproRev)
  if (!bad.length) break
  validateReproFailures += 1
  attempts.push({ gate: 'validate-repro', approach: `reproduction revision ${reproRev}`, failed: bad.join('; ') })
  if (validateReproFailures >= MAX_FAILURES) {
    return stop('validate-repro', [
      { id: 'validate-repro-1', kind: 'input', what: 'More detail to reproduce the report', evidence: bad.join('\n') },
    ])
  }
  lastFindings = bad
  phase('Reproduce')
  while (true) {
    const c = await buildRepro(`A fresh lens did not pass the reproduction at revision ${reproRev}. Fix the reproduction in the directory so it reliably shows the reported failure; resolve these findings:\n${bad.join('\n\n')}`)
    if (reproOk(c)) {
      reproRev = str(c.revision)
      reproSteps = c.steps
      reproObserved = c.observed
      break
    }
    validateReproFailures += 1
    attempts.push({ gate: 'validate-repro', approach: 'coder reproduction revision', failed: c ? 'no reproduction: steps or observed output missing' : 'the coder did not return' })
    if (validateReproFailures >= MAX_FAILURES) {
      return stop('validate-repro', [
        { id: 'validate-repro-1', kind: 'input', what: 'More detail to reproduce the report', evidence: bad.join('\n') },
      ])
    }
  }
  phase('Validate reproduction')
}
record('lens-repro', reproVerdict)
done('validate-repro')

// ---- Report and validate the report ----------------------------------------

function draftOk(w) {
  return !!w && Array.isArray(w.produced) && w.produced.length > 0 && w.produced.every(p => String(p).endsWith(`${reproRel}/issue.md`)) && str(w.revision) !== ''
}

const given = Object.keys(answers)
  .filter(id => String(answers[id]).trim() !== '')
  .map(id => `- ${id}: ${answers[id]}`)
  .join('\n')

phase('Report')
let issueRev = ''
let reportFailures = 0
const reportPrompt = (why) => `Address files by absolute path.
${PRODUCER_BOUNDS}

${why} The issue is at ${issuePath}; write only that file. Use the card shape the project's board declaration gives for a bug: evidence, steps to reproduce, expected outcome, and observed outcome, each consistent with the reproduction in ${reproDir} (revision ${reproRev}), which you may read. If the report leaves the expected outcome unstated and the evidence cannot settle it, put the question in openDecisions rather than guessing. Return in revision the git hash-object digest of the issue, in produced its absolute path. Return tasks and docs as empty arrays.

Report: ${report}
${given ? `\nAnswers to earlier questions:\n${given}\n` : ''}
Reproduction steps: ${reproSteps.length ? reproSteps.join(' | ') : 'see the notes file in the reproduction directory'}
Reproduction observed: ${reproObserved || 'see the notes file in the reproduction directory'}

Evidence:
${evidenceText}`

async function writeIssue(why, label) {
  while (true) {
    const w = await agent(reportPrompt(why), { agentType: 'slopify:writer', label, phase: 'Report', schema: WRITER_SCHEMA })
    if (draftOk(w)) {
      const open = (w.openDecisions || []).map(s => String(s).trim()).filter(Boolean)
      const blockers = [...(w.storyBlockers || [])]
      if (open.length || blockers.length) {
        checkpoint.issue = issuePath
        return stop('report', [
          ...open.map((q, i) => ({ id: `issue-${i + 1}`, kind: 'decision', what: q, evidence: 'reported by the writer while drafting the issue' })),
          ...blockers.map((b, i) => ({ id: `issue-blocker-${i + 1}`, kind: 'input', what: b, evidence: 'reported by the writer while drafting the issue' })),
        ])
      }
      issueRev = str(w.revision)
      checkpoint.issue = issuePath
      return null
    }
    reportFailures += 1
    attempts.push({ gate: 'report', approach: 'writer bug report', failed: w ? 'the writer wrote outside the issue path or returned no revision' : 'the writer did not return' })
    if (reportFailures >= MAX_FAILURES) {
      return stop('report', [
        { id: 'report-1', kind: 'validation', what: `A bug report draft written at ${issuePath} with a revision`, evidence: 'the writer did not produce one in three dispatches' },
      ])
    }
  }
}

let early = await writeIssue(`Draft the bug report issue for this reported bug. If a draft already exists at the issue path, read it and revise it.`, 'draft issue')
if (early) return early
done('report')

phase('Validate report')
let reportVerdict = null
let validateReportFailures = 0
while (true) {
  reportVerdict = await lens('lens-bug-report',
    `${WHERE}

Judge the bug report draft at ${issuePath}, revision ${issueRev}, against the reproduction in ${reproDir} (revision ${reproRev}, ${REPRO_REVISION} with issue.md left out). Name the draft revision as evaluated.

Original report: ${report}`,
    { label: `bug-report (revision ${issueRev.slice(0, 7)})`, phase: 'Validate report' },
  )
  const bad = problems('lens-bug-report', reportVerdict, issueRev)
  if (!bad.length) break
  validateReportFailures += 1
  attempts.push({ gate: 'validate-report', approach: `issue revision ${issueRev}`, failed: bad.join('; ') })
  if (validateReportFailures >= MAX_FAILURES) {
    return stop('validate-report', [
      { id: 'validate-report-1', kind: 'validation', what: 'A bug report draft that lens-bug-report passes', evidence: bad.join('\n') },
    ])
  }
  phase('Report')
  early = await writeIssue(`Revise the bug report issue at revision ${issueRev} to resolve the findings below.\n\nFindings:\n${bad.join('\n\n')}\n\n`, 'revise issue')
  if (early) return early
  phase('Validate report')
}
record('lens-bug-report', reportVerdict)
done('validate-report')

// ---- File ------------------------------------------------------------------

phase('File')
let card = null
let pusherFailures = 0
while (true) {
  const p = await agent(
    `${WHERE}

Authorization: the user invoked the reproduce-bug workflow, which authorizes exactly this: file one Bug card from the issue below through the project's board declaration (docs/BOARD.md), at the initial status the declaration gives for a new card. Perform no other operation: no commit, branch, worktree, push, pull request, review trigger, merge, or message, and no change to any other card. Work exactly as the board declaration binds it; report an operation that is not bound, or a project with no board, in unmet, and improvise nothing.

File the issue at ${issuePath}, revision ${issueRev}, as a Bug card, with the issue's text as the card body unchanged. Return the card operation first in operations, with the card id as its reference. When there is no board, perform nothing and return the draft path in unmet.`,
    { agentType: 'slopify:pusher', label: pusherFailures ? `file bug card (attempt ${pusherFailures + 1})` : 'file bug card', phase: 'File', schema: PUSHER_SCHEMA },
  )
  if (p && p.unmet && p.unmet.length) {
    attempts.push({ gate: 'file', approach: 'pusher bug filing', failed: p.unmet.join('; ') })
    return stop('file', [
      { id: 'file-1', kind: 'prerequisite', what: 'A board declaration that binds creating a Bug card', evidence: p.unmet.join('; ') },
    ])
  }
  if (p && p.done && p.operations && p.operations.length) {
    const op = p.operations.find(o => o.reference) || p.operations[0]
    card = op.reference || 'filed'
    checkpoint.bugCard = card
    break
  }
  pusherFailures += 1
  attempts.push({ gate: 'file', approach: 'pusher bug filing', failed: p ? 'the pusher reported the filing as not done' : 'the pusher did not return' })
  if (pusherFailures >= MAX_FAILURES) {
    return stop('file', [
      { id: 'file-1', kind: 'prerequisite', what: 'The Bug card filed through the board declaration', evidence: 'the pusher did not complete it in three dispatches' },
    ])
  }
}
done('file')

return {
  status: 'done',
  workflow: NAME,
  skipped,
  attempts,
  card,
  issue: issuePath,
  reproduction: reproDir,
  verdicts,
  filed: true,
}
