// Where a delivery stands, from its durable checkpoints: the worktree, the PR, the ledger, and the committed spec.
import { absent, scout, shaped, type ScoutResult } from "./family.ts";
import { val } from "./deliver.ts";
import { Halt, haltOnCard, must, type Run } from "./loop.ts";
import { checkpointLine, parseReproduction, type CheckpointKey, type Reproduction } from "./rules.ts";
import { parseBuild, parseValidate, type Build, type Validate } from "./spec.ts";

export interface Resume {
  build: Build | null;
  validate: Validate | null;
  specDir: string;
  /** The highest review number the ledger shows fired; 0 when none. */
  reviewFired: number;
  /** The spec folder holds build.json, validate.json, and RATIONALE.md. */
  specComplete: boolean;
  /** The ledger shows the spec's challenge finished, or a finished round, which only follows a passed challenge. */
  challenged: boolean;
  /** The ledger shows a finished round, so the spec's tasks are built. */
  built: boolean;
  /** One past the highest round number the ledger shows finished; 0 when none. */
  nextRound: number;
  /** A trivial run's passed test paths, from the `passed <paths>` tail of every done round line; absent when none. */
  passedTests?: string[];
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
    // A scout may answer "none" for a key with no line, which is no checkpoint, not an unreadable one.
    if (absent(item)) continue;
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

// The ledger lines for every key, or the halt an unreadable one raises, reported on the card.
async function ledgerLines(d: Run, cardId: string, cp: ScoutResult): Promise<Record<CheckpointKey, string[]>> {
  try {
    return {
      "done-findings": accepted(cp, "done-findings"),
      "done-challenge": accepted(cp, "done-challenge"),
      reproduced: accepted(cp, "reproduced"),
      "done-round": accepted(cp, "done-round"),
      "review-fired": accepted(cp, "review-fired"),
      "done-board-start": accepted(cp, "done-board-start"),
    };
  } catch (error) {
    if (error instanceof Halt)
      return haltOnCard(d, cardId, error, "a checkpoint in its local ledger couldn't be read.");
    throw error;
  }
}

const SPEC_FILES = ["build.json", "validate.json", "RATIONALE.md"];

// Where the scout finds the spec folder. A story keeps the one folder its first run committed, whatever its title says
// now, so the brief names no path built from the title; the path the title gives is the fallback when none exists.
const specDirAsk = (cardId: string, specDir: string): string =>
  specDir
    ? `the story's spec folder: the folder the latest \`done spec\` ledger line names, else the one folder under docs/specs whose name begins with ${cardId.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-; leave it out when there is none`
    : 'the spec folder on the PR description\'s "Spec:" line';

// A spec file can be far longer than one excerpt holds, so the scout copies it in parts, which join back into the file.
const PART = 20_000;
const wholeFile = (name: string): string =>
  `the exact contents of ${name} in that folder, in consecutive parts of at most ${PART.toLocaleString("en-US")} characters, one evidence item per part, in order, each part copied exactly with no character added or dropped`;
const joined = (cp: ScoutResult, key: string): string =>
  cp.evidence
    .filter((e) => e.source === key)
    .map((e) => e.excerpt)
    .join("");

// Read the checkpoints into the run's state. specDir is empty when only the PR knows it; otherwise it is the folder
// a story's spec goes in when the worktree holds none yet.
export async function readResume(d: Run, cardId: string, specDir: string): Promise<Resume> {
  const cp = must(
    await scout(
      "scout-checkpoint",
      `${d.WHERE}
Report where this run stands. It is the delivery of card ${cardId}.
Report these keys, each as an evidence item with source set to the key; leave out a key that does not exist.
For each ledger key below, return one evidence item for each ledger line that contains the key's form right after pusher's timestamp, with source set to the key and the whole line as its excerpt, in ledger order; return none when no line matches:
${d.branchOnly ? "- worktree: the main checkout, only when it has this run's branch checked out; there is no worktree\n- branch, ledger" : "- worktree, branch, ledger"}
- pr: the reference of the branch's open PR; leave it out when the branch's only PRs are closed or merged, since a branch name can outlive its PR
- done-board-start: \`done board-start\`
- done-round: \`done round <n>\`
- done-findings: \`done findings <paths>\`
- reproduced: \`reproduced {...}\`
- review-fired: \`review <n> fired\`
- done-challenge: \`done challenge <folder>\`
- spec-dir: ${specDirAsk(cardId, specDir)}, relative to the worktree root
- spec-files: the names of those of ${SPEC_FILES.join(", ")} that exist in that folder
- build-json: ${wholeFile("build.json")}
- validate-json: ${wholeFile("validate.json")}`,
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
  const lines = await ledgerLines(d, cardId, cp);
  const lastFindings = lines["done-findings"].at(-1) ?? "";
  const lastRepro = lines.reproduced.at(-1);
  const rounds = lines["done-round"];
  const passedTests = [
    ...new Set(
      rounds.flatMap((l) =>
        (/ done round \d+ passed (.+)$/.exec(l)?.[1] ?? "")
          .split(/\s+/)
          .map((p) => shaped("rel", p))
          .filter(Boolean),
      ),
    ),
  ];
  const listed = cp.evidence
    .filter((e) => e.source === "spec-files")
    .map((e) => e.excerpt)
    .join(" ");
  const roundNumbers = rounds.map((l) => Number(/ done round (\d+)/.exec(l)?.[1] ?? 0));
  const spec = val(cp, "spec-dir")
    .replace(/^Spec:\s*/i, "")
    .replaceAll("`", "");
  return {
    build: parseBuild(joined(cp, "build-json")),
    validate: parseValidate(joined(cp, "validate-json")),
    specDir: shaped("rel", spec) || specDir,
    reviewFired: Math.max(0, ...lines["review-fired"].map((l) => Number(/review (\d+) fired/.exec(l)?.[1] ?? 0))),
    specComplete: SPEC_FILES.every((name) => listed.includes(name)),
    // A finished round proves the challenge passed, even when an older run left no `done challenge` line.
    challenged: lines["done-challenge"].length > 0 || rounds.length > 0,
    built: rounds.length > 0,
    nextRound: rounds.length > 0 ? Math.max(...roundNumbers) + 1 : 0,
    ...(passedTests.length > 0 && { passedTests }),
    boardStartDone: lines["done-board-start"].length > 0,
    findings: lastFindings
      .replace(/^.*? done findings /, "")
      .split(/\s+/)
      .map((p) => shaped("rel", p))
      .filter(Boolean),
    reproduced: lastRepro ? parseReproduction(lastRepro) : null,
  };
}
