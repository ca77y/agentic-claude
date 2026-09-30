# PR repair

Inspect the PR, its branch and base, the working changes, the original acceptance source, and the findings. Work in the PR's worktree on its branch; keep unexplained changes, and never open a replacement PR.

Sort the findings into defects, missing evidence, and scope changes. Brief the producers to fix the defects within the repair. A material contract change first goes through the spec gate with a revised spec. Reconstruct missing evidence from the artifacts, and say what can't be recovered. Reading findings consumes no attempts.

The final candidate gets a fresh QA covering the repaired findings, affected regressions, and documentation. Once the gates pass, push and update the PR as `docs/FORGE.md` describes for a repair; where no update is bound, report what the description should now say. Then re-fire the review as the skill describes.

Report the addressed findings, the verification, the PR, and the re-fire result.
