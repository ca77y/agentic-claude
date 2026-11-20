// Pure helpers for shape's split mode: the planner's schema, the cap, the parts and their order, which parts get a
// card, the checks on a filed card, and the report.
import { list, slugOf, unique } from "./deliver.ts";
import { STRINGS } from "./family.ts";

export const MAX_CARDS = 20;

export const PLAN_SCHEMA = {
  type: "object",
  required: ["constraints", "statedCap", "parts", "omitted"],
  properties: {
    constraints: { ...STRINGS, description: "What the request says holds for every part" },
    statedCap: { type: "integer", description: "The most cards the request says to file; 0 when it states none" },
    parts: {
      type: "array",
      description: "Every part the request needs, uncapped, each small enough for one card",
      items: {
        type: "object",
        required: ["key", "outcome", "dependsOn"],
        properties: {
          key: { type: "string", description: "A short name for the part, unique in this plan" },
          outcome: { type: "string", description: "What the part delivers, as an action" },
          dependsOn: { ...STRINGS, description: "The keys of the parts this one needs first" },
        },
      },
    },
    omitted: {
      type: "array",
      description: "What the request asks for that gets no part, and why",
      items: {
        type: "object",
        required: ["part", "reason"],
        properties: { part: { type: "string" }, reason: { type: "string" } },
      },
    },
  },
} as const;
export type Plan = Infer<typeof PLAN_SCHEMA>;

export interface Part {
  id: string;
  key: string;
  outcome: string;
  dependsOn: string[];
}

// A positive whole number, or a numeric string of one; null when absent.
export function capArgOf(arg: unknown): number | null | "invalid" {
  if (arg === undefined || arg === null) return null;
  const n = typeof arg === "number" ? arg : typeof arg === "string" && /^\s*\d+\s*$/.test(arg) ? Number(arg) : NaN;
  return Number.isSafeInteger(n) && n >= 1 ? n : "invalid";
}

export const capOf = (argCap: number | null, statedCap: number): number =>
  argCap ?? Math.min(statedCap > 0 ? statedCap : MAX_CARDS, MAX_CARDS);

export function partsOf(plan: Plan): Part[] {
  const taken = new Set<string>();
  const idOfKey = new Map<string, string>();
  const withIds = plan.parts.map((p) => {
    const base = slugOf(p.key) || "part";
    let id = base;
    let n = 1;
    while (taken.has(id)) id = `${base}-${++n}`;
    taken.add(id);
    if (!idOfKey.has(p.key)) idOfKey.set(p.key, id);
    return { ...p, id };
  });
  return withIds.map((p) => ({
    id: p.id,
    key: p.key,
    outcome: p.outcome,
    dependsOn: unique(p.dependsOn.flatMap((k) => idOfKey.get(k) ?? []).filter((d) => d !== p.id)),
  }));
}

// Plan order, each part after the parts it depends on; a cycle falls back to plan order.
export function orderParts(parts: readonly Part[]): Part[] {
  const byId = new Map(parts.map((p) => [p.id, p]));
  const done = new Set<string>();
  const visiting = new Set<string>();
  const out: Part[] = [];
  const visit = (p: Part): boolean => {
    if (done.has(p.id)) return true;
    if (visiting.has(p.id)) return false;
    visiting.add(p.id);
    for (const d of p.dependsOn) {
      const dep = byId.get(d);
      if (dep && !visit(dep)) return false;
    }
    visiting.delete(p.id);
    done.add(p.id);
    out.push(p);
    return true;
  };
  return parts.every((p) => visit(p)) ? out : [...parts];
}

export function selectParts(
  ordered: readonly Part[],
  covered: ReadonlySet<string>,
  cap: number,
): { selected: Part[]; overCap: Part[] } {
  const open = ordered.filter((p) => !covered.has(p.id));
  return { selected: open.slice(0, cap), overCap: open.slice(cap) };
}

// The story template's required parts, in plugins/slopify/references/card-templates.md.
export const REQUIRED_PARTS: readonly string[] = [
  "Title",
  "Summary",
  "Why",
  "Scope",
  "Out of scope",
  "Acceptance criteria",
];

export function missingParts(reported: readonly { name: string; words: number }[]): string[] {
  return REQUIRED_PARTS.filter((name) => reported.every((r) => r.name !== name || r.words <= 0));
}

// A model-chosen card id counts only when it is a location, or a whole token inside one, of the scout's evidence.
export function checkedId(id: string, locations: readonly string[]): string {
  const t = id.trim();
  if (!t || /\s/.test(t)) return "";
  return locations.some((loc) => loc.trim() === t || loc.split(/[^\w-]+/).includes(t)) ? t : "";
}

export interface SplitCard {
  part: string;
  card: string;
  deliverable: boolean;
  openQuestions: string[];
}
export interface Covered {
  part: string;
  card: string;
}
export interface LeftOut {
  part: string;
  reason: string;
}
export const splitReport: (r: {
  cards: readonly SplitCard[];
  covered: readonly Covered[];
  leftOut: readonly LeftOut[];
}) => string = ({ cards, covered, leftOut }) =>
  [
    `Filed:\n${list(
      cards.map(
        (c) =>
          `${c.part}: ${c.card}, ${c.deliverable ? "Deliverable" : "not Deliverable"}${
            c.openQuestions.length > 0 ? `; open questions: ${c.openQuestions.join("; ")}` : ""
          }`,
      ),
    )}`,
    `Covered by an existing card:\n${list(covered.map((c) => `${c.part}: ${c.card}`))}`,
    `Left out:\n${list(leftOut.map((l) => `${l.part}: ${l.reason}`))}`,
  ].join("\n\n");
