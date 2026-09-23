# Scaffold details

Copy files from `resources/library/` relative to the owning skill directory, preserving the tree under the target project's `library/`. Copy only missing files; never replace existing content. Edit new copies, not the bundled resources.

The resource tree contains README and CLAUDE files, `raw/README.md`, `wiki/README.md`, and `_meta/` index, taxonomy, log, librarian guide, and templates. All are part of the scaffold, even when the library starts empty.

Replace these tokens wherever they occur in newly copied files:

| Token | Value |
| --- | --- |
| `{{PROJECT_NAME}}` | Name from the request or project metadata |
| `{{TODAY}}` | One current `YYYY-MM-DD` date for the pass |
| `{{DOMAIN_ONE_LINER}}` | Supported scope or neutral project research scope |
| `{{SOURCE_PROVIDER_GUIDANCE}}` | Supplied project provider and unavailable-access rule; when none is configured, state that new internet investigation requires choosing a provider, without inventing one |
| `{{DOMAIN_TAGS}}` | Established tags as Markdown bullets, or an HTML comment that domain tags start empty |

Preserve `<% ... %>` Templater expressions in `_meta/templates/`; they are intentional. Existing files with unresolved tokens are reported gaps, not permission to overwrite.

For an existing root `CLAUDE.md`, add a library entry to its layout when appropriate and merge `resources/root-claude-md-library-section.md` into the matching section. Preserve unrelated instructions and avoid duplicate sections. If no root file exists, report that no pointer was added.
