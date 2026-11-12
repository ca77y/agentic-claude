// deliver-story's how phase: three independent designs, opus advisors, one decision, a spec folder, and a challenge
// that tries to break it. The issue says why and what; this decides how, so choices here are made, never asked.
import { LENS_SCHEMA, STRINGS, lens, scout, type Answers, type LensResult, type ScoutResult } from "./family.ts";
import { NO_WRITES, callPusher, callSpecWriter, list, opRef, pushOk, show, unique } from "./deliver.ts";
import { Halt, must, type Run } from "./loop.ts";
import { MAX_CHALLENGE_ROUNDS, MAX_DESIGN_TRIES } from "./rules.ts";
import { BUILD, VALIDATE, type Build, type Task, type Validate } from "./spec.ts";

const STANCES = [
  "the smallest change that fits the existing patterns",
  "the best long-term structure",
  "the most robust under failure",
] as const;

const HOW_ADVISORS = [
  "advisor-architecture",
  "advisor-performance",
  "advisor-risk",
  "advisor-security",
  "advisor-testability",
] as const;

const CONTEXT_SCHEMA = {
  type: "object",
  required: ["summary", "supported", "gaps"],
  properties: {
    summary: { type: "string", description: "What the existing library already supports about the story" },
    supported: { ...STRINGS, description: "Supported claims, each with the library file and heading it comes from" },
    gaps: { ...STRINGS, description: "What the library doesn't cover, stale or contested material included" },
  },
} as const;

const DESIGN_SCHEMA = {
  type: "object",
  required: ["approach", "reuse", "create", "interfaces", "data", "dependencies", "risks"],
  properties: {
    approach: { type: "string", description: "Concretely how to build it" },
    reuse: { ...STRINGS, description: "What already exists and gets used, each with path:line" },
    create: { ...STRINGS, description: "What gets created" },
    interfaces: STRINGS,
    data: STRINGS,
    dependencies: { ...STRINGS, description: "Each outside library or service it needs; empty when none" },
    risks: STRINGS,
  },
} as const;

const ADVICE_SCHEMA = {
  type: "object",
  required: ["views"],
  properties: {
    views: {
      type: "array",
      items: {
        type: "object",
        required: ["design", "judgement", "concerns"],
        properties: {
          design: { type: "string", description: "The stance of the design this view is on" },
          judgement: { type: "string", enum: ["proceed", "proceed-with-conditions", "reconsider"] },
          concerns: {
            type: "array",
            items: {
              type: "object",
              required: ["claim", "evidence", "fix"],
              properties: {
                claim: { type: "string" },
                evidence: { type: "string", description: "path:line or the source it rests on" },
                fix: { type: "string", description: "What would resolve it" },
              },
            },
          },
        },
      },
    },
  },
} as const;

const DECISION_SCHEMA = {
  type: "object",
  required: ["viable", "chosen", "grafts", "rejected", "reasons"],
  properties: {
    viable: { type: "boolean", description: "False only when no design can deliver the issue" },
    chosen: { type: "string", description: "The stance of the design to build" },
    grafts: { ...STRINGS, description: "What to take from the other designs" },
    rejected: {
      type: "array",
      items: {
        type: "object",
        required: ["design", "why"],
        properties: { design: { type: "string" }, why: { type: "string" } },
      },
    },
    reasons: { ...STRINGS, description: "Why this design; or, when none is viable, why each one fails" },
  },
} as const;

const SPEC_SCHEMA = {
  type: "object",
  required: ["build", "validate", "claims"],
  properties: {
    build: BUILD,
    validate: VALIDATE,
    claims: { ...STRINGS, description: "Each file, symbol, or API the spec states about existing code" },
  },
} as const;

const CHECK_SCHEMA = {
  type: "object",
  required: ["holds", "location", "problem"],
  properties: {
    holds: { type: "boolean" },
    location: { type: "string", description: "path:line or the item checked" },
    problem: { type: "string", description: "What is wrong; empty when it holds" },
  },
} as const;

const RULING_SCHEMA = {
  type: "object",
  required: ["verdict", "severity", "reason"],
  properties: {
    verdict: { type: "string", enum: ["confirmed", "dismissed"] },
    severity: { type: "string", enum: ["blocker", "major", "minor"] },
    reason: { type: "string" },
  },
} as const;

type SpecResult = Infer<typeof SPEC_SCHEMA>;
type Design = Infer<typeof DESIGN_SCHEMA> & { stance: string };
type Decided = Infer<typeof DECISION_SCHEMA>;

export interface HowInput {
  d: Run;
  where: string;
  story: string;
  storyRevision: string;
  cardId: string;
  specDir: string;
  answers: Answers;
}
export interface HowResult {
  build: Build;
  validate: Validate;
}

const STORY_BLOCK = (o: HowInput): string =>
  `The issue says why and what, and it is the acceptance source. Never change what it asks for:\n<<<ISSUE\n${o.story}\nISSUE>>>`;
const worktree = (o: HowInput): string => o.d.state.worktree;

// ---- Ground and design ------------------------------------------------------

async function ground(o: HowInput): Promise<string> {
  phase("Ground");
  const ask = `${o.where}\n${STORY_BLOCK(o)}\n\nIn the worktree ${worktree(o)}:`;
  const [code, tests, docs, history, library] = await parallel([
    () => scout("scout-code", `${ask} find the code locations, existing symbols, and call paths this issue touches.`),
    () => scout("scout-tests", `${ask} find the tests that cover this area and how to run them.`),
    () => scout("scout-docs", `${ask} find every document making claims about this area.`),
    () => scout("scout-history", `${ask} find when and why behavior in this area changed.`),
    () =>
      agent(`${ask} report what the project library already supports about this issue, with citations.`, {
        agentType: "slopify:library-reader",
        label: "library",
        phase: "Ground",
        schema: CONTEXT_SCHEMA,
      }),
  ]);
  return [
    show("Code", code),
    show("Tests", tests),
    show("Documentation", docs),
    show("History", history),
    `Library: ${library ? `${library.summary}\n${list(library.supported)}` : "the reader returned nothing, which is a gap"}`,
  ].join("\n\n");
}

async function design(o: HowInput, gathered: string, rejectedBefore: readonly string[]): Promise<Design[]> {
  phase("Design");
  const designs = await parallel(
    STANCES.map(
      (stance) => () =>
        agent(
          `${o.where}
${STORY_BLOCK(o)}

Design how to deliver this from one stance: ${stance}. Work alone: other designers take other stances, and you don't see their work. Read the project's full architecture and design documents first; its root instructions name them. Mark what you reuse and what you create, citing path:line, so nobody rebuilds what exists. Change nothing.

What the scouts found:
${gathered}
${rejectedBefore.length > 0 ? `\nEarlier designs were ruled not viable, for these reasons:\n${list(rejectedBefore)}` : ""}`,
          { agentType: "slopify:designer", label: stance, phase: "Design", schema: DESIGN_SCHEMA },
        ),
    ),
  );
  const returned: Design[] = [];
  for (const [i, x] of designs.entries()) {
    if (x) returned.push({ ...x, stance: STANCES[i] ?? "" });
  }
  return returned;
}

// One scout pair per dependency any design names, for the advisors to judge from.
async function researchDependencies(o: HowInput, designs: readonly Design[]): Promise<string> {
  const deps = unique(designs.flatMap((x) => x.dependencies));
  if (deps.length === 0) return "";
  const found = await parallel(
    deps.flatMap((dep) => [
      (): Promise<ScoutResult | null> =>
        scout(
          "scout-upstream-docs",
          `${o.where}\nFind the official docs for ${dep}: versions, limits, and deprecations relevant to this issue:\n${o.story}`,
          { label: `docs: ${dep}`, phase: "Design" },
        ),
      (): Promise<ScoutResult | null> =>
        scout(
          "scout-known-issues",
          `${o.where}\nFind the pitfalls and open bugs in ${dep} relevant to this issue:\n${o.story}`,
          {
            label: `issues: ${dep}`,
            phase: "Design",
          },
        ),
    ]),
  );
  return deps
    .flatMap((dep, i) => [
      show(`Upstream docs for ${dep}`, found[2 * i]),
      show(`Known issues in ${dep}`, found[2 * i + 1]),
    ])
    .join("\n\n");
}

async function advise(o: HowInput, designs: readonly Design[], outside: string): Promise<string> {
  phase("Advise");
  const views = await parallel(
    HOW_ADVISORS.map(
      (name) => () =>
        agent(
          `${o.where}
${STORY_BLOCK(o)}

Compare all of these designs from your one angle, reading the code at ${worktree(o)}. Give a view on each. Each claim cites the code, and each concern says what would fix it. Change nothing.

${JSON.stringify(designs)}
${outside ? `\nOutside evidence:\n${outside}` : ""}`,
          { agentType: `slopify:${name}`, label: name.replace("advisor-", ""), phase: "Advise", schema: ADVICE_SCHEMA },
        ),
    ),
  );
  return HOW_ADVISORS.map((name, i) => `${name}: ${JSON.stringify(views[i]?.views ?? "no view returned")}`).join(
    "\n\n",
  );
}

async function decide(o: HowInput, designs: readonly Design[], advice: string): Promise<Decided> {
  phase("Decide");
  return must(
    await agent(
      `${o.where}
${STORY_BLOCK(o)}

Pick the design to build, and graft in the best of the others. Weigh the advisors' views against their evidence; they advise and you decide. Record what was rejected and why. Rule no design viable only when none of them, even with the advisors' fixes, can deliver the issue.

Designs:
${JSON.stringify(designs)}

Advice:
${advice}`,
      { agentType: "slopify:judge", label: "decide", phase: "Decide", schema: DECISION_SCHEMA },
    ),
    "how",
    "A decision on the designs.",
  );
}

// ---- Spec -------------------------------------------------------------------

const SPEC_FILES = (o: HowInput): string =>
  `Spec folder: ${worktree(o)}/${o.specDir}. It holds build.json, validate.json, and RATIONALE.md, which only ever grows.`;

async function writeSpec(o: HowInput, instruction: string): Promise<SpecResult> {
  phase("Spec");
  return must(
    await callSpecWriter(
      `${o.where}
${STORY_BLOCK(o)}

${SPEC_FILES(o)}

${instruction}

Return build and validate exactly as you wrote them. ${NO_WRITES}`,
      "write the spec",
      "Spec",
      SPEC_SCHEMA,
    ),
    "how",
    "A spec folder.",
  );
}

async function commitSpec(o: HowInput, message: string, phaseTitle: string): Promise<void> {
  const r = await callPusher(
    o.d.pushBrief(
      `Commit the folder ${o.specDir} as it stands, staged by explicit path, with a message in the convention docs/FORGE.md declares, saying: ${message}.${o.cardId ? ` Name the issue ${o.cardId} in it.` : ""} Do not push.`,
      [`done spec ${o.specDir} story ${o.storyRevision}`],
    ),
    "commit the spec",
    phaseTitle,
  );
  if (!pushOk(r) || !opRef(r, "commit")) {
    throw new Halt("how", "A commit of the spec folder.", r?.unmet.join("; ") || "pusher didn't commit it");
  }
}

// ---- Challenge --------------------------------------------------------------

interface SpecProblem {
  location: string;
  problem: string;
}

const check = (name: string, label: string, brief: string) => () =>
  agent(brief, { agentType: `slopify:${name}`, label, phase: "Challenge", schema: CHECK_SCHEMA });
const findingsOf = (v: LensResult): SpecProblem[] =>
  v.findings.map((f) => ({ location: f.location, problem: f.problem }));

async function runChecks(o: HowInput, spec: SpecResult): Promise<SpecProblem[]> {
  const specText = JSON.stringify({ build: spec.build, validate: spec.validate });
  const results = await parallel([
    ...spec.claims.map((claim, i) =>
      check(
        "check-claim",
        `claim ${String(i + 1)}`,
        `${o.where}\nIn the worktree ${worktree(o)}, check that this claim is true of the code: ${claim}`,
      ),
    ),
    ...spec.validate.criteria.map((c) =>
      check(
        "check-criterion",
        `criterion ${c.id}`,
        `${o.where}\nIn the worktree ${worktree(o)}, check this criterion against TESTING.md: that its category matches what TESTING.md says that category covers, and that the category's validation path can check it. A category of uncategorized holds when no category fits.\n${JSON.stringify(c)}`,
      ),
    ),
  ]);
  const lenses = await parallel([
    () =>
      lens(
        "lens-scope",
        `${o.where}\n${STORY_BLOCK(o)}\n\nCheck that this spec covers the issue's criteria and adds and drops no scope:\n${specText}`,
        { label: "scope", phase: "Challenge" },
      ),
    () =>
      lens(
        "lens-consistency",
        `${o.where}\nCheck this spec against the project's rules and documents, in the worktree ${worktree(o)}:\n${specText}`,
        { label: "consistency", phase: "Challenge" },
      ),
  ]);
  return [
    ...results
      .map((r) => must(r, "how", "A check on the spec."))
      .filter((r) => !r.holds)
      .map((r) => ({ location: r.location, problem: r.problem })),
    ...lenses.flatMap((v) => findingsOf(must(v, "how", "A lens on the spec."))),
  ];
}

async function runAttack(o: HowInput): Promise<SpecProblem[]> {
  const views = await parallel(
    HOW_ADVISORS.map(
      (name) => () =>
        agent(
          `${o.where}
${STORY_BLOCK(o)}

${SPEC_FILES(o)} Read all three files.

Try to break this finished spec from your one angle, reading the code it touches. Report each way it fails, as a finding with its location. Change nothing.`,
          {
            agentType: `slopify:${name}`,
            label: `attack: ${name.replace("advisor-", "")}`,
            phase: "Challenge",
            schema: LENS_SCHEMA,
          },
        ),
    ),
  );
  return views.flatMap((v) => findingsOf(must(v, "how", "An advisor's attack on the spec.")));
}

interface RuledSpecProblem extends SpecProblem {
  severity: string;
  reason: string;
}

async function ruleOn(o: HowInput, problems: readonly SpecProblem[]): Promise<RuledSpecProblem[]> {
  const rulings = await parallel(
    problems.map(
      (p, i) => () =>
        agent(
          `${o.where}
${STORY_BLOCK(o)}

${SPEC_FILES(o)}

Rule on one problem reported against the spec, checking it against the code. blocker: building this spec can't deliver the issue. major: a real flaw that should be fixed before building. minor: real but low impact.

At ${p.location}:
${p.problem}`,
          { agentType: "slopify:judge", label: `rule ${String(i + 1)}`, phase: "Challenge", schema: RULING_SCHEMA },
        ),
    ),
  );
  const confirmed: RuledSpecProblem[] = [];
  for (const [i, p] of problems.entries()) {
    const r = must(rulings[i], "how", `A ruling on ${p.location}.`);
    if (r.verdict === "confirmed") confirmed.push({ ...p, severity: r.severity, reason: r.reason });
  }
  return confirmed;
}

const problemLines = (problems: readonly RuledSpecProblem[]): string[] =>
  problems.map((p) => `${p.severity}: ${p.location}: ${p.problem} (${p.reason})`);

// An irreversible choice needs the issue's explicit permission. Without it, only its reversible part is built, and the
// rest is left to a person, so the rule needs no judge.
function unpermitted(build: Build): RuledSpecProblem[] {
  return build.decisions
    .filter((d) => !d.reversible && !d.permission.trim())
    .map((d) => ({
      location: `decision ${d.id}`,
      problem: `"${d.choice}" can't be undone, and the issue doesn't explicitly permit it. Build only its reversible part, and move the rest to manualActions.`,
      severity: "blocker",
      reason: "An irreversible change needs explicit permission in the issue.",
    }));
}

// Returns the challenged spec, or the blockers still open after the last round.
async function challenge(o: HowInput, first: SpecResult): Promise<{ spec: SpecResult; blockers: string[] }> {
  let spec = first;
  let open: RuledSpecProblem[] = [];
  for (let n = 1; n <= MAX_CHALLENGE_ROUNDS; n += 1) {
    phase("Challenge");
    const [checked, attacked] = await parallel([() => runChecks(o, spec), () => runAttack(o)]);
    open = [
      ...unpermitted(spec.build),
      ...(await ruleOn(o, [
        ...must(checked, "how", "The spec's checks."),
        ...must(attacked, "how", "The advisors' attack on the spec."),
      ])),
    ];
    const toFix = open.filter((p) => p.severity !== "minor");
    if (toFix.length === 0) return { spec, blockers: [] };
    if (n === MAX_CHALLENGE_ROUNDS) break;
    spec = await writeSpec(
      o,
      `Revise the spec for these confirmed problems, and append each ruling to RATIONALE.md:\n${list(problemLines(toFix))}`,
    );
    await commitSpec(o, "revise the spec after its challenge", "Challenge");
  }
  const leftOver = problemLines(open.filter((p) => p.severity !== "minor"));
  const stillBlocking = problemLines(open.filter((p) => p.severity === "blocker"));
  if (stillBlocking.length === 0 && leftOver.length > 0) {
    spec = await writeSpec(
      o,
      `Record these open problems as risks in RATIONALE.md, changing nothing else:\n${list(leftOver)}`,
    );
    await commitSpec(o, "record the spec's open risks", "Challenge");
  }
  return { spec, blockers: stillBlocking };
}

// ---- The phase --------------------------------------------------------------

/** How the how phase failed: every design ruled out, or a blocker left in the spec after all its rounds. */
export interface HowExhausted {
  exhausted: string[];
}

async function chooseDesign(
  o: HowInput,
  gathered: string,
): Promise<HowExhausted | { decided: Decided; designs: Design[] }> {
  let reasons: string[] = [];
  for (let attempt = 1; attempt <= MAX_DESIGN_TRIES; attempt += 1) {
    const designs = await design(o, gathered, reasons);
    if (designs.length === 0) throw new Halt("how", "At least one design.", "every designer failed to return");
    const outside = await researchDependencies(o, designs);
    const advice = await advise(o, designs, outside);
    const decided = await decide(o, designs, advice);
    if (decided.viable) return { decided, designs };
    reasons = [...reasons, ...decided.reasons];
  }
  return { exhausted: reasons };
}

export async function runHow(o: HowInput): Promise<HowResult | HowExhausted> {
  const gathered = await ground(o);
  const chosen = await chooseDesign(o, gathered);
  if ("exhausted" in chosen) return chosen;
  const { decided, designs } = chosen;
  const spec = await writeSpec(
    o,
    `Write the spec folder from this decision. Copy each criterion's wording from the issue word for word, and file each under a TESTING.md category, or uncategorized when none fits. Record the designs, the advice, and what was rejected in RATIONALE.md.

Decision:
${JSON.stringify(decided)}

The designs:
${JSON.stringify(designs)}

What the scouts found:
${gathered}`,
  );
  await commitSpec(o, "add the spec", "Spec");
  const challenged = await challenge(o, spec);
  return challenged.blockers.length > 0
    ? { exhausted: challenged.blockers }
    : { build: challenged.spec.build, validate: challenged.spec.validate };
}

/** A later round found the spec wrong: the advisors weigh in, the writer revises, and the tasks it changed run again. */
export function specReviser(o: HowInput) {
  return async (problems: readonly string[]): Promise<HowResult & { rerun: Task[] }> => {
    phase("Advise");
    const before = await attackFor(o, problems);
    const spec = await writeSpec(
      o,
      `Building showed the spec is wrong. Revise it for these problems, and append them and the advice to RATIONALE.md:\n${list(problems)}\n\nThe advisors' views:\n${list(before)}`,
    );
    await commitSpec(o, "revise the spec", "Spec");
    // The writer's task list is the whole spec, so every task whose files or criteria a problem names runs again.
    const named = (t: Task): boolean =>
      problems.some((p) => [t.id, ...t.files, ...t.criteria].some((x) => p.includes(x)));
    const rerun = spec.build.tasks.filter((t) => named(t));
    return { build: spec.build, validate: spec.validate, rerun: rerun.length > 0 ? rerun : spec.build.tasks };
  };
}

async function attackFor(o: HowInput, problems: readonly string[]): Promise<string[]> {
  const views = await parallel(
    HOW_ADVISORS.map(
      (name) => () =>
        agent(
          `${o.where}
${STORY_BLOCK(o)}

${SPEC_FILES(o)} Read all three files.

Building showed the spec is wrong. From your one angle, say what should change. Each finding gives its location and the change. Change nothing.

${list(problems)}`,
          { agentType: `slopify:${name}`, label: name.replace("advisor-", ""), phase: "Advise", schema: LENS_SCHEMA },
        ),
    ),
  );
  return views.flatMap((v) =>
    findingsOf(must(v, "how", "An advisor's view.")).map((f) => `${f.location}: ${f.problem}`),
  );
}
