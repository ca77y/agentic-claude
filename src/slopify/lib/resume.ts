// Where a delivery stands, from its durable checkpoints: the worktree, the PR, the ledger, and the committed spec.
import { fact, scout, shaped } from "./family.ts";
import { val } from "./deliver.ts";
import { must, type Run } from "./loop.ts";
import { parseReproduction, type Reproduction } from "./rules.ts";
import { parseBuild, parseValidate, type Build, type Validate } from "./spec.ts";

export interface Resume {
  build: Build | null;
  validate: Validate | null;
  specDir: string;
  /** The highest review number the ledger shows fired; 0 when none. */
  reviewFired: number;
  /** The ledger shows a finished round, so the spec's tasks are built. */
  built: boolean;
  boardStartDone: boolean;
  /** A spike's committed findings document, from the ledger; empty when none. */
  findings: string;
  /** A bug's confirmed reproduction, from the ledger. */
  reproduced: Reproduction | null;
}

// Read the checkpoints into the run's state. identifies names the run; specDir is empty when only the PR knows it.
export async function readResume(d: Run, identifies: string, specDir: string): Promise<Resume> {
  const cp = must(
    await scout(
      "scout-checkpoint",
      `${d.WHERE}
Report where this run stands. It is the delivery of ${identifies}.
Report these keys, each as an evidence item with source set to the key; leave out a key that does not exist:
- worktree, branch, ledger
- pr: the PR reference
- done-board-start: the last "done board-start" ledger line
- done-round: the last "done round" ledger line
- done-findings: the path in the last "done findings" ledger line
- reproduced: the last ledger line that contains "reproduced {"
- review-fired: the highest <n> among the ledger's "review <n> fired" lines
- spec-dir: ${specDir ? `the folder ${specDir}, if it exists in the worktree` : 'the spec folder the PR description names after "Spec:"'}, relative to the worktree root
- build-json: the exact contents of build.json in that folder
- validate-json: the exact contents of validate.json in that folder`,
      { label: "read checkpoints", phase: "Locate" },
    ),
    "locate",
    "The run's checkpoints.",
  );
  const { state } = d;
  const worktree = shaped("path", val(cp, "worktree"));
  // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short path from a scout
  if (worktree.startsWith("/")) state.worktree = worktree.replace(/\/+$/, "");
  state.branch = shaped("branch", val(cp, "branch"));
  state.ledger = shaped("path", val(cp, "ledger"));
  state.pr = shaped("ref", val(cp, "pr"));
  return {
    build: parseBuild(fact(cp, "build-json")),
    validate: parseValidate(fact(cp, "validate-json")),
    specDir: shaped("rel", val(cp, "spec-dir")) || specDir,
    reviewFired: Number(/\d+/.exec(val(cp, "review-fired"))?.[0] ?? 0),
    built: !!val(cp, "done-round"),
    boardStartDone: !!val(cp, "done-board-start"),
    findings: shaped("rel", val(cp, "done-findings")),
    reproduced: parseReproduction(fact(cp, "reproduced")),
  };
}
