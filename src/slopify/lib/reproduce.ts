// A bug's reproduction, hands-free: scouts gather evidence, a coder reproduces it outside the production code, and
// lens-repro runs it until it reliably shows the failure. docs/deliver/BUGFIX.md describes it.
import { STRINGS, lens, scout } from "./family.ts";
import { NO_WRITES, callCoder, list, show } from "./deliver.ts";
import { Halt, must, type Run } from "./loop.ts";
import { MAX_INNER_TRIES, type Reproduction } from "./rules.ts";

const REPRO_SCHEMA = {
  type: "object",
  required: ["reproduced", "steps", "observed", "reason"],
  properties: {
    reproduced: { type: "boolean", description: "True when the reproduction shows the reported failure" },
    steps: { ...STRINGS, description: "The steps that reproduce the failure, in order" },
    observed: { type: "string", description: "What the reproduction showed" },
    reason: { type: "string", description: "Why it doesn't reproduce; empty when it does" },
  },
} as const;

export type Reproduced = ({ reproduced: true } & Reproduction) | { reproduced: false; why: string };

async function gather(d: Run, report: string): Promise<string> {
  phase("Ground");
  const brief = (task: string): string => `${d.WHERE}\n${task}\nChange nothing.\n\nReport:\n${report}`;
  const scouts = [
    ["scout-code", "Find the code locations and call paths this bug report concerns."],
    ["scout-tests", "Find the existing tests that cover the area this bug report concerns, and how to run them."],
    ["scout-history", "Find from git history and blame when and why behavior in this area changed."],
  ] as const;
  const found = await parallel(
    scouts.map(
      ([name, task]) =>
        () =>
          scout(name, brief(task), { label: name, phase: "Ground" }),
    ),
  );
  return scouts.map(([name], i) => show(name, must(found[i], "reproduce", `Evidence from ${name}.`))).join("\n\n");
}

function reproBrief(d: Run, report: string, dir: string, evidence: string, last: string): string {
  return `${d.WHERE}
Reproduce this bug. Write and run a script or test in the directory ${dir} under the project root, which git ignores, and change nothing outside it: no production code and no existing test. Settle anything the report leaves open yourself, from the evidence. Return the steps that reproduce the failure and what you observed. If it doesn't reproduce, set reproduced to false and say why.${last ? `\n\nAn earlier attempt failed:\n${last}\nTry another way.` : ""}

Report:
${report}

Evidence:
${evidence}

${NO_WRITES}`;
}

/** Up to three tries to reproduce the bug reliably. A failure says why, so the card can. */
export async function reproduce(d: Run, report: string, slug: string): Promise<Reproduced> {
  const evidence = await gather(d, report);
  phase("Reproduce");
  const dir = `.tmp/repro/${slug}`;
  let why = "";
  for (let attempt = 1; attempt <= MAX_INNER_TRIES; attempt += 1) {
    const r = must(
      await callCoder(
        reproBrief(d, report, dir, evidence, why),
        `reproduce${attempt > 1 ? ` (try ${String(attempt)})` : ""}`,
        "Reproduce",
        REPRO_SCHEMA,
      ),
      "reproduce",
      "A reproduction.",
    );
    if (!r.reproduced) {
      why = `It didn't reproduce: ${r.reason}`;
      continue;
    }
    const v = must(
      await lens(
        "lens-repro",
        `${d.WHERE}\nThe reproduction is in ${dir} under the project root. Its steps:\n${list(r.steps)}\nIt observed: ${r.observed}\n\nReport:\n${report}`,
        { label: "check the reproduction", phase: "Reproduce" },
      ),
      "reproduce",
      "A check of the reproduction.",
    );
    if (v.verdict === "pass") return { reproduced: true, steps: r.steps, observed: r.observed };
    // A check that couldn't run says nothing about the bug, so it can't make the bug unreproducible.
    if (v.verdict === "unverified") throw new Halt("reproduce", "A check of the reproduction.", v.limits);
    why = `It didn't reproduce reliably:\n${list(v.findings.map((f) => f.problem))}`;
  }
  return { reproduced: false, why };
}
