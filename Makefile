PLUGINS ?= $(wildcard plugins/*/)

.PHONY: install build lint check format test smoke

# Once per clone: dev tools and the pre-commit hook.
install:
	npm ci
	git config core.hooksPath .githooks

# Bundle src/<plugin>/workflows/*.ts into plugins/<plugin>/workflows/*.js.
build:
	npm run --silent build

# Every fast check except the unit tests, on the whole repo: what the pre-commit hook runs. The hook leaves the tests
# out so a delivery can commit a failing test before its fix.
lint:
	npm run --silent build:check
	npm run --silent typecheck
	npm run --silent lint:ts
	npm run --silent lint:md
	npm run --silent lint:format
	npm run --silent lint:dead
	npm run --silent lint:dup
	npm run --silent lint:pins
	npm run --silent lint:blocks
	npm run --silent lint:index
	npm run --silent lint:types
	claude plugin validate --strict .
	for p in $(PLUGINS); do claude plugin validate --strict "$$p" || exit 1; done

# Every fast check and the unit tests: what CI runs.
check: lint test

format:
	npx --no-install prettier --write .

# The unit tests: no models, no network.
test:
	npm run --silent test:unit

# The smoke evals call models, so run them only on request. Each case checks that its workflow starts and reaches
# its first milestones within ten minutes, and all cases run at once, so the whole run takes about ten minutes.
# Smoke workflows can outlast a headless session's wait for background work, so that ceiling is lifted.
smoke:
	for p in $(PLUGINS); do \
	  CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 claude plugin eval "$$p" --tag smoke -j 6 --allow-tools Bash Write Edit Agent Workflow --scaffold --ablation none --trust-plugin || exit 1; \
	done
