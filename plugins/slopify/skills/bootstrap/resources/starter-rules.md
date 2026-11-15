# Starter rules

Rules to offer the user. Each accepted rule is written once into the project's matching rule file in `.claude/rules/`, merged into an existing file of that scope or into a new one with these `paths`.

## Code

```yaml
paths:
{{SOURCE_GLOBS}}
```

- Name things so the code explains itself. Write a comment only when it can't, and then say why the code is the way it is; never record history or review rounds.
- Don't copy logic; extract what two places share. {{DUPLICATION_CHECK}}

## Docs

```yaml
paths:
{{DOCS_GLOBS}}
```

- State each rule and each fact once, in the file it belongs to, and link to it from anywhere else.
- Describe the system as it is now. Remove a stale section or diagram rather than letting it drift, and record no history.
- Docs explain; they never enforce. A rule for agents belongs in `.claude/rules/` or the root instructions.
- READMEs are for humans. Never put a rule for agents in one, and never point an instruction at one.
- A decision belongs in the product or design docs. `library/` holds the research behind it, never the decision itself.

## Tests

```yaml
paths:
{{TEST_GLOBS}}
```

- Mock at the boundary the project owns, not internals or SDK transports. Automated tests never call a real external service, such as a model, an auth provider, or a third-party API; they use deterministic fixtures.
- Add the smallest test that fails if the behavior regresses, and test what is observable through public interfaces.
