// The spec folder's two structured files, as the writer returns them. The script reads these directly and hands each
// agent its slice, so no agent opens the whole spec.
import { STRINGS } from "./family.ts";

const TASK = {
  type: "object",
  required: ["id", "dependsOn", "files", "criteria", "todo", "reuse", "create"],
  properties: {
    id: { type: "string" },
    dependsOn: { ...STRINGS, description: "Ids of the tasks this one needs finished first" },
    files: { ...STRINGS, description: "Files or directories this task may write, relative to the worktree root" },
    criteria: { ...STRINGS, description: "Ids of the criteria this task delivers" },
    todo: { type: "string", description: "What to do, including anything only this task needs" },
    reuse: { ...STRINGS, description: "What already exists and must be used, not rebuilt" },
    create: { ...STRINGS, description: "What this task creates" },
  },
} as const;

const CRITERION = {
  type: "object",
  required: ["id", "wording", "category", "path", "evidence", "firstTest"],
  properties: {
    id: { type: "string" },
    wording: { type: "string", description: "The criterion copied word for word from the issue" },
    category: { type: "string", description: "A category from TESTING.md, or uncategorized when none fits" },
    path: { type: "string", description: "The validation path to run for this criterion" },
    evidence: { type: "string", description: "The evidence that path must produce" },
    firstTest: { type: "string", description: "The first test to write" },
  },
} as const;

const DECISION = {
  type: "object",
  required: ["id", "question", "choice", "rationale", "reversible", "affectsAcceptance"],
  properties: {
    id: { type: "string" },
    question: { type: "string" },
    choice: { type: "string" },
    rationale: { type: "string", description: "What grounds the choice" },
    reversible: { type: "boolean" },
    affectsAcceptance: { type: "boolean", description: "True when the choice changes behavior a criterion describes" },
  },
} as const;

export const BUILD = {
  type: "object",
  required: ["shared", "tasks", "docs", "decisions"],
  properties: {
    shared: {
      ...STRINGS,
      description: "Constraints and interfaces every task of this story must follow; never a repeated project rule",
    },
    tasks: { type: "array", items: TASK },
    docs: { ...STRINGS, description: "Documents making claims about the area the change touches; can be empty" },
    decisions: { type: "array", items: DECISION },
  },
} as const;

export const VALIDATE = {
  type: "object",
  required: ["criteria"],
  properties: { criteria: { type: "array", items: CRITERION } },
} as const;

export type Build = Infer<typeof BUILD>;
export type Task = Build["tasks"][number];
export type Validate = Infer<typeof VALIDATE>;
export type Criterion = Validate["criteria"][number];
export type RecordedDecision = Infer<typeof DECISION>;

// A spec file a scout quoted on a rerun, or null when it isn't one, which sends the run back through the how phase.
function parsed(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
const isBuild = (v: unknown): v is Build => typeof v === "object" && v !== null && "tasks" in v;
const isValidate = (v: unknown): v is Validate => typeof v === "object" && v !== null && "criteria" in v;

export function parseBuild(text: string): Build | null {
  const v = parsed(text);
  return isBuild(v) ? v : null;
}
export function parseValidate(text: string): Validate | null {
  const v = parsed(text);
  return isValidate(v) ? v : null;
}
