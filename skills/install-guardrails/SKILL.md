---
name: install-guardrails
description: Install the guardrails Oxlint plugins in a TypeScript repository and register their rules. Use when a user asks to add guardrails lint rules, readability rules, naming rules, or function size metrics, or asks to install, copy, or configure the guardrails oxlint plugin.
license: MIT
---

# Install guardrails

Guardrails is two Oxlint plugins written with `defineRule` over the ESTree AST. The `guardrails` plugin holds thirteen readability rules: naming, function size metrics, one-use functions, call chains, and comments. The `guardrails-effect` plugin holds one rule for codebases that build tagged state unions with effect-machine. This skill copies both plugins into the target repository, pins the dependency, and registers the rules. Keep unrelated work intact and match the repository's package manager and config style.

## Procedure

1. Inspect the repository before you change it.
   - Read its agent instructions (`AGENTS.md`, `CLAUDE.md`, or the equivalent).
   - Run `git status`. Leave unrelated changes alone.
   - Read `packageManager` in `package.json` and the lockfile to identify the package manager.
   - Find the Oxlint config: `oxlint.config.ts`, `.oxlintrc.json`, or none.
   - Check for an existing `tools/oxlint/guardrails/`. When it exists, diff it against `<skill-directory>/assets/guardrails/` before you replace it.

2. Copy the plugins. Run from the repository root:

   ```bash
   node <skill-directory>/scripts/install.mjs
   ```

   The script copies `assets/guardrails/` to `tools/oxlint/guardrails/` and prints the two `jsPlugins` entries to register. Pass a relative path as the first argument to copy somewhere else. The script exits with code 1 when the destination already exists. `--force` deletes the destination and copies again; use it only after the review in step 1.

3. Install the dependencies with the repository's package manager, as `devDependencies`.
   - When the repository already depends on `oxlint`, read the installed version from the lockfile and add `@oxlint/plugins` at exactly that version.
   - When the repository has no `oxlint` dependency, run `npm view oxlint version` and add `oxlint` and `@oxlint/plugins` at that version.
   - Pin both exactly, with no range prefix. The two packages move together.
   - Do not change other dependency ranges and do not change the package manager.

4. Register the plugin and the ignore patterns. Merge these fields into the existing config and keep every existing ignore:

   ```ts
   ignorePatterns: [
     "node_modules/**",
     ".agent/**",
     ".agents/**",
     ".claude/**",
     ".codex/**",
     ".continue/**",
     ".cursor/**",
     ".gemini/**",
     ".opencode/**",
     ".pi/**",
     ".roo/**",
     ".windsurf/**",
     "tools/oxlint/guardrails/**",
   ],
   jsPlugins: [{ name: "guardrails", specifier: "./tools/oxlint/guardrails/index.ts" }],
   ```

   Keep `node_modules/**` even when `.gitignore` lists it. Oxlint reads `.gitignore` to skip dependencies, and a directory without one needs the pattern.
   Change the last pattern and the specifier when step 2 used another path. Add any other directory the repository keeps for agent tooling, so installed skills and hooks are not linted as application source. Do not ignore every dot-directory; some repositories keep source or checks in one. `.oxlintrc.json` takes the same two fields as JSON.

5. Enable every guardrails rule at `error`:

   ```json
   {
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
     "guardrails/suspect-of-suffix": "error"
   }
   ```

   Every threshold and word list is a rule option with a default. Leave the options out to keep the defaults. To change one, pass an object as the second element, for example `"guardrails/abc-size": ["error", { "ceiling": 40 }]`.

   | Rule                    | Option       | Default                                               |
   | ----------------------- | ------------ | ----------------------------------------------------- |
   | `abc-size`              | `ceiling`    | `35`                                                  |
   | `banned-vocabulary`     | `words`      | the list in `rules/banned-vocabulary.ts`              |
   | `call-chain`            | `maxDepth`   | `1`                                                   |
   | `cognitive-complexity`  | `ceiling`    | `22`                                                  |
   | `halstead-difficulty`   | `ceiling`    | `80`                                                  |
   | `maintainability-index` | `floor`      | `30`                                                  |
   | `nested-match`          | `ceiling`    | `2`                                                   |
   | `nested-match`          | `matchers`   | `["match", "$match", "matchLeft", "matchRight"]`      |
   | `no-comments`           | `allow`      | the tool directive prefixes in `rules/no-comments.ts` |
   | `participle-function`   | `words`      | the list in `rules/participle-function.ts`            |
   | `similar-functions`     | `similarity` | `0.85`                                                |
   | `similar-functions`     | `minTokens`  | `30`                                                  |
   | `single-use-function`   | `maxLength`  | `900`                                                 |

   `flag-argument` and `suspect-of-suffix` take no options.

6. Offer the companion rules and overrides. Apply them when the user agrees, or when the repository has no policy that conflicts with them. The `import` rules need `"import"` in the config's `plugins` list; `eslint`, `typescript`, and `unicorn` are on by default.

   ```json
   {
     "eslint/complexity": ["error", 22],
     "eslint/max-depth": ["error", 3],
     "eslint/max-lines": ["error", 500],
     "eslint/max-nested-callbacks": ["error", 5],
     "eslint/max-params": ["error", 3],
     "eslint/no-else-return": ["error", { "allowElseIf": false }],
     "eslint/no-lonely-if": "error",
     "unicorn/no-negated-condition": "error",
     "import/max-dependencies": ["error", { "max": 18 }],
     "import/no-default-export": "error",
     "typescript/consistent-type-imports": "error",
     "typescript/explicit-module-boundary-types": "error",
     "typescript/no-explicit-any": "error",
     "typescript/no-non-null-assertion": "error"
   }
   ```

   Add `"typescript/switch-exhaustiveness-check": "error"` only when the repository runs Oxlint with `--type-aware`; the rule needs type information.

   A test reads as one scenario per case. A script is not shipped source. Both are exempt from the two whole-function size metrics. Build tools read a default export from a config file, and a config file explains its choices in comments:

   ```ts
   overrides: [
     {
       files: ["**/test/**", "**/tests/**", "**/*.test.ts", "**/*.test.tsx", "**/scripts/**"],
       rules: { "guardrails/abc-size": "off", "guardrails/maintainability-index": "off" },
     },
     {
       files: ["**/*.config.ts", "**/*.config.mts", "**/*.config.js", "**/*.config.mjs"],
       rules: { "import/no-default-export": "off", "guardrails/no-comments": "off" },
     },
   ],
   ```

   When the repository uses a pattern-matching library such as Effect's `Match` or `Option.match`, or the user's standards ban ternaries, offer this override as well. It covers `.ts` only: JSX needs a ternary so both branches stay visible.

   ```ts
   {
     files: ["src/**/*.ts"],
     rules: { "eslint/no-ternary": "error" },
   },
   ```

7. Register `guardrails-effect` only when a `package.json` in the repository lists `effect` under `dependencies`, or when the user asks for it. A transitive `effect` in the lockfile does not count. Merge these entries with the ones from steps 4 and 5:

   ```ts
   jsPlugins: [
     { name: "guardrails-effect", specifier: "./tools/oxlint/guardrails/effect/index.ts" },
   ],
   rules: {
     "guardrails-effect/no-union-state-with": "error",
   },
   ```

   The rule reports `State.with(...)`, the union-level `.with` whose partial is typed as `unknown`. It matches by identifier name. When the repository names its state unions differently, pass them in `unions`, for example `["error", { "unions": ["State", "Phase"] }]`.

8. Run the repository's lint and typecheck commands from `package.json`. Report findings in owned source. Fix them only when the user asked for a cleanup. Every fix follows these rules:
   - Never disable a rule, lower a severity, add a cast, or add a disable directive to make lint pass.
   - When `abc-size`, `cognitive-complexity`, `halstead-difficulty`, or `maintainability-index` fires, split the function along a boundary it already has, or replace a run of boolean checks with a tagged state and one classification.
   - When `single-use-function` fires, inline the function at its one call site. Do not export it and do not add a second call.
   - When `call-chain` fires, inline the inner private function into its caller.
   - When `banned-vocabulary`, `participle-function`, or `suspect-of-suffix` fires, rename the identifier for what it is or what it does.
   - When `no-comments` fires, rename the thing, split the function, or model the state so the code carries the note. Keep the comment only when it records a constraint the code cannot express, and put `// oxlint-disable-next-line guardrails/no-comments` above it.

9. Review the final diff and report:
   - the path the plugins were copied to,
   - the `oxlint` and `@oxlint/plugins` versions installed,
   - the config files and fields changed,
   - the checks run, and every remaining finding with its file and rule.

## Tuning

The default thresholds were measured on one large codebase. Change a threshold only from the target repository's own distribution, never to clear one finding.

1. In a scratch copy of the config, set the metric so every function reports: `{ "ceiling": 0 }` for `abc-size`, `cognitive-complexity`, and `halstead-difficulty`, and `{ "floor": 101 }` for `maintainability-index`. Each message carries the function's score.
2. Run `oxlint --format=json` and collect the scores from the messages.
3. Pick the threshold from the distribution, for example the 95th percentile, and round it.
4. Record the percentile, the threshold, the function count, and the date in a comment next to the option in the config. Discard the scratch config.
