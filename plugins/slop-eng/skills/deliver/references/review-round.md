# Review round

Inspect the PR, its branch and base, the working changes, the original acceptance source, and the review's findings. Work in the PR's worktree on its branch; keep unexplained changes, and never open a replacement PR.

Sort each finding into a defect, a non-issue, or a scope change. A defect is a real problem in this PR's change; fix it within the round. A non-issue is wrong, already handled, or outside the change; record the reason for the final report. A scope change is left for the final report unless the spec already covers it; a material contract change first goes through the spec gate with a revised spec. Reading findings consumes no attempts.

The producers fix the defects, and a fresh QA covers the fixed findings, affected regressions, and documentation. Once it passes, push and update the PR as `docs/FORGE.md` describes for a repair; where no update is bound, report what the description should now say. Then fire the review again.
