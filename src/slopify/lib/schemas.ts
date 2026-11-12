// The producer and operations schemas the workflows share. Each workflow words the field descriptions for its
// own task, so the builders take them; a field given no description has none.
import { STRINGS } from "./family.ts";

function described<const S extends Schema>(
  schema: S,
  description: string | undefined,
): S | (S & { description: string }) {
  return description === undefined ? schema : { ...schema, description };
}

function arrayOf<const S extends Schema>(
  items: S,
  description?: string,
): { type: "array"; items: S } | { type: "array"; description: string; items: S } {
  return description === undefined ? { type: "array", items } : { type: "array", description, items };
}

// What the library-reader reports about the subject of a run.
export function libraryReaderSchema(subject: string) {
  return {
    type: "object",
    required: ["summary", "supported", "gaps"],
    properties: {
      summary: { type: "string", description: `What the existing library already supports about ${subject}` },
      supported: { ...STRINGS, description: "Supported claims, each with the library file and heading it comes from" },
      gaps: { ...STRINGS, description: "What the library does not cover, stale or contested material included" },
    },
  } as const;
}

export function pusherSchema(notes: { reference?: string; unmet?: string } = {}) {
  return {
    type: "object",
    required: ["done", "operations", "unmet"],
    properties: {
      done: { type: "boolean" },
      operations: arrayOf({
        type: "object",
        required: ["op", "result", "reference"],
        properties: {
          op: { type: "string" },
          result: { type: "string" },
          reference: described({ type: "string" }, notes.reference),
        },
      }),
      unmet: described(STRINGS, notes.unmet),
    },
  } as const;
}

// A judge's ruling on one problem reported against a spec or a card draft.
export const RULING_SCHEMA = {
  type: "object",
  required: ["verdict", "severity", "reason"],
  properties: {
    verdict: { type: "string", enum: ["confirmed", "dismissed"] },
    severity: { type: "string", enum: ["blocker", "major", "minor"] },
    reason: { type: "string" },
  },
} as const;
