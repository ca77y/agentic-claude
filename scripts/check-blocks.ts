// Fails when a library citation can't resolve to one block: a raw note defines a block ID twice or ends a line with more
// than one, or a page cites a block its raw note doesn't define. An ID in the middle of a line is a mention, not a block.
//
// Usage: node scripts/check-blocks.ts

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ID = String.raw`\^[\w-]+`;
const TRAILING = new RegExp(String.raw`\s(${ID})\s*$`);
const STACKED = new RegExp(String.raw`\s${ID}\s+${ID}\s*$`);
const CITATION = new RegExp(String.raw`\[\[(library/raw/[^\]#|]+)#(${ID})`, "g");

async function markdownUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => path.join(e.parentPath, e.name));
}

// Fenced code shows syntax rather than defining blocks, so its lines are skipped.
function proseLines(text: string): [number, string][] {
  let fenced = false;
  return text.split("\n").flatMap((line, i): [number, string][] => {
    if (line.trimStart().startsWith("```")) fenced = !fenced;
    return fenced ? [] : [[i + 1, line]];
  });
}

const problems: string[] = [];
const defined = new Map<string, Set<string>>();

const notes = await markdownUnder("library/raw");
for (const note of notes) {
  const ids = new Set<string>();
  const lines = proseLines(await readFile(note, "utf8"));
  for (const [n, line] of lines) {
    const id = TRAILING.exec(line)?.[1];
    if (id && ids.has(id)) problems.push(`${note}:${String(n)}: block ID ${id} is defined twice`);
    if (id) ids.add(id);
    if (STACKED.test(line)) problems.push(`${note}:${String(n)}: the line ends with more than one block ID`);
  }
  defined.set(note.replace(/\.md$/, ""), ids);
}

const pages = await markdownUnder("library");
for (const page of pages) {
  const lines = proseLines(await readFile(page, "utf8"));
  for (const [n, line] of lines) {
    for (const [, note = "", id = ""] of line.matchAll(CITATION)) {
      if (!defined.get(note)?.has(id)) problems.push(`${page}:${String(n)}: cites ${note}#${id}, which isn't defined`);
    }
  }
}

for (const p of problems) console.error(p);
if (problems.length > 0) process.exitCode = 1;
