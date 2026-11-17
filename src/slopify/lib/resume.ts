// Where a delivery stands, from its durable checkpoints: the worktree, the PR, the ledger, and the committed spec.
import { fact, scout, shaped, type ScoutResult } from "./family.ts";
import { val } from "./deliver.ts";
import { Halt, must, type Run } from "./loop.ts";
import { checkpointLine, parseReproduction, type CheckpointKey, type Reproduction } from "./rules.ts";
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
  /** The committed documents of a spike or a research run, from the ledger; empty when none. */
  findings: string[];
  /** A bug's confirmed reproduction, from the ledger. */
  reproduced: Reproduction | null;
}

// A ledger line as a scout may return it: pusher's timestamp opens it, after the wrappers checkpointLine strips (a
// fence, a list mark, one opening quote), so a line read as one is never silently dropped as wrapped.
const LEDGER_LINE = /^(?:```[^\n]*\n)?\s*(?:[-*]\s+)?["`]?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z /;

// The ledger lines for a checkpoint key that hold its form, in ledger order. Every item the scout returned for the key
// is read: a ledger line without the form, such as a progress entry or run line quoting it, is skipped, and an item
// that is no ledger line at all halts, since the run can't tell where it stands.
function accepted(cp: ScoutResult, key: CheckpointKey): string[] {
  const lines: string[] = [];
  for (const e of cp.evidence) {
    if (e.source !== key) continue;
    const item = e.excerpt.trim();
    if (!LEDGER_LINE.test(item)) {
      throw new Halt(
        "locate",
        `a ${key} checkpoint read as a whole ledger line`,
        `The scout returned "${item}" for ${key}, which is not a ledger line.`,
      );
    }
    const line = checkpointLine(key, item);
    if (line) lines.push(line);
  }
  return lines;
}

// Read the checkpoints into the run's state. identifies names the run; specDir is empty when only the PR knows it.
export async function readResume(d: Run, identifies: string, specDir: string): Promise<Resume> {
  const cp = must(
    await scout(
      "scout-checkpoint",
      `${d.WHERE}
Report where this run stands. It is the delivery of ${identifies}.
Report these keys, each as an evidence item with source set to the key; leave out a key that does not exist.
For each ledger key below, return one evidence item for each ledger line that contains the key's form right after pusher's timestamp, with source set to the key and the whole line as its excerpt, in ledger order; return none when no line matches:
${d.branchOnly ? "- worktree: the main checkout, only when it has this run's branch checked out; there is no worktree\n- branch, ledger" : "- worktree, branch, ledger"}
- pr: the reference of the branch's open PR; leave it out when the branch's only PRs are closed or merged, since a branch name can outlive its PR
- done-board-start: \`done board-start\`
- done-round: \`done round <n>\`
- done-findings: \`done findings <paths>\`
- reproduced: \`reproduced {...}\`
- review-fired: \`review <n> fired\`
- spec-dir: ${specDir ? `the folder ${specDir}, if it exists in the worktree` : 'the spec folder on the PR description\'s "Spec:" line'}, relative to the worktree root
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
  const lastFindings = accepted(cp, "done-findings").at(-1) ?? "";
  const lastRepro = accepted(cp, "reproduced").at(-1);
  const spec = val(cp, "spec-dir")
    .replace(/^Spec:\s*/i, "")
    .replaceAll("`", "");
  return {
    build: parseBuild(fact(cp, "build-json")),
    validate: parseValidate(fact(cp, "validate-json")),
    specDir: shaped("rel", spec) || specDir,
    reviewFired: Math.max(
      0,
      ...accepted(cp, "review-fired").map((l) => Number(/review (\d+) fired/.exec(l)?.[1] ?? 0)),
    ),
    built: accepted(cp, "done-round").length > 0,
    boardStartDone: accepted(cp, "done-board-start").length > 0,
    findings: lastFindings
      .replace(/^.*? done findings /, "")
      .split(/\s+/)
      .map((p) => shaped("rel", p))
      .filter(Boolean),
    reproduced: lastRepro ? parseReproduction(lastRepro) : null,
  };
}
