# Repository guidance

- `src/` is the canonical implementation. `skills/install-guardrails/assets/guardrails/` is a generated copy of `src/` without the tests. Never edit the copy by hand. Run `pnpm sync:skill-assets` after every change under `src/`.
- `src/anti-slop/` is a verbatim copy of the upstream anti-slop repository at the commit in `src/anti-slop/UPSTREAM`. Never edit it by hand. Refresh it with `pnpm sync:anti-slop`, which rewrites the directory and `UPSTREAM`. It is excluded from `oxlint` and `oxfmt` on purpose, so upstream's own style holds there. Its tests run with ours and must pass. When one fails under our pinned `@oxlint/plugins`, report it; do not patch the copy.
- `src/preset.ts` is the single source of the recommended configuration. Consumers import it as `tools/oxlint/guardrails/preset.ts`, so it uses erasable TypeScript syntax only: no enums, no parameter properties, `.ts` extensions on relative imports. `src/preset.test.ts` fails when a rule object stops matching the rules its plugin index registers. Update the two together.
- Rules are generic. Do not add an application's names, paths or exceptions to a rule. A rule that assumes one library's idiom belongs in an opt-in plugin such as `guardrails-effect` under `src/effect/`.
- Rules use `defineRule` from `@oxlint/plugins` over the ESTree AST that Oxlint provides. Do not add another parser.
- Every rule file has a sibling `<rule>.test.ts` that drives `RuleTester` from `oxlint/plugins-dev`. Cover each message id, each option, and the cases the rule skips on purpose. `pnpm check:rule-tests` fails when a rule has no sibling test or is missing from its plugin index. The check covers the anti-slop copy too.
- Every threshold and word list is a rule option with a default. Read it through `numberOption` or `stringsOption` in `src/options.ts`, and declare it in `meta.schema` and `meta.defaultOptions`. A default changes only from a measured distribution, and the commit message records the numbers.
- Use named exports. The two exceptions are `src/index.ts` and `src/effect/index.ts`, because Oxlint's `jsPlugins` loader reads a default export.
- A diagnostic message states the measure, the value, the limit, and one fix. Write it in plain English and in the present tense.
- Each rule file carries one doc comment that states what the rule measures and where the measure comes from. This repository lints itself with its own plugins, and `guardrails/no-comments` is off here for that reason.
- `oxlint` and `@oxlint/plugins` stay pinned to the same exact version. Bump them together.
- Run `pnpm check` before committing. It runs the format check, lint, typecheck, tests, the skill asset check, the rule test check, and the anti-slop vendoring check.
