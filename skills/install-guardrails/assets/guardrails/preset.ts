import type { DummyRuleMap, ExternalPluginEntry, OxlintConfig, OxlintOverride } from "oxlint";

/**
 * The recommended Oxlint configuration, as code. A consumer imports this file from the copy the
 * install skill made and passes `recommended()` to `defineConfig`. The pieces are exported on
 * their own for a repository that already has a config and merges them in.
 *
 * Node loads this file with type stripping, so it uses erasable syntax only.
 */

export const defaultRoot = "./tools/oxlint/guardrails";

/** Installed skills and agent instructions are not project source. */
export const agentDirectories: ReadonlyArray<string> = [
  ".agent",
  ".agents",
  ".claude",
  ".codex",
  ".continue",
  ".cursor",
  ".gemini",
  ".opencode",
  ".pi",
  ".roo",
  ".windsurf",
];

export const plugins = (root: string = defaultRoot): ExternalPluginEntry[] => [
  { name: "guardrails", specifier: `${root}/index.ts` },
  { name: "guardrails-effect", specifier: `${root}/effect/index.ts` },
  { name: "anti-slop", specifier: `${root}/anti-slop/index.ts` },
  { name: "anti-slop-effect", specifier: `${root}/anti-slop/effect/index.ts` },
];

export const ignorePatterns = (root: string = defaultRoot): string[] => [
  "node_modules/**",
  ...agentDirectories.map((directory) => `${directory}/**`),
  `${root.replace(/^\.\//, "")}/**`,
];

export const antiSlopRules: DummyRuleMap = {
  "anti-slop/no-chained-type-assertions": "error",
  "anti-slop/no-conditional-empty-object-spread": "error",
  "anti-slop/no-known-value-widening": "error",
  "anti-slop/no-module-mocking": "error",
  "anti-slop/no-object-parameters": "error",
  "anti-slop/no-reflect-apply": "error",
  "anti-slop/no-reflect-get": "error",
  "anti-slop/no-runtime-typeof": "error",
  "anti-slop/no-shape-in-symbol-names": "error",
  "anti-slop/no-unknown-parameters": "error",
  "anti-slop/no-unknown-returns": "error",
  "anti-slop/no-unknown-type-aliases": "error",
  "anti-slop/no-unsafe-dictionary-type": "error",
  "anti-slop/no-widen-then-assert": "error",
  "anti-slop/require-safety-comment-for-type-assertion": "error",
};

export const antiSlopEffectRules: DummyRuleMap = {
  "anti-slop-effect/no-service-constructor-imports": "error",
};

export const guardrailsRules: DummyRuleMap = {
  "guardrails/abc-size": "error",
  "guardrails/banned-vocabulary": "error",
  "guardrails/call-chain": "error",
  "guardrails/cognitive-complexity": "error",
  "guardrails/flag-argument": "error",
  "guardrails/halstead-difficulty": "error",
  "guardrails/maintainability-index": "error",
  "guardrails/nested-match": "error",
  "guardrails/no-comments": "error",
  "guardrails/participle-function": "error",
  "guardrails/similar-functions": "error",
  "guardrails/single-use-function": "error",
  "guardrails/suspect-of-suffix": "error",
};

export const guardrailsEffectRules: DummyRuleMap = {
  "guardrails-effect/no-union-state-with": "error",
};

/**
 * Built-in rules that carry the rest of the same standard. `switch-exhaustiveness-check` needs
 * type information and is silent without `oxlint --type-aware`.
 */
export const coreRules: DummyRuleMap = {
  "eslint/max-params": ["error", 3],
  "eslint/max-nested-callbacks": ["error", 5],
  "eslint/no-else-return": ["error", { allowElseIf: false }],
  "eslint/no-lonely-if": "error",
  "unicorn/no-negated-condition": "error",
  "import/max-dependencies": ["error", { max: 18 }],
  "eslint/complexity": ["error", 22],
  "eslint/max-depth": ["error", 3],
  "eslint/max-lines": ["error", 500],
  "import/no-default-export": "error",
  "typescript/consistent-type-imports": "error",
  "typescript/no-explicit-any": "error",
  "typescript/explicit-module-boundary-types": "error",
  "typescript/no-non-null-assertion": "error",
  "typescript/switch-exhaustiveness-check": "error",
};

/** `_tag` and `_op` are Effect's discriminators, so they are not private-member names. */
export const effectCoreRules: DummyRuleMap = {
  "eslint/no-underscore-dangle": ["error", { allow: ["_tag", "_op"] }],
};

/** These need `oxlint-tsgolint` installed and `oxlint --type-aware`. */
export const typeAwareRules: DummyRuleMap = {
  "typescript/no-floating-promises": "error",
  "typescript/no-misused-promises": "error",
  "typescript/no-unnecessary-type-assertion": "error",
};

const testGlobs = ["**/test/**", "**/tests/**", "**/*.test.ts", "**/*.test.tsx", "**/scripts/**"];
const configGlobs = ["**/*.config.ts", "**/*.config.mts", "**/*.config.js", "**/*.config.mjs"];

/**
 * A test is one scenario per case, and a script is not shipped source. A build tool reads a
 * default export from a config file and the file explains its choices in comments. A generator
 * wrote the generated files. A composition root and a test harness fan out by design.
 */
export const overrides = (): OxlintOverride[] => [
  {
    files: testGlobs,
    rules: {
      "guardrails/maintainability-index": "off",
      "guardrails/abc-size": "off",
      "typescript/explicit-module-boundary-types": "off",
    },
  },
  {
    files: configGlobs,
    rules: { "import/no-default-export": "off", "guardrails/no-comments": "off" },
  },
  { files: ["**/generated/**"], rules: { "guardrails/no-comments": "off" } },
  { files: ["**/layers.ts", ...testGlobs], rules: { "import/max-dependencies": "off" } },
];

export interface RecommendedOptions {
  /** Where the install skill copied the plugins. Default `./tools/oxlint/guardrails`. */
  readonly root?: string;
  /** Enable the Effect rule groups. Set it when the repository depends directly on `effect`. */
  readonly effect?: boolean;
  /** Enable the rules that need `oxlint --type-aware`. */
  readonly typeAware?: boolean;
}

/**
 * The whole configuration. All four plugins are registered whatever the flags say, so turning a
 * rule group on later is one line; the flags decide which rules are enabled.
 */
export const recommended = (options: RecommendedOptions = {}): OxlintConfig => {
  const root = options.root ?? defaultRoot;
  const groups: ReadonlyArray<DummyRuleMap> = [
    antiSlopRules,
    guardrailsRules,
    coreRules,
    ...(options.effect ? [antiSlopEffectRules, guardrailsEffectRules, effectCoreRules] : []),
    ...(options.typeAware ? [typeAwareRules] : []),
  ];
  return {
    plugins: ["eslint", "typescript", "oxc", "unicorn", "import", "promise"],
    categories: { correctness: "error", suspicious: "error", perf: "error" },
    options: { reportUnusedDisableDirectives: "error" },
    ignorePatterns: ignorePatterns(root),
    jsPlugins: plugins(root),
    rules: Object.fromEntries(groups.flatMap((group) => Object.entries(group))),
    overrides: overrides(),
  };
};
