// Pure helpers for shape's split mode: the planner's schema, the cap, the parts and their order, which parts get a
// card, the checks on a filed card, and the report.
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

// Stub: the work lands with the implementation.
export const capArgOf: (arg: unknown) => number | null | "invalid" = () => null;
export const capOf: (argCap: number | null, statedCap: number) => number = () => 0;
export const partsOf: (plan: Plan) => Part[] = () => [];
export const orderParts: (parts: readonly Part[]) => Part[] = (parts) => [...parts];
export const selectParts: (
  ordered: readonly Part[],
  covered: ReadonlySet<string>,
  cap: number,
) => { selected: Part[]; overCap: Part[] } = () => ({ selected: [], overCap: [] });

export const REQUIRED_PARTS: readonly string[] = [];
export const missingParts: (reported: readonly { name: string; words: number }[]) => string[] = () => [];
export const checkedId: (id: string, locations: readonly string[]) => string = () => "";

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
}) => string = () => "";
