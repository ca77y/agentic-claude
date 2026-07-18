#!/usr/bin/env python3
"""Enforce dispatch policy for every Agent call.

This hook pins **model only**. The Agent tool's input schema has no `effort`
field, and unknown keys in a hook's `updatedInput` are silently stripped (the
validator drops `unrecognized_keys` from its errors), so injecting effort here
would neither fail loudly nor take effect. Reasoning effort comes from the agent
definition — the `effort:` frontmatter in agents/*.md — which is its only source
of truth.

Claude Code resolves a subagent's model as: CLAUDE_CODE_SUBAGENT_MODEL, then the
per-invocation `model` parameter, then the agent's `model` frontmatter, then the
main conversation's model. Nesting resolves against the *main conversation*, not
the dispatching agent, so an agent with no `model:` frontmatter that gets
delegated to inherits the session model — usually opus. This hook writes the
per-invocation parameter so the resolution never falls through to that default.

Policy:
  general-purpose  denied — the caller does the work itself, or dispatches one of
                   the named agents its own prompt specifies.
  Explore          pinned to haiku. Explore stopped defaulting to Haiku in
                   v2.1.198 and now inherits the session model.
  known agent      forced to its ROSTER model, independent of the caller.
  anything else    passes through untouched.

ROSTER mirrors the `model:` frontmatter in agents/*.md; keep the two in sync.
Frontmatter wins if they ever disagree, since it is what applies when hooks are
disabled.
"""

import json
import sys

ROSTER = {
    "lead": "opus",
    "analyst": "opus",
    "researcher": "opus",
    "writer": "opus",
    "qa": "opus",
    "reviewer": "opus",
    "coder": "sonnet",
    "auditor": "sonnet",
    "clerk": "sonnet",
    "librarian": "sonnet",
    "scribe": "haiku",
    # Built-in, so it has no frontmatter of ours to fall back on.
    "Explore": "haiku",
}

DENIED = {
    "general-purpose": (
        "general-purpose is not available to this pipeline. Do the work yourself "
        "with Read/Grep/Glob, use Explore for read-only search, or dispatch one of "
        "the named agents your own prompt specifies."
    ),
}


def emit(payload):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", **payload}}))
    sys.exit(0)


def main():
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    tool_input = event.get("tool_input") or {}
    requested = tool_input.get("subagent_type")
    if not isinstance(requested, str):
        sys.exit(0)

    # Agents may be addressed bare or plugin-scoped ("ca77y-engineering:coder").
    name = requested.split(":")[-1]

    if name in DENIED:
        emit({"permissionDecision": "deny", "permissionDecisionReason": DENIED[name]})

    model = ROSTER.get(name)
    if model is None:
        sys.exit(0)

    if tool_input.get("model") == model:
        sys.exit(0)

    # updatedInput replaces the whole input object, so carry every other field over.
    emit(
        {
            "permissionDecision": "allow",
            "permissionDecisionReason": f"{name} pinned to {model} by ca77y-engineering dispatch policy",
            "updatedInput": {**tool_input, "model": model},
        }
    )


if __name__ == "__main__":
    main()
