// An answers argument that is not a map is rejected before any agent works; a missing one is no answers.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import deliverBugfix from "../src/slopify/workflows/deliver-bugfix.ts";
import deliverSpike from "../src/slopify/workflows/deliver-spike.ts";
import deliverStory from "../src/slopify/workflows/deliver-story.ts";
import deliverTrivial from "../src/slopify/workflows/deliver-trivial.ts";
import research from "../src/slopify/workflows/research.ts";
import { calls, current, installAgents } from "./harness.ts";

installAgents();

const NON_MAPS: [string, unknown][] = [
  ["a list", ["a"]],
  ["a string", "yes"],
  ["a JSON string", '{"q1":"a"}'],
  ["a number", 3],
  ["a boolean", true],
];

const WORKFLOWS: [string, string, () => Promise<unknown>][] = [
  ["deliver-trivial", "story", deliverTrivial],
  ["deliver-bugfix", "story", deliverBugfix],
  ["deliver-story", "story", deliverStory],
  ["deliver-spike", "question", deliverSpike],
  ["research", "question", research],
];

interface Result {
  status?: string;
  next?: string;
}

async function runWith(run: () => Promise<unknown>, args: Record<string, unknown>): Promise<Result> {
  Object.assign(globalThis, { args });
  const r = (await run()) as Result | null;
  return r ?? {};
}

beforeEach(() => {
  calls.length = 0;
  current.script = () => null;
});

describe("an answers argument that is not a map", () => {
  for (const [name, field, run] of WORKFLOWS) {
    for (const [kind, v] of NON_MAPS) {
      test(`${name} rejects answers given as ${kind} before any agent works`, async () => {
        const r = await runWith(run, { [field]: "SMR-1", answers: v });
        assert.equal(r.status, "not-started");
        assert.match(r.next ?? "", /\banswers\b/, "next names the answers argument");
        assert.match(r.next ?? "", /\bmap\b/i, "next says answers must be a map");
        assert.match(r.next ?? "", /\bdecision\b/i, "next says the map is keyed by a decision id");
        assert.deepEqual(
          calls.map((c) => `${c.type}: ${c.label}`),
          [],
          "no agent is dispatched",
        );
      });
    }
  }
});

describe("a missing answers argument", () => {
  for (const [name, field, run] of WORKFLOWS) {
    test(`${name} reads no answers argument as no answers and starts work`, async () => {
      const r = await runWith(run, { [field]: "SMR-1" });
      assert.ok(calls.length > 0, "the workflow starts work");
      assert.doesNotMatch(r.next ?? "", /\banswers\b/, "a missing answers argument is not rejected");
    });

    test(`${name} reads an answers map as answers and starts work`, async () => {
      const r = await runWith(run, { [field]: "SMR-1", answers: { q1: "a" } });
      assert.ok(calls.length > 0, "the workflow starts work");
      assert.doesNotMatch(r.next ?? "", /\banswers\b/, "an answers map is not rejected");
    });
  }
});
