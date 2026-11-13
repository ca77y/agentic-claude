import { STRINGS } from "../lib/family.ts";
import { callPusher, createDeliver, list, type Stopped } from "../lib/deliver.ts";
import { answersOf, inputOf, textOf, type NotStarted } from "../lib/input.ts";
import { confirmedProblems, type Reported } from "../lib/judge.ts";
import { must, pushed, reportOf, runLoop, stopOf, type LoopResult, type Problem, type Run } from "../lib/loop.ts";
import { MAX_FIX_ROUNDS } from "../lib/rules.ts";
import { libraryReaderSchema } from "../lib/schemas.ts";
import { findCard, openWork, resumeOf } from "../lib/small.ts";

export const meta = {
  name: "research",
  description:
    "Answer a question from new sources in the project library, from a Linear issue or a prompt, delivered as a pull request: a checked plan, one researcher per sub-question, one raw note per source, and wiki pages that answer the question, which go through the delivery loop's checks and review until they are clean",
  whenToUse:
    "Run only when the user invokes /slopify:research or asks for the slopify research workflow. Answers from the existing library belong to the ask skill. Args: {question, projectRoot?, answers?}, or the question as a plain string; question is a card identifier or URL, or the question as a prompt; projectRoot defaults to the session project directory.",
  phases: [
    { title: "Locate", detail: "scout-card reads the issue, or pusher files a card for a prompt" },
    { title: "Workspace", detail: "pusher creates or recovers the worktree and branch" },
    { title: "Ground", detail: "library-reader reports what the library already supports" },
    {
      title: "Plan",
      detail: "library-scribe writes the plan; library-clerk checks it and a judge rules, up to three rounds",
    },
    { title: "Retrieve", detail: "one library-researcher per sub-question" },
    {
      title: "Persist",
      detail: "one library-scribe per source writes its raw note, then one integrates the wiki pages",
    },
    { title: "Validate", detail: "checks and library-clerk on the changed files" },
    { title: "Judge", detail: "one judge per problem gives its severity and kind" },
    { title: "Build", detail: "library-scribe repairs the pages for each open problem" },
    { title: "Push", detail: "pusher pushes, opens or updates the PR, and fires the review" },
    { title: "Review", detail: "watcher reads the review, and one judge rules on each finding" },
  ],
} as const satisfies WorkflowMeta;

const WORKFLOW = "research";
const BOUNDS =
  "Research informs decisions: make no product decision, implement nothing, and don't commit or touch the board.";

const LIBRARY_SCHEMA = libraryReaderSchema("the question");

const PLAN_SCHEMA = {
  type: "object",
  required: ["subQuestions"],
  properties: {
    subQuestions: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "question"],
        properties: {
          id: { type: "string", description: "A short stable id: q1, q2, ..." },
          question: { type: "string" },
        },
      },
    },
  },
} as const;

const CLERK_SCHEMA = {
  type: "object",
  required: ["verdict", "findings", "evidence"],
  properties: {
    verdict: { type: "string", enum: ["pass", "fail", "unverified"] },
    findings: { ...STRINGS, description: "Each finding with the path or claim it concerns; empty on pass" },
    evidence: { type: "string", description: "What was checked and how, or what stopped the check" },
  },
} as const;

const RESEARCH_SCHEMA = {
  type: "object",
  required: ["findings", "sources", "contradictions", "limits", "planProblem"],
  properties: {
    findings: {
      ...STRINGS,
      description:
        "Each as: claim <- source (URL, title); retrieved date; published or version date; supporting passage",
    },
    sources: {
      type: "array",
      description: "Each distinct source the findings rest on, never the plan or the library conventions",
      items: {
        type: "object",
        required: ["url", "title"],
        properties: {
          url: { type: "string", description: "Canonical URL, or project file path" },
          title: { type: "string" },
        },
      },
    },
    contradictions: STRINGS,
    limits: { ...STRINGS, description: "Failed or thin retrievals, and leads that couldn't be fetched" },
    planProblem: { type: "string", description: "How the plan is wrong for this sub-question; empty when it isn't" },
  },
} as const;

const RAW_SCHEMA = {
  type: "object",
  required: ["path", "deferredMetadata"],
  properties: {
    path: { type: "string", description: "The raw note written or appended, relative to the worktree root" },
    deferredMetadata: { ...STRINGS, description: "Index, taxonomy, or log entries left for the integrator" },
  },
} as const;

const INTEGRATION_SCHEMA = {
  type: "object",
  required: ["pages", "changed"],
  properties: {
    pages: { ...STRINGS, description: "The wiki pages that answer the question, relative to the worktree root" },
    changed: { ...STRINGS, description: "Every path written, relative to the worktree root" },
  },
} as const;

const CHANGED_SCHEMA = {
  type: "object",
  required: ["changed"],
  properties: { changed: { ...STRINGS, description: "Paths written, relative to the worktree root" } },
} as const;

type SubQuestion = Infer<typeof PLAN_SCHEMA>["subQuestions"][number];
type Evidence = Infer<typeof RESEARCH_SCHEMA>;

interface Ctx {
  d: Run;
  question: string;
  plan: string;
  worktree: string;
}

export type ResearchResult = NotStarted | Stopped | (LoopResult & { workflow: "research"; report: string });

const quoted = (q: string): string => `<<<QUESTION\n${q}\nQUESTION>>>`;
const scribe = <const S extends Schema>(prompt: string, label: string, phaseTitle: string, schema: S) =>
  agent(prompt, { agentType: "slopify:library-scribe", label, phase: phaseTitle, schema });

// ---- Ground and plan --------------------------------------------------------

async function ground(c: Ctx): Promise<string> {
  phase("Ground");
  const lib = must(
    await agent(
      `${c.d.WHERE}\nReport what the project library already supports about this question, citing each claim to its file and heading, and name its gaps and stale material. Make no internet requests and no writes.\n\n${quoted(c.question)}`,
      { agentType: "slopify:library-reader", label: "library", phase: "Ground", schema: LIBRARY_SCHEMA },
    ),
    "ground",
    "What the library supports.",
  );
  return `${lib.summary}\nSupported:\n${list(lib.supported)}\nGaps:\n${list(lib.gaps)}`;
}

async function writePlan(c: Ctx, task: string, label: string): Promise<SubQuestion[]> {
  const p = must(
    await scribe(
      `${c.d.WHERE}\n${BOUNDS}\nAssignment: research plan. In the worktree ${c.worktree}, ${task} The plan is at ${c.plan}; write only that file.\n\n${quoted(c.question)}`,
      label,
      "Plan",
      PLAN_SCHEMA,
    ),
    "plan",
    "A research plan.",
  );
  return p.subQuestions;
}

async function checkPlan(c: Ctx): Promise<Reported[]> {
  const v = must(
    await agent(
      `${c.d.WHERE}\nAssignment: research-plan readiness. In the worktree ${c.worktree}, judge the plan at ${c.plan} for this question.\n\n${quoted(c.question)}`,
      { agentType: "slopify:library-clerk", label: "check the plan", phase: "Plan", schema: CLERK_SCHEMA },
    ),
    "plan",
    "A check of the plan.",
  );
  const found = v.findings.map((f) => ({ source: "library-clerk", location: c.plan, text: f }));
  return v.verdict === "unverified" && found.length === 0
    ? [{ source: "library-clerk", location: c.plan, text: `The check couldn't run: ${v.evidence}` }]
    : found;
}

// Up to three rounds. What is still wrong after them is a limit the answer states.
async function plan(c: Ctx, context: string): Promise<{ subQuestions: SubQuestion[]; limits: string[] }> {
  phase("Plan");
  let subQuestions = await writePlan(
    c,
    `write the plan: the bounded sub-questions to retrieve, each with a short stable id, and how good the evidence must be. It may allow a supported uncertain answer. Leave out what the library already supports:\n${context}`,
    "plan",
  );
  for (let round = 1; round <= MAX_FIX_ROUNDS; round += 1) {
    const problems = await checkPlan(c);
    const confirmed = await confirmedProblems(
      problems,
      (p) =>
        `${c.d.WHERE}\nRule on one problem reported against the research plan at ${c.plan}, in the worktree ${c.worktree}. blocker: research by this plan can't answer the question. major: a real flaw that should be fixed first. minor: real but low impact.\n\n${p.text}`,
      "Plan",
    );
    if (confirmed.length === 0) return { subQuestions, limits: [] };
    if (round === MAX_FIX_ROUNDS) return { subQuestions, limits: confirmed };
    subQuestions = await writePlan(
      c,
      `revise the plan to fix these problems:\n${list(confirmed)}`,
      `revise ${String(round)}`,
    );
  }
  return { subQuestions, limits: [] };
}

// ---- Retrieve and persist ---------------------------------------------------

async function retrieve(c: Ctx, subQuestions: readonly SubQuestion[]): Promise<Evidence[]> {
  phase("Retrieve");
  const found = await parallel(
    subQuestions.map(
      (s) => () =>
        agent(
          `${c.d.WHERE}\n${BOUNDS}\nInvestigate one sub-question of the research plan at ${c.worktree}/${c.plan}, through the source provider library/_meta/librarian.md names, and meet the plan's evidence standards. If the plan is wrong for this sub-question, say how in planProblem, and answer as well as you can.\n\n${quoted(c.question)}\n\nSub-question ${s.id}: ${s.question}`,
          {
            agentType: "slopify:library-researcher",
            label: `retrieve ${s.id}`,
            phase: "Retrieve",
            schema: RESEARCH_SCHEMA,
          },
        ),
    ),
  );
  return subQuestions.map((s, i) => must(found[i], "retrieve", `Evidence for ${s.id}.`));
}

// One raw note per source, so writers in parallel never share a file.
function bySource(evidence: readonly Evidence[]): Map<string, { title: string; findings: string[] }> {
  const sources = new Map<string, { title: string; findings: string[] }>();
  for (const e of evidence) {
    for (const s of e.sources) {
      const url = s.url.trim();
      const entry = sources.get(url) ?? { title: s.title, findings: [] };
      entry.findings.push(...e.findings);
      sources.set(url, entry);
    }
  }
  return sources;
}

async function persist(c: Ctx, evidence: readonly Evidence[], limits: readonly string[]): Promise<string[]> {
  phase("Persist");
  const sources = [...bySource(evidence)];
  const notes = await parallel(
    sources.map(
      ([url, s]) =>
        () =>
          scribe(
            `${c.d.WHERE}\n${BOUNDS}\nAssignment: raw notes. In the worktree ${c.worktree}, record this one source in its raw note, as library/_meta/librarian.md says: append to the note that already records it, or create one. Keep only the findings below that rest on this source.\n\nSource: ${url} (${s.title})\nFindings:\n${list(s.findings)}`,
            `raw note ${String(sources.findIndex(([u]) => u === url) + 1)}`,
            "Persist",
            RAW_SCHEMA,
          ),
    ),
  );
  const raw = sources.map(([url], i) => must(notes[i], "persist", `The raw note for ${url}.`));
  const open = [
    ...limits,
    ...evidence.flatMap((e) => [...e.limits, ...e.contradictions, ...(e.planProblem ? [e.planProblem] : [])]),
  ];
  const rawPaths = list(raw.map((r) => r.path));
  const deferred = list(raw.flatMap((r) => r.deferredMetadata));
  const integrated = must(
    await scribe(
      `${c.d.WHERE}\n${BOUNDS}\nAssignment: integration. You are the only writer of the synthesis and shared metadata. In the worktree ${c.worktree}, write the wiki page or pages that answer the question, each consequential claim cited to its raw-note evidence, and complete the index, taxonomy, and log, including the deferred metadata below. Keep these limits and contradictions visible in the pages:\n${list(open)}\n\n${quoted(c.question)}\n\nRaw notes:\n${rawPaths}\n\nDeferred metadata:\n${deferred}`,
      "integrate",
      "Persist",
      INTEGRATION_SCHEMA,
    ),
    "persist",
    "The integrated wiki pages.",
  );
  const paths = list([...new Set([...raw.map((r) => r.path), ...integrated.changed])]);
  const doneLine = `done findings ${integrated.pages.join(" ")}`;
  pushed(
    await callPusher(
      c.d.pushBrief(
        `Commit exactly these paths as they stand, staged by explicit path, with a message in the convention docs/FORGE.md declares, saying: add the research on this question. Do not push.\n${paths}`,
        [doneLine],
      ),
      "commit: add the research",
      "Persist",
    ),
    "A commit of the research.",
  );
  return integrated.pages;
}

// ---- The loop's checks and repairs --------------------------------------------

async function checkLibrary(c: Ctx): Promise<Problem[]> {
  const scope = `In the worktree ${c.worktree}, check the library files this branch changes from the target branch docs/FORGE.md declares.`;
  const assignments = ["answer and evidence support", "library integrity"] as const;
  const verdicts = await parallel(
    assignments.map(
      (a) => () =>
        agent(`${c.d.WHERE}\nAssignment: ${a}. ${scope}\n\n${quoted(c.question)}`, {
          agentType: "slopify:library-clerk",
          label: a,
          phase: "Validate",
          schema: CLERK_SCHEMA,
        }),
    ),
  );
  return assignments.flatMap((a, i) => {
    const v = must(verdicts[i], "validate", `A verdict on ${a}.`);
    const found = v.findings.map((f) => ({ source: "library-clerk", location: a, text: f }));
    if (v.verdict === "unverified" && found.length === 0) {
      found.push({ source: "library-clerk", location: a, text: `The check couldn't run: ${v.evidence}` });
    }
    return found;
  });
}

async function repair(c: Ctx, problems: readonly string[]): Promise<string[]> {
  const r = must(
    await scribe(
      `${c.d.WHERE}\n${BOUNDS}\nAssignment: integration repair. You are the only writer. In the worktree ${c.worktree}, fix these problems in the library files they concern, without researching new questions, and keep uncertainty and contradictions visible. Never rewrite a raw note's original capture.\n${list(problems)}`,
      "repair",
      "Build",
      CHANGED_SCHEMA,
    ),
    "build",
    "Repaired library files.",
  );
  return r.changed;
}

// ---- Run --------------------------------------------------------------------

export default async function run(): Promise<ResearchResult> {
  const input = inputOf(args, "question");
  const arg = textOf(input["question"]);
  if (!arg)
    return { status: "not-started", next: "Ask the user for the Linear issue or the question, then invoke again." };
  const d = createDeliver({ workflow: WORKFLOW, projectRoot: textOf(input["projectRoot"]), storyArg: arg });
  try {
    const found = await findCard(d, arg, "research");
    if ("status" in found) return found;
    const resume = await resumeOf(d, found);
    const stopped = await openWork(d, found, resume);
    if (stopped) return stopped;
    const c: Ctx = {
      d,
      question: found.story,
      plan: `.tmp/research/${found.slug}.plan.md`,
      worktree: d.state.worktree,
    };
    let pages = resume.findings;
    // Committed pages are the checkpoint: a rerun goes straight to the loop.
    if (pages.length === 0) {
      const context = await ground(c);
      const planned = await plan(c, context);
      pages = await persist(c, await retrieve(c, planned.subQuestions), planned.limits);
    }
    const result = await runLoop({
      d,
      where: d.WHERE,
      story: found.story,
      cardId: found.cardId,
      build: null,
      validate: null,
      specDir: "",
      answers: answersOf(input["answers"]),
      startAtReview: d.state.pr ? Math.max(resume.reviewFired, 1) : 0,
      built: true,
      document: { paths: pages, check: () => checkLibrary(c), revise: (problems) => repair(c, problems) },
    });
    return { ...result, workflow: WORKFLOW, report: reportOf(WORKFLOW, result) };
  } catch (error) {
    return stopOf(d, error);
  }
}
