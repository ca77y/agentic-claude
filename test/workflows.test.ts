// Checks every built workflow against what the Workflow runtime requires of a script.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { workflowFiles } from "../scripts/workflows.ts";

interface Meta {
  name: string;
  description: string;
  phases?: { title: string }[];
}

function metaOf(built: string): Meta | null {
  const head = "export const meta = ";
  if (!built.startsWith(head)) return null;
  const end = built.indexOf("\n};\n");
  return end === -1 ? null : (JSON.parse(built.slice(head.length, end + 2)) as Meta);
}

type AsyncFunctionConstructor = new (...params: string[]) => unknown;
const asyncPrototype = Object.getPrototypeOf(async function () {
  await Promise.resolve();
}) as { constructor: AsyncFunctionConstructor };
const AsyncFunction = asyncPrototype.constructor;

const files = await workflowFiles();
for (const file of files) {
  const source = await readFile(file.source, "utf8");
  const built = await readFile(file.target, "utf8");

  test(`${file.name}: starts with a pure-literal meta naming the workflow`, () => {
    const meta = metaOf(built);
    assert.ok(meta, "the script must begin with export const meta = {...};");
    assert.equal(meta.name, file.name);
    assert.ok(meta.description);
  });

  test(`${file.name}: parses as the async function body the runtime runs`, () => {
    const body = built.replace(/^export const meta =/, "const meta =");
    assert.doesNotThrow(() => new AsyncFunction("args", "agent", "parallel", "phase", "log", "workflow", body));
    assert.doesNotMatch(body, /^(?:import|export)\b/m, "a built workflow imports and exports nothing");
  });

  test(`${file.name}: avoids the calls the runtime forbids`, () => {
    assert.doesNotMatch(built, /\bDate\.now\(|\bMath\.random\(|\bnew Date\(\)/);
  });

  test(`${file.name}: every literal phase title is declared in meta.phases`, () => {
    const declared = new Set((metaOf(built)?.phases ?? []).map((p) => p.title));
    const used = Array.from(source.matchAll(/\bphase(?:\(|: )(["'])([^"'\n]+)\1/g), (m) => m[2] ?? "");
    for (const title of used) assert.ok(declared.has(title), `phase "${title}" is not in meta.phases`);
  });
}
