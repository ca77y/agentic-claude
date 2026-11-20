// A fake Linear board for SMR-372. It rewrites card text on save as Linear does: it links card identifiers in any case,
// turns a bare domain into a link, saves `-` bullets as `*`, and wraps bare URLs in `<…>`.
// Its pusher keeps to pusher's contract (agents/pusher.md, references/pusher-board.md, the pusher schema): it updates a
// card the brief names, searches the board truthfully when the brief asks it to, and otherwise creates a card. It reads
// back each write, and a difference counts as tolerated only when its instructions (the brief, pusher-board.md, or
// docs/BOARD.md) declare that kind of rewrite harmless. Any other difference is a failed card write: done false, listed
// in unmet, with the card still reported as an operation because it exists.
import { readFileSync } from "node:fs";

import type { Script } from "./harness.ts";

export interface Card {
  id: string;
  body: string;
  writes: number;
}
export const board: Card[] = [];
/** Each pusher brief sentence that asked for a duplicate mark. */
export const duplicateMarks: string[] = [];
const ids = { next: 371 };

export function clearBoard(): void {
  board.length = 0;
  duplicateMarks.length = 0;
  ids.next = 371;
}

const ID = /\b([a-z]{2,5})-(\d+)\b/gi;
// Each rewrite, in the order Linear applies it, with the words an instruction uses to declare it harmless.
const REWRITES: [RegExp, (t: string) => string][] = [
  [/bullet/i, (t) => t.replaceAll(/^- /gm, "* ")],
  [/bare URL/i, (t) => t.replaceAll(/(?<![<(])(https?:\/\/[^\s>)]+)/g, "<$1>")],
  [/domain/i, (t) => t.replaceAll(/(?<![\w/.<[-])([a-z][\w-]*\.(?:icu|com|io))\b/gi, "[$1](<http://$1>)")],
  [
    /identifier|mention/i,
    (t) =>
      t.replaceAll(ID, (_m, k: string, n: string) => {
        const id = `${k.toUpperCase()}-${n}`;
        return `<issue id="uuid-${id}" label="${id}" href="https://linear.app/ca77y/issue/${id}/t" />`;
      }),
  ],
];
export function linearSave(t: string): string {
  let saved = t;
  for (const [, rewrite] of REWRITES) saved = rewrite(saved);
  return saved;
}

// The card's own words, which Linear leaves alone, are what makes a card hold a text.
export const holds = (body: string, text: string): boolean =>
  text
    .replaceAll(ID, "")
    .split(/\W+/)
    .filter((w) => w.length > 4)
    .every((w) => body.includes(w));

const read = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const FENCED = /<<<(\w+)\n([\s\S]*?)\n\1>>>/g;
export const HIDDEN = /<!--[\s\S]*?-->/g;
const HARMLESS = /\b(?:not|no|isn't) (?:a )?(?:content change|failed write)\b/i;
const sentencesOf = (t: string): string[] => t.split(/(?<=\.)\s+|\n+/);

/** A pusher on the fake board. draft gives the card text when the brief points at a draft file rather than fencing it. */
export function linearPusher(draft: (prompt: string) => string = () => ""): Script {
  return (_t, _l, prompt) => {
    const own = sentencesOf(prompt.replaceAll(FENCED, "").replaceAll(HIDDEN, ""));
    duplicateMarks.push(...own.filter((s) => /duplicate/i.test(s)));
    const named = /\b(?:update|write (?:it )?to|use) (?:the )?card ([A-Z]+-\d+)/i.exec(own.join(" "))?.[1];
    const searches = own.some(
      (s) => /\b(?:search|find|look (?:up|for))\b/i.test(s) && /card/i.test(s) && !/\b(?:never|not|don't)\b/i.test(s),
    );
    const instructions = sentencesOf(
      [prompt, read("plugins/slopify/references/pusher-board.md"), read("docs/BOARD.md")].join("\n"),
    );
    const declared = (kind: RegExp, line = false): boolean =>
      instructions.some((s) => kind.test(s) && HARMLESS.test(s) && line === /that line|marker/i.test(s));

    // Each fenced text is one card, ending with the hidden line written before it; with none, the brief's draft is.
    const markerBefore = (at: number): string => prompt.slice(0, at).match(HIDDEN)?.at(-1) ?? "";
    const fenced = Array.from(prompt.matchAll(FENCED), (m) => ({ text: m[2] ?? "", marker: markerBefore(m.index) }));
    const writes = fenced.length > 0 ? fenced : [{ text: draft(prompt), marker: markerBefore(prompt.length) }];

    const unmet: string[] = [];
    const operations = writes.map(({ text, marker }) => {
      const found = searches
        ? board.find((c) => holds(c.body, text) || c.body.includes(marker) || c.body.includes(linearSave(marker)))
        : undefined;
      let card = named ? board.find((c) => c.id === named) : found;
      if (!card) {
        card = { id: named ?? `SMR-${String(ids.next++)}`, body: "", writes: 0 };
        board.push(card);
      }
      const sent = `${text}\n\n${marker}`.trimEnd();
      card.body = linearSave(sent);
      card.writes += 1;
      const stored = card.body.split("\n");
      const failed = sent.split("\n").filter((line, i) => {
        if (line === marker && declared(/./, true)) return false;
        let cur = line;
        return (
          REWRITES.some(([kind, r]) => {
            const was = cur;
            cur = r(cur);
            return cur !== was && !declared(kind);
          }) || stored[i] !== cur
        );
      });
      if (failed.length > 0)
        unmet.push(`card ${card.id}: read back differs from what was written: ${failed.join(" | ")}`);
      return { op: "card", result: "written", reference: card.id, link: `https://linear.app/ca77y/issue/${card.id}` };
    });
    return { done: unmet.length === 0, unmet, operations, hookRejection: "" };
  };
}
