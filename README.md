# guardrails

Opinionated Oxlint rules that keep TypeScript readable for humans and for coding agents. They check names, function size metrics, one-use functions, call chains and comments. This is the ruleset Josh Galbreath uses on his own projects, and it encodes his taste.

Guardrails is meant to be vendored. There is no npm package. Copy the rules into your repository, read them, and change the thresholds and word lists to fit your code. The bundled agent skill does the first copy and the configuration. After that the copied files are yours to maintain.

## Install with an agent skill

```bash
npx skills add JGalbss/guardrails --skill install-guardrails
```

Then ask your coding agent to install guardrails in the current repository. The skill copies the plugins into `tools/oxlint/guardrails/` and registers them under `jsPlugins` in `oxlint.config.ts`. Ask the agent to enable the Effect rules too when the repository uses Effect.

To list the skills this repository ships:

```bash
npx skills add JGalbss/guardrails --list
```

## Manual installation

1. Copy `src/` into the repository as `tools/oxlint/guardrails/`, without the `*.test.ts` files. `skills/install-guardrails/assets/guardrails/` holds the same files with the tests already removed.
2. Install `@oxlint/plugins` at exactly the `oxlint` version the repository resolves. This repository pins both at 1.79.0. Keep the two versions exact so an upgrade moves them together.
3. Register the entry point and enable the rules in `oxlint.config.ts`:

```ts
import { defineConfig } from "oxlint";

export default defineConfig({
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
  rules: {
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
  },
});
```

The `tools/oxlint/guardrails/**` pattern keeps the linter off its own plugin. Oxlint reads `.gitignore` to skip dependencies. In a directory without one, `node_modules/**` keeps it out of the dependency tree. The dot directories hold installed skills and agent instructions, which are not project source. Keep the ignore patterns the repository already has, and add the agent tool directories it uses.

`no-comments` rejects JSDoc as well as line comments. A repository that keeps doc comments should turn the rule off for those paths, or leave it out.

## Optional Effect rules

`guardrails-effect` holds the rules that assume Effect idioms. Register it only in a repository that depends on `effect`:

```ts
export default defineConfig({
  jsPlugins: [
    { name: "guardrails", specifier: "./tools/oxlint/guardrails/index.ts" },
    { name: "guardrails-effect", specifier: "./tools/oxlint/guardrails/effect/index.ts" },
  ],
  rules: {
    "guardrails-effect/no-union-state-with": "error",
  },
});
```

Its one rule targets tagged state unions built with effect-machine's `State(...)`. Enable it when the codebase builds state machines that way. The check is by name, so any call to `State.with` is reported.

## Rules

Every threshold and word list is a rule option. Each default is the value in use on one large Effect codebase, so a bare `"error"` gives the behaviour described here. Pass an options object to change a value. A list option replaces the default list; it does not extend it.

```ts
"guardrails/abc-size": ["error", { ceiling: 40 }],
"guardrails/banned-vocabulary": ["error", { words: ["handler", "manager", "util"] }],
```

### Generic rules

- `abc-size` rejects a function whose ABC size is above `ceiling`. The size is the vector length of its assignments, calls and conditions, `sqrt(A² + B² + C²)`, after Fitzpatrick. RuboCop ships the same metric at 17 for Ruby. A function this large does several things in one place. A nested function is measured on its own. Option: `ceiling`, default `35`.

- `banned-vocabulary` rejects a declared name that contains a listed word. The name is split into its camelCase words, and each word is compared in lower case. It checks variables, functions, parameters, classes, interfaces, type aliases, enums, and class and interface members. The default words name a role, a mechanism or a narration, such as `handler`, `manager`, `process`, `gather` and `reveal`. Name the thing itself. Option: `words`, default `["absorb", "askedof", "adopt", "announce", "attenuate", "blossom", "coordinator", "distill", "finalizer", "fold", "gather", "handle", "handler", "harvest", "helper", "manager", "copied", "drained", "drive", "forgotten", "gathered", "granted", "here", "misc", "offer", "orchestrator", "process", "processor", "readof", "remember", "reveal", "say", "says", "seal", "substrate", "wanted", "weave", "withdrawn", "wish", "whisper"]`.

- `call-chain` rejects a private module-level function that calls another private function of the same file. The reader chases `start` to `launch` to `open`, and one layer is enough. An exported function may call private steps; a private step does its own work. Recursion is not a chain, and only the top of a chain is reported. A function exported through an `export { name }` list or as the default export counts as exported. Option: `maxDepth`, default `1`, the longest chain of private functions allowed.

- `cognitive-complexity` rejects a function whose cognitive complexity is above `ceiling`. The score follows Campbell (SonarSource). Each `if`, loop, `switch`, `catch` and ternary scores one plus its nesting depth. Each run of one logical operator scores one. Nested branching costs more than flat branching, so moving a nested block into a module-level function is the usual fix. Option: `ceiling`, default `22`.

- `flag-argument` rejects a parameter annotated `boolean` or `Boolean`. The caller reads `open(session, true)` and has to look up what `true` means, and the body forks on it (Fowler, Refactoring; Martin, Clean Code). Split the function in two, or pass a value whose name says what it is. No options.

- `halstead-difficulty` rejects a function whose Halstead difficulty, rounded, is above `ceiling`. Difficulty is `(distinct operators / 2) * (operand uses / distinct operands)`. It rises with the number of distinct operators and with how often each name repeats. It catches a long body that keeps reworking the same few values. Option: `ceiling`, default `80`.

- `maintainability-index` rejects a function whose maintainability index is below `floor`. The index is Oman and Hagemeister's, in the Visual Studio normalisation from 0 to 100, computed from Halstead volume, cyclomatic complexity and line count. Visual Studio colours 0 to 9 red and 10 to 19 yellow. A function below the floor is long, dense and branchy at the same time, and shortening any one of the three raises it. Option: `floor`, default `30`.

- `nested-match` rejects a match call that nests more than `ceiling` matches. A call counts as a match when the property it calls is in `matchers`; the object is not inspected, so `text.match(regex)` counts too. A pyramid of matches is usually one classification written as several. Options: `ceiling`, default `2`; `matchers`, default `["match", "$match", "matchLeft", "matchRight"]`.

- `no-comments` rejects every comment whose text does not start with an allowed prefix. A run of adjacent line comments is reported once. A block comment, JSDoc included, is reported on its own. A comment after code on its line is always its own diagnostic, even when the line above is a reported comment. A shebang is not a comment and is never reported. When code needs a comment, rewrite the code. A comment that records a constraint the code cannot express stays, under `// oxlint-disable-next-line guardrails/no-comments`. Option: `allow`, default `["SAFETY:", "oxlint-", "eslint-", "@ts-", "oxfmt-", "biome-", "v8 ignore", "c8 ignore", "#__PURE__"]`.

- `participle-function` rejects a function whose name ends in a listed participle. It checks function declarations and `const` bindings of an arrow or function expression. Values are exempt, because `const settled = ...` is ordinary English. Only listed words count: `open`, `token` and `feed` end like participles, and none of them is one. A function is a verb phrase, because the reader meets it where something is about to happen. Option: `words`, default `["answered", "closing", "launching", "loading", "opening", "posting", "saving", "starting", "stopping", "applied", "asked", "attempted", "batched", "called", "catalogued", "chained", "checked", "closed", "connected", "counted", "delivered", "encoded", "expected", "fitted", "flattened", "focused", "framed", "hinted", "joined", "keyworded", "linked", "offered", "opened", "owned", "parsed", "quoted", "refused", "rehomed", "rejected", "relayed", "rendered", "replied", "rooted", "scored", "sealed", "settled", "shortened", "signed", "spoken", "staged", "stated", "synced", "tapped", "texted", "thinned", "touched", "verified", "woken", "written"]`.

- `similar-functions` rejects the later of two functions in one file that are the same function with different names in it. Each function is reduced to a token stream with every identifier replaced by `I`, every string by `S` and every number by `N`. Two functions match when the Jaccard similarity of their token trigrams reaches `similarity`. A function with fewer than `minTokens` tokens is skipped, because every short accessor looks like every other. Options: `similarity`, default `0.85`; `minTokens`, default `30`.

- `single-use-function` rejects a function binding that is referenced exactly once in its file. The name is a detour the reader takes for no gain, so inline it at the call site. Exported bindings are exempt because they are somebody else's seam. The default export is exempt too. A binding longer than `maxLength` characters is exempt because a body that long earns its name. Closures inside a function count, as do `Effect.fn(...)` and `Effect.fnUntraced(...)` bindings. Option: `maxLength`, default `900`.

- `suspect-of-suffix` rejects a variable, function, class, interface, type alias or class member whose name ends in `Of` after a lowercase letter. `somethingOf` names a projection, and most of them exist only to shorten a call site. Name the noun the value is, or the verb phrase that produces it. No options.

### Effect rules

- `no-union-state-with` rejects `Union.with(...)` when `Union` is a name in `unions`. A tagged union built with effect-machine's `State(...)` exposes `.with` at two levels. The variant's `State.Active.with(state, { count: 1 })` checks the fields it copies and sets. The union-level `State.with` types its partial as `unknown`, so a wrong field compiles. The check is by name; imports and types are not inspected. Option: `unions`, default `["State"]`.

### Calibration

The defaults come from one large Effect codebase. Each threshold was set by counting how many functions it flagged there. A maintainability floor of 20 flagged 0 functions, 30 flagged 16 and 35 flagged 54. An ABC ceiling of 30 flagged 10 functions and 40 flagged 3. For the companion rule `eslint/max-nested-callbacks`, a limit of 3 flagged 262 sites and 5 flagged 21.

To tune a threshold for another repository, start at a value that flags nothing and tighten it one step at a time. Read the functions each step adds. Stop at the step where the new hits are functions you would keep. Fix the rest, then tighten again later.

## Core rules that pair with guardrails

Guardrails cover what Oxlint's built-in rules do not. These built-in rules carry the rest of the same standard:

```ts
export default defineConfig({
  plugins: ["eslint", "typescript", "unicorn", "import"],
  rules: {
    "eslint/no-else-return": ["error", { allowElseIf: false }],
    "eslint/no-lonely-if": "error",
    "unicorn/no-negated-condition": "error",
    "eslint/max-params": ["error", 3],
    "eslint/max-nested-callbacks": ["error", 5],
    "eslint/max-depth": ["error", 3],
    "eslint/complexity": ["error", 22],
    "eslint/max-lines": ["error", 500],
    "import/max-dependencies": ["error", { max: 18 }],
    "import/no-default-export": "error",
    "typescript/consistent-type-imports": "error",
    "typescript/no-explicit-any": "error",
    "typescript/explicit-module-boundary-types": "error",
    "typescript/no-non-null-assertion": "error",
    "typescript/switch-exhaustiveness-check": "error",
  },
  overrides: [
    {
      files: ["src/**/*.ts"],
      rules: { "eslint/no-ternary": "error" },
    },
  ],
});
```

- `no-else-return`, `no-lonely-if` and `no-negated-condition` push code toward early returns. The reader takes one condition at a time and never holds an open brace in mind.
- `max-params` at 3: past three positional arguments, pass an object so the call site names each value.
- `max-nested-callbacks` at 5 and `max-depth` at 3 cap nesting where the size metrics do not.
- `import/no-default-export`: a named export gives a symbol one name across the codebase.
- `import/max-dependencies` at 18: more imports than that in one module means the subsystem is fragmented.
- `no-ternary` on `.ts` files only. In an Effect codebase `Option.match`, `Match` and `Bool.match` carry the decision, so a ternary is a missing domain decision. JSX is excluded on purpose: a ternary there shows both branches, which `cond && <X />` does not.

`switch-exhaustiveness-check` needs Oxlint's type-aware mode: `oxlint --type-aware` with `oxlint-tsgolint` installed. Without it the rule is silent.

### Recommended overrides

The globs are examples. Replace them with the paths the repository owns.

```ts
overrides: [
  {
    files: ["**/*.config.ts", "**/*.config.mts", "**/*.config.js", "**/*.config.mjs"],
    rules: { "import/no-default-export": "off", "guardrails/no-comments": "off" },
  },
  {
    files: ["**/scripts/**", "tools/**"],
    rules: {
      "typescript/explicit-module-boundary-types": "off",
      "import/no-default-export": "off",
      "guardrails/no-comments": "off",
    },
  },
  {
    files: ["**/generated/**"],
    rules: { "guardrails/no-comments": "off" },
  },
  {
    files: ["**/test/**", "**/*.test.ts", "**/*.test.tsx", "**/scripts/**"],
    rules: { "guardrails/maintainability-index": "off", "guardrails/abc-size": "off" },
  },
  {
    files: ["**/layers.ts", "**/test/**"],
    rules: { "import/max-dependencies": "off" },
  },
  {
    files: ["**/icons/**", "**/ui/**"],
    rules: { "eslint/no-ternary": "off", "guardrails/similar-functions": "off" },
  },
],
```

- Config files: a build tool reads a default export. That is the tool's contract.
- Scripts and tools: build scripts, which are not shipped source.
- Generated files: a generator wrote them.
- Tests and scripts: a test is a scenario, and one long body per case is the honest shape. The size metrics stay on for source.
- Composition roots and test harnesses fan out by design.
- View-layer directories (adjust the globs to the repository): an icon component is identical markup around different path data by design, and a view layer models no domain state that a tagged union would clarify.

A declaration file that mirrors a third party's names, such as a generated `env.d.ts`, gets `"guardrails/banned-vocabulary": "off"`.

## Violation examples

Each snippet is rejected at the default options. The sentence after it is the fix.

### `abc-size`

```ts
export const toInvoice = (row: InvoiceRow): Invoice => {
  const reference = Reference.format(Reference.fromInvoice(InvoiceId(row.id)));
  const lines = pipe(row.lines, Arr.map(toLine), Arr.filter(isBillable));
  const subtotal = round(Num.sumAll(lines.map(net)));
  const tax = pipe(subtotal, Num.multiply(taxRate(row.region)), round);
  const shipping = pipe(lines, Arr.map(weight), Num.sumAll, quote(row.address));
  const discount = pipe(
    Option.fromNullable(row.coupon),
    Option.map(applyTo(subtotal)),
    Option.getOrElse(() => 0),
  );
  const total = pipe(subtotal + tax + shipping - discount, round, clampAtZero);
  const currency = Currency(row.currency);
  const issued = parseDate(row.issued_at);
  const due = addDays(issued, row.terms);
  const paidAt = pipe(Option.fromNullable(row.paid_at), Option.map(parseDate));
  const status = Option.match(paidAt, { onNone: () => Due(due), onSome: Paid });
  const eta = estimate(row.address, row.placed_at);
  const notes = pipe(row.notes.split("\n"), Arr.map(trim), Arr.filter(nonEmpty));
  return Invoice.make({
    reference,
    lines,
    subtotal,
    tax,
    shipping,
    discount,
    total,
    currency,
    issued,
    due,
    status,
    eta,
    notes,
  });
};
```

`toInvoice` scores 36.8 (A 14, B 34, C 0). Split the mapper along its seams, such as money, dates and status, so each part is one function.

### `banned-vocabulary`

```ts
export const handleSubmit = (form: Form): Effect.Effect<void> => submit(form);
```

Name the outcome: `submitForm`.

### `call-chain`

```ts
const read = (path: string): Promise<string> => fs.readFile(path, "utf8");
const parse = (path: string): Promise<Config> => read(path).then(JSON.parse);
export const load = (path: string): Promise<Config> => parse(path);
```

The chain `parse -> read` is two private functions deep, and `single-use-function` reports `read` and `parse` as well. Inline `read` into `parse`, or let `load` do the work itself.

### `cognitive-complexity`

```ts
export const place = (items: ReadonlyArray<Item>, bins: ReadonlyArray<Bin>): void => {
  for (const item of items) {
    for (const bin of bins) {
      if (bin.full()) break;
      if (bin.open) {
        if (item.size <= bin.free) {
          if (item.fragile && bin.padded) {
            bin.take(item);
          } else if (item.plain) {
            bin.take(item);
          }
        }
      }
    }
  }
};
```

`place` scores 25. Move the inner decision into `fits(item, bin)` so each loop body reads in one line.

### `flag-argument`

```ts
export const open = (session: Session, force: boolean): Effect.Effect<Handle> =>
  force ? session.reopen() : session.open();
```

Export `open` and `reopen` as two functions.

### `halstead-difficulty` and `maintainability-index`

Both measures grow with length, so a snippet short enough for this page passes them. The `if` block below is the shape that fails. With 24 such blocks, one per order line with only the index changed, the function is 126 lines long. Its Halstead difficulty is 86. With 14 blocks it is 76 lines long and its maintainability index is 29.

```ts
export const settle = (order: Order, ledger: Ledger, clock: Clock): Settlement => {
  let balance = ledger.balance;
  let fees = 0;
  const notes: Array<string> = [];
  if (order.lines[0] !== undefined && order.lines[0].quantity > 0) {
    balance = balance - order.lines[0].quantity * order.lines[0].unitPrice;
    fees = fees + feeFor(order.lines[0], ledger.rate);
    notes.push(describeLine(order.lines[0], clock.now()));
  }
  return { balance, fees, notes, settledAt: clock.now() };
};
```

Loop over `order.lines` once and move the per-line arithmetic into `settleLine`.

### `nested-match`

```ts
export const label = (state: State): string =>
  State.$match(state, {
    Idle: () => "idle",
    Active: (active) =>
      Option.match(active.owner, {
        onNone: () => "unowned",
        onSome: (owner) =>
          Either.match(owner.plan, {
            onLeft: () => "free",
            onRight: (plan) => plan.name,
          }),
      }),
  });
```

Three matches nest here. Classify once: derive a `Plan` tag from the state in one function, then match on it once.

### `no-comments`

```ts
export const delay = (attempt: number): number => {
  // Double the wait each time.
  return 100 * 2 ** attempt;
};
```

Rename it `exponentialBackoff` and delete the comment.

### `participle-function`

```ts
export const opened = (path: string): Effect.Effect<Handle> => fs.open(path);
```

Name the work: `openFile`.

### `similar-functions`

```ts
export const totalPrice = (items: ReadonlyArray<Item>): number =>
  items
    .filter((item) => item.price > 0)
    .map((item) => item.price)
    .reduce((sum, price) => sum + price, 0);

export const totalWeight = (items: ReadonlyArray<Item>): number =>
  items
    .filter((item) => item.weight > 0)
    .map((item) => item.weight)
    .reduce((sum, weight) => sum + weight, 0);
```

`totalWeight` is 100% the same as `totalPrice`. Write one `sumBy(items, (item) => item.price)` and pass the field in.

### `single-use-function`

```ts
const greeting = (name: string): string => `Hello, ${name}`;

export const welcome = (name: string): string => greeting(name);
```

Inline it: `export const welcome = (name: string): string => \`Hello, ${name}\`;`.

### `suspect-of-suffix`

```ts
export const nameOf = (user: User): string => user.name;
```

Read `user.name` at the call site, or name what the function derives: `displayName(user)`.

### Effect: `no-union-state-with`

```ts
export const bump = (state: State): State => State.with(state, { count: state.count + 1 });
```

Call the variant, `State.Active.with(state, { count: state.count + 1 })`, so the partial is checked against `Active`.

## Analysis boundaries

The rules run on Oxlint's ESTree through `defineRule` from `@oxlint/plugins`. There is no type checker and no scope analysis. Matching is by name and by shape.

- Every rule sees one file. `call-chain`, `single-use-function` and `similar-functions` compare functions within one module. An export is the only cross-file signal, so exported functions are exempt from the first two.
- `single-use-function` counts references by identifier name. A parameter, a shorthand property `{ open }` or a JSX tag with the same name counts as a use. The member name in `session.open` and the key in `{ open: ... }` do not.
- `flag-argument` needs an explicit `boolean` or `Boolean` annotation on a plain identifier parameter. A default value alone, or a destructured parameter, is not inspected.
- `nested-match` and `no-union-state-with` match callee names. `text.match(regex)` is a match, and any binding named `State` is a union.
- `abc-size` and the cyclomatic term of `maintainability-index` stop at a nested function, which is measured on its own. `cognitive-complexity`, Halstead volume and Halstead difficulty include nested functions in the parent; a nested closure resets the nesting depth to 0 but its branches still count.
- `banned-vocabulary`, `participle-function` and `suspect-of-suffix` check declarations. An import or a call to a library function with a listed word is not reported.

## Development

```bash
pnpm install
pnpm check
```

`src/` is canonical. Each rule file has a `.test.ts` beside it, and `pnpm check:rule-tests` fails when a rule lacks one or is missing from its plugin index. After a change to `src/`, run `pnpm sync:skill-assets`. It refreshes `skills/install-guardrails/assets/guardrails/`, the copy the skill installs, and CI fails when the two differ. `pnpm check` runs the format check, Oxlint, the TypeScript typecheck, the tests, the skill-asset check and the rule-test check.

Pinned versions: `oxlint` and `@oxlint/plugins` 1.79.0, TypeScript 7.0.2, oxfmt 0.65.0, Node 24, pnpm 10.28.1.

## License

MIT. See `LICENSE`.
