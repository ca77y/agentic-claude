// Reading a workflow's args: the input object, its string fields, and the answers to a rerun.
import type { Answers } from "./family.ts";

/** The args object a workflow reads its fields from. */
export type Input = Readonly<Record<string, unknown>>;

/** What a workflow returns when its args lack the one field it cannot start without. */
export interface NotStarted {
  status: "not-started";
  next: string;
}

function isRecord(v: unknown): v is Input {
  return typeof v === "object" && v !== null;
}

// `args` may arrive as the raw string rather than a parsed object. A JSON object is the input; any other
// string is the primary field, and so is a JSON number when numbers is set.
export function inputOf(a: unknown, primary: string, numbers = false): Input {
  if (typeof a !== "string") return isRecord(a) ? a : {};
  const text = a.trim();
  try {
    const parsed: unknown = JSON.parse(text);
    if (isRecord(parsed)) return parsed;
    if (typeof parsed === "string" || (numbers && typeof parsed === "number")) {
      return { [primary]: String(parsed).trim() };
    }
  } catch {
    // not JSON: the string is the primary field
  }
  return { [primary]: text };
}

/** A boolean field; true only for true. */
export const flagOf = (v: unknown): boolean => v === true;

/** A string field trimmed; '' for anything else. */
export const textOf = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

// An answer as answerOf reads it: a primitive as given, anything else as its string form.
function answerValue(x: unknown): Answers[string] {
  const text = String(x);
  return x === null || x === undefined || typeof x === "string" || typeof x === "number" || typeof x === "boolean"
    ? x
    : text;
}

const isMap = (v: unknown): v is Input => isRecord(v) && !Array.isArray(v);

/** The answers arg, by need id; anything but a map is no answers, so check it with answersRejected first. */
export function answersOf(v: unknown): Answers {
  return isMap(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, answerValue(x)])) : {};
}

/** Why the answers arg can't be read, before any agent works: it is given but is not a map. A missing one is none. */
export function answersRejected(v: unknown): NotStarted | null {
  if (v === undefined || v === null || isMap(v)) return null;
  return {
    status: "not-started",
    next: 'The answers argument must be a map from a decision id to its answer, such as {"q1": "a"}. Ask the user for the answers as a map, then invoke again.',
  };
}

/** The brief line that says where the project is. */
export function whereOf(projectRoot: string): string {
  return projectRoot ? `The project is at ${projectRoot}.` : "The project is the session project directory.";
}
