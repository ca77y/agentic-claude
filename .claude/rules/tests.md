---
paths:
  - "test/**/*.ts"
---

# Tests

- Mock at the boundary the project owns, not internals or SDK transports. Automated tests never call a real external service, such as a model, Linear, or GitHub; they use deterministic fixtures.
- Add the smallest test that fails if the behavior regresses, and test what is observable through public interfaces.
