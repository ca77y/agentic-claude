import { STRINGS, lens, scout, type LensResult } from "../lib/family.ts";
import { NO_WRITES, callCoder, callPusher, createDeliver, list, opRef, show, type Stopped } from "../lib/deliver.ts";
import { answersOf, flagOf, inputOf, textOf, type NotStarted } from "../lib/input.ts";
import { must, pushed, reportOf, runLoop, stopOf, type LoopResult, type Problem, type Run } from "../lib/loop.ts";
import { MAX_INNER_TRIES } from "../lib/rules.ts";
import { libraryReaderSchema } from "../lib/schemas.ts";
import { startWork } from "../lib/small.ts";

export const meta = {
  name: "deliver-spike",
  description:
    "Answer a bounded technical question from a Linear issue or a prompt with a cited findings document, delivered as a pull request: scouts gather evidence, a plan lists the claims, a throwaway prototype measures what evidence can't settle, and the document goes through the delivery loop's checks and review until it is clean",
  whenToUse:
    'Run only when the user invokes /slopify:deliver-spike or asks for the slopify deliver-spike workflow, for a bounded technical question that needs findings, measurements, or a throwaway prototype. Open-ended outside research ("what is the best X") belongs to /slopify:research. Args: {question, projectRoot?, branchOnly?, answers?}, or the question as a plain string; question is a card identifier or URL, or the question as a prompt; projectRoot defaults to the session project directory; branchOnly: true, when the user asks for a branch without a worktree, checks the branch out in the main checkout and creates no worktree; answers maps a decision id from a draft or blocked result to its answer when rerunning.',
  phases: [
    { title: "Locate", detail: "scout-card reads the issue, or pusher files a spike card for a prompt" },
    { title: "Workspace", detail: "pusher creates or recovers the worktree and branch" },
    { title: "Ground", detail: "library-reader and five scouts in parallel" },
    { title: "Plan", detail: "writer-findings lists the claims and the measurements that would settle them" },
    { title: "Prototype", detail: "coder measures and qa confirms, up to three tries, then pusher deletes it" },
    { title: "Findings", detail: "writer-findings writes the findings document, and pusher commits it" },
    { title: "Validate", detail: "checks, lens-evidence, lens-question, and lens-neutrality" },
    { title: "Judge", detail: "one judge per problem gives its severity and kind" },
    { title: "Build", detail: "writer-findings revises the document for each open problem" },
    { title: "Push", detail: "pusher pushes, opens or updates the PR, and fires the review" },
    { title: "Review", detail: "watcher reads the review, and one judge rules on each finding" },
  ],
} as const satisfies WorkflowMeta;

const WORKFLOW = "deliver-spike";

const LIBRARY_SCHEMA = libraryReaderSchema("the question");

const PLAN_SCHEMA = {
  type: "object",
  required: ["claims", "assumptions"],
  properties: {
    claims: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "claim", "status", "measurement"],
        properties: {
          id: { type: "string", description: "A short stable id: c1, c2, ..." },
          claim: { type: "string" },
          status: { type: "string", enum: ["supported", "contested", "unknown"] },
          measurement: {
            type: "string",
            description: "What to measure and how, when a throwaway prototype could settle the claim; empty otherwise",
          },
        },
      },
    },
    assumptions: { ...STRINGS, description: "Each question the plan settled itself, as the question and the choice" },
  },
} as const;

const MEASUREMENT = {
  type: "object",
  required: ["claim", "command", "output", "value"],
  properties: {
    claim: { type: "string", description: "The claim id" },
    command: { type: "string", description: "The exact command, run from the prototype worktree" },
    output: { type: "string", description: "Its output, verbatim" },
    value: { type: "string" },
  },
} as const;

const PROTOTYPE_SCHEMA = {
  type: "object",
  required: ["measurements", "assumptions", "problem"],
  properties: {
    measurements: { type: "array", items: MEASUREMENT },
    assumptions: {
      ...STRINGS,
      description: "Each trivial question you settled yourself, as the question and your choice",
    },
    problem: { type: "string", description: "Why these claims can't be measured as asked; empty when they can" },
  },
} as const;

const CONFIRM_SCHEMA = {
  type: "object",
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        required: ["claim", "confirmed", "reason"],
        properties: {
          claim: { type: "string", description: "The claim id" },
          confirmed: { type: "boolean", description: "True when your rerun reproduced the value" },
          reason: { type: "string", description: "What differed or stopped the rerun; empty when confirmed" },
        },
      },
    },
  },
} as const;

const DOC_SCHEMA = {
  type: "object",
  required: ["changed"],
  properties: { changed: { ...STRINGS, description: "Paths written, relative to the worktree root" } },
} as const;

type Claim = Infer<typeof PLAN_SCHEMA>["claims"][number];
type Measurement = Infer<typeof MEASUREMENT>;

interface Measured {
  measurements: Measurement[];
  unknowns: string[];
  assumptions: string[];
}

export type SpikeResult = NotStarted | Stopped | (LoopResult & { workflow: "deliver-spike"; report: string });

const quoted = (story: string): string => `<<<QUESTION\n${story}\nQUESTION>>>`;

// ---- Ground -----------------------------------------------------------------

async function ground(d: Run, story: string): Promise<string> {
  phase("Ground");
  const brief = (task: string): string => `${d.WHERE}\n${task}\nChange nothing.\n\n${quoted(story)}`;
  const scouts = [
    ["scout-code", "Find the code locations and call paths this question concerns, with path:line evidence."],
    [
      "scout-feasibility",
      "Find where the approach this question asks about fits in this codebase, what it would touch, and what blocks it.",
    ],
    [
      "scout-upstream-docs",
      "Find the official docs for the library or service this question turns on: versions, limits, and deprecations.",
    ],
    [
      "scout-known-issues",
      "Find pitfalls and open bugs relevant to this question in upstream trackers and changelogs.",
    ],
    ["scout-prior-art", "Find repos, issues, discussions, and write-ups where others answered the same question."],
  ] as const;
  const [library, ...found] = await parallel([
    () =>
      agent(
        brief(
          "Report what the project library already supports about this question, citing each claim to its file and heading, and name its gaps. Make no internet requests.",
        ),
        { agentType: "slopify:library-reader", label: "library", phase: "Ground", schema: LIBRARY_SCHEMA },
      ),
    ...scouts.map(
      ([name, task]) =>
        () =>
          scout(name, brief(task), { label: name, phase: "Ground" }),
    ),
  ]);
  const lib = must(library, "ground", "What the library supports.");
  return [
    `library-reader: ${lib.summary}\n${list(lib.supported)}\n  Gaps: ${lib.gaps.join("; ") || "none"}`,
    ...scouts.map(([name], i) => show(name, must(found[i], "ground", `Evidence from ${name}.`))),
  ].join("\n\n");
}

// ---- Plan -------------------------------------------------------------------

async function plan(d: Run, story: string, evidence: string) {
  phase("Plan");
  return must(
    await agent(
      `${d.WHERE}
Plan the answer to this spike's question from the evidence below, and return each assumption you make.

${quoted(story)}

Evidence:
${evidence}`,
      { agentType: "slopify:writer-findings", label: "plan", phase: "Plan", schema: PLAN_SCHEMA },
    ),
    "plan",
    "The spike's plan.",
  );
}

// ---- Prototype --------------------------------------------------------------

const PROTOTYPE_AUTH =
  "The user's invocation of deliver-spike authorizes creating and then deleting this spike's local prototype branch and worktree. They are never pushed.";

function measureBrief(d: Run, worktree: string, claims: readonly Claim[], last: string): string {
  return `${d.WHERE}
Build a throwaway prototype in the worktree ${worktree}, only as much as these measurements need, and run each one. Record each command exactly as run from that worktree, with its output verbatim.
${list(claims.map((c) => `${c.id}: ${c.claim} Measure: ${c.measurement}`))}${last ? `\n\nThe last attempt wasn't confirmed:\n${last}` : ""}

Write only inside that worktree. If a claim can't be measured as asked, return problem with why and stop. ${NO_WRITES}`;
}

async function confirm(d: Run, worktree: string, measurements: readonly Measurement[]) {
  return must(
    await agent(
      `${d.WHERE}
In the worktree ${worktree}, rerun each measurement below and say whether you reproduce its value. A value that depends on the machine is confirmed when your rerun agrees within the variation the claim allows. Change nothing.
${JSON.stringify(measurements)}`,
      { agentType: "slopify:qa", label: "confirm measurements", phase: "Prototype", schema: CONFIRM_SCHEMA },
    ),
    "prototype",
    "A rerun of the measurements.",
  );
}

interface Tally {
  confirmed: Measurement[];
  assumptions: string[];
  /** Why each claim still isn't confirmed. */
  why: Map<string, string>;
}

// One try: the coder measures what is still pending, and qa reruns it. Returns false when the claims can't be measured.
async function measureOnce(d: Run, worktree: string, pending: readonly Claim[], t: Tally, attempt: number) {
  const last = list(pending.filter((c) => t.why.has(c.id)).map((c) => `${c.id}: ${t.why.get(c.id) ?? ""}`));
  const built = must(
    await callCoder(
      measureBrief(d, worktree, pending, attempt > 1 ? last : ""),
      `prototype${attempt > 1 ? ` (try ${String(attempt)})` : ""}`,
      "Prototype",
      PROTOTYPE_SCHEMA,
    ),
    "prototype",
    "A prototype and its measurements.",
  );
  t.assumptions.push(...built.assumptions);
  if (built.problem) {
    for (const c of pending) t.why.set(c.id, built.problem);
    return false;
  }
  const rerun = await confirm(d, worktree, built.measurements);
  for (const c of pending) t.why.set(c.id, "the prototype didn't measure it");
  for (const m of built.measurements) {
    const r = rerun.results.find((x) => x.claim === m.claim);
    if (r?.confirmed) t.confirmed.push(m);
    else t.why.set(m.claim, r?.reason || "qa didn't rerun it");
  }
  return true;
}

// Up to three tries to get each measurement confirmed. One that never is goes under Unknowns, with why.
async function measureAll(d: Run, worktree: string, claims: readonly Claim[]): Promise<Measured> {
  const t: Tally = { confirmed: [], assumptions: [], why: new Map() };
  const isPending = (c: Claim): boolean => t.confirmed.every((m) => m.claim !== c.id);
  for (let attempt = 1; attempt <= MAX_INNER_TRIES; attempt += 1) {
    const pending = claims.filter((c) => isPending(c));
    if (pending.length === 0 || !(await measureOnce(d, worktree, pending, t, attempt))) break;
  }
  return {
    measurements: t.confirmed,
    unknowns: claims.filter((c) => isPending(c)).map((c) => `${c.claim} Not measured: ${t.why.get(c.id) ?? ""}`),
    assumptions: t.assumptions,
  };
}

async function prototype(d: Run, slug: string, claims: readonly Claim[]): Promise<Measured> {
  const toMeasure = claims.filter((c) => c.measurement);
  if (toMeasure.length === 0) return { measurements: [], unknowns: [], assumptions: [] };
  phase("Prototype");
  const made = pushed(
    await callPusher(
      d.pushBrief(
        d.branchOnly
          ? `${PROTOTYPE_AUTH} Create the prototype branch that docs/FORGE.md's "Spike prototypes" line names for the slug ${slug}, from the target branch, and check it out in the main checkout; the user asked for branches only, so create no worktree, and report the main checkout's absolute path as the operation worktree. If that line says none, create nothing and report the operation worktree with the reference none.`
          : `${PROTOTYPE_AUTH} Create the prototype branch and worktree that docs/FORGE.md's "Spike prototypes" line names for the slug ${slug}, from the target branch. If that line says none, create nothing and report the operation worktree with the reference none.`,
      ),
      "create the prototype",
      "Prototype",
    ),
    "The prototype worktree.",
  );
  const worktree = opRef(made, "worktree");
  // A project that declares no prototypes has chosen to answer from evidence alone.
  if (worktree === "none") {
    return {
      measurements: [],
      unknowns: toMeasure.map((c) => `${c.claim} Not measured: the project declares no spike prototypes.`),
      assumptions: [],
    };
  }
  const measured = await measureAll(d, worktree, toMeasure);
  pushed(
    await callPusher(
      d.pushBrief(
        d.branchOnly
          ? `${PROTOTYPE_AUTH} In the main checkout ${worktree}, discard the prototype's changes, check out the spike's branch ${d.state.branch} again, and delete the prototype's local branch.`
          : `${PROTOTYPE_AUTH} Remove the prototype worktree ${worktree} and delete its local branch.`,
      ),
      "delete the prototype",
      "Prototype",
    ),
    "The prototype's deletion.",
  );
  return measured;
}

// ---- Findings ---------------------------------------------------------------

async function writeFindings(d: Run, story: string, docRel: string, evidence: string, notes: string): Promise<void> {
  phase("Findings");
  const w = must(
    await agent(
      `${d.WHERE}
In the worktree ${d.state.worktree}, write the spike's findings document at ${docRel}.

${quoted(story)}

${notes}

Evidence:
${evidence}

${NO_WRITES}`,
      { agentType: "slopify:writer-findings", label: "findings", phase: "Findings", schema: DOC_SCHEMA },
    ),
    "findings",
    "The findings document.",
  );
  const paths = list(w.changed);
  pushed(
    await callPusher(
      d.pushBrief(
        `Commit exactly these paths as they stand, staged by explicit path, with a message in the convention docs/FORGE.md declares, saying: add the spike's findings. Do not push.\n${paths}`,
        [`done findings ${docRel}`],
      ),
      "commit: add the spike's findings",
      "Findings",
    ),
    "A commit of the findings document.",
  );
}

function planNotes(claims: readonly Claim[], measured: Measured, planAssumptions: readonly string[]): string {
  return `The plan's claims:
${list(claims.map((c) => `${c.id} (${c.status}): ${c.claim}`))}

Confirmed measurements, each to be recorded with its command and output:
${JSON.stringify(measured.measurements)}

Unknowns from the prototype:
${list(measured.unknowns)}

Assumptions:
${list([...planAssumptions, ...measured.assumptions])}`;
}

// ---- The document's checks and revisions --------------------------------------

async function checkDocument(d: Run, story: string, docRel: string): Promise<Problem[]> {
  const doc = `${d.state.worktree}/${docRel}`;
  const lenses = [
    [
      "lens-evidence",
      `The findings document is ${doc}. Its prototype is deleted, so each measurement is checked against the command and output the document records.`,
    ],
    ["lens-question", `The findings document is ${doc}.\n\n${quoted(story)}`],
    [
      "lens-neutrality",
      `The findings document is ${doc}. Its Options and trade-offs section lists options with their costs and conditions; only ranking or advising one is a recommendation.`,
    ],
  ] as const;
  const verdicts = await parallel(
    lenses.map(
      ([name, brief]) =>
        () =>
          lens(name, `${d.WHERE}\n${brief}`, { label: name, phase: "Validate" }),
    ),
  );
  return lenses.flatMap(([name], i) => {
    const v: LensResult = must(verdicts[i], "validate", `A verdict from ${name}.`);
    const problems = v.findings.map((f) => ({ source: name, location: f.location, text: f.problem }));
    // A check that couldn't run found nothing, which is not the same as passing.
    if (v.verdict === "unverified" && problems.length === 0) {
      problems.push({ source: name, location: docRel, text: `The check couldn't run: ${v.limits}` });
    }
    return problems;
  });
}

async function reviseDocument(d: Run, docRel: string, problems: readonly string[]): Promise<string[]> {
  const w = must(
    await agent(
      `${d.WHERE}
In the worktree ${d.state.worktree}, revise the spike's findings document at ${docRel} to fix these problems.
${list(problems)}

${NO_WRITES}`,
      { agentType: "slopify:writer-findings", label: "revise the findings", phase: "Build", schema: DOC_SCHEMA },
    ),
    "build",
    "A revised findings document.",
  );
  return w.changed;
}

// ---- Run --------------------------------------------------------------------

export default async function run(): Promise<SpikeResult> {
  const input = inputOf(args, "question");
  const arg = textOf(input["question"]);
  if (!arg) {
    return { status: "not-started", next: "Ask the user for the Linear issue or the question, then invoke again." };
  }
  const d = createDeliver({
    workflow: WORKFLOW,
    projectRoot: textOf(input["projectRoot"]),
    storyArg: arg,
    branchOnly: flagOf(input["branchOnly"]),
  });
  try {
    const started = await startWork(d, arg, "spike");
    if ("status" in started) return started;
    const { story, cardId, slug, name, resume } = started;
    const docRel = resume.findings[0] ?? `docs/spikes/${name}.md`;
    // A committed document is the checkpoint: a rerun goes straight to the loop.
    if (resume.findings.length === 0) {
      const evidence = await ground(d, story);
      const planned = await plan(d, story, evidence);
      const measured = await prototype(d, slug, planned.claims);
      await writeFindings(d, story, docRel, evidence, planNotes(planned.claims, measured, planned.assumptions));
    }
    const result = await runLoop({
      d,
      where: d.WHERE,
      story,
      cardId,
      build: null,
      validate: null,
      specDir: "",
      answers: answersOf(input["answers"]),
      startAtReview: d.state.pr ? Math.max(resume.reviewFired, 1) : 0,
      built: true,
      document: {
        paths: [docRel],
        check: () => checkDocument(d, story, docRel),
        revise: (problems) => reviseDocument(d, docRel, problems),
      },
    });
    return { ...result, workflow: WORKFLOW, report: reportOf(WORKFLOW, result) };
  } catch (error) {
    return stopOf(d, error);
  }
}
