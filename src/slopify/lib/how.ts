// deliver-story's how phase: three independent designs, opus advisors, one decision, a spec folder, and a challenge
// that tries to break it. The issue says why and what; this decides how, so choices here are made, never asked.
import { dispatch } from "./dispatch.ts";
import {
  LENS_SCHEMA,
  STRINGS,
  defectsOf,
  lens,
  scout,
  type Answers,
  type LensResult,
  type ScoutResult,
} from "./family.ts";
import {
  NO_WRITES,
  callPusher,
  callSpecWriter,
  commitRepairing,
  list,
  opRef,
  pushOk,
  show,
  unique,
} from "./deliver.ts";
import { Halt, must, type Run } from "./loop.ts";
import { MAX_DESIGN_TRIES, MAX_FIX_ROUNDS } from "./rules.ts";
import { BUILD, VALIDATE, type Build, type Task, type Validate } from "./spec.ts";

const STANCES = [
  { name: "smallest change", stance: "the smallest change that fits the existing patterns" },
  { name: "long-term structure", stance: "the best long-term structure" },
  { name: "robust under failure", stance: "the most robust under failure" },
] as const;

const HOW_ADVISORS = [
  "advisor-architecture",
  "advisor-performance",
  "advisor-risk",
  "advisor-security",
  "advisor-testability",
  "advisor-simplify",
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
    dependencies: {
      type: "array",
      description:
        "Each outside library or service it relies on, never the project's own code, tools, or agents; empty when none",
      items: {
        type: "object",
        required: ["name", "reliesOn", "new"],
        properties: {
          name: { type: "string", description: "Its name alone, such as its package name" },
          reliesOn: { type: "string", description: "The part of it the design relies on, such as an API or feature" },
          new: {
            type: "boolean",
            description: "True when the project doesn't use it yet, or doesn't use that part of it yet",
          },
        },
      },
    },
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
  required: ["holds", "location"],
  properties: {
    holds: { type: "boolean" },
    location: { type: "string", description: "path:line or the item checked" },
    problem: { type: "string", description: "What is wrong; left out when it holds" },
  },
} as const;

// A spec problem the challenge acts on. Nothing acts on a minor one, so no agent reports or confirms it.
const SPEC_PROBLEM = {
  type: "object",
  required: ["location", "problem", "severity", "reason", "kind"],
  properties: {
    location: { type: "string", description: "The spec file and item, or path:line" },
    problem: { type: "string", description: "What is wrong and what would fix it" },
    severity: {
      type: "string",
      enum: ["blocker", "major"],
      description: "blocker: building this spec can't deliver the issue. major: a real flaw to fix before building",
    },
    reason: { type: "string", description: "The evidence it rests on, path:line or source" },
    kind: {
      type: "string",
      enum: ["spec", "decision"],
      description:
        "spec: a revision of the spec can fix it. decision: the issue's own criteria conflict or can be read more than one way, so only a person can settle what they mean",
    },
  },
} as const;

const ATTACK_SCHEMA = {
  type: "object",
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      description: "Each blocker or major way the spec fails; empty when there is none",
      items: SPEC_PROBLEM,
    },
  },
} as const;

const CHALLENGE_RULING_SCHEMA = {
  type: "object",
  required: ["problems"],
  properties: {
    problems: {
      type: "array",
      description: "Each distinct blocker or major problem the reported findings show; empty when none holds",
      items: SPEC_PROBLEM,
    },
  },
} as const;

type SpecResult = Infer<typeof SPEC_SCHEMA>;
type RuledSpecProblem = Infer<typeof SPEC_PROBLEM>;
// An advisor's finding remembers which advisor reported it, so only that advisor checks the revision for it.
type OpenProblem = RuledSpecProblem & { by?: (typeof HOW_ADVISORS)[number] };
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
      dispatch(`${ask} report what the project library already supports about this issue, with citations.`, {
        agentType: "slopify:library-reader",
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
      ({ name, stance }) =>
        () =>
          dispatch(
            `${o.where}
${STORY_BLOCK(o)}

Design how to deliver this from one stance: ${stance}. Work alone: other designers take other stances, and you don't see their work. Read the project's full architecture and design documents first; its root instructions name them. Mark what you reuse and what you create, citing path:line, so nobody rebuilds what exists. Change nothing.

What the scouts found:
${gathered}
${rejectedBefore.length > 0 ? `\nEarlier designs were ruled not viable, for these reasons:\n${list(rejectedBefore)}` : ""}`,
            { agentType: "slopify:designer", label: name, phase: "Design", schema: DESIGN_SCHEMA },
          ),
    ),
  );
  const returned: Design[] = [];
  for (const [i, x] of designs.entries()) {
    if (x) returned.push({ ...x, stance: STANCES[i]?.stance ?? "" });
  }
  return returned;
}

// What a project already uses the way a design uses it has nothing new to look up, so only the new parts of outside
// dependencies get scouts: one pair per name, whichever designs name it.
function newDependencies(designs: readonly Design[]): Record<string, string[]> {
  const byName: Record<string, string[]> = {};
  const named = designs.flatMap((x) => x.dependencies);
  for (const dep of named) {
    if (!dep.new) continue;
    const name = dep.name.trim().toLowerCase();
    byName[name] = unique([...(byName[name] ?? []), dep.reliesOn]);
  }
  return byName;
}

// One scout pair per new dependency, for the advisors to judge from.
async function researchDependencies(o: HowInput, designs: readonly Design[]): Promise<string> {
  const byName = newDependencies(designs);
  const deps = Object.keys(byName);
  if (deps.length === 0) return "";
  const usage = (dep: string): string => `The designs rely on:\n${list(byName[dep])}`;
  const found = await parallel(
    deps.flatMap((dep) => [
      (): Promise<ScoutResult | null> =>
        scout(
          "scout-upstream-docs",
          `${o.where}\nFind the official docs for ${dep}: versions, limits, and deprecations relevant to this issue.\n${usage(dep)}\n\nThe issue:\n${o.story}`,
          { label: `docs: ${dep}`, phase: "Design" },
        ),
      (): Promise<ScoutResult | null> =>
        scout(
          "scout-known-issues",
          `${o.where}\nFind the pitfalls and open bugs in ${dep} relevant to this issue.\n${usage(dep)}\n\nThe issue:\n${o.story}`,
          { label: `issues: ${dep}`, phase: "Design" },
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
        dispatch(
          `${o.where}
${STORY_BLOCK(o)}

Compare all of these designs from your one angle, reading the code at ${worktree(o)}. Give a view on each. Each claim cites the code, and each concern says what would fix it. Change nothing.

${JSON.stringify(designs)}
${outside ? `\nOutside evidence:\n${outside}` : ""}`,
          { agentType: `slopify:${name}`, phase: "Advise", schema: ADVICE_SCHEMA },
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
    await dispatch(
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
  `Spec folder: ${worktree(o)}/${o.specDir}. It holds build.json, validate.json, and RATIONALE.md, which says why the spec is what it is now.`;

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

// The writer fixes what a commit hook reports, so the spec returned is the one committed.
async function writeAndCommit(
  o: HowInput,
  instruction: string,
  message: string,
  phaseTitle: string,
): Promise<SpecResult> {
  let spec = await writeSpec(o, instruction);
  const send = () =>
    callPusher(
      o.d.pushBrief(
        `Commit the folder ${o.specDir} as it stands, staged by explicit path, with a message in the convention docs/FORGE.md declares, saying: ${message}. Name the issue ${o.cardId} in it. Do not push.`,
        [`done spec ${o.specDir} story ${o.storyRevision}`],
      ),
      "commit the spec",
      phaseTitle,
    );
  const r = await commitRepairing([o.specDir], send, async (brief) => {
    spec = await writeSpec(o, brief);
  });
  if (!pushOk(r) || !opRef(r, "commit")) {
    throw new Halt("how", "A commit of the spec folder.", r?.unmet.join("; ") || "pusher didn't commit it");
  }
  return spec;
}

// ---- Challenge --------------------------------------------------------------

interface SpecProblem {
  location: string;
  problem: string;
}

// Each challenge round otherwise asks for more precision, and each revision adds it, so the spec drifts into the code.
const CODERS_CHOICE =
  "How a task implements a requirement inside its own files is its coder's decision: a finding that only asks the spec for more precision there, such as a constant, a pattern, a string, or step-by-step logic, is out of scope. An interface two tasks share is in scope.";
const ABOVE_CODE =
  "Fix each at the spec's level, which stops above the code. Prefer removing detail to adding it: never add a constant value, a pattern, a string the issue doesn't name, or call-by-call steps, and remove any the problems name.";

const check = (name: string, label: string, brief: string) => () =>
  dispatch(brief, { agentType: `slopify:${name}`, label, phase: "Challenge", schema: CHECK_SCHEMA });
const findingsOf = (v: LensResult): SpecProblem[] =>
  defectsOf(v).map((f) => ({ location: f.location, problem: f.problem }));

// The claims and criteria that held in an earlier round. The code doesn't change during the challenge, so one that held
// and kept its wording holds still and isn't checked again.
const claimKey = (claim: string): string => `claim ${claim}`;
const criterionKey = (c: SpecResult["validate"]["criteria"][number]): string => `criterion ${JSON.stringify(c)}`;

async function runChecks(o: HowInput, spec: SpecResult, held: Set<string>): Promise<SpecProblem[]> {
  const specText = JSON.stringify({ build: spec.build, validate: spec.validate });
  const claims = spec.claims.filter((c) => !held.has(claimKey(c)));
  const criteria = spec.validate.criteria.filter((c) => !held.has(criterionKey(c)));
  const results = await parallel([
    ...claims.map((claim, i) =>
      check(
        "check-claim",
        `claim ${String(i + 1)}`,
        `${o.where}\nIn the worktree ${worktree(o)}, check that this claim is true of the code: ${claim}`,
      ),
    ),
    ...criteria.map((c) =>
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
        `${o.where}\n${STORY_BLOCK(o)}\n\nCheck that this spec covers the issue's criteria and adds and drops no scope. ${CODERS_CHOICE}\n${specText}`,
        { phase: "Challenge" },
      ),
    () =>
      lens(
        "lens-consistency",
        `${o.where}\nCheck this spec against the project's rules and documents, in the worktree ${worktree(o)}. ${CODERS_CHOICE}\n${specText}`,
        { phase: "Challenge" },
      ),
    () =>
      lens(
        "lens-altitude",
        `${o.where}\nCheck that this spec stops above the code and keeps to its size budget, in the worktree ${worktree(o)}:\n${specText}`,
        { phase: "Challenge" },
      ),
  ]);
  const checked = results.map((r) => must(r, "how", "A check on the spec."));
  const keys = [...claims.map((c) => claimKey(c)), ...criteria.map((c) => criterionKey(c))];
  for (const [i, r] of checked.entries()) if (r.holds) held.add(keys[i] ?? "");
  return [
    ...checked.filter((r) => !r.holds).map((r) => ({ location: r.location, problem: r.problem ?? "" })),
    ...lenses.flatMap((v) => findingsOf(must(v, "how", "A lens on the spec."))),
  ];
}

const FULL_ATTACK = `Try to break this finished spec from your one angle, reading the code it touches. Report only what must change before building: a blocker or a major, each with its location and evidence. ${CODERS_CHOICE}`;

// A conflict in the issue's own criteria is settled as a decision the person confirms, so it isn't reported again.
const SETTLED =
  "A problem the spec records as a decision with affectsAcceptance true is settled for the person to confirm; don't report it again.";

// After a revision, an advisor checks the revision for its own findings rather than attack the whole spec again.
const revisionCheck = (revisedFor: readonly RuledSpecProblem[]): string =>
  `The spec was revised for these problems you reported:\n${list(problemLines(revisedFor))}\n\nFrom your one angle, reading the code it touches, report each of them the revision didn't fix, and each blocker or major the revision itself introduced, each with its location and evidence. Don't attack again what the revision left unchanged. ${CODERS_CHOICE}`;

// The first round has every advisor attack the spec. A later round has only the advisors whose findings the revision
// was for check it; the cheap checks and the judge run every round and cover the rest.
async function runAttack(o: HowInput, revisedFor: readonly OpenProblem[] | null): Promise<OpenProblem[]> {
  const advisors = revisedFor ? HOW_ADVISORS.filter((name) => revisedFor.some((p) => p.by === name)) : HOW_ADVISORS;
  const views = await parallel(
    advisors.map((name) => async () => {
      const own = revisedFor?.filter((p) => p.by === name);
      const v = await dispatch(
        `${o.where}
${STORY_BLOCK(o)}

${SPEC_FILES(o)} Read all three files.

${own ? revisionCheck(own) : FULL_ATTACK} Leave out anything minor, because nothing acts on it. ${SETTLED} Change nothing.`,
        {
          agentType: `slopify:${name}`,
          label: own ? "check the revision" : "attack the spec",
          phase: "Challenge",
          schema: ATTACK_SCHEMA,
        },
      );
      return must(v, "how", "An advisor's attack on the spec.").findings.map((f) => ({ ...f, by: name }));
    }),
  );
  return views.flatMap((v) => must(v, "how", "An advisor's attack on the spec."));
}

// One judge rules on every finding the cheap checks reported in a round, so it reads the spec and the code once and
// can merge findings that report the same problem. The advisors' findings need no judge.
async function ruleOn(
  o: HowInput,
  reported: readonly SpecProblem[],
  advised: readonly RuledSpecProblem[],
): Promise<RuledSpecProblem[]> {
  if (reported.length === 0) return [];
  const r = await dispatch(
    `${o.where}
${STORY_BLOCK(o)}

${SPEC_FILES(o)}

Cheap checks reported these findings against the spec. Rule on all of them, checking each against the code, and merge findings that report the same problem. Return each distinct problem that holds as a blocker or a major. Leave out what doesn't hold, what is minor (real but low impact), and what an advisor's finding below already covers. ${CODERS_CHOICE} A finding that the spec holds such detail, or is over its size budget, holds as a major. ${SETTLED}

Reported findings:
${list(reported.map((p) => `${p.location}: ${p.problem}`))}

The advisors' findings, which the spec is revised for already:
${list(advised.map((p) => `${p.location}: ${p.problem}`))}`,
    { agentType: "slopify:judge", label: "rule on the findings", phase: "Challenge", schema: CHALLENGE_RULING_SCHEMA },
  );
  return must(r, "how", "The rulings on the spec's findings.").problems;
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
      kind: "spec",
    }));
}

// A problem that only a person can settle is escalated, never revised around: the writer picks the most reasonable
// reading, and the decision reaches the person through the PR's Needs confirmation section.
const escalation = (decide: readonly RuledSpecProblem[]): string =>
  decide.length > 0
    ? `\n\nNo revision can settle these, because the issue's own criteria conflict or can be read more than one way. Record each as a decision with affectsAcceptance true: pick the most reasonable reading, cite what grounds it, and build the spec on it:\n${list(problemLines(decide))}`
    : "";

// Returns the challenged spec, or the blockers still open after the last round.
async function challenge(o: HowInput, first: SpecResult): Promise<{ spec: SpecResult; blockers: string[] }> {
  let spec = first;
  let open: OpenProblem[] = [];
  let decide: OpenProblem[] = [];
  const held = new Set<string>();
  for (let revisions = 0; revisions <= MAX_FIX_ROUNDS; revisions += 1) {
    phase("Challenge");
    const revisedFor = revisions === 0 ? null : open;
    const [checked, attacked] = await parallel([() => runChecks(o, spec, held), () => runAttack(o, revisedFor)]);
    const advised = must(attacked, "how", "The advisors' attack on the spec.");
    const found: OpenProblem[] = [
      ...unpermitted(spec.build),
      ...advised,
      ...(await ruleOn(o, must(checked, "how", "The spec's checks."), advised)),
    ];
    decide = found.filter((p) => p.kind === "decision");
    open = found.filter((p) => p.kind !== "decision");
    if (open.length === 0 && decide.length === 0) return { spec, blockers: [] };
    if (open.length === 0) {
      spec = await writeAndCommit(o, escalation(decide).trimStart(), "record the spec's open decisions", "Challenge");
      return { spec, blockers: [] };
    }
    if (revisions === MAX_FIX_ROUNDS) break;
    spec = await writeAndCommit(
      o,
      `Revise the spec for these problems, and update RATIONALE.md with each one and its reason. ${ABOVE_CODE}\n${list(problemLines(open))}${escalation(decide)}`,
      "revise the spec after its challenge",
      "Challenge",
    );
  }
  const stillBlocking = problemLines(open.filter((p) => p.severity === "blocker"));
  if (stillBlocking.length === 0) {
    spec = await writeAndCommit(
      o,
      `Record these open problems as risks in RATIONALE.md${decide.length > 0 ? "" : ", changing nothing else"}:\n${list(problemLines(open))}${escalation(decide)}`,
      "record the spec's open risks",
      "Challenge",
    );
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
  const spec = await writeAndCommit(
    o,
    `Write the spec folder from this decision. Copy each criterion's wording from the issue word for word, and file each under a TESTING.md category, or uncategorized when none fits. Record the designs, the advice, and what was rejected in RATIONALE.md.

Decision:
${JSON.stringify(decided)}

The designs:
${JSON.stringify(designs)}

What the scouts found:
${gathered}`,
    "add the spec",
    "Spec",
  );
  return challengeSpec(o, spec);
}

/** Challenge a spec an earlier run committed but didn't finish challenging. Its claims went with that run, so only the
 * criteria checks, the lenses, and the advisors test it. */
export const challengeCommitted = (o: HowInput, build: Build, validate: Validate): Promise<HowResult | HowExhausted> =>
  challengeSpec(o, { build, validate, claims: [] });

// A finished challenge is checkpointed, so a rerun goes straight to the build. A missing line only costs that rerun
// the challenge again, so pusher's result stops nothing.
async function challengeSpec(o: HowInput, spec: SpecResult): Promise<HowResult | HowExhausted> {
  const challenged = await challenge(o, spec);
  if (challenged.blockers.length > 0) return { exhausted: challenged.blockers };
  await callPusher(
    o.d.pushBrief("Perform no operation other than appending the ledger line below.", [`done challenge ${o.specDir}`]),
    "record the challenge",
    "Challenge",
  );
  return { build: challenged.spec.build, validate: challenged.spec.validate };
}

/** A later round found the spec wrong: the advisors weigh in, the writer revises, and the tasks it changed run again. */
export function specReviser(o: HowInput) {
  return async (
    problems: readonly string[],
    previous: { build: Build | null; validate: Validate | null },
  ): Promise<HowResult & { rerun: Task[] }> => {
    phase("Advise");
    const before = await attackFor(o, problems);
    const spec = await writeAndCommit(
      o,
      `Building showed the spec is wrong. Revise it for these problems, and update RATIONALE.md with them and the advice:\n${list(problems)}\n\nThe advisors' views:\n${list(before)}`,
      "revise the spec",
      "Spec",
    );
    // The writer's task list is the whole spec, so the tasks the revision affects run again: each task whose id, files, or
    // criteria a problem names, and each task that is new or differs from before, in itself or in one of its criteria.
    // Every change brief carries the shared constraints, so a revision of them affects every task.
    const sharedChanged = JSON.stringify(previous.build?.shared ?? []) !== JSON.stringify(spec.build.shared);
    const named = (t: Task): boolean =>
      problems.some((p) => [t.id, ...t.files, ...t.criteria].some((x) => p.includes(x)));
    const criteriaOf = (v: Validate | null, t: Task) =>
      JSON.stringify((v?.criteria ?? []).filter((c) => t.criteria.includes(c.id)));
    const changed = (t: Task): boolean => {
      const old = previous.build?.tasks.find((x) => x.id === t.id);
      return (
        !old ||
        JSON.stringify(old) !== JSON.stringify(t) ||
        criteriaOf(previous.validate, t) !== criteriaOf(spec.validate, t)
      );
    };
    return {
      build: spec.build,
      validate: spec.validate,
      rerun: spec.build.tasks.filter((t) => sharedChanged || named(t) || changed(t)),
    };
  };
}

async function attackFor(o: HowInput, problems: readonly string[]): Promise<string[]> {
  const views = await parallel(
    HOW_ADVISORS.map(
      (name) => () =>
        dispatch(
          `${o.where}
${STORY_BLOCK(o)}

${SPEC_FILES(o)} Read all three files.

Building showed the spec is wrong. From your one angle, say what should change. Each finding gives its location and the change. Change nothing.

${list(problems)}`,
          { agentType: `slopify:${name}`, phase: "Advise", schema: LENS_SCHEMA },
        ),
    ),
  );
  return views.flatMap((v) =>
    findingsOf(must(v, "how", "An advisor's view.")).map((f) => `${f.location}: ${f.problem}`),
  );
}
