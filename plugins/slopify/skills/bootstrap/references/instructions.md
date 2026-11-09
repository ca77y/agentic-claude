# Agent instructions and rules

The rest of the plugin takes what this skill sets up as ground truth and checks none of it, so anything an agent must know has to be stated here. Work only inside the repository, and assume whatever sits above it is correct.

## Root instructions

The root `AGENTS.md` or `CLAUDE.md` names where the architecture, design, and product documents live, so a designer or advisor can read them in full. Give it the project's global rules.

## Rules

`.claude/rules/` holds the rules agents must follow, each file scoped with `paths`:

- one file per file type the project has, for what to do when editing that type, proposed from the repository's conventions;
- `architecture.md`, from [the architecture rule template](../resources/architecture-rule.md), scoped to all source code.

`architecture.md` holds about 30 to 50 lines of principles that hold for any change, and links to the full design documents. State each principle only there, and have the design documents link to it. Ask the user for explicit no-gos and hard rules, and state them there or in the root instructions. Anything a linter can enforce should also be a lint rule; report any that isn't.

## AGENTS.md

Offer to convert the repository's `CLAUDE.md` files to `AGENTS.md`, because other tools read it too. Convert only when the user agrees, and convert the root file and every folder's file together. The root file can't stay as `CLAUDE.md`, because Claude Code then ignores `AGENTS.md`. Update what links to the old names.

## Testing harness

A broken target branch is a project problem, and no delivery looks for one. Check that CI runs the `Checks` commands and the project's flows on the target branch. Report anything that doesn't run there as a gap for the user, and propose how to close it.
