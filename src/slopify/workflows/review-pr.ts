import { createDeliver, type Stopped } from "../lib/deliver.ts";
import { workspace } from "../lib/deliver-steps.ts";
import { specReviser, type HowInput } from "../lib/how.ts";
import { answersOf, inputOf, textOf, type NotStarted } from "../lib/input.ts";
import { must, reportOf, runLoop, stopOf, type LoopResult } from "../lib/loop.ts";
import { readResume } from "../lib/resume.ts";

export const meta = {
  name: "review-pr",
  description:
    "Run the build and validate loop on an existing pull request: wait for its review, rule on each finding, fix what is confirmed through a coder and qa inner loop, validate, and push every round, until the review is clean and the PR goes ready or a limit leaves it a draft",
  whenToUse:
    "Run only when the user invokes /slopify:review-pr or asks for the slopify review-pr workflow. Args: {pr, story?, projectRoot?, answers?}, or the pull request as a plain string. pr names the pull request, story is the acceptance source when known, projectRoot defaults to the session project directory, and answers maps a decision id to its answer.",
  phases: [
    { title: "Locate", detail: "scout-checkpoint reports the PR, worktree, ledger, and spec" },
    { title: "Workspace", detail: "pusher recovers a missing worktree" },
    { title: "Advise", detail: "advisors weigh in when a finding shows the spec is wrong" },
    { title: "Spec", detail: "writer revises the spec, and pusher commits it" },
    { title: "Build", detail: "one coder and qa inner loop per change, then writer updates the listed docs" },
    { title: "Validate", detail: "checks, validator, and lens-docs" },
    { title: "Judge", detail: "one judge per problem gives its severity and kind" },
    { title: "Gateway", detail: "one judge checks the round for anything missed" },
    { title: "Push", detail: "pusher pushes the round, updates the PR, and fires the review" },
    { title: "Review", detail: "watcher reads the review, and one judge rules on each finding" },
  ],
} as const satisfies WorkflowMeta;

export type ReviewPrResult = NotStarted | Stopped | (LoopResult & { workflow: "review-pr"; report: string });

export default async function run(): Promise<ReviewPrResult> {
  const input = inputOf(args, "pr");
  const pr = textOf(input["pr"]);
  if (!pr) {
    return {
      status: "not-started",
      next: "Ask the user which pull request to review (a number, URL, or path), then invoke again.",
    };
  }
  const d = createDeliver({
    workflow: "review-pr",
    projectRoot: textOf(input["projectRoot"]),
    storyArg: pr,
  });
  try {
    const answers = answersOf(input["answers"]);
    const story = textOf(input["story"]);
    const resume = await readResume(d, `pull request ${pr}`, "");
    d.state.pr = pr;
    const stopped = await workspace(d, {
      cardId: "",
      boardBranch: d.state.branch,
      boardStartDone: true,
      worktree: "the pull request's worktree",
      subject: `pull request ${pr}`,
    });
    if (stopped) return stopped;
    const howInput: HowInput = {
      d,
      where: d.WHERE,
      story,
      storyRevision: "",
      cardId: "",
      specDir: resume.specDir,
      answers,
    };
    const result = await runLoop({
      d,
      where: d.WHERE,
      story,
      cardId: "",
      build: resume.build,
      validate: resume.validate,
      specDir: resume.specDir,
      answers,
      startAtReview: Math.max(resume.reviewFired, 1),
      built: true,
      ...(resume.build && { reviseSpec: specReviser(howInput) }),
    });
    return {
      ...result,
      workflow: "review-pr",
      report: reportOf("review-pr", result),
    };
  } catch (error) {
    return stopOf(d, must(error, "review", "The review."));
  }
}
