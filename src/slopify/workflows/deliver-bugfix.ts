import { shaped } from "../lib/family.ts";
import { callPusher, createDeliver, type Deliver } from "../lib/deliver.ts";
import { answersOf, inputOf, textOf, type NotStarted } from "../lib/input.ts";
import { stopOf } from "../lib/loop.ts";
import { deliverSmall, type SmallResult } from "../lib/small.ts";
import type { ReproduceResult } from "./reproduce-bug.ts";

const UNREPRODUCIBLE_LABEL = "Unreproducible";
type Stopped = Extract<ReproduceResult, { status: "blocked" }>;

export const meta = {
  name: "deliver-bugfix",
  description:
    "Fix a bug autonomously, from a Linear issue or a prompt to a pull request: reproduce it, turn the reproduction into a failing test, fix it, run the reproduction again in the app, and show the before and after in a PR that goes ready once its review is clean. A bug that can't be reproduced stops the run with no PR",
  whenToUse:
    "Run only when the user invokes /slopify:deliver-bugfix or asks for the slopify deliver-bugfix workflow. Args: {story, projectRoot?, answers?}, or the bug as a plain string; story is a card identifier or URL, or the report; projectRoot defaults to the session project directory; answers maps a decision id from a draft or blocked result to its answer when rerunning.",
  phases: [
    { title: "Locate", detail: "scout-card reads the Bug card reproduce-bug filed, or the report as written" },
    { title: "Workspace", detail: "pusher creates or recovers the worktree and branch" },
    { title: "Build", detail: "the reproduction as a failing test, the fix, checks, and qa, then any affected docs" },
    { title: "Validate", detail: "validator runs the reproduction again in the app" },
    { title: "Push", detail: "pusher pushes, opens or updates the PR, and fires the review" },
    { title: "Review", detail: "watcher reads the review, and one judge rules on each finding" },
  ],
} as const satisfies WorkflowMeta;

// With no human in the run, the card is how the author learns why no PR came back, so there is always one to read.
async function reportNotReproduced(d: Deliver, arg: string, bug: Stopped): Promise<Stopped> {
  const cardId = shaped("id", arg) || shaped("id", bug.checkpoint.bugCard);
  const tried = bug.needs.map((n) => `${n.what} ${n.evidence}`).join("\n");
  const comment = `This bug could not be reproduced, so no fix was attempted.\n${tried}`;
  const target = cardId
    ? `On card ${cardId}`
    : `No card reports this bug, so create a Bug card from this report, word for word, and on it:\n<<<REPORT\n${arg}\nREPORT>>>\n`;
  await callPusher(
    d.pushBrief(
      `${target} add the label ${UNREPRODUCIBLE_LABEL} and comment, as docs/BOARD.md declares. If it declares no board, do nothing.\nThe comment: ${comment}`,
    ),
    "report the failed reproduction",
    "Push",
  );
  return bug;
}

export default async function run(): Promise<NotStarted | Stopped | SmallResult> {
  const input = inputOf(args, "story");
  const arg = textOf(input["story"]);
  if (!arg) return { status: "not-started", next: "Ask the user for the bug: a Linear issue or a report." };
  const projectRoot = textOf(input["projectRoot"]);
  const answers = answersOf(input["answers"]);
  const d = createDeliver({ workflow: "deliver-bugfix", projectRoot, storyArg: arg });
  try {
    const bug = await workflow<ReproduceResult>("slopify:reproduce-bug", {
      report: arg,
      projectRoot: projectRoot || undefined,
      answers,
      autonomous: true,
    });
    if (bug.status === "not-started") return bug;
    if (bug.status !== "done") return await reportNotReproduced(d, arg, bug);
    const steps = bug.steps.join("\n");
    return await deliverSmall(d, shaped("id", bug.card) || arg, {
      answers,
      workflowName: "deliver-bugfix",
      cardType: "Bug",
      firstTest: `turns this reproduction into a regression test: it fails now the way the reproduction shows, and passes once the bug is fixed.\nSteps:\n${steps}\nObserved: ${bug.observed}`,
      validationPath: `Run the reproduction's steps again in the running app, as TESTING.md says to run it. It passes when the observed failure is gone.\nSteps:\n${steps}\nObserved before the fix: ${bug.observed}`,
      reproduced: [
        { text: steps || "See the reproduction steps on the issue.", detail: `Before the fix: ${bug.observed}` },
      ],
    });
  } catch (error) {
    return stopOf(d, error);
  }
}
