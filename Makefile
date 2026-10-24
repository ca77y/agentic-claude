PLUGINS ?= $(wildcard plugins/*/)

.PHONY: install build check format test smoke-test

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

# The unit tests: no models, no network.
test:
	npm run --silent test:unit

# The smoke evals call models and take long: run them only on request, four cases at a time.
# Smoke workflows can outlast a headless session's wait for background work, so that ceiling is lifted.
smoke-test:
	for p in $(PLUGINS); do \
	  CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 claude plugin eval "$$p" --tag smoke -j 4 --allow-tools Bash Write Edit Agent Workflow --scaffold --ablation none --trust-plugin || exit 1; \
	done
