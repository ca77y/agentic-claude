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

const TASK = {
  type: "object",
  required: ["id", "summary", "paths"],
  properties: { id: { type: "string" }, summary: { type: "string" }, paths: STRINGS },
} as const;

const MEASUREMENT = {
  type: "object",
  required: ["claim", "value", "command"],
  properties: { claim: { type: "string" }, value: { type: "string" }, command: { type: "string" } },
} as const;

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

interface WriterNotes {
  produced: string;
  revision: string;
  openDecisions?: string;
  storyBlockers?: string;
  tasks?: string;
  docs?: string;
}

export function writerSchema(notes: WriterNotes) {
  return {
    type: "object",
    required: ["produced", "revision", "openDecisions", "storyBlockers", "tasks", "docs"],
    properties: {
      produced: { ...STRINGS, description: notes.produced },
      revision: { type: "string", description: notes.revision },
      openDecisions: described(STRINGS, notes.openDecisions),
      storyBlockers: described(STRINGS, notes.storyBlockers),
      tasks: arrayOf(TASK, notes.tasks),
      docs: described(STRINGS, notes.docs),
    },
  } as const;
}

interface CoderNotes {
  changed?: string;
  tests?: string;
  ran?: string;
  revision: string;
  open?: string;
  specMismatch: string;
}

const CODER_REQUIRED = ["changed", "tests", "ran", "revision", "open", "specMismatch"] as const;

function coderProperties(notes: CoderNotes) {
  return {
    changed: described(STRINGS, notes.changed),
    tests: described(STRINGS, notes.tests),
    ran: described(STRINGS, notes.ran),
    revision: { type: "string", description: notes.revision },
    open: described(STRINGS, notes.open),
    specMismatch: { type: "string", description: notes.specMismatch },
  } as const;
}

export function coderSchema(notes: CoderNotes) {
  return { type: "object", required: CODER_REQUIRED, properties: coderProperties(notes) } as const;
}

interface MeasuringCoderNotes extends CoderNotes {
  steps?: string;
  observed?: string;
  measurements?: string;
}

// A coder that also reports the steps it ran, what it observed, and what it measured.
export function measuringCoderSchema(notes: MeasuringCoderNotes) {
  return {
    type: "object",
    required: [...CODER_REQUIRED, "steps", "observed", "measurements"],
    properties: {
      ...coderProperties(notes),
      steps: described(STRINGS, notes.steps),
      observed: described({ type: "string" }, notes.observed),
      measurements: arrayOf(MEASUREMENT, notes.measurements),
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
