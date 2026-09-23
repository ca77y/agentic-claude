# Behavior and regression evidence

Inspect the validated requirements, candidate diff, relevant callers, and test coverage. Run available focused tests and repository-required checks that establish the acceptance criteria. Group related checks for this stable candidate; report their actual commands and results.

Check meaningful failure paths and whether regressions would be detected. Missing coverage goes to the coder. If a sensitivity probe is warranted, use an isolated temporary copy, not mutations of the candidate; record its limits. Separate a baseline failure from a newly introduced defect and avoid widening into unrelated repair.

For unavailable checks report the command, missing prerequisite, and affected acceptance criterion as unverified. Successful commands do not depend on a provisioning-status label.
