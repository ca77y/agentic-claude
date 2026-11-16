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

// An answer is plain text: a string, or a number or boolean read as its text. null is no answer.
const isPlain = (x: unknown): x is string | number | boolean =>
  typeof x === "string" || typeof x === "number" || typeof x === "boolean";

const isMap = (v: unknown): v is Input => isRecord(v) && !Array.isArray(v);

/** The answers arg, by need id; check it with answersRejected first. A null answer is unanswered. */
export function answersOf(v: unknown): Answers {
  return isMap(v)
    ? Object.fromEntries(Object.entries(v).filter((e): e is [string, string | number | boolean] => isPlain(e[1])))
    : {};
}

/** Why the answers arg can't be used, before any agent works: it is given but is not a map, or an answer in it is an
 * object or a list, which no agent may see. A missing one is none. */
export function answersRejected(v: unknown): NotStarted | null {
  if (v === undefined || v === null) return null;
  if (!isMap(v)) {
    return {
      status: "not-started",
      next: 'The answers argument must be a map from a decision id to its answer, such as {"q1": "a"}. Ask the user for the answers as a map, then invoke again.',
    };
  }
  const ids = Object.entries(v)
    .filter(([, x]) => isRecord(x))
    .map(([id]) => id);
  return ids.length === 0
    ? null
    : {
        status: "not-started",
        next: `The answer to ${ids.join(", ")} must be plain text, not an object or a list. Invoke again with each of those answers given as text.`,
      };
}

/** The brief line that says where the project is. */
export function whereOf(projectRoot: string): string {
  return projectRoot ? `The project is at ${projectRoot}.` : "The project is the session project directory.";
}
