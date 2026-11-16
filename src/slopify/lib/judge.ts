// One judge per round, outside the delivery loop, rules on every problem the round's checks reported: it merges the
// ones that report the same problem, and keeps the blockers and majors.
import { list } from "./deliver.ts";
import { dispatch } from "./dispatch.ts";
import { must } from "./loop.ts";

export interface Reported {
  source: string;
  location: string;
  text: string;
}

const RULED_SCHEMA = {
  type: "object",
  required: ["problems"],
  properties: {
    problems: {
      type: "array",
      description: "Each distinct blocker or major problem the reported findings show; empty when none holds",
      items: {
        type: "object",
        required: ["location", "problem", "severity", "reason"],
        properties: {
          location: { type: "string", description: "Where the problem is" },
          problem: { type: "string", description: "What is wrong and what would fix it" },
          severity: { type: "string", enum: ["blocker", "major"] },
          reason: { type: "string", description: "The evidence it rests on" },
        },
      },
    },
  },
} as const;

/** The confirmed blockers and majors, as lines a producer can fix. brief says what was checked and what each severity means. */
export async function confirmedProblems(
  problems: readonly Reported[],
  brief: string,
  phaseTitle: string,
): Promise<string[]> {
  if (problems.length === 0) return [];
  const r = await dispatch(
    `${brief}

Rule on all of these findings, checking each against the evidence, and merge findings that report the same problem. Return each distinct problem that holds as a blocker or a major. Leave out what doesn't hold and what is minor.

Reported findings:
${list(problems.map((p) => `${p.source} at ${p.location}: ${p.text}`))}`,
    { agentType: "slopify:judge", label: "rule on the findings", phase: phaseTitle, schema: RULED_SCHEMA },
  );
  const ruled = must(r, phaseTitle.toLowerCase(), "The rulings on the reported findings.");
  return ruled.problems.map((p) => `${p.location}: ${p.problem} (${p.reason})`);
}
