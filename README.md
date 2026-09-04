# guardrails

Guardrails is an Oxlint plugin for TypeScript that catches code that is hard to read but still valid. It checks function size, naming, unnecessary helpers, call chains, comments, and a few other sources of friction.

The plugin is copied into each repository instead of published to npm. That keeps the rules visible and lets each team change the limits when needed.

## Install

The easiest way to install it is with the included agent skill.

```bash
npx skills add JGalbss/guardrails --skill install-guardrails
```

Then ask your coding agent to install guardrails in the current repository. If the project uses Effect, ask it to enable the Effect rules too.

The skill copies the plugin to `tools/oxlint/guardrails/` and creates an `oxlint.config.ts` that uses the recommended preset.

## Install by hand

1. Copy `src/` to `tools/oxlint/guardrails/` without the test files. The ready to copy version is in `skills/install-guardrails/assets/guardrails/`.

2. Install `@oxlint/plugins` at the exact version used by `oxlint`. This repository currently pins both to `1.79.0`.

3. Add an `oxlint.config.ts`:

```ts
import { defineConfig } from "oxlint";
import { recommended } from "./tools/oxlint/guardrails/preset.ts";

export default defineConfig(recommended());
```

For an Effect project:

```ts
export default defineConfig(recommended({ effect: true }));
```

For rules that need type information, install `oxlint-tsgolint`, run Oxlint with `--type-aware`, and enable the group:

```ts
export default defineConfig(recommended({ typeAware: true }));
```

## The preset

`recommended()` gives you a complete Oxlint config. It registers the Guardrails and anti-slop plugins, enables their rules, turns on useful built in rules, reports unused disable comments, and ignores the copied plugin and common agent directories.

It also relaxes a few rules where they do not fit. Tests and scripts may be larger. Config files may use default exports and comments. Generated files may use comments. Composition roots may have more imports.

The preset accepts three options.

| Option      | Purpose                                                              |
| ----------- | -------------------------------------------------------------------- |
| `root`      | Changes the plugin path. The default is `./tools/oxlint/guardrails`. |
| `effect`    | Enables the Effect rule groups.                                      |
| `typeAware` | Enables rules that require type information.                         |

## Guardrails rules

Every limit and word list can be changed in the rule options. The values below are the defaults.

| Rule                    | What it reports                                            | Option                              |
| ----------------------- | ---------------------------------------------------------- | ----------------------------------- |
| `abc-size`              | Functions with too many assignments, calls, and conditions | `ceiling: 35`                       |
| `banned-vocabulary`     | Declared names containing configured words                 | `words`                             |
| `call-chain`            | Private helpers that only lead to more private helpers     | `maxDepth: 1`                       |
| `cognitive-complexity`  | Branching that becomes hard to follow                      | `ceiling: 22`                       |
| `flag-argument`         | Boolean parameters that hide meaning at the call site      | None                                |
| `halstead-difficulty`   | Functions with dense and repetitive operations             | `ceiling: 80`                       |
| `maintainability-index` | Functions that combine too much size and complexity        | `floor: 30`                         |
| `nested-match`          | Match calls nested inside other match calls                | `ceiling: 2`, `matchers`            |
| `no-comments`           | Comments that do not use an allowed prefix                 | `allow`                             |
| `participle-function`   | Function names such as `opened` or `loading`               | `words`                             |
| `similar-functions`     | Two functions with nearly identical structure              | `similarity: 0.85`, `minTokens: 30` |
| `single-use-function`   | Small local functions used once                            | `maxLength: 900`                    |
| `suspect-of-suffix`     | Names ending in `Of`, such as `nameOf`                     | None                                |

The full default word lists live beside each rule in `src/rules/`. Each rule also has a test file that shows what passes and what fails.

### Effect rule

`guardrails-effect/no-union-state-with` reports union level `State.with(...)` calls. Use the variant, such as `State.Active.with(...)`, so TypeScript checks the fields against the right state. The `unions` option defaults to `["State"]`.

## Bundled anti-slop rules

The preset includes the rules from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop#readme). Their rule names and behavior stay aligned with upstream.

The vendored source is in `src/anti-slop/`. Its pinned commit is recorded in `src/anti-slop/UPSTREAM`. Do not edit that directory directly. Run `pnpm sync:anti-slop` to refresh it.

## Use part of the preset

If the repository already has an Oxlint config, import only the pieces it needs.

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
  overrides: overrides(),
});
```

`preset.ts` also exports `guardrailsEffectRules`, `antiSlopEffectRules`, `effectCoreRules`, and `typeAwareRules`.

A JSON config cannot import the preset. Register the plugin entry points and list each rule instead, or switch to `oxlint.config.ts`.

## How the rules work

The rules use the ESTree syntax tree provided by Oxlint. They do not run a separate parser or type checker. Most checks look at one file at a time, so an exported function is treated as public even when nothing in the repository imports it.

Some rules match names because type information is not available. For example, `nested-match` treats any configured method name as a match, and the Effect rule treats any configured binding name as a state union.

## Development

Install dependencies and run the full check:

```bash
pnpm install
pnpm check
```

`src/` is the source of truth. Every rule has a sibling test file and must be registered in its plugin index.

After changing anything under `src/`, update the copy used by the install skill:

```bash
pnpm sync:skill-assets
```

`src/anti-slop/` is vendored upstream code. Refresh it only with:

```bash
pnpm sync:anti-slop
```

`pnpm check` runs formatting, linting, type checks, tests, and checks for both generated copies.

## License

Guardrails is MIT licensed. The bundled anti-slop rules keep their upstream MIT license in `src/anti-slop/LICENSE`.
