import { STRINGS, advise, lens, scout, slugged, type ScoutResult } from "../lib/family.ts";
import { callPusher, createDeliver, list, opRef, show, slugOf, type Stopped } from "../lib/deliver.ts";
import { inputOf, textOf, type NotStarted } from "../lib/input.ts";
import { must, pushed, stopOf, type Run } from "../lib/loop.ts";
import { MAX_FIX_ROUNDS } from "../lib/rules.ts";
import { RULING_SCHEMA, libraryReaderSchema } from "../lib/schemas.ts";

export const meta = {
  name: "shape",
  description:
    "Turn an idea into a Linear issue of the kind the user asks for, story, bug, or spike, written from the plugin's card template: scouts and advisors ground it, writer-card drafts it, cheap checks and a judge refine it, and pusher files it, labelled Deliverable when a story has no open question",
  whenToUse:
    "Run only when the user invokes /slopify:shape or asks for the slopify shape workflow. Args: {idea?, card?, kind?, projectRoot?}, or the idea as a plain string; card names an existing card to start from, such as one whose open questions are now answered; kind is story, bug, or spike, and story when not given; projectRoot defaults to the session project directory.",
  phases: [
    {
      title: "Read",
      detail: "scout-card reads the named card and its comments; scout-related-cards searches the board",
    },
    { title: "Ground", detail: "library-reader and scouts, by kind" },
    { title: "Advise", detail: "advisors, by kind" },
    { title: "Draft", detail: "writer-card writes the card from its kind's template" },
    { title: "Check", detail: "lenses by kind, then one judge per finding; writer-card revises, up to three rounds" },
    { title: "File", detail: "pusher creates or updates the card, and its Deliverable label" },
  ],
} as const satisfies WorkflowMeta;

const WORKFLOW = "shape";
const DELIVERABLE = "Deliverable";

type Kind = "story" | "bug" | "spike";
const KINDS: Record<
  Kind,
  { scouts: readonly (readonly [string, string])[]; advisors: readonly string[]; lenses: readonly string[] }
> = {
  story: {
    scouts: [
      ["scout-code", "Find where the product already does or touches what this idea is about."],
      ["scout-docs", "Find the documentation that makes claims about what this idea is about."],
    ],
    advisors: ["advisor-value", "advisor-scope", "advisor-alternatives", "advisor-fit"],
    lenses: ["lens-template", "lens-criteria", "lens-solution-free"],
  },
  bug: {
    scouts: [["scout-code", "Find where the product does what this report describes."]],
    advisors: ["advisor-fit"],
    lenses: ["lens-template"],
  },
  spike: {
    scouts: [["scout-code", "Find where the product touches what this question is about."]],
    advisors: ["advisor-scope"],
    lenses: ["lens-template"],
  },
};

const LIBRARY_SCHEMA = libraryReaderSchema("the idea");

const WRITER_SCHEMA = {
  type: "object",
  required: ["openQuestions"],
  properties: {
    openQuestions: { ...STRINGS, description: "Each question left under Open questions on the card; empty when none" },
  },
} as const;

interface Problem {
  source: string;
  location: string;
  text: string;
}

interface Card {
  kind: Kind;
  idea: string;
  cardId: string;
  /** The card's text and comments, when shape starts from one. */
  current: string;
  draft: string;
}

interface Shaped {
  status: "done";
  workflow: typeof WORKFLOW;
  card: string;
  deliverable: boolean;
  openQuestions: string[];
  report: string;
}

const kindOf = (v: unknown): Kind => (v === "bug" || v === "spike" ? v : "story");

function subject(c: Card): string {
  return [
    c.idea ? `The idea:\n<<<IDEA\n${c.idea}\nIDEA>>>` : "",
    c.current ? `The card ${c.cardId}, with its comments:\n<<<CARD\n${c.current}\nCARD>>>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ---- Read and ground --------------------------------------------------------

async function read(
  d: Run,
  cardArg: string,
  idea: string,
): Promise<{ card: ScoutResult | null; related: ScoutResult }> {
  phase("Read");
  const [card, related] = await parallel([
    () =>
      cardArg
        ? scout(
            "scout-card",
            `${d.WHERE}\nRead card ${cardArg} through the read bindings in docs/BOARD.md. Report its identifier as the evidence item card, and its title, body, and every comment, verbatim, as the evidence item text. Change nothing.`,
            { label: "read the card", phase: "Read" },
          )
        : Promise.resolve(null),
    () =>
      scout(
        "scout-related-cards",
        `${d.WHERE}\nSearch the board for cards that duplicate, overlap, conflict with, or depend on this. Change nothing.\n\n${idea || cardArg}`,
        { label: "related cards", phase: "Read" },
      ),
  ]);
  if (cardArg) must(card, "read", `Card ${cardArg}.`);
  return { card, related: must(related, "read", "The related cards.") };
}

async function ground(d: Run, c: Card, related: ScoutResult): Promise<string> {
  phase("Ground");
  const brief = (task: string): string => `${d.WHERE}\n${task}\nChange nothing.\n\n${subject(c)}`;
  const { scouts } = KINDS[c.kind];
  const [library, ...found] = await parallel([
    () =>
      agent(
        brief(
          "Report what the project library already supports about this, citing each claim to its file and heading.",
        ),
        {
          agentType: "slopify:library-reader",
          label: "library",
          phase: "Ground",
          schema: LIBRARY_SCHEMA,
        },
      ),
    ...scouts.map(
      ([name, task]) =>
        () =>
          scout(name, brief(task), { label: name, phase: "Ground" }),
    ),
  ]);
  const lib = must(library, "ground", "What the library supports.");
  return [
    show("scout-related-cards", related),
    `library-reader: ${lib.summary}\n${list(lib.supported)}\n  Gaps: ${lib.gaps.join("; ") || "none"}`,
    ...scouts.map(([name], i) => show(name, must(found[i], "ground", `Evidence from ${name}.`))),
  ].join("\n\n");
}

async function adviseAll(d: Run, c: Card, evidence: string): Promise<string> {
  phase("Advise");
  const { advisors } = KINDS[c.kind];
  const views = await parallel(
    advisors.map(
      (name) => () =>
        advise(
          name,
          `${d.WHERE}\nJudge this ${c.kind} from your one angle.\n\n${subject(c)}\n\nEvidence:\n${evidence}`,
          {
            label: name,
            phase: "Advise",
          },
        ),
    ),
  );
  return advisors
    .map((name, i) => `${name}: ${JSON.stringify(must(views[i], "advise", `A view from ${name}.`))}`)
    .join("\n\n");
}

// ---- Draft and check --------------------------------------------------------

async function write(d: Run, c: Card, task: string, label: string, phaseTitle: string): Promise<string[]> {
  const w = must(
    await agent(
      `${d.WHERE}\nThe card is a ${c.kind}. Write it at ${c.draft}, and only there. ${task}\n\n${subject(c)}\n\nDo not file it, commit, or change the board; pusher does that.`,
      { agentType: "slopify:writer-card", label, phase: phaseTitle, schema: WRITER_SCHEMA },
    ),
    "draft",
    "A card draft.",
  );
  return w.openQuestions;
}

async function checkDraft(d: Run, c: Card): Promise<Problem[]> {
  const { lenses } = KINDS[c.kind];
  const verdicts = await parallel(
    lenses.map(
      (name) => () =>
        lens(name, `${d.WHERE}\nThe card draft is ${c.draft}, a ${c.kind}.`, { label: name, phase: "Check" }),
    ),
  );
  return lenses.flatMap((name, i) => {
    const v = must(verdicts[i], "check", `A verdict from ${name}.`);
    const found = v.findings.map((f) => ({ source: name, location: f.location, text: f.problem }));
    // A check that couldn't run found nothing, which is not the same as passing.
    if (v.verdict === "unverified" && found.length === 0) {
      found.push({ source: name, location: c.draft, text: `The check couldn't run: ${v.limits}` });
    }
    return found;
  });
}

async function rule(d: Run, c: Card, problems: readonly Problem[]): Promise<string[]> {
  const rulings = await parallel(
    problems.map(
      (p, i) => () =>
        agent(
          `${d.WHERE}\nRule on one problem ${p.source} reported in the card draft ${c.draft}, a ${c.kind}, checking it against the draft and the card template. blocker: a delivery can't take the card as it is. major: a real flaw that should be fixed before filing. minor: real but low impact.\n\nAt ${p.location}:\n${p.text}`,
          { agentType: "slopify:judge", label: `rule ${String(i + 1)}`, phase: "Check", schema: RULING_SCHEMA },
        ),
    ),
  );
  const confirmed: string[] = [];
  for (const [i, p] of problems.entries()) {
    const r = must(rulings[i], "check", `A ruling on ${p.location}.`);
    if (r.verdict === "confirmed" && r.severity !== "minor") confirmed.push(`${p.location}: ${p.text} (${r.reason})`);
  }
  return confirmed;
}

// Up to three rounds of checks and revisions. What is still wrong after them becomes an open question.
async function refine(d: Run, c: Card, firstOpen: readonly string[]): Promise<string[]> {
  let open = [...firstOpen];
  for (let round = 1; round <= MAX_FIX_ROUNDS; round += 1) {
    phase("Check");
    const confirmed = await rule(d, c, await checkDraft(d, c));
    if (confirmed.length === 0) return open;
    open =
      round === MAX_FIX_ROUNDS
        ? await write(
            d,
            c,
            `Record each of these problems under Open questions, changing nothing else:\n${list(confirmed)}`,
            "record what is open",
            "Check",
          )
        : await write(
            d,
            c,
            `Revise the draft to fix these problems:\n${list(confirmed)}`,
            `revise ${String(round)}`,
            "Check",
          );
  }
  return open;
}

// ---- File -------------------------------------------------------------------

async function file(d: Run, c: Card, slug: string, deliverable: boolean): Promise<string> {
  phase("File");
  const marker = `<!-- shape ${slug} -->`;
  const target = c.cardId
    ? `Update card ${c.cardId} with it.`
    : `Search the board for a card whose body holds the line ${marker}, and update that card with it; create a card only when there is none.`;
  const label =
    c.kind === "story"
      ? deliverable
        ? `Make sure the card has the label ${DELIVERABLE}.`
        : `Make sure the card doesn't have the label ${DELIVERABLE}.`
      : "";
  const r = pushed(
    await callPusher(
      `${d.WHERE}
The user's invocation of shape authorizes exactly this: write the card draft below to one card on the board, as docs/BOARD.md declares, and set its ${DELIVERABLE} label as asked. Nothing else: no commit, branch, push, PR, or other card. Work exactly as docs/BOARD.md binds it.

The draft is ${c.draft}. Use its text exactly as written, with one trailing line, ${marker}, which lets a rerun find this card. ${target} ${label} Keep every label the card already has otherwise. Report the card's identifier as the operation named card. If docs/BOARD.md declares no board, do nothing and report done.`,
      c.cardId ? "update the card" : "file the card",
      "File",
    ),
    "The card on the board.",
  );
  return opRef(r, "card") || c.cardId;
}

// ---- Run --------------------------------------------------------------------

export default async function run(): Promise<NotStarted | Stopped | Shaped> {
  const input = inputOf(args, "idea");
  const idea = textOf(input["idea"]);
  const cardArg = textOf(input["card"]);
  if (!idea && !cardArg) return { status: "not-started", next: "Ask the user for the idea, or the card to shape." };
  const d = createDeliver({ workflow: WORKFLOW, projectRoot: textOf(input["projectRoot"]), storyArg: idea || cardArg });
  try {
    const { card, related } = await read(d, cardArg, idea);
    const cardId = (card?.evidence.find((e) => e.source === "card")?.excerpt ?? "").trim();
    const slug = slugOf(cardId) || slugged(idea, "idea");
    const c: Card = {
      kind: kindOf(input["kind"]),
      idea,
      cardId,
      current: card?.evidence.find((e) => e.source === "text")?.excerpt ?? "",
      draft: `.tmp/shape/${slug}.md`,
    };
    const evidence = await ground(d, c, related);
    const views = await adviseAll(d, c, evidence);
    phase("Draft");
    const drafted = await write(
      d,
      c,
      `Write the card from its kind's template, starting from the card's current text when there is one.\n\nEvidence:\n${evidence}\n\nAdvisors:\n${views}`,
      "draft",
      "Draft",
    );
    const openQuestions = await refine(d, c, drafted);
    const deliverable = c.kind === "story" && openQuestions.length === 0;
    const filed = await file(d, c, slug, deliverable);
    return {
      status: "done",
      workflow: WORKFLOW,
      card: filed,
      deliverable,
      openQuestions,
      report: [
        `shape filed ${filed || "the card"} as a ${c.kind}${deliverable ? `, labelled ${DELIVERABLE}` : ""}.`,
        openQuestions.length > 0
          ? `Open questions, to answer on the card before running shape on it again:\n${list(openQuestions)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  } catch (error) {
    return stopOf(d, error);
  }
}
