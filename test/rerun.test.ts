// SMR-374: a rerun of deliver-story over the spec folder its first run committed.
//
// Each case runs deliver-story twice with scripted agents. The first run starts from nothing and stops at a chosen
// point; the worktree it leaves (the spec folder writer-spec was told to write, and every ledger line pusher was told
// to append, stamped) is what the rerun's checkpoint scout reads. So the rerun sees whatever checkpoints the code
// under test writes, whatever their wording.
//
// The checkpoint scout answers only what its brief asks, from that worktree. One limit stands in for the runtime: a key
// gets one evidence excerpt, which holds at most SCOUT_QUOTE_LIMIT characters, so a file longer than that comes back
// cut. A spec at its size budget stays under it.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import deliverStory from "../src/slopify/workflows/deliver-story.ts";
import { MAX_FIX_ROUNDS } from "../src/slopify/lib/rules.ts";
import { PR_AGENTS, calls, current, installAgents, type Reply, type Script } from "./harness.ts";

installAgents();

const SCOUT_QUOTE_LIMIT = 32_000;
const TS = "2026-11-19T10:00:00Z";
const WT = "/p/wt";
const SPEC_FILE_NAMES = ["build.json", "validate.json", "RATIONALE.md"] as const;
type SpecFile = (typeof SPEC_FILE_NAMES)[number];
type Files = Partial<Record<SpecFile, string>>;

const task = (n: number, todo = "x") => ({
  id: `t${String(n)}`,
  dependsOn: [],
  files: [`a${String(n)}.ts`],
  criteria: ["c1"],
  todo,
  reuse: [],
  create: [],
});
interface Build {
  shared: never[];
  tasks: ReturnType<typeof task>[];
  docs: never[];
  decisions: never[];
}
const buildOf = (tasks: ReturnType<typeof task>[]): Build => ({
  shared: [],
  tasks,
  docs: [],
  decisions: [],
});
const SMALL_BUILD = buildOf([task(1)]);
// A spec at its size budget: twelve tasks, each todo just under the 300 words lens-altitude allows.
const LARGE_BUILD = buildOf(
  Array.from({ length: 12 }, (_, i) => task(i + 1, "Change the module so the rerun reads its spec. ".repeat(33))),
);
const VALIDATE = { criteria: [{ id: "c1", wording: "w", category: "UI", path: "p", evidence: "e", firstTest: "t" }] };
const LENS_PASS = { verdict: "pass", evaluated: "x", findings: [], limits: "none" };
const SCOUT = { answer: "a", evidence: [], gaps: [] };
const OK_PUSH = { done: true, unmet: [], operations: [{ op: "commit", reference: "abc" }] };
const FIRST_TITLE = "Title of the first run";

interface Worktree {
  folders: Map<string, Files>;
  ledger: string[];
}
interface Evidence {
  source: string;
  location: string;
  excerpt: string;
}

// ---- The scripted agents ----------------------------------------------------------------------------------------

// A file quoted as the one excerpt a key gets: cut at the limit, however it is asked for.
const quote = (text: string): string => text.slice(0, SCOUT_QUOTE_LIMIT);

const dirsOf = (wt: Worktree): string[] => [...wt.folders].map(([dir]) => dir);

// The folder the brief asks about, else the only folder in the worktree when the brief asks for the story's folder
// without naming one.
function folderAsked(wt: Worktree, brief: string): string | undefined {
  const named = /the folder (\S+?),? if it exists/.exec(brief)?.[1];
  if (named) return wt.folders.has(named) ? named : undefined;
  const dirs = dirsOf(wt);
  return dirs.length === 1 ? dirs[0] : undefined;
}

// What a key that is no ledger form gets from the folder: the folder itself, one file's contents, or the files named.
function folderAnswer(key: string, desc: string, dir: string, files: Files): Evidence[] {
  if (key.includes("folder") || key === "spec-dir") return [{ source: key, location: dir, excerpt: dir }];
  const mentioned = SPEC_FILE_NAMES.filter((f) => desc.includes(f));
  const [only] = mentioned;
  if (mentioned.length === 1 && only && /content/i.test(desc)) {
    const text = files[only];
    return text === undefined ? [] : [{ source: key, location: `${dir}/${only}`, excerpt: quote(text) }];
  }
  const present = mentioned.filter((f) => files[f] !== undefined);
  return present.length > 0 ? [{ source: key, location: dir, excerpt: present.join(", ") }] : [];
}

function checkpoint(wt: Worktree, brief: string): Reply {
  const ev: Evidence[] = [{ source: "worktree", location: "x", excerpt: WT }];
  const dir = folderAsked(wt, brief);
  const keys = Array.from(brief.matchAll(/^- ([\w-]+): (.*)$/gm), (m) => [m[1] ?? "", m[2] ?? ""] as const);
  for (const [key, desc] of keys) {
    const form = /^`([^`<{]+)/.exec(desc)?.[1]?.trim();
    if (form) {
      const matching = wt.ledger.filter((line) => line.slice(TS.length + 1).startsWith(form));
      ev.push(...matching.map((excerpt) => ({ source: key, location: "ledger", excerpt })));
    } else if (dir) {
      ev.push(...folderAnswer(key, desc, dir, wt.folders.get(dir) ?? {}));
    }
  }
  return { ...SCOUT, evidence: ev };
}

const card = (title: string): Reply => ({
  answer: "a",
  gaps: [],
  evidence: [
    { source: "card", location: "x", excerpt: "SMR-1" },
    { source: "story-source", location: "x", excerpt: "card" },
    { source: "story", location: "x", excerpt: `${title}\n\nBody` },
    { source: "story-revision", location: "x", excerpt: "abc1234" },
    { source: "labels", location: "x", excerpt: "Feature, Deliverable" },
  ],
});

const coderOk: Script = (_t, label) =>
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
    : { changed: ["a.ts"], ran: [], testProblem: "", specProblem: "", assumptions: [], manualActions: [] };
const validatorOk: Script = () => ({
  results: [{ id: "c1", result: "pass", ran: "p", evidence: ["e.png"], detail: "", setting: "draft" }],
  uncategorizedSetting: "draft",
});

const judgeOk = (_t: string, label: string): Reply => {
  if (label === "decide") return { viable: true, chosen: "smallest", grafts: [], rejected: [], reasons: ["fits"] };
  return label === "gateway" ? { missed: [], docsToAdd: [] } : { problems: [] };
};

const agents = (build: Build): Record<string, Script> => ({
  designer: () => ({ approach: "a", reuse: [], create: [], interfaces: [], data: [], dependencies: [], risks: [] }),
  "writer-spec": () => ({ build: { ...build, manualActions: [] }, validate: VALIDATE, claims: ["a.ts exists"] }),
  "check-claim": () => ({ holds: true, location: "a.ts:1", problem: "" }),
  "check-criterion": () => ({ holds: true, location: "c1", problem: "" }),
  "lens-scope": () => LENS_PASS,
  "lens-altitude": () => LENS_PASS,
  "lens-consistency": () => LENS_PASS,
  "library-reader": () => ({ summary: "s", supported: [], gaps: [] }),
  judge: judgeOk,
  coder: coderOk,
  checks: () => ({ commands: [{ command: "unit", exitCode: 0, failingLines: "" }] }),
  qa: () => ({ ...LENS_PASS, testAtFault: false }),
  simplifier: () => LENS_PASS,
  validator: validatorOk,
  pusher: (_t, _l, prompt) =>
    prompt.includes("open the branch's PR")
      ? { done: true, unmet: [], operations: [{ op: "pr", reference: "PR-1" }] }
      : OK_PUSH,
  watcher: () => ({ outcome: "finished", waitingFor: "none", limitMinutes: 60, reference: "r", findings: [] }),
  ...PR_AGENTS,
});

// ---- Running deliver-story ---------------------------------------------------------------------------------------

type Calls = typeof calls;
type Call = Calls[number];

async function run(title: string, wt: Worktree, build: Build, over: Partial<Record<string, Script>> = {}) {
  calls.length = 0;
  const all = { ...agents(build), ...over };
  current.script = (type, label, prompt) => {
    if (type === "scout-card") return card(title);
    if (type === "scout-checkpoint") return checkpoint(wt, prompt);
    if (type.startsWith("scout-")) return SCOUT;
    if (type.startsWith("advisor-"))
      return label === "attack the spec" || label === "check the revision" ? { findings: [] } : { views: [] };
    return all[type]?.(type, label, prompt) ?? null;
  };
  Object.assign(globalThis, { args: "SMR-1" });
  const result = await deliverStory();
  return { result, calls: [...calls] };
}

// The folders writer-spec was told to write, and the ledger lines pusher was told to append, in order.
const specFoldersWritten = (cs: Calls): string[] =>
  cs
    .filter((c) => c.type === "writer-spec")
    .map((c) => new RegExp(String.raw`Spec folder: ${WT}/(\S+?)\.? `).exec(c.prompt)?.[1] ?? "?");
const ledgerLinesOf = (c: Call): string[] =>
  c.type === "pusher" && c.prompt.includes("Append these lines")
    ? (c.prompt.split("Append these lines", 2)[1] ?? "")
        .split("\n")
        .filter((l) => l.startsWith("- "))
        .map((l) => `${TS} ${l.slice(2)}`)
    : [];
const ledgerOf = (cs: Calls): string[] => cs.flatMap((c) => ledgerLinesOf(c));

// The worktree a first run leaves: its last spec folder, and the ledger lines of its pusher calls before `cut`.
function leftBy(cs: Calls, build: Build, cut = cs.length): Worktree {
  const folders: Worktree["folders"] = new Map();
  const dir = specFoldersWritten(cs).at(-1);
  if (dir)
    folders.set(dir, {
      "build.json": JSON.stringify({ ...build, manualActions: [] }),
      "validate.json": JSON.stringify(VALIDATE),
      "RATIONALE.md": "# Rationale\n\nWhy the spec is what it is.",
    });
  return { folders, ledger: ledgerOf(cs.slice(0, cut)) };
}

const isAttack = (c: Call): boolean => c.label === "attack the spec";
const howSteps = (cs: Calls) => ({
  designer: cs.filter((c) => c.type === "designer").length,
  advisors: cs.filter((c) => c.type.startsWith("advisor-") && !isAttack(c) && c.label !== "check the revision").length,
  decide: cs.filter((c) => c.type === "judge" && c.label === "decide").length,
  writerSpec: cs.filter((c) => c.type === "writer-spec").length,
  attacks: cs.filter((c) => isAttack(c)).length,
});
const NO_HOW = { designer: 0, advisors: 0, decide: 0, writerSpec: 0, attacks: 0 };
const built = (cs: Calls): number => cs.filter((c) => c.type === "coder").length;
const byText = (a: string, b: string): number => a.localeCompare(b);
// The task ids the coder was dispatched for, from labels such as "t3: test", sorted.
const tasksBuilt = (cs: Calls): string[] =>
  [...new Set(cs.filter((c) => c.type === "coder").map((c) => /^(t\d+):/.exec(c.label)?.[1] ?? "?"))].toSorted(byText);
const taskIds = (build: Build): string[] => build.tasks.map((t) => t.id).toSorted(byText);
const onlyFolder = (wt: Worktree): string => dirsOf(wt)[0] ?? "";

// A first run that finishes its challenge and is blocked in the build: the first coder dispatch fails.
const blockedInBuild = (build: Build) =>
  run(FIRST_TITLE, { folders: new Map(), ledger: [] }, build, { coder: () => null });

// Each checks dispatch fails with new problems, one fewer than the dispatch before.
const shrinkingChecks = (): Script => {
  let dispatches = 0;
  return () => {
    dispatches += 1;
    return {
      commands: Array.from({ length: Math.max(1, 12 - dispatches) }, (_, i) => ({
        command: `unit ${String(i)}`,
        exitCode: 1,
        failingLines: `FAIL d${String(dispatches)}-${String(i)}`,
      })),
    };
  };
};
// A judge that confirms each problem as a major for the coder, under its own fingerprint.
const confirming: Script = (type, label, prompt) =>
  label === "rule"
    ? {
        verdict: "confirmed",
        severity: "major",
        kind: "code",
        ruling: "none",
        reason: "seen",
        fingerprint: /FAIL (\S+)/.exec(prompt)?.[1] ?? "?",
      }
    : judgeOk(type, label);
const doneRounds = (cs: Calls): number[] =>
  ledgerOf(cs)
    .map((l) => / done round (\d+)$/.exec(l)?.[1])
    .filter((n) => n !== undefined)
    .map(Number);

beforeEach(() => {
  calls.length = 0;
});

describe("SMR-374: a rerun over a committed spec", () => {
  for (const [size, build] of [
    ["small", SMALL_BUILD],
    ["budget-sized", LARGE_BUILD],
  ] as const) {
    test(`a ${size} build.json, challenge finished, first run blocked in the build: the rerun goes to the build`, async () => {
      const first = await blockedInBuild(build);
      assert.equal(specFoldersWritten(first.calls).length, 1, "the first run wrote its spec");
      assert.ok(
        first.calls.some((c) => isAttack(c)),
        "the first run challenged it",
      );
      assert.ok(built(first.calls) > 0, "and reached the build");
      const wt = leftBy(first.calls, build);
      const bytes = (wt.folders.get(onlyFolder(wt))?.["build.json"] ?? "").length;
      if (build === LARGE_BUILD)
        assert.ok(bytes > 15_000 && bytes < SCOUT_QUOTE_LIMIT, `build.json is ${String(bytes)} bytes`);

      const rerun = await run(FIRST_TITLE, wt, build);
      assert.deepEqual(howSteps(rerun.calls), NO_HOW, "no design, advice, decision, spec, or challenge");
      assert.deepEqual(tasksBuilt(rerun.calls), taskIds(build), "the rerun builds every task of the spec");
    });
  }

  test("the resume point is the same for a small and a budget-sized build.json", async () => {
    const points: { how: ReturnType<typeof howSteps>; allTasksBuilt: boolean }[] = [];
    for (const build of [SMALL_BUILD, LARGE_BUILD]) {
      const first = await blockedInBuild(build);
      const rerun = await run(FIRST_TITLE, leftBy(first.calls, build), build);
      const ids = tasksBuilt(rerun.calls);
      points.push({ how: howSteps(rerun.calls), allTasksBuilt: taskIds(build).every((id) => ids.includes(id)) });
    }
    assert.deepEqual(points[1], points[0], "budget-sized (second) resumes where small (first) does");
  });

  for (const title of ["Resume a rerun at the build", "Line 1: Resume a rerun at the build"]) {
    test(`a changed first line ${JSON.stringify(title)}: one spec folder, and the rerun goes to the build`, async () => {
      const first = await blockedInBuild(SMALL_BUILD);
      const wt = leftBy(first.calls, SMALL_BUILD);
      const rerun = await run(title, wt, SMALL_BUILD);
      // The worktree after both runs: the first run's folder plus any the rerun wrote.
      const folders = new Set([...dirsOf(wt), ...specFoldersWritten(rerun.calls)]);
      assert.deepEqual(
        { folders: [...folders], how: howSteps(rerun.calls) },
        { folders: dirsOf(wt), how: NO_HOW },
        "exactly one spec folder for the story, and no design, advice, decision, spec, or challenge",
      );
    });
  }

  test("a committed three-file spec whose challenge did not finish: challenge again, nothing before it, then build", async () => {
    // The first run dies once its spec is committed, before its first attack: its ledger holds only what came before.
    const first = await blockedInBuild(SMALL_BUILD);
    const wt = leftBy(
      first.calls,
      SMALL_BUILD,
      first.calls.findIndex((c) => isAttack(c)),
    );
    const rerun = await run(FIRST_TITLE, wt, SMALL_BUILD);
    const s = howSteps(rerun.calls);
    assert.deepEqual({ ...s, attacks: 0 }, NO_HOW, `no design, advice, decision, or spec: ${JSON.stringify(s)}`);
    assert.ok(s.attacks > 0, "the challenge runs again");
    assert.ok(built(rerun.calls) > 0, "then the build");
  });

  test("a ledger with a finished round 0: the rerun goes to round 1 and rebuilds none of round 0's tasks", async () => {
    // The first run builds round 0, whose checks fail, pushes it, and is blocked when round 1's fix fails.
    let coders = 0;
    const first = await run(FIRST_TITLE, { folders: new Map(), ledger: [] }, SMALL_BUILD, {
      checks: () => ({ commands: [{ command: "unit", exitCode: 1, failingLines: "FAIL a1.ts" }] }),
      coder: (...dispatch) => {
        coders += 1;
        return coders <= 2 ? coderOk(...dispatch) : null;
      },
    });
    const wt = leftBy(first.calls, SMALL_BUILD);
    assert.ok(
      wt.ledger.some((l) => l.endsWith(" done round 0")),
      `round 0 finished:\n${wt.ledger.join("\n")}`,
    );
    assert.ok(
      wt.ledger.every((l) => !/ done round 1\b/.test(l)),
      "round 1 did not",
    );

    assert.ok(
      first.calls.some((c) => c.type === "coder" && c.label.startsWith("t1")),
      "coder labels name the task",
    );
    const rerun = await run(FIRST_TITLE, wt, SMALL_BUILD);
    const rebuilt = rerun.calls.filter((c) => c.type === "coder" && c.label.startsWith("t1")).map((c) => c.label);
    const rounds = ledgerOf(rerun.calls).filter((l) => / done round \d+/.test(l));
    assert.deepEqual(
      { rebuilt, roundZeroAgain: rounds.filter((l) => l.endsWith(" done round 0")) },
      { rebuilt: [], roundZeroAgain: [] },
      `round 0 is neither rebuilt nor finished again; the rerun's round lines:\n${rounds.join("\n")}`,
    );
  });

  test("a ledger with a finished round 2: the rerun goes on at round 3 with a fresh budget of fix rounds", async () => {
    // Every round has fewer new problems than the one before, so only the round budget ends a run. The first run finishes rounds 0 to 2 and is blocked when round 3's fix fails.
    const first = await run(FIRST_TITLE, { folders: new Map(), ledger: [] }, SMALL_BUILD, {
      checks: shrinkingChecks(),
      judge: confirming,
      coder: (...dispatch) => (doneRounds(calls).includes(2) ? null : coderOk(...dispatch)),
    });
    assert.deepEqual(doneRounds(first.calls), [0, 1, 2], "the first run finished rounds 0 to 2");

    const rerun = await run(FIRST_TITLE, leftBy(first.calls, SMALL_BUILD), SMALL_BUILD, {
      checks: shrinkingChecks(),
      judge: confirming,
    });
    assert.deepEqual(
      doneRounds(rerun.calls),
      Array.from({ length: MAX_FIX_ROUNDS + 1 }, (_, i) => 3 + i),
      "the rerun numbers its rounds on from 3, and runs its first round plus a fresh budget of fix rounds",
    );
  });

  for (const missing of [...SPEC_FILE_NAMES, "the whole folder"] as const) {
    test(`a spec without ${missing}: the rerun runs design, advice, decision, spec, and challenge`, async () => {
      const first = await blockedInBuild(SMALL_BUILD);
      const wt = leftBy(first.calls, SMALL_BUILD);
      const files = wt.folders.get(onlyFolder(wt)) ?? {};
      if (missing === "the whole folder") wt.folders.clear();
      else wt.folders.set(onlyFolder(wt), Object.fromEntries(Object.entries(files).filter(([f]) => f !== missing)));
      const rerun = await run(FIRST_TITLE, wt, SMALL_BUILD);
      const s = howSteps(rerun.calls);
      assert.ok(
        Object.values(s).every((n) => n > 0),
        JSON.stringify(s),
      );
    });
  }
});
