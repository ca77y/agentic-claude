// A rerun of deliver-story over the state its first run left. Both runs go through the real workflow with scripted
// agents over one simulated worktree: pusher appends the ledger lines its brief asks for and commits the spec folder
// writer-spec returned, and scout-checkpoint answers its brief from what is on disk, as a faithful scout would.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import deliverStory from "../src/slopify/workflows/deliver-story.ts";
import { PR_AGENTS, calls, current, installAgents, type Reply, type Script } from "./harness.ts";

installAgents();

const T = "2026-11-19T10:00:00Z";
const TITLE = "Resume a rerun at the build";
const FOLDER = "docs/specs/smr-1-resume-a-rerun-at-the-build";
const SPEC_FILES = ["build.json", "validate.json", "RATIONALE.md"] as const;

const task = (i: number) => ({
  id: `t${String(i)}`,
  dependsOn: [],
  files: [`src/f${String(i)}.ts`],
  criteria: ["c1"],
  todo: `Change ${"x".repeat(150)} in file ${String(i)}`,
  reuse: [],
  create: [],
});
const buildOf = (n: number) => ({
  shared: [],
  tasks: Array.from({ length: n }, (_, i) => task(i)),
  docs: [],
  decisions: [],
  manualActions: [],
});
const SMALL = buildOf(1);
// About 100 KB once written with two-space indentation.
const BIG = buildOf(270);
const VALIDATE = { criteria: [{ id: "c1", wording: "w", category: "UI", path: "p", evidence: "e", firstTest: "t" }] };
const DESIGN = { approach: "a", reuse: [], create: [], interfaces: [], data: [], dependencies: [], risks: [] };
const SCOUT = { answer: "a", evidence: [], gaps: [] };
const PASS = { verdict: "pass", evaluated: "x", findings: [], limits: "none" };
const PUSHED = {
  done: true,
  unmet: [],
  operations: [
    { op: "commit", reference: "abc" },
    { op: "card", reference: "comment" },
  ],
};

/** The worktree as the runs leave it: committed spec folders and the ledger. */
interface Disk {
  /** Each committed spec folder's files, by name. */
  folders: Record<string, Record<string, string>>;
  ledger: string[];
}
const freshDisk = (): Disk => ({ folders: {}, ledger: [] });

// Text with each <placeholder> replaced by fill.
const filled = (text: string, fill: string): string =>
  text
    .split(/[<>]/)
    .filter((_, i) => i % 2 === 0)
    .join(fill);

// The lines a pusher brief asks to append, stamped, with each <placeholder> filled.
function appendLines(disk: Disk, prompt: string): void {
  const lines = prompt.split("\n");
  const from = lines.findIndex((l) => l.startsWith("Append these lines, in this order, to the ledger"));
  if (from === -1) return;
  const asked = lines.slice(from + 1);
  for (const raw of asked) {
    if (!raw.startsWith("- ")) return;
    disk.ledger.push(`${T} ${filled(raw.slice(2), "x")}`);
  }
}

// A form from the brief, such as `done round <n>`, as a pattern a ledger line must show right after its timestamp.
const formPattern = (form: string): RegExp =>
  new RegExp(
    String.raw`^\S+ ${filled(
      form.replaceAll(/[.*+?^$()|[\]\\]/g, String.raw`\$&`).replace(String.raw`{\.\.\.}`, String.raw`\{.*\}`),
      String.raw`\S+`,
    )}(?:\s|$)`,
  );

// The committed folder the brief leads the scout to: one the brief names, or, when its spec-dir item names no spec
// folder at all, the one the worktree holds (found from the ledger or by the card), as a scout that looks would.
function folderFor(disk: Disk, prompt: string): string | undefined {
  const folders = Object.keys(disk.folders);
  const ask = /^- spec-dir:(.*)$/m.exec(prompt)?.[1];
  const looked = ask !== undefined && !ask.includes("docs/specs/");
  return folders.find((f) => prompt.includes(f)) ?? (looked ? folders[0] : undefined);
}

interface Evidence {
  source: string;
  location: string;
  excerpt: string;
}
const item = (source: string, excerpt: string): Evidence => ({ source, location: "x", excerpt });

/** How a scout copies one file's contents: the excerpts it was asked for in, to the excerpts it returns. */
type Copy = (parts: string[]) => string[];

// One requested item about the spec folder's files: a file's contents when the item asks for one file's contents
// (in consecutive parts, one item each, when it asks for parts of at most some number of characters), else the names
// of the files it mentions that exist; nothing when none does. copy turns the asked excerpts into the returned ones.
function fileItem(files: Record<string, string>, key: string, ask: string, copy: Copy): Evidence[] {
  const names = SPEC_FILES.filter((n) => ask.includes(n));
  if (names.length === 0) return [];
  const [only] = names;
  if (names.length === 1 && only && /contents/i.test(ask)) {
    const text = files[only];
    if (text === undefined) return [];
    const size = Number(/at most ([\d,]+) characters/i.exec(ask)?.[1]?.replaceAll(",", "") ?? 0);
    const parts =
      size <= 0
        ? [text]
        : Array.from({ length: Math.ceil(text.length / size) }, (_, i) => text.slice(i * size, (i + 1) * size));
    return copy(parts).map((part) => item(key, part));
  }
  const present = names.filter((n) => files[n] !== undefined);
  return present.length > 0 ? [item(key, present.join(" "))] : [];
}

// A faithful scout-checkpoint over the disk. copy is how it copies a file's contents into an excerpt.
function checkpoint(disk: Disk, prompt: string, copy: Copy): Reply {
  const evidence: Evidence[] = [item("worktree", "/p/wt")];
  const folder = folderFor(disk, prompt);
  const files = folder === undefined ? undefined : disk.folders[folder];
  for (const [, key = "", ask = ""] of prompt.matchAll(/^- ([\w-]+): (.*)$/gm)) {
    const form = /^`([^`]+)`/.exec(ask)?.[1];
    if (form) {
      const re = formPattern(form);
      evidence.push(...disk.ledger.filter((l) => re.test(l)).map((l) => item(key, l)));
    } else if (key === "spec-dir") {
      if (folder !== undefined) evidence.push(item(key, folder));
    } else if (files) {
      evidence.push(...fileItem(files, key, ask, copy));
    }
  }
  return { ...SCOUT, evidence };
}

type Override = (type: string, label: string, prompt: string) => Reply | undefined;

interface Run {
  disk: Disk;
  firstLine?: string;
  build?: typeof SMALL;
  copy?: Copy;
  /** Overrides for this run, such as the dispatch that blocks a first run; undefined leaves the default reply. */
  over?: Override;
}

const isAttack = (label: string): boolean => label === "attack the spec" || label === "check the revision";

function scriptOf(o: Run): Script {
  const build = o.build ?? SMALL;
  const { disk } = o;
  const story = `${o.firstLine ?? TITLE}\n\nBody`;
  const pusher: Script = (_type, label, prompt) => {
    if (label === "create the worktree")
      return { done: true, unmet: [], operations: [{ op: "worktree", reference: "/p/wt" }] };
    if (label === "commit the spec") {
      const folder = /Commit the folder (\S+)/.exec(prompt)?.[1] ?? "";
      disk.folders[folder] = {
        "build.json": JSON.stringify(build, null, 2),
        "validate.json": JSON.stringify(VALIDATE),
        "RATIONALE.md": "# Rationale",
      };
    }
    appendLines(disk, prompt);
    return prompt.includes("open the branch's PR")
      ? { done: true, unmet: [], operations: [{ op: "pr", reference: "PR-1" }] }
      : PUSHED;
  };
  const fixed: Record<string, Reply> = {
    designer: DESIGN,
    "writer-spec": { build, validate: VALIDATE, claims: ["a.ts exists"] },
    "check-claim": { holds: true, location: "a.ts:1", problem: "" },
    "check-criterion": { holds: true, location: "c1", problem: "" },
    "lens-scope": PASS,
    "lens-altitude": PASS,
    "lens-consistency": PASS,
    "library-reader": { summary: "s", supported: [], gaps: [] },
    qa: { ...PASS, testAtFault: false },
    simplifier: { ...PASS, testAtFault: false },
    checks: { commands: [{ command: "lint", exitCode: 0, failingLines: "" }] },
    watcher: { outcome: "finished", waitingFor: "none", limitMinutes: 60, reference: "r", findings: [] },
    validator: {
      results: [{ id: "c1", result: "pass", ran: "p", evidence: ["e.png"], detail: "", setting: "draft" }],
      uncategorizedSetting: "draft",
    },
    "scout-card": {
      ...SCOUT,
      evidence: [
        item("card", "SMR-1"),
        item("story-source", "card"),
        item("story", story),
        item("story-revision", "abc1234"),
        item("labels", "Feature, Deliverable"),
      ],
    },
  };
  const scripted: Record<string, Script> = {
    ...PR_AGENTS,
    pusher,
    "scout-checkpoint": (_type, _label, prompt) => checkpoint(disk, prompt, o.copy ?? ((parts) => parts)),
    coder: (_type, label) =>
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
        : { changed: ["a.ts"], ran: [], testProblem: "", specProblem: "", assumptions: [], manualActions: [] },
    judge: (_type, label) => {
      if (label === "decide") return { viable: true, chosen: "smallest", grafts: [], rejected: [], reasons: ["fits"] };
      return label === "gateway" ? { missed: [], docsToAdd: [] } : { problems: [] };
    },
  };
  return (type, label, prompt) => {
    const over = o.over?.(type, label, prompt);
    if (over !== undefined) return over;
    const reply = scripted[type]?.(type, label, prompt) ?? fixed[type];
    if (reply !== undefined) return reply;
    if (type.startsWith("scout-")) return SCOUT;
    if (type.startsWith("advisor-")) return isAttack(label) ? { findings: [] } : { views: [] };
    return null;
  };
}

async function deliver(o: Run): Promise<unknown> {
  calls.length = 0;
  current.script = scriptOf(o);
  Object.assign(globalThis, { args: "SMR-1" });
  return deliverStory();
}

const count = (type: string): number => calls.filter((c) => c.type === type).length;
/** How many dispatches each how-phase step made in the last run. */
const howSteps = () => ({
  design: count("designer"),
  advice: calls.filter((c) => c.type.startsWith("advisor-") && !isAttack(c.label)).length,
  decision: calls.filter((c) => c.type === "judge" && c.label === "decide").length,
  spec: count("writer-spec"),
  challenge:
    count("check-claim") + count("check-criterion") + calls.filter((c) => c.label === "attack the spec").length,
});
const NONE = { design: 0, advice: 0, decision: 0, spec: 0, challenge: 0 };
const specCommits = (): number => calls.filter((c) => c.label === "commit the spec").length;
const roundsPushed = (): number[] =>
  calls
    .filter((c) => c.label === "push the round")
    .map((c) => Number(/^- done round (\d+)/m.exec(c.prompt)?.[1] ?? NaN));

// A first run blocked in the build: its first coder dispatch dies.
const BLOCKED_IN_BUILD: Override = (type) => (type === "coder" ? null : undefined);
// A first run interrupted in the challenge: every advisor's attack on the spec dies, so the challenge never finishes.
const INTERRUPTED_IN_CHALLENGE: Override = (type, label) =>
  type.startsWith("advisor-") && label === "attack the spec" ? null : undefined;
// A first run whose round 0 validation fails, so it pushes round 0 without a PR, and is blocked building round 1.
function blockedAfterRound0(): Override {
  let coders = 0;
  return (type, label) => {
    if (type === "validator")
      return {
        results: [{ id: "c1", result: "fail", ran: "p", evidence: ["e.png"], detail: "wrong", setting: "draft" }],
        uncategorizedSetting: "draft",
      };
    if (type === "judge" && label === "rule")
      return {
        verdict: "confirmed",
        severity: "major",
        kind: "code",
        ruling: "none",
        reason: "seen",
        fingerprint: "a",
      };
    if (type !== "coder") return;
    coders += 1;
    return coders > 2 ? null : undefined;
  };
}

// A scout that copies at most some number of characters of any excerpt, as a long file may come back cut short.
const cutAt =
  (max: number): Copy =>
  (parts) =>
    parts.map((s) => s.slice(0, max));
const cut = cutAt(60_000);
// A scout that leaves out the third excerpt of a file it copies in more than two.
const dropThird: Copy = (parts) => (parts.length > 2 ? parts.filter((_, i) => i !== 2) : parts);

beforeEach(() => {
  calls.length = 0;
});

describe("a rerun of deliver-story", () => {
  test("first runs leave the state the reruns start from", async () => {
    const blocked = freshDisk();
    await deliver({ disk: blocked, build: BIG, over: BLOCKED_IN_BUILD });
    assert.ok(howSteps().challenge > 0, "the first run challenged its spec");
    assert.deepEqual(Object.keys(blocked.folders), [FOLDER]);
    const bytes = blocked.folders[FOLDER]?.["build.json"]?.length ?? 0;
    assert.ok(bytes > 95_000 && bytes < 105_000, `build.json is about 100 KB: ${String(bytes)}`);
    assert.ok(
      blocked.ledger.every((l) => !/ done round \d/.test(l)),
      "no build round finished",
    );

    const afterRound0 = freshDisk();
    await deliver({ disk: afterRound0, over: blockedAfterRound0() });
    assert.ok(
      afterRound0.ledger.some((l) => l.endsWith(" done round 0")),
      "the first run finished round 0",
    );
  });

  test("over a challenged spec with a ~100 KB build.json, from a run blocked in the build, goes to the build", async () => {
    const disk = freshDisk();
    await deliver({ disk, build: BIG, over: BLOCKED_IN_BUILD });
    await deliver({ disk, build: BIG });
    assert.deepEqual(howSteps(), NONE);
    assert.ok(count("coder") > 0, "the rerun builds");
    assert.equal(specCommits(), 0);
  });

  test("resumes at the same point whether build.json is small or ~100 KB", async () => {
    const small = freshDisk();
    await deliver({ disk: small, over: BLOCKED_IN_BUILD });
    await deliver({ disk: small });
    const fromSmall = howSteps();
    assert.deepEqual(fromSmall, NONE);
    assert.ok(count("coder") > 0, "the small rerun builds");
    const pushedFromSmall = roundsPushed();

    const big = freshDisk();
    await deliver({ disk: big, build: BIG, over: BLOCKED_IN_BUILD });
    await deliver({ disk: big, build: BIG });
    assert.deepEqual(howSteps(), fromSmall, "a ~100 KB build.json resumes like a small one");
    assert.equal(specCommits(), 0, "the rerun commits no spec again");
    assert.ok(count("coder") > 0, "the ~100 KB rerun builds");
    assert.deepEqual(roundsPushed(), pushedFromSmall, "and pushes the same rounds as the small rerun");
  });

  // The scout copies no excerpt longer than 60,000 characters, so a ~100 KB build.json never comes back whole in one
  // excerpt; the rerun still resumes at the build, exactly as it does over a small one.
  test("over a challenged ~100 KB build.json that no single scout excerpt holds whole, goes to the build like a small one", async () => {
    const small = freshDisk();
    await deliver({ disk: small, over: BLOCKED_IN_BUILD });
    await deliver({ disk: small, copy: cut });
    const pushedFromSmall = roundsPushed();

    const disk = freshDisk();
    await deliver({ disk, build: BIG, over: BLOCKED_IN_BUILD });
    const result = (await deliver({ disk, build: BIG, copy: cut })) as { status?: string };
    assert.deepEqual(howSteps(), NONE, "no design, advice, decision, spec, or challenge");
    assert.equal(specCommits(), 0, "the rerun commits no spec again");
    assert.deepEqual(Object.keys(disk.folders), [FOLDER]);
    assert.equal(count("coder"), 2 * BIG.tasks.length, "every task of the committed build.json is built, test first");
    assert.ok(
      calls.every((c) => c.label !== "report the halt"),
      "the rerun does not halt",
    );
    assert.notEqual(result.status, "blocked");
    assert.deepEqual(roundsPushed(), pushedFromSmall, "and pushes the same rounds as the small rerun");
  });

  // The committed files are whole and parse on disk; only the scout's copy of them is wrong. That is no reason to stop
  // or to redo the how phase: the rerun resumes at the build exactly as it does over a small spec.
  for (const [fault, copy] of [
    ["cuts every excerpt at 10,000 characters", cutAt(10_000)],
    ["leaves out one excerpt of the file", dropThird],
  ] as const) {
    test(`over a challenged ~100 KB build.json that parses on disk, when the scout ${fault}, goes to the build like a small one`, async () => {
      const small = freshDisk();
      await deliver({ disk: small, over: BLOCKED_IN_BUILD });
      await deliver({ disk: small, copy });
      const pushedFromSmall = roundsPushed();

      const disk = freshDisk();
      await deliver({ disk, build: BIG, over: BLOCKED_IN_BUILD });
      const before = structuredClone(disk.folders);
      const result = (await deliver({ disk, build: BIG, copy })) as { status?: string };
      assert.ok(
        calls.every((c) => c.label !== "report the halt"),
        "the rerun does not halt over a file that is fine on disk",
      );
      assert.notEqual(result.status, "blocked");
      assert.deepEqual(howSteps(), NONE, "no design, advice, decision, spec, or challenge");
      assert.equal(specCommits(), 0, "the rerun commits no spec again");
      assert.deepEqual(disk.folders, before, "the committed spec folder is left as it was");
      assert.equal(count("coder"), 2 * BIG.tasks.length, "every task of the committed build.json is built, test first");
      assert.deepEqual(roundsPushed(), pushedFromSmall, "and pushes the same rounds as the small rerun");
    });
  }

  for (const broken of ["build.json", "validate.json"] as const) {
    test(`over a complete spec whose committed ${broken} does not parse, stops on the card, naming the spec folder, and builds nothing`, async () => {
      const disk = freshDisk();
      await deliver({ disk, over: BLOCKED_IN_BUILD });
      const files = disk.folders[FOLDER] ?? {};
      files[broken] = '{"tasks": [';
      const before = structuredClone(disk.folders);
      const result = (await deliver({ disk })) as { status?: string };
      assert.equal(result.status, "blocked", "the rerun stops");
      const reports = calls.filter((c) => c.label === "report the halt");
      assert.equal(reports.length, 1, "the halt is reported once");
      assert.ok(reports[0]?.prompt.includes("card SMR-1"), "on the card");
      assert.ok(reports[0]?.prompt.includes(FOLDER), "naming the spec folder");
      assert.equal(count("coder"), 0, "nothing is built");
      assert.deepEqual(howSteps(), NONE, "no design, advice, decision, spec, or challenge");
      assert.equal(specCommits(), 0, "no spec is committed");
      assert.deepEqual(disk.folders, before, "the spec folder is left as it was");
    });
  }

  test("with a finished build round but no done challenge line, as an older run left it, challenges nothing again", async () => {
    const disk = freshDisk();
    await deliver({ disk, over: blockedAfterRound0() });
    assert.ok(disk.ledger.some((l) => l.includes(" done challenge ")));
    disk.ledger = disk.ledger.filter((l) => !l.includes(" done challenge "));
    await deliver({ disk });
    assert.deepEqual(howSteps(), NONE, "no design, advice, decision, spec, or challenge");
    assert.equal(specCommits(), 0, "the rerun commits no spec again");
    const pushed = roundsPushed();
    assert.ok(
      pushed.length > 0 && pushed.every((n) => n >= 1),
      `the rerun's rounds follow round 0: ${JSON.stringify(pushed)}`,
    );
  });

  test("finds the first run's spec folder when the story's first line now begins \"Line 1:\", and leaves one folder", async () => {
    const disk = freshDisk();
    await deliver({ disk, over: BLOCKED_IN_BUILD });
    await deliver({ disk, firstLine: `Line 1: ${TITLE}` });
    assert.deepEqual(howSteps(), NONE);
    assert.ok(count("coder") > 0, "the rerun builds");
    assert.deepEqual(Object.keys(disk.folders), [FOLDER], "exactly one spec folder for the story");
  });

  test("with a finished build round in the ledger, starts the next round and rebuilds nothing", async () => {
    const disk = freshDisk();
    await deliver({ disk, over: blockedAfterRound0() });
    await deliver({ disk });
    assert.deepEqual(howSteps(), NONE);
    assert.equal(count("coder"), 0, "the finished round's tasks are not rebuilt");
    const pushed = roundsPushed();
    assert.ok(
      pushed.length > 0 && pushed.every((n) => n >= 1),
      `the rerun's rounds follow round 0: ${JSON.stringify(pushed)}`,
    );
  });

  test("over a committed spec whose challenge did not finish, runs the challenge again and then the build", async () => {
    const disk = freshDisk();
    await deliver({ disk, over: INTERRUPTED_IN_CHALLENGE });
    assert.equal(count("coder"), 0, "the first run stopped in the challenge");
    assert.deepEqual(Object.keys(disk.folders), [FOLDER], "the first run committed its spec");
    await deliver({ disk });
    const steps = howSteps();
    assert.deepEqual(
      { ...steps, challenge: 0 },
      NONE,
      `no design, advice, decision, or spec: ${JSON.stringify(steps)}`,
    );
    assert.ok(steps.challenge > 0, `the challenge runs again: ${JSON.stringify(steps)}`);
    assert.ok(count("coder") > 0, "then the build");
    assert.deepEqual(Object.keys(disk.folders), [FOLDER]);
  });

  for (const missing of SPEC_FILES) {
    test(`over a spec folder missing ${missing}, runs the design, advice, decision, spec, and challenge`, async () => {
      const disk = freshDisk();
      await deliver({ disk, over: BLOCKED_IN_BUILD });
      disk.folders[FOLDER] = Object.fromEntries(
        Object.entries(disk.folders[FOLDER] ?? {}).filter(([name]) => name !== missing),
      );
      await deliver({ disk });
      const steps = howSteps();
      assert.ok(
        Object.values(steps).every((n) => n > 0),
        `every how step runs: ${JSON.stringify(steps)}`,
      );
      assert.deepEqual(Object.keys(disk.folders), [FOLDER]);
    });
  }

  test("over a worktree with no spec folder, runs the design, advice, decision, spec, and challenge", async () => {
    await deliver({ disk: freshDisk() });
    const steps = howSteps();
    assert.ok(
      Object.values(steps).every((n) => n > 0),
      `every how step runs: ${JSON.stringify(steps)}`,
    );
  });
});
