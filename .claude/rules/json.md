---
paths:
  - ".claude-plugin/*.json"
  - "plugins/*/.claude-plugin/*.json"
  - "package.json"
  - "knip.json"
  - ".jscpd.json"
  - ".prettierrc.json"
  - "**/tsconfig*.json"
  - ".markdownlint-cli2.jsonc"
---

# JSON manifests and configs

- Keep the `$schema` line a manifest has, and keep a manifest valid for `claude plugin validate --strict`.
- A plugin's `description` in its `plugin.json` and its entry in `.claude-plugin/marketplace.json` say what the plugin does now. Update both when its parts change.
- Change a plugin's `version` only when the user asks for that bump.
- Pin dev dependencies to exact versions (`npm run lint:pins` checks it), and change `package.json` only through `npm`, so `package-lock.json` stays in step.
- A config comment, where the format allows one, says why a setting is there.
