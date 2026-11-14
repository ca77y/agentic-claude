import { runSmall, type SmallResult } from "../lib/small.ts";

// The runtime reads meta as a pure literal, so the two short workflows can't share their phases.
/* jscpd:ignore-start */
export const meta = {
  name: "deliver-trivial",
  description:
    "Deliver a trivial story from a Linear issue or a prompt to a pull request, with no spec: a failing test, the change, one run of the app as TESTING.md says, and a PR that goes ready once its review is clean",
  whenToUse:
    "Run only when the user invokes /slopify:deliver-trivial or asks for the slopify deliver-trivial workflow. Args: {story, projectRoot?, answers?}, or the work as a plain string; story is a card identifier or URL, or a prompt saying what to change; projectRoot defaults to the session project directory; answers maps a decision id from a draft or blocked result to its answer when rerunning.",
  phases: [
    { title: "Locate", detail: "scout-card reads the issue, or takes the prompt as written" },
    { title: "Workspace", detail: "pusher creates or recovers the worktree and branch" },
    {
      title: "Build",
      detail: "failing test, fix, checks, and qa, then writer-docs fixes any docs a scout finds affected",
    },
    { title: "Validate", detail: "validator runs the app as TESTING.md says, once" },
    { title: "Push", detail: "pusher pushes, opens or updates the PR, and fires the review" },
    { title: "Review", detail: "watcher reads the review, and one judge rules on each finding" },
  ],
} as const satisfies WorkflowMeta;
/* jscpd:ignore-end */

export default function run(): Promise<SmallResult> {
  return runSmall(args, "deliver-trivial", "states the new behavior: it fails now and passes once the change is made.");
}
