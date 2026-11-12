// Text helpers the workflows share.
/** The text without any trailing run of the given characters. */
export function withoutTrailing(text: string, chars: string): string {
  let t = text;
  while (t.length > 0 && chars.includes(t.slice(-1))) t = t.slice(0, -1);
  return t;
}
