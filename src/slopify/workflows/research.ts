import { STRINGS } from "../lib/family.ts";
import { inputOf, textOf, whereOf } from "../lib/input.ts";
import { libraryReaderSchema } from "../lib/schemas.ts";
import { withoutTrailing } from "../lib/text.ts";

export const meta = {
  name: "research",
  description:
    "Investigate a question from new sources and persist the evidence and a cited synthesis in the project library, which a fresh library-clerk must pass before the workflow reports done",
  whenToUse:
    "Run only when the user invokes /slopify:research or asks for the slopify research workflow. Answers from the existing library belong to the ask skill. Args: {question, projectRoot?}, or the question as a plain string; projectRoot defaults to the session project directory.",
  phases: [
    { title: "Context", detail: "library-reader reports what the library already supports" },
    { title: "Spec", detail: "library-scribe writes the research spec; a fresh library-clerk must pass it" },
    { title: "Retrieve", detail: "one library-researcher per sub-question" },
    { title: "Persist", detail: "library-scribe raw notes, then one integrator for synthesis and metadata" },
    { title: "Validate", detail: "a fresh library-clerk judges the persisted research" },
  ],
} as const satisfies WorkflowMeta;

const BOUNDS =
  "Research informs decisions: make no product decisions, file no tickets, implement nothing, and publish nothing.";
const MAX_FAILURES = 3;
const MAX_RETRIEVAL_TRIES = 2;

const CONTEXT_SCHEMA = libraryReaderSchema("the question");

const SPEC_SCHEMA = {
  type: "object",
  required: ["path", "revision", "date", "subQuestions", "changedSubQuestions", "plannedRawNotes"],
  properties: {
    path: { type: "string", description: "Absolute path of the spec" },
    date: { type: "string", description: "Today's date as YYYY-MM-DD, the one the spec and the raw-note names use" },
    plannedRawNotes: {
      type: "array",
      description:
        "The raw notes the research will produce: one note per canonical source, as the library conventions require, at the path the conventions name for raw notes. The same plan is written in the spec as its planned artifacts",
      items: {
        type: "object",
        required: ["path", "source", "subQuestions"],
        properties: {
          path: {
            type: "string",
            description: "Absolute path of the raw note, derived from the source (never from a sub-question id)",
          },
          source: {
            type: "string",
            description: "The canonical source the note records: a URL, or a project file path",
          },
          subQuestions: { ...STRINGS, description: "Ids of the sub-questions whose evidence belongs in this note" },
        },
      },
    },
    revision: {
      type: "string",
      description: "A digest of the exact revision written, such as a content hash or line count with the last heading",
    },
    subQuestions: {
      type: "array",
      description: "The bounded sub-questions to retrieve, each with a short stable id",
      items: {
        type: "object",
        required: ["id", "question"],
        properties: { id: { type: "string" }, question: { type: "string" } },
      },
    },
    changedSubQuestions: {
      ...STRINGS,
      description:
        "Ids of sub-questions that are new or whose retrieval must be redone after a revision; all ids for the first draft",
    },
  },
} as const;

// A spec issue is material only when the question, scope, evidence standards, or planned
// artifacts must change. A minor note, a style point, or "nothing material" is not material.
function SPEC_ISSUE_SCHEMA(doing: string) {
  return {
    type: "object",
    required: ["material", "change"],
    properties: {
      material: {
        type: "boolean",
        description: `true only if, while ${doing}, you found that the spec's question, scope, evidence standards, or planned artifacts must change for the research to be sound; false for anything else, including minor notes`,
      },
      change: {
        type: "string",
        description:
          "When material is true, the change needed and which of question, scope, evidence standards, or planned artifacts it moves; otherwise an empty string",
      },
    },
  } as const;
}

const VERDICT_SCHEMA = {
  type: "object",
  required: ["verdict", "findings", "evidence", "specIssue"],
  properties: {
    verdict: { type: "string", enum: ["pass", "fail", "unverified"] },
    findings: { ...STRINGS, description: "Each finding with the path or claim it concerns; empty on pass" },
    evidence: { type: "string", description: "What was checked and how" },
    specIssue: SPEC_ISSUE_SCHEMA("judging"),
  },
} as const;

const RESEARCH_SCHEMA = {
  type: "object",
  required: ["findings", "sources", "contradictions", "limits", "specIssue"],
  properties: {
    sources: {
      type: "array",
      description:
        "Every distinct source whose content the findings quote or rest on to answer the question, one entry per canonical source. Leave out the research spec, the library conventions and templates, and any file you read only for orientation",
      items: {
        type: "object",
        required: ["url", "title", "origin"],
        properties: {
          url: { type: "string", description: "Canonical URL, or project file path" },
          title: { type: "string" },
          origin: {
            type: "string",
            description:
              "When url is a library raw note, the canonical source that note records in its source field; otherwise an empty string",
          },
        },
      },
    },
    findings: {
      ...STRINGS,
      description:
        "Each as: claim <- source (URL, title, author); retrieved date; published/version date; supporting passage (quote | paraphrase | inference)",
    },
    contradictions: STRINGS,
    limits: {
      ...STRINGS,
      description: "Failed or thin retrievals with query, provider, and observation; unfetched leads",
    },
    specIssue: SPEC_ISSUE_SCHEMA("retrieving"),
  },
} as const;

const RAW_SCHEMA = {
  type: "object",
  required: ["produced", "deferredMetadata", "skipped", "reason"],
  properties: {
    produced: {
      ...STRINGS,
      description:
        "Absolute paths of the raw notes written or appended; an empty array when you deliberately wrote nothing",
    },
    skipped: {
      type: "boolean",
      description: "true only when you deliberately wrote nothing because the evidence has nothing for this source",
    },
    reason: {
      type: "string",
      description: "When skipped is true, why nothing was written; otherwise an empty string",
    },
    deferredMetadata: { ...STRINGS, description: "Index, taxonomy, or log entries left for the integrator" },
  },
} as const;

const INTEGRATION_SCHEMA = {
  type: "object",
  required: ["answer", "rawNotes", "synthesis", "metadata", "gaps", "contradictions", "limits"],
  properties: {
    answer: { type: "string", description: "The cited answer to the question, as far as the evidence allows" },
    rawNotes: {
      ...STRINGS,
      description:
        "The authoritative current list: absolute paths of every raw note of this research that exists after your work. Leave out notes that were merged or deleted",
    },
    synthesis: { ...STRINGS, description: "Absolute paths of the wiki and topic pages written or updated" },
    metadata: { ...STRINGS, description: "Absolute paths of the index, taxonomy, and log files updated" },
    gaps: STRINGS,
    contradictions: STRINGS,
    limits: STRINGS,
  },
} as const;

type Context = Infer<typeof CONTEXT_SCHEMA>;
type Spec = Infer<typeof SPEC_SCHEMA>;
type PlannedNote = Spec["plannedRawNotes"][number];
type SubQuestion = Spec["subQuestions"][number];
type Verdict = Infer<typeof VERDICT_SCHEMA>;
type SpecIssue = Verdict["specIssue"];
type Research = Infer<typeof RESEARCH_SCHEMA>;
type Raw = Infer<typeof RAW_SCHEMA>;
type Integration = Infer<typeof INTEGRATION_SCHEMA>;

interface Attempt {
  gate: string;
  approach: string;
  failed: string;
}
interface SourcePath {
  source: string;
  path: string;
}
interface Cited {
  url: string;
  title: string;
}
interface Job {
  key: string;
  source: string;
  title: string;
  path: string;
  subs: string[];
}

interface NotStarted {
  started: false;
  next: string;
}
interface BlockedResult {
  done: false;
  gate: string;
  attempts: Attempt[];
  needs: string[];
}
interface DoneResult {
  done: true;
  answer: string;
  artifacts: { spec: string; rawNotes: string[]; synthesis: string[]; metadata: string[] };
  verdict: { verdict: Verdict["verdict"]; evidence: string };
  report: string;
  gaps: string[];
  contradictions: string[];
  limits: string[];
}

// What the spec gate needs; the rest of the run adds the passed spec and the evidence.
interface Base {
  question: string;
  projectRoot: string;
  where: string;
  context: Context;
  attempts: Attempt[];
  specFailures: number;
  persistFailures: number;
  persisted: Integration | null; // latest integration or repair result
  pendingWritten: string[]; // raw notes written since the last integration returned
  pendingDeferred: string[]; // deferred metadata not yet integrated
  writtenFor: { source: string; sub: string }[]; // evidence of a sub-question already written to that source's note
  sourcePaths: SourcePath[]; // where each source's raw note was written; new evidence never clears it
  pendingExisting: string[]; // library raw notes the research cites, for the integrator
  pendingLeads: string[]; // planned sources with no retrieved evidence, for the integrator
  retrievalTries: Record<string, number>; // sub-question id -> researcher attempts without a result
  currentRaw: string[]; // the authoritative current list of raw notes; the latest structured list wins
}
interface State extends Base {
  spec: Spec;
  evidence: Record<string, Research>; // sub-question id -> researcher result
  pending: string[]; // sub-questions to (re)retrieve
}

function blocked(attempts: Attempt[], gate: string, needs: string[]): BlockedResult {
  return {
    done: false,
    gate,
    attempts,
    needs,
  };
}

function materialIssue(issue: SpecIssue): boolean {
  return issue.material && issue.change.trim().length > 3;
}

// A clerk that returns no verdict is dispatched again under its own bound: that is not a failure of the
// gate it judges and sends no producer to revise. Null when the bound is spent.
async function clerkVerdict(
  st: Base,
  prompt: string,
  opts: { agentType: string; label: string; phase: string; schema: typeof VERDICT_SCHEMA },
): Promise<Verdict | null> {
  for (let i = 1; i <= MAX_FAILURES; i++) {
    const v = await agent(prompt, opts);
    if (v) return v;
    st.attempts.push({ gate: "validator", approach: opts.label, failed: "the clerk did not return a verdict" });
  }
  return null;
}

// POSIX (/x), drive-letter (C:\x, C:/x), and UNC (\\host\x) paths are absolute.
const ABSOLUTE = /^(?:\/|[A-Z]:[\\/]|\\\\)/i;

// Only absolute Markdown paths count as paths; anything else in an agent's report is prose.
function onlyPaths(items: readonly string[]): string[] {
  const out: string[] = [];
  for (const x of items) {
    const t = x.trim();
    if (ABSOLUTE.test(t) && !/[\r\n]/.test(t) && /\.md$/i.test(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

function toAbs(st: Base, p: string): string {
  const t = p.trim();
  if (!t || ABSOLUTE.test(t) || !st.projectRoot) return t;
  const sep = st.projectRoot.includes("\\") && !st.projectRoot.includes("/") ? "\\" : "/";
  return `${withoutTrailing(st.projectRoot, String.raw`\/`)}${sep}${t.replace(/^\.[\\/]/, "")}`;
}

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

// Compare sources by a simple normal form: single forward slashes, lower case, and no plain fragment,
// utm_* tracking parameter, scheme, leading www., leading ./, or trailing slash. Other query
// parameters and hash routes (#/, #!) stay, because they can name a different source
// (watch?v=A, item?id=1).
function normSource(x: string): string {
  return (
    x
      .trim()
      .replaceAll("\\", "/")
      .toLowerCase()
      // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short source or path
      .replace(/#(?![/!]).*$/, "")
      // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short source or path
      .replace(/\?(.*)$/, (_m, q: string) => {
        const kept = q.split("&").filter((param) => param && !param.startsWith("utm_"));
        return kept.length > 0 ? `?${kept.join("&")}` : "";
      })
      .replace(SCHEME, "")
      .replaceAll(/\/{2,}/g, "/")
      .replace(/^www\./, "")
      .replace(/^\.\//, "")
      // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short source or path
      .replace(/\/+(\?|$)/, "$1")
  );
}

const FILE_PATH = /^(?:\/|[a-z]:\/)/;

// A URL has a scheme other than file://.
function isUrl(x: string): boolean {
  const t = x.trim();
  return SCHEME.test(t) && !/^file:\/\//i.test(t);
}

// With a project root, a relative file path means the file under it.
function canon(st: Base, x: string): string {
  const t = x.trim();
  return !t || SCHEME.test(t) || ABSOLUTE.test(t) || !st.projectRoot ? t : toAbs(st, t);
}

// Sources match exactly, except that a relative project path (when the project root is unknown)
// matches the absolute file path that ends in it. A URL matches only itself.
function sameSource(st: Base, a: string, b: string): boolean {
  const x = normSource(canon(st, a));
  const y = normSource(canon(st, b));
  if (!x || !y) return false;
  if (x === y) return true;
  const [long, short] = x.length >= y.length ? [x, y] : [y, x];
  return FILE_PATH.test(long) && long.endsWith("/" + short);
}

// A project path inside the library (a raw note, wiki page, or convention file) is never a
// source. A URL is never a project path.
function inLibrary(u: string): boolean {
  return !isUrl(u) && /(?:^|\/)library\/(?:raw|wiki|_meta)\//.test(normSource(u));
}

// Compare paths with forward slashes, no repeated slashes, and a lower-case drive letter.
function normPath(p: string): string {
  return p
    .trim()
    .replaceAll("\\", "/")
    .replace(/^([a-z]):/i, (_m, d: string) => `${d.toLowerCase()}:`)
    .replaceAll(/(.)\/{2,}/g, "$1/");
}

function isWritten(st: Base, path: string): boolean {
  const x = normPath(path);
  return [...st.currentRaw, ...st.pendingWritten].some((w) => normPath(w) === x);
}

// source -> path of every raw note written so far that still exists
function writtenPairs(st: Base): SourcePath[] {
  const pairs: SourcePath[] = [];
  for (const e of st.sourcePaths) {
    if (isWritten(st, e.path) && pairs.every((q) => !sameSource(st, q.source, e.source))) pairs.push(e);
  }
  return pairs;
}

// Raw notes are append-only and one per source, so a plan must not put a written source's note at
// another path. Each such move is a finding for the spec reviser.
function movedNotes(st: Base, plan: readonly PlannedNote[]): string[] {
  const moved: string[] = [];
  for (const n of plan) {
    const w = n.source && writtenPairs(st).find((q) => sameSource(st, q.source, n.source));
    if (w && normPath(w.path) !== normPath(n.path)) {
      moved.push(
        `The raw note for ${n.source} is already written at ${w.path}; keep that path (the plan puts it at ${n.path}).`,
      );
    }
  }
  return moved;
}

const FIXED_PATHS =
  "These source-to-path pairs are fixed: raw notes are append-only and one per source, so the path of a written note is never a spec or research issue. Do not ask to move one.";

function pairsText(st: Base): string {
  const pairs = writtenPairs(st);
  return pairs.length > 0 ? pairs.map((q) => `- ${q.source} -> ${q.path}`).join("\n") : "- none";
}

// The integrator's and every repair's rawNotes is the authoritative current list; the latest
// structured list supersedes earlier ones. An empty or path-free list is not trusted.
function adoptRawList(st: Base, result: Integration): void {
  const latest = onlyPaths(result.rawNotes);
  if (latest.length > 0) st.currentRaw = latest;
  else log("The scribe returned no raw-note paths; keeping the workflow's own list");
}

function list(items: readonly string[]): string {
  return items.length > 0 ? items.map((x) => `- ${x}`).join("\n") : "- none";
}

// ---- Context ---------------------------------------------------------------

function readContext(where: string, question: string): Promise<Context | null> {
  return agent(
    `${where}

Report what the project library already supports about this question, so supported work isn't repeated. Read library/_meta/librarian.md, then the relevant index and wiki pages and the raw notes behind them. Cite each supported claim to its file and heading, and name gaps, stale material, and contested pages. Make no internet requests and no writes.

Question: ${question}`,
    { agentType: "slopify:library-reader", label: "library context", phase: "Context", schema: CONTEXT_SCHEMA },
  );
}

// ---- Spec gate -------------------------------------------------------------

function draftSpec(st: Base, spec: Spec | null, why: string, findings: readonly string[]): Promise<Spec | null> {
  const revising = spec !== null;
  return agent(
    `${st.where}
${BOUNDS}

${revising ? `Revise the research spec at ${spec.path}. ${why}` : "Write the research spec."} Put it in the project's spec location (normally docs/specs/), and write only that file. It states the question, scope, evidence standards, planned artifacts, convention fit, acceptance, the bounded sub-questions to retrieve (each with a short stable id), and the raw notes to produce: one raw note per canonical source, as the library conventions require, at the conventional path derived from the source and not from a sub-question id, each naming the sub-questions whose evidence it holds. Return that plan as plannedRawNotes. It sets how good the evidence must be, not what the answer is, and it allows a supported uncertain answer. Read \`library/_meta/librarian.md\` for the conventions. List in changedSubQuestions the ids that are new or whose retrieval must be redone${revising ? "" : " (all of them for a first draft)"}.

Question: ${st.question}

What the library already supports:
${st.context.summary}
Supported:
${list(st.context.supported)}
Gaps:
${list(st.context.gaps)}
${revising ? `\nRaw notes already written by this run, as source -> path (keep each exactly: a raw note is append-only and one per source, so a written note is never moved):\n${pairsText(st)}` : ""}
${findings.length > 0 ? `\nFindings to resolve:\n${list(findings)}` : ""}`,
    {
      agentType: "slopify:library-scribe",
      label: revising ? "revise spec" : "draft spec",
      phase: "Spec",
      schema: SPEC_SCHEMA,
    },
  );
}

function judgeSpec(st: Base, spec: Spec): Promise<Verdict | null> {
  return clerkVerdict(
    st,
    `${st.where}

Judge the research spec at ${spec.path}, revision ${spec.revision}, for research-spec readiness: the question's fit, the authorized scope, evidence standards that allow a supported uncertain answer, planned artifacts, convention fit (library/_meta/librarian.md), and verifiable acceptance. Judge that exact revision, including its planned raw notes (below): one note per canonical source and the conventional paths. Set specIssue.material to true only if the spec itself must change (its question, scope, evidence standards, or planned artifacts); minor notes are not material.

Question: ${st.question}

Planned raw notes:
${JSON.stringify(spec.plannedRawNotes, null, 2)}

Raw notes already written, as source -> path:
${pairsText(st)}
${FIXED_PATHS}`,
    { agentType: "slopify:library-clerk", label: "judge spec", phase: "Spec", schema: VERDICT_SCHEMA },
  );
}

// The spec gate's working state: the latest revision, and the findings and reason for the next one.
interface SpecDraft {
  spec: Spec | null;
  findings: readonly string[];
  why: string;
}

// One revision of the spec and the clerk's verdict on it: "pass", "spent" when the budget is spent,
// or "revise" to revise again.
async function specRound(st: Base, d: SpecDraft): Promise<"pass" | "spent" | "revise"> {
  const draft = await draftSpec(st, d.spec, d.why, d.findings);
  if (!draft) {
    st.specFailures += 1;
    st.attempts.push({ gate: "spec", approach: "library-scribe spec draft", failed: "the scribe did not return" });
    return st.specFailures >= MAX_FAILURES ? "spent" : "revise";
  }
  const spec = { ...draft, plannedRawNotes: draft.plannedRawNotes.map((n) => ({ ...n, path: toAbs(st, n.path) })) };
  d.spec = spec;
  const moved = movedNotes(st, spec.plannedRawNotes);
  if (moved.length > 0) {
    // Not judged: the file and the plan must agree, so the scribe revises again.
    st.specFailures += 1;
    d.findings = moved;
    d.why = "The revision moved raw notes that are already written; keep their paths.";
    st.attempts.push({ gate: "spec", approach: `spec revision ${spec.revision}`, failed: moved.join("; ") });
    log(`Spec revision ${spec.revision} moves written raw notes; sending it back to the scribe`);
    return st.specFailures >= MAX_FAILURES ? "spent" : "revise";
  }
  const verdict = await judgeSpec(st, spec);
  if (!verdict) return "spent";
  if (verdict.verdict === "pass") return "pass";
  st.specFailures += 1;
  d.findings = verdict.findings;
  st.attempts.push({
    gate: "spec",
    approach: `spec revision ${spec.revision}`,
    failed: `${verdict.verdict}: ${verdict.findings.join("; ")}`,
  });
  d.why = "A fresh library-clerk did not pass it; resolve its findings.";
  return st.specFailures >= MAX_FAILURES ? "spent" : "revise";
}

// Write or revise the spec, then have a fresh library-clerk judge that exact revision.
// A failed or unverified verdict, and each revision forced by a spec issue, count against the budget.
// Returns the passed spec, or null when the budget is spent.
async function passSpec(
  st: Base,
  current: Spec | null,
  reason: string,
  issues: readonly string[],
): Promise<Spec | null> {
  phase("Spec");
  const d: SpecDraft = { spec: current, findings: issues, why: reason };
  for (;;) {
    const round = await specRound(st, d);
    if (round === "pass") return d.spec;
    if (round === "spent") return null;
  }
}

// After a spec revision: the changed sub-questions, then any that still have no evidence.
function pendingAfterRevision(st: State): string[] {
  const pending = st.spec.changedSubQuestions.filter((id) => st.spec.subQuestions.some((s) => s.id === id));
  for (const s of st.spec.subQuestions)
    if (st.evidence[s.id] === undefined && !pending.includes(s.id)) pending.push(s.id);
  return pending;
}

// ---- Retrieve ----------------------------------------------------------------

function retrieveOne(st: State, s: SubQuestion): Promise<Research | null> {
  return agent(
    `${st.where}
${BOUNDS}

Investigate this one sub-question of the research spec at ${st.spec.path} (revision ${st.spec.revision}), through the source provider the library conventions name (library/_meta/librarian.md). Meet the spec's evidence standards. List in sources only the sources whose content your findings quote or rest on to answer the question; never the spec, the library conventions, or files you read only for orientation. If you rely on a note already in the library, give its path as url and the canonical source it records in origin. Set specIssue.material to true only if the spec itself must change (its question, scope, evidence standards, or planned artifacts); minor notes are not material.

Question: ${st.question}
Sub-question ${s.id}: ${s.question}

Already supported by the library:
${list(st.context.supported)}`,
    {
      agentType: "slopify:library-researcher",
      label: `retrieve ${s.id}`,
      phase: "Retrieve",
      schema: RESEARCH_SCHEMA,
    },
  );
}

function recordRetrieval(
  st: State,
  id: string,
  result: Research | null | undefined,
  issues: string[],
  retry: string[],
): void {
  if (result) {
    st.retrievalTries[id] = 0;
    st.evidence[id] = result;
    if (materialIssue(result.specIssue)) issues.push(`Sub-question ${id}: ${result.specIssue.change}`);
    else if (result.specIssue.change) log(`Sub-question ${id}: non-material spec note ignored`);
    return;
  }
  const tries = (st.retrievalTries[id] || 0) + 1;
  st.retrievalTries[id] = tries;
  if (tries < MAX_RETRIEVAL_TRIES) {
    retry.push(id);
    log(`Sub-question ${id}: no researcher result; retrieving it again`);
  } else {
    // No evidence: recorded as a retrieval limit, and no raw note is written for it.
    st.evidence[id] = {
      findings: [],
      sources: [],
      contradictions: [],
      limits: ["The researcher did not return."],
      specIssue: { material: false, change: "" },
    };
    log(`Sub-question ${id}: no researcher result after ${tries} attempts; recorded as a retrieval limit`);
  }
}

// A material spec change: the new revision must pass a fresh clerk before work continues.
async function reviseAfterRetrieval(st: State, issues: string[], retry: string[]): Promise<"again" | BlockedResult> {
  st.specFailures += 1;
  st.attempts.push({ gate: "spec", approach: "spec revision forced by retrieval", failed: issues.join("; ") });
  if (st.specFailures >= MAX_FAILURES)
    return blocked(st.attempts, "Spec", ["A spec that survives retrieval; see attempts."]);
  const revised = await passSpec(st, st.spec, "Researchers reported a material spec issue; revise it.", issues);
  if (!revised) {
    return blocked(st.attempts, "Spec", ["A spec a fresh library-clerk will pass; see the findings in attempts."]);
  }
  st.spec = revised;
  st.pending = pendingAfterRevision(st);
  for (const id of retry) if (!st.pending.includes(id)) st.pending.push(id);
  return "again";
}

// "again" sends the loop back to its start; undefined goes on to persist.
async function retrieve(st: State): Promise<"again" | BlockedResult | undefined> {
  phase("Retrieve");
  const toRun = st.spec.subQuestions.filter((s) => st.pending.includes(s.id));
  const results = await parallel(toRun.map((s) => () => retrieveOne(st, s)));
  const issues: string[] = [];
  const retry: string[] = [];
  for (const [i, s] of toRun.entries()) recordRetrieval(st, s.id, results[i], issues, retry);
  // New evidence for a sub-question has to be written again.
  for (const s of toRun)
    if (st.evidence[s.id] !== undefined && !retry.includes(s.id))
      st.writtenFor = st.writtenFor.filter((e) => e.sub !== s.id);
  st.pending = [];
  st.persisted = null;
  if (issues.length > 0) return reviseAfterRetrieval(st, issues, retry);
  if (retry.length > 0) {
    st.pending = retry;
    return "again";
  }
  return undefined;
}

// ---- Persist -----------------------------------------------------------------

// The sources a sub-question's evidence cites. Library paths are never sources: a cited raw note
// is an existing note to cite (its origin only counts a planned source as covered), and other
// library files are dropped. The spec is not a source either.
function citedSources(
  st: State,
  id: string,
  ev: Research,
): { usable: Cited[]; notes: { path: string; origin: string }[] } {
  const usable: Cited[] = [];
  const notes: { path: string; origin: string }[] = [];
  for (const x of ev.sources) {
    if (inLibrary(x.url)) {
      if (/(?:^|\/)library\/raw\//.test(normSource(x.url)))
        notes.push({ path: canon(st, x.url), origin: x.origin || "" });
      else log(`Sub-question ${id}: dropped library path ${x.url} as a source`);
    } else if (normSource(x.url) && !sameSource(st, st.spec.path, x.url)) usable.push(x);
  }
  if (usable.length === 0 && notes.length === 0 && ev.findings.length > 0) usable.push(...plannedSources(st, id));
  return { usable, notes };
}

// The planned sources of a sub-question, for findings that cite no usable source.
function plannedSources(st: State, id: string): Cited[] {
  const out: Cited[] = [];
  for (const n of st.spec.plannedRawNotes)
    if (n.source && n.subQuestions.includes(id)) out.push({ url: n.source, title: "" });
  return out;
}

// A short deterministic hash (base 36, multiplier 31) of the full source key.
function hashOf(text: string): string {
  let h = 0;
  // Each code point adds its first UTF-16 unit.
  for (const ch of text) h = (Math.imul(h, 31) + (ch.slice(0, 1).codePointAt(0) ?? 0)) >>> 0;
  return h.toString(36);
}

// <the most specific part of the source>-<hash of the whole key>: the last path segments relative
// to the project root (or of the URL), the tail of them kept, so distinct sources never share a
// path, in this run or across runs.
function slugOf(st: Base, key: string): string {
  const root = normSource(st.projectRoot);
  let part = root && key.startsWith(`${root}/`) ? key.slice(root.length + 1) : key;
  part = part.split("/").slice(-3).join("/");
  const hyphenated = part.replaceAll(/[^a-z0-9]+/g, "-").replace(/^-+/, "");
  const words = withoutTrailing(hyphenated, "-").slice(-48).replace(/^-+/, "");
  return `${words || "source"}-${hashOf(key)}`;
}

// Where this run's raw notes live, taken from the plan when it names one.
function rawDir(st: State): string {
  for (const n of st.spec.plannedRawNotes) {
    const dir = /^(.*\/library\/raw)\/[^/]+$/i.exec(normPath(n.path))?.[1];
    if (dir !== undefined) return dir;
  }
  return st.projectRoot ? `${withoutTrailing(normPath(st.projectRoot), "/")}/library/raw` : "library/raw";
}

// Every job gets its exclusive path in code: the source's written path, else its planned path,
// else <library>/raw/<date>-<slug of the source>.md, distinct from every other path in the batch.
function assignPaths(st: State, jobs: Job[]): void {
  const taken = new Set(
    [
      ...st.currentRaw,
      ...st.pendingWritten,
      ...st.sourcePaths.map((q) => q.path),
      ...st.spec.plannedRawNotes.map((n) => n.path),
    ].map((p) => normPath(p)),
  );
  for (const job of jobs) {
    const known = st.sourcePaths.find((q) => sameSource(st, q.source, job.source));
    const planned = st.spec.plannedRawNotes.find((n) => n.source && sameSource(st, n.source, job.source));
    const hit = known ?? planned;
    if (hit) {
      job.path = hit.path;
    } else {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(st.spec.date || "") ? `${st.spec.date}-` : "";
      const base = `${rawDir(st)}/${date}${slugOf(st, job.key)}`;
      let candidate = `${base}.md`;
      let n = 2;
      while (taken.has(normPath(candidate))) {
        candidate = `${base}-${n}.md`;
        n += 1;
      }
      job.path = candidate;
    }
    taken.add(normPath(job.path));
  }
}

// One writer per source. It receives the evidence of every sub-question that cites the source,
// whichever sub-questions the plan lists; coverage is per (source, sub-question).
function buildJobs(st: State, leads: string[]): Job[] {
  const jobs: Job[] = [];
  const origins: string[] = [];
  for (const s of st.spec.subQuestions) {
    const ev = st.evidence[s.id];
    if (!ev) continue;
    const { usable, notes } = citedSources(st, s.id, ev);
    for (const note of notes) {
      if (!st.pendingExisting.includes(note.path)) st.pendingExisting.push(note.path);
      if (note.origin) origins.push(note.origin);
    }
    if (ev.findings.length > 0 && usable.length === 0 && notes.length === 0)
      log(`Sub-question ${s.id}: findings cite no usable source; no raw note will hold them`);
    addJobs(st, jobs, s.id, usable);
  }
  assignPaths(st, jobs);
  addLeads(st, jobs, origins, leads);
  return jobs;
}

// Adds a sub-question to the job of each source it cites whose note does not hold its evidence yet.
function addJobs(st: State, jobs: Job[], id: string, usable: readonly Cited[]): void {
  for (const src of usable) {
    if (st.writtenFor.some((e) => e.sub === id && sameSource(st, e.source, src.url))) continue;
    let job = jobs.find((j) => sameSource(st, j.source, src.url));
    if (!job) {
      const planned = st.spec.plannedRawNotes.find((n) => n.source && sameSource(st, n.source, src.url));
      job = {
        key: normSource(canon(st, planned ? planned.source : src.url)),
        source: planned ? planned.source : src.url,
        title: src.title,
        path: "",
        subs: [],
      };
      jobs.push(job);
    }
    if (!job.subs.includes(id)) job.subs.push(id);
  }
}

// A planned source that no job, written note, or cited note's origin covers is an unretrieved lead.
function addLeads(st: State, jobs: readonly Job[], origins: readonly string[], leads: string[]): void {
  for (const n of st.spec.plannedRawNotes) {
    const covered =
      jobs.some((j) => sameSource(st, j.source, n.source)) ||
      st.writtenFor.some((e) => sameSource(st, e.source, n.source)) ||
      origins.some((o) => sameSource(st, o, n.source)) ||
      isWritten(st, n.path);
    if (n.source && !covered) {
      leads.push(
        `${n.source}: planned for ${n.path}, but no retrieved evidence cites it; record it as an unretrieved lead, not as evidence`,
      );
    }
  }
}

function jobPrompt(st: State, job: Job): string {
  const target = `Write the one raw note for the source ${job.source}${job.title ? ` (${job.title})` : ""} at ${job.path}. That path is yours alone; use it exactly, and if the note already exists, append a dated section instead of rewriting it. The one exception: if another raw note already holds this same canonical source, append to that note instead and return its path.`;
  const material = job.subs.map((id) => ({
    id,
    question: st.spec.subQuestions.find((s) => s.id === id)?.question,
    evidence: st.evidence[id],
  }));
  return `${st.where}
${BOUNDS}

Assignment: raw notes. ${target} Record only the findings that rest on that source; other sources have their own writers. The library keeps one raw note per canonical source, so before writing, search the raw notes' source fields for the canonical source. Write only that note, and leave the index, taxonomy, and log untouched; return their entries as deferred metadata. In produced, return the absolute path of the note you wrote or appended. If the evidence has nothing for this source, write nothing and return skipped true with the reason.

Research spec: ${st.spec.path} (revision ${st.spec.revision})

Evidence:
${JSON.stringify(material, null, 2)}`;
}

// Records each raw-note writer's result and returns the jobs whose writer returned no note path.
function recordRaw(st: State, todo: readonly Job[], raw: readonly (Raw | null)[]): Job[] {
  const failed: Job[] = [];
  for (const [i, job] of todo.entries()) {
    const r = raw[i];
    const paths = r ? onlyPaths(r.produced) : [];
    if (r && paths.length === 0 && r.skipped && r.reason.trim()) recordSkipped(st, job, r);
    else if (r && paths.length > 0) recordWritten(st, job, r, paths);
    else failed.push(job);
  }
  return failed;
}

// A deliberate no-op is not a failure; the source becomes an unretrieved lead.
function recordSkipped(st: State, job: Job, r: Raw): void {
  const lead = `${job.source || job.key}: no raw note written (${r.reason.trim()}); record it as an unretrieved lead, not as evidence`;
  if (!st.pendingLeads.includes(lead)) st.pendingLeads.push(lead);
  st.pendingDeferred.push(...r.deferredMetadata);
  for (const sub of job.subs) st.writtenFor.push({ source: job.source, sub });
}

function recordWritten(st: State, job: Job, r: Raw, paths: readonly string[]): void {
  const first = paths[0] ?? "";
  // A writer that returns another source's path judged the two to be one canonical source:
  // record this source against that path instead of failing the write.
  const own = normPath(first) === normPath(job.path);
  const holder =
    !own && st.sourcePaths.find((q) => normPath(q.path) === normPath(first) && !sameSource(st, q.source, job.source));
  if (holder)
    log(
      `Raw note ${first} holds both ${holder.source} and ${job.source}; the scribe judged them one canonical source, so they share it`,
    );
  for (const p of paths) if (!st.pendingWritten.includes(p)) st.pendingWritten.push(p);
  st.pendingDeferred.push(...r.deferredMetadata);
  if (st.sourcePaths.every((q) => !sameSource(st, q.source, job.source)))
    st.sourcePaths.push({ source: job.source, path: first });
  for (const sub of job.subs) st.writtenFor.push({ source: job.source, sub });
}

function integrate(st: State): Promise<Integration | null> {
  return agent(
    `${st.where}
${BOUNDS}

Assignment: integration. You are the only writer of the synthesis and shared metadata for this batch. All raw-note writes have finished. Integrate the research spec at ${st.spec.path} (revision ${st.spec.revision}) into the library: write the wiki synthesis that answers the question with each consequential claim cited to its raw-note evidence anchor, and complete the index, taxonomy, and log, including the deferred metadata below. Never overwrite raw notes with synthesis, and keep uncertainty, contradictions, and unretrieved leads visible. Report each raw note's disposition. In rawNotes, return the authoritative current list of this research's raw notes (absolute paths).

Question: ${st.question}

Raw notes written by this run:
${list(st.currentRaw)}

Raw notes written since the last integration:
${list(st.pendingWritten)}

Deferred metadata:
${list(st.pendingDeferred)}

Library raw notes the research cites (existing notes: cite them, do not rewrite them or re-append their evidence):
${list(st.pendingExisting)}

Planned sources with no retrieved evidence (keep each visible as an unretrieved lead in the library's format; cite nothing about its contents):
${list(st.pendingLeads)}

Retrieval limits and contradictions reported by researchers:
${JSON.stringify(
  st.spec.subQuestions
    .filter((s) => st.evidence[s.id])
    .map((s) => ({ id: s.id, contradictions: st.evidence[s.id]?.contradictions, limits: st.evidence[s.id]?.limits })),
  null,
  2,
)}`,
    { agentType: "slopify:library-scribe", label: "integrate", phase: "Persist", schema: INTEGRATION_SCHEMA },
  );
}

// Writes the raw notes, then has exactly one integrator integrate them. "again" sends the loop back to its start.
async function persist(st: State): Promise<"again" | BlockedResult | { integration: Integration }> {
  phase("Persist");
  const leads: string[] = [];
  let todo = buildJobs(st, leads);
  st.pendingLeads.push(...leads.filter((l) => !st.pendingLeads.includes(l)));
  while (todo.length > 0) {
    const raw = await parallel(
      todo.map(
        (job) => () =>
          agent(jobPrompt(st, job), {
            agentType: "slopify:library-scribe",
            label: `raw note ${job.path ? (job.path.split(/[\\/]/).at(-1) ?? "") : job.key.slice(0, 40)}`,
            phase: "Persist",
            schema: RAW_SCHEMA,
          }),
      ),
    );
    todo = recordRaw(st, todo, raw);
    if (todo.length === 0) {
      continue;
    }

    st.persistFailures += 1;
    st.attempts.push({
      gate: "persist",
      approach: `raw notes for ${todo.map((j) => j.key).join(", ")}`,
      failed: "the scribe returned no note path",
    });
    if (st.persistFailures >= MAX_FAILURES)
      return blocked(st.attempts, "Persist", ["A raw note for every planned source; see attempts."]);
    log(`Raw-note writers returned no path for ${todo.length} note(s); retrying them`);
  }
  for (const p of st.pendingWritten) if (!st.currentRaw.includes(p)) st.currentRaw.push(p);

  // Exactly one integrator, after every raw-note write has returned.
  const integrated = await integrate(st);
  if (!integrated) {
    st.persistFailures += 1;
    st.attempts.push({ gate: "persist", approach: "integration", failed: "the integrator did not return" });
    return st.persistFailures >= MAX_FAILURES
      ? blocked(st.attempts, "Persist", ["A completed integration; see attempts."])
      : "again";
  }
  st.persisted = integrated;
  adoptRawList(st, integrated);
  st.pendingWritten = [];
  st.pendingDeferred = [];
  st.pendingLeads = [];
  st.pendingExisting = [];
  return { integration: integrated };
}

// ---- Validate ----------------------------------------------------------------

function validatePrompt(st: State, persisted: Integration): string {
  return `${st.where}

Validate the persisted research: the changed paths, the draft answer, the raw evidence, the spec revision, and the affected links and metadata. Check that scope against the library conventions (library/_meta/librarian.md) and the cited sources, not the whole library. Set specIssue.material to true only if the spec itself must change (its question, scope, evidence standards, or planned artifacts); minor notes are not material.

Question: ${st.question}
Spec: ${st.spec.path} (revision ${st.spec.revision})
Raw notes:
${list(st.currentRaw)}
Written raw notes, as source -> path. ${FIXED_PATHS}
${pairsText(st)}
Synthesis:
${list(onlyPaths(persisted.synthesis))}
Metadata:
${list(onlyPaths(persisted.metadata))}

Draft answer:
${persisted.answer}`;
}

function done(st: State, persisted: Integration, verdict: Verdict): DoneResult {
  const artifacts = {
    spec: st.spec.path,
    rawNotes: st.currentRaw,
    synthesis: onlyPaths(persisted.synthesis),
    metadata: onlyPaths(persisted.metadata),
  };
  return {
    done: true,
    answer: persisted.answer,
    artifacts,
    verdict: { verdict: verdict.verdict, evidence: verdict.evidence },
    report: [
      `Research done; a fresh library-clerk passed it (${verdict.evidence}).`,
      `Spec: ${artifacts.spec}`,
      `Raw notes: ${artifacts.rawNotes.join(", ") || "none"}`,
      `Synthesis: ${artifacts.synthesis.join(", ") || "none"}`,
      `Index and log: ${artifacts.metadata.join(", ") || "none"}`,
    ].join("\n"),
    gaps: persisted.gaps,
    contradictions: persisted.contradictions,
    limits: persisted.limits,
  };
}

function repair(st: State, persisted: Integration, findings: readonly string[]): Promise<Integration | null> {
  return agent(
    `${st.where}
${BOUNDS}

Assignment: integration repair. You are the only writer. A fresh library-clerk did not pass the persisted research. Repair exactly these findings in the files they concern, without researching new questions, and keep uncertainty and contradictions visible. Then return the same report as the integration; rawNotes is the authoritative current list of this research's raw notes after your repair, without any note you merged or deleted.

Spec: ${st.spec.path} (revision ${st.spec.revision})
Question: ${st.question}

Findings:
${list(findings)}

Current artifacts:
Raw notes:
${list(st.currentRaw)}
Synthesis:
${list(onlyPaths(persisted.synthesis))}
Metadata:
${list(onlyPaths(persisted.metadata))}`,
    { agentType: "slopify:library-scribe", label: "repair", phase: "Persist", schema: INTEGRATION_SCHEMA },
  );
}

// A fresh clerk, after integration. Returns the final result, or undefined to go round again.
async function validate(st: State, persisted: Integration): Promise<DoneResult | BlockedResult | undefined> {
  phase("Validate");
  const verdict = await clerkVerdict(st, validatePrompt(st, persisted), {
    agentType: "slopify:library-clerk",
    label: "validate research",
    phase: "Validate",
    schema: VERDICT_SCHEMA,
  });

  if (!verdict)
    return blocked(st.attempts, "Persist", [
      "A verdict from a fresh library-clerk on the persisted research; see attempts.",
    ]);
  if (verdict.verdict === "pass") return done(st, persisted, verdict);

  st.persistFailures += 1;
  const findings = verdict.findings;
  st.attempts.push({
    gate: "persist",
    approach: `integration validated as ${verdict.verdict}`,
    failed: findings.join("; "),
  });
  if (st.persistFailures >= MAX_FAILURES) {
    return blocked(st.attempts, "Persist", [
      "Persisted research a fresh library-clerk will pass; see the findings in attempts.",
    ]);
  }

  if (materialIssue(verdict.specIssue)) {
    // The spec itself must change: revise, re-pass the gate, then redo the affected work.
    st.specFailures += 1;
    st.attempts.push({
      gate: "spec",
      approach: "spec revision forced by validation",
      failed: verdict.specIssue.change,
    });
    if (st.specFailures >= MAX_FAILURES)
      return blocked(st.attempts, "Spec", ["A spec that survives validation; see attempts."]);
    const revised = await passSpec(st, st.spec, "The final validation reported a material spec issue; revise it.", [
      verdict.specIssue.change,
    ]);
    if (!revised) {
      return blocked(st.attempts, "Spec", ["A spec a fresh library-clerk will pass; see the findings in attempts."]);
    }
    st.spec = revised;
    st.pending = pendingAfterRevision(st);
    st.persisted = null;
    return undefined;
  }

  // Repair: a new scribe, the only writer, then a new clerk on the next pass.
  phase("Persist");
  const repaired = await repair(st, persisted, findings);
  if (repaired) {
    st.persisted = repaired;
    adoptRawList(st, repaired);
  } else st.attempts.push({ gate: "persist", approach: "repair", failed: "the scribe did not return" });
  return undefined;
}

// ---- Retrieve, persist, validate ------------------------------------------

// The integration to validate, wrapped so a key the scribe adds to it can never read as a blocked result.
async function integrationOf(st: State): Promise<"again" | BlockedResult | { integration: Integration }> {
  return st.persisted ? { integration: st.persisted } : persist(st);
}

async function researchLoop(st: State): Promise<DoneResult | BlockedResult> {
  for (;;) {
    if (st.pending.length > 0) {
      const next = await retrieve(st);
      if (next === "again") continue;
      if (next) return next;
    }
    const persisted = await integrationOf(st);
    if (persisted === "again") continue;
    if (!("integration" in persisted)) return persisted;
    const result = await validate(st, persisted.integration);
    if (result) return result;
  }
}

export default async function run(): Promise<NotStarted | BlockedResult | DoneResult> {
  const input = inputOf(args, "question");
  const question = textOf(input["question"]);
  if (!question) {
    return { started: false, next: "Ask the user for the research question, then invoke again." };
  }
  const projectRoot = textOf(input["projectRoot"]);

  const where = whereOf(projectRoot);

  phase("Context");
  const context = await readContext(where, question);
  if (!context) {
    return blocked([], "Context", [
      "The library-reader did not return; check that the project has a library (run /slopify:bootstrap) and invoke again.",
    ]);
  }

  const st: Base = {
    question,
    projectRoot,
    where,
    context,
    attempts: [],
    specFailures: 0,
    persistFailures: 0,
    persisted: null,
    pendingWritten: [],
    pendingDeferred: [],
    writtenFor: [],
    sourcePaths: [],
    pendingExisting: [],
    pendingLeads: [],
    retrievalTries: {},
    currentRaw: [],
  };

  const spec = await passSpec(st, null, "", []);
  return spec
    ? researchLoop({ ...st, spec, evidence: {}, pending: spec.subQuestions.map((s) => s.id) })
    : blocked(st.attempts, "Spec", ["A spec a fresh library-clerk will pass; see the findings in attempts."]);
}
