PLUGINS ?= $(wildcard plugins/*/)

.PHONY: install build check format test

# Once per clone: dev tools and the pre-commit hook.
install:
	npm ci
	git config core.hooksPath .githooks

# Bundle src/<plugin>/workflows/*.ts into plugins/<plugin>/workflows/*.js.
build:
	npm run --silent build

# Every fast check, on the whole repo: what the pre-commit hook and CI run.
check:
	npm run --silent build:check
	npm run --silent typecheck
	npm run --silent lint:ts
	npm run --silent lint:md
	npm run --silent lint:format
	npm run --silent lint:dead
	npm run --silent lint:dup
	npm run --silent lint:types
	npm run --silent test:unit
	claude plugin validate --strict .
	for p in $(PLUGINS); do claude plugin validate --strict "$$p" || exit 1; done

format:
	npx --no-install prettier --write .

# Evals call models and take long: run them by hand.
# Smoke workflows can outlast a headless session's wait for background work, so that ceiling is lifted.
test:
	for p in $(PLUGINS); do \
	  claude plugin eval "$$p" --tag trigger --runs 1 --allow-tools Workflow --ablation none --trust-plugin || exit 1; \
	  CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 claude plugin eval "$$p" --tag smoke --allow-tools Bash Write Edit Agent Workflow --scaffold --ablation none --trust-plugin || exit 1; \
	done
