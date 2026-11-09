import { scout, fact, slugged } from "../lib/family.ts";
import { callPusher, createDeliver, type Stopped } from "../lib/deliver.ts";
import { locate, workspace } from "../lib/deliver-steps.ts";
import { runHow, specReviser, type HowInput } from "../lib/how.ts";
import { answersOf, inputOf, textOf, type NotStarted } from "../lib/input.ts";
import { must, reportOf, runLoop, stopOf, type LoopResult, type Run } from "../lib/loop.ts";
import { readResume } from "../lib/resume.ts";
import { isDeliverable } from "../lib/rules.ts";

export const meta = {
  name: "deliver-story",
  description:
    "Deliver a non-simple story from a Deliverable Linear issue to a pull request: independent designs, opus advisors, and a challenged spec decide how; a coder and qa build each change test first; the app is validated as TESTING.md says; and the PR goes ready once its review is clean, or stays a draft that says what is open",
  whenToUse:
    "Run only when the user invokes /slopify:deliver-story or asks for the slopify deliver-story workflow. Args: {story, projectRoot?, answers?}, or the story as a plain string; story is a card identifier or URL for an issue labelled Deliverable; projectRoot defaults to the session project directory; answers maps a decision id from a draft or blocked result to its answer when rerunning.",
  phases: [
    { title: "Locate", detail: "scout-card reads the issue and its labels; scout-checkpoint reads the run state" },
    { title: "Workspace", detail: "pusher creates or recovers the worktree and branch, and starts the issue" },
    { title: "Ground", detail: "scouts and the library gather evidence" },
    { title: "Design", detail: "three independent designers, then upstream docs and known issues per dependency" },
    { title: "Advise", detail: "five advisors compare the designs" },
    { title: "Decide", detail: "judge picks a design and grafts in the best of the others" },
    { title: "Spec", detail: "writer writes the spec folder, and pusher commits it" },
    { title: "Challenge", detail: "checks and lenses test the spec, advisors try to break it, judge rules" },
    { title: "Build", detail: "one coder and qa inner loop per change, then writer updates the listed docs" },
    { title: "Validate", detail: "checks, validator, and lens-docs" },
    { title: "Judge", detail: "one judge per problem gives its severity and kind" },
    { title: "Gateway", detail: "one judge checks the round for anything missed" },
    { title: "Push", detail: "pusher pushes the round, opens or updates the PR, and fires the review" },
    { title: "Review", detail: "watcher reads the review, and one judge rules on each finding" },
  ],
} as const satisfies WorkflowMeta;

type Delivered = LoopResult & { workflow: "deliver-story"; specDir: string; report: string };

// An issue only reaches delivery through shape, so a missing label is the one thing to say to its author.
async function refuse(d: Run, cardId: string): Promise<NotStarted> {
  const next = `Issue ${cardId || "the argument"} has no Deliverable label. Run /slopify:shape on it first, then invoke again.`;
  if (cardId) {
    await callPusher(
      d.pushBrief(`Comment on card ${cardId}, as docs/BOARD.md declares: ${next} Do nothing else.`),
      "comment on the issue",
      "Locate",
    );
  }
  return { status: "not-started", next };
}

async function brokenWorkflow(d: Run, cardId: string, tried: readonly string[]): Promise<Stopped> {
  const what = `The how phase ran out of attempts, so the workflow is broken for this issue. Everything tried:\n${tried.map((t) => `- ${t}`).join("\n")}`;
  if (cardId) {
    await callPusher(
      d.pushBrief(`Comment on card ${cardId}, as docs/BOARD.md declares:\n${what}`),
      "report the halt",
      "Spec",
    );
  }
  return d.stop("how", [{ id: "how-1", kind: "validation", what, evidence: "" }]);
}

async function deliver(
  d: Run,
  storyArg: string,
  how: Pick<HowInput, "where" | "answers">,
): Promise<NotStarted | Stopped | Delivered> {
  phase("Locate");
  const cardRes = await scout(
    "scout-card",
    `${d.WHERE}
Read the one card this delivery names, through the read bindings in docs/BOARD.md. Report these evidence items, each with source set to the item name and excerpt set to its value; leave out an item that does not exist:
- card: the card identifier
- story-source: card, or none when the argument names no card
- story: the story text exactly as you wrote it for hashing (title line, empty line, body)
- story-revision: the story revision digest
- field-re: the field regex you used for it
- criteria: the story's acceptance criteria, one per line
- labels: the card's labels, comma-separated
- branch: the branch name the board gives the card, or the single word none
Change nothing on the board or forge.

Argument:
<<<ARG
${storyArg}
ARG>>>`,
    { label: "read the issue", phase: "Locate" },
  );
  const located = locate(d, cardRes, storyArg, slugged(storyArg, "story"), {
    readable: "A readable Linear issue.",
    input: "A Linear issue the board can read.",
    arg: "story",
    criteria: false,
  });
  if ("stop" in located) return { status: "not-started", next: located.stop.needs.map((n) => n.what).join(" ") };
  const { story, storyRevision, cardId, boardBranch, slug, specRel } = located;
  if (!isDeliverable(fact(cardRes, "labels"))) return refuse(d, cardId);

  const specDir = specRel.replace(/\.md$/, "");
  const resume = await readResume(d, cardId ? `card ${cardId}` : `the story "${slug}"`, specDir);
  const stopped = await workspace(d, {
    cardId,
    boardBranch,
    boardStartDone: resume.boardStartDone,
    worktree: "the story worktree",
    subject: "this story",
  });
  if (stopped) return stopped;

  const howInput: HowInput = { d, where: how.where, story, storyRevision, cardId, specDir, answers: how.answers };
  let { build, validate } = resume;
  if (build && validate) {
    d.skip("how");
  } else {
    const decided = await runHow(howInput);
    if ("exhausted" in decided) return brokenWorkflow(d, cardId, decided.exhausted);
    ({ build, validate } = decided);
    d.done("how");
  }

  const result = await runLoop({
    d,
    where: how.where,
    story,
    cardId,
    build,
    validate,
    specDir,
    answers: how.answers,
    // Once the PR exists, a rerun resumes at its review.
    startAtReview: d.state.pr ? Math.max(resume.reviewFired, 1) : 0,
    built: resume.built,
    reviseSpec: specReviser(howInput),
  });
  return { ...result, workflow: "deliver-story", specDir, report: reportOf("deliver-story", result, specDir) };
}

export default async function run(): Promise<NotStarted | Stopped | Delivered> {
  const input = inputOf(args, "story");
  const storyArg = textOf(input["story"]);
  if (!storyArg) {
    return { status: "not-started", next: "Ask the user for the Linear issue to deliver, then invoke again." };
  }
  const projectRoot = textOf(input["projectRoot"]);
  const d = createDeliver({
    workflow: "deliver-story",
    projectRoot,
    storyArg,
  });
  try {
    return await deliver(d, storyArg, { where: d.WHERE, answers: answersOf(input["answers"]) });
  } catch (error) {
    return stopOf(d, must(error, "deliver", "The delivery."));
  }
}
