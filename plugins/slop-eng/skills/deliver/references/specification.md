# Specification

Brief the writer with the user's requirements, the acceptance source verbatim, the spec path in the project's spec location (normally `docs/specs/`), the repository and product evidence, and any existing spec to reuse. Ask for a proportionate spec:

- the problem and intended outcome, scope, and exclusions;
- the intended approach, constraints, and dependencies;
- observable acceptance criteria, one behavior each, and how each will be verified;
- when the work splits into independent parts, the tasks it breaks into.

For card-backed work the card is the acceptance source. A criterion that is wrong or ambiguous is corrected in the spec with the original wording and the reason beside it; the card itself changes only as `docs/BOARD.md` allows. Report every correction in the final response.

Brief the spec auditor with the spec revision, the acceptance source, and the repository and product evidence, and ask it to challenge the design when the approach is high-risk or uncertain. Brief QA with the validated spec, the candidate revision including uncommitted content, the changed paths, the baseline evidence, and the required checks, and ask for correctness and acceptance in one pass.
