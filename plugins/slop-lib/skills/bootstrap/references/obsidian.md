# Optional Obsidian configuration

Read only when Obsidian setup is authorized. Resources are under `resources/obsidian/` relative to the owning skill directory.

For a new `.obsidian/`, copy `community-plugins.json` and `app.json`. For an existing vault, preserve `app.json` and other settings; merge the bundled plugin IDs into the community-plugin array without removing entries or duplicating IDs. If existing JSON cannot be parsed, report it instead of replacing it.

Append only missing lines from `gitignore-additions.txt` to the project's `.gitignore`. These changes configure optional Dataview, Templater, and Breadcrumbs support; they do not install plugin binaries. Tell the user which plugins still need installation through Obsidian's Community Plugins browser. Do not claim their activation was verified without checking it.

The library remains usable as plain Markdown without these plugins.
