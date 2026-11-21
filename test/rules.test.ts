import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  allowsReady,
  checkDescription,
  checkpointLine,
  gate,
  isDeliverable,
  noProgress,
  parseReproduction,
  progressLine,
  reproductionLine,
  renderState,
  routeOf,
  waves,
  type CheckpointKey,
  type DeliveryKind,
  type PrState,
  type Ruled,
} from "../src/slopify/lib/rules.ts";

const ruled = (over: Partial<Ruled>): Ruled => ({
  verdict: "confirmed",
  severity: "major",
  kind: "code",
  ruling: "none",
  ...over,
});

const first = (r: Partial<Ruled>, hasSpec = true) => routeOf(ruled(r), 0, false, hasSpec);
const idsIn = (group: readonly { id: string }[]) => group.map((t) => t.id);
const ids = (groups: readonly { id: string }[][]) => groups.map((g) => idsIn(g));
const task = (id: string, dependsOn: string[] = [], files: string[] = [`${id}.ts`]) => ({ id, dependsOn, files });

const idsOf = (tasks: readonly ReturnType<typeof task>[]) => ids(waves(tasks));

describe("routeOf", () => {
  test("sends each kind where the table says", () => {
    assert.equal(first({ kind: "code" }), "coder");
    assert.equal(first({ kind: "test" }), "correct-test");
    assert.equal(first({ kind: "docs" }), "writer");
    assert.equal(first({ kind: "spec" }), "revise-spec");
  });

  test("treats a spec problem as code when the run has no spec folder", () => {
    assert.equal(first({ kind: "spec" }, false), "coder");
  });

  test("never sends a non-defect to a producer", () => {
    assert.equal(first({ kind: "cannot-verify", severity: "none" }), "not-validated");
    assert.equal(first({ kind: "decision", severity: "none" }), "needs-confirmation");
    assert.equal(first({ verdict: "dismissed" }), "dismiss");
    assert.equal(first({ verdict: "unverified" }), "unverified");
  });

  test("lists what doesn't block instead of fixing it", () => {
    assert.equal(first({ severity: "minor" }), "suggestion");
    assert.equal(first({ severity: "nit" }), "suggestion");
    assert.equal(first({ severity: "pre-existing" }), "new-issue");
  });

  test("closes a recurring major with its ruling", () => {
    assert.equal(routeOf(ruled({ ruling: "accept-as-debt" }), 1, false, true), "known-debt");
    assert.equal(routeOf(ruled({ ruling: "split-to-issue" }), 1, false, true), "split-issue");
    assert.equal(routeOf(ruled({ ruling: "escalate" }), 1, false, true), "escalate");
  });

  test("never lets a ruling close a recurring blocker", () => {
    const blocker = { severity: "blocker" } as const;
    assert.equal(routeOf(ruled({ ...blocker, ruling: "accept-as-debt" }), 1, false, true), "escalate");
    assert.equal(routeOf(ruled({ ...blocker, ruling: "split-to-issue" }), 1, false, true), "escalate");
  });

  test("allows fix-differently once", () => {
    const again = ruled({ ruling: "fix-differently" });
    assert.equal(routeOf(again, 1, false, true), "coder");
    assert.equal(routeOf(again, 2, true, true), "escalate");
  });

  test("ignores a ruling on a problem's first attempt", () => {
    assert.equal(routeOf(ruled({ ruling: "accept-as-debt" }), 0, false, true), "coder");
  });
});

describe("gate", () => {
  const clean = { prOpen: true, reviewClean: true, open: 0, held: 0 };

  test("is clean only with a PR, a clean review, and nothing open or held", () => {
    assert.equal(gate(clean), "clean");
    assert.equal(gate({ ...clean, prOpen: false }), "fix");
    assert.equal(gate({ ...clean, reviewClean: false }), "fix");
    assert.equal(gate({ ...clean, open: 1 }), "fix");
  });

  test("stops at a held criterion, because code can't change it", () => {
    assert.equal(gate({ ...clean, held: 1 }), "held");
  });

  test("keeps fixing when something fixable is open beside a held criterion", () => {
    assert.equal(gate({ ...clean, open: 1, held: 1 }), "fix");
  });
});

describe("noProgress", () => {
  test("needs two rounds in a row without a fall", () => {
    assert.equal(noProgress([3, 3]), false);
    assert.equal(noProgress([3, 3, 3]), true);
    assert.equal(noProgress([3, 2, 2]), false);
    assert.equal(noProgress([2, 3, 4]), true);
    assert.equal(noProgress([5, 3, 3, 3]), true);
  });
});

describe("allowsReady", () => {
  test("accepts only the word ready", () => {
    assert.equal(allowsReady("ready"), true);
    assert.equal(allowsReady(" ready\n"), true);
    assert.equal(allowsReady("draft"), false);
    assert.equal(allowsReady("Ready"), false);
    assert.equal(allowsReady(""), false);
    assert.equal(allowsReady(undefined), false);
  });
});

describe("isDeliverable", () => {
  test("finds the exact label in a list", () => {
    assert.equal(isDeliverable("Feature, Deliverable"), true);
    assert.equal(isDeliverable("Deliverable\nFeature"), true);
    assert.equal(isDeliverable("Feature"), false);
    assert.equal(isDeliverable("Undeliverable"), false);
    assert.equal(isDeliverable(""), false);
  });
});

describe("waves", () => {
  test("runs independent tasks together", () => {
    assert.deepEqual(idsOf([task("a"), task("b")]), [["a", "b"]]);
  });

  test("waits for dependencies", () => {
    assert.deepEqual(idsOf([task("b", ["a"]), task("a")]), [["a"], ["b"]]);
  });

  test("separates tasks whose files overlap", () => {
    const overlapping = [task("a", [], ["src/x.ts"]), task("b", [], ["src/x.ts"]), task("c", [], ["src/y.ts"])];
    assert.deepEqual(idsOf(overlapping), [["a", "c"], ["b"]]);
  });

  test("treats a directory as overlapping the files under it", () => {
    assert.deepEqual(idsOf([task("a", [], ["src"]), task("b", [], ["src/x.ts"])]), [["a"], ["b"]]);
    assert.deepEqual(idsOf([task("a", [], ["src"]), task("b", [], ["srcs/x.ts"])]), [["a", "b"]]);
  });

  test("still finishes on a dependency cycle or an unknown id", () => {
    assert.deepEqual(idsOf([task("a", ["b"]), task("b", ["a"])]), [["a", "b"]]);
    assert.deepEqual(idsOf([task("a", ["missing"])]), [["a"]]);
  });
});

describe("the reproduction's ledger line", () => {
  test("reads back what it wrote, with a timestamp in front", () => {
    const r = { steps: ["run add(1, 1)", 'see "0"'], observed: "got 0\nthen stop" };
    assert.deepEqual(parseReproduction(`2026-11-09T10:00:00Z ${reproductionLine(r)}`), r);
  });

  test("reads nothing from a line that isn't one", () => {
    assert.equal(parseReproduction(""), null);
    assert.equal(parseReproduction("reproduced {broken"), null);
    assert.equal(parseReproduction('reproduced {"steps":"x","observed":"y"}'), null);
  });
});

describe("renderState", () => {
  const state: PrState = {
    criteria: [
      {
        id: "c1",
        wording: "make check passes",
        category: "Deterministic",
        path: "make check",
        result: "pass",
        evidence: ["exit 0"],
      },
      { id: "c2", wording: "the page loads", category: "UI", path: "open /", result: "fail", evidence: ["no title"] },
    ],
    open: [{ text: "login fails on Safari", detail: "the session cookie is dropped" }],
  };

  test("renders each criterion's result and every open item", () => {
    const text = renderState(state);
    for (const s of ["make check passes", "pass", "exit 0", "the page loads", "fail", "no title"]) {
      assert.ok(text.includes(s), s);
    }
    assert.ok(text.includes("login fails on Safari"));
    assert.ok(text.includes("the session cookie is dropped"));
  });

  test("carries no fix-attempt count or old section name", () => {
    const text = renderState(state);
    assert.ok(text.length > 0);
    assert.doesNotMatch(text, /attempt|round/i);
    for (const phrase of ["Suggestions", "Known debt", "Unverified findings", "Not validated", "Test changes"]) {
      assert.ok(!text.includes(phrase), phrase);
    }
  });

  test("renders nothing for an empty state", () => {
    assert.equal(renderState({ criteria: [], open: [] }), "");
  });
});

const SPEC = "docs/specs/smr-1-x";
const story = { kind: "story", specDir: SPEC } as const satisfies { kind: DeliveryKind; specDir: string };
const trivial = { kind: "trivial", specDir: "" } as const satisfies { kind: DeliveryKind; specDir: string };

const changes = (spec = `Spec: ${SPEC}`) =>
  `## What changes\n\nReviewers get a description written for them, so they can review without reading the run.\n\n${spec}`;
const trust = "## Why trust it\n\n- c1, c2: pass, make check exits 0.";
const storyBody = (...rest: string[]) => [changes(), ...rest].join("\n\n");

const passes = (body: string, ctx: { kind: DeliveryKind; specDir: string } = story) => {
  assert.deepEqual(checkDescription(body, ctx), { leak: [], format: [] });
};
const breaksFormat = (body: string, ctx: { kind: DeliveryKind; specDir: string } = story) => {
  const r = checkDescription(body, ctx);
  assert.equal(r.format.length, 1, JSON.stringify(r));
  assert.deepEqual(r.leak, []);
  assert.ok(r.format[0]?.trim(), "the problem is a plain sentence");
};
const leaks = (line: string) => {
  const r = checkDescription(storyBody(trust, `## Not done\n\n- ${line}`), story);
  assert.equal(r.leak.length, 1, JSON.stringify(r));
  assert.ok(r.leak[0]?.trim(), "the problem is a plain sentence");
};

describe("checkDescription's format rules", () => {
  test("passes a story body with the two required parts and a trivial body without a Spec line", () => {
    passes(storyBody(trust));
    passes(
      storyBody(
        "## Needs you\n\n- Confirm the old flag can go.",
        trust,
        "## Not done\n\n- SMR-9 filed for the export.",
      ),
    );
    passes(`## What changes\n\nThe header reads Save.\n\n${trust}`, trivial);
  });

  test("flags a body over 4,000 characters", () => {
    breaksFormat(storyBody(trust, `## Not done\n\n${"- an open item that is still open.\n".repeat(130)}`));
  });

  test("flags a heading other than the four", () => {
    breaksFormat(storyBody(trust, "## Notes\n\nNothing."));
  });

  test("flags a heading of another level", () => {
    breaksFormat(storyBody(trust, "### Details\n\nNothing."));
  });

  test("flags the parts out of order", () => {
    breaksFormat(storyBody("## Not done\n\n- SMR-9 filed.", trust));
    breaksFormat(storyBody(trust, "## Needs you\n\n- Confirm the flag."));
  });

  test("flags a part given twice", () => {
    breaksFormat(storyBody(trust, "## Why trust it\n\n- c3: pass."));
  });

  test("flags a missing What changes", () => {
    breaksFormat(trust, trivial);
  });

  test("flags a missing Why trust it", () => {
    breaksFormat(storyBody());
  });

  test("flags an empty Needs you or Not done", () => {
    breaksFormat(storyBody("## Needs you\n", trust));
    breaksFormat(storyBody(trust, "## Not done\n"));
  });

  test("flags text before What changes", () => {
    breaksFormat(`Issue: SMR-1\n\n${storyBody(trust)}`);
  });

  test("flags a story with no Spec line", () => {
    breaksFormat([changes("It also keeps the old flag."), trust].join("\n\n"));
  });

  test("flags a story's Spec line given twice", () => {
    breaksFormat([changes(`Spec: ${SPEC}\n\nSpec: ${SPEC}`), trust].join("\n\n"));
  });

  test("flags a story's Spec line in backticks", () => {
    breaksFormat([changes(`Spec: \`${SPEC}\``), trust].join("\n\n"));
  });

  test("flags a story's Spec line naming another folder", () => {
    breaksFormat([changes("Spec: docs/specs/smr-2-y"), trust].join("\n\n"));
  });

  test("flags a story's Spec line outside What changes", () => {
    breaksFormat(
      ["## What changes\n\nReviewers get a description written for them.", `${trust}\n\nSpec: ${SPEC}`].join("\n\n"),
    );
  });

  test("flags a story's What changes that opens with the Spec line instead of the outcome", () => {
    breaksFormat(`## What changes\n\nSpec: ${SPEC}\n\nReviewers get a description written for them.\n\n${trust}`);
  });
});

describe("checkDescription's leak rules", () => {
  test("flags an absolute path", () => {
    leaks("The fix is in /Users/me/repo/src/x.ts.");
  });

  test("flags a .tmp/ reference", () => {
    leaks("See .tmp/evidence/c1.png for the screenshot.");
  });

  test("flags a ledger line, a progress entry included", () => {
    leaks("2026-11-09T10:00:00Z done round 2");
    leaks("2026-11-09T10:00:00Z progress 2 ruling: fp-3 accept-as-debt, because the flake is upstream");
  });

  test("flags an absolute path of one segment, a Windows path and a file URL", () => {
    leaks("The checkout is /repo now.");
    leaks(String.raw`The fix is in C:\Users\me\x.ts.`);
    leaks("Open file:///Users/me/x.ts to see it.");
  });

  test("flags credential-shaped text", () => {
    leaks(`The token ghp_${"a1B2c3D4e5".repeat(4)} still works.`);
  });

  test("flags a password or key assignment, a bearer token and a JWT", () => {
    leaks("The login is password: hunter2 for now.");
    leaks("Set password=hunter2 in the env.");
    leaks("Run with API_KEY=abcd1234efgh5678 set.");
    leaks("Send Authorization: Bearer abcdefghijklmnop1234567890 with it.");
    leaks(
      "The token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U works.",
    );
  });

  test("passes an HTTP route and a slash command, which are not filesystem paths", () => {
    passes(
      storyBody(
        "## Why trust it\n\n- c1: pass, Adds a GET /health endpoint.\n- c2: pass, returns 404 for /api/users/42.\n- c3: pass, Run `/simplify` after.",
      ),
    );
  });

  test("passes a route named as one whose first segment is a filesystem root", () => {
    passes(
      storyBody(
        "## Why trust it\n\n- c1: pass, The /home route renders the feed.\n- c2: pass, The /tmp/upload endpoint takes a multipart body.",
      ),
    );
  });

  test("flags a home-directory path or a path ending in a file name even when the word route or endpoint follows", () => {
    leaks("Edited /Users/me/x/api.ts route handlers.");
    leaks("Edited /Users/me/proj endpoint config.");
    leaks("Edited /srv/app/src/api.ts endpoint handlers.");
  });

  test("flags a path named as a directory or file under a root the list does not hold", () => {
    leaks("The cache is in the /data/cache directory.");
    leaks("The worker writes the /scratch/out/report file.");
  });

  test("passes a link to a URL or a repo-relative file", () => {
    passes(
      storyBody(
        trust,
        "## Not done\n\n- [SMR-9](https://linear.app/acme/issue/SMR-9) covers the export, see docs/x.md.",
      ),
    );
  });
});

const bugfix = { kind: "bugfix", specDir: "" } as const satisfies { kind: DeliveryKind; specDir: string };
const bugfixBody = (before: string) =>
  `## What changes\n\n${before}\n\n## Why trust it\n\n- The reproduction failed before the fix and passes after it.`;

describe("checkDescription's leak rules keep to what they name", () => {
  test("passes a bug's before and after that quotes a timestamp followed by text, which is not a ledger line", () => {
    passes(bugfixBody("Before: `formatDate` printed `2026-03-01T12:00:00Z UTC` twice. After: once."), bugfix);
    passes(bugfixBody("Logs now read `2026-03-01T12:00:00Z INFO started`."), bugfix);
    passes(bugfixBody("Dates show as 2026-03-01T12:00:00Z now."), bugfix);
  });

  test("still flags each ledger line form", () => {
    leaks("2026-11-09T10:00:00Z run 2: deliver-story SMR-1 | worktree w | branch b");
    leaks("2026-11-09T10:00:00Z done publish #12");
    leaks('2026-11-09T10:00:00Z reproduced {"steps": [], "observed": "x"}');
    leaks("2026-11-09T10:00:00Z review 1 fired none");
    leaks("2026-11-09T10:00:00Z delivery draft");
  });

  test("passes a root-relative markdown link, which is not an absolute filesystem path", () => {
    passes(storyBody(trust, "## Not done\n\n- The rest is in [the guide](/docs/guide.md)."));
  });

  test("still flags a markdown link to a path under a home or filesystem root", () => {
    leaks("See [the file](/Users/me/repo/x.md).");
    leaks("See [the log](/tmp/run/out.log).");
  });
});

describe("checkDescription's overflow rule", () => {
  test("passes grouped Why trust it lines", () => {
    passes(
      storyBody(
        "## Why trust it\n\n- c1-c9, c11-c19: pass, make check exits 0.\n- c10: pass, resume.test.ts passes.\n- c20-c26: not run, they need a full eval.",
      ),
    );
  });

  test("passes a grouped Needs you line linking the committed file that lists the items", () => {
    passes(storyBody(`## Needs you\n\n- 14 acceptance decisions, listed in [build.json](${SPEC}/build.json).`, trust));
  });

  test("passes a grouped Needs you line linking the card", () => {
    passes(
      storyBody(
        "## Needs you\n\n- 37 coder choices, each listed on [SMR-1](https://linear.app/acme/issue/SMR-1).",
        trust,
      ),
    );
  });

  test("passes a 26-criterion, 14-decision story with dozens of coder choices and confirmations, written to the rule", () => {
    const body = storyBody(
      [
        "## Needs you",
        "",
        `- 14 acceptance decisions, d1-d14, listed in [build.json](${SPEC}/build.json); d15 is yours to settle: a grouped line here counts as listing its items.`,
        "- 41 coder choices, each listed on [SMR-1](https://linear.app/acme/issue/SMR-1).",
        "- 23 confirmations, each listed on [SMR-1](https://linear.app/acme/issue/SMR-1).",
        "- Rerun bootstrap in projects set up before this change.",
      ].join("\n"),
      [
        "## Why trust it",
        "",
        "- c1-c9, c11-c18: pass, make check exits 0 and each named unit test passes.",
        "- c10: pass, resume.test.ts compares each ledger with its baseline.",
        "- c19: pass, make check exits 0 after make build.",
        "- c20-c26: not run, they need a full eval by hand.",
      ].join("\n"),
      "## Not done\n\n- c20-c26 wait for a full eval, so the PR stays a draft.\n- [SMR-9](https://linear.app/acme/issue/SMR-9) covers the export.",
    );
    assert.ok(body.length <= 4000);
    passes(body);
  });
});

describe("progressLine", () => {
  test("is one ledger line with progress first, then the round and the ruling", () => {
    const line = progressLine(2, "src/a.ts|f|bug: confirmed,\nmajor, code, coder");
    assert.equal(line, "progress 2 ruling: src/a.ts|f|bug: confirmed, major, code, coder");
  });

  test("carries no angle bracket, so pusher can't take it for a placeholder", () => {
    assert.doesNotMatch(progressLine(1, "fill every <placeholder>: a -> b"), /[<>]/);
  });

  test("stays short, so pusher never copies a long verbatim block", () => {
    const line = progressLine(3, `${"x".repeat(1000)}: confirmed, major, code, coder`);
    assert.ok(line.startsWith("progress 3 ruling: "));
    assert.ok(line.length <= 300, String(line.length));
  });
});

describe("checkpointLine", () => {
  const T = "2026-11-09T10:00:00Z";
  const forms: Record<CheckpointKey, string> = {
    "done-board-start": "done board-start SMR-1",
    "done-round": "done round 2",
    "done-findings": "done findings docs/a.md docs/b.md",
    reproduced: reproductionLine({ steps: ["run add(1, 1)"], observed: "got 0" }),
    "review-fired": `review 1 fired ${T}`,
    "done-spec": "done spec docs/specs/smr-1-x story abc1234",
    "done-challenge": "done challenge docs/specs/smr-1-x",
  };
  const keys = Object.keys(forms) as CheckpointKey[];
  const line = (key: CheckpointKey) => `${T} ${forms[key]}`;

  test("accepts each key's form as a bare ledger line", () => {
    for (const key of keys) assert.equal(checkpointLine(key, line(key)), line(key), key);
    assert.equal(checkpointLine("review-fired", `${T} review 2 fired none`), `${T} review 2 fired none`);
  });

  test("accepts each key's form wrapped as a scout might return it", () => {
    for (const key of keys) {
      const l = line(key);
      for (const wrapped of [`\`${l}\``, `"${l}"`, `- ${l}`, `  ${l}\n`, `\`\`\`text\n${l}\n\`\`\``]) {
        assert.equal(checkpointLine(key, wrapped), l, `${key}: ${wrapped}`);
      }
    }
  });

  test("rejects another key's line", () => {
    assert.equal(checkpointLine("done-round", line("done-board-start")), "");
    assert.equal(checkpointLine("review-fired", `${T} review 1 ended finished: 0 finding(s)`), "");
  });

  test("rejects a progress entry quoting any form, a whole ledger line included", () => {
    for (const key of keys) {
      for (const kind of ["finding", "ruling", "tried", "changed"]) {
        assert.equal(checkpointLine(key, `${T} progress 2 ${kind}: ${forms[key]}`), "", `${key} ${kind}`);
        assert.equal(checkpointLine(key, `${T} progress 2 ${kind}: ${line(key)}`), "", `${key} ${kind} whole`);
        assert.equal(checkpointLine(key, `- ${T} progress 2 ${kind}: ${line(key)}`), "", `${key} ${kind} wrapped`);
      }
    }
  });

  test("rejects a run line quoting a form", () => {
    for (const key of keys) {
      const run = `${T} run 2: deliver-trivial make it say ${forms[key]} | worktree wt | branch b`;
      assert.equal(checkpointLine(key, run), "", key);
    }
  });

  test("rejects prose and a line missing its timestamp", () => {
    for (const key of keys) {
      assert.equal(checkpointLine(key, `The last matching line is: ${line(key)}`), "", key);
      assert.equal(checkpointLine(key, forms[key]), "", `${key} unstamped`);
      assert.equal(checkpointLine(key, "none"), "", key);
      assert.equal(checkpointLine(key, ""), "", key);
    }
    assert.equal(checkpointLine("done-round", `${T} done round <n>`), "");
  });
});
