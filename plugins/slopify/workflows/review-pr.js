export const meta = {
  name: 'review-pr',
  description:
    'Wait for a pull request review, sort its findings, fix the real defects, and push each round only after a fresh qa passes, for at most three rounds or until a review is clean',
  whenToUse:
    'Run only when the user invokes /slopify:review-pr or asks for the slopify review-pr workflow; deliver-story and deliver-bugfix also run it as their last step. Args: {pr, worktree?, spec?, story?, test?, findings?, projectRoot?, answers?}, or the pull request as a plain string. pr names the pull request, worktree is its story worktree, spec and story are the acceptance source when known, test is the regression test path that belongs with the spec on the ledger, findings are review findings to use in round 1 instead of waiting, projectRoot defaults to the session project directory, answers maps a blocked need id to the answer, and exclude lists dirty paths the caller left out of its own commit, which this workflow never stages.',
  phases: [
    { title: 'Locate', detail: 'scout-checkpoint reports the PR, worktree, and ledger state; scout-card reads the PR card; pusher recovers a missing worktree' },
    { title: 'Wait', detail: 'watcher waits for review n, one dispatch at a time' },
    { title: 'Sort', detail: 'one lens-finding per review finding, in parallel' },
    { title: 'Fix', detail: 'coder fixes code defects while writer fixes spec and documentation defects; lens-scope and lens-consistency pass a revised spec first' },
    { title: 'Validate', detail: 'a fresh qa judges the fixes, with lens-docs when documentation changed' },
    { title: 'Push', detail: 'pusher commits, pushes, updates the PR, re-fires the review trigger, and appends the ledger' },
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

// ---- Inputs ----------------------------------------------------------------

// `args` may arrive as the raw string rather than a parsed object. A JSON object is
// the input; any other string is the pull request.
function normalize(a) {
  if (typeof a !== 'string') return a;
  const text = a.trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') return parsed;
    if (typeof parsed === 'string' || typeof parsed === 'number') return { pr: String(parsed).trim() };
  } catch (e) {
    // not JSON: the string is the pull request
  }
  return { pr: text };
}

const str = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

const input = normalize(args) || {};
const pr = str(input.pr);
const projectRoot = str(input.projectRoot);
const storyText = str(input.story);
const testPath = str(Array.isArray(input.test) ? input.test[0] : input.test);
// Dirty paths the caller deliberately left uncommitted (outside its assigned paths): never staged, never briefed.
const excluded = (Array.isArray(input.exclude) ? input.exclude : []).map(str).filter(Boolean);
const answers = input.answers && typeof input.answers === 'object' ? input.answers : {};

if (!pr) {
  return { status: 'not-started', next: 'Ask the user which pull request to review (a number, URL, or path), then invoke again.' };
}

function normFindings(items) {
  const out = [];
  (Array.isArray(items) ? items : []).forEach((f, i) => {
    if (typeof f === 'string' && f.trim()) {
      out.push({ id: `f${i + 1}`, location: '', text: f.trim() });
    } else if (f && typeof f === 'object' && (f.text || f.problem)) {
      out.push({ id: str(f.id) || `f${i + 1}`, location: str(f.location), text: String(f.text || f.problem).trim() });
    }
  });
  return out;
}
const givenFindings = normFindings(input.findings);

const MAX_ROUNDS = 3;
const MAX_FAILURES = 3;
const WATCH_MINUTES = 9;
const FINAL_ROUND = MAX_ROUNDS + 1;
const NO_LIMIT_DISPATCHES = 12; // when the forge declares no review time limit

const WHERE = projectRoot
  ? `The project is at ${projectRoot}; address files by absolute path under it.`
  : 'The project is the session project directory; address files by absolute path.';
const READ_ONLY =
  'You only read and report here: make no commit, push, branch, worktree, pull request comment, review trigger, or board change.';
const NO_FORGE_WRITES =
  'Do not commit, push, create or remove branches or worktrees, comment on the pull request, fire a review trigger, or change the board or forge; pusher does all of that.';
const AUTH =
  'Authorization: the user invoked the review loop on this pull request. You may create or recover the story worktree, make attributable commits, push the story branch after the gates passed, update this pull request, re-fire the declared review trigger, and append ledger lines. You may not merge, release, send other messages, change a card, force-push, or rewrite history. Work exactly as docs/BOARD.md and docs/FORGE.md declare, resolving their relative paths against the main checkout root. Report any operation they do not bind in unmet; never improvise one.';

// ---- Local schemas ---------------------------------------------------------

const PATHS = { ...STRINGS, description: 'Paths, absolute or relative to the worktree' };

const WRITER_SCHEMA = {
  type: 'object',
  required: ['produced', 'revision', 'openDecisions', 'storyBlockers', 'tasks', 'docs'],
  properties: {
    produced: { ...STRINGS, description: 'Absolute paths of the files written or changed; the spec path when the spec was revised' },
    revision: { type: 'string', description: 'git hash-object of the main artifact written' },
    openDecisions: { ...STRINGS, description: 'Decisions only the user can make' },
    storyBlockers: { ...STRINGS, description: 'Reasons the story cannot be built or fixed as stated; empty when none' },
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
};

const CODER_SCHEMA = {
  type: 'object',
  required: ['changed', 'tests', 'ran', 'revision', 'open', 'specMismatch'],
  properties: {
    changed: PATHS,
    tests: PATHS,
    ran: { ...STRINGS, description: 'Each command run, as: command -> result' },
    revision: { type: 'string', description: 'The candidate revision left: <HEAD sha>+<digest>' },
    open: STRINGS,
    specMismatch: { type: 'string', description: 'Why the spec cannot be followed; an empty string when none' },
  },
};

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
          reference: { type: 'string', description: 'A commit sha, PR URL or path, card id, or worktree path' },
        },
      },
    },
    unmet: STRINGS,
  },
};

const WATCHER_SCHEMA = {
  type: 'object',
  required: ['outcome', 'waitingFor', 'limitMinutes', 'reference', 'findings'],
  properties: {
    outcome: { type: 'string', enum: ['finished', 'failed', 'timed-out', 'pending', 'not-declared'] },
    waitingFor: { type: 'string', enum: ['start', 'finish', ''] },
    limitMinutes: { type: 'number' },
    reference: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'location', 'text'],
        properties: { id: { type: 'string' }, location: { type: 'string' }, text: { type: 'string' } },
      },
    },
  },
};

// ---- State and small helpers -----------------------------------------------

const attempts = [];
const skipped = [];
const completed = [];
const rounds = [];
let watchFailures = 0;
let fixFailures = 0;
let specFailures = 0;
let validateFailures = 0;

let cp = null; // the latest scout-checkpoint result
let worktree = str(input.worktree);
let specPath = str(input.spec);
let head = '';
let baseCommit = '';
let dirtyPaths = [];

const list = (items) => (items && items.length ? items.map((x) => `- ${x}`).join('\n') : '- none');
// Each checkpoint key's expected shape (see shaped in the shared block); a key without one is text.
const KINDS = { worktree: 'path', ledger: 'path', head: 'sha', 'pushed-head': 'sha', 'fired-head': 'sha', base: 'sha', 'story-revision': 'sha', branch: 'branch' };
// A checkpoint item's value, or '' when it says there is none or lacks the expected shape. A shaped item
// followed by a remark is the item. A text value is none only for a bare none reply.
function val(res, key) {
  const v = fact(res, key);
  if (key === 'spec') return specOf(v);
  const kind = KINDS[key];
  return kind ? shaped(kind, v) : absent(v, true) ? '' : v;
}
// The spec's path from "<path>@<hash>", "<path> <hash>", or a bare path, in the story worktree or relative to it.
function specOf(v) {
  const s = parseSpec(String(v || '').split('\n')[0].replace(/\s*\([^)]*\)\s*$/, ''));
  if (s) return shaped('path', s.path) || shaped('rel', s.path);
  const bare = shaped('path', v);
  return /\s/.test(bare) ? '' : bare || shaped('rel', v);
}
// The highest round on 'review <n> fired|ended' text, else a bare number; never a digit run from a timestamp.
function reviewRound(v) {
  const t = String(v || '').trim();
  if (absent(t)) return 0;
  let best = 0;
  for (const m of t.matchAll(/review\s+(\d+)\s+(?:fired|ended)/gi)) best = Math.max(best, parseInt(m[1], 10));
  if (best) return best;
  const bare = t.match(/^(?:round\s+)?(\d+)$/i);
  return bare ? parseInt(bare[1], 10) : 0;
}
const need = (id, kind, what, evidence) => ({ id, kind, what, evidence: String(evidence || '') });

function checkpointOf() {
  const out = {};
  const branch = val(cp, 'branch');
  const ledger = val(cp, 'ledger');
  if (worktree) out.worktree = worktree;
  if (branch) out.branch = branch;
  if (specPath) out.spec = specPath;
  if (ledger) out.ledger = ledger;
  out.pr = pr;
  return out;
}

function stop(step, needs) {
  return blocked('review-pr', step, needs, { completed, checkpoint: checkpointOf(), attempts });
}

const isTmp = (p) => /(^|\/)\.tmp(\/|$)/.test(String(p || ''));

function parseDirty(v) {
  const t = String(v || '').trim();
  if (absent(t)) return [];
  return t
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter((x) => x && !absent(x) && !/[\s()]/.test(x) && !isTmp(x))
    .filter((x) => !excluded.some((e) => samePath(x, e)));
}

function samePath(a, b) {
  const x = String(a || '').trim().replace(/^\.\//, '');
  const y = String(b || '').trim().replace(/^\.\//, '');
  return !!x && !!y && (x === y || x.endsWith('/' + y) || y.endsWith('/' + x));
}

// Markdown and text documents and the spec go to the writer; everything else goes to the coder. The kind of
// file decides, not its directory: code under docs/ or doc/ (docs/conf.py, pkg/doc/render.go) is code.
const isSpec = (loc) => !!specPath && samePath(String(loc || '').replace(/:\d+(-\d+)?$/, ''), specPath);
// A .txt file is prose unless it is a build or dependency file (requirements*.txt, constraints*.txt, CMakeLists.txt).
const BUILD_TXT = /(^|\/)(cmakelists|[\w.-]*requirements[\w.-]*|[\w.-]*constraints[\w.-]*|dependencies|packages|manifest|robots|sources|version)\.txt$/i;
const isDoc = (loc) => {
  const p = String(loc || '').replace(/:\d+(-\d+)?$/, '');
  return isSpec(p) || /\.(md|mdx|rst|adoc)$/i.test(p) || (/\.txt$/i.test(p) && !BUILD_TXT.test(p)) || /(^|\/)readme$/i.test(p);
};

const CHECKPOINT_KEYS = 'worktree branch head base pushed-head unpushed dirty ledger review-fired fired-head review-ended spec pr';

// A validator verdict counts only when it passes, carries no blocking finding, and names the revision
// the brief gave it in evaluated (see sameRev in the shared block). A brief with no revision to name
// accepts any evaluated.
const named = (v, rev) => sameRev(rev, v.evaluated);
const passes = (v, rev) => !!v && v.verdict === 'pass' && !v.findings.some((f) => f.blocking) && named(v, rev);
function problems(v, rev) {
  if (!v) return ['no verdict returned'];
  const out = v.findings.filter((f) => v.verdict !== 'pass' || f.blocking).map((f) => `${f.location}: ${f.problem}`);
  if (!named(v, rev)) out.push(`judged ${v.evaluated || 'no revision'}, not the briefed revision ${rev}`);
  if (!out.length) out.push(`${v.verdict}: ${v.limits}`);
  return out;
}

const ASSUMPTIONS =
  'Decide anything that does not change the story\'s outcome yourself, and record it in the document as a labelled assumption ("Assumption: ..."). Raise an open decision only for a choice that would change the story\'s outcome.';

function checkpointPrompt(keys, note) {
  return `${WHERE}
${READ_ONLY}

Report where the review loop on this pull request stands from its durable checkpoints. Return each of these keys that exists as one evidence item whose source is the key and whose excerpt is its value; leave out a key that does not exist: ${keys}.
- worktree, branch, head, dirty: the story worktree for the pull request's head branch, named as docs/FORGE.md names it. head is its HEAD sha. dirty lists the paths with uncommitted changes, ignoring .tmp/, or is none.
- base: the pull request's base commit, the merge base of the head branch and the target branch docs/FORGE.md declares.
- pushed-head: the head commit sha of the pull request's branch as the remote has it, not the worktree's HEAD. unpushed: how many commits the worktree's HEAD holds that the pushed head lacks, or none.
- ledger: the absolute path of the worktree's .tmp/ledger.md, only when it exists. review-fired and review-ended: the highest review round numbers on its review lines after the last done publish line. fired-head: the sha after "head" on the last review fired line, when it has one.
- spec: the current spec path and its git hash-object, written <absolute path>@<git hash-object>, when the story has a spec.
- pr: the pull request's description, read through docs/FORGE.md's read binding when it declares one; leave the key out when it declares none.

Pull request: ${pr}${worktree ? `\nWorktree: ${worktree}` : ''}${note ? `\n${note}` : ''}`;
}

// ---- Locate ----------------------------------------------------------------

phase('Locate');

cp = await scout('scout-checkpoint', checkpointPrompt(CHECKPOINT_KEYS, ''), { label: 'checkpoint', phase: 'Locate' });
if (!cp) {
  return stop('locate', [need('locate-1', 'prerequisite', 'A checkpoint report for the pull request; the scout did not return.', 'scout-checkpoint returned nothing')]);
}
// The pull request is whatever the caller passed (a number, URL, or path). A parent passes its own
// reference, so it is never re-read through a read binding to proceed; the checkpoint's pr item,
// when the forge declares a read binding, only adds the description.

// The pull request identifies its card, so the card is read after the checkpoint.
let card = null;
let hasCard = false;
let cardLoaded = false;
// Read only when the findings need an acceptance source, so a pull request with no review to wait for ends first.
async function loadCard() {
  if (cardLoaded) return;
  cardLoaded = true;
  if (storyText) {
    skipped.push('card');
    return;
  }
  card = await scout('scout-card',
    `${WHERE}
${READ_ONLY}

Read the one card this pull request delivers, the card its description, title, or branch names, through the read bindings in docs/BOARD.md. Quote the card's content and acceptance criteria exactly in the answer, and report its story revision as the evidence item story-revision. With no board, or no card named, say so in the answer and return no story-revision.

Pull request: ${pr}
Its description and state:
${prDescription || 'not readable: docs/FORGE.md declares no read binding for it'}`,
    { label: 'card', phase: 'Locate' },
  );
  hasCard = !!card && !!val(card, 'story-revision');
}

if (!worktree) worktree = val(cp, 'worktree');
if (!worktree) {
  const recovered = await agent(
    `${WHERE}
${AUTH}

Recover the story worktree for this pull request's head branch, as docs/FORGE.md declares: check the branch out in a worktree named as docs/FORGE.md names it, and change nothing else. Return the worktree's absolute path as the reference of an operation named worktree.

Pull request: ${pr}
Branch: ${val(cp, 'branch') || 'the pull request head branch'}`,
    { agentType: 'slopify:pusher', label: 'recover worktree', phase: 'Locate', schema: PUSHER_SCHEMA },
  );
  const op = recovered && recovered.done ? recovered.operations.find((o) => /worktree/i.test(o.op) && /^\//.test(o.reference)) : null;
  if (!op) {
    return stop('locate', [
      need(
        'locate-3',
        'prerequisite',
        'A worktree for the pull request branch.',
        recovered ? (recovered.unmet.join('; ') || 'pusher returned no worktree path') : 'pusher did not return',
      ),
    ]);
  }
  worktree = op.reference;
  cp = (await scout('scout-checkpoint', checkpointPrompt(CHECKPOINT_KEYS, 'The worktree was just recovered.'), { label: 'checkpoint after recovery', phase: 'Locate' })) || cp;
} else {
  skipped.push('workspace');
}

if (!specPath) specPath = val(cp, 'spec');
// Findings are judged against the pull request as the forge has it. A local commit that was never pushed
// (a fix whose push failed, or an interrupted round) is not part of it, whatever the worktree's HEAD says.
const pushedHead = val(cp, 'pushed-head');
const unpushed = parseInt(String(fact(cp, 'unpushed')).trim(), 10) > 0;
// The `review <n> fired` line names the head that review judges. A pushed head beyond it means a fix was
// pushed after that review fired, and the steps after the push (PR update, re-fire, ledger) may not have run.
const firedHead = val(cp, 'fired-head');
const pushedAhead = !!firedHead && !!pushedHead && !sameRev(firedHead, pushedHead) && !sameRev(pushedHead, firedHead);
head = pushedHead || val(cp, 'head');
baseCommit = val(cp, 'base');
dirtyPaths = parseDirty(fact(cp, 'dirty'));
const branch = val(cp, 'branch');
const prDescription = val(cp, 'pr');
completed.push('locate');

// The acceptance source for every qa and lens-finding brief.
function acceptance(failFindings) {
  const parts = [];
  if (storyText) parts.push(`Story, verbatim, the acceptance source:\n${storyText}`);
  else if (hasCard) parts.push(`The pull request's card, the acceptance source:\n${card.answer}`);
  if (specPath) parts.push(`Spec: ${specPath}`);
  if (!storyText && !hasCard && !specPath) {
    parts.push(
      `No spec, story, or card exists for this pull request. ` +
        (prDescription
          ? `The acceptance source is the pull request's description:\n${prDescription}`
          : 'Its description could not be read, so the acceptance source is the review findings and the behavior the change visibly intends.') +
        (failFindings && failFindings.length
          ? `\n\nPlus these review findings, classified as present defects:\n${list(failFindings)}\nJudge that the fixes resolve those findings without regressing the behavior the pull request describes.`
          : ''),
    );
  }
  return parts.join('\n\n');
}

// Resume rule: round = the highest review fired after the last done publish, else 1.
const fired = reviewRound(fact(cp, 'review-fired'));
const startRound = fired >= 1 ? Math.min(fired, FINAL_ROUND) : 1;
for (let k = 1; k < startRound; k++) skipped.push(`round-${k}`);
if (givenFindings.length && startRound > 1) log('Findings in args apply to round 1 only; this run resumes at a later round and waits for its review');

// ---- Wait ------------------------------------------------------------------

// One watcher dispatch waits at most 9 minutes. The script has no clock, so it bounds each
// phase (start, then finish) by counting dispatches that end pending.
async function awaitReview(r) {
  phase('Wait');
  const counts = { start: 0, finish: 0 };
  let n = 0;
  let lastWaiting = '';
  while (true) {
    n += 1;
    const res = await agent(
      `${WHERE}
${READ_ONLY}

Wait for review ${r} of this pull request, as docs/FORGE.md's review-status binding declares: first for the review to start, then for it to finish. This is dispatch ${n} for review ${r}${lastWaiting ? `; the previous dispatch ended while waiting for the review to ${lastWaiting}` : ''}. Wait at most ${WATCH_MINUTES} minutes in this dispatch, then return pending. The review's trigger and start times are those its status shows. On finished, return each finding with its id, its location (path:line, or empty), and its text.

Pull request: ${pr}
Worktree: ${worktree}`,
      { agentType: 'slopify:watcher', label: `review ${r} wait ${n}`, phase: 'Wait', schema: WATCHER_SCHEMA },
    );
    if (!res) {
      watchFailures += 1;
      attempts.push({ gate: 'wait', approach: `watcher dispatch ${n} for review ${r}`, failed: 'the watcher did not return' });
      if (watchFailures >= MAX_FAILURES) return { stopped: true };
      continue;
    }
    if (res.outcome !== 'pending') return { review: res };
    const w = res.waitingFor === 'start' ? 'start' : 'finish';
    lastWaiting = w;
    counts[w] += 1;
    // A declared limit bounds the dispatches; an undeclared (or zero) one means no limit, so a generous
    // fixed cap bounds them instead of ending the review at once.
    const limit = Number(res.limitMinutes) || 0;
    const cap = limit > 0 ? Math.ceil(limit / WATCH_MINUTES) + 1 : NO_LIMIT_DISPATCHES;
    if (counts[w] >= cap) {
      log(`Review ${r} did not ${w} within ${limit > 0 ? 'its declared limit' : 'the fixed cap'}; treating it as timed-out`);
      return {
        review: {
          ...res,
          outcome: 'timed-out',
          ...(limit > 0 ? {} : { note: `docs/FORGE.md declares no time limit for the review, so the wait was capped at ${NO_LIMIT_DISPATCHES} dispatches of ${WATCH_MINUTES} minutes (about ${NO_LIMIT_DISPATCHES * WATCH_MINUTES} minutes).` }),
        },
      };
    }
  }
}

// ---- Sort ------------------------------------------------------------------

// One lens-finding per finding. fail: the defect is present. pass: a non-issue. unverified: reported, not fixed.
async function sortFindings(r, findings) {
  await loadCard();
  phase('Sort');
  const judge = (f, attempt) =>
    lens('lens-finding',
      `${WHERE}

Judge whether the change of this pull request is free of the defect that one review finding describes. The change is the committed one: from the base revision to the candidate commit, read in the worktree ${worktree} with git diff <base> <candidate>. Ignore the worktree's uncommitted changes: an interrupted round can leave a fix there, and an uncommitted fix is not evidence that a finding is handled. Report the candidate revision in evaluated.${attempt > 1 ? ' An earlier verdict on this finding was missing or named another revision; judge it afresh.' : ''}

Pull request: ${pr}
Base revision: ${baseCommit || 'not reported; use the merge base of the pull request branch and the target branch docs/FORGE.md declares'}
Candidate revision: ${head || 'the pull request head commit'}
${acceptance([])}

Review ${r}, finding ${f.id}${f.location ? ` at ${f.location}` : ''}:
${f.text}`,
      { label: `sort ${f.id}${attempt > 1 ? ' again' : ''}`, phase: 'Sort' },
    );
  // A verdict is usable when it names the candidate revision and a pass carries no blocking finding.
  const usable = (v) => !!v && named(v, head) && !(v.verdict === 'pass' && v.findings.some((x) => x.blocking));
  const verdicts = await parallel(findings.map((f) => () => judge(f, 1)));
  const again = findings.map((f, i) => i).filter((i) => !usable(verdicts[i]));
  if (again.length) {
    const second = await parallel(again.map((i) => () => judge(findings[i], 2)));
    again.forEach((i, k) => {
      verdicts[i] = second[k] || verdicts[i];
    });
  }
  const out = { defects: [], nonIssues: [], unverified: [] };
  findings.forEach((f, i) => {
    let v = verdicts[i];
    // A verdict on another revision, or a pass that carries a blocking finding, is not trusted.
    if (v && (!named(v, head) || (v.verdict === 'pass' && v.findings.some((x) => x.blocking)))) {
      v = { verdict: 'unverified', evaluated: v.evaluated, findings: [], limits: problems(v, head).join('; ') };
    }
    const why = v && v.findings.length ? v.findings.map((x) => x.problem).join('; ') : '';
    if (v && v.verdict === 'fail') out.defects.push({ finding: f, why });
    else if (v && v.verdict === 'pass') out.nonIssues.push({ finding: f.text, reason: why || 'the lens found the change free of it' });
    else out.unverified.push({ finding: f.text, missing: v ? v.limits : 'the lens did not return a verdict' });
  });
  return out;
}

// ---- Fix -------------------------------------------------------------------

// Worktree-relative form of a path, for comparing the same file spelled two ways.
const relPath = (p) => {
  const t = String(p || '').trim();
  return worktree && t.startsWith(worktree + '/') ? t.slice(worktree.length + 1) : t.replace(/^\.\//, '');
};

// Everything the round commits: the producers' reported paths plus every path that was dirty when the round
// began (validators judged the whole worktree), without .tmp/ and without the spec, which is committed alone.
function stagedPaths(st) {
  const out = [];
  const seen = new Set();
  for (const p of [...st.stage, ...st.dirtyAll]) {
    if (!p || isTmp(p) || isSpec(p) || seen.has(relPath(p))) continue;
    seen.add(relPath(p));
    out.push(p);
  }
  return out;
}

// Work already in the worktree from an interrupted run or from an earlier attempt of this round.
const carriedPaths = (st) => [...new Set([...st.dirtyAll, ...st.stage])].filter((p) => !isTmp(p));

const workBrief = (items) =>
  list(items.map((i) => `${i.id}${i.location ? ` at ${i.location}` : ''}: ${i.text}${i.why ? ` (the lens found: ${i.why})` : ''}`));

const dirtyBrief = (paths) =>
  paths.length
    ? `\nUncommitted changes in these paths come from an interrupted run of this step; inspect them, keep what serves your assignment, and continue from them rather than starting over:\n${list(paths)}`
    : '';

// Revise the spec through the writer, then require a fresh lens-scope and lens-consistency to pass it.
async function reviseSpec(r, items, mismatch, st) {
  let gateFindings = [];
  while (true) {
    phase('Fix');
    const { res: w, open } = await settleDecisions(`r${r}-spec`, answers, (settled) =>
      agent(
      `${WHERE}
${NO_FORGE_WRITES}

Revise the spec at ${specPath} (attempt ${specFailures + 1} in round ${r}) so that it covers the review defects below. Change only the spec. Clarify without changing meaning, and keep the original wording of a criterion beside any clarification. ${ASSUMPTIONS} The story is the acceptance source and is never changed: if a defect would change the story's goal, scope, or a criterion's meaning, return it in storyBlockers instead of revising. Return the spec path in produced and its git hash-object as revision.

${acceptance([])}
${items.length ? `\nReview defects the spec must cover:\n${workBrief(items)}` : ''}${mismatch ? `\nThe coder reports the spec cannot be followed as written:\n${mismatch}` : ''}${gateFindings.length ? `\nA fresh lens rejected the previous revision for:\n${list(gateFindings)}` : ''}${settledText(settled)}`,
      { agentType: 'slopify:writer', label: `revise spec round ${r}`, phase: 'Fix', schema: WRITER_SCHEMA },
      ),
    );
    if (!w) {
      specFailures += 1;
      attempts.push({ gate: 'spec', approach: `spec revision in round ${r}`, failed: 'the writer did not return' });
      if (specFailures >= MAX_FAILURES) return { stop: stop(`spec-r${r}`, [need(`r${r}-spec`, 'validation', 'A spec revision that passes lens-scope and lens-consistency.', 'the writer did not return')]) };
      continue;
    }
    if (w.storyBlockers.length) {
      return { stop: stop(`fix-r${r}`, w.storyBlockers.map((b, i) => need(`r${r}-story-${i + 1}`, 'story', b, 'raised by the writer while revising the spec'))) };
    }
    if (open.length) {
      return { stop: stop(`fix-r${r}`, open.map((d) => need(d.id, 'decision', d.question, 'raised by the writer while revising the spec'))) };
    }
    const gateBrief = `${WHERE}

Judge the spec at ${specPath}, revision ${w.revision}, revised during the review loop on pull request ${pr}; spec gate attempt ${specFailures + 1}. Report that revision in evaluated.

${acceptance([])}

Review defects the revision was written to cover:
${workBrief(items)}${mismatch ? `\nThe coder's reason for the revision:\n${mismatch}` : ''}`;
    const gate = await parallel([
      () => lens('lens-scope', gateBrief, { label: `lens-scope round ${r}`, phase: 'Fix' }),
      () => lens('lens-consistency', gateBrief, { label: `lens-consistency round ${r}`, phase: 'Fix' }),
    ]);
    if (gate.every((g) => passes(g, w.revision))) {
      st.specRevised = true;
      st.specRevision = w.revision;
      for (const p of w.produced) st.stage.add(p);
      return { ok: true };
    }
    specFailures += 1;
    gateFindings = gate.flatMap((g) => (passes(g, w.revision) ? [] : problems(g, w.revision)));
    attempts.push({ gate: 'spec', approach: `spec revision ${w.revision} in round ${r}`, failed: gateFindings.join('; ') });
    if (specFailures >= MAX_FAILURES) return { stop: stop(`spec-r${r}`, [need(`r${r}-spec`, 'validation', 'A spec revision that passes lens-scope and lens-consistency.', gateFindings.join('; '))]) };
  }
}

function coderCall(r, items, st) {
  const dirty = carriedPaths(st).filter((p) => !isDoc(p));
  return agent(
    `${WHERE}
${NO_FORGE_WRITES}

Fix these defects found in review ${r} of pull request ${pr} (attempt ${st.pass}), in the worktree ${worktree}. Write only code and test files there, and no documentation or spec. Add or update a regression test for each defect where one fits. Run the focused tests as you work. Run git add -N on each new file, then return as the revision a label for the worktree's current state: <HEAD sha>+<git hash-object of the output of git diff HEAD --binary>. The label is not a git object. Put in specMismatch why the spec cannot be followed, or an empty string.

${acceptance([])}
${specPath ? `\nThe spec at ${specPath} is the contract; do not edit it.` : ''}

Defects:
${workBrief(items)}${dirtyBrief(dirty)}`,
    { agentType: 'slopify:coder', label: `fix code round ${r}`, phase: 'Fix', schema: CODER_SCHEMA },
  );
}

// The documentation writer raises its own decisions (prefix r<n>-docs), apart from the spec writer's.
// The result carries them as open, the questions the user has not answered.
async function docWriterCall(r, items, st) {
  const dirty = carriedPaths(st).filter((p) => isDoc(p) && !isSpec(p));
  const { res, open } = await settleDecisions(`r${r}-docs`, answers, (settled) =>
    agent(
    `${WHERE}
${NO_FORGE_WRITES}

Fix these documentation defects found in review ${r} of pull request ${pr} (attempt ${st.pass}), in the worktree ${worktree}. Write only documentation files, not the spec and not code. ${ASSUMPTIONS} Return the paths you changed in produced and the git hash-object of the main one as revision.

${acceptance([])}

Defects:
${workBrief(items)}${dirtyBrief(dirty)}${settledText(settled)}`,
    { agentType: 'slopify:writer', label: `fix docs round ${r}`, phase: 'Fix', schema: WRITER_SCHEMA },
    ),
  );
  if (res) res.open = open;
  return res;
}

// One production pass: the spec first when it must change, then code and documentation together. A producer
// that failed is run again alone; one that already returned a good result is not run twice.
async function produce(r, st) {
  let codeOk = false;
  let docsOk = false;
  while (true) {
    st.pass += 1;
    const items = [...st.base, ...st.feedback];
    const specItems = items.filter((i) => isSpec(i.location));
    const docItems = items.filter((i) => !isSpec(i.location) && isDoc(i.location));
    const codeItems = items.filter((i) => !isDoc(i.location));

    if (specItems.length) {
      if (!specPath) {
        return { stop: stop(`fix-r${r}`, [need(`r${r}-story-1`, 'story', 'A story or spec that the defects can be judged against.', specItems.map((i) => i.text).join('; '))]) };
      }
      const res = await reviseSpec(r, specItems, '', st);
      if (res.stop) return res;
      st.base = st.base.filter((i) => !isSpec(i.location));
      st.feedback = st.feedback.filter((i) => !isSpec(i.location));
      continue;
    }

    phase('Fix');
    const wantCoder = codeItems.length > 0;
    const wantDocs = docItems.length > 0;
    const ranCoder = wantCoder && !codeOk;
    const ranDocs = wantDocs && !docsOk;
    const res = await parallel([
      () => (ranCoder ? coderCall(r, codeItems, st) : Promise.resolve(null)),
      () => (ranDocs ? docWriterCall(r, docItems, st) : Promise.resolve(null)),
    ]);
    let c = res[0];
    const w = res[1];
    // Record what each producer left before any retry or early return: it is in the worktree either way.
    if (c) {
      for (const p of [...c.changed, ...c.tests]) st.stage.add(p);
      st.coder = c;
      if (!(c.specMismatch && c.specMismatch.trim())) codeOk = true;
    }
    if (w) {
      for (const p of w.produced) if (!isSpec(p)) st.stage.add(p);
      st.docsChanged = st.docsChanged || w.produced.some((p) => !isSpec(p));
      st.writer = w;
    }
    if (ranDocs) {
      if (!w) {
        fixFailures += 1;
        attempts.push({ gate: 'fix', approach: `documentation fix in round ${r}`, failed: 'the writer did not return' });
        if (fixFailures >= MAX_FAILURES) return { stop: stop(`fix-r${r}`, [need(`r${r}-fix`, 'validation', 'A documentation fix; the writer did not return.', 'writer returned nothing')]) };
        continue;
      }
      if (w.storyBlockers.length) return { stop: stop(`fix-r${r}`, w.storyBlockers.map((b, i) => need(`r${r}-story-${i + 1}`, 'story', b, 'raised by the writer while fixing documentation'))) };
      if (w.open.length) return { stop: stop(`fix-r${r}`, w.open.map((d) => need(d.id, 'decision', d.question, 'raised by the writer while fixing documentation'))) };
      docsOk = true;
    }
    if (ranCoder) {
      // A spec mismatch goes back through the spec gate and spends the spec budget, then the coder runs again.
      while (c && c.specMismatch && c.specMismatch.trim()) {
        specFailures += 1;
        attempts.push({ gate: 'spec', approach: `coder fix in round ${r}`, failed: c.specMismatch });
        if (!specPath) return { stop: stop(`fix-r${r}`, [need(`r${r}-story-1`, 'story', 'The defects cannot be fixed within the behavior the pull request describes.', c.specMismatch)]) };
        if (specFailures >= MAX_FAILURES) return { stop: stop(`spec-r${r}`, [need(`r${r}-spec`, 'validation', 'A spec the code can follow.', c.specMismatch)]) };
        const rev = await reviseSpec(r, [], c.specMismatch, st);
        if (rev.stop) return rev;
        c = await coderCall(r, codeItems, st);
        if (c) {
          for (const p of [...c.changed, ...c.tests]) st.stage.add(p);
          st.coder = c;
        }
      }
      if (!c) {
        fixFailures += 1;
        attempts.push({ gate: 'fix', approach: `code fix in round ${r}`, failed: 'the coder did not return' });
        if (fixFailures >= MAX_FAILURES) return { stop: stop(`fix-r${r}`, [need(`r${r}-fix`, 'validation', 'A code fix; the coder did not return.', 'coder returned nothing')]) };
        continue;
      }
      codeOk = true;
    }
    st.label = (wantCoder && st.coder ? st.coder.revision : wantDocs && st.writer ? st.writer.revision : st.label) || st.specRevision || '';
    return { ok: true };
  }
}

// ---- Validate --------------------------------------------------------------

function candidateRevision(st) {
  const parts = [];
  if (st.coder) parts.push(`the coder reports ${st.coder.revision}`);
  if (st.writer) parts.push(`the writer reports ${st.writer.revision} for its main document`);
  if (st.specRevised) parts.push(`the spec was revised to ${st.specRevision}`);
  const label = st.label || head || '';
  return {
    label,
    text: `${label || 'the worktree head'}. This is a label for the current state of the worktree ${worktree} on top of commit ${head || 'its head'}, after every producer returned (${parts.join('; ') || 'no producer reported a revision'}); it is not a git object. Judge the worktree as it stands now and report this label in evaluated`,
  };
}

async function validate(r, st, defects) {
  phase('Validate');
  const failFindings = defects.map((d) => `${d.finding.id}: ${d.finding.text}`);
  const cand = candidateRevision(st);
  const brief = `${WHERE}

Judge the fixes made for the review defects below on pull request ${pr} (validation ${st.validations} of round ${r}).
Revision: ${cand.text}.
Changed paths:
${list(stagedPaths(st))}

${acceptance(failFindings)}

Review defects fixed:
${list(failFindings)}`;
  const jobs = [
    () =>
      agent(
        `${brief}

Run the tests and checks that apply. Judge that each defect is resolved, that nothing regressed, and that the fixes stay within what the acceptance source covers.`,
        { agentType: 'slopify:qa', label: `qa round ${r} #${st.validations}`, phase: 'Validate', schema: LENS_SCHEMA },
      ),
  ];
  if (st.docsChanged) {
    jobs.push(() =>
      lens('lens-docs', `${brief}

Judge that the documentation claims in the changed paths are true against the code.`, { label: `lens-docs round ${r} #${st.validations}`, phase: 'Validate' }),
    );
  }
  const verdicts = await parallel(jobs);
  const pass = verdicts.every((v) => passes(v, cand.label));
  const feedback = [];
  let procedural = true; // only a missing verdict or a wrong revision failed: judge again without producing again
  verdicts.forEach((v, i) => {
    if (passes(v, cand.label)) return;
    const src = i === 0 ? 'qa' : 'lens-docs';
    const blockers = v ? v.findings.filter((f) => f.blocking) : [];
    if (blockers.length || (v && v.verdict !== 'pass')) procedural = false;
    if (blockers.length) blockers.forEach((f, k) => feedback.push({ id: `${src}-${st.validations}-${k + 1}`, location: f.location, text: f.problem, why: '' }));
    else if (v) feedback.push({ id: `${src}-${st.validations}`, location: '', text: problems(v, cand.label).join('; '), why: '' });
  });
  const summary = `validation ${st.validations}: ${verdicts.map((v, i) => `${i === 0 ? 'qa' : 'lens-docs'} ${!v ? 'no verdict' : passes(v, cand.label) ? 'pass' : v.verdict === 'pass' ? 'pass not accepted' : v.verdict}`).join(', ')}`;
  st.validationLog.push(summary);
  return { pass, feedback, verdicts, procedural, label: cand.label };
}

// ---- Push ------------------------------------------------------------------

function pushBrief(r, st, summary) {
  const staged = stagedPaths(st);
  const steps = [
    `If ${worktree}/.tmp/ledger.md does not exist, create it with the line: <time> run 1: review-pr ${pr} | worktree ${worktree} | branch ${branch || '<branch>'}`,
  ];
  if (st.specRevised) {
    steps.push(`Commit ${specPath} alone, first, with a message in the project's commit convention from docs/FORGE.md.`);
  }
  steps.push(
    `Commit exactly these paths, staging each explicitly and never staging anything else, with a message in the project's commit convention from docs/FORGE.md:\n${list(staged)}`,
    `Push the branch as docs/FORGE.md declares for a verified repair, then update the pull request as its repair binding declares, summarizing the defects fixed: ${summary}`,
    'Re-fire the review trigger as docs/FORGE.md declares.',
  );
  const lines = [];
  if (st.specRevised) {
    lines.push(
      `<time> done spec ${specPath}@<its git hash-object> commit <sha of the spec commit> story <the story revision on the ledger's last done spec line>` +
        (testPath ? ` test ${testPath}` : ' and, when that last done spec line ends with test <path>, the same test <path>'),
    );
  }
  lines.push(
    `only if the ledger already holds a done spec line: <time> done implement commit <sha of the implementation commit> spec <git hash-object of ${specPath || 'the spec'}> pushed`,
    `<time> review ${r} ended finished: ${summary}`,
    `<time> review ${r + 1} fired <the trigger time> head <sha of the pushed head>`,
  );
  steps.push(`Append these ledger lines in this order, stamping the time yourself:\n${list(lines)}`);
  return `${WHERE}
${AUTH}

Publish the verified fixes of review round ${r} for pull request ${pr}. A fresh qa passed them. Work in the worktree ${worktree}${branch ? ` on branch ${branch}` : ''}, in this order:
${steps.map((x, i) => `${i + 1}. ${x}`).join('\n')}

Return the implementation commit sha as the reference of an operation named "commit", the spec commit (if any) as "commit-spec", and record every other operation. Put anything docs/BOARD.md or docs/FORGE.md does not bind in unmet.`;
}

// A round whose fix was committed but not fully published (the push failed, or a step after it did, or the run
// stopped first): finish the steps that remain, without judging the round again; a fresh qa passed the fix
// before the commit. pushDone: the branch is already pushed, so only the steps after the push remain.
function resumePushBrief(r, pushDone) {
  const lines = [
    `only if the last done spec line's spec hash differs from the git hash-object of ${specPath || 'the spec'}: <time> done spec ${specPath || '<the spec path>'}@<its git hash-object> commit <sha of the commit that holds that spec> story <the story revision on the ledger's last done spec line>` +
      (testPath ? ` test ${testPath}` : ' and, when that last done spec line ends with test <path>, the same test <path>'),
    `only if the ledger already holds a done spec line: <time> done implement commit <sha of HEAD> spec <git hash-object of ${specPath || 'the spec'}> pushed`,
    `<time> review ${r} ended finished: finished the publishing an interrupted run left undone`,
    `<time> review ${r + 1} fired <the trigger time> head <sha of the pushed head>`,
  ];
  return `${WHERE}
${AUTH}

The worktree ${worktree}${branch ? ` on branch ${branch}` : ''} holds a verified fix for review round ${r} of pull request ${pr} that an earlier run did not finish publishing. Commit nothing and stage nothing. Do each step below that the forge does not already show done, in this order:
1. ${pushDone ? 'The branch is already pushed; do not push it again.' : 'Push the branch as docs/FORGE.md declares for a verified repair.'} Then update the pull request as its repair binding declares, saying the fix of round ${r} was finished by a resumed run.
2. Re-fire the review trigger as docs/FORGE.md declares, unless review ${r + 1} was already fired for the pushed head.
3. Append these ledger lines in this order, stamping the time yourself:
${list(lines)}

Return the worktree's HEAD sha as the reference of an operation named "commit", and record every other operation. Put anything docs/BOARD.md or docs/FORGE.md does not bind in unmet.`;
}

// The fix commit among the operations a push reported. The spec is committed first, alone, so the fix
// commit is the commit operation the brief names `commit`, else the last commit that is not the spec's.
function fixCommit(pushed) {
  const commits = ((pushed && pushed.operations) || []).filter((o) => /commit/i.test(o.op) && o.reference);
  const named = commits.filter((o) => o.op.trim().toLowerCase() === 'commit');
  const rest = commits.filter((o) => !/spec/i.test(`${o.op} ${o.result}`));
  const pick = named.length ? named[named.length - 1] : rest.length ? rest[rest.length - 1] : commits[commits.length - 1];
  return pick ? pick.reference : '';
}

async function refreshHead(r, pushed) {
  const res = await scout('scout-checkpoint', checkpointPrompt('head dirty', `Report only head and dirty, after the push of round ${r}.`), { label: 'checkpoint after push', phase: 'Push' });
  const h = res ? val(res, 'head') : '';
  if (h) head = h;
  else {
    const ref = fixCommit(pushed);
    if (ref) head = ref;
  }
  dirtyPaths = res ? parseDirty(fact(res, 'dirty')) : [];
}

// ---- The rounds ------------------------------------------------------------

let review = null; // the final outcome
let unfixed = [];
let ended = false;

function roundRecord(round, sorted, verdict, extra) {
  return {
    round,
    defectsFixed: [],
    nonIssues: sorted ? sorted.nonIssues : [],
    unverified: sorted ? sorted.unverified : [],
    verdict,
    ...(extra || {}),
  };
}

function endedBy(res, round) {
  return { outcome: res.outcome, round, reference: res.reference || '', ...(res.note ? { note: res.note } : {}) };
}

for (let r = startRound; r <= MAX_ROUNDS && !ended; r++) {
  // A fix committed in this round and never pushed: resume at Push. Review r has already been judged
  // and fixed; waiting for it again would sort its findings against a HEAD that holds the fix.
  if ((unpushed || pushedAhead) && r === startRound && fired >= 1) {
    phase('Push');
    const resumed = await agent(resumePushBrief(r, !unpushed), { agentType: 'slopify:pusher', label: `push round ${r} (resumed)`, phase: 'Push', schema: PUSHER_SCHEMA });
    if (!resumed || !resumed.done) {
      return stop(`push-r${r}`, [
        need(`r${r}-push`, 'prerequisite', 'A pushed fix for the pull request; the worktree holds commits the forge lacks.', resumed ? (resumed.unmet.join('; ') || 'pusher reported the push not done') : 'pusher did not return'),
      ]);
    }
    rounds.push(roundRecord(r, null, 'fixed', { note: unpushed ? `pushed the fix an interrupted run had committed` : `finished the steps after the push of a fix that an interrupted run had pushed`, pushed: fixCommit(resumed), ...(resumed.unmet.length ? { unmet: resumed.unmet } : {}) }));
    completed.push(`round-${r}`);
    await refreshHead(r, resumed);
    continue;
  }
  // Wait
  let findings;
  let reviewRef = '';
  if (r === 1 && startRound === 1 && givenFindings.length) {
    skipped.push('wait-round-1');
    findings = givenFindings;
  } else {
    const waited = await awaitReview(r);
    if (waited.stopped) {
      return stop(`wait-r${r}`, [need(`r${r}-wait`, 'prerequisite', `A watcher that can report review ${r}.`, 'the watcher did not return three times')]);
    }
    const res = waited.review;
    if (res.outcome !== 'finished') {
      review = endedBy(res, r);
      rounds.push(roundRecord(r, null, res.outcome));
      ended = true;
      break;
    }
    findings = normFindings(res.findings);
    reviewRef = res.reference || '';
  }

  // Sort
  const sorted = findings.length ? await sortFindings(r, findings) : { defects: [], nonIssues: [], unverified: [] };
  if (!sorted.defects.length) {
    review = { outcome: sorted.unverified.length ? 'no-defects' : 'clean', round: r, reference: reviewRef };
    rounds.push(roundRecord(r, sorted, sorted.unverified.length ? 'unverified' : 'clean'));
    ended = true;
    break;
  }

  // Fix and validate, until a fresh qa passes
  const st = {
    base: sorted.defects.map((d) => ({ id: d.finding.id, location: d.finding.location, text: d.finding.text, why: d.why })),
    feedback: [],
    dirtyAll: dirtyPaths.slice(),
    stage: new Set(),
    docsChanged: false,
    specRevised: false,
    specRevision: '',
    coder: null,
    writer: null,
    validations: 0,
    pass: 0,
    label: '',
    skipProduce: false,
    validationLog: [],
  };
  while (true) {
    if (!st.skipProduce) {
      const made = await produce(r, st);
      if (made.stop) return made.stop;
    }
    st.validations += 1;
    const v = await validate(r, st, sorted.defects);
    if (v.pass) break;
    validateFailures += 1;
    attempts.push({
      gate: 'validate',
      approach: `fixes for review ${r}, validation ${st.validations}`,
      failed: v.verdicts.map((x) => problems(x, v.label).join('; ')).join(' | '),
    });
    if (validateFailures >= MAX_FAILURES) {
      return stop(`validate-r${r}`, [need(`r${r}-validate`, 'validation', 'Fixes a fresh qa will pass.', attempts[attempts.length - 1].failed)]);
    }
    st.skipProduce = v.procedural;
    if (!v.procedural) st.feedback = v.feedback;
  }

  // Push: reachable only after a fresh qa passed this round's fixes
  phase('Push');
  const summary = `fixed ${sorted.defects.length}, non-issues ${sorted.nonIssues.length}${sorted.unverified.length ? `, unverified ${sorted.unverified.length}` : ''}`;
  const pushed = await agent(pushBrief(r, st, summary), { agentType: 'slopify:pusher', label: `push round ${r}`, phase: 'Push', schema: PUSHER_SCHEMA });
  if (!pushed || !pushed.done) {
    return stop(`push-r${r}`, [
      need(`r${r}-push`, 'prerequisite', 'A pushed, verified fix for the pull request.', pushed ? (pushed.unmet.join('; ') || 'pusher reported the push not done') : 'pusher did not return'),
    ]);
  }
  rounds.push(
    roundRecord(r, sorted, 'fixed', {
      defectsFixed: sorted.defects.map((d) => `${d.finding.id}: ${d.finding.text}`),
      validations: st.validationLog,
      pushed: fixCommit(pushed),
      ...(pushed.unmet.length ? { unmet: pushed.unmet } : {}),
    }),
  );
  completed.push(`round-${r}`);
  await refreshHead(r, pushed);
}

// ---- The final review ------------------------------------------------------

// After round 3's push (or when a rerun finds review 4 already fired): wait, sort for the report, fix nothing.
if (!ended) {
  const waited = await awaitReview(FINAL_ROUND);
  if (waited.stopped) {
    return stop('wait-final', [need('final-wait', 'prerequisite', `A watcher that can report review ${FINAL_ROUND}.`, 'the watcher did not return three times')]);
  }
  const res = waited.review;
  if (res.outcome !== 'finished') {
    review = endedBy(res, FINAL_ROUND);
    rounds.push(roundRecord(FINAL_ROUND, null, res.outcome));
  } else {
    const found = normFindings(res.findings);
    const sorted = found.length ? await sortFindings(FINAL_ROUND, found) : { defects: [], nonIssues: [], unverified: [] };
    unfixed = sorted.defects.map((d) => ({ finding: `${d.finding.id}: ${d.finding.text}`, reason: d.why || 'the lens found the defect present' }));
    review = {
      outcome: sorted.defects.length ? 'defects-remain' : sorted.unverified.length ? 'no-defects' : 'clean',
      round: FINAL_ROUND,
      reference: res.reference || '',
    };
    rounds.push(roundRecord(FINAL_ROUND, sorted, 'final'));
  }
}

function buildReport() {
  const lines = [`review-pr on ${pr}`];
  for (const rd of rounds) {
    if (rd.verdict === 'not-declared') continue;
    const bits = [`Round ${rd.round}: ${rd.verdict}`];
    if (rd.defectsFixed.length) bits.push(`fixed ${rd.defectsFixed.length} (${rd.defectsFixed.join('; ')})`);
    if (rd.nonIssues.length) bits.push(`non-issues ${rd.nonIssues.length} (${rd.nonIssues.map((x) => `${x.finding} -- ${x.reason}`).join('; ')})`);
    if (rd.unverified.length) bits.push(`unverified ${rd.unverified.length} (${rd.unverified.map((x) => `${x.finding} -- missing: ${x.missing}`).join('; ')})`);
    if (rd.validations && rd.validations.length) bits.push(`qa: ${rd.validations.join(' | ')}`);
    if (rd.note) bits.push(rd.note);
    lines.push(bits.join('; '));
  }
  const o = review ? review.outcome : 'none';
  const at = review ? review.round : 0;
  lines.push(
    o === 'not-declared'
      ? 'Ended: No review is declared in docs/FORGE.md; nothing to wait for.'
      : o === 'clean'
      ? `Ended: clean review at round ${at}.`
      : o === 'no-defects'
        ? `Ended: no defects at round ${at}, but some findings are unverified.`
        : o === 'defects-remain'
          ? `Ended: ${MAX_ROUNDS} rounds done; review ${at} still has ${unfixed.length} unfixed defect(s).`
          : `Ended: review ${at} ${o}.${review && review.note ? ` ${review.note}` : ''}`,
  );
  return lines.join('\n');
}

return {
  status: 'done',
  workflow: 'review-pr',
  skipped,
  attempts,
  pr,
  rounds,
  review,
  unfixed,
  report: buildReport(),
};
