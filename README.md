# guardrails

Oxlint rules for readable TypeScript. They catch oversized functions, vague names, boolean flags, helper chains, repeated functions, and comments that should be code.

Guardrails is vendored, not published to npm. Each repository owns its copy and config.

## Install

Add the installer skill:

```bash
npx skills add JGalbss/guardrails --skill install-guardrails
```

Then ask your coding agent to install guardrails in the current repository. Mention whether the project uses Effect.

The skill copies the plugin to `tools/oxlint/guardrails/` and creates `oxlint.config.ts`.

### Manual install

1. Copy `skills/install-guardrails/assets/guardrails/` to `tools/oxlint/guardrails/`.

2. Install `@oxlint/plugins` at the exact version used by `oxlint`. This repository pins both to `1.79.0`.

3. Create the config:

```ts
import { defineConfig } from "oxlint";
import { recommended } from "./tools/oxlint/guardrails/preset.ts";

export default defineConfig(recommended());
```

Use `recommended({ effect: true })` for Effect projects. Use `recommended({ typeAware: true })` with `oxlint-tsgolint` and `oxlint --type-aware` for rules that need type information.

## Preset

`recommended()` registers the Guardrails and anti-slop plugins, enables their rules and useful Oxlint rules, reports unused disable comments, and ignores the copied plugin and common agent directories.

It relaxes size rules for tests and scripts, comment rules for config and generated files, and import limits for composition roots.

| Option      | Purpose                                                              |
| ----------- | -------------------------------------------------------------------- |
| `root`      | Changes the plugin path. The default is `./tools/oxlint/guardrails`. |
| `effect`    | Enables the Effect rules.                                            |
| `typeAware` | Enables rules that require type information.                         |

## Rules

Every limit and word list is configurable. These are the defaults.

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
| `similar-functions`     | Functions with nearly identical structure                  | `similarity: 0.85`, `minTokens: 30` |
| `single-use-function`   | Small local functions used once                            | `maxLength: 900`                    |
| `suspect-of-suffix`     | Names ending in `Of`, such as `nameOf`                     | None                                |

Default word lists and examples live in the rule files and their sibling tests under `src/rules/`.

### Effect

`guardrails-effect/no-union-state-with` reports union level `State.with(...)` calls. Use the variant, such as `State.Active.with(...)`, so TypeScript checks the right fields. Its `unions` option defaults to `["State"]`.

## Anti-slop

The preset includes [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop#readme). Its source is vendored in `src/anti-slop/` at the commit in `UPSTREAM`.

Do not edit that directory. Refresh it with `pnpm sync:anti-slop`.

## Custom configs

Repositories with an existing config can import `plugins`, `ignorePatterns`, `overrides`, and any rule group from `preset.ts`. The exported groups are `guardrailsRules`, `guardrailsEffectRules`, `antiSlopRules`, `antiSlopEffectRules`, `coreRules`, `effectCoreRules`, and `typeAwareRules`.

JSON configs cannot import the preset. List the plugin entry points and rules manually, or use `oxlint.config.ts`.

## Example

[`examples/before.ts`](examples/before.ts) compiles, but Guardrails reports 51 problems from 19 rules. [`examples/after.ts`](examples/after.ts) is the same program after the reports are fixed, and it passes cleanly.

Run `pnpm demo` to see both reports.

## Limits

Rules use the ESTree syntax tree from Oxlint. Most checks see one file and have no type or scope information. Some rules therefore match names and syntax shapes. Their tests document the exact boundaries.

## Development

```bash
pnpm install
pnpm check
```

`src/` is canonical. Every rule needs a sibling test and an entry in its plugin index. After changing `src/`, update the installer copy:

```bash
pnpm sync:skill-assets
```

`pnpm check` runs formatting, linting, type checks, tests, and checks for both vendored copies.

## License

Guardrails is MIT licensed. The anti-slop rules keep their upstream MIT license in `src/anti-slop/LICENSE`.
