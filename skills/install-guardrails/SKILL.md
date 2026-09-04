---
name: install-guardrails
description: Install the guardrails Oxlint plugins, the bundled anti-slop rules, and the recommended Oxlint configuration in a TypeScript repository. Use when a user asks to add guardrails lint rules, readability rules, naming rules, function size metrics, or anti-slop rules. Also use when a user asks to install, copy, or configure the guardrails oxlint plugin.
license: MIT
---

# Install guardrails

One copy installs four Oxlint plugins and a preset. The `guardrails` plugin holds thirteen readability rules: naming, function size metrics, one-use functions, call chains, and comments. The `guardrails-effect` plugin holds one rule for codebases that build tagged state unions with effect-machine. The `anti-slop` plugin holds fifteen rules that reject low-evidence TypeScript, and `anti-slop-effect` holds one rule about Effect service imports. `preset.ts` holds the recommended configuration as code. This skill copies the directory, pins the dependency, and writes or merges the config. Keep unrelated work intact and match the repository's package manager and config style.

## Procedure

1. Inspect the repository before you change it.
   - Read its agent instructions (`AGENTS.md`, `CLAUDE.md`, or the equivalent).
   - Run `git status`. Leave unrelated changes alone.
   - Read `packageManager` in `package.json` and the lockfile to identify the package manager.
   - Find the Oxlint config: `oxlint.config.ts`, `.oxlintrc.json`, or none.
   - Check whether a `package.json` in the repository lists `effect` under `dependencies`. A transitive `effect` in the lockfile does not count.
   - Check for an existing `tools/oxlint/guardrails/`. When it exists, diff it against `<skill-directory>/assets/guardrails/` before you replace it.

2. Copy the plugins and the preset. Run from the repository root:

   ```bash
   node <skill-directory>/scripts/install.mjs
   ```

   The script copies `assets/guardrails/` to `tools/oxlint/guardrails/` and prints the suggested `oxlint.config.ts`. Pass a relative path as the first argument to copy somewhere else. The script exits with code 1 when the destination already exists. `--force` deletes the destination and copies again; use it only after the review in step 1.

3. Install the dependencies with the repository's package manager, as `devDependencies`.
   - When the repository already depends on `oxlint`, read the installed version from the lockfile and add `@oxlint/plugins` at exactly that version.
   - When the repository has no `oxlint` dependency, run `npm view oxlint version` and add `oxlint` and `@oxlint/plugins` at that version.
   - Pin both exactly, with no range prefix. The two packages move together.
   - Do not change other dependency ranges and do not change the package manager.

4. Write the configuration.

   When the repository has no Oxlint config, write `oxlint.config.ts`:

   ```ts
   import { defineConfig } from "oxlint";
   import { recommended } from "./tools/oxlint/guardrails/preset.ts";
   export default defineConfig(recommended({ effect: true }));
   ```

   Pass `effect: true` only when step 1 found a direct `effect` dependency. Otherwise call `recommended()`. Pass `root: "<path>"` when step 2 copied to another path, with the same `./` prefix the specifier uses. Pass `typeAware: true` only when the repository runs `oxlint --type-aware` with `oxlint-tsgolint` installed.

   `recommended()` returns a complete config. It enables the built-in plugins `eslint`, `typescript`, `oxc`, `unicorn`, `import`, and `promise`. It sets the `correctness`, `suspicious`, and `perf` categories and `reportUnusedDisableDirectives` to `error`. It ignores `node_modules`, the agent tool directories, and the plugin directory. It registers all four `jsPlugins`, enables every rule at `error`, and adds the standard overrides. All four plugins are registered whatever the flags say. The flags decide which rules are enabled.

   When the repository already has an `oxlint.config.ts`, merge the pieces into it and keep everything it has:

   ```ts
   import { defineConfig } from "oxlint";
   import {
     antiSlopRules,
     coreRules,
     guardrailsRules,
     ignorePatterns,
     overrides,
     plugins,
   } from "./tools/oxlint/guardrails/preset.ts";

   export default defineConfig({
     plugins: ["eslint", "typescript", "oxc", "unicorn", "import", "promise"],
     ignorePatterns: [...ignorePatterns(), "dist/**"],
     jsPlugins: plugins(),
     rules: { ...antiSlopRules, ...guardrailsRules, ...coreRules },
     overrides: [...overrides()],
   });
   ```

   - `plugins(root)` returns the four `jsPlugins` entries. Add them to the existing list.
   - `ignorePatterns(root)` returns `node_modules/**`, the agent tool directories, and the plugin directory. Keep every existing ignore. Keep `node_modules/**` even when `.gitignore` lists it, because a directory without one needs the pattern. Do not ignore every dot-directory; some repositories keep source or checks in one.
   - The rule objects are `antiSlopRules`, `guardrailsRules`, `coreRules`, and the opt-in `antiSlopEffectRules`, `guardrailsEffectRules`, `effectCoreRules`, and `typeAwareRules`. Spread the Effect groups only when step 1 found a direct `effect` dependency. Spread `typeAwareRules` only under `oxlint --type-aware`.
   - `overrides()` returns the standard exemptions for tests, scripts, config files, generated files, and composition roots. Put them before the repository's own overrides.
   - When an existing rule conflicts with a preset rule, keep the repository's value and report the difference.
   - The `import` rules need `"import"` in `plugins`. Add it when it is missing.

   When the repository uses `.oxlintrc.json`, JSON cannot import the preset. Offer to convert the file to `oxlint.config.ts`. When the user declines, copy the values by hand: the four `jsPlugins` entries, the ignore patterns, and every rule id from `preset.ts` at `"error"`. Leave out the Effect groups when the repository has no direct `effect` dependency.

5. Keep the default options unless the user asks for a change. Every threshold and word list is a rule option with a default. To change one, pass an object as the second element, for example `"guardrails/abc-size": ["error", { "ceiling": 40 }]`. With `recommended()`, add the entry under `rules` in a spread after the preset: `{ ...recommended().rules, "guardrails/abc-size": ["error", { ceiling: 40 }] }`.

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

   `flag-argument` and `suspect-of-suffix` take no options. `guardrails-effect/no-union-state-with` takes `unions`, default `["State"]`; pass the repository's union names when they differ. The anti-slop options are documented in the upstream README linked from `README.md`: `no-runtime-typeof` takes `allowInTypeGuards`, and `require-safety-comment-for-type-assertion` takes `markers`.

6. Offer the `eslint/no-ternary` override when the repository uses a pattern-matching library such as Effect's `Match` or `Option.match`, or when the user's standards ban ternaries. It covers `.ts` only: JSX needs a ternary so both branches stay visible.

   ```ts
   {
     files: ["src/**/*.ts"],
     rules: { "eslint/no-ternary": "error" },
   },
   ```

7. Run the repository's lint and typecheck commands from `package.json`. Report findings in owned source. Fix them only when the user asked for a cleanup. Every fix follows these rules:
   - Never disable a rule, lower a severity, add a cast, or add a disable directive to make lint pass.
   - When `abc-size`, `cognitive-complexity`, `halstead-difficulty`, or `maintainability-index` fires, split the function along a boundary it already has, or replace a run of boolean checks with a tagged state and one classification.
   - When `single-use-function` fires, inline the function at its one call site. Do not export it and do not add a second call.
   - When `call-chain` fires, inline the inner private function into its caller.
   - When `banned-vocabulary`, `participle-function`, or `suspect-of-suffix` fires, rename the identifier for what it is or what it does.
   - When `no-comments` fires, rename the thing, split the function, or model the state so the code carries the note. Keep the comment only when it records a constraint the code cannot express, and put `// oxlint-disable-next-line guardrails/no-comments` above it.
   - When an `anti-slop` rule fires, parse the value at its boundary or keep the precise type. Add a `SAFETY:` comment only when it states an invariant the code checks.

8. Review the final diff and report:
   - the path the plugins were copied to,
   - the `oxlint` and `@oxlint/plugins` versions installed,
   - the config files and fields changed, and which rule groups are enabled,
   - the checks run, and every remaining finding with its file and rule.

## Tuning

The default thresholds were measured on one large codebase. Change a threshold only from the target repository's own distribution, never to clear one finding.

1. In a scratch copy of the config, set the metric so every function reports: `{ "ceiling": 0 }` for `abc-size`, `cognitive-complexity`, and `halstead-difficulty`, and `{ "floor": 101 }` for `maintainability-index`. Each message carries the function's score.
2. Run `oxlint --format=json` and collect the scores from the messages.
3. Pick the threshold from the distribution, for example the 95th percentile, and round it.
4. Record the percentile, the threshold, the function count, and the date in a comment next to the option in the config. Discard the scratch config.

## Maintenance

`pnpm sync:anti-slop` refreshes the anti-slop copy inside the guardrails repository itself. It is for that repository's maintainers, not for consumers. A consumer updates a vendored copy by installing the skill again and re-running `install.mjs --force`.
