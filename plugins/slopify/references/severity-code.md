# Severity of a code change

Rate a problem in a change to code and its documents by what it is.

- **blocker:** a criterion fails, the build or tests are broken, data is lost or corrupted, there is a security hole, or tests were weakened without a recorded reason.
- **major:** a correctness bug on a reachable path in changed code, an error swallowed on a path the user sees, or documentation the change made untrue.

Anything real that is neither is minor or a nit, as the brief defines them.
