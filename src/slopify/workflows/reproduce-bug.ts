import {
  scout,
  fact,
  shaped,
  slugged,
  parseSpec,
  decisionsOf,
  answerOf,
  settledText,
  settleDecisions,
  type Answers,
  type Decision,
  type LensResult,
  type Need,
  type ScoutResult,
  type Settled,
} from "../lib/family.ts";
import {
  MAX_FAILURES,
  halt,
  done,
  skip,
  lensOn,
  problems,
  answeredBlockers,
  type Attempt,
  type Halted,
  type RunLog,
} from "../lib/gates.ts";
import { answersOf, startInput, textOf, whereOf, type NotStarted } from "../lib/input.ts";
import { measuringCoderSchema, pusherSchema, writerSchema } from "../lib/schemas.ts";
import { show, slugify, withoutTrailing } from "../lib/text.ts";

export const meta = {
  name: "reproduce-bug",
  description:
    "Reproduce a reported bug in an ignored reproduction directory without changing production code, then file a Bug card with evidence, steps to reproduce, expected outcome, and observed outcome, each validated by a fresh lens",
  whenToUse:
    "Run only when the user invokes /slopify:reproduce-bug or asks for the slopify reproduce-bug workflow. Args: {report, projectRoot?, answers?}, or the report as a plain string; projectRoot defaults to the session project directory, and answers maps a need id to its answer when rerunning.",
  phases: [
    { title: "Locate", detail: "scout-card and scout-related-cards, then scout-checkpoint" },
    { title: "Gather", detail: "scout-code, scout-tests, and scout-history" },
    { title: "Reproduce", detail: "coder builds and runs a reproduction in the reproduction directory only" },
    { title: "Validate reproduction", detail: "lens-repro runs the reproduction at least three times" },
    { title: "Report", detail: "writer drafts the issue beside the reproduction directory, outside it" },
    { title: "Validate report", detail: "lens-bug-report judges the draft revision against the reproduction" },
    { title: "File", detail: "pusher files one Bug card through the board declaration" },
  ],
} as const satisfies WorkflowMeta;

const NAME = "reproduce-bug";
const READ_ONLY = "Report only: change nothing, and perform no board or forge operation.";
const PRODUCER_BOUNDS = "Do not commit, push, or perform any board or forge operation; another agent does that.";
// How a reproduction directory's revision is computed (the coder's own form).
const REPRO_REVISION = "find <dir> -type f -print0 | sort -z | xargs -0 git hash-object | git hash-object --stdin";

const WRITER_SCHEMA = writerSchema({
  produced: "Absolute paths written",
  revision: "git hash-object of the main artifact",
  openDecisions: "Questions only the user can answer, such as an expected outcome the report leaves unstated",
  storyBlockers: "What prevents the artifact from being written",
  tasks: "Always an empty array here",
  docs: "Always an empty array here",
});

const CODER_SCHEMA = measuringCoderSchema({
  changed: "Absolute paths written",
  tests: "Reproduction scripts or tests written",
  ran: "Each command run, as command → result",
  revision: "The revision left, in the form the brief names",
  open: "Blockers or unworkable approaches",
  specMismatch: "Empty when none",
  steps: "The steps that reproduce the failure, in order",
  observed: "What the reproduction observed",
  measurements: "Empty here",
});

const PUSHER_SCHEMA = pusherSchema({
  reference: "A card id, commit sha, PR URL or path, or worktree path",
  unmet: "Each operation that could not be performed as declared, and why",
});

type WriterResult = Infer<typeof WRITER_SCHEMA>;
type CoderResult = Infer<typeof CODER_SCHEMA>;

interface Checkpoint {
  bugCard?: string;
  reproduction?: string;
  issue?: string;
}
interface Verdict {
  lens: string;
  verdict: LensResult["verdict"];
  evaluated: string;
  findings: LensResult["findings"];
  limits: string;
}

type Stopped = Halted<Checkpoint>;
interface Done {
  status: "done";
  workflow: string;
  skipped: string[];
  attempts: Attempt[];
  card: string;
  issue: string | null;
  reproduction: string | null;
  verdicts: Verdict[];
  filed: boolean;
}

// The state one run carries between its steps.
interface Ctx extends RunLog<Checkpoint> {
  report: string;
  answers: Answers;
  where: string;
  verdicts: Verdict[];
  slug: string;
  reproRel: string;
  reproDir: string;
  issueRel: string;
  issuePath: string;
  evidenceText: string;
  reproRev: string;
  reproSteps: string[];
  reproObserved: string;
  lastFindings: string[];
  issueRev: string;
  reportFailures: number;
  settledBlockers: Settled[];
}

// A card identifier or URL is one token; prose such as "no card found" is not an identifier.
const idOf = (v: string): string => shaped("id", v);

function stop(ctx: Ctx, step: string, needs: readonly Need[]): Stopped {
  return halt(NAME, ctx, step, needs);
}

// The answer to a need this run raised, for the step that raised it; '' when none was given.
function answerFor(ctx: Ctx, id: string): string {
  return Object.hasOwn(ctx.answers, id) && String(ctx.answers[id]).trim() !== "" ? String(ctx.answers[id]).trim() : "";
}

function record(ctx: Ctx, lensName: string, v: LensResult): void {
  ctx.verdicts.push({
    lens: lensName,
    verdict: v.verdict,
    evaluated: v.evaluated,
    findings: v.findings,
    limits: v.limits,
  });
}

// ---- Locate ----------------------------------------------------------------

async function locateCards(ctx: Ctx): Promise<(ScoutResult | null)[]> {
  phase("Locate");
  return parallel([
    () =>
      scout(
        "scout-card",
        `${ctx.where}
${READ_ONLY}

Read the one card this bug report names by identifier or URL, if any. If it names none, or the project has no board, report that. Return the card's identifier as the evidence item card-id (omit the item when there is no card). The story revision is not needed for this run.

Report: ${ctx.report}`,
        { label: "read card", phase: "Locate" },
      ),
    () =>
      scout(
        "scout-related-cards",
        `${ctx.where}
${READ_ONLY}

Search the board for cards that duplicate, overlap, or conflict with this bug report. If an existing Bug card reports this same bug, return it as the evidence item bug-card, with its identifier as the excerpt; return that item only for a Bug card about this same failure. If the project has no board, report that.

Report: ${ctx.report}`,
        { label: "related cards", phase: "Locate" },
      ),
  ]);
}

async function readCheckpoint(ctx: Ctx, relatedR: ScoutResult | null | undefined): Promise<ScoutResult | null> {
  let cp: ScoutResult | null = null;
  for (let i = 1; i <= MAX_FAILURES && !cp; i++) {
    cp = await scout(
      "scout-checkpoint",
      `${ctx.where}
${READ_ONLY}

Report where a reproduce-bug run stands from its durable checkpoints. The run's reproduction directory is ${ctx.reproDir} (under the project's ignored .tmp/ folder). Return one evidence item per key that exists, with source set to the key and excerpt set to its value; omit a key that does not exist.

Keys:
- repro-dir: present only when the directory holds a reproduction: a runnable script or test, and the notes file recording its steps and observed output. Its value is the directory's absolute path, then "@", then its revision, computed as: ${REPRO_REVISION}
- bug-card: the identifier of an existing Bug card that reports this same bug, read through the board declaration; omit when there is none. The related-cards search found: ${fact(relatedR, "bug-card") || "none"}

Report: ${ctx.report}`,
      { label: `checkpoint${i > 1 ? ` (attempt ${i})` : ""}`, phase: "Locate" },
    );
    if (!cp) ctx.attempts.push({ gate: "locate", approach: "scout-checkpoint", failed: "the scout did not return" });
  }
  return cp;
}

// ---- Gather ----------------------------------------------------------------

async function gather(ctx: Ctx, cardR: ScoutResult | null | undefined): Promise<void> {
  phase("Gather");
  const [codeR, testsR, historyR] = await parallel([
    () =>
      scout(
        "scout-code",
        `${ctx.where}
${READ_ONLY}

Find the code locations and call paths relevant to this bug report.

Report: ${ctx.report}`,
        { label: "code", phase: "Gather" },
      ),
    () =>
      scout(
        "scout-tests",
        `${ctx.where}
${READ_ONLY}

Find the existing tests that cover the area this bug report concerns, and how to run them.

Report: ${ctx.report}`,
        { label: "tests", phase: "Gather" },
      ),
    () =>
      scout(
        "scout-history",
        `${ctx.where}
${READ_ONLY}

Find from git history and blame when and why behavior in the area this bug report concerns changed.

Report: ${ctx.report}`,
        { label: "history", phase: "Gather" },
      ),
  ]);
  ctx.evidenceText = [show("Card", cardR), show("Code", codeR), show("Tests", testsR), show("History", historyR)].join(
    "\n\n",
  );
  done(ctx, "gather");
}

// ---- Reproduce and validate the reproduction -------------------------------

function reproOk(c: CoderResult): boolean {
  return textOf(c.revision) !== "" && c.steps.length > 0 && textOf(c.observed) !== "";
}

async function buildRepro(ctx: Ctx, why: string, answer: string): Promise<CoderResult | null> {
  return agent(
    `${ctx.where}
${PRODUCER_BOUNDS}

${why}
${answer ? `\nThe user's answer to "More detail to reproduce the report", which an earlier attempt needed: ${answer}\n` : ""}
Your only writable path is the reproduction directory ${ctx.reproDir} (create it if needed): change no production code, no existing test, and nothing outside it. Write and run a reproduction script or test there that shows the reported failure. Record its steps and its observed output in a notes file in that directory, so a later run can read them. Return in steps the steps that reproduce the failure, in observed what the reproduction showed, and in revision the directory's digest, computed as: ${REPRO_REVISION} (with <dir> the reproduction directory). Return measurements as an empty array. If the failure does not reproduce, say so in open and leave steps empty.

Report: ${ctx.report}

Evidence:
${ctx.evidenceText}`,
    {
      agentType: "slopify:coder",
      label: ctx.lastFindings.length > 0 ? "revise reproduction" : "reproduce",
      phase: "Reproduce",
      schema: CODER_SCHEMA,
    },
  );
}

function adopt(ctx: Ctx, c: CoderResult): void {
  ctx.reproRev = textOf(c.revision);
  ctx.reproSteps = c.steps;
  ctx.reproObserved = c.observed;
}

async function reproduce(ctx: Ctx): Promise<Stopped | null> {
  phase("Reproduce");
  let reproFailures = 0;
  for (;;) {
    const c = await buildRepro(ctx, "Reproduce the reported bug.", answerFor(ctx, "reproduce-1"));
    if (c && reproOk(c)) {
      adopt(ctx, c);
      ctx.checkpoint.reproduction = ctx.reproDir;
      return null;
    }
    reproFailures += 1;
    ctx.attempts.push({
      gate: "reproduce",
      approach: "coder reproduction",
      failed: c
        ? `no reproduction: ${c.open.join("; ") || "steps or observed output missing"}`
        : "the coder did not return",
    });
    if (reproFailures >= MAX_FAILURES) {
      return stop(ctx, "reproduce", [
        {
          id: "reproduce-1",
          kind: "input",
          what: "More detail to reproduce the report",
          evidence: "no reproduction showed the reported failure in three attempts",
        },
      ]);
    }
  }
}

function reproNeedsDetail(ctx: Ctx, bad: readonly string[]): Stopped {
  return stop(ctx, "validate-repro", [
    {
      id: "validate-repro-1",
      kind: "input",
      what: "More detail to reproduce the report",
      evidence: bad.join("\n"),
    },
  ]);
}

// Has the coder fix the reproduction a lens did not pass; counts each failed dispatch against the shared gate.
async function reviseRepro(ctx: Ctx, bad: readonly string[], gate: { failures: number }): Promise<Stopped | null> {
  for (;;) {
    const c = await buildRepro(
      ctx,
      `A fresh lens did not pass the reproduction at revision ${ctx.reproRev}. Fix the reproduction in the directory so it reliably shows the reported failure; resolve these findings:\n${bad.join("\n\n")}`,
      answerFor(ctx, "validate-repro-1"),
    );
    if (c && reproOk(c)) {
      adopt(ctx, c);
      return null;
    }
    gate.failures += 1;
    ctx.attempts.push({
      gate: "validate-repro",
      approach: "coder reproduction revision",
      failed: c ? "no reproduction: steps or observed output missing" : "the coder did not return",
    });
    if (gate.failures >= MAX_FAILURES) return reproNeedsDetail(ctx, bad);
  }
}

async function validateRepro(ctx: Ctx): Promise<Stopped | null> {
  phase("Validate reproduction");
  const gate = { failures: 0 };
  for (;;) {
    const context = answerFor(ctx, "validate-repro-1");
    const reproVerdict = await lensOn(
      ctx,
      "lens-repro",
      `${ctx.where}

Judge the reproduction in ${ctx.reproDir}, revision ${ctx.reproRev} (${REPRO_REVISION}). Run it at least three times. The report it must show: ${ctx.report}

${ctx.reproSteps.length > 0 ? `The steps to run: ${ctx.reproSteps.join(" | ")}` : "The directory holds the steps in its notes file."}${context ? `\n\nContext the user gave after an earlier attempt: ${context}` : ""}`,
      ctx.reproRev,
      { label: `repro (revision ${ctx.reproRev.slice(0, 7)})`, phase: "Validate reproduction" },
    );
    if (!reproVerdict) {
      return stop(ctx, "validate-repro", [
        {
          id: "validate-repro-2",
          kind: "validation",
          what: `A verdict on reproduction revision ${ctx.reproRev} from lens-repro`,
          evidence: "three dispatches returned no verdict or a verdict on another revision",
        },
      ]);
    }
    const bad = problems("lens-repro", reproVerdict);
    if (bad.length === 0) {
      record(ctx, "lens-repro", reproVerdict);
      return null;
    }
    gate.failures += 1;
    ctx.attempts.push({
      gate: "validate-repro",
      approach: `reproduction revision ${ctx.reproRev}`,
      failed: bad.join("; "),
    });
    if (gate.failures >= MAX_FAILURES) return reproNeedsDetail(ctx, bad);
    ctx.lastFindings = bad;
    phase("Reproduce");
    const early = await reviseRepro(ctx, bad, gate);
    if (early) return early;
    phase("Validate reproduction");
  }
}

// ---- Report and validate the report ----------------------------------------

function draftOk(ctx: Ctx, w: WriterResult): boolean {
  return w.produced.length > 0 && w.produced.every((p) => p.endsWith(ctx.issueRel)) && textOf(w.revision) !== "";
}

function reportPrompt(ctx: Ctx, why: string, settled: readonly Settled[]): string {
  return `Address files by absolute path.
${PRODUCER_BOUNDS}

${why} The issue is at ${ctx.issuePath}; write only that file. Use the card shape the project's board declaration gives for a bug: evidence, steps to reproduce, expected outcome, and observed outcome, each consistent with the reproduction in ${ctx.reproDir}, which you may read; refer to the reproduction by its directory and steps, and pin no digest or revision of it in the issue. Decide anything that does not change what the bug is (formats, wording, references) yourself, and record it in the issue as a labelled assumption (a line starting "Assumption:"). The expected outcome may rest on the report and the code's evident contract (a function's name, docs, and tests); when it does, say so in the issue. Put a question in openDecisions only when the expected behavior is genuinely ambiguous. Return in revision the git hash-object digest of the issue, in produced its absolute path. Return tasks and docs as empty arrays.

Report: ${ctx.report}
Reproduction steps: ${ctx.reproSteps.length > 0 ? ctx.reproSteps.join(" | ") : "see the notes file in the reproduction directory"}
Reproduction observed: ${ctx.reproObserved || "see the notes file in the reproduction directory"}

Evidence:
${ctx.evidenceText}${settledText(settled)}`;
}

// What the writer's questions and blockers leave for the user; null when the run can go on.
function writerStop(ctx: Ctx, w: WriterResult | null, settledOpen: readonly Decision[]): Stopped | null {
  const blockers = decisionsOf("issue-blocker", w ? w.storyBlockers : []);
  // settleDecisions reports no decisions alongside blockers, so a blocking writer's questions are read here.
  const open =
    blockers.length > 0
      ? decisionsOf("issue", w?.openDecisions).filter((d) => !answerOf(ctx.answers, d.id))
      : settledOpen;
  const unanswered = blockers.filter((d) => !answerOf(ctx.answers, d.id));
  if (open.length === 0 && unanswered.length === 0 && blockers.length > 0 && !(w && draftOk(ctx, w))) {
    return stop(
      ctx,
      "report",
      blockers.map((d) => ({
        id: d.id,
        kind: "input",
        what: d.question,
        evidence: `raised again after the writer was given the answer "${answerOf(ctx.answers, d.id)}"; give an answer that resolves it`,
      })),
    );
  }
  if (open.length === 0 && unanswered.length === 0) return null;
  // Reported before the draft check: a writer that blocks writes no draft, and retrying would hide why.
  if (w && draftOk(ctx, w)) ctx.checkpoint.issue = ctx.issuePath;
  return stop(ctx, "report", [
    ...open.map((d): Need => ({
      id: d.id,
      kind: "decision",
      what: d.question,
      evidence: "reported by the writer while drafting the issue",
    })),
    ...unanswered.map((d): Need => ({
      id: d.id,
      kind: "input",
      what: d.question,
      evidence: "reported by the writer while drafting the issue",
    })),
  ]);
}

async function writeIssue(ctx: Ctx, why: string, label: string): Promise<Stopped | null> {
  for (;;) {
    const { res: w, open: settledOpen } = await settleDecisions("issue", ctx.answers, (settled) =>
      agent(reportPrompt(ctx, why, [...settled, ...ctx.settledBlockers]), {
        agentType: "slopify:writer",
        label,
        phase: "Report",
        schema: WRITER_SCHEMA,
      }),
    );
    const early = writerStop(ctx, w, settledOpen);
    if (early) return early;
    if (w && draftOk(ctx, w)) {
      ctx.issueRev = textOf(w.revision);
      ctx.checkpoint.issue = ctx.issuePath;
      return null;
    }
    ctx.reportFailures += 1;
    ctx.attempts.push({
      gate: "report",
      approach: "writer bug report",
      failed: w ? "the writer wrote outside the issue path or returned no revision" : "the writer did not return",
    });
    if (ctx.reportFailures >= MAX_FAILURES) {
      return stop(ctx, "report", [
        {
          id: "report-1",
          kind: "validation",
          what: `A bug report draft written at ${ctx.issuePath} with a revision`,
          evidence: "the writer did not produce one in three dispatches",
        },
      ]);
    }
  }
}

async function validateReport(ctx: Ctx): Promise<Stopped | null> {
  phase("Validate report");
  let validateReportFailures = 0;
  for (;;) {
    const reportVerdict = await lensOn(
      ctx,
      "lens-bug-report",
      `${ctx.where}

Judge the bug report draft at ${ctx.issuePath}, revision ${ctx.issueRev}, against the reproduction in ${ctx.reproDir}, which lens-repro already validated: do not recompute its digest or re-judge the reproduction itself. Name the draft revision as evaluated.

Original report: ${ctx.report}`,
      ctx.issueRev,
      { label: `bug-report (revision ${ctx.issueRev.slice(0, 7)})`, phase: "Validate report" },
    );
    if (!reportVerdict) {
      return stop(ctx, "validate-report", [
        {
          id: "validate-report-2",
          kind: "validation",
          what: `A verdict on bug report revision ${ctx.issueRev} from lens-bug-report`,
          evidence: "three dispatches returned no verdict or a verdict on another revision",
        },
      ]);
    }
    const bad = problems("lens-bug-report", reportVerdict);
    if (bad.length === 0) {
      record(ctx, "lens-bug-report", reportVerdict);
      return null;
    }
    validateReportFailures += 1;
    ctx.attempts.push({ gate: "validate-report", approach: `issue revision ${ctx.issueRev}`, failed: bad.join("; ") });
    if (validateReportFailures >= MAX_FAILURES) {
      return stop(ctx, "validate-report", [
        {
          id: "validate-report-1",
          kind: "validation",
          what: "A bug report draft that lens-bug-report passes",
          evidence: bad.join("\n"),
        },
      ]);
    }
    phase("Report");
    const early = await writeIssue(
      ctx,
      `Revise the bug report issue at revision ${ctx.issueRev} to resolve the findings below.\n\nFindings:\n${bad.join("\n\n")}\n\n`,
      "revise issue",
    );
    if (early) return early;
    phase("Validate report");
  }
}

// ---- File ------------------------------------------------------------------

async function fileCard(ctx: Ctx): Promise<Stopped | string> {
  phase("File");
  let pusherFailures = 0;
  for (;;) {
    const p = await agent(
      `${ctx.where}

Authorization: the user invoked the reproduce-bug workflow, which authorizes exactly this: file one Bug card from the issue below through the project's board declaration (docs/BOARD.md), at the initial status the declaration gives for a new card. Perform no other operation: no commit, branch, worktree, push, pull request, review trigger, merge, or message, and no change to any other card. Work exactly as the board declaration binds it; report an operation that is not bound, or a project with no board, in unmet, and improvise nothing.

File the issue at ${ctx.issuePath}, revision ${ctx.issueRev}, as a Bug card, with the issue's text as the card body unchanged, then one trailing line, <!-- reproduce-bug ${ctx.slug} -->, which is not part of the issue and lets a retry find this card. Before creating, search the board for a Bug card whose body holds that line; if one exists, it is this report's card: return it as the card operation and create nothing. Return the card operation first in operations, with the card id as its reference. When there is no board, perform nothing and return the draft path in unmet.`,
      {
        agentType: "slopify:pusher",
        label: pusherFailures ? `file bug card (attempt ${pusherFailures + 1})` : "file bug card",
        phase: "File",
        schema: PUSHER_SCHEMA,
      },
    );
    if (p && p.unmet.length > 0) {
      ctx.attempts.push({ gate: "file", approach: "pusher bug filing", failed: p.unmet.join("; ") });
      return stop(ctx, "file", [
        {
          id: "file-1",
          kind: "prerequisite",
          what: "A board declaration that binds creating a Bug card",
          evidence: p.unmet.join("; "),
        },
      ]);
    }
    if (p?.done && p.operations.length > 0) {
      const op = p.operations.find((o) => o.reference) ?? p.operations[0];
      const card = op?.reference || "filed";
      ctx.checkpoint.bugCard = card;
      return card;
    }
    pusherFailures += 1;
    ctx.attempts.push({
      gate: "file",
      approach: "pusher bug filing",
      failed: p ? "the pusher reported the filing as not done" : "the pusher did not return",
    });
    if (pusherFailures >= MAX_FAILURES) {
      return stop(ctx, "file", [
        {
          id: "file-1",
          kind: "prerequisite",
          what: "The Bug card filed through the board declaration",
          evidence: "the pusher did not complete it in three dispatches",
        },
      ]);
    }
  }
}

function newCtx(report: string, projectRoot: string, answers: Answers): Ctx {
  return {
    report,
    answers,
    where: whereOf(projectRoot),
    completed: [],
    skipped: [],
    attempts: [],
    checkpoint: {},
    verdicts: [],
    slug: "",
    reproRel: "",
    reproDir: "",
    issueRel: "",
    issuePath: "",
    evidenceText: "",
    reproRev: "",
    reproSteps: [],
    reproObserved: "",
    lastFindings: [],
    issueRev: "",
    reportFailures: 0,
    settledBlockers: [],
  };
}

function placeRepro(ctx: Ctx, projectRoot: string, cardR: ScoutResult | null | undefined): void {
  const cardId = idOf(fact(cardR, "card-id"));
  ctx.slug = slugify(cardId) || slugged(ctx.report, "report");
  ctx.reproRel = `.tmp/repro/${ctx.slug}`;
  ctx.reproDir = projectRoot ? `${projectRoot}/${ctx.reproRel}` : ctx.reproRel;
  // The draft lives beside the reproduction directory, never in it, so it can't change the reproduction's digest.
  ctx.issueRel = `.tmp/repro/${ctx.slug}.issue.md`;
  ctx.issuePath = projectRoot ? `${projectRoot}/${ctx.issueRel}` : ctx.issueRel;
}

// The reproduction and the Bug card the checkpoint and the related-cards search report.
function standing(
  ctx: Ctx,
  cp: ScoutResult,
  relatedR: ScoutResult | null | undefined,
): { bugCard: string; heldRev: string | null } {
  const bugCard = idOf(fact(cp, "bug-card")) || idOf(fact(relatedR, "bug-card"));
  // A reproduction is held only when the checkpoint reports "<dir>@<digest>" for this run's directory;
  // a missing-directory note, an empty value, or any other prose means there is none.
  const reproMatch = parseSpec(fact(cp, "repro-dir"));
  const reproHeld = !!reproMatch && withoutTrailing(reproMatch.path, "/").endsWith(ctx.reproRel);
  if (bugCard) ctx.checkpoint.bugCard = bugCard;
  if (reproHeld) ctx.checkpoint.reproduction = ctx.reproDir;
  return { bugCard, heldRev: reproHeld ? reproMatch.hash : null };
}

// Gather, reproduce, report, and file, once no Bug card reports this bug yet.
async function reproduceAndFile(
  ctx: Ctx,
  cardR: ScoutResult | null | undefined,
  heldRev: string | null,
): Promise<Stopped | Done> {
  await gather(ctx, cardR);

  ctx.reproRev = heldRev ?? "";
  if (heldRev === null) {
    const early = await reproduce(ctx);
    if (early) return early;
    done(ctx, "reproduce");
  } else skip(ctx, "reproduce");

  const reproStop = await validateRepro(ctx);
  if (reproStop) return reproStop;
  done(ctx, "validate-repro");

  phase("Report");
  ctx.settledBlockers = answeredBlockers("issue-blocker", ctx.answers);
  const draftStop = await writeIssue(
    ctx,
    `Draft the bug report issue for this reported bug. If a draft already exists at the issue path, read it and revise it.`,
    "draft issue",
  );
  if (draftStop) return draftStop;
  done(ctx, "report");

  const reportStop = await validateReport(ctx);
  if (reportStop) return reportStop;
  done(ctx, "validate-report");

  const card = await fileCard(ctx);
  if (typeof card !== "string") return card;
  done(ctx, "file");

  return {
    status: "done",
    workflow: NAME,
    skipped: ctx.skipped,
    attempts: ctx.attempts,
    card,
    issue: ctx.issuePath,
    reproduction: ctx.reproDir,
    verdicts: ctx.verdicts,
    filed: true,
  };
}

export default async function run(): Promise<NotStarted | Stopped | Done> {
  const started = startInput(
    args,
    "report",
    "Ask the user for the bug report: what fails, and what was expected instead. Then invoke again.",
  );
  if ("status" in started) return started;
  const projectRoot = withoutTrailing(textOf(started.input["projectRoot"]), "/");

  const ctx = newCtx(started.subject, projectRoot, answersOf(started.input["answers"]));
  const [cardR, relatedR] = await locateCards(ctx);
  placeRepro(ctx, projectRoot, cardR);

  const cp = await readCheckpoint(ctx, relatedR);
  if (!cp) {
    return stop(ctx, "locate", [
      {
        id: "locate-1",
        kind: "prerequisite",
        what: "A scout-checkpoint report of the reproduction directory and any existing Bug card",
        evidence: "scout-checkpoint did not return in three dispatches",
      },
    ]);
  }
  done(ctx, "locate");

  const { bugCard, heldRev } = standing(ctx, cp, relatedR);
  if (bugCard) {
    // A Bug card already reports this bug: nothing to reproduce or file.
    for (const s of ["gather", "reproduce", "validate-repro", "report", "validate-report", "file"]) skip(ctx, s);
    return {
      status: "done",
      workflow: NAME,
      skipped: ctx.skipped,
      attempts: ctx.attempts,
      card: bugCard,
      issue: null,
      reproduction: heldRev === null ? null : ctx.reproDir,
      verdicts: ctx.verdicts,
      filed: false,
    };
  }

  return reproduceAndFile(ctx, cardR, heldRev);
}
