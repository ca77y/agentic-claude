import { fact, scout, shaped } from "../lib/family.ts";
import { val } from "../lib/deliver.ts";
import { inputOf, textOf, whereOf, type NotStarted } from "../lib/input.ts";
import { must, runValidation } from "../lib/loop.ts";
import { parseValidate } from "../lib/spec.ts";

export const meta = {
  name: "validate",
  description:
    "Validate a branch or pull request by running the project's checks and each criterion's TESTING.md validation path, and report each result with its evidence, changing nothing",
  whenToUse:
    "Run only when the user invokes /slopify:validate or asks for the slopify validate workflow. Args: {target, projectRoot?}, or the branch or pull request as a plain string; projectRoot defaults to the session project directory.",
  phases: [
    { title: "Locate", detail: "scout-checkpoint finds the worktree and the spec's validate.json" },
    { title: "Validate", detail: "checks and validator run" },
  ],
} as const satisfies WorkflowMeta;

export default async function run() {
  const input = inputOf(args, "target");
  const target = textOf(input["target"]);
  if (!target) {
    const asked: NotStarted = {
      status: "not-started",
      next: "Ask the user which branch or pull request to validate, then invoke again.",
    };
    return asked;
  }
  const where = whereOf(textOf(input["projectRoot"]));
  const cp = must(
    await scout(
      "scout-checkpoint",
      `${where}
Report where this branch or pull request stands: ${target}.
Report these keys, each as an evidence item with source set to the key; leave out a key that does not exist:
- worktree: the checkout of it, absolute
- validate-json: the exact contents of validate.json in its spec folder, under docs/specs/`,
      { label: "read the target", phase: "Locate" },
    ),
    "locate",
    "The branch or pull request's checkout.",
  );
  const spec = parseValidate(fact(cp, "validate-json"));
  const result = await runValidation({
    where,
    worktree: shaped("path", val(cp, "worktree")),
    criteria: spec?.criteria ?? [],
    focus: [],
    changed: [],
  });
  return { status: "done", workflow: "validate", ...result };
}
