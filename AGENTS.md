# Repository guidance

- `src/` is the canonical implementation. `skills/install-guardrails/assets/guardrails/` is a generated copy of `src/` without the tests. Never edit the copy by hand. Run `pnpm sync:skill-assets` after every change under `src/`.
- Rules are generic. Do not add an application's names, paths or exceptions to a rule. A rule that assumes one library's idiom belongs in an opt-in plugin such as `guardrails-effect` under `src/effect/`.
- Rules use `defineRule` from `@oxlint/plugins` over the ESTree AST that Oxlint provides. Do not add another parser.
- Every rule file has a sibling `<rule>.test.ts` that drives `RuleTester` from `oxlint/plugins-dev`. Cover each message id, each option, and the cases the rule skips on purpose. `pnpm check:rule-tests` fails when a rule has no sibling test or is missing from its plugin index.
- Every threshold and word list is a rule option with a default. Read it through `numberOption` or `stringsOption` in `src/options.ts`, and declare it in `meta.schema` and `meta.defaultOptions`. A default changes only from a measured distribution, and the commit message records the numbers.
- Use named exports. The two exceptions are `src/index.ts` and `src/effect/index.ts`, because Oxlint's `jsPlugins` loader reads a default export.
- A diagnostic message states the measure, the value, the limit, and one fix. Write it in plain English and in the present tense.
- Each rule file carries one doc comment that states what the rule measures and where the measure comes from. This repository lints itself with its own plugins, and `guardrails/no-comments` is off here for that reason.
- `oxlint` and `@oxlint/plugins` stay pinned to the same exact version. Bump them together.
- Run `pnpm check` before committing. It runs the format check, lint, typecheck, tests, the skill asset check, and the rule test check.
