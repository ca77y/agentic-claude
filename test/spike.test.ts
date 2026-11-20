// Runs deliver-spike with scripted agents, so its control flow is tested without any model.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import deliverSpike from "../src/slopify/workflows/deliver-spike.ts";
import {
  PR_AGENTS,
  calls,
  current,
  describedBeforeEachPosting,
  installAgents,
  isPosting,
  type Reply,
  type Script,
} from "./harness.ts";

installAgents();

const SCOUT = { answer: "a", gaps: [], evidence: [{ source: "code", location: "calc.py:1", excerpt: "def add" }] };
const LENS_PASS = { verdict: "pass", evaluated: "x", findings: [], limits: "none" };
const CONFIRMED = {
  verdict: "confirmed",
  severity: "major",
  kind: "docs",
  ruling: "none",
  reason: "seen",
  fingerprint: "f",
};
const ok = (op: string, reference: string) => ({ done: true, unmet: [], operations: [{ op, reference }] });
const CLAIM = { id: "c1", claim: "add sums a million pairs in under a second.", status: "unknown" };

// A prompt: pusher files SPIKE-1, which reads back with the question as its story.
const pusher = (label: string, prompt: string): Reply => {
  if (label === "file the card") return ok("card", "SPIKE-1");
  if (label === "create the worktree") return ok("worktree", "/p/wt");
  if (label === "create the prototype") return ok("worktree", "/p/proto");
  if (label === "update the card") return ok("card", "comment");
  return ok(prompt.includes("open the branch's PR") ? "pr" : "commit", "PR-7");
};
const DEFAULTS: Record<string, Script> = {
  "scout-card": (_t, _l, prompt) =>
    prompt.includes("SPIKE-1")
      ? {
          answer: "a",
          gaps: [],
          evidence: [
            { source: "card", location: "x", excerpt: "SPIKE-1" },
            { source: "story-source", location: "x", excerpt: "card" },
            { source: "story", location: "x", excerpt: "Is add fast enough?" },
            { source: "story-revision", location: "x", excerpt: "abc1234" },
          ],
        }
      : {
          answer: "a",
          gaps: [],
          evidence: [
            { source: "story-source", location: "x", excerpt: "text" },
            { source: "story-revision", location: "x", excerpt: "abc1234" },
          ],
        },
  "scout-checkpoint": () => ({ answer: "a", gaps: [], evidence: [] }),
  "library-reader": () => ({ summary: "nothing yet", supported: [], gaps: ["speed"] }),
  "writer-findings": (_t, label) =>
    label === "plan"
      ? { claims: [{ ...CLAIM, measurement: "time a million calls" }], assumptions: [] }
      : { changed: ["docs/spikes/spike-1.md"] },
  coder: () => ({
    measurements: [{ claim: "c1", command: "python3 bench.py", output: "0.02 s", value: "0.02 s" }],
    assumptions: [],
    problem: "",
  }),
  qa: () => ({ results: [{ claim: "c1", confirmed: true, reason: "" }] }),
  judge: () => CONFIRMED,
  checks: () => ({ commands: [{ command: "lint", exitCode: 0, failingLines: "" }] }),
  watcher: () => ({ outcome: "not-declared", waitingFor: "none", limitMinutes: 60, reference: "r", findings: [] }),
  pusher: (_t, label, prompt) => pusher(label, prompt),
  ...PR_AGENTS,
};
const happy = (over: Partial<Record<string, Script>> = {}): Script => {
  const agents = { ...DEFAULTS, ...over };
  return (type, label, prompt) => {
    const script = agents[type];
    if (script) return script(type, label, prompt);
    return type.startsWith("lens-") ? LENS_PASS : type.startsWith("scout-") ? SCOUT : null;
  };
};
const briefOf = (label: string): string => calls.find((c) => c.label === label)?.prompt ?? "";
const described = (type: string): string[] => calls.filter((c) => c.type === type).map((c) => c.prompt);

// Every case starts from the same prompt.
async function run(script: Script) {
  current.script = script;
  Object.assign(globalThis, { args: "Is add fast enough?" });
  return deliverSpike();
}

beforeEach(() => {
  calls.length = 0;
});

describe("deliver-spike", () => {
  test("a rerun over a committed findings document reads its measurements and unknowns back for the description", async () => {
    const r = await run(
      happy({
        "scout-checkpoint": () => ({
          answer: "a",
          gaps: [],
          evidence: [
            { source: "done-findings", location: "x", excerpt: "2026-11-09T10:00:00Z done findings docs/spikes/x.md" },
          ],
        }),
        "scout-docs": (_t, label) =>
          label === "read the findings"
            ? {
                answer: "a",
                gaps: [],
                evidence: [
                  { source: "measured", location: "x", excerpt: "a million sums take 0.4 s" },
                  { source: "unknown", location: "x", excerpt: "cold start time" },
                ],
              }
            : SCOUT,
      }),
    );
    assert.notEqual(r.status, "blocked");
    const brief = described("writer-pr").at(-1) ?? "";
    assert.ok(brief.includes("Measured, as the findings document records: a million sums take 0.4 s"));
    assert.ok(brief.includes("Unknown: cold start time"));
    assert.equal(calls.filter((c) => c.type === "coder").length, 0, "a rerun builds no prototype");
    assert.ok(briefOf("read the findings").includes("In the worktree /p/wt,"), "the scout reads the story's worktree");
  });
  test("files a card for a prompt without writing a ledger, which has no checkout yet", async () => {
    await run(happy());
    const filing = briefOf("file the card");
    assert.ok(filing.includes("Append no ledger lines."));
    assert.ok(!filing.includes("Ledger:"));
    assert.ok(briefOf("create the worktree").includes("run <n"));
  });

  test("reports what the prototype measured, that qa confirmed it, and that it was deleted", async () => {
    const r = await run(happy());
    assert.ok("report" in r);
    assert.match(r.report, /Findings: docs\/spikes\/spike-1-.*\.md\./);
    assert.match(r.report, /deleted; it was never pushed or merged/);
    assert.match(r.report, /confirmed by a separate qa:\n- add sums a million pairs in under a second\. 0\.02 s/);
    assert.ok(calls.some((c) => c.label === "delete the prototype"));
    assert.ok(briefOf("create the prototype").includes('"Worktree preparation"'));
  });

  test("says no prototype was needed when the evidence settled every claim", async () => {
    const r = await run(
      happy({
        "writer-findings": (_t, label) =>
          label === "plan"
            ? { claims: [{ ...CLAIM, measurement: "" }], assumptions: [] }
            : { changed: ["docs/spikes/spike-1.md"] },
      }),
    );
    assert.ok("report" in r);
    assert.match(r.report, /No prototype was needed/);
    assert.equal(calls.filter((c) => c.type === "coder").length, 0);
  });

  test("tells pusher that firing no review for a project that declares none is not unmet", async () => {
    await run(happy());
    const push = briefOf("push the round");
    assert.ok(push.includes("When docs/FORGE.md declares no review, fire nothing: that is not unmet."));
    assert.ok(push.includes("fired <the trigger time, or none when docs/FORGE.md declares no review>"));
  });

  test("every push that opens or updates the PR runs writer-pr, then pusher (deliver-spike)", async () => {
    const r = await run(happy());
    assert.equal(r.status, "ready");
    assert.ok(calls.filter((c) => isPosting(c)).length >= 2);
    assert.ok(describedBeforeEachPosting());
  });

  test("writer-pr is given the claims checked and the unknowns that Why trust it rests on", async () => {
    const r = await run(happy());
    assert.equal(r.status, "ready");
    for (const type of ["writer-pr"]) {
      const prompts = described(type);
      assert.ok(prompts.length > 0, `${type} ran`);
      for (const prompt of prompts) {
        for (const check of ["lens-evidence", "lens-question", "lens-neutrality"]) {
          assert.ok(
            prompt.split("\n").some((line) => line.includes(check) && /\bpass(?:ed)?\b/i.test(line)),
            `${type} is told the check "${check}" passed`,
          );
        }
        assert.ok(
          prompt.split("\n").some((line) => line.includes(CLAIM.claim) && line.includes("0.02 s")),
          `${type} is told the measured claim and its value`,
        );
      }
    }
  });

  test("writer-pr is given each claim the prototype left unknown", async () => {
    const r = await run(happy({ qa: () => ({ results: [{ claim: "c1", confirmed: false, reason: "too noisy" }] }) }));
    assert.ok("status" in r);
    for (const type of ["writer-pr"]) {
      const prompts = described(type);
      assert.ok(prompts.length > 0, `${type} ran`);
      for (const prompt of prompts) {
        assert.ok(
          prompt.split("\n").some((line) => line.includes(CLAIM.claim) && line.includes("too noisy")),
          `${type} is told the unknown claim and why it wasn't measured`,
        );
      }
    }
  });

  test("tells pusher that an operation the brief doesn't ask for is not unmet", async () => {
    await run(happy());
    assert.ok(briefOf("file the card").includes("one it doesn't ask for is neither performed nor unmet"));
  });
});
