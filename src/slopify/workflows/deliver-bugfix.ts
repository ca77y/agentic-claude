import { scout, lens, slugged, settledText, settleDecisions, type Answers, type Decision } from "../lib/family.ts";
import {
  CODER_SCHEMA,
  NO_WRITES,
  DIRTY_SENTENCE,
  DECIDE,
  candidateNote,
  need,
  list,
  unique,
  show,
  passed,
  blockingOf,
  findingText,
  pushOk,
  opRef,
  callWriter,
  callCoder,
  callQa,
  callPusher,
  createDeliver,
  type Attempt,
  type BlockingFinding,
  type CoderResult,
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
  lensGate as runLensGate,
  judgeCandidate,
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
  name: "deliver-bugfix",
  description:
    "Deliver a bug fix through a verified pull request: scouts gather evidence, a coder writes a regression test that shows the failure and a fresh lens-repro confirms it, a writer writes a spec only as large as the fix that a fresh lens-scope must pass, a coder fixes, a fresh qa and lens-regression validate that the test fails before the fix and passes after it, pusher publishes, and review-pr runs the review loop",
  whenToUse:
    "Run only when the user invokes /slopify:deliver-bugfix or asks for the slopify deliver-bugfix workflow. Args: {bug, projectRoot?, answers?}, or the bug as a plain string; bug is a card identifier or URL, or the report text; projectRoot defaults to the session project directory; answers maps a decision id from a blocked result to its answer when rerunning.",
  phases: [
    {
      title: "Locate",
      detail: "scout-card reads the report, then scout-checkpoint reports the run's durable state",
    },
    {
      title: "Workspace",
      detail: "pusher creates or recovers the worktree and starts delivery",
    },
    {
      title: "Gather",
      detail: "scout-code, scout-tests, and scout-history in parallel",
    },
    {
      title: "Reproduce",
      detail: "coder writes a regression test that shows the failure; lens-repro judges it",
    },
    {
      title: "Spec",
      detail: "writer writes the small spec: bug, cause, fix, test, verification",
    },
    {
      title: "Spec gate",
      detail:
        "lens-scope (and lens-consistency when the spec changes a documented contract) must pass; pusher commits the spec and the test",
    },
    { title: "Fix", detail: "coder fixes and leaves the regression test as it is" },
    {
      title: "Validate",
      detail: "qa and lens-regression judge the candidate; pusher commits the fix",
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

const REPRO_CODER_SCHEMA = {
  ...CODER_SCHEMA,
  required: [...CODER_SCHEMA.required, "steps", "observed"],
} as const;

type ReproResult = Infer<typeof REPRO_CODER_SCHEMA>;
/** The committed or just-passed regression test. */
interface Repro {
  tests: string[];
  files: string[];
  revision: string;
  observed: string;
  steps: string[];
}
type Step = { stop: Stopped } | { mismatch: string } | { ok: true; candidate: string };
interface Validation {
  cand: string;
  findings: BlockingFinding[] | null;
  prior: string[];
}
interface Fixed {
  status: "done";
  workflow: string;
  skipped: string[];
  attempts: Attempt[];
  completed: string[];
  pr: string;
  spec: string;
  regressionTests: string[];
  verification: Verification[];
  review: ReviewDone;
  limits: string[];
  report: string;
}

// ---- Args -------------------------------------------------------------------

function inputFrom(a: unknown): { storyArg: string; projectRoot: string; answers: Answers } {
  const input = inputOf(a, "bug");
  return {
    storyArg: textOf(input["bug"]),
    projectRoot: textOf(input["projectRoot"]),
    answers: answersOf(input["answers"]),
  };
}

// What is wrong with a regression-test attempt, to retry with; '' when the lens should judge it.
function reproProblem(r: ReproResult | null): string {
  if (!r) return "the coder did not return";
  if (r.tests.length === 0)
    return `the coder wrote no regression test${r.open.length > 0 ? `: ${r.open.join("; ")}` : ""}`;
  return r.revision.trim() ? "" : "the coder returned no revision for the regression test";
}

// The paths the fix may write: its task's and the documentation's.
function fixPaths(plan: Plan): string[] {
  return unique([...plan.tasks.flatMap((t) => t.paths), ...plan.docs]);
}

export default async function run(): Promise<NotStarted | Stopped | Fixed> {
  const { storyArg, projectRoot, answers } = inputFrom(args);

  if (!storyArg) {
    return {
      status: "not-started",
      next: "Ask the user for the bug: a card identifier or URL, or the report text. Then invoke again.",
    };
  }

  // ---- Constants and state ----------------------------------------------------

  const WORKFLOW = "deliver-bugfix";

  const d = createDeliver({
    workflow: WORKFLOW,
    maxFailures: 3,
    planPhase: "Fix", // the phase recoverPlan reports under
    failures: { reproduce: 0, spec: 0, implementation: 0 },
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
    judge,
    record,
    pushBrief,
    pushStop,
    makeReport,
  } = d;

  // ---- Locate -----------------------------------------------------------------

  phase("Locate");
  const cardRes = await scout(
    "scout-card",
    `${WHERE}
Read the one card this delivery names, through the read bindings in docs/BOARD.md, or, when the argument below is the bug report text itself, take that text as the report. Report these evidence items, each with source set to the item name and excerpt set to its value; leave out an item that does not exist:
- card: the card identifier, or none when the argument is report text or there is no board
- story-source: card, text, or none
- story: the report text exactly as you wrote it for hashing (title line, empty line, body), or the argument verbatim for report text
- story-revision: the story revision digest
- field-re: the field regex you used for it
- branch: the branch name the board gives the card, or the single word none
- spec-path: the repository-relative spec path docs/BOARD.md's naming gives this card, built from the card identifier and the card title's lowercase kebab slug as the declaration's pattern says (for example docs/specs/<identifier>-<slug>.md), or the single word none
- relations: related, blocking, and blocked-by cards
- linked-specs: specs the card links
Change nothing on the board or forge.

Argument:
<<<ARG
${storyArg}
ARG>>>`,
    { label: "read the bug report", phase: "Locate" },
  );
  const located = locate(d, cardRes, storyArg, slugged(storyArg, "story"), {
    readable: "A readable bug report: the card, or the report text.",
    input: "A bug report the board can read, or the report text (pass it as args.bug).",
    arg: "bug",
    criteria: false,
  });
  if ("stop" in located) return located.stop;
  const { story, storyRevision, cardId, boardBranch, slug, specRel } = located;
  const STORY_BLOCK = `The bug report, verbatim, is the acceptance source (story revision ${storyRevision}):
<<<BUG
${story}
BUG>>>`;

  const adopted = await checkpoint(d, {
    delivery: `the fix for ${cardId ? `card ${cardId}` : `the bug "${slug}"`}`,
    boardBranch,
    specNoun: "The spec path",
    specRel,
    tests: true,
  });
  if ("stop" in adopted) return adopted.stop;
  const { cp: cpRes, dirty: cpDirty } = adopted;
  // With the spec already on disk, its revision is its checkpointed hash until a writer revises it.
  let specRevision = state.specHash;
  const { doneSpec, doneImpl, ledgerTests, boardStartDone, boardPrDone, specCurrent, implCurrent, publishCurrent } =
    currencyOf(d, cpRes, { cardId, storyRevision, tests: true });
  // An earlier run's fix can sit uncommitted in the worktree after the spec stopped being current (a spec
  // revised by a gate that ran out, or a changed card). The regression test is on the ledger: reuse it instead
  // of reproducing a bug the fix already fixed, and carry the earlier edit into the fix and its commit. The
  // fix is there when the ledger records it as implemented or a dirty path is neither a test nor the spec.
  const fixInPlace =
    !specCurrent &&
    ledgerTests.length > 0 &&
    (!!doneImpl || cpDirty.some((p) => !within(p, specRel) && ledgerTests.every((t) => !within(p, t))));
  const carryDirty = specCurrent || fixInPlace;
  done("locate");

  // ---- Workspace --------------------------------------------------------------

  const workspaceStop = await workspace(d, {
    cardId,
    boardBranch,
    boardStartDone,
    specRel,
    worktree: "the worktree",
    subject: `the fix of ${cardId ? `card ${cardId}` : `the bug "${slug}"`}`,
  });
  if (workspaceStop) return workspaceStop;

  // ---- Gather, reproduce, spec ------------------------------------------------

  let plan: Plan | null = null;
  let gathered = "";
  let repro: Repro = { tests: [], files: [], revision: "", observed: "", steps: [] }; // the committed or just-passed regression test
  let specCommit = doneSpec ? doneSpec.commit : "";
  const fixTouched = new Set<string>(); // paths the fix coder reported changing, for the commit
  // Dirty paths this run found outside its assigned paths: reported, not committed, kept from the review loop,
  // and recorded on the ledger. A rerun that skips the commit reads them back from the ledger.
  const outsideDirty = excludedOf(d, cpRes);
  const fixTests = new Set<string>(); // tests the fix coder added for a finding; they join the fix's commit scope
  const touched = new Set<string>();

  if (specCurrent || fixInPlace) {
    repro.tests = ledgerTests.map((t) => rel(t)).filter(Boolean);
    repro.files = repro.tests;
  }

  const isSpec = (p: string): boolean => within(p, state.specPath);

  // A coder writes a regression test that shows the reported failure.
  async function writeReproTest(pending: readonly string[]): Promise<ReproResult | null> {
    const dirtyNow = unique([...(specCurrent ? [] : cpDirty), ...touched]).filter((p) => !isSpec(p));
    const r = await callCoder(
      `${WHERE}
Work in the worktree ${state.worktree}; address every file by absolute path under it. ${NO_WRITES}

Write a regression test that shows the reported failure, and change no production code: write only test files and test support, in the project's test location. The test must fail now, for the reported reason. Run it to show that, and return the tests you wrote or changed, the steps to reproduce, and what you observed. Report the revision you leave as your instructions describe. If you cannot reproduce the failure, say so in open and leave tests empty.

${STORY_BLOCK}

Evidence:
${gathered}
${dirtyNow.length > 0 ? `\n${DIRTY_SENTENCE}\nPaths:\n${list(dirtyNow)}\n` : ""}${pending.length > 0 ? `\nResolve these findings:\n${list(pending)}\n` : ""}`,
      "write the regression test",
      "Reproduce",
      REPRO_CODER_SCHEMA,
    );
    if (r) for (const p of [...r.changed, ...r.tests]) touched.add(rel(p));
    return r;
  }

  // A fresh lens-repro judges the test. Returns null once it passes, else the findings to carry or the stop.
  async function judgeRepro(
    r: ReproResult,
    carry: readonly string[],
  ): Promise<{ stop: Stopped } | { carry: string[] } | null> {
    const jr = await judge(
      [
        {
          name: "lens-repro",
          call: () =>
            lens(
              "lens-repro",
              `${WHERE}
Judge whether the regression test(s) below reliably show the reported failure on the current production code in the worktree ${state.worktree}. Revision: ${r.revision}. ${candidateNote(r.revision)}
Tests:
${list(r.tests)}

${STORY_BLOCK}${carry.length > 0 ? `\n\nEarlier findings to recheck:\n${list(carry)}` : ""}`,
              { label: "repro", phase: "Reproduce" },
            ),
        },
      ],
      r.revision,
      "reproduce",
    );
    if (jr.stop) return { stop: jr.stop };
    const v = jr.verdicts[0];
    record("lens-repro", v, r.revision);
    if (!passed(v)) return { carry: blockingOf("lens-repro", v).map((f) => findingText(f)) };
    // The test and any fixtures or helpers the reproduction needed all belong to the spec commit.
    const files = unique([...r.changed, ...r.tests].map((p) => rel(p))).filter((f) => f && !inTmp(f) && !isSpec(f));
    repro = {
      tests: r.tests.map((p) => rel(p)),
      files,
      revision: r.revision,
      observed: r.observed || "",
      steps: r.steps,
    };
    done("reproduce");
    return null;
  }

  // A coder writes the regression test, then a fresh lens-repro judges it.
  async function reproduce(extra: readonly string[]): Promise<Stopped | null> {
    let carry = extra; // what the lens found; a failed attempt adds to it and never replaces it
    let pending = carry;
    for (;;) {
      phase("Reproduce");
      const r = await writeReproTest(pending);
      let problem = reproProblem(r);
      if (problem || !r) pending = [...carry, problem];
      else {
        const judged = await judgeRepro(r, carry);
        if (!judged) return null;
        if ("stop" in judged) return judged.stop;
        carry = judged.carry;
        pending = carry;
        problem = carry.join("; ");
      }
      if (fail("reproduce", "regression test", problem)) {
        return stop("reproduce", [
          need(
            "reproduce",
            1,
            "story",
            "a reproducible report",
            attempts
              .filter((a) => a.gate === "reproduce")
              .map((a) => a.failed)
              .join(" | "),
          ),
        ]);
      }
    }
  }

  // The writer writes or revises the spec.
  function draftSpec(pending: readonly string[]): Promise<{ res: WriterResult | null; open: Decision[] }> {
    const exists = state.specExists;
    return settleDecisions("spec", answers, (settled) =>
      callWriter(
        `${WHERE}
Work in the worktree ${state.worktree}; address every file by absolute path. ${exists ? `Revise the spec at ${state.specPath} against the bug report below.` : `Write the spec at ${state.specPath}.`} Write only that one file. ${NO_WRITES}

Write a spec only as large as the fix needs: the bug, its cause, the fix, the regression test, and how the fix is verified. The regression test is already written; it is not yours to change:
${list(repro.tests)}
What it shows: ${repro.observed || "(see the test)"}
Return one task for the fix (id, summary, and the production paths it may write, relative to the worktree root, files or directories, no globs), and in docs the documentation files that state a contract the fix changes (empty when none).

Story authority: you may clarify an ambiguous point of the report in the spec without changing its meaning, keeping the original wording beside the clarification. A report that is wrong, or a bug that cannot be fixed as reported, is a story blocker: report it in storyBlockers. ${DECIDE}
${STORY_BLOCK}

Evidence:
${gathered || "(see the existing spec)"}
${pending.length > 0 ? `\nResolve these findings:\n${list(pending)}` : ""}${settledText(settled)}`,
        exists ? "revise the spec" : "write the spec",
        "Spec",
        WRITER_SCHEMA,
      ),
    );
  }

  // Fresh lenses judge the spec revision; lens-consistency joins only when the spec changes a documented contract.
  function lensGate(drafted: Plan, carry: readonly string[]): Promise<{ stop: Stopped } | { carry: string[] } | null> {
    return runLensGate(d, {
      revision: specRevision,
      carry,
      storyBlock: STORY_BLOCK,
      worktree: "The worktree",
      scope: "Judge whether the spec covers the report's failure and its fix, with no added or dropped scope.",
      consistency: drafted.docs.length > 0,
    });
  }

  // Commit the spec, the regression test, and its fixtures together.
  async function commitSpec(): Promise<Stopped | null> {
    // The test and every fixture or helper any reproduction attempt left, not only the passing attempt's.
    const specFiles = unique([...repro.files, ...touched].map((p) => rel(p))).filter(
      (f) => f && !inTmp(f) && !isSpec(f),
    );
    const listed = list(specFiles.map((t) => `${state.worktree}/${t}`));
    const c = await callPusher(
      pushBrief(
        `Commit exactly these files together in one commit, staged by explicit path: the spec ${state.specPath}, the regression test, and the fixtures and helpers its reproduction attempts wrote:\n${listed}\nA file with no uncommitted change needs no staging, and one that no longer exists needs none. First check that the spec's git hash-object is ${specRevision}; if it differs, commit nothing and report that as unmet. If these files are already committed with the spec at that hash, make no commit and record the current HEAD sha in the ledger line. Use the commit convention docs/FORGE.md declares. Do not push.`,
        [
          `done spec ${state.specPath}@${specRevision} commit <the new commit's sha> story ${storyRevision} test ${repro.tests.join(",")}`,
        ],
      ),
      "commit the spec and the test",
      "Spec gate",
    );
    if (!pushOk(c)) return pushStop("spec-gate", c);
    repro.files = specFiles; // what the spec commit holds beside the spec: the before-run needs all of it
    state.specHash = specRevision;
    specCommit = opRef(c, "commit");
    done("spec-gate");
    return null;
  }

  function specGate(findings: readonly string[]): Promise<Stopped | null> {
    return runSpecGate(d, findings, {
      draft: draftSpec,
      tasksProblem: "the spec needs a fix task with the production paths it may write",
      accept: (revision, drafted) => {
        specRevision = revision;
        plan = drafted;
      },
      gate: lensGate,
      commit: commitSpec,
    });
  }

  // Gather the evidence for the reproduction and the spec.
  async function gather(): Promise<void> {
    phase("Gather");
    const CTX = `${WHERE}\nThe worktree is ${state.worktree}; look there.\n${STORY_BLOCK}\n`;
    const [sCode, sTests, sHistory] = await parallel([
      () =>
        scout(
          "scout-code",
          `${CTX}Find the code locations and call paths relevant to this bug, including where the failure originates.`,
          { label: "code", phase: "Gather" },
        ),
      () =>
        scout(
          "scout-tests",
          `${CTX}Find the existing tests that cover the area of this bug, where a regression test belongs, and how to run the tests.`,
          { label: "tests", phase: "Gather" },
        ),
      () =>
        scout(
          "scout-history",
          `${CTX}Find from git history and blame when and why behavior in the area of this bug was last changed.`,
          { label: "history", phase: "Gather" },
        ),
    ]);
    gathered = [show("Code", sCode), show("Tests", sTests), show("History", sHistory)].join("\n");
    done("gather");
  }

  // Gather, reproduce, and pass the spec gate, unless the checkpoint shows the spec current.
  async function specPhase(): Promise<Stopped | null> {
    if (specCurrent) {
      for (const s of ["gather", "reproduce", "spec", "spec-gate"]) skip(s);
      return null;
    }
    await gather();
    if (fixInPlace) skip("reproduce");
    else {
      const noRepro = await reproduce([]);
      if (noRepro) return noRepro;
    }
    gathered += `\nReproduction: ${repro.steps.join("; ") || "(see the test)"}\nObserved: ${repro.observed}`;
    return specGate([]);
  }
  const specStop = await specPhase();
  if (specStop) return specStop;

  // ---- Fix and validate -------------------------------------------------------

  // The fix coder's brief; findings, when given, are what a fresh validator found in `judged`.
  function fixPrompt(plan: Plan, findings: readonly BlockingFinding[] | null, judged: string): string {
    const dirtyNow = unique([...(carryDirty ? cpDirty : []), ...fixTouched]).filter((p) => !isSpec(p));
    return `${WHERE}
Work in the worktree ${state.worktree}; address every file by absolute path under it. ${NO_WRITES}

Fix the bug. Assigned paths (write only these): ${fixPaths(plan).join(", ")}${judged ? "\nIf a finding asks for more regression coverage, you may also add a new test file in the project's test location and report it in tests." : ""}
The regression test is already committed and passed an independent check; leave these files exactly as they are:
${list(repro.tests)}
If the spec cannot be implemented as written, or the regression test cannot pass with a correct fix, say why in specMismatch and stop; never weaken the test or a criterion to fit.

Spec: ${state.specPath} (revision ${specRevision}), validated before coding.
${STORY_BLOCK}

Run the focused tests as you work, including the regression test, which must pass after the fix. Report the revision you leave as your instructions describe.
${dirtyNow.length > 0 ? `\n${DIRTY_SENTENCE}\nPaths:\n${list(dirtyNow)}\n` : ""}${findings?.length ? `\nFix these findings, reported by an independent validator of candidate ${judged}, and change only what they require:\n${list(findings.map((f) => findingText(f)))}\n` : ""}`;
  }

  // Record what the fix coder changed, the tests it added for a finding, and what it left open.
  function noteFix(r: CoderResult, judged: string): void {
    for (const p of [...r.changed, ...r.tests]) fixTouched.add(rel(p));
    if (judged)
      for (const p of r.tests) if (repro.tests.every((q) => !(within(p, q) || within(q, p)))) fixTests.add(rel(p));
    for (const o of r.open) limits.push(`open: ${o}`);
  }

  // One coder fixes, dispatched again while it returns nothing.
  // Returns {stop} | {mismatch} | {ok: true, candidate}.
  async function fix(plan: Plan, findings: readonly BlockingFinding[] | null, judged: string): Promise<Step> {
    const step = judged ? "validate" : "fix";
    const phaseTitle = judged ? "Validate" : "Fix";
    const label = judged ? "fix the findings" : "fix the bug";
    for (;;) {
      phase(phaseTitle);
      const r = await callCoder(fixPrompt(plan, findings, judged), label, phaseTitle);
      if (!r) {
        if (fail("implementation", "fix", "the coder did not return"))
          return { stop: exhausted(step, "implementation") };
        continue;
      }
      noteFix(r, judged);
      if (r.specMismatch.trim()) return { mismatch: r.specMismatch.trim() };
      if (!r.revision) {
        return {
          stop: stop(step, [need(step, 1, "prerequisite", "The candidate code revision.", "the coder reported none")]),
        };
      }
      return { ok: true, candidate: r.revision };
    }
  }

  // Fresh qa and lens-regression judge the candidate. Returns the step that ends validation, or null with the
  // findings to fix.
  async function judgeFix(v: Validation): Promise<Step | null> {
    phase("Validate");
    const { cand, prior } = v;
    // A fix already committed by an earlier run precedes any later spec commit, so judge before it.
    const base =
      fixInPlace && doneImpl
        ? `the commit ${doneImpl.commit}^ (resolve it with git rev-parse), the parent of the earlier run's fix commit, so without the fix`
        : specCommit
          ? `the commit ${specCommit}^ (resolve it with git rev-parse), the parent of the commit that added the regression test and the spec, so without the fix`
          : "the parent of the commit that added the regression test (find that commit with git log), so without the fix";
    const items: Validator[] = [
      {
        name: "qa",
        call: () =>
          callQa(
            `${WHERE}
Validate the candidate in the worktree ${state.worktree} against the validated spec and the bug report. Candidate revision: ${cand}. ${candidateNote(cand)}
Spec: ${state.specPath}, revision ${specRevision}.
Changed paths:
${list([...fixTouched, ...repro.tests])}

${STORY_BLOCK}

Run the project's tests and the checks the spec requires, judge that the bug is fixed and that nothing regressed, and judge any affected documentation.${prior.length > 0 ? `\n\nEarlier findings to recheck:\n${list(prior)}` : ""}`,
            "qa",
            "Validate",
          ),
      },
      {
        name: "lens-regression",
        call: () =>
          lens(
            "lens-regression",
            `${WHERE}
Judge whether the regression test(s) fail before the fix and pass after it.
Tests:
${list(repro.tests)}
Before: the base revision is ${base}. It is a real commit: export it with git archive into a temporary directory, copy in from the worktree ${state.worktree} the test files and the fixtures and helpers committed with them (${repro.files.join(", ")}, and any other file that commit added besides the spec, which \`git show --stat\` on it lists), and run the tests there; never change the worktree. After: run the tests in the worktree ${state.worktree} as it stands now, with HEAD plus its uncommitted changes. The candidate label "${cand}" is an identifier for that state, not a git object, so do not resolve it with git. Report it back unchanged in evaluated.

${STORY_BLOCK}${prior.length > 0 ? `\n\nEarlier findings to recheck:\n${list(prior)}` : ""}`,
            { label: "regression", phase: "Validate" },
          ),
      },
    ];
    return judgeCandidate(d, items, v);
  }

  async function validate(plan: Plan, first: { candidate: string }): Promise<Step> {
    const v: Validation = { cand: first.candidate, findings: null, prior: [] };
    for (;;) {
      if (v.findings) {
        const f = await fix(plan, v.findings, v.cand);
        if ("stop" in f || "mismatch" in f) return f;
        v.cand = f.candidate;
        v.findings = null;
      }
      const judged = await judgeFix(v);
      if (judged) return judged;
    }
  }

  // The spec goes back to its gate with the spec budget. The regression test already failed on the
  // unfixed code and passed lens-repro, and the uncommitted fix is in the worktree now, so the
  // reproduction is not run again.
  async function backToSpec(mismatch: string): Promise<Stopped | null> {
    if (fail("spec", "fix against the spec and the test", mismatch)) return exhausted("spec", "spec");
    return specGate([
      `The fix step reports the spec cannot be implemented as written, or the regression test cannot pass with a correct fix: ${mismatch}. The regression test is fixed; revise the spec, or report a story blocker if the report itself is the problem.`,
    ]);
  }

  // Fix and validate until the gates pass; returns the plan they passed against.
  async function deliverFix(): Promise<Stopped | Plan> {
    for (;;) {
      if (!plan) {
        const recovered = await planOf(d, "fix", "The fix task and documentation list");
        if ("status" in recovered) return recovered;
        plan = recovered;
      }
      const f = await fix(plan, null, "");
      let next: Step = f;
      if ("ok" in f) {
        done("fix");
        next = await validate(plan, f);
      }
      if ("stop" in next) return next.stop;
      if (!("mismatch" in next)) return plan;
      const stopped = await backToSpec(next.mismatch);
      if (stopped) return stopped;
    }
  }

  // Fix and validate until the gates pass, then commit, unless the checkpoint shows it done.
  async function implementPhase(): Promise<Stopped | null> {
    if (implCurrent) {
      skip("fix");
      skip("validate");
      return null;
    }
    const fixedPlan = await deliverFix();
    if ("status" in fixedPlan) return fixedPlan;
    done("validate");
    // The validators judged the whole worktree: commit every dirty path within the fix's assigned paths,
    // from the checkpoint's dirty list and the coder's reports, and report the rest.
    const dirtyAll = unique([...cpDirty, ...fixTouched]).filter((p) => p && !inTmp(p) && !isSpec(p));
    const scopes = [...fixPaths(fixedPlan), ...fixTests];
    const commitPaths = dirtyAll.filter((p) => scopes.some((s) => within(p, s)));
    leaveOutside(
      d,
      dirtyAll.filter((p) => !commitPaths.includes(p)),
      outsideDirty,
    );
    return commitWork(d, commitPaths, outsideDirty, "commit the fix");
  }
  const implementStop = await implementPhase();
  if (implementStop) return implementStop;

  // ---- Publish ----------------------------------------------------------------

  const publishStop = await publish(d, {
    cardId,
    boardPrDone,
    publishCurrent,
    branch: "the branch",
    describes: "the bug and the fix",
  });
  if (publishStop) return publishStop;

  // ---- Review -----------------------------------------------------------------

  const reviewed = await runReview(d, {
    story,
    extra: { test: repro.tests.join(",") },
    projectRoot,
    answers,
    exclude: outsideDirty,
  });
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
    regressionTests: repro.tests,
    verification,
    review,
    limits,
    report: makeReport([`Spec: ${state.specPath}.`, `Regression test(s): ${repro.tests.join(", ")}.`], review),
  };
}
