// One judge per reported problem, outside the delivery loop: the problems a judge confirms as blocker or major.
import { must } from "./loop.ts";
import { RULING_SCHEMA } from "./schemas.ts";

export interface Reported {
  source: string;
  location: string;
  text: string;
}

/** The confirmed blockers and majors, as lines a producer can fix. brief gives one judge its whole brief. */
export async function confirmedProblems(
  problems: readonly Reported[],
  brief: (p: Reported) => string,
  phaseTitle: string,
): Promise<string[]> {
  const rulings = await parallel(
    problems.map(
      (p, i) => () =>
        agent(brief(p), {
          agentType: "slopify:judge",
          label: `rule ${String(i + 1)}`,
          phase: phaseTitle,
          schema: RULING_SCHEMA,
        }),
    ),
  );
  const confirmed: string[] = [];
  for (const [i, p] of problems.entries()) {
    const r = must(rulings[i], phaseTitle.toLowerCase(), `A ruling on ${p.location}.`);
    if (r.verdict === "confirmed" && r.severity !== "minor") confirmed.push(`${p.location}: ${p.text} (${r.reason})`);
  }
  return confirmed;
}
