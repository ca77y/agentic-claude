import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import regexp from "eslint-plugin-regexp";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

export default defineConfig(
  // Built workflows are generated from src/; lint the source.
  { ignores: [".tmp/", ".worktrees/", "plugins/"] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  regexp.configs["flat/recommended"],
  sonarjs.configs.recommended,
  unicorn.configs.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // `||` on strings and booleans is a deliberate falsy fallback: an empty agent reply counts as missing.
      "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: true }],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      // Agents return null for "no result", and the runtime's own API uses it.
      "unicorn/no-null": "off",
      // Workflow code names things after the domain (args, opts, res, cp); full words would not read better.
      "unicorn/prevent-abbreviations": "off",
      // Naming rules that would rename most of the domain vocabulary without making it clearer.
      "unicorn/name-replacements": "off",
      "unicorn/consistent-boolean-name": "off",
      // Comments are line comments, and doc comments use the conventional ` * ` prefix.
      "unicorn/single-line-block-comment-style": "off",
      "unicorn/no-asterisk-prefix-in-documentation-comments": "off",
      // Both rewrite `a || b` or reorder conditions, which changes behavior for "" or for side effects.
      "unicorn/prefer-default-parameters": "off",
      "unicorn/prefer-simple-condition-first": "off",
      // Prompts are built from nested templates and Prettier lays out nested ternaries readably.
      "sonarjs/no-nested-template-literals": "off",
      "sonarjs/no-nested-conditional": "off",
      // node:test's test() and describe() return promises the runner awaits itself.
      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          allowForKnownSafeCalls: [
            { from: "package", package: "node:test", name: ["test", "describe", "it", "suite"] },
          ],
        },
      ],
      "unicorn/no-nested-ternary": "off",
    },
  },
);
