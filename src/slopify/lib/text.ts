// Text helpers the workflows share: trimming runs of characters, slugs, and evidence as brief text.
import type { ScoutResult } from "./family.ts";

/** The text without any leading run of the given characters. */
function withoutLeading(text: string, chars: string): string {
  let t = text;
  while (t.length > 0 && chars.includes(t.charAt(0))) t = t.slice(1);
  return t;
}

/** The text without any trailing run of the given characters. */
export function withoutTrailing(text: string, chars: string): string {
  let t = text;
  while (t.length > 0 && chars.includes(t.slice(-1))) t = t.slice(0, -1);
  return t;
}

/** Lower-case words joined by single hyphens. */
export function slugify(text: string): string {
  return withoutTrailing(withoutLeading(text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"), "-"), "-");
}

/** Items as a bullet list, or "- none". */
export const bullets = (items: readonly string[]): string =>
  items.length > 0 ? items.map((x) => `- ${x}`).join("\n") : "- none";

/** A scout result as brief text. A scout that did not return is a gap, not an absence; missing says so. */
export function show(
  label: string,
  r: ScoutResult | null | undefined,
  missing = "The scout did not return: treat this as a gap, not an absence.",
): string {
  if (!r) return `### ${label}\n${missing}`;
  const ev = bullets(r.evidence.map((e) => `${e.source} (${e.location}): ${e.excerpt}`));
  return `### ${label}\n${r.answer}\nEvidence:\n${ev}\nGaps:\n${bullets(r.gaps)}`;
}
