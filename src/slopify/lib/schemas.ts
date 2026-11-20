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
    required: ["done", "operations", "unmet", "hookRejection"],
    properties: {
      done: { type: "boolean" },
      operations: arrayOf({
        type: "object",
        required: ["op", "result", "reference", "link"],
        properties: {
          op: { type: "string" },
          result: { type: "string" },
          reference: described({ type: "string" }, notes.reference),
          link: { type: "string", description: "The URL of a card you filed; empty when none" },
        },
      }),
      unmet: described(STRINGS, notes.unmet),
      hookRejection: {
        type: "string",
        description: "The failing output of a commit hook that rejected a commit; empty when no hook rejected one",
      },
      alreadyCommitted: {
        type: "boolean",
        description: "True only when a commit had nothing to commit because its listed content is already committed",
      },
      merged: {
        type: "boolean",
        description: "True only when merging the target branch brought in at least one commit",
      },
      conflicts: {
        ...STRINGS,
        description: "Each path a merge of the target branch left conflicted, relative to the worktree root",
      },
    },
  } as const;
}
