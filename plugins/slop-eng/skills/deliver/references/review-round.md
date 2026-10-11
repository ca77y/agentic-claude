# Review round

Inspect the PR, its branch and base, the working changes, the original acceptance source, and the review's findings. Work in the PR's worktree on its branch; keep unexplained changes, and never open a replacement PR.

Sort each finding into a defect, a non-issue, or a scope change. A defect is a real problem in this PR's change; pass it to `deliver-repair` as `{location, problem, area}`, with `area` `code`, `docs`, or `spec`. A non-issue is wrong, already handled, or outside the change; record the reason for the final report. A scope change is left for the final report unless the spec already covers it; a material contract change is a `spec` defect, so the workflow revises the spec and passes it through the spec gate first. Reading findings consumes no attempts.

Once the repair passes, push and update the PR as `docs/FORGE.md` describes for a repair; where no update is bound, report what the description should now say. Then fire the review again.
