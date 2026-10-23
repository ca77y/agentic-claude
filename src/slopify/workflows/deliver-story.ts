import {
  STRINGS,
  scout,
  lens,
  advise,
  slugged,
  settledText,
  settleDecisions,
  type Answers,
  type Decision,
  type ScoutResult,
} from "../lib/family.ts";
import {
  NO_WRITES,
  DIRTY_SENTENCE,
  DECIDE,
  candidateNote,
  need,
  decisionNeed,
  list,
  unique,
  show,
  findingText,
  callWriter,
  callCoder,
  callQa,
  callPusher,
  createDeliver,
  pushOk,
  type Attempt,
  type BlockingFinding,
  type Plan,
  type Stopped,
  type Validator,
  type Verification,
} from "../lib/deliver.ts";
import {
  WRITER_SCHEMA,
  inTmp,
  locate,
  checkpoint,
  currencyOf,
  excludedOf,
  workspace,
  specGate as runSpecGate,
  lensGate,
  judgeCandidate as judgeWith,
  leaveOutside,
  commitWork,
  planOf,
  publish,
  review as runReview,
  type ReviewDone,
  type WriterResult,
} from "../lib/deliver-steps.ts";
import { answersOf, inputOf, textOf, type NotStarted } from "../lib/input.ts";

export const meta = {
  name: "deliver-story",
  description:
    "Deliver a story through a verified pull request: scouts and the library gather evidence, the how advisors judge the approach, a writer writes a spec that fresh lenses must pass before any code, coders implement, a fresh qa validates, pusher publishes, and review-pr runs the review loop",
  whenToUse:
    "Run only when the user invokes /slopify:deliver-story or asks for the slopify deliver-story workflow. Args: {story, projectRoot?, answers?}, or the story as a plain string; story is a card identifier or URL, or the story text; projectRoot defaults to the session project directory; answers maps a decision id from a blocked result to its answer when rerunning.",
  phases: [
    {
      title: "Locate",
      detail: "scout-card reads the story, then scout-checkpoint reports the run's durable state",
    },
    {
      title: "Workspace",
      detail: "pusher creates or recovers the story worktree and starts delivery",
    },
    {
      title: "Gather",
      detail: "scout-code, scout-tests, scout-docs, scout-history, and library-reader in parallel",
    },
    {
      title: "Approach",
      detail: "writer outlines the approach; scout-upstream-docs and scout-known-issues per dependency",
    },
    {
      title: "Advise",
      detail: "advisor-architecture, advisor-performance, advisor-risk, and advisor-security in parallel",
    },
    {
      title: "Spec",
      detail: "writer writes or revises the spec from the story and the advice",
    },
    {
      title: "Spec gate",
      detail: "lens-scope and lens-consistency must pass the spec revision, then pusher commits it",
    },
    {
      title: "Implement",
      detail: "one coder per task and a writer for documentation",
    },
    {
      title: "Validate",
      detail: "qa and lens-docs judge the candidate revision, then pusher commits it",
    },
    {
      title: "Publish",
      detail: "pusher pushes, opens or updates the PR, and fires the review",
    },
    {
      title: "Review",
      detail: "the review-pr workflow runs the review loop as a sub-workflow",
    },
  ],
} as const satisfies WorkflowMeta;

// ---- Local schemas ----------------------------------------------------------

const CONTEXT_SCHEMA = {
  type: "object",
  required: ["summary", "supported", "gaps"],
  properties: {
    summary: {
      type: "string",
      description: "What the existing library already supports about the story",
    },
    supported: {
      ...STRINGS,
      description: "Supported claims, each with the library file and heading it comes from",
    },
    gaps: {
      ...STRINGS,
      description: "What the library does not cover, stale or contested material included",
    },
  },
} as const;

const APPROACH_SCHEMA = {
  type: "object",
  required: ["approach", "alternatives", "dependencies", "openDecisions", "storyBlockers"],
  properties: {
    approach: { type: "string" },
    alternatives: STRINGS,
    dependencies: {
      ...STRINGS,
      description: "Outside libraries or services the approach relies on; empty when none",
    },
    openDecisions: {
      ...STRINGS,
      description: "Decisions only the user can make; empty when none",
    },
    storyBlockers: {
      ...STRINGS,
      description: "Reasons the story is unbuildable or contradictory as stated; empty when none",
    },
  },
} as const;

type ContextResult = Infer<typeof CONTEXT_SCHEMA>;
type ApproachResult = Infer<typeof APPROACH_SCHEMA>;
/** A documentation writer's result, with the decisions the user has not answered. */
type DocsResult = WriterResult & { unanswered?: Decision[] };
/** What the run reads from a producer's result, a coder's or a documentation writer's. */
interface ProducerView {
  changed?: string[];
  tests?: string[];
  produced?: string[];
  open?: string[];
  revision?: string;
  specMismatch?: string;
  storyBlockers?: string[];
  unanswered?: Decision[];
}
interface Job {
  id: string;
  kind: "coder" | "writer";
  summary: string;
  paths: string[];
}
interface Ran {
  kind: Job["kind"];
  id: string;
  result: ProducerView;
}
interface JobCtx {
  dirty: string[];
  findings?: Record<string, BlockingFinding[]>;
  judged?: string;
  phase: string;
}
interface Validation {
  cand: string;
  findings: BlockingFinding[] | null;
  prior: string[];
  fixRound: number;
  retry: Retry | null;
}
interface Retry {
  fixJobs: Job[];
  byJob: Record<string, BlockingFinding[]>;
  ran: Ran[];
}
type Step =
  | { stop: Stopped }
  | { mismatch: string }
  | { specFindings: BlockingFinding[] }
  | { ok: true; candidate: string; ran?: Ran[] };

// ---- Args -------------------------------------------------------------------

interface Delivered {
  status: "done";
  workflow: string;
  skipped: string[];
  attempts: Attempt[];
  completed: string[];
  pr: string;
  spec: string;
  verification: Verification[];
  review: ReviewDone;
  limits: string[];
  report: string;
}

function inputFrom(a: unknown): { storyArg: string; projectRoot: string; answers: Answers } {
  const input = inputOf(a, "story");
  return {
    storyArg: textOf(input["story"]),
    projectRoot: textOf(input["projectRoot"]),
    answers: answersOf(input["answers"]),
  };
}

// Sort a stage's results: each returned result joins ran, and the jobs that returned nothing come back.
function collectRan(jobs: readonly Job[], res: readonly (ProducerView | null | undefined)[], ran: Ran[]): Job[] {
  const failed: Job[] = [];
  for (const [i, j] of jobs.entries()) {
    const result = res[i];
    if (result) ran.push({ kind: j.kind, id: j.id, result });
    else failed.push(j);
  }
  return failed;
}

// The candidate label is an identifier for the worktree's current state, built from what the
// producers report: the coders' revisions (a lone coder's own is the true digest), plus the
// documentation writers' revisions. After a writer-only fix, the previous code label carries on.
function candidateAfter(ran: readonly Ran[], prev: string): string {
  const code =
    unique(ran.filter((x) => x.kind === "coder" && x.result.revision).map((x) => x.result.revision ?? "")).join("&") ||
    (prev || "").split("~", 1)[0];
  if (!code) return "";
  const docs = unique(ran.filter((x) => x.kind === "writer").map((x) => x.result.revision || "unrevised"));
  return docs.length > 0 ? `${code}~docs-${docs.join(",")}` : code;
}
const looksLikePath = (p: string): boolean => /^[\w@.+/-]+$/.test(p) && /[./]/.test(p);

export default async function run(): Promise<NotStarted | Stopped | Delivered> {
  const { storyArg, projectRoot, answers } = inputFrom(args);

  if (!storyArg) {
    return {
      status: "not-started",
      next: "Ask the user for the story: a card identifier or URL, or the story text. Then invoke again.",
    };
  }

  // ---- Constants and state ----------------------------------------------------

  const WORKFLOW = "deliver-story";

  const d = createDeliver({
    workflow: WORKFLOW,
    maxFailures: 3,
    planPhase: "Implement", // the phase recoverPlan reports under
    failures: { spec: 0, implementation: 0 },
    projectRoot,
    storyArg,
  });
  const {
    WHERE,
    skipped,
    attempts,
    verification,
    limits,
    state,
    done,
    skip,
    stop,
    fail,
    exhausted,
    rel,
    within,
    overlaps,
    pathOf,
    pushBrief,
    pushStop,
    makeReport,
  } = d;
  function callReader(prompt: string, label: string, phaseTitle: string): Promise<ContextResult | null> {
    return agent(prompt, {
      agentType: "slopify:library-reader",
      label,
      phase: phaseTitle,
      schema: CONTEXT_SCHEMA,
    });
  }

  // ---- Locate -----------------------------------------------------------------

  phase("Locate");
  const cardRes = await scout(
    "scout-card",
    `${WHERE}
Read the one card this delivery names, through the read bindings in docs/BOARD.md, or, when the argument below is the story text itself, take that text as the story. Report these evidence items, each with source set to the item name and excerpt set to its value; leave out an item that does not exist:
- card: the card identifier, or none when the argument is story text or there is no board
- story-source: card, text, or none
- story: the story text exactly as you wrote it for hashing (title line, empty line, body), or the argument verbatim for story text
- story-revision: the story revision digest
- field-re: the field regex you used for it
- criteria: the story's acceptance criteria, one per line, or the single word none when it states none
- branch: the branch name the board gives the card, or the single word none
- spec-path: the repository-relative spec path docs/BOARD.md's naming gives this card, built from the card identifier and the card title's lowercase kebab slug as the declaration's pattern says (for example docs/specs/<identifier>-<slug>.md), or the single word none
- relations: related, blocking, and blocked-by cards
- linked-specs: specs the card links
Change nothing on the board or forge.

Argument:
<<<ARG
${storyArg}
ARG>>>`,
    { label: "read the story", phase: "Locate" },
  );
  const located = locate(d, cardRes, storyArg, slugged(storyArg, "story"), {
    readable: "A readable story: the card, or the story text.",
    input: "A story the board can read, or the story text (pass it as args.story).",
    arg: "story",
    criteria: true,
  });
  if ("stop" in located) return located.stop;
  const { story, storyRevision, cardId, boardBranch, slug, specRel } = located;
  const STORY_BLOCK = `The story, verbatim, is the acceptance source (story revision ${storyRevision}):
<<<STORY
${story}
STORY>>>`;

  const adopted = await checkpoint(d, {
    delivery: cardId ? `card ${cardId}` : `the story "${slug}"`,
    boardBranch,
    specNoun: "The story's spec path",
    specRel,
    tests: false,
  });
  if ("stop" in adopted) return adopted.stop;
  const { cp: cpRes, dirty: cpDirty } = adopted;
  // With the spec already on disk, its revision is its checkpointed hash until a writer revises it.
  let specRevision = state.specHash;
  const { boardStartDone, boardPrDone, specCurrent, implCurrent, publishCurrent } = currencyOf(d, cpRes, {
    cardId,
    storyRevision,
    tests: false,
  });
  done("locate");

  // ---- Workspace --------------------------------------------------------------

  const workspaceStop = await workspace(d, {
    cardId,
    boardBranch,
    boardStartDone,
    specRel,
    worktree: "the story worktree",
    subject: cardId ? `card ${cardId}` : `the story "${slug}"`,
  });
  if (workspaceStop) return workspaceStop;

  // ---- Spec -------------------------------------------------------------------

  let plan: Plan | null = null;
  let gathered = "";
  let approachText = "(the approach is in the existing spec)";
  let adviceText = "(the advisors' views are in the existing spec)";
  const ADVISORS = ["advisor-architecture", "advisor-performance", "advisor-risk", "advisor-security"];

  // The writer writes or revises the spec.
  function draftSpec(pending: readonly string[]): Promise<{ res: WriterResult | null; open: Decision[] }> {
    const exists = state.specExists;
    return settleDecisions("spec", answers, (settled) =>
      callWriter(
        `${WHERE}
Work in the story worktree ${state.worktree}; address every file by absolute path. ${exists ? `Revise the spec at ${state.specPath} against the story below.` : `Write the spec at ${state.specPath}.`} Write only that one file. ${NO_WRITES}

The spec holds: the problem and intended outcome, scope, and exclusions; the story verbatim as the acceptance source; the approach, with each advisor's view recorded as adopted or rejected and the reason; observable acceptance criteria, one behavior each, and how each is verified; and the tasks it breaks into. Return the tasks (id, summary, and paths each task may write, relative to the worktree root, files or directories, no globs, disjoint between tasks, and including the test files the task adds) and the documentation files to update as docs.

Story authority: you may clarify an ambiguous criterion in the spec without changing its meaning, keeping the original wording beside the clarification. A criterion that is wrong, or a story that cannot be built as stated, is a story blocker: report it in storyBlockers and change nothing about the goal, scope, or criteria. ${DECIDE}
${STORY_BLOCK}

Approach:
${approachText}

The advisors' views:
${adviceText}

Evidence:
${gathered || "(see the existing spec)"}
${pending.length > 0 ? `\nResolve these findings:\n${list(pending)}` : ""}${settledText(settled)}`,
        exists ? "revise the spec" : "write the spec",
        "Spec",
        WRITER_SCHEMA,
      ),
    );
  }

  // Commit the spec revision the lenses passed.
  async function commitSpec(): Promise<Stopped | null> {
    const c = await callPusher(
      pushBrief(
        `Commit exactly this file, staged by explicit path: ${state.specPath}. First check that its git hash-object is ${specRevision}; if it differs, commit nothing and report that as unmet. If the file is already committed at that hash, make no commit and record the current HEAD sha in the ledger line. Use the commit convention docs/FORGE.md declares. Do not push.`,
        [`done spec ${state.specPath}@${specRevision} commit <the new commit's sha> story ${storyRevision}`],
      ),
      "commit the spec",
      "Spec gate",
    );
    if (!pushOk(c)) return pushStop("spec-gate", c);
    state.specHash = specRevision;
    done("spec-gate");
    return null;
  }

  // Write or revise the spec, then have fresh lenses judge that exact revision, then commit it.
  function specGate(findings: readonly string[]): Promise<Stopped | null> {
    return runSpecGate(d, findings, {
      draft: draftSpec,
      tasksProblem: "the spec needs at least one task, and every task needs paths",
      accept: (revision, drafted) => {
        specRevision = revision;
        plan = drafted;
      },
      gate: (_drafted, carry) =>
        lensGate(d, {
          revision: specRevision,
          carry,
          storyBlock: STORY_BLOCK,
          worktree: "The story worktree",
          scope: "Judge whether the spec covers the story's criteria, with no added or dropped scope.",
          consistency: true,
        }),
      commit: commitSpec,
    });
  }

  // Gather the evidence for a new spec.
  async function gather(): Promise<void> {
    phase("Gather");
    const CTX = `${WHERE}\nThe story worktree is ${state.worktree}; look there.\n${STORY_BLOCK}\n`;
    const got: {
      code: ScoutResult | null;
      tests: ScoutResult | null;
      docs: ScoutResult | null;
      history: ScoutResult | null;
      lib: ContextResult | null;
    } = { code: null, tests: null, docs: null, history: null, lib: null };
    await parallel([
      async () => {
        got.code = await scout(
          "scout-code",
          `${CTX}Find the code locations and call paths relevant to implementing this story.`,
          {
            label: "code",
            phase: "Gather",
          },
        );
      },
      async () => {
        got.tests = await scout(
          "scout-tests",
          `${CTX}Find the existing tests that cover the area this story changes, and how to run them.`,
          { label: "tests", phase: "Gather" },
        );
      },
      async () => {
        got.docs = await scout(
          "scout-docs",
          `${CTX}Find the documentation and specs that make claims about the area this story changes.`,
          { label: "docs", phase: "Gather" },
        );
      },
      async () => {
        got.history = await scout(
          "scout-history",
          `${CTX}Find from git history and blame when and why behavior in the area this story changes was last changed.`,
          { label: "history", phase: "Gather" },
        );
      },
      async () => {
        got.lib = await callReader(
          `${CTX}Report what the project library already supports about this story, so supported work is not repeated. Cite each supported claim to its file and heading, and name gaps and stale or contested material. Make no internet requests and no writes.`,
          "library context",
          "Gather",
        );
      },
    ]);
    const lib = got.lib;
    gathered = [
      show("Code", got.code),
      show("Tests", got.tests),
      show("Docs", got.docs),
      show("History", got.history),
      lib
        ? `Library: ${lib.summary}\n  Supported:\n${list(lib.supported)}\n  Gaps:\n${list(lib.gaps)}`
        : "Library: the library reader returned nothing, which is a gap, not an absence",
    ].join("\n");
    done("gather");
  }

  // Outline the approach, then read upstream docs and known issues for each dependency it names.
  async function outlineApproach(): Promise<Stopped | null> {
    phase("Approach");
    let approach: ApproachResult | null = null;
    let approachOpen: Decision[] = [];
    while (!approach) {
      const { res: a, open } = await settleDecisions("approach", answers, (settled) =>
        callWriter(
          `${WHERE}
Work in the story worktree ${state.worktree}. Outline the approach for this story from the story and the evidence. Write no files; return the outline. ${NO_WRITES} Never change the story's goal, scope, or criteria. ${DECIDE}

Return: approach (concretely how to build it); alternatives (considered, and why not); dependencies (each outside library or service the approach relies on, one per entry, empty when none); openDecisions (only what the user must decide, empty when none); storyBlockers (why the story is unbuildable or contradictory as stated, empty when none).
${STORY_BLOCK}

Evidence:
${gathered}${settledText(settled)}`,
          "outline the approach",
          "Approach",
          APPROACH_SCHEMA,
        ),
      );
      if (a) {
        approach = a;
        approachOpen = open;
      } else if (fail("spec", "approach outline", "the writer did not return")) return exhausted("approach", "spec");
    }
    if (approach.storyBlockers.length > 0) {
      return stop(
        "approach",
        approach.storyBlockers.map((b, i) => need("approach", i + 1, "story", b, "reported by the approach writer")),
      );
    }
    if (approachOpen.length > 0) {
      return stop(
        "approach",
        approachOpen.map((d) => decisionNeed(d, "the approach writer")),
      );
    }
    const deps = approach.dependencies;
    const outside = await parallel(
      deps.flatMap((d) => [
        () =>
          scout(
            "scout-upstream-docs",
            `${WHERE}\nFind the official docs and API references for ${d}: versions, limits, and deprecations relevant to this approach.\n\nApproach:\n${approach.approach}`,
            { label: `upstream ${d}`.slice(0, 48), phase: "Approach" },
          ),
        () =>
          scout(
            "scout-known-issues",
            `${WHERE}\nFind pitfalls and open bugs relevant to using ${d} this way in upstream trackers and changelogs.\n\nApproach:\n${approach.approach}`,
            { label: `known issues ${d}`.slice(0, 48), phase: "Approach" },
          ),
      ]),
    );
    for (const [i, d] of deps.entries()) {
      gathered += `\n${show(`Upstream docs for ${d}`, outside[2 * i])}\n${show(`Known issues for ${d}`, outside[2 * i + 1])}`;
    }
    approachText = `${approach.approach}\nAlternatives considered:\n${list(approach.alternatives)}\nDependencies:\n${list(deps)}`;
    done("approach");
    return null;
  }

  // The how advisors judge the approach.
  async function adviseOnApproach(): Promise<void> {
    phase("Advise");
    const adviseBrief = `${WHERE}
Judge the approach below for this story, from your one angle, using only this evidence and the repository (read-only).

${STORY_BLOCK}

Approach:
${approachText}

Evidence:
${gathered}`;
    const advice = await parallel([
      () => advise("advisor-architecture", adviseBrief, { label: "architecture", phase: "Advise" }),
      () => advise("advisor-performance", adviseBrief, { label: "performance", phase: "Advise" }),
      () => advise("advisor-risk", adviseBrief, { label: "risk", phase: "Advise" }),
      () => advise("advisor-security", adviseBrief, { label: "security", phase: "Advise" }),
    ]);
    adviceText = ADVISORS.map((name, i) => {
      const a = advice[i];
      return a
        ? `${name}: ${a.judgement}\n  Reasons:\n${a.reasons.map((r) => `  - ${r.reason} (${r.evidence})`).join("\n")}\n  Risks:\n${list(a.risks)}\n  Conditions:\n${list(a.conditions)}`
        : `${name}: no judgement returned`;
    }).join("\n");
    done("advise");
  }

  // Gather, outline, advise, and pass the spec gate, unless the checkpoint shows the spec current.
  async function specPhase(): Promise<Stopped | null> {
    if (specCurrent) {
      for (const s of ["gather", "approach", "advise", "spec", "spec-gate"]) skip(s);
      return null;
    }
    await gather();
    const approachStop = await outlineApproach();
    if (approachStop) return approachStop;
    await adviseOnApproach();
    return specGate([]);
  }
  const specStop = await specPhase();
  if (specStop) return specStop;

  // ---- Implement and validate -------------------------------------------------

  const touched = new Set<string>(); // every path a producer reported changing, for the commit
  const startDirty = cpDirty;
  // Dirty paths this run found outside its assigned paths: reported, not committed, kept from the review loop,
  // and recorded on the ledger. A rerun that skips the commit reads them back from the ledger.
  const outsideDirty = excludedOf(d, cpRes);
  const fixScopes: string[] = []; // paths a fix job was assigned beyond the tasks' own, validated with the rest
  let docsJobs: Job[] = [];

  function jobPrompt(job: Job, jobs: readonly Job[], ctx: JobCtx): string {
    const others = jobs.filter((j) => j !== job);
    const dirtyIn = ctx.dirty.filter((p) => job.paths.some((s) => within(p, s)));
    const fnd = ctx.findings?.[job.id] ?? [];
    return `${WHERE}
Work in the story worktree ${state.worktree}; address every file by absolute path under it. ${NO_WRITES}

Task ${job.id}: ${job.summary}
Assigned paths (write only these): ${job.paths.join(", ")}
${others.length > 0 ? `Other writers are active in: ${others.map((o) => `${o.id} (${o.paths.join(", ")})`).join("; ")}. Do not touch their paths.` : "No other writer is active."}

Spec: ${state.specPath} (revision ${specRevision}). It was validated before any code was written; implement against it. If it cannot be implemented as written, say why in specMismatch and stop; never weaken a criterion to fit.
${STORY_BLOCK}
${
  job.kind === "writer"
    ? "Update the listed documentation so it states what the spec and the implementation do; every claim must be true against the code. In revision, return the git hash-object of the main file you changed."
    : "Implement the task and the tests that would catch it regressing. Run the focused tests as you work. Report the revision you leave as your instructions describe."
}
${dirtyIn.length > 0 ? `\n${DIRTY_SENTENCE}\nPaths:\n${list(dirtyIn)}\n` : ""}${fnd.length > 0 ? `\nFix these findings, reported by an independent validator of candidate ${ctx.judged}, and change only what they require:\n${list(fnd.map((f) => findingText(f)))}\n` : ""}`;
  }

  // The documentation writer raises its own decisions (prefix "docs"), apart from the spec writer's. The
  // result carries the ones the user has not answered as unanswered.
  async function callDocs(prompt: string, label: string, phaseTitle: string): Promise<DocsResult | null> {
    const { res, open } = await settleDecisions("docs", answers, (settled) =>
      callWriter(prompt + settledText(settled), label, phaseTitle, WRITER_SCHEMA),
    );
    const docs: DocsResult | null = res;
    if (docs) docs.unanswered = open;
    return docs;
  }

  // A documentation writer's story blockers or unanswered decisions stop the run; a coder has neither.
  function writerStop(step: string, ran: readonly Ran[]): Stopped | null {
    for (const x of ran) {
      if (x.kind !== "writer") continue;
      const r = x.result;
      if (r.storyBlockers?.length)
        return stop(
          step,
          r.storyBlockers.map((b, i) => need(step, i + 1, "story", b, "reported by the documentation writer")),
        );
      if (r.unanswered?.length)
        return stop(
          step,
          r.unanswered.map((d) => decisionNeed(d, "the documentation writer")),
        );
    }
    return null;
  }

  // Coders run first, then writers, so documentation is written against code that exists. Within
  // a stage, producers with disjoint paths run together; otherwise one after another.
  async function runJobs(jobs: readonly Job[], ctx: JobCtx): Promise<(ProducerView | null | undefined)[]> {
    const results: (ProducerView | null | undefined)[] = Array.from({ length: jobs.length }, () => null);
    for (const kind of ["coder", "writer"] as const) {
      const idx = jobs.map((j, i) => ({ j, i })).filter((x) => x.j.kind === kind);
      const part = idx.map((x) => x.j);
      if (part.length === 0) continue;
      const call = (j: Job): Promise<ProducerView | null> => {
        const prompt = jobPrompt(j, part, ctx);
        return kind === "writer"
          ? callDocs(prompt, `docs ${j.id}`, ctx.phase)
          : callCoder(prompt, `code ${j.id}`, ctx.phase);
      };
      const disjoint = part.every((a, i) => part.every((b, k) => !(k > i && overlaps(a.paths, b.paths))));
      let res: (ProducerView | null)[];
      if (part.length > 1 && disjoint) res = await parallel(part.map((j) => () => call(j)));
      else {
        res = [];
        for (const j of part) res.push(await call(j));
      }
      for (const [k, x] of idx.entries()) results[x.i] = res[k];
    }
    return results;
  }

  function noteWork(results: readonly ProducerView[]): void {
    for (const r of results) {
      for (const p of [...(r.changed ?? []), ...(r.tests ?? []), ...(r.produced ?? [])]) touched.add(rel(p));
      const open = r.open ?? [];
      for (const o of open) limits.push(`open: ${o}`);
    }
  }

  // What gets committed: the paths the validators judged, within the tasks' and documentation's assigned
  // paths and the paths a fix job was assigned, from the checkpoint's dirty list and what the producers
  // reported. The rest is reported.
  function commitSet(scopes: readonly string[]): string[] {
    const every = unique([...startDirty, ...touched]).filter((p) => p && !inTmp(p));
    const specChanged = every.filter((p) => within(p, state.specPath));
    if (specChanged.length > 0)
      limits.push(`The spec has changes made after its gate that are not committed: ${specChanged.join(", ")}`);
    const all = every.filter((p) => !within(p, state.specPath));
    const inScope = all.filter((p) => scopes.some((s) => within(p, s)));
    leaveOutside(
      d,
      all.filter((p) => !inScope.includes(p)),
      outsideDirty,
    );
    return inScope;
  }

  // Returns {stop} | {mismatch} | {ok: true, candidate}.
  async function implement(plan: Plan): Promise<Step> {
    phase("Implement");
    const jobs = plan.tasks.map((t): Job => ({ id: t.id, kind: "coder", summary: t.summary, paths: t.paths }));
    docsJobs =
      plan.docs.length > 0
        ? [{ id: "docs", kind: "writer", summary: "Update the documentation the spec lists", paths: plan.docs }]
        : [];
    const all = [...jobs, ...docsJobs];
    const dirtyNow = unique([...startDirty, ...touched]);
    const ran: Ran[] = [];
    let todo = all;
    while (todo.length > 0) {
      const res = await runJobs(todo, { dirty: dirtyNow, phase: "Implement" });
      const failed = collectRan(todo, res, ran);
      noteWork(res.filter((x) => !!x));
      const blockedByWriter = writerStop("implement", ran);
      if (blockedByWriter) return { stop: blockedByWriter };
      if (
        failed.length > 0 &&
        fail("implementation", `producers ${failed.map((j) => j.id).join(", ")}`, "the producer did not return")
      )
        return { stop: exhausted("implement", "implementation") };
      todo = failed;
    }
    const mismatch = ran.map((x) => x.result.specMismatch).filter((m) => m?.trim());
    if (mismatch.length > 0) return { mismatch: mismatch.join("; ") };
    done("implement");
    return { ok: true, candidate: candidateAfter(ran, ""), ran };
  }

  // Route each finding to the job whose paths hold it; the rest go to one fix job over every coder's paths.
  function routeFindings(
    jobs: readonly Job[],
    findings: readonly BlockingFinding[],
  ): { fixJobs: Job[]; byJob: Record<string, BlockingFinding[]> } {
    const byJob: Record<string, BlockingFinding[]> = {};
    const other: BlockingFinding[] = [];
    for (const f of findings) {
      const p = pathOf(f.location);
      const j = looksLikePath(p) ? jobs.find((x) => x.paths.some((s) => within(p, s))) : null;
      if (j) {
        const bucket = byJob[j.id] ?? [];
        byJob[j.id] = bucket;
        bucket.push(f);
      } else other.push(f);
    }
    const fixJobs = jobs.filter((j) => byJob[j.id]?.length);
    if (other.length > 0) {
      const extra = other.map((f) => pathOf(f.location)).filter((p) => looksLikePath(p));
      fixJobs.push({
        id: "fix",
        kind: "coder",
        summary: "Fix findings that fall outside the task paths",
        paths: unique([...jobs.filter((j) => j.kind === "coder").flatMap((j) => j.paths), ...extra]),
      });
      byJob["fix"] = other;
    }
    return { fixJobs, byJob };
  }

  // Producers fix the findings. Returns the step that ends validation, "retry" to run the failed fixes
  // again, or null once the fixes leave a new candidate to judge.
  async function fixFindings(
    v: Validation,
    jobs: readonly Job[],
    findings: readonly BlockingFinding[],
  ): Promise<Step | "retry" | null> {
    // A finding located in the spec is a spec problem: it goes back through the spec gate, and no
    // coder is given the spec to edit.
    const specItems = v.retry ? [] : findings.filter((f) => within(pathOf(f.location), state.specPath));
    if (specItems.length > 0) return { specFindings: specItems };
    phase("Validate");
    // Only the fix jobs that returned nothing run again; the ones that fixed their findings stay done.
    const { fixJobs, byJob, ran } = v.retry ?? { ...routeFindings(jobs, findings), ran: [] };
    for (const j of fixJobs) fixScopes.push(...j.paths);
    const res = await runJobs(fixJobs, { dirty: [], findings: byJob, judged: v.cand, phase: "Validate" });
    const failed = collectRan(fixJobs, res, ran);
    noteWork(res.filter((x) => !!x));
    const mismatch = ran.map((x) => x.result.specMismatch).filter((m) => m?.trim());
    if (mismatch.length > 0) return { mismatch: mismatch.join("; ") };
    const blockedByWriter = writerStop("validate", ran);
    if (blockedByWriter) return { stop: blockedByWriter };
    if (failed.length > 0) {
      if (fail("implementation", `fix for ${failed.map((j) => j.id).join(", ")}`, "the producer did not return"))
        return { stop: exhausted("validate", "implementation") };
      v.retry = { fixJobs: failed, byJob, ran }; // the findings stay pending; try only the failed fixes again
      return "retry";
    }
    v.retry = null;
    // A fix that leaves the label unchanged still produced new work: make the label new.
    const next = candidateAfter(ran, v.cand);
    if (next && next === v.cand) {
      v.fixRound += 1;
      v.cand = `${next}#${v.fixRound}`;
    } else v.cand = next;
    if (!v.cand)
      return {
        stop: stop("validate", [
          need(
            "validate",
            1,
            "prerequisite",
            "The candidate code revision after the fix.",
            "no producer or scout reported it",
          ),
        ]),
      };
    return null;
  }

  // Fresh qa and lenses judge the candidate. Returns the step that ends validation, or null with the
  // findings to fix.
  async function judgeCandidate(plan: Plan, v: Validation): Promise<Step | null> {
    phase("Validate");
    const { cand, prior } = v;
    const changedList = [...touched];
    const items: Validator[] = [
      {
        name: "qa",
        call: () =>
          callQa(
            `${WHERE}
Validate the candidate in the story worktree ${state.worktree} against the validated spec and the story. Candidate revision: ${cand}. ${candidateNote(cand)}
Spec: ${state.specPath}, revision ${specRevision}.
Changed paths:
${list(changedList)}

${STORY_BLOCK}

Run the project's tests and the checks the spec requires, judge regression coverage, and judge each acceptance criterion and the affected documentation.${prior.length > 0 ? `\n\nEarlier findings to recheck:\n${list(prior)}` : ""}`,
            "qa",
            "Validate",
          ),
      },
    ];
    if (plan.docs.length > 0)
      items.push({
        name: "lens-docs",
        call: () =>
          lens(
            "lens-docs",
            `${WHERE}
Judge whether the documentation claims in these files are true against the code in the story worktree ${state.worktree}. Candidate revision: ${cand}. ${candidateNote(cand)}
Files:
${list(plan.docs)}${prior.length > 0 ? `\n\nEarlier findings to recheck:\n${list(prior)}` : ""}`,
            { label: "docs", phase: "Validate" },
          ),
      });
    return judgeWith(d, items, v);
  }

  // Fresh qa and lenses judge the candidate; producers fix; new validators judge again.
  async function validate(plan: Plan, first: { candidate: string }): Promise<Step> {
    if (!first.candidate)
      return {
        stop: stop("validate", [
          need("validate", 1, "prerequisite", "The candidate code revision.", "no producer or scout reported it"),
        ]),
      };
    const jobs = [
      ...plan.tasks.map((t): Job => ({ id: t.id, kind: "coder", summary: t.summary, paths: t.paths })),
      ...docsJobs,
    ];
    const v: Validation = { cand: first.candidate, findings: null, prior: [], fixRound: 0, retry: null };
    for (;;) {
      if (v.findings) {
        const fixed = await fixFindings(v, jobs, v.findings);
        if (fixed === "retry") continue;
        if (fixed) return fixed;
        v.findings = null;
      }
      const judged = await judgeCandidate(plan, v);
      if (judged) return judged;
    }
  }

  // The work goes back to the spec, with the spec budget.
  async function backToSpec(next: { mismatch: string } | { specFindings: BlockingFinding[] }): Promise<Stopped | null> {
    const why =
      "mismatch" in next
        ? `The implementation reports the spec cannot be implemented as written: ${next.mismatch}`
        : `A validator found problems in the spec itself:\n${list(next.specFindings.map((f) => findingText(f)))}`;
    if (fail("spec", "implementation against the spec", "mismatch" in next ? next.mismatch : why))
      return exhausted("spec", "spec");
    return specGate([why]);
  }

  // Implement and validate until the gates pass; returns the plan they passed against.
  async function deliverCode(): Promise<Stopped | Plan> {
    for (;;) {
      if (!plan) {
        const recovered = await planOf(d, "implement", "The tasks and documentation list");
        if ("status" in recovered) return recovered;
        plan = recovered;
      }
      const impl = await implement(plan);
      const next = "ok" in impl ? await validate(plan, impl) : impl;
      if ("stop" in next) return next.stop;
      if (!("mismatch" in next || "specFindings" in next)) return plan;
      const stopped = await backToSpec(next);
      if (stopped) return stopped;
    }
  }

  // Implement and validate until the gates pass, then commit, unless the checkpoint shows it done.
  async function implementPhase(): Promise<Stopped | null> {
    if (implCurrent) {
      skip("implement");
      skip("validate");
      return null;
    }
    const passedPlan = await deliverCode();
    if ("status" in passedPlan) return passedPlan;
    done("validate");
    const commitPaths = commitSet([...passedPlan.tasks.flatMap((t) => t.paths), ...passedPlan.docs, ...fixScopes]);
    return commitWork(d, commitPaths, outsideDirty, "commit the implementation");
  }

  const implementStop = await implementPhase();
  if (implementStop) return implementStop;

  // ---- Publish ----------------------------------------------------------------

  const publishStop = await publish(d, {
    cardId,
    boardPrDone,
    publishCurrent,
    branch: "the story branch",
    describes: "the story",
  });
  if (publishStop) return publishStop;

  // ---- Review -----------------------------------------------------------------

  const reviewed = await runReview(d, { story, projectRoot, answers, exclude: outsideDirty });
  if ("stop" in reviewed) return reviewed.stop;
  const { review } = reviewed;
  done("review");

  return {
    status: "done",
    workflow: WORKFLOW,
    skipped,
    attempts,
    completed: d.completed,
    pr: state.pr,
    spec: state.specPath,
    verification,
    review,
    limits,
    report: makeReport([`Spec: ${state.specPath}.`], review),
  };
}
