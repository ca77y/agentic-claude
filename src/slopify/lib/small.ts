// What deliver-trivial and deliver-bugfix share: from a Linear issue or a prompt to a reviewed PR, with no spec.
import { scout, slugged } from "./family.ts";
import { callPusher, createDeliver, opRef, pushOk, type Stopped } from "./deliver.ts";
import { locate, workspace } from "./deliver-steps.ts";
import { answersOf, flagOf, inputOf, textOf, type NotStarted } from "./input.ts";
import { Halt, reportOf, runLoop, stopOf, type LoopResult, type Run } from "./loop.ts";
import { readResume, type Resume } from "./resume.ts";
import type { Listed } from "./rules.ts";

export type SmallResult = NotStarted | Stopped | (LoopResult & { workflow: string; report: string });

// No spec names a criterion, so the validator takes the whole change as one, under whichever category covers it.
const WHOLE_CHANGE = (wording: string, path: string) => ({
  criteria: [
    {
      id: "change",
      wording,
      category: "",
      path,
      evidence: "What that category requires",
      firstTest: "",
    },
  ],
});

const CATEGORY_PATH =
  "The validation path of the TESTING.md category that covers this change. When no category fits, report cannot-verify, with what TESTING.md states for uncategorized criteria as the setting.";

interface SmallFlow {
  answers: ReturnType<typeof answersOf>;
  firstTest: string;
  workflowName: string;
  /** What proves the change in the running app; a bug's reproduction, or the covering category's path. */
  validationPath?: string;
  reproduced?: readonly Listed[];
}

// Work with no card still belongs on the board. The marker line lets a rerun find this card instead of filing another.
async function fileCard(d: Run, story: string, slug: string, cardType: string): Promise<string> {
  const marker = `<!-- deliver-small ${slug} -->`;
  const r = await callPusher(
    d.pushBrief(
      `Create a ${cardType} card from this text, as docs/BOARD.md declares, with one trailing line in its body: ${marker}. First search the board for a card whose body holds that line, and use that card instead of creating another. Report the card's identifier as the operation named card.\n<<<TEXT\n${story}\nTEXT>>>`,
    ),
    "file the card",
    "Locate",
  );
  const card = opRef(r, "card");
  if (!pushOk(r) || !card) throw new Halt("locate", "A card for this work.", "pusher didn't file one");
  return card;
}

async function readWork(d: Run, arg: string) {
  phase("Locate");
  const cardRes = await scout(
    "scout-card",
    `${d.WHERE}
The argument below names one card on the board, or is the work itself as a prompt. Read a named card through the read bindings in docs/BOARD.md, or take a prompt as the story. Report these evidence items, each with source set to the item name and excerpt set to its value; leave out an item that does not exist:
- card: the card identifier, or none for a prompt
- story-source: card or text
- story: the story text exactly as you wrote it for hashing, or the argument verbatim for a prompt
- story-revision: the story revision digest
- field-re: the field regex you used for it
- branch: the branch name the board gives the card, or the single word none
Change nothing on the board or forge.

Argument:
<<<ARG
${arg}
ARG>>>`,
    { label: "read the work", phase: "Locate" },
  );
  return locate(d, cardRes, arg, slugged(arg, "change"), {
    readable: "A readable Linear issue, or a prompt.",
    input: "A Linear issue or a prompt saying what to change.",
    arg: "story",
    criteria: false,
  });
}

export interface Found {
  story: string;
  cardId: string;
  boardBranch: string;
  slug: string;
  /** The card's identifier and title slug, as a spec folder would be named. */
  name: string;
  cardType: string;
}
export interface Started extends Found {
  resume: Resume;
}

/** Read the card, or file one for a prompt, so all work is on the board. */
export async function findCard(d: Run, arg: string, cardType: string): Promise<Found | NotStarted> {
  let located = await readWork(d, arg);
  if ("stop" in located) return { status: "not-started", next: located.stop.needs.map((n) => n.what).join(" ") };
  if (!located.cardId) {
    located = await readWork(d, await fileCard(d, located.story, located.slug, cardType));
    if ("stop" in located) return { status: "not-started", next: located.stop.needs.map((n) => n.what).join(" ") };
  }
  const { story, cardId, boardBranch, slug, specRel } = located;
  const name = (specRel.split("/").pop() ?? slug).replace(/\.md$/, "");
  return { story, cardId, boardBranch, slug, name, cardType };
}

export const resumeOf = (d: Run, f: Found): Promise<Resume> => readResume(d, `card ${f.cardId}`, "");

/** Create or recover the worktree and start the card; lines go on the ledger the worktree's creation starts. */
export function openWork(d: Run, f: Found, resume: Resume, lines: readonly string[] = []): Promise<Stopped | null> {
  return workspace(d, {
    cardId: f.cardId,
    boardBranch: f.boardBranch,
    boardStartDone: resume.boardStartDone,
    worktree: "the worktree",
    subject: `this ${f.cardType}`,
    lines,
  });
}

/** Find the card, read the checkpoints, and create or recover the worktree. */
export async function startWork(d: Run, arg: string, cardType: string): Promise<Started | NotStarted | Stopped> {
  const found = await findCard(d, arg, cardType);
  if ("status" in found) return found;
  const resume = await resumeOf(d, found);
  return (await openWork(d, found, resume)) ?? { ...found, resume };
}

export async function deliverSmall(d: Run, started: Started, input: SmallFlow): Promise<SmallResult> {
  const { story, cardId, resume } = started;
  const result = await runLoop({
    d,
    where: d.WHERE,
    story,
    cardId,
    build: null,
    validate: WHOLE_CHANGE(story, input.validationPath ?? CATEGORY_PATH),
    specDir: "",
    answers: input.answers,
    // Once the PR exists, a rerun resumes at its review.
    startAtReview: d.state.pr ? Math.max(resume.reviewFired, 1) : 0,
    built: resume.built,
    small: { firstTest: input.firstTest, ...(input.reproduced && { reproduced: input.reproduced }) },
  });
  return { ...result, workflow: input.workflowName, report: reportOf(input.workflowName, result) };
}

/** Run one small delivery from the workflow's args. firstTest finishes the sentence "The first test ...". */
export async function runSmall(workflowArgs: unknown, workflowName: string, firstTest: string): Promise<SmallResult> {
  const input = inputOf(workflowArgs, "story");
  const arg = textOf(input["story"]);
  if (!arg) {
    return { status: "not-started", next: "Ask the user for the Linear issue or a prompt, then invoke again." };
  }
  const d = createDeliver({
    workflow: workflowName,
    projectRoot: textOf(input["projectRoot"]),
    storyArg: arg,
    branchOnly: flagOf(input["branchOnly"]),
  });
  try {
    const started = await startWork(d, arg, "story");
    return "status" in started
      ? started
      : await deliverSmall(d, started, { answers: answersOf(input["answers"]), firstTest, workflowName });
  } catch (error) {
    return stopOf(d, error);
  }
}
