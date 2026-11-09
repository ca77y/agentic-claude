# Testing declaration

Fill [the testing template](../resources/TESTING.md) and write it to `TESTING.md` at the project root. Take facts from the repository: the package manifest, build files, CI configuration, existing tests, and documentation. Write the exact commands, and never record credentials; say where a credential comes from instead.

Ask the user for what the repository can't show:

- the categories: what each covers, its validation path, the evidence it must produce, and whether a criterion in it that can't be verified lets the pull request be `ready` or keeps it `draft`;
- whether a criterion that fits no category lets the pull request be `ready` or keeps it `draft`;
- where the test account and env file come from;
- the blind spots.

Propose categories from the kinds of change the repository holds, and let the user correct them. A validation path names a flow, a test suite, or a command, so someone who has never seen the project can run it. Keep at least one category.

Don't invent a command or a flow. A value nobody can supply yet stays as a stated gap in the file and in your report. Write "none" where a section has nothing to declare, such as blind spots or saved flows. Write `draft` for any `ready` or `draft` setting the user doesn't decide.

Name no agent, skill, slash command, or model. Keep project customizations in an existing `TESTING.md`, and fix only what is wrong, missing, or unclear.
