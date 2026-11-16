// Fails when a dev dependency in package.json isn't pinned to one exact version, so every clone and CI install the
// same tools. An npm alias (`npm:<name>@<version>`) is held to the same rule.
//
// Usage: node scripts/check-pins.ts

import { readFile } from "node:fs/promises";

const EXACT = /^(?:npm:(?:@[\w.-]+\/)?[\w.-]+@)?\d+\.\d+\.\d+(?:-[\w.]+)?$/;

const manifest = JSON.parse(await readFile("package.json", "utf8")) as { devDependencies?: Record<string, string> };
const loose = Object.entries(manifest.devDependencies ?? {}).filter(([, version]) => !EXACT.test(version));

for (const [name, version] of loose) console.error(`package.json: ${name} is "${version}", not an exact version`);
if (loose.length > 0) process.exitCode = 1;
