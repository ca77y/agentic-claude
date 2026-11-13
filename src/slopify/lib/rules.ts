// The fixed tables of a delivery: what happens to each ruled problem, when a loop ends, what runs in parallel, and the
// PR description. Agents report what they found; these functions decide what runs next.

export const MAX_FIX_ROUNDS = 3;
export const MAX_INNER_TRIES = 3;
export const MAX_DESIGN_TRIES = 2;
export const MAX_CHALLENGE_ROUNDS = 3;
const DELIVERABLE_LABEL = "Deliverable";

export type Severity = "blocker" | "major" | "minor" | "nit" | "pre-existing" | "none";
type Kind = "code" | "test" | "docs" | "spec" | "cannot-verify" | "decision";
type Verdict = "confirmed" | "dismissed" | "unverified";
type Ruling = "none" | "fix-differently" | "accept-as-debt" | "split-to-issue" | "escalate";

export interface Ruled {
  verdict: Verdict;
  severity: Severity;
  kind: Kind;
  ruling: Ruling;
}

export type Route =
  | "dismiss"
  | "unverified"
  | "suggestion"
  | "new-issue"
  | "not-validated"
  | "needs-confirmation"
  | "coder"
  | "correct-test"
  | "writer"
  | "revise-spec"
  | "known-debt"
  | "split-issue"
  | "escalate";

const isBlocking = (r: Ruled): boolean => r.severity === "blocker" || r.severity === "major";

// What the script does with one ruling. priorFixes counts the attempts already made on this problem's fingerprint, and
// differentlyUsed says whether it already had its one fix-differently.
export function routeOf(r: Ruled, priorFixes: number, differentlyUsed: boolean, hasSpec: boolean): Route {
  if (r.verdict === "dismissed") return "dismiss";
  if (r.verdict === "unverified") return "unverified";
  if (r.kind === "cannot-verify") return "not-validated";
  if (r.kind === "decision") return "needs-confirmation";
  if (r.severity === "pre-existing") return "new-issue";
  if (!isBlocking(r)) return "suggestion";
  if (priorFixes > 0) {
    const recurring = recurrenceRoute(r, differentlyUsed);
    if (recurring) return recurring;
  }
  if (r.kind === "docs") return "writer";
  if (r.kind === "test") return "correct-test";
  return r.kind === "spec" && hasSpec ? "revise-spec" : "coder";
}

function recurrenceRoute(r: Ruled, differentlyUsed: boolean): Route | null {
  // A blocker is fixed or left open: only a major can be closed for this PR.
  if (r.ruling === "accept-as-debt") return r.severity === "major" ? "known-debt" : "escalate";
  if (r.ruling === "split-to-issue") return r.severity === "major" ? "split-issue" : "escalate";
  if (r.ruling === "fix-differently") return differentlyUsed ? "escalate" : null;
  return "escalate";
}

export const FIX_ROUTES: readonly Route[] = ["coder", "correct-test", "writer", "revise-spec"];

export interface GateInput {
  prOpen: boolean;
  reviewClean: boolean;
  open: number;
  held: number;
}
export type GateResult = "clean" | "held" | "fix";

// A criterion TESTING.md holds back can't be changed by more code, so it ends the loop instead of starting a round.
export function gate(s: GateInput): GateResult {
  if (!s.prOpen || !s.reviewClean || s.open > 0) return "fix";
  return s.held > 0 ? "held" : "clean";
}

// The open count didn't fall over two rounds in a row.
export function noProgress(openByRound: readonly number[]): boolean {
  const [a, b, c] = openByRound.slice(-3);
  return a !== undefined && b !== undefined && c !== undefined && b >= a && c >= b;
}

// Only the literal word lets a criterion pass; anything else, including no statement, keeps the PR a draft.
export const allowsReady = (setting: string | null | undefined): boolean => setting?.trim() === "ready";

export function isDeliverable(labels: string): boolean {
  return labels
    .split(/[,\n]/)
    .map((l) => l.trim())
    .includes(DELIVERABLE_LABEL);
}

export interface Parallelizable {
  id: string;
  dependsOn: readonly string[];
  files: readonly string[];
}

const samePath = (a: string, b: string): boolean => a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
const filesOverlap = (x: Parallelizable, y: Parallelizable): boolean =>
  x.files.some((a) => y.files.some((b) => samePath(a, b)));

// Groups that run one after another; the tasks inside a group run in parallel. A task waits for its dependencies, and
// for any earlier task in its wave whose files overlap with its own.
export function waves<T extends Parallelizable>(tasks: readonly T[]): T[][] {
  const out: T[][] = [];
  const finished = new Set<string>();
  let left = [...tasks];
  while (left.length > 0) {
    const ready = left.filter((t) => t.dependsOn.every((d) => finished.has(d)));
    // A dependency cycle or an unknown id can't be waited out, so the rest runs in spec order.
    const pool = ready.length > 0 ? ready : left;
    const group: T[] = [];
    for (const t of pool) {
      if (group.every((g) => !filesOverlap(g, t))) group.push(t);
    }
    out.push(group);
    for (const t of group) finished.add(t.id);
    left = left.filter((t) => !group.includes(t));
  }
  return out;
}

export interface CriterionRow {
  id: string;
  wording: string;
  category: string;
  path: string;
  result: string;
  evidence: readonly string[];
}
export interface Listed {
  text: string;
  detail?: string;
}
export interface PrBody {
  issue: string;
  specDir: string;
  /** The documents a spike or a research run adds. */
  documents?: readonly string[];
  draftReasons: readonly Listed[];
  needsConfirmation: readonly Listed[];
  /** Irreversible steps nothing explicitly permits, left for a person to do. */
  manualActions: readonly string[];
  /** A bug's reproduction, as it behaved before the fix; the criteria table shows it after. */
  reproduced?: readonly Listed[];
  criteria: readonly CriterionRow[];
  assumptions: readonly string[];
  unverified: readonly Listed[];
  notValidated: readonly Listed[];
  knownDebt: readonly Listed[];
  suggestions: readonly Listed[];
  testChanges: readonly string[];
}

const items = (list: readonly Listed[]): string =>
  list.map((x) => `- ${x.text}${x.detail ? `\n  ${x.detail}` : ""}`).join("\n");
const cell = (s: string): string => s.replaceAll("|", String.raw`\|`).replaceAll("\n", " ");
const section = (title: string, body: string): string => (body ? `## ${title}\n\n${body}` : "");

function criteriaTable(rows: readonly CriterionRow[]): string {
  if (rows.length === 0) return "";
  const lines = rows.map(
    (c) =>
      `| ${cell(c.wording)} | ${cell(c.category)} | ${cell(c.path)} | ${cell(c.result)} | ${cell(c.evidence.join(", "))} |`,
  );
  return [
    "| Criterion | Category | Validation path | Result | Evidence |",
    "| --- | --- | --- | --- | --- |",
    ...lines,
  ].join("\n");
}

// The PR description, rendered from the run state and written again after every round.
export function renderBody(b: PrBody): string {
  return [
    `Issue: ${b.issue}${b.specDir ? `\n\nSpec: \`${b.specDir}\`` : ""}${b.documents?.length ? `\n\nFindings: ${b.documents.map((p) => `\`${p}\``).join(", ")}` : ""}`,
    section("Why this is a draft", items(b.draftReasons)),
    section("Needs confirmation", items(b.needsConfirmation)),
    section("Manual actions", b.manualActions.map((a) => `- ${a}`).join("\n")),
    section("Reproduced", items(b.reproduced ?? [])),
    section("Criteria", criteriaTable(b.criteria)),
    section("Assumptions", b.assumptions.map((a) => `- ${a}`).join("\n")),
    section("Unverified findings", items(b.unverified)),
    section("Not validated", items(b.notValidated)),
    section("Known debt", items(b.knownDebt)),
    section("Suggestions", items(b.suggestions)),
    section("Test changes", b.testChanges.map((t) => `- ${t}`).join("\n")),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export interface Reproduction {
  steps: string[];
  observed: string;
}

// One ledger line, so the evidence a PR shows survives a rerun that keeps the reproduction instead of building it again.
export const reproductionLine = (r: Reproduction): string => `reproduced ${JSON.stringify(r)}`;

const isReproduction = (v: unknown): v is Reproduction =>
  typeof v === "object" && v !== null && "steps" in v && Array.isArray(v.steps) && "observed" in v;

export function parseReproduction(line: string): Reproduction | null {
  const at = line.indexOf("{");
  if (at === -1) return null;
  try {
    const v: unknown = JSON.parse(line.slice(at));
    return isReproduction(v) ? v : null;
  } catch {
    return null;
  }
}
