import { dispatch } from "../lib/dispatch.ts";
import {
  LENS_SCHEMA,
  STRINGS,
  absent,
  advise,
  adviseFit,
  defectsOf,
  fact,
  lens,
  scout,
  slugged,
  type FitResult,
  type LensResult,
  type ScoutResult,
} from "../lib/family.ts";
import {
  MARKER_LINE,
  callPusher,
  createDeliver,
  fenced,
  list,
  opRef,
  show,
  slugOf,
  unique,
  type Stopped,
} from "../lib/deliver.ts";
import { flagOf, inputOf, textOf, type Input, type NotStarted } from "../lib/input.ts";
import { Halt, must, pushed, stopOf, type Run } from "../lib/loop.ts";
import { MAX_FIX_ROUNDS, SHAPED_LABEL, hasLabel } from "../lib/rules.ts";
import { confirmedProblems } from "../lib/judge.ts";
import { libraryReaderSchema } from "../lib/schemas.ts";
import {
  PLAN_SCHEMA,
  capArgOf,
  capOf,
  checkedId,
  missingParts,
  orderParts,
  partsOf,
  selectParts,
  splitReport,
  type Covered,
  type LeftOut,
  type Part,
  type Plan,
  type SplitCard,
} from "../lib/split.ts";

export const meta = {
  name: "shape",
  description:
    "Turn an idea into a card of the kind the user asks for, story, bug, or spike, written from the plugin's card template: scouts and advisors ground it, writer-card drafts it, cheap checks and a judge refine it, and pusher files it, labelled Deliverable when a story has no open question",
  whenToUse:
    "Run only when the user invokes /slopify:shape or asks for the slopify shape workflow. Args: {idea?, card?, kind?, split?, cap?, projectRoot?}, or the idea as a plain string; card names an existing card to start from, such as one whose open questions are now answered; a card shape already filed, labelled Shaped, skips Ground and Advise; kind is story, bug, or spike, and story when not given; split: true breaks the idea, a larger request, into several small story cards, with no card and no kind but story; cap is the most cards a split may file, a whole number of 1 or more: pass the cap the user gives as cap, and with none the split files at most the cap the request states, and never more than 20; projectRoot defaults to the session project directory.",
  phases: [
    {
      title: "Read",
      detail: "scout-card reads the named card, its labels, and its comments; scout-related-cards searches the board",
    },
    { title: "Ground", detail: "library-reader and scouts, by kind" },
    {
      title: "Plan",
      detail:
        "split only: writer-split breaks the request into parts; a part a board card already covers gets no card, and the rest up to the cap are shaped",
    },
    { title: "Advise", detail: "advisors, by kind; in a split, for each part" },
    { title: "Draft", detail: "writer-card writes the card from its kind's template" },
    {
      title: "Check",
      detail: "lenses by kind, then one judge rules on the round's findings; writer-card revises, up to three times",
    },
    { title: "File", detail: "pusher creates or updates the card, labels it Shaped, and sets its Deliverable label" },
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
    advisors: ["advisor-scope", "advisor-fit"],
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
// A split files a card only when it has every part its template requires, so its writer also reports them.
const SPLIT_WRITER_SCHEMA = {
  ...WRITER_SCHEMA,
  required: [...WRITER_SCHEMA.required, "parts"],
  properties: {
    ...WRITER_SCHEMA.properties,
    parts: {
      type: "array",
      description: "Each template part the draft holds, by its name in the template, with its word count",
      items: {
        type: "object",
        required: ["name", "words"],
        properties: { name: { type: "string" }, words: { type: "integer" } },
      },
    },
  },
} as const;
type Written = Infer<typeof SPLIT_WRITER_SCHEMA>;

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
  /** shape filed the card before, so its grounding and advice are already in it. */
  shaped: boolean;
  /** The card is one part of a split request. */
  split: boolean;
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

interface Split {
  status: "done";
  workflow: typeof WORKFLOW;
  cards: SplitCard[];
  covered: Covered[];
  leftOut: LeftOut[];
  report: string;
}

interface Duplicate {
  status: "duplicate";
  workflow: typeof WORKFLOW;
  /** The existing card that already holds the idea. */
  card: string;
  /** The card the user named, which shape marked a duplicate of it; empty for an idea. */
  marked: string;
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

// The line shape ends a card with, naming the run's slug. Its words are joined by spaces, which leaves nothing a board
// links on save, such as Linear turning smr-317 into an issue link, so a rerun finds the card by it.
const markerOf = (slug: string): string => `<!-- shape ${slug.replaceAll("-", " ")} -->`;

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
            `${d.WHERE}\nRead card ${cardArg} through the read bindings in docs/BOARD.md. Report its identifier as the evidence item card, its labels, comma-separated, as the evidence item labels, and its title, body, and every comment, verbatim, as the evidence item text. Change nothing.`,
            { label: "read the card", phase: "Read" },
          )
        : Promise.resolve(null),
    () =>
      scout(
        "scout-related-cards",
        `${d.WHERE}\nSearch the board for cards that duplicate, overlap, conflict with, or depend on this.${idea && !cardArg ? ` Report a card whose body holds the line ${markerOf(slugged(idea, "idea"))} as its own evidence item, with the card's identifier as location and that line, verbatim, in excerpt.` : ""} Change nothing.\n\n${idea || cardArg}`,
        { phase: "Read" },
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
      dispatch(
        brief(
          "Report what the project library already supports about this, citing each claim to its file and heading.",
        ),
        {
          agentType: "slopify:library-reader",
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

async function adviseAll(
  d: Run,
  c: Card,
  evidence: string,
): Promise<{ views: string; duplicateOf: string; overlaps: string[] }> {
  phase("Advise");
  const { advisors } = KINDS[c.kind];
  const brief = `${d.WHERE}\nJudge this ${c.kind} from your one angle.\n\n${subject(c)}\n\nEvidence:\n${evidence}`;
  const results = await parallel(
    advisors.map((name) => () => {
      const opts = { label: name, phase: "Advise" };
      return name === "advisor-fit" ? adviseFit(brief, opts) : advise(name, brief, opts);
    }),
  );
  const views = advisors.map((name, i) => must(results[i], "advise", `A view from ${name}.`));
  const fit = views.find((v): v is FitResult => "duplicateOf" in v);
  const original = fit && !absent(fit.duplicateOf) ? fit.duplicateOf.trim() : "";
  return {
    views: advisors.map((name, i) => `${name}: ${JSON.stringify(views[i])}`).join("\n\n"),
    // A card is never a duplicate of itself.
    duplicateOf: original === c.cardId ? "" : original,
    overlaps: fit?.overlaps ?? [],
  };
}

// ---- Draft and check --------------------------------------------------------

async function draft(d: Run, c: Card, related: ScoutResult): Promise<Written | { duplicateOf: string }> {
  const evidence = await ground(d, c, related);
  const { views, duplicateOf } = await adviseAll(d, c, evidence);
  return duplicateOf ? { duplicateOf } : firstDraft(d, c, evidence, views);
}

function firstDraft(d: Run, c: Card, evidence: string, views: string): Promise<Written> {
  phase("Draft");
  return write(
    d,
    c,
    `Write the card from its kind's template, starting from the card's current text when there is one.\n\nEvidence:\n${evidence}\n\nAdvisors:\n${views}`,
    "draft",
    "Draft",
  );
}

// A card shape filed already carries its grounding and advice, so a rerun only applies what changed on it.
async function reshape(d: Run, c: Card): Promise<Written> {
  log(`${c.cardId} is labelled ${SHAPED_LABEL}, so Ground and Advise are skipped.`);
  phase("Draft");
  return write(
    d,
    c,
    "Revise the card from its current text: apply each answer its comments give to its open questions, and remove each question answered. Keep the rest as it is.",
    "apply the answers",
    "Draft",
  );
}

async function write(d: Run, c: Card, task: string, label: string, phaseTitle: string): Promise<Written> {
  const parts = c.split
    ? " Report in parts each template part the draft holds, by its name in the template, with its word count."
    : "";
  const brief = `${d.WHERE}\nThe card is a ${c.kind}. Write it at ${c.draft}, and only there. ${task}${parts}\n\n${subject(c)}\n\nDo not file it, commit, or change the board; pusher does that.`;
  const opts = { agentType: "slopify:writer-card", label, phase: phaseTitle };
  if (c.split) return must(await dispatch(brief, { ...opts, schema: SPLIT_WRITER_SCHEMA }), "draft", "A card draft.");
  const w = must(await dispatch(brief, { ...opts, schema: WRITER_SCHEMA }), "draft", "A card draft.");
  return { openQuestions: w.openQuestions, parts: [] };
}

// Every lens asks what a draft is missing, so one advisor asks what it could lose, and its findings go to the judge too.
const SIMPLIFY = "advisor-simplify";
async function simplify(d: Run, c: Card): Promise<Problem[]> {
  const v = await dispatch(
    `${d.WHERE}\nThe card draft is ${c.draft}, a ${c.kind}. Report what it could remove, merge, or narrow and still deliver its outcome.\n\n${subject(c)}`,
    { agentType: `slopify:${SIMPLIFY}`, label: "simplify the draft", phase: "Check", schema: LENS_SCHEMA },
  );
  return defectsOf(must(v, "check", `A view from ${SIMPLIFY}.`)).map((f) => ({
    source: SIMPLIFY,
    location: f.location,
    text: f.problem,
  }));
}

async function checkDraft(d: Run, c: Card): Promise<Problem[]> {
  const { lenses } = KINDS[c.kind];
  const [verdicts, simpler] = await Promise.all([
    parallel(
      lenses.map(
        (name) => () =>
          lens(name, `${d.WHERE}\nThe card draft is ${c.draft}, a ${c.kind}.`, { label: name, phase: "Check" }),
      ),
    ),
    simplify(d, c),
  ]);
  return [...simpler, ...checkFindings(c, lenses, verdicts)];
}

function checkFindings(c: Card, lenses: readonly string[], verdicts: readonly (LensResult | null)[]): Problem[] {
  return lenses.flatMap((name, i) => {
    const v = must(verdicts[i], "check", `A verdict from ${name}.`);
    const found = defectsOf(v).map((f) => ({ source: name, location: f.location, text: f.problem }));
    // A check that couldn't run found nothing, which is not the same as passing.
    if (v.verdict === "unverified" && found.length === 0) {
      found.push({ source: name, location: c.draft, text: `The check couldn't run: ${v.limits}` });
    }
    return found;
  });
}

const rule = (d: Run, c: Card, problems: readonly Problem[]): Promise<string[]> =>
  confirmedProblems(
    problems,
    `${d.WHERE}\nThe checks reported problems in the card draft ${c.draft}, a ${c.kind}; check them against the draft and the card template. A finding from ${SIMPLIFY} holds when the card still delivers its outcome without what it names. blocker: a delivery can't take the card as it is. major: a real flaw that should be fixed before filing. minor: real but low impact.`,
    "Check",
  );

// Up to three revisions, each checked. What is still wrong after them becomes an open question. In a split, a required
// template part the draft lacks is a problem too, and a draft still lacking one after the revisions is not filed.
async function refine(d: Run, c: Card, first: Written): Promise<Written> {
  let written = first;
  for (let revisions = 0; revisions <= MAX_FIX_ROUNDS; revisions += 1) {
    phase("Check");
    const missing = c.split ? missingParts(written.parts) : [];
    const confirmed = [
      ...missing.map((name) => `The draft lacks the template's required part ${name}, or leaves it empty.`),
      ...(await rule(d, c, await checkDraft(d, c))),
    ];
    if (confirmed.length === 0) return written;
    written =
      revisions === MAX_FIX_ROUNDS
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
            `Revise the draft to fix these problems. Prefer removing text to adding it, and remove what a problem names as extra:\n${list(confirmed)}`,
            `revise ${String(revisions + 1)}`,
            "Check",
          );
  }
  return written;
}

// ---- File -------------------------------------------------------------------

interface Relations {
  cap: number;
  blockedBy: readonly string[];
  relatedTo: readonly string[];
}

// A split card's create names its relations, and only those the run checked or filed.
function splitTarget(r: Relations): string {
  const named = [
    r.blockedBy.length > 0 ? `Make it blocked by ${r.blockedBy.join(", ")}.` : "",
    r.relatedTo.length > 0 ? `Make it related to ${r.relatedTo.join(", ")}.` : "",
  ].filter(Boolean);
  return `Create a card with it. ${named.length > 0 ? named.join(" ") : "Add no relation."}`;
}

async function file(d: Run, c: Card, slug: string, deliverable: boolean, split?: Relations): Promise<string> {
  phase("File");
  const marker = markerOf(slug);
  // advisor-fit already found no card holding this idea, so an idea gets a new card.
  const target = split ? splitTarget(split) : c.cardId ? `Update card ${c.cardId} with it.` : "Create a card with it.";
  const authorizes = split
    ? `The user's invocation of shape on one request authorizes at most ${String(split.cap)} new cards, and this is one of them: create one card on the board from the card draft below, as docs/BOARD.md declares, with the relations this brief names, and set its ${SHAPED_LABEL} and ${DELIVERABLE} labels as asked. Nothing else: no change to an existing card, and no other card, commit, branch, push, or PR. When a relation this brief names has no Create binding in docs/BOARD.md, create nothing and report that relation unmet.`
    : `The user's invocation of shape authorizes exactly this: write the card draft below to one card on the board, as docs/BOARD.md declares, and set its ${SHAPED_LABEL} and ${DELIVERABLE} labels as asked. Nothing else: no commit, branch, push, PR, or other card.`;
  const deliverableLabel =
    c.kind === "story"
      ? deliverable
        ? ` Make sure the card has the label ${DELIVERABLE}.`
        : ` Make sure the card doesn't have the label ${DELIVERABLE}.`
      : "";
  const label = `Make sure the card has the label ${SHAPED_LABEL}.${deliverableLabel}`;
  const r = pushed(
    await callPusher(
      `${d.WHERE}
${authorizes} Work exactly as docs/BOARD.md binds it.

The draft is ${c.draft}. Use its text exactly as written, with one trailing line, ${marker}. ${MARKER_LINE} ${target} ${label} Keep every label the card already has otherwise. Report the card's identifier as the operation card.`,
      c.cardId ? "update the card" : "file the card",
      "File",
    ),
    "The card on the board.",
  );
  return opRef(r, "card") || c.cardId;
}

// An idea another card already holds files nothing; a card the user named that repeats one is marked as its duplicate.
// A card found by an earlier run's line was not named, so it is never marked.
async function duplicate(d: Run, c: Card, original: string, named: string): Promise<Duplicate> {
  phase("File");
  if (named) {
    pushed(
      await callPusher(
        `${d.WHERE}
The user's invocation of shape authorizes exactly this: mark card ${named} a duplicate of card ${original}, as docs/BOARD.md's duplicate binding declares. Nothing else: no other card write, commit, branch, push, or PR. Report ${named} as the operation card.`,
        "mark the duplicate",
        "File",
      ),
      "The duplicate mark on the card.",
    );
  }
  return {
    status: "duplicate",
    workflow: WORKFLOW,
    card: original,
    marked: named,
    report: named
      ? `shape marked ${named} a duplicate of ${original}, which already holds this ${c.kind}.`
      : `shape filed nothing: ${original} already holds this ${c.kind}. Run /slopify:shape ${original} to work on it.`,
  };
}

// ---- Split ------------------------------------------------------------------

// The most parts drafted at once; each wave is filed, in order, before the next starts.
const WAVE = 4;

/** A part no card covers yet, with what its card is shaped from. */
interface OpenPart {
  part: Part;
  shaping: Card;
  /** The slug its hidden line and draft are named for. */
  slug: string;
  evidence: string;
  views: string;
  /** Checked ids of the cards that hold part of its outcome. */
  related: string[];
}

// parallel() turns a throw into null, so a halt in one part waits here until the others have finished, then ends the run.
async function holdingHalts<T, R>(items: readonly T[], each: (item: T) => Promise<R>): Promise<R[]> {
  const held: { halt: Halt | null } = { halt: null };
  const results = await parallel(
    items.map((item) => async () => {
      try {
        return await each(item);
      } catch (error) {
        if (!(error instanceof Halt)) throw error;
        held.halt ??= error;
        return null;
      }
    }),
  );
  if (held.halt) throw held.halt;
  return results.map((r) => must(r, "split", "A part's result."));
}

function splitRefusal(input: Input, idea: string, cardArg: string, cap: number | null | "invalid"): string {
  if (cardArg)
    return "A split breaks a request into new cards and can't start from a card: give the request as idea, without card.";
  if ((input["kind"] ?? "story") !== "story") return "A split files only stories: drop kind, or set it to story.";
  if (!idea) return "Ask the user for the request to split, and give it as idea.";
  return cap === "invalid"
    ? "cap must be a whole number of 1 or more: ask the user for the most cards to file, and give it as cap."
    : "";
}

async function plan(d: Run, request: string, evidence: string): Promise<Plan> {
  phase("Plan");
  return must(
    await dispatch(
      `${d.WHERE}\nBreak the request below into the parts it needs, each small enough for one story card. Plan every part the request needs: a cap on the cards filed is applied after you, so never trim the plan to one. Write no file and change no board.\n\n${fenced("REQUEST", request)}\n\nEvidence:\n${evidence}`,
      { agentType: "slopify:writer-split", label: "plan the cards", phase: "Plan", schema: PLAN_SCHEMA },
    ),
    "plan",
    "The plan of the request's parts.",
  );
}

// A part's card is a story of its own outcome, held to every constraint of the whole set.
const partIdea = (p: Part, constraints: readonly string[], request: string): string =>
  [
    p.outcome,
    constraints.length > 0
      ? `These constraints apply to every card in the set this card belongs to, so this card holds to each of them:\n${list(constraints)}`
      : "",
    `This card is one part of this request; other cards in the set cover the rest of it:\n${request}`,
  ]
    .filter(Boolean)
    .join("\n\n");

// A card holding the part's hidden line covers it; otherwise a duplicate advisor-fit names, checked against the part's
// related cards, covers it.
async function cover(
  d: Run,
  request: string,
  slug: string,
  constraints: readonly string[],
  evidence: string,
  p: Part,
): Promise<Covered | OpenPart> {
  const partSlug = `${slug}-${p.id}`;
  const marker = markerOf(partSlug);
  const found = must(
    await scout(
      "scout-related-cards",
      `${d.WHERE}\nSearch the board for cards that duplicate, overlap, conflict with, or depend on this part of a larger request. Report a card whose body holds the line ${marker} as its own evidence item, with that line, verbatim, in excerpt. Give every match's location as the bare card identifier, never a URL or a title. Change nothing.\n\n${p.outcome}`,
      { label: `related cards for ${p.id}`, phase: "Advise" },
    ),
    "advise",
    `The related cards for ${p.id}.`,
  );
  const byLine = found.evidence.find((e) => e.excerpt.includes(marker))?.location.trim();
  if (byLine) return { part: p.id, card: byLine };
  const shaping: Card = {
    kind: "story",
    idea: partIdea(p, constraints, request),
    cardId: "",
    current: "",
    shaped: false,
    split: true,
    draft: `.tmp/shape/${slug}/${p.id}.md`,
  };
  const all = `${evidence}\n\n${show(`scout-related-cards for ${p.id}`, found)}`;
  const { views, duplicateOf, overlaps } = await adviseAll(d, shaping, all);
  const locations = found.evidence.map((e) => e.location);
  const original = checkedId(duplicateOf, locations);
  if (original) return { part: p.id, card: original };
  const related = unique(overlaps.map((id) => checkedId(id, locations)));
  return { part: p, shaping, slug: partSlug, evidence: all, views, related };
}

// Ground once, plan once, then shape and file each part no card covers, up to the cap, a wave at a time in dependency
// order, so a dependency's card exists before its dependent's create names it.
async function runSplit(d: Run, request: string, argCap: number | null): Promise<Split> {
  const { related } = await read(d, "", request);
  const slug = slugged(request, "idea");
  const whole: Card = { kind: "story", idea: request, cardId: "", current: "", shaped: false, split: true, draft: "" };
  const evidence = await ground(d, whole, related);
  const planned = await plan(d, request, evidence);
  const ordered = orderParts(partsOf(planned));
  const cap = capOf(argCap, planned.statedCap);
  const found = await holdingHalts(ordered, (p) => cover(d, request, slug, planned.constraints, evidence, p));
  const covered = found.filter((f): f is Covered => typeof f.part === "string");
  const open = found.filter((f): f is OpenPart => typeof f.part !== "string");
  const { selected, overCap } = selectParts(ordered, new Set(covered.map((c) => c.part)), cap);
  const leftOut: LeftOut[] = [
    ...planned.omitted.map((o) => ({ part: o.part, reason: o.reason })),
    ...overCap.map((p) => ({ part: p.id, reason: `over the cap of ${String(cap)}` })),
  ];
  const cards: SplitCard[] = [];
  const cardOfPart = new Map(covered.map((c) => [c.part, c.card]));
  const todo = selected.flatMap((s) => open.filter((o) => o.part.id === s.id));
  for (let at = 0; at < todo.length; at += WAVE) {
    const wave = todo.slice(at, at + WAVE);
    const drafted = await holdingHalts(wave, async (o) =>
      refine(d, o.shaping, await firstDraft(d, o.shaping, o.evidence, o.views)),
    );
    for (const [i, o] of wave.entries()) {
      const { openQuestions, parts } = drafted[i] ?? { openQuestions: [], parts: [] };
      const missing = missingParts(parts);
      if (missing.length > 0) {
        leftOut.push({ part: o.part.id, reason: `still missing ${missing.join(", ")} after the revisions` });
        continue;
      }
      const deliverable = openQuestions.length === 0;
      const blockedBy = unique(o.part.dependsOn.map((id) => cardOfPart.get(id) ?? ""));
      const card = await file(d, o.shaping, o.slug, deliverable, { cap, blockedBy, relatedTo: o.related });
      cardOfPart.set(o.part.id, card);
      cards.push({ part: o.part.id, card, deliverable, openQuestions });
      d.done(`file ${o.part.id}: ${card}`);
    }
  }
  return {
    status: "done",
    workflow: WORKFLOW,
    cards,
    covered,
    leftOut,
    report: `shape split the request into ${String(ordered.length)} parts and filed ${String(cards.length)} cards.\n\n${splitReport({ cards, covered, leftOut })}`,
  };
}

// ---- Run --------------------------------------------------------------------

export default async function run(): Promise<NotStarted | Stopped | Shaped | Duplicate | Split> {
  const input = inputOf(args, "idea");
  const idea = textOf(input["idea"]);
  const cardArg = textOf(input["card"]);
  const split = flagOf(input["split"]);
  const cap = capArgOf(input["cap"]);
  const refused = split ? splitRefusal(input, idea, cardArg, cap) : "";
  if (refused) return { status: "not-started", next: refused };
  if (!idea && !cardArg) return { status: "not-started", next: "Ask the user for the idea, or the card to shape." };
  const d = createDeliver({ workflow: WORKFLOW, projectRoot: textOf(input["projectRoot"]), storyArg: idea || cardArg });
  if (split) {
    try {
      return await runSplit(d, idea, cap === "invalid" ? null : cap);
    } catch (error) {
      return stopOf(d, error);
    }
  }
  try {
    const { card, related } = await read(d, cardArg, idea);
    const named = (card?.evidence.find((e) => e.source === "card")?.excerpt ?? "").trim();
    const slug = slugOf(named) || slugged(idea, "idea");
    // A rerun on an idea updates the card an earlier run filed for it, found by the line that run ended it with.
    const cardId = named || (related.evidence.find((e) => e.excerpt.includes(markerOf(slug)))?.location.trim() ?? "");
    const c: Card = {
      kind: kindOf(input["kind"]),
      idea,
      cardId,
      current: card?.evidence.find((e) => e.source === "text")?.excerpt ?? "",
      shaped: hasLabel(fact(card, "labels"), SHAPED_LABEL),
      split: false,
      draft: `.tmp/shape/${slug}.md`,
    };
    const drafted = c.shaped ? await reshape(d, c) : await draft(d, c, related);
    if ("duplicateOf" in drafted) return await duplicate(d, c, drafted.duplicateOf, named);
    const { openQuestions } = await refine(d, c, drafted);
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
