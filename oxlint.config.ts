import { defineConfig } from "oxlint";

/**
 * This repository lints itself with its own plugins. `guardrails/no-comments` stays off because
 * every rule file carries a doc comment that states what the rule measures and why.
 */
export default defineConfig({
  plugins: ["eslint", "typescript", "oxc", "unicorn", "import", "promise"],

  categories: {
    correctness: "error",
    suspicious: "error",
    perf: "error",
  },

  options: {
    reportUnusedDisableDirectives: "error",
  },

  ignorePatterns: ["node_modules/**", "skills/install-guardrails/assets/**"],

  jsPlugins: [
    { name: "guardrails", specifier: "./src/index.ts" },
    { name: "guardrails-effect", specifier: "./src/effect/index.ts" },
  ],

  rules: {
    "guardrails/abc-size": "error",
    "guardrails/banned-vocabulary": "error",
    "guardrails/call-chain": "error",
    "guardrails/cognitive-complexity": "error",
    "guardrails/flag-argument": "error",
    "guardrails/halstead-difficulty": "error",
    "guardrails/maintainability-index": "error",
    "guardrails/nested-match": "error",
    "guardrails/participle-function": "error",
    "guardrails/similar-functions": "error",
    "guardrails/single-use-function": "error",
    "guardrails/suspect-of-suffix": "error",
    "guardrails-effect/no-union-state-with": "error",

    "eslint/no-else-return": ["error", { allowElseIf: false }],
    "eslint/no-lonely-if": "error",
    "eslint/max-params": ["error", 3],
    "eslint/max-depth": ["error", 3],
    "unicorn/no-negated-condition": "error",
    "unicorn/no-nested-ternary": "error",
    "import/no-default-export": "error",
    "typescript/consistent-type-imports": "error",
    "typescript/no-explicit-any": "error",
    "typescript/explicit-module-boundary-types": "error",
    "typescript/no-non-null-assertion": "error",
  },

  overrides: [
    {
      files: ["src/index.ts", "src/effect/index.ts", "*.config.ts"],
      rules: { "import/no-default-export": "off" },
    },
    {
      files: ["**/*.test.ts"],
      rules: {
        "guardrails/maintainability-index": "off",
        "guardrails/abc-size": "off",
        "guardrails/similar-functions": "off",
        "guardrails/single-use-function": "off",
      },
    },
  ],
});
