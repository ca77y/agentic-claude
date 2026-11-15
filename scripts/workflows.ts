// Where workflow sources live and where their builds go: src/<plugin>/workflows/<name>.ts builds into
// plugins/<plugin>/workflows/<name>.js, and a skill's script src/<plugin>/skills/<skill>/main.ts builds into
// plugins/<plugin>/skills/<skill>/scripts/<skill>.js.
import { readdir } from "node:fs/promises";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "..");

export interface WorkflowFile {
  plugin: string;
  name: string;
  source: string;
  target: string;
}

async function listDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

export async function workflowFiles(): Promise<WorkflowFile[]> {
  const entries = await readdir(path.join(root, "src"), { withFileTypes: true });
  const plugins = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const files: WorkflowFile[] = [];
  for (const plugin of plugins) {
    const dir = path.join(root, "src", plugin, "workflows");
    const names = await listDir(dir);
    for (const file of names) {
      if (!file.endsWith(".ts")) continue;
      const name = path.basename(file, ".ts");
      files.push({
        plugin,
        name,
        source: path.join(dir, file),
        target: path.join(root, "plugins", plugin, "workflows", `${name}.js`),
      });
    }
  }
  return files.toSorted((a, b) => a.source.localeCompare(b.source));
}

/** Each skill script: a Node program the skill runs, bundled into the skill's scripts/ folder. */
export async function skillScripts(): Promise<WorkflowFile[]> {
  const entries = await readdir(path.join(root, "src"), { withFileTypes: true });
  const plugins = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const files: WorkflowFile[] = [];
  for (const plugin of plugins) {
    const dir = path.join(root, "src", plugin, "skills");
    const skills = await listDir(dir);
    for (const skill of skills) {
      const names = await listDir(path.join(dir, skill));
      if (!names.includes("main.ts")) continue;
      files.push({
        plugin,
        name: skill,
        source: path.join(dir, skill, "main.ts"),
        target: path.join(root, "plugins", plugin, "skills", skill, "scripts", `${skill}.js`),
      });
    }
  }
  return files.toSorted((a, b) => a.source.localeCompare(b.source));
}
