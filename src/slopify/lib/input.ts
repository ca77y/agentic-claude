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

const answerMap = (v: unknown): Input => (isRecord(v) && !Array.isArray(v) ? v : {});

/** The answers arg, by need id; an array is no answers, and a null answer is unanswered. */
export function answersOf(v: unknown): Answers {
  return Object.fromEntries(
    Object.entries(answerMap(v)).filter((e): e is [string, string | number | boolean] => isPlain(e[1])),
  );
}

/** A not-started result naming each answer that is an object or a list, which no agent may see; null when there is none. */
export function unplainAnswers(v: unknown): NotStarted | null {
  const ids = Object.entries(answerMap(v))
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
