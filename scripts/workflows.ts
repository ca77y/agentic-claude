// Where workflow sources live and where their builds go: src/<plugin>/workflows/<name>.ts builds into
// plugins/<plugin>/workflows/<name>.js.
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
