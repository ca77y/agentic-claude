// What every slopify workflow shares: the scout, lens, and advisor schemas and dispatchers, the readers for
// checkpoint values, and the decision and blocked-result helpers.

export const STRINGS = { type: "array", items: { type: "string" } } as const;

const SCOUT_SCHEMA = {
  type: "object",
  required: ["answer", "evidence", "gaps"],
  properties: {
    answer: {
      type: "string",
      description: "The answer to the one question asked, as far as the evidence goes",
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        required: ["source", "location", "excerpt"],
        properties: {
          source: {
            type: "string",
            description: "What it is: a file, command, URL, card, or the checkpoint key the brief names",
          },
          location: {
            type: "string",
            description: "path:line, URL, commit, identifier, or absolute path",
          },
          excerpt: {
            type: "string",
            description: "The supporting passage or output, quoted; for a checkpoint key, its value",
          },
        },
      },
    },
    gaps: {
      ...STRINGS,
      description: "What could not be found or read, and why; a search that could not run is not an absence",
    },
  },
} as const;

export const LENS_SCHEMA = {
  type: "object",
  required: ["verdict", "evaluated", "findings", "limits"],
  properties: {
    verdict: { type: "string", enum: ["pass", "fail", "unverified"] },
    evaluated: { type: "string", description: "The exact revision judged" },
    findings: {
      type: "array",
      items: {
        type: "object",
        required: ["location", "problem", "blocking"],
        properties: {
          location: {
            type: "string",
            description: "path:line or the item judged",
          },
          problem: { type: "string" },
          blocking: { type: "boolean" },
        },
      },
    },
    limits: {
      type: "string",
      description: 'Checks that could not run and the missing prerequisite, or "none"',
    },
  },
} as const;

const ADVISOR_SCHEMA = {
  type: "object",
  required: ["judgement", "reasons", "risks", "conditions"],
  properties: {
    judgement: {
      type: "string",
      enum: ["proceed", "proceed-with-conditions", "reconsider"],
    },
    reasons: {
      type: "array",
      items: {
        type: "object",
        required: ["reason", "evidence"],
        properties: {
          reason: { type: "string" },
          evidence: {
            type: "string",
            description: "The evidence or source it rests on",
          },
        },
      },
    },
    risks: STRINGS,
    conditions: {
      ...STRINGS,
      description: "Conditions under which this judgement changes",
    },
  },
} as const;

export type ScoutResult = Infer<typeof SCOUT_SCHEMA>;
export type LensResult = Infer<typeof LENS_SCHEMA>;
export type AdvisorResult = Infer<typeof ADVISOR_SCHEMA>;
export type Finding = LensResult["findings"][number];

/** Options for a scout, lens, or advisor dispatch; the helper sets the agent type and schema. */
export type FamilyOptions = Omit<AgentOptions, "agentType">;

function familyAgent<const S extends Schema>(
  prefix: string,
  schema: S,
  name: string,
  prompt: string,
  opts?: FamilyOptions,
): Promise<Infer<S> | null> {
  if (!name.startsWith(prefix)) throw new Error(`${name} is not a ${prefix}* agent`);
  return agent(prompt, { ...opts, agentType: `slopify:${name}`, schema });
}
export const scout = (name: string, prompt: string, opts?: FamilyOptions): Promise<ScoutResult | null> =>
  familyAgent("scout-", SCOUT_SCHEMA, name, prompt, opts);
export const lens = (name: string, prompt: string, opts?: FamilyOptions): Promise<LensResult | null> =>
  familyAgent("lens-", LENS_SCHEMA, name, prompt, opts);
export const advise = (name: string, prompt: string, opts?: FamilyOptions): Promise<AdvisorResult | null> =>
  familyAgent("advisor-", ADVISOR_SCHEMA, name, prompt, opts);

// A checkpoint value from scout-checkpoint's evidence, by key; '' when absent.
export function fact(result: ScoutResult | null | undefined, key: string): string {
  const hit = result?.evidence.find((e) => e.source === key);
  return hit ? (hit.excerpt || hit.location || "").trim() : "";
}

// A scout's "no value": empty, or prose that opens with none, absent, missing, n/a, or not found,
// as in "MISSING (test -f found no file)". A token that merely starts with the word, such as
// none.txt or missing/x, is a value. With whole, only a reply that is nothing but that word (and
// an optional parenthetical) is none, so a sentence like "Missing config files produce an error"
// is a value.
export function absent(v: string | null | undefined, whole?: boolean): boolean {
  const t = (v ?? "").trim();
  if (!t) return true;
  const word = String.raw`(?:none|absent|missing|n\/a|not found)`;
  const re = new RegExp(whole ? String.raw`^${word}\s*(?:\([^)]*\))?[.:]?$` : String.raw`^${word}(?![\w/-]|\.\w)`, "i");
  return re.test(t);
}

// A checkpoint value counts only in its expected shape, never as prose. Kinds: path (absolute),
// rel (relative path, never absolute), sha, branch, ref (a PR URL, number, or path), rev (<path>@<hex>), id.
// Returns the value, or '' when it is absent or has another shape. A value followed by a
// parenthetical remark, or by a full stop, is the value. A path may hold any character but a newline.
const SHAPES = {
  path: /^\/(?:[^\n]*[^\s.,;:])?$/,
  rel: /^[\w@.+[\]-][\w@.+()[\]/-]*$/,
  sha: /^[0-9a-f]{7,64}$/i,
  branch: /^\w[\w./-]*$/,
  // eslint-disable-next-line sonarjs/super-linear-regex, sonarjs/regex-complexity, regexp/no-super-linear-backtracking -- matched against one short line from a scout
  ref: /^(?:https?:\/\/\S+|(?:PR ?)?#?\d+|[\w@.+/#-]+(?: ?\d+)?)$/i,
  rev: /^[\w@.+/-]+@[0-9a-f]{7,64}$/i,
  id: /^#?[A-Z0-9][^\s()<>]{0,199}$/i,
} as const;
export type Shape = keyof typeof SHAPES;

const TRAILING_STOP = new Set([".", ",", ";", ":"]);
function unremark(kind: Shape, text: string): string {
  // eslint-disable-next-line sonarjs/super-linear-regex -- matched against one short line from a scout
  const remark = kind === "path" ? /\s+[([][^)\]]*[)\]]$/ : /\s+[([].*$/;
  let t = text;
  let prev: string;
  do {
    prev = t;
    t = t.replace(remark, "");
    while (TRAILING_STOP.has(t.at(-1) ?? "")) t = t.slice(0, -1);
  } while (t !== prev);
  return t;
}
export function shaped(kind: Shape, v: string | null | undefined): string {
  const re = SHAPES[kind];
  const t = ((v ?? "").split("\n", 1)[0] ?? "").trim();
  if (absent(t)) return "";
  // A trailing remark is stripped first. In a path only a parenthetical that ends the value is a remark:
  // one with more path after it belongs to a directory name.
  const tok = unremark(kind, t);
  if (tok && re.test(tok)) return tok;
  return re.test(t) ? t : "";
}

// Whether the revision a validator reports judging is the one its brief named. A label such as
// <sha>+<digest>, <sha>#2, or <shaA>&<shaB> must match whole: every hex component of 7 or more
// characters matches (a short sha matches its full form) and the marks between them ("+", "#2",
// "&") appear too. A brief naming no revision accepts any.
export function sameRev(briefed: string | null | undefined, evaluated: string | null | undefined): boolean {
  const b = (briefed || "").trim().toLowerCase();
  const e = (evaluated || "").trim().toLowerCase();
  if (!b || e.includes(b)) return true;
  const HEX = /(?<![0-9a-z])[0-9a-f]{7,64}(?![0-9a-z])/g;
  const bh = b.match(HEX) ?? [];
  if (bh.length === 0) return false;
  const eh = e.match(HEX) ?? [];
  return (
    bh.every((x) => eh.some((y) => x.startsWith(y) || y.startsWith(x))) &&
    b
      .split(HEX)
      .map((p) => p.trim())
      .filter((p) => p && !/[a-z]{3}/.test(p))
      .every((p) => e.includes(p))
  );
}

// A short deterministic hash of text.
export function hashOf(text: string): string {
  let h = 5381;
  for (const ch of text) h = ((h * 33) ^ (ch.codePointAt(0) ?? 0)) >>> 0;
  return h.toString(36).padStart(6, "0");
}
// A file slug for free text: its first six words plus a hash of all of it, so two ideas that open
// alike never share a file.
export function slugged(text: string | null | undefined, fallback?: string): string {
  const norm = (text || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
  const words = norm.split(" ").filter(Boolean).slice(0, 6).join("-");
  return norm ? `${words}-${hashOf(norm)}` : fallback || "item";
}

export const HASH = "[0-9a-f]{7,64}";
// A path and its git hash-object, written "<path>@<hash>" or "<path> <hash>", on the first line and
// with any trailing remark dropped; null for anything else.
// The path is all the text before the last hash, and must have the path or rel shape.
export function parseSpec(v: string | null | undefined): { path: string; hash: string } | null {
  const m = new RegExp(String.raw`^(.+)(?:@|\s)(${HASH})$`).exec(
    unremark("path", ((v || "").split("\n", 1)[0] ?? "").trim()),
  );
  const path = m?.[1]?.trim() ?? "";
  const hash = m?.[2] ?? "";
  return path && (shaped("path", path) === path || shaped("rel", path) === path) ? { path, hash } : null;
}

/** The answers a user passes to a rerun, by need or decision id. */
export type Answers = Readonly<Record<string, string | number | boolean | null | undefined>>;
export interface Decision {
  id: string;
  question: string;
}
export interface Settled extends Decision {
  answer: string;
}

// An open decision's id comes from its question, so an answer stays with its question whatever else
// a producer asks. The prefix names the producer that raised it.
export function decisionsOf(prefix: string, questions: readonly string[] | null | undefined): Decision[] {
  const out: Decision[] = [];
  const asked = questions ?? [];
  for (const q of asked) {
    const question = q.trim();
    const norm = question
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, " ")
      .trim();
    const id = `${prefix}-${norm.split(" ").slice(0, 4).join("-") || "question"}-${hashOf(norm)}`;
    if (question && out.every((d) => d.id !== id)) out.push({ id, question });
  }
  return out;
}
export function answerOf(answers: Answers | null | undefined, id: string): string {
  const a = answers?.[id];
  return a === undefined || a === null ? "" : String(a).trim();
}
// The settled questions as a brief paragraph: each answer beside its question, for the producer
// that raised it and no other.
export function settledText(settled: readonly Settled[]): string {
  return settled.length > 0
    ? `\n\nThe user has settled these earlier questions; apply each answer and do not ask them again:\n${settled.map((d) => `- Question: ${d.question}\n  Answer: ${d.answer}`).join("\n")}`
    : "";
}

/** A producer result that may raise questions or blockers. */
export interface Questioning {
  openDecisions?: readonly string[];
  storyBlockers?: readonly string[];
}

// Run a producer (run(settled) returns its result, with openDecisions, or null) until it raises
// no question the user has not answered. A question the user answered is put back to the next
// dispatch with its answer. Answers to this prefix that no question matched (a rerun in a new
// session can word a question differently) go back once as well; answers to its blockers are not
// decisions and stay out. Returns the last result and the
// questions still open; the result's own openDecisions are not to be read after this.
export async function settleDecisions<R extends Questioning>(
  prefix: string,
  answers: Answers,
  run: (settled: readonly Settled[]) => Promise<R | null>,
): Promise<{ res: R | null; open: Decision[] }> {
  const settled: Settled[] = [];
  let carriedTried = false;
  for (let round = 0; ; round++) {
    const res = await run(settled);
    if (!res || res.storyBlockers?.length) return { res, open: [] };
    const decisions = decisionsOf(prefix, res.openDecisions);
    const open = decisions.filter((d) => !answerOf(answers, d.id));
    if (open.length > 0) {
      const carried = Object.keys(answers).filter(
        (k) =>
          k.startsWith(`${prefix}-`) &&
          !k.startsWith(`${prefix}-blocker-`) &&
          answerOf(answers, k) &&
          decisions.every((d) => d.id !== k) &&
          settled.every((x) => x.id !== k),
      );
      if (carried.length === 0 || carriedTried || round >= 2) return { res, open };
      carriedTried = true;
      settled.push(
        ...carried.map((k) => ({
          id: k,
          question: `an earlier question whose id was ${k}; its words ran: ${k
            .replace(`${prefix}-`, "")
            .replace(/-[a-z0-9]{6,7}$/, "")
            .replaceAll("-", " ")}`,
          answer: answerOf(answers, k),
        })),
      );
      continue;
    }
    const fresh = decisions.filter((d) => settled.every((x) => x.id !== d.id));
    if (fresh.length === 0 || round >= 2) return { res, open: [] };
    settled.push(...fresh.map((d) => ({ ...d, answer: answerOf(answers, d.id) })));
  }
}

export type NeedKind = "story" | "decision" | "prerequisite" | "validation" | "input";
/** Something a blocked run needs before a rerun can pass the step. `arg` names the arg that answers an input need. */
export interface Need {
  id: string;
  kind: NeedKind;
  what: string;
  evidence: string;
  arg?: string;
}

// How to continue after a block. Resume replays the cached results of unchanged steps, so it
// helps only when every need is a decision; a missing binding or a failing gate needs a fresh
// rerun that reads the repository again. An input need that names an arg (`arg`) is answered in that
// arg, not under answers.
export function rerunText(workflow: string, needs: readonly Need[] | null | undefined): string {
  const cmd = `/slopify:${workflow}`;
  const list = needs ?? [];
  const viaArg = list.filter((n) => n.arg);
  const answerable = list.some((n) => !n.arg && (n.kind === "decision" || n.kind === "input"));
  const argText =
    viaArg.length > 0
      ? ` Give ${viaArg.map((n) => `${n.id} in args.${n.arg ?? ""}`).join(" and ")}, not in answers.`
      : "";
  return list.length > 0 && list.every((n) => n.kind === "decision")
    ? `Invoke ${cmd} again with the same args and add answers.<id> for each decision. In this session, pass resumeFromRunId to reuse the steps already completed.`
    : `Resolve what each need names, then invoke ${cmd} again with the same args${answerable ? " and answers.<id> for each decision or input need" : ""}, without resumeFromRunId, so every step reads the repository afresh.${argText}`;
}

export interface Blocked {
  status: "blocked";
  workflow: string;
  step: string;
  needs: readonly Need[];
  rerun: string;
}
export function blocked(workflow: string, step: string, needs: readonly Need[]): Blocked;
export function blocked<E extends object>(
  workflow: string,
  step: string,
  needs: readonly Need[],
  extra: E,
): Blocked & E;
export function blocked(workflow: string, step: string, needs: readonly Need[], extra: object = {}): Blocked {
  return { status: "blocked", workflow, step, needs, rerun: rerunText(workflow, needs), ...extra };
}
