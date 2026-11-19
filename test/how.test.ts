// Runs the how phase and deliver-story's intake with scripted agents.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { createDeliver } from "../src/slopify/lib/deliver.ts";
import { runHow } from "../src/slopify/lib/how.ts";
import type { Run } from "../src/slopify/lib/loop.ts";
import deliverBugfix from "../src/slopify/workflows/deliver-bugfix.ts";
import deliverSpike from "../src/slopify/workflows/deliver-spike.ts";
import deliverStory from "../src/slopify/workflows/deliver-story.ts";
import deliverTrivial from "../src/slopify/workflows/deliver-trivial.ts";
import research from "../src/slopify/workflows/research.ts";
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

const SPEC = {
  build: {
    shared: [],
    tasks: [{ id: "t1", dependsOn: [], files: ["a.ts"], criteria: ["c1"], todo: "x", reuse: [], create: [] }],
    docs: [],
    decisions: [],
    manualActions: [],
  },
  validate: {
    criteria: [{ id: "c1", wording: "w", category: "UI", path: "p", evidence: "e", firstTest: "t" }],
  },
  claims: ["a.ts exists"],
};
const DESIGN = { approach: "a", reuse: [], create: [], interfaces: [], data: [], dependencies: [], risks: [] };
const SCOUT = { answer: "a", evidence: [], gaps: [] };
const LENS_PASS = { verdict: "pass", evaluated: "x", findings: [], limits: "none" };
const VIABLE = { viable: true, chosen: "smallest", grafts: [], rejected: [], reasons: ["fits"] };
const OK_PUSH = {
  done: true,
  unmet: [],
  operations: [
    { op: "commit", reference: "abc" },
    { op: "card", reference: "comment" },
  ],
};

const isAdvisor = (type: string): boolean => type.startsWith("advisor-");
const NO_FINDINGS = { findings: [] };
const isAttack = (label: string): boolean => label === "attack the spec" || label === "check the revision";
const adviceOrAttack = (label: string): Reply => (isAttack(label) ? NO_FINDINGS : { views: [] });
const problem = (severity: string, kind = "spec") => ({
  location: "a.ts",
  problem: "gone",
  severity,
  reason: "r",
  kind,
});
const rulings = (...problems: Reply[]): Reply => ({ problems });

const DEFAULTS: Record<string, Script> = {
  designer: () => DESIGN,
  "writer-spec": () => SPEC,
  pusher: () => OK_PUSH,
  "check-claim": () => ({ holds: true, location: "a.ts:1", problem: "" }),
  "check-criterion": () => ({ holds: true, location: "c1", problem: "" }),
  "lens-scope": () => LENS_PASS,
  "lens-altitude": () => LENS_PASS,
  "lens-consistency": () => LENS_PASS,
  judge: (_t, label) => (label === "decide" ? VIABLE : rulings(problem("major"))),
  "library-reader": () => ({ summary: "s", supported: [], gaps: [] }),
  ...PR_AGENTS,
};
const happy = (over: Partial<Record<string, Script>> = {}): Script => {
  const agents = { ...DEFAULTS, ...over };
  return (type, label, prompt) => {
    if (isAdvisor(type)) return agents[type]?.(type, label, prompt) ?? adviceOrAttack(label);
    return type.startsWith("scout-") ? SCOUT : (agents[type]?.(type, label, prompt) ?? null);
  };
};

function freshRun(): Run {
  const d = createDeliver({
    workflow: "deliver-story",
    projectRoot: "/p",
    storyArg: "SMR-1",
  });
  d.state.worktree = "/p/wt";
  return d;
}
const how = async (script: Script) => {
  current.script = script;
  const d = freshRun();
  return runHow({
    d,
    where: "project",
    story: "the issue",
    storyRevision: "abc",
    cardId: "SMR-1",
    specDir: "docs/specs/smr-1",
    answers: {},
  });
};
const count = (type: string): number => calls.filter((c) => c.type === type).length;

beforeEach(() => {
  calls.length = 0;
});

const card =
  (labels: string): Script =>
  (type, label, prompt) => {
    if (type === "scout-card") {
      return {
        answer: "a",
        gaps: [],
        evidence: [
          { source: "card", location: "x", excerpt: "SMR-1" },
          { source: "story-source", location: "x", excerpt: "card" },
          { source: "story", location: "x", excerpt: "Title\n\nBody" },
          { source: "story-revision", location: "x", excerpt: "abc1234" },
          { source: "labels", location: "x", excerpt: labels },
        ],
      };
    }
    return type === "scout-checkpoint"
      ? { ...SCOUT, evidence: [{ source: "worktree", location: "x", excerpt: "/p/wt" }] }
      : happy()(type, label, prompt);
  };

describe("the how phase", () => {
  test("runs three independent designs, then all five advisors", async () => {
    const r = await how(happy());
    assert.ok("build" in r);
    assert.equal(count("designer"), 3);
    for (const name of ["architecture", "performance", "risk", "security", "testability"]) {
      assert.ok(count(`advisor-${name}`) >= 1, name);
    }
  });

  test("names the agent first on every progress row", async () => {
    await how(happy());
    for (const c of calls) assert.ok(c.row === c.type || c.row.startsWith(`${c.type} · `), c.row);
    assert.ok(calls.some((c) => c.row === "designer · smallest change"));
  });

  test("gives each designer its own stance, and none sees another's work", async () => {
    await how(happy());
    const briefs = calls.filter((c) => c.type === "designer").map((c) => c.prompt);
    assert.equal(new Set(briefs).size, 3);
    assert.ok(briefs.every((b) => !b.includes('"approach"')));
  });

  test("scouts only new dependencies, once per name whichever designs name it", async () => {
    let n = 0;
    const designer = () => {
      n += 1;
      const zod = { name: n === 1 ? "Zod" : " zod", reliesOn: `parse ${String(n)}`, new: true };
      return { ...DESIGN, dependencies: [zod, { name: "GitHub", reliesOn: "gh pr create", new: false }] };
    };
    await how(happy({ designer }));
    assert.equal(count("scout-upstream-docs"), 1);
    assert.equal(count("scout-known-issues"), 1);
    const docs = calls.find((c) => c.type === "scout-upstream-docs")?.prompt ?? "";
    for (const part of ["parse 1", "parse 2", "parse 3"]) assert.ok(docs.includes(part), part);
  });

  test("commits the spec before it is challenged", async () => {
    await how(happy());
    const firstCommit = calls.findIndex((c) => c.label === "commit the spec");
    const firstCheck = calls.findIndex((c) => c.type === "check-claim");
    assert.ok(firstCommit !== -1 && firstCommit < firstCheck);
  });

  test("checks each claim and each criterion on its own", async () => {
    await how(happy());
    assert.equal(count("check-claim"), 1);
    assert.equal(count("check-criterion"), 1);
    assert.equal(count("lens-scope"), 1);
    assert.equal(count("lens-altitude"), 1);
  });

  test("designs again when none is viable, then reports it exhausted", async () => {
    const r = await how(
      happy({ judge: () => ({ viable: false, chosen: "", grafts: [], rejected: [], reasons: ["can't work"] }) }),
    );
    assert.ok("exhausted" in r);
    assert.deepEqual(r.exhausted, ["can't work", "can't work"]);
    assert.equal(count("designer"), 6);
    assert.equal(count("writer-spec"), 0);
  });

  test("revises the spec for a confirmed problem, then passes", async () => {
    let claims = 0;
    const r = await how(
      happy({
        "check-claim": () => {
          claims += 1;
          return claims === 1
            ? { holds: false, location: "a.ts", problem: "no such file" }
            : { holds: true, location: "a.ts", problem: "" };
        },
      }),
    );
    assert.ok("build" in r);
    assert.equal(count("writer-spec"), 2);
    assert.match(calls.findLast((c) => c.type === "writer-spec")?.prompt ?? "", /Prefer removing detail to adding it/);
    assert.match(calls.find((c) => c.label === "rule on the findings")?.prompt ?? "", /is its coder's decision/);
  });

  test("sends an irreversible choice the issue doesn't permit back to the writer, with no judge", async () => {
    const IRREVERSIBLE = {
      id: "d1",
      question: "drop the column?",
      choice: "drop it",
      rationale: "x",
      reversible: false,
      permission: "",
      affectsAcceptance: false,
    };
    let specs = 0;
    const prompts: string[] = [];
    const r = await how(
      happy({
        "writer-spec": (_t, _l, prompt) => {
          specs += 1;
          prompts.push(prompt);
          return specs === 1 ? { ...SPEC, build: { ...SPEC.build, decisions: [IRREVERSIBLE] } } : SPEC;
        },
      }),
    );
    assert.ok("build" in r);
    assert.equal(specs, 2);
    assert.ok(prompts[1]?.includes("manualActions"));
    assert.equal(calls.filter((c) => c.type === "judge" && c.label.startsWith("rule")).length, 0);
  });

  test("builds an irreversible choice the issue explicitly permits", async () => {
    const PERMITTED = {
      id: "d1",
      question: "drop the column?",
      choice: "drop it",
      rationale: "x",
      reversible: false,
      permission: "you may drop the legacy column",
      affectsAcceptance: false,
    };
    const r = await how(
      happy({ "writer-spec": () => ({ ...SPEC, build: { ...SPEC.build, decisions: [PERMITTED] } }) }),
    );
    assert.ok("build" in r);
    assert.equal(count("writer-spec"), 1);
  });

  test("halts on a blocker still open after three revisions", async () => {
    const r = await how(
      happy({
        "check-claim": () => ({ holds: false, location: "a.ts", problem: "gone" }),
        judge: (_t, label) => (label === "decide" ? VIABLE : rulings(problem("blocker"))),
      }),
    );
    assert.ok("exhausted" in r);
    assert.ok(r.exhausted[0]?.includes("gone"));
    assert.equal(count("writer-spec"), 4, "the spec and three revisions");
    assert.equal(count("check-claim"), 4);
  });

  test("records a major still open after every round, and continues", async () => {
    const r = await how(happy({ "check-claim": () => ({ holds: false, location: "a.ts", problem: "gone" }) }));
    assert.ok("build" in r);
    assert.ok(calls.some((c) => c.type === "writer-spec" && c.prompt.includes("Record these open problems")));
  });

  test("ignores a finding the judge doesn't uphold", async () => {
    const r = await how(
      happy({
        "check-claim": () => ({ holds: false, location: "a.ts", problem: "gone" }),
        judge: (_t, label) => (label === "decide" ? VIABLE : rulings()),
      }),
    );
    assert.ok("build" in r);
    assert.equal(count("writer-spec"), 1);
  });

  test("rules on every finding of a round in one judge, which sees the advisors' findings", async () => {
    let attacks = 0;
    await how(
      happy({
        "check-claim": () => ({ holds: false, location: "a.ts", problem: "no such file" }),
        "check-criterion": () => ({ holds: false, location: "c1", problem: "wrong category" }),
        "advisor-risk": (_t, label) => {
          if (!isAttack(label)) return { views: [] };
          attacks += 1;
          return attacks === 1 ? { findings: [{ ...problem("major"), problem: "no rollback" }] } : NO_FINDINGS;
        },
        judge: (_t, label) => (label === "decide" ? VIABLE : rulings()),
      }),
    );
    const judged = calls.filter((c) => c.type === "judge" && c.label !== "decide").map((c) => c.prompt);
    assert.equal(judged.length, 2);
    assert.ok(["no such file", "wrong category", "no rollback"].every((p) => judged[0]?.includes(p)));
  });

  test("sends an advisor's finding to the writer without a judge", async () => {
    let attacks = 0;
    const r = await how(
      happy({
        "advisor-risk": (_t, label) => {
          if (!isAttack(label)) return { views: [] };
          attacks += 1;
          return attacks === 1 ? { findings: [problem("major")] } : NO_FINDINGS;
        },
      }),
    );
    assert.ok("build" in r);
    assert.equal(count("writer-spec"), 2);
    assert.equal(calls.filter((c) => c.type === "judge" && c.label !== "decide").length, 0);
  });

  test("after a revision, checks again only what failed or changed", async () => {
    let criteria = 0;
    await how(
      happy({
        "check-criterion": () => {
          criteria += 1;
          return criteria === 1
            ? { holds: false, location: "c1", problem: "wrong category" }
            : { holds: true, location: "c1", problem: "" };
        },
      }),
    );
    assert.equal(count("writer-spec"), 2);
    assert.equal(count("check-claim"), 1);
    assert.equal(count("check-criterion"), 2);
  });

  test("after a revision, has only the advisor whose finding it was for check it", async () => {
    let attacks = 0;
    await how(
      happy({
        "advisor-risk": (_t, label) => {
          if (!isAttack(label)) return { views: [] };
          attacks += 1;
          return attacks === 1 ? { findings: [problem("major")] } : NO_FINDINGS;
        },
        judge: (_t, label) => (label === "decide" ? VIABLE : rulings()),
      }),
    );
    const risk = calls.filter((c) => c.type === "advisor-risk" && isAttack(c.label));
    assert.deepEqual(
      risk.map((c) => c.label),
      ["attack the spec", "check the revision"],
    );
    assert.ok(risk[1]?.prompt.includes("gone"));
    assert.equal(calls.filter((c) => c.type === "advisor-security" && isAttack(c.label)).length, 1);
  });

  test("dispatches no advisor to check a revision for problems only the checks found", async () => {
    let claims = 0;
    await how(
      happy({
        "check-claim": () => {
          claims += 1;
          return claims === 1
            ? { holds: false, location: "a.ts", problem: "no such file" }
            : { holds: true, location: "a.ts", problem: "" };
        },
      }),
    );
    assert.equal(count("writer-spec"), 2);
    assert.ok(calls.every((c) => c.label !== "check the revision"));
  });

  test("escalates a conflict in the issue's criteria as a decision instead of revising around it", async () => {
    const r = await how(
      happy({
        "advisor-risk": (_t, label) => (isAttack(label) ? { findings: [problem("major", "decision")] } : { views: [] }),
        judge: (_t, label) => (label === "decide" ? VIABLE : rulings()),
      }),
    );
    assert.ok("build" in r);
    assert.equal(count("writer-spec"), 2);
    const recorded = calls.findLast((c) => c.type === "writer-spec")?.prompt ?? "";
    assert.ok(recorded.includes("affectsAcceptance true") && recorded.includes("gone"));
    assert.equal(calls.filter((c) => c.label === "check the revision").length, 0);
  });

  test("has the spec writer fix what a commit hook reported, then commits again", async () => {
    let commits = 0;
    const r = await how(
      happy({
        pusher: () => {
          commits += 1;
          return commits === 1
            ? { done: false, unmet: ["commit"], operations: [], hookRejection: "RATIONALE.md:9 MD024" }
            : OK_PUSH;
        },
      }),
    );
    assert.ok("build" in r);
    assert.equal(count("writer-spec"), 2);
    assert.ok(calls.some((c) => c.type === "writer-spec" && c.prompt.includes("RATIONALE.md:9 MD024")));
  });

  test("sends nothing a passing lens lists to a judge", async () => {
    const noted = { ...LENS_PASS, findings: [{ location: "build.json", problem: "Covered.", blocking: false }] };
    const r = await how(happy({ "lens-scope": () => noted, "lens-consistency": () => noted }));
    assert.ok("build" in r);
    assert.equal(calls.filter((c) => c.type === "judge" && c.label !== "decide").length, 0);
  });

  test("never treats a check that died as a pass", async () => {
    await assert.rejects(how(happy({ "check-claim": () => null })));
  });
});

describe("deliver-story's intake", () => {
  test("refuses an issue without the Deliverable label, and says to run shape", async () => {
    current.script = card("Feature");
    Object.assign(globalThis, { args: "SMR-1" });
    const r = await deliverStory();
    assert.equal(r.status, "not-started");
    assert.ok("next" in r && r.next.includes("shape"));
    assert.equal(count("designer"), 0);
    assert.ok(calls.some((c) => c.label === "comment on the issue"));
  });

  test("goes on to the how phase when the label is there", async () => {
    current.script = card("Feature, Deliverable");
    Object.assign(globalThis, { args: "SMR-1" });
    await deliverStory();
    assert.ok(count("designer") > 0);
  });

  test("every push that opens or updates the PR runs writer-pr, then lens-pr, then pusher (deliver-story)", async () => {
    current.script = storyRun;
    Object.assign(globalThis, { args: "SMR-1" });
    const r = await deliverStory();
    assert.equal(r.status, "ready");
    assert.ok(calls.filter((c) => isPosting(c)).length >= 2);
    assert.ok(describedBeforeEachPosting());
    assert.match(calls.findLast((c) => c.type === "writer-pr")?.prompt ?? "", /Spec: docs\/specs\/\S+/);
  });

  test("asks for the issue when the argument is empty", async () => {
    current.script = happy();
    Object.assign(globalThis, { args: "" });
    const r = await deliverStory();
    assert.equal(r.status, "not-started");
    assert.equal(calls.length, 0);
  });
});

const SMALL_AGENTS: Record<string, Script> = {
  coder: (_t, label) =>
    label.endsWith(": test")
      ? {
          tests: ["t.py"],
          stubs: [],
          failingOutput: "red",
          noTest: "",
          specProblem: "",
          assumptions: [],
          manualActions: [],
        }
      : { changed: ["calc.py"], ran: [], testProblem: "", specProblem: "", assumptions: [], manualActions: [] },
  checks: () => ({ commands: [{ command: "unit", exitCode: 0, failingLines: "" }] }),
  qa: () => ({ ...LENS_PASS, testAtFault: false }),
  simplifier: () => LENS_PASS,
  validator: () => ({
    results: [{ id: "change", result: "pass", ran: "steps", evidence: ["out.txt"], detail: "", setting: "draft" }],
    uncategorizedSetting: "draft",
  }),
  pusher: (_t, _l, prompt) =>
    prompt.includes("open the branch's PR")
      ? { done: true, unmet: [], operations: [{ op: "pr", reference: "PR-1" }] }
      : OK_PUSH,
  watcher: () => ({ outcome: "finished", waitingFor: "none", limitMinutes: 60, reference: "r", findings: [] }),
};

// A prompt with no card: pusher files SMR-50 for it, and the card reads back with the prompt as its story.
const promptRun: Script = (type, label, prompt) => {
  if (label === "file the card") {
    return { done: true, unmet: [], operations: [{ op: "card", reference: "SMR-50" }] };
  }
  if (type === "scout-card" && prompt.includes("SMR-50")) {
    return {
      answer: "a",
      gaps: [],
      evidence: [
        { source: "card", location: "x", excerpt: "SMR-50" },
        { source: "story-source", location: "x", excerpt: "card" },
        { source: "story", location: "x", excerpt: "Add mul to calc.py\n\nBody" },
        { source: "story-revision", location: "x", excerpt: "abc1234" },
      ],
    };
  }
  if (type === "scout-card") {
    return {
      answer: "a",
      gaps: [],
      evidence: [
        { source: "story-source", location: "x", excerpt: "text" },
        { source: "story-revision", location: "x", excerpt: "abc1234" },
      ],
    };
  }
  return type === "scout-checkpoint"
    ? { ...SCOUT, evidence: [{ source: "worktree", location: "x", excerpt: "/p/wt" }] }
    : (SMALL_AGENTS[type]?.(type, label, prompt) ?? happy()(type, label, prompt));
};

const REPRO_OK = { reproduced: true, steps: ["run add(1, 1)"], observed: "got 0", reason: "" };
const REPRO_NO = { reproduced: false, steps: [], observed: "", reason: "it passed every time" };
const KEPT = '2026-11-09T10:00:00Z reproduced {"steps":["run add(1, 1)"],"observed":"got 0"}';
const BUG_CARD = {
  answer: "a",
  gaps: [],
  evidence: [
    { source: "card", location: "x", excerpt: "SMR-13" },
    { source: "story-source", location: "x", excerpt: "card" },
    { source: "story", location: "x", excerpt: "add subtracts\n\nBody" },
    { source: "story-revision", location: "x", excerpt: "abc1234" },
  ],
};
// A bug on card SMR-13 with no worktree yet; the checkpoint can carry a reproduction a rerun reads back.
const bugRun =
  (repro: Reply, opts: { kept?: string; lens?: Reply } = {}): Script =>
  (type, label, prompt) => {
    if (type === "scout-card") return BUG_CARD;
    if (type === "scout-checkpoint") {
      return { ...SCOUT, evidence: opts.kept ? [{ source: "reproduced", location: "x", excerpt: opts.kept }] : [] };
    }
    if (type === "coder" && label.startsWith("reproduce")) return repro;
    if (type === "lens-repro") return opts.lens ?? LENS_PASS;
    return label === "create the worktree"
      ? { done: true, unmet: [], operations: [{ op: "worktree", reference: "/p/wt" }] }
      : promptRun(type, label, prompt);
  };
// A Deliverable story whose spec is already committed, so the run goes straight to the loop.
const storyRun: Script = (type, label, prompt) => {
  if (type === "scout-checkpoint") {
    return {
      ...SCOUT,
      evidence: [
        { source: "worktree", location: "x", excerpt: "/p/wt" },
        { source: "build-json", location: "x", excerpt: JSON.stringify(SPEC.build) },
        { source: "validate-json", location: "x", excerpt: JSON.stringify(SPEC.validate) },
        { source: "spec-files", location: "x", excerpt: "build.json validate.json RATIONALE.md" },
        {
          source: "done-challenge",
          location: "x",
          excerpt: "2026-11-09T10:00:00Z done challenge docs/specs/smr-1-title",
        },
      ],
    };
  }
  if (type === "validator") {
    return {
      results: [{ id: "c1", result: "pass", ran: "p", evidence: ["e.png"], detail: "", setting: "draft" }],
      uncategorizedSetting: "draft",
    };
  }
  return type === "judge" && label === "gateway"
    ? { missed: [], docsToAdd: [] }
    : (SMALL_AGENTS[type]?.(type, label, prompt) ?? card("Feature, Deliverable")(type, label, prompt));
};
const createBrief = (): string => calls.find((c) => c.label === "create the worktree")?.prompt ?? "";
const failedReport = (): string => calls.find((c) => c.label === "report the failed reproduction")?.prompt ?? "";

// SMR-1 read back with a question left under its Open questions section.
const questioned: Script = (type, label, prompt) => {
  const r = card("Feature")(type, label, prompt);
  return type === "scout-card" && r
    ? {
        ...r,
        evidence: [
          ...(r["evidence"] as object[]),
          { source: "open-questions", location: "x", excerpt: "Which users see it?" },
        ],
      }
    : r;
};

describe("the small workflows", () => {
  test("refuses a card with open questions, says so on the card, and builds nothing", async () => {
    current.script = questioned;
    Object.assign(globalThis, { args: "SMR-1" });
    const r = await deliverTrivial();
    assert.equal(r.status, "not-started");
    assert.ok("next" in r && r.next.includes("Which users see it?"));
    assert.ok(calls.some((c) => c.label === "comment on the issue" && c.prompt.includes("open questions")));
    assert.equal(count("coder"), 0);
  });

  test("deliver-bugfix refuses a card with open questions before reproducing it", async () => {
    current.script = questioned;
    Object.assign(globalThis, { args: "SMR-1" });
    const r = await deliverBugfix();
    assert.equal(r.status, "not-started");
    assert.equal(count("coder"), 0);
  });

  test("deliver-trivial files a card for a prompt, then delivers against that card", async () => {
    current.script = promptRun;
    Object.assign(globalThis, { args: "Add mul to calc.py" });
    await deliverTrivial();
    const filing = calls.find((c) => c.label === "file the card");
    assert.ok(filing?.prompt.includes("Add mul to calc.py"));
    assert.ok(filing?.prompt.includes("deliver-small"));
    assert.ok(calls.some((c) => c.label === "push the round" && c.prompt.includes("SMR-50")));
  });

  test("deliver-trivial doesn't file a card when the issue already has one", async () => {
    current.script = card("Feature");
    Object.assign(globalThis, { args: "SMR-1" });
    await deliverTrivial();
    assert.equal(calls.filter((c) => c.label === "file the card").length, 0);
  });

  test("deliver-trivial runs from a prompt, with no label and no design", async () => {
    current.script = promptRun;
    Object.assign(globalThis, { args: "Add mul to calc.py" });
    await deliverTrivial();
    assert.equal(count("designer"), 0);
    assert.equal(count("writer-spec"), 0);
    const first = calls.find((c) => c.label === "change: test");
    assert.ok(first?.prompt.includes("Add mul to calc.py"));
    assert.ok(first?.prompt.includes("states the new behavior"));
  });

  test("deliver-trivial creates a worktree unless the user asks for a branch only", async () => {
    current.script = (type, label, prompt) => {
      if (type === "scout-checkpoint") return { ...SCOUT, evidence: [] };
      return label === "create the worktree"
        ? { done: true, unmet: [], operations: [{ op: "worktree", reference: "/p/wt" }] }
        : promptRun(type, label, prompt);
    };
    Object.assign(globalThis, { args: { story: "Add mul to calc.py" } });
    await deliverTrivial();
    assert.ok(!createBrief().includes("create no worktree"));
    assert.ok(createBrief().includes('"Worktree preparation"'));
    calls.length = 0;
    Object.assign(globalThis, { args: { story: "Add mul to calc.py", branchOnly: true } });
    await deliverTrivial();
    assert.ok(createBrief().includes("check it out in the main checkout"));
    assert.ok(createBrief().includes("create no worktree"));
    assert.ok(calls.find((c) => c.label === "read checkpoints")?.prompt.includes("there is no worktree"));
  });

  test("a rerun prepares the worktree it recovers, and starts the card in the same dispatch", async () => {
    current.script = card("Feature");
    Object.assign(globalThis, { args: "SMR-1" });
    await deliverTrivial();
    assert.equal(calls.filter((c) => c.label === "create the worktree").length, 0);
    const prepare = calls.find((c) => c.label === "prepare the worktree")?.prompt ?? "";
    assert.ok(prepare.includes("In the checkout /p/wt"));
    assert.ok(prepare.includes('"Worktree preparation"'));
    assert.ok(prepare.includes("done board-start SMR-1"));
  });

  test("a preparation that fails stops the run before any work in the worktree", async () => {
    current.script = (type, label, prompt) =>
      label === "prepare the worktree"
        ? { done: false, unmet: ["prepare: make install exited 2"], operations: [] }
        : card("Feature")(type, label, prompt);
    Object.assign(globalThis, { args: "SMR-1" });
    const r = await deliverTrivial();
    assert.equal(r.status, "blocked");
    assert.ok(JSON.stringify(r).includes("make install exited 2"));
    assert.equal(count("coder"), 0);
  });

  test("deliver-bugfix reproduces the bug, records it, and uses it as the first test", async () => {
    current.script = bugRun(REPRO_OK);
    Object.assign(globalThis, { args: "SMR-13" });
    const r = await deliverBugfix();
    assert.equal(r.status, "ready");
    assert.ok(count("lens-repro") > 0);
    assert.ok(createBrief().includes("reproduced {"));
    const first = calls.find((c) => c.label === "change: test");
    assert.ok(first?.prompt.includes("run add(1, 1)"));
    assert.ok(first?.prompt.includes("regression test"));
  });

  test("deliver-bugfix runs the reproduction again in the app, and shows the before and after", async () => {
    current.script = bugRun(REPRO_OK);
    Object.assign(globalThis, { args: "SMR-13" });
    await deliverBugfix();
    const validator = calls.find((c) => c.type === "validator");
    assert.ok(validator?.prompt.includes("run add(1, 1)"));
    const described = calls.find((c) => c.type === "writer-pr")?.prompt ?? "";
    assert.ok(described.includes("run add(1, 1)"), "writer-pr is told the reproduction");
    assert.ok(described.includes("got 0"), "writer-pr is told how the bug behaved before the fix");
  });

  test("every push that opens or updates the PR runs writer-pr, then lens-pr, then pusher (deliver-trivial)", async () => {
    current.script = promptRun;
    Object.assign(globalThis, { args: "Add mul to calc.py" });
    const r = await deliverTrivial();
    assert.equal(r.status, "ready");
    assert.ok(calls.filter((c) => isPosting(c)).length >= 2);
    assert.ok(describedBeforeEachPosting());
  });

  test("deliver-trivial gives writer-pr and lens-pr the test result that Why trust it rests on, beside the app run", async () => {
    current.script = promptRun;
    Object.assign(globalThis, { args: "Add mul to calc.py" });
    const r = await deliverTrivial();
    assert.equal(r.status, "ready");
    for (const type of ["writer-pr", "lens-pr"]) {
      const prompts = calls.filter((c) => c.type === type).map((c) => c.prompt);
      assert.ok(prompts.length > 0, `${type} ran`);
      for (const prompt of prompts) {
        assert.ok(
          prompt.split("\n").some((line) => line.includes("t.py") && /\bpass(?:es|ed)?\b/i.test(line)),
          `${type} is told the change's test, t.py, and that it passed`,
        );
      }
    }
  });

  test("deliver-trivial still gives writer-pr and lens-pr the passed test on a rerun that resumes after the build", async () => {
    current.script = promptRun;
    Object.assign(globalThis, { args: "Add mul to calc.py" });
    await deliverTrivial();
    // The done-round lines the first run had pusher append, read back as the scout returns them.
    const rounds = calls
      .filter((c) => c.type === "pusher")
      .flatMap((c) => c.prompt.split("\n"))
      .filter((line) => line.startsWith("- ") && line.includes("done round"))
      .map((line) => `2026-11-09T10:00:00Z ${line.slice(2).replaceAll(/<[^<>]*>/g, "none")}`);
    assert.ok(rounds.length > 0, "the first run wrote a done-round checkpoint");
    calls.length = 0;
    current.script = (type, label, prompt) =>
      type === "scout-checkpoint"
        ? {
            ...SCOUT,
            evidence: [
              { source: "worktree", location: "x", excerpt: "/p/wt" },
              { source: "pr", location: "x", excerpt: "PR-1" },
              ...rounds.map((excerpt) => ({ source: "done-round", location: "x", excerpt })),
            ],
          }
        : promptRun(type, label, prompt);
    Object.assign(globalThis, { args: "SMR-50" });
    const r = await deliverTrivial();
    assert.equal(r.status, "ready");
    assert.equal(
      calls.filter((c) => c.label === "change: test").length,
      0,
      "the rerun resumes after the build, writing no test",
    );
    for (const type of ["writer-pr", "lens-pr"]) {
      const prompts = calls.filter((c) => c.type === type).map((c) => c.prompt);
      assert.ok(prompts.length > 0, `${type} ran`);
      for (const prompt of prompts) {
        assert.ok(
          prompt.split("\n").some((line) => line.includes("t.py") && /\bpass(?:es|ed)?\b/i.test(line)),
          `${type} is told, on the rerun, the change's test t.py and that it passed`,
        );
      }
    }
  });

  test("deliver-trivial claims no passed test to writer-pr and lens-pr when the change's test never passes", async () => {
    // qa never passes the first change, t.py, so it escalates; the review round's fix has its own test, fix.py.
    current.script = (type, label, prompt) => {
      if (type === "qa") {
        const findings = [{ location: "calc.py", problem: "wrong", blocking: true }];
        return { verdict: "fail", evaluated: "x", findings, limits: "", testAtFault: false };
      }
      const reply = promptRun(type, label, prompt);
      return type === "coder" && label.startsWith("fix-") && label.endsWith(": test")
        ? { ...reply, tests: ["fix.py"] }
        : reply;
    };
    Object.assign(globalThis, { args: "Add mul to calc.py" });
    await deliverTrivial();
    for (const type of ["writer-pr", "lens-pr"]) {
      const prompts = calls.filter((c) => c.type === type).map((c) => c.prompt);
      assert.ok(prompts.length > 0, `${type} ran`);
      for (const prompt of prompts) {
        assert.ok(
          prompt.split("\n").every((line) => !line.includes("t.py") || !/\bpass(?:es|ed)?\b/i.test(line)),
          `${type} is not told that t.py passed`,
        );
      }
    }
  });

  test("deliver-bugfix's Why trust it rests on the reproduction, with no test-passes line from the trivial path", async () => {
    current.script = bugRun(REPRO_OK);
    Object.assign(globalThis, { args: "SMR-13" });
    const r = await deliverBugfix();
    assert.equal(r.status, "ready");
    for (const type of ["writer-pr", "lens-pr"]) {
      const prompts = calls.filter((c) => c.type === type).map((c) => c.prompt);
      assert.ok(prompts.length > 0, `${type} ran`);
      for (const prompt of prompts) {
        assert.ok(prompt.includes("run add(1, 1)"), `${type} is told the reproduction`);
        assert.ok(!prompt.includes("The change's test"), `${type} is not given the trivial test-passes trust line`);
      }
    }
  });

  test("every push that opens or updates the PR runs writer-pr, then lens-pr, then pusher (deliver-bugfix)", async () => {
    current.script = bugRun(REPRO_OK);
    Object.assign(globalThis, { args: "SMR-13" });
    const r = await deliverBugfix();
    assert.equal(r.status, "ready");
    assert.ok(calls.filter((c) => isPosting(c)).length >= 2);
    assert.ok(describedBeforeEachPosting());
  });

  test("deliver-bugfix labels the card Unreproducible after three tries, saying why, and opens no worktree", async () => {
    current.script = bugRun(REPRO_NO);
    Object.assign(globalThis, { args: "SMR-13" });
    const r = await deliverBugfix();
    assert.equal(r.status, "unreproducible");
    assert.equal(calls.filter((c) => c.type === "coder").length, 3);
    assert.equal(createBrief(), "");
    assert.ok(failedReport().includes("On card SMR-13"));
    assert.ok(failedReport().includes("Unreproducible"));
    assert.ok(failedReport().includes("it passed every time"));
  });

  test("deliver-bugfix says a flaky reproduction didn't reproduce reliably", async () => {
    const flaky = {
      verdict: "fail",
      evaluated: "x",
      findings: [{ location: "run 2", problem: "passed", blocking: true }],
      limits: "",
    };
    current.script = bugRun(REPRO_OK, { lens: flaky });
    Object.assign(globalThis, { args: "SMR-13" });
    const r = await deliverBugfix();
    assert.equal(r.status, "unreproducible");
    assert.ok(failedReport().includes("didn't reproduce reliably"));
  });

  test("deliver-bugfix halts with no label when the reproduction can't be checked", async () => {
    current.script = bugRun(REPRO_OK, { lens: { ...LENS_PASS, verdict: "unverified", limits: "python missing" } });
    Object.assign(globalThis, { args: "SMR-13" });
    const r = await deliverBugfix();
    assert.equal(r.status, "blocked");
    assert.equal(failedReport(), "");
  });

  test("deliver-bugfix reads a confirmed reproduction back on a rerun, and doesn't reproduce again", async () => {
    current.script = bugRun(REPRO_NO, { kept: KEPT });
    Object.assign(globalThis, { args: "SMR-13" });
    const r = await deliverBugfix();
    assert.equal(r.status, "ready");
    assert.equal(count("scout-history"), 0);
    assert.ok(calls.find((c) => c.label === "change: test")?.prompt.includes("run add(1, 1)"));
  });

  test("a workflow rejects an object or a list answer before any agent works, naming the decision", async () => {
    current.script = promptRun;
    const workflows: [string, string, () => Promise<{ status: string }>][] = [
      ["deliver-bugfix", "story", deliverBugfix],
      ["deliver-story", "story", deliverStory],
      ["deliver-spike", "question", deliverSpike],
      ["deliver-trivial", "story", deliverTrivial],
      ["research", "question", research],
    ];
    for (const [name, field, run] of workflows) {
      for (const answer of [{ choice: "a" }, ["a", "b"]]) {
        calls.length = 0;
        Object.assign(globalThis, { args: { [field]: "SMR-1", answers: { "spec-q1-abc1234": answer } } });
        const r = await run();
        const shown = `${name} with ${JSON.stringify(answer)}`;
        assert.equal(r.status, "not-started", shown);
        assert.equal(calls.length, 0, shown);
        const next = "next" in r && typeof r.next === "string" ? r.next : "";
        assert.ok(next.includes("spec-q1-abc1234"), shown);
        assert.match(next, /plain text/, shown);
      }
    }
  });

  test("a null answer counts as unanswered, while text and number answers reach the agents", async () => {
    current.script = promptRun;
    Object.assign(globalThis, {
      args: { story: "Add mul to calc.py", answers: { "q-null": null, "q-text": "yes", "q-number": 3 } },
    });
    await deliverTrivial();
    const first = calls.find((c) => c.label === "change: test")?.prompt ?? "";
    assert.ok(first.includes("q-text"));
    assert.ok(first.includes("q-number"));
    assert.ok(calls.every((c) => !c.prompt.includes("q-null")));
  });

  test("both ask for the work when the argument is empty", async () => {
    current.script = happy();
    Object.assign(globalThis, { args: "" });
    const [trivial, bugfix] = [await deliverTrivial(), await deliverBugfix()];
    assert.equal(trivial.status, "not-started");
    assert.equal(bugfix.status, "not-started");
  });
});
