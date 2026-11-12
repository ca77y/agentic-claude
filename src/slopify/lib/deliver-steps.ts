// The steps every delivery shares around its own: reading the card, and the workspace.
import { fact, absent, shaped, type Need, type ScoutResult } from "./family.ts";
import { need, slugOf, val, pushOk, opRef, callPusher, type Deliver, type Stopped } from "./deliver.ts";

type Run = Deliver;

// ---- Locate -----------------------------------------------------------------

/** How a delivery names its input when it is missing. */
interface StoryAsk {
  readable: string;
  input: string;
  arg: string;
  criteria: boolean;
}
interface Story {
  storySource: string;
  story: string;
  storyRevision: string;
}
interface Located extends Story {
  cardId: string;
  boardBranch: string;
  slug: string;
  specRel: string;
}

// The story scout-card read, or the need that stops the run without one.
function readStory(cardRes: ScoutResult, storyArg: string, ask: StoryAsk): Story | { need: Need } {
  const storySource = (/^\s*(card|text|none)\b/i.exec(fact(cardRes, "story-source"))?.[1] || "").toLowerCase();
  const story = storySource === "text" ? storyArg : fact(cardRes, "story");
  const storyRevision = shaped("sha", fact(cardRes, "story-revision"));
  if (!story || storySource === "none") {
    return {
      need: {
        ...need("locate", 1, "input", ask.input, cardRes.gaps.join("; ") || cardRes.answer),
        arg: ask.arg,
      },
    };
  }
  if (!storyRevision) {
    return { need: need("locate", 1, "prerequisite", "The story revision digest from scout-card.", cardRes.answer) };
  }
  if (ask.criteria) {
    const criteria = fact(cardRes, "criteria");
    // Only a bare "none" reply means no criteria; a criterion that opens with "Missing ..." is one.
    if (absent(criteria, true) && !criteria.trim().includes("\n")) {
      return {
        need: need(
          "locate",
          1,
          "story",
          "The story states no acceptance criteria; it needs observable ones from shape.",
          cardRes.answer,
        ),
      };
    }
  }
  return { storySource, story, storyRevision };
}

// The spec path, relative to the worktree root: the board's, else one built from the card identifier and the
// card title's lowercase kebab slug.
function specRelOf(cardRes: ScoutResult, cardId: string, storySource: string, story: string, slug: string): string {
  // The card title is the first line of a card-backed story; its lowercase kebab slug names the spec.
  const titleSlug = (storySource === "card" ? (story.split("\n", 1)[0] ?? "").replace(/^#+\s*/, "") : "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short line from a scout
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 60)
    // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short line from a scout
    .replace(/-+$/, "");
  return (
    [shaped("rel", val(cardRes, "spec-path"))].find((p) => p.endsWith(".md")) ||
    `docs/specs/${
      [
        cardId
          .toLowerCase()
          .replaceAll(/[^a-z0-9]+/g, "-")
          // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short line from a scout
          .replaceAll(/^-+|-+$/g, ""),
        titleSlug,
      ]
        .filter(Boolean)
        .join("-") || slug
    }.md`
  );
}

// What scout-card read: the story, the card, and the names built from them, or the stop without a story.
export function locate(
  d: Run,
  cardRes: ScoutResult | null,
  storyArg: string,
  fallbackSlug: string,
  ask: StoryAsk,
): Located | { stop: Stopped } {
  if (!cardRes) {
    return {
      stop: d.stop("locate", [need("locate", 1, "prerequisite", ask.readable, "scout-card did not return")]),
    };
  }
  const read = readStory(cardRes, storyArg, ask);
  if ("need" in read) return { stop: d.stop("locate", [read.need]) };
  const cardId = shaped("id", val(cardRes, "card"));
  const boardBranch = shaped("branch", val(cardRes, "branch"));
  const slug = slugOf(cardId) || fallbackSlug;
  const specRel = specRelOf(cardRes, cardId, read.storySource, read.story, slug);
  return { ...read, cardId, boardBranch, slug, specRel };
}

// ---- Workspace --------------------------------------------------------------

interface WorkspaceOpts {
  cardId: string;
  boardBranch: string;
  boardStartDone: boolean;
  /** The worktree as the briefs name it. */
  worktree: string;
  /** What the worktree is declared for. */
  subject: string;
  /** More ledger lines for the dispatch that creates the worktree. */
  lines?: readonly string[];
}

// Create or recover the worktree; the same dispatch starts the card.
async function createWorktree(d: Run, o: WorkspaceOpts): Promise<Stopped | null> {
  const { state, stop, done, pushBrief, pushStop } = d;
  const { cardId, boardBranch } = o;
  const r = await callPusher(
    pushBrief(
      `Create or recover ${o.worktree} and branch that docs/FORGE.md declares for ${o.subject}${boardBranch ? ` (the board gives the branch name ${boardBranch})` : ""}. ${cardId ? "Then perform the delivery-start operation docs/BOARD.md declares for the card (for example its status transition), only as bound." : "There is no card, so perform no board operation."} Change no card content. Append the board-start line only once the delivery-start operation is done.`,
      [...(o.lines ?? []), ...(cardId ? [`done board-start ${cardId}`] : [])],
      "<worktree>/.tmp/ledger.md at the root of the worktree you create or recover",
    ),
    "create the worktree",
    "Workspace",
  );
  if (!pushOk(r)) return pushStop("workspace", r);
  const wt = opRef(r, "worktree");
  if (!wt.startsWith("/")) {
    return stop("workspace", [
      need("workspace", 1, "prerequisite", `The absolute path of ${o.worktree}.`, JSON.stringify(r.operations)),
    ]);
  }
  // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short path from pusher
  state.worktree = wt.replace(/\/+$/, "");
  state.branch = opRef(r, "branch") || state.branch;
  done("workspace");
  return null;
}

export async function workspace(d: Run, o: WorkspaceOpts): Promise<Stopped | null> {
  const { state, done, skip, pushBrief, pushStop } = d;
  const { cardId } = o;
  phase("Workspace");
  let boardStartRecorded = false; // the create dispatch records the board operation in the same dispatch
  if (state.worktree) {
    skip("workspace");
  } else {
    const created = await createWorktree(d, o);
    if (created) return created;
    boardStartRecorded = !!cardId;
  }
  // The delivery-start board operation follows the worktree; a rerun that finds the worktree but no
  // ledger line for the operation does it now, since it may have failed after the worktree was made.
  if (!o.boardStartDone && !boardStartRecorded) {
    const b = await callPusher(
      pushBrief(
        `Perform the delivery-start operation docs/BOARD.md declares for card ${cardId} (for example its status transition), only as bound and only if the card does not already show it. Do nothing else, and change no card content.`,
        [`done board-start ${cardId}`],
      ),
      "start the card",
      "Workspace",
    );
    if (!pushOk(b)) return pushStop("workspace", b);
    done("board-start");
  }
  if (!state.ledger) state.ledger = `${state.worktree}/.tmp/ledger.md`;
  return null;
}
