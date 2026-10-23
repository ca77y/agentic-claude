// Globals the Workflow runtime gives a script. It has no Node or browser APIs, and Date.now(), argless new Date(),
// and Math.random() throw there, because they would break resume.

declare global {
  /** The JSON Schema subset workflows use for agent output, written `as const` so its result type can be inferred. */
  type Schema =
    | { readonly type: "string"; readonly enum?: readonly string[]; readonly description?: string }
    | { readonly type: "boolean" | "number" | "integer"; readonly description?: string }
    | { readonly type: "array"; readonly items: Schema; readonly description?: string }
    | {
        readonly type: "object";
        readonly properties: Readonly<Record<string, Schema>>;
        readonly required?: readonly string[];
        readonly description?: string;
      };

  /** The value an agent returns for schema S. */
  type Infer<S> = S extends { enum: readonly (infer E)[] }
    ? E
    : S extends { type: "string" }
      ? string
      : S extends { type: "boolean" }
        ? boolean
        : S extends { type: "number" | "integer" }
          ? number
          : S extends { type: "array"; items: infer I }
            ? Infer<I>[]
            : S extends { type: "object"; properties: infer P }
              ? InferObject<P, S extends { required: readonly (infer R)[] } ? R : never>
              : never;
  type InferObject<P, R> = {
    -readonly [K in keyof P as K extends R ? K : never]: Infer<P[K]>;
  } & {
    -readonly [K in keyof P as K extends R ? never : K]?: Infer<P[K]>;
  } extends infer O
    ? { [K in keyof O]: O[K] }
    : never;

  /** A workflow's `export const meta`: a pure literal the runtime reads before it runs the script. */
  interface WorkflowMeta {
    readonly name: string;
    readonly description: string;
    readonly whenToUse?: string;
    readonly phases?: readonly { readonly title: string; readonly detail?: string }[];
  }

  /** Agent options a workflow may set. Model and effort come from the agent's frontmatter, so they are absent here. */
  interface AgentOptions {
    label?: string;
    phase?: string;
    agentType?: string;
    isolation?: "worktree";
  }

  /** Dispatch a subagent. With a schema it returns the validated object; null when the agent was skipped or died. */
  function agent<const S extends Schema>(prompt: string, opts: AgentOptions & { schema: S }): Promise<Infer<S> | null>;
  function agent(prompt: string, opts?: AgentOptions): Promise<string | null>;

  /** Run thunks concurrently and wait for all; a thunk that throws yields null. A tuple of thunks gives a tuple of results. */
  function parallel<const T extends readonly (() => Promise<unknown>)[]>(
    thunks: T,
  ): Promise<{ -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> | null }>;

  function phase(title: string): void;
  function log(message: string): void;

  /**
   * Run another workflow inline, one level deep, and return what it returns. The runtime does not check the child's
   * result, so T is the caller's promise about it: name the child's exported result type.
   */
  function workflow<T = unknown>(nameOrRef: string | { scriptPath: string }, args?: unknown): Promise<T>;

  /** The Workflow tool's args input, verbatim. */
  const args: unknown;
}

export {};
