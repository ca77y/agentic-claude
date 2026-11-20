// Runs research with scripted agents, so its control flow is tested without any model.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import research from "../src/slopify/workflows/research.ts";
import {
  PR_AGENTS,
  calls,
  current,
  describedBeforeEachPosting,
  installAgents,
  isPosting,
  scriptOf,
  type Reply,
  type Script,
} from "./harness.ts";

installAgents();

const CARD = {
  answer: "a",
  gaps: [],
  evidence: [
    { source: "card", location: "x", excerpt: "SMR-30" },
    { source: "story-source", location: "x", excerpt: "card" },
    { source: "story", location: "x", excerpt: "How fast is the parser?" },
    { source: "story-revision", location: "x", excerpt: "abc1234" },
  ],
};
const evidenceFor = (url: string, extra: Record<string, unknown> = {}) => ({
  findings: [`fast <- ${url}`],
  sources: [{ url, title: url }],
  contradictions: [],
  limits: [],
  planProblem: "",
  ...extra,
});
const PASS = { verdict: "pass", findings: [], evidence: "read it" };
const FAIL = { verdict: "fail", findings: ["q2 is unbounded"], evidence: "read it" };
// The plan's judge rules on a round's findings at once; the loop's judge rules on one problem.
const PLAN_RULED = { problems: [{ location: "q2", problem: "q2 is unbounded", severity: "major", reason: "seen" }] };
const CONFIRMED = {
  verdict: "confirmed",
  severity: "major",
  kind: "docs",
  ruling: "none",
  reason: "seen",
  fingerprint: "f",
};
const PR = { done: true, unmet: [], operations: [{ op: "pr", reference: "PR-3" }] };
const OK_PUSH = {
  done: true,
  unmet: [],
  operations: [
    { op: "commit", reference: "abc" },
    { op: "card", reference: "comment" },
  ],
};

const scribe = (label: string): Reply => {
  if (label === "plan" || label.startsWith("revise")) {
    return {
      subQuestions: [
        { id: "q1", question: "How fast?" },
        { id: "q2", question: "On what input?" },
      ],
    };
  }
  if (label.startsWith("raw note"))
    return { path: `library/raw/${label.replace("raw note ", "n")}.md`, deferredMetadata: ["index line"] };
  if (label === "integrate")
    return {
      pages: ["library/wiki/parser-speed.md"],
      changed: ["library/wiki/parser-speed.md", "library/_meta/index.md"],
    };
  return { changed: ["library/wiki/parser-speed.md"] };
};

const DEFAULTS: Record<string, Script> = {
  "scout-card": () => CARD,
  "scout-checkpoint": () => ({
    answer: "a",
    gaps: [],
    evidence: [{ source: "worktree", location: "x", excerpt: "/p/wt" }],
  }),
  "library-reader": () => ({ summary: "nothing yet", supported: [], gaps: ["speed"] }),
  "library-scribe": (_t, label) => scribe(label),
  "library-clerk": () => PASS,
  "library-researcher": (_t, label) => evidenceFor(label === "retrieve q1" ? "https://a.example" : "https://b.example"),
  judge: (_t, label) => (label === "rule on the findings" ? PLAN_RULED : CONFIRMED),
  checks: () => ({ commands: [{ command: "lint", exitCode: 0, failingLines: "" }] }),
  watcher: () => ({ outcome: "finished", waitingFor: "none", limitMinutes: 60, reference: "r", findings: [] }),
  pusher: (_t, _l, prompt) => (prompt.includes("open the branch's PR") ? PR : OK_PUSH),
  ...PR_AGENTS,
};
const happy = (over: Partial<Record<string, Script>> = {}): Script => scriptOf(DEFAULTS, over);
const count = (type: string, label?: string): number =>
  calls.filter((c) => c.type === type && (label === undefined || c.label.includes(label))).length;
const integratePrompt = (): string => calls.find((c) => c.label === "integrate")?.prompt ?? "";
const described = (type: string): string[] => calls.filter((c) => c.type === type).map((c) => c.prompt);
const trustLine = (prompt: string, check: string, verdict: string): boolean =>
  prompt.split("\n").some((line) => line.includes(`"${check}"`) && line.includes(` ${verdict}`));
const RESUMED = {
  answer: "a",
  gaps: [],
  evidence: [
    { source: "worktree", location: "x", excerpt: "/p/wt" },
    {
      source: "done-findings",
      location: "x",
      excerpt: "2026-11-09T10:00:00Z done findings library/wiki/parser-speed.md",
    },
  ],
};
// A resumed run whose committed pages are these.
const resumedWith = (pages: readonly string[]) => ({
  ...RESUMED,
  evidence: [
    RESUMED.evidence[0],
    { source: "done-findings", location: "x", excerpt: `2026-11-09T10:00:00Z done findings ${pages.join(" ")}` },
  ],
});
const lastDescribed = (type: string): string => described(type).at(-1) ?? "";
// Every source count the prompt states, as written.
const counts = (prompt: string): string[] =>
  Array.from(prompt.matchAll(/(?:at least )?\b\d+ sources?\b/gi), (m) => m[0]);

async function run(args: unknown, script: Script) {
  current.script = script;
  Object.assign(globalThis, { args });
  return research();
}

beforeEach(() => {
  calls.length = 0;
});

describe("research", () => {
  test("plans, retrieves per sub-question, writes a raw note per source, integrates, and goes ready", async () => {
    const r = await run("SMR-30", happy());
    assert.equal(r.status, "ready");
    assert.equal(count("library-researcher"), 2);
    assert.equal(count("library-scribe", "raw note"), 2);
    assert.equal(count("library-scribe", "integrate"), 1);
    assert.ok(
      calls.some(
        (c) =>
          c.label === "commit: add the research" && c.prompt.includes("done findings library/wiki/parser-speed.md"),
      ),
    );
    assert.ok(
      calls.some((c) => c.type === "writer-pr" && c.prompt.includes("library/wiki/parser-speed.md")),
      "writer-pr is told the main page",
    );
    assert.ok(calls.find((c) => c.label === "plan")?.prompt.includes(".tmp/research/smr-30.plan.md"));
  });

  test("every push that opens or updates the PR runs writer-pr, then pusher (research)", async () => {
    const r = await run("SMR-30", happy());
    assert.equal(r.status, "ready");
    assert.ok(calls.filter((c) => isPosting(c)).length >= 2);
    assert.ok(describedBeforeEachPosting());
  });

  test("writer-pr is given the citations checked and the source count that Why trust it rests on", async () => {
    const r = await run("SMR-30", happy());
    assert.equal(r.status, "ready");
    for (const type of ["writer-pr"]) {
      const prompts = calls.filter((c) => c.type === type).map((c) => c.prompt);
      assert.ok(prompts.length > 0, `${type} ran`);
      for (const prompt of prompts) {
        for (const check of ["evidence: library/wiki/parser-speed.md", "library integrity"]) {
          assert.ok(
            prompt.split("\n").some((line) => line.includes(check) && /\bpass(?:ed)?\b/i.test(line)),
            `${type} is told the clerk check "${check}" passed`,
          );
        }
        assert.match(prompt, /\b2 sources\b/i, `${type} is told the source count`);
      }
    }
  });

  test("a resumed run gives writer-pr the source count, from the raw notes the committed pages cite", async () => {
    const notes = ["library/raw/a.md", "library/raw/b.md", "library/raw/c.md"];
    const r = await run(
      "SMR-30",
      happy({
        "scout-checkpoint": () => RESUMED,
        // The evidence check reads each committed page against the raw notes it cites, one note per source.
        "library-clerk": (_t, label) => (label.startsWith("evidence: ") ? { ...PASS, notes } : PASS),
      }),
    );
    assert.equal(r.status, "ready");
    assert.equal(count("library-researcher"), 0);
    for (const type of ["writer-pr"]) {
      const prompts = described(type);
      assert.ok(prompts.length > 0, `${type} ran`);
      for (const prompt of prompts) {
        assert.ok(trustLine(prompt, "library integrity", "passed"), `${type} is told the integrity check passed`);
        assert.match(prompt, /\b3 sources\b/i, `${type} is told the source count on a resumed run`);
      }
    }
  });

  test("a resumed run counts only the raw notes the pages cite after a repair, not those an earlier round named", async () => {
    let checks = 0;
    const r = await run(
      "SMR-30",
      happy({
        "scout-checkpoint": () => RESUMED,
        "library-clerk": (_t, label) => {
          if (!label.startsWith("evidence: ")) return PASS;
          checks += 1;
          // The repair drops the page's citation of c.
          return checks === 1
            ? {
                ...FAIL,
                findings: ["cites c for a claim c does not make"],
                notes: ["library/raw/a.md", "library/raw/b.md", "library/raw/c.md"],
              }
            : { ...PASS, notes: ["library/raw/a.md", "library/raw/b.md"] };
        },
      }),
    );
    assert.equal(r.status, "ready");
    assert.equal(count("library-scribe", "repair"), 1);
    for (const type of ["writer-pr"]) {
      assert.deepEqual(counts(lastDescribed(type)), ["2 sources"], `${type} is told the count after the repair`);
    }
  });

  test("a resumed run counts a raw note two pages cite once, however the clerk spaces its path", async () => {
    const r = await run(
      "SMR-30",
      happy({
        "scout-checkpoint": () => resumedWith(["library/wiki/parser-speed.md", "library/wiki/parser-input.md"]),
        "library-clerk": (_t, label) =>
          label === "evidence: library/wiki/parser-speed.md"
            ? { ...PASS, notes: ["library/raw/a.md", "library/raw/b.md"] }
            : label === "evidence: library/wiki/parser-input.md"
              ? { ...PASS, notes: [" library/raw/b.md ", "library/raw/c.md"] }
              : PASS,
      }),
    );
    assert.equal(r.status, "ready");
    for (const type of ["writer-pr"]) {
      assert.deepEqual(counts(lastDescribed(type)), ["3 sources"], `${type} counts the shared note once`);
    }
  });

  test("a resumed run counts only raw notes among the paths a clerk names", async () => {
    await run(
      "SMR-30",
      happy({
        "scout-checkpoint": () => RESUMED,
        "library-clerk": (_t, label) =>
          label.startsWith("evidence: ")
            ? { ...PASS, notes: ["library/raw/a.md", "library/raw/b.md", "library/wiki/parser-input.md"] }
            : PASS,
      }),
    );
    for (const type of ["writer-pr"]) {
      assert.deepEqual(counts(lastDescribed(type)), ["2 sources"], `${type} is not told a wiki page is a source`);
    }
  });

  test("a resumed run never states a flat source count when an evidence check could not name its notes", async () => {
    await run(
      "SMR-30",
      happy({
        "scout-checkpoint": () => resumedWith(["library/wiki/parser-speed.md", "library/wiki/parser-input.md"]),
        "library-clerk": (_t, label) =>
          label === "evidence: library/wiki/parser-speed.md"
            ? { ...PASS, notes: ["library/raw/a.md", "library/raw/b.md"] }
            : label === "evidence: library/wiki/parser-input.md"
              ? { verdict: "unverified", findings: [], evidence: "the page could not be read", notes: [] }
              : PASS,
      }),
    );
    const prompts = [...described("writer-pr")];
    assert.ok(prompts.length > 0, "the PR is described");
    for (const prompt of prompts) {
      for (const stated of counts(prompt)) {
        assert.match(stated, /^at least /i, `a count that misses a page's notes is a lower bound, not "${stated}"`);
      }
    }
  });

  test("says 1 source, not 1 sources, when the research rests on one source", async () => {
    await run("SMR-30", happy({ "library-researcher": () => evidenceFor("https://same.example") }));
    for (const prompt of described("writer-pr")) {
      assert.match(prompt, /\b1 source\b/i);
      assert.doesNotMatch(prompt, /\b1 sources\b/i);
    }
  });

  test("tells writer-pr a clerk check that failed or could not run, not that it passed", async () => {
    await run(
      "SMR-30",
      happy({
        "library-clerk": (_t, label) =>
          label === "library integrity"
            ? { ...FAIL, findings: ["broken link in the index"] }
            : label.startsWith("evidence: ")
              ? { verdict: "unverified", findings: [], evidence: "the raw note is missing" }
              : PASS,
      }),
    );
    const prompts = [...described("writer-pr")];
    assert.ok(prompts.length > 0, "the PR is described");
    for (const prompt of prompts) {
      assert.ok(trustLine(prompt, "library integrity", "failed"), "the failed check is reported as failed");
      assert.ok(
        trustLine(prompt, "evidence: library/wiki/parser-speed.md", "could not run"),
        "the unverified check is reported as could not run",
      );
      assert.ok(!trustLine(prompt, "library integrity", "passed"), "the failed check is never reported as passed");
    }
  });

  test("writes one raw note for a source two sub-questions share", async () => {
    await run("SMR-30", happy({ "library-researcher": () => evidenceFor("https://same.example") }));
    assert.equal(count("library-scribe", "raw note"), 1);
  });

  test("revises the plan for a confirmed problem", async () => {
    let checks = 0;
    await run(
      "SMR-30",
      happy({
        "library-clerk": (_t, label) => {
          if (label !== "check the plan") return PASS;
          checks += 1;
          return checks === 1 ? FAIL : PASS;
        },
      }),
    );
    assert.equal(count("library-scribe", "revise"), 1);
  });

  test("states what is still wrong with the plan after three revisions as a limit, and goes on", async () => {
    const r = await run(
      "SMR-30",
      happy({ "library-clerk": (_t, label) => (label === "check the plan" ? FAIL : PASS) }),
    );
    assert.equal(r.status, "ready");
    assert.equal(count("library-scribe", "revise"), 3);
    assert.ok(integratePrompt().includes("q2 is unbounded"));
  });

  test("never replans: a researcher's plan problem becomes a stated limit", async () => {
    await run(
      "SMR-30",
      happy({ "library-researcher": () => evidenceFor("https://a.example", { planProblem: "q1 needs a version" }) }),
    );
    assert.equal(count("library-scribe", "revise"), 0);
    assert.ok(integratePrompt().includes("q1 needs a version"));
  });

  test("sends a problem the final check finds to the scribe's repair", async () => {
    let checks = 0;
    await run(
      "SMR-30",
      happy({
        "library-clerk": (_t, label) => {
          if (label !== "library integrity") return PASS;
          checks += 1;
          return checks === 1 ? { ...FAIL, findings: ["broken link in the index"] } : PASS;
        },
      }),
    );
    assert.equal(count("library-scribe", "repair"), 1);
  });

  test("goes straight to the loop when the pages are already committed", async () => {
    const r = await run(
      "SMR-30",
      happy({
        "scout-checkpoint": () => ({
          answer: "a",
          gaps: [],
          evidence: [
            { source: "worktree", location: "x", excerpt: "/p/wt" },
            {
              source: "done-findings",
              location: "x",
              excerpt: "2026-11-09T10:00:00Z done findings library/wiki/parser-speed.md",
            },
          ],
        }),
      }),
    );
    assert.equal(r.status, "ready");
    assert.equal(count("library-reader"), 0);
    assert.equal(count("library-researcher"), 0);
  });

  test("recovers only an open PR, so a closed PR on the same branch name is never taken as the run's", async () => {
    await run("SMR-30", happy());
    const brief = calls.find((c) => c.type === "scout-checkpoint")?.prompt ?? "";
    assert.match(
      brief,
      /- pr: the reference of the branch's open PR; leave it out when the branch's only PRs are closed/,
    );
  });

  test("asks for the question when given nothing", async () => {
    const r = await run("", happy());
    assert.equal(r.status, "not-started");
    assert.equal(calls.length, 0);
  });
});
