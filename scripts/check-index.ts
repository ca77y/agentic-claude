// Fails when a library index line doesn't carry its note's frontmatter title and summary word for word, or names a note
// that doesn't exist. The index is what most readers see of a note, so it must say exactly what the note's summary says.
//
// Usage: node scripts/check-index.ts

import { readFile } from "node:fs/promises";

const INDEX = "library/_meta/index.md";
const LINE = /^- \[\[([^\]|]+)\|([^\]]+)\]\] — (.*) \(updated \d{4}-\d{2}-\d{2}\)$/;

// A frontmatter value, unquoted; '' when the key is absent.
function field(text: string, key: string): string {
  const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
  const raw = new RegExp(String.raw`^${key}:\s*(.*)$`, "m").exec(front)?.[1]?.trim() ?? "";
  return /^(["']).*\1$/.test(raw) ? raw.slice(1, -1) : raw;
}

async function noteText(path: string): Promise<string | null> {
  try {
    return await readFile(`${path}.md`, "utf8");
  } catch {
    return null;
  }
}

const problems: string[] = [];
const index = await readFile(INDEX, "utf8");
const lines = index.split("\n");
for (const [i, line] of lines.entries()) {
  const m = LINE.exec(line);
  if (!m) continue;
  const [, path = "", title = "", summary = ""] = m;
  const at = `${INDEX}:${String(i + 1)}`;
  const text = await noteText(path);
  if (text === null) {
    problems.push(`${at}: ${path} doesn't exist`);
    continue;
  }
  if (title !== field(text, "title"))
    problems.push(`${at}: the title isn't ${path}'s title, "${field(text, "title")}"`);
  if (summary !== field(text, "summary")) problems.push(`${at}: the summary isn't ${path}'s summary word for word`);
}

for (const p of problems) console.error(p);
if (problems.length > 0) process.exitCode = 1;
