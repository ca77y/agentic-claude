import { callPusher, createDeliver } from "../lib/deliver.ts";
import { answersOf, inputOf, textOf, type NotStarted } from "../lib/input.ts";
import { pushed, stopOf, type Run } from "../lib/loop.ts";
import { reproduce } from "../lib/reproduce.ts";
import { reproductionLine, type Reproduction } from "../lib/rules.ts";
import { deliverSmall, findCard, openWork, resumeOf, type SmallResult } from "../lib/small.ts";

const WORKFLOW = "deliver-bugfix";
const UNREPRODUCIBLE_LABEL = "Unreproducible";

export const meta = {
  name: "deliver-bugfix",
  description:
    "Fix a bug autonomously, from a Linear issue or a prompt to a pull request: reproduce it, turn the reproduction into a failing test, fix it, run the reproduction again in the app, and show the before and after in a PR that goes ready once its review is clean. A bug that can't be reproduced is labelled Unreproducible on its card, with no PR",
  whenToUse:
    "Run only when the user invokes /slopify:deliver-bugfix or asks for the slopify deliver-bugfix workflow. Args: {story, projectRoot?, answers?}, or the bug as a plain string; story is a card identifier or URL, or the report; projectRoot defaults to the session project directory; answers maps a decision id from a draft or blocked result to its answer when rerunning.",
  phases: [
    { title: "Locate", detail: "scout-card reads the issue, or pusher files a Bug card for a report" },
    { title: "Ground", detail: "scout-code, scout-tests, and scout-history" },
    { title: "Reproduce", detail: "coder reproduces the bug outside the production code, and lens-repro checks it" },
    { title: "Workspace", detail: "pusher creates or recovers the worktree and branch" },
    { title: "Build", detail: "the reproduction as a failing test, the fix, checks, and qa, then any affected docs" },
    { title: "Validate", detail: "validator runs the reproduction again in the app" },
    { title: "Push", detail: "pusher pushes, opens or updates the PR, and fires the review" },
    { title: "Review", detail: "watcher reads the review, and one judge rules on each finding" },
  ],
} as const satisfies WorkflowMeta;

interface Unreproducible {
  status: "unreproducible";
  workflow: typeof WORKFLOW;
  card: string;
  report: string;
}

// With no human in the run, the card is how the author learns why no PR came back.
async function markUnreproducible(d: Run, cardId: string, why: string): Promise<Unreproducible> {
  pushed(
    await callPusher(
      d.pushBrief(
        `On card ${cardId}, add the label ${UNREPRODUCIBLE_LABEL} and comment, as docs/BOARD.md declares. If it declares no board, do nothing.\nThe comment: This bug could not be reproduced, so no fix was attempted.\n${why}`,
      ),
      "report the failed reproduction",
      "Reproduce",
    ),
    "The Unreproducible label and comment on the card.",
  );
  return {
    status: "unreproducible",
    workflow: WORKFLOW,
    card: cardId,
    report: `${WORKFLOW} stopped: the bug could not be reproduced, so no PR was opened.\n${why}`,
  };
}

function fixFrom(r: Reproduction) {
  const steps = r.steps.join("\n");
  return {
    firstTest: `turns this reproduction into a regression test: it fails now the way the reproduction shows, and passes once the bug is fixed.\nSteps:\n${steps}\nObserved: ${r.observed}`,
    validationPath: `Run the reproduction's steps again in the running app, as TESTING.md says to run it. It passes when the observed failure is gone.\nSteps:\n${steps}\nObserved before the fix: ${r.observed}`,
    reproduced: [{ text: steps, detail: `Before the fix: ${r.observed}` }],
  };
}

export default async function run(): Promise<NotStarted | Unreproducible | SmallResult> {
  const input = inputOf(args, "story");
  const arg = textOf(input["story"]);
  if (!arg) return { status: "not-started", next: "Ask the user for the bug: a Linear issue or a report." };
  const d = createDeliver({ workflow: WORKFLOW, projectRoot: textOf(input["projectRoot"]), storyArg: arg });
  try {
    const found = await findCard(d, arg, "Bug");
    if ("status" in found) return found;
    const resume = await resumeOf(d, found);
    // A confirmed reproduction is on the ledger, so a rerun doesn't reproduce again.
    let repro = resume.reproduced;
    if (!repro) {
      const r = await reproduce(d, found.story, found.slug);
      if (!r.reproduced) return await markUnreproducible(d, found.cardId, r.why);
      repro = { steps: r.steps, observed: r.observed };
    }
    const stopped = await openWork(d, found, resume, [reproductionLine(repro)]);
    if (stopped) return stopped;
    return await deliverSmall(
      d,
      { ...found, resume },
      {
        answers: answersOf(input["answers"]),
        workflowName: WORKFLOW,
        ...fixFrom(repro),
      },
    );
  } catch (error) {
    return stopOf(d, error);
  }
}
