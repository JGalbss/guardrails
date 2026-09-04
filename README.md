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

## Example

`examples/before.ts` is a small Effect program written the way a coding agent often writes it. Comments explain each step, one-use helpers wrap each piece, boolean flags steer the behavior, and casts paper over `unknown`. It compiles.

```ts
import { Context, Effect } from "effect";

// Shape of a customer as it comes back from the repository
export interface CustomerShape {
  id: string;
  email: string;
  status: string;
  metadata: Record<string, unknown>;
}

// Shape of one order line
export interface LineShape {
  sku: string;
  unitAmount: number;
  quantity: number;
}

export interface OrderShape {
  id: string;
  lines: Array<LineShape>;
}

export interface InvoiceShape {
  customerId: string;
  total: number;
  lineCount: number;
}

// Repository for customers and orders
export class OrderRepository extends Context.Service<
  OrderRepository,
  {
    getCustomer(id: string): Effect.Effect<unknown>;
    listOrders(id: string): Effect.Effect<ReadonlyArray<OrderShape>>;
  }
>()("examples/OrderRepository") {}

// Mailer used to send invoices
export class Mailer extends Context.Service<
  Mailer,
  { send(to: string, invoice: InvoiceShape): Effect.Effect<void> }
>()("examples/Mailer") {}

// Helper to check whether the customer can be invoiced
const isActive = (customer: any) => customer.status === "active";

// Helper to compute the total of one order
const totalOf = (order: OrderShape) => {
  let total = 0;
  for (const line of order.lines) {
    total += line.unitAmount * line.quantity;
  }
  return total;
};

// Gather the totals of every order
const gatherTotals = (orders: ReadonlyArray<OrderShape>) => orders.map(totalOf);

// Build the invoice object from the totals
const buildInvoice = (customerId: string, totals: number[], lineCount: number): InvoiceShape => ({
  customerId,
  total: totals.reduce((sum, total) => sum + total, 0),
  lineCount,
});

// Loading the customer from the repository
const loading = (id: string) =>
  Effect.gen(function* () {
    const repo = yield* OrderRepository;
    const raw = yield* repo.getCustomer(id);
    // The repository returns unknown, so cast it to the customer shape
    return raw as unknown as CustomerShape;
  });

/**
 * Process the invoice for one customer.
 * @param customerId - the customer to invoice
 * @param sendEmail - whether to email the invoice
 * @param dryRun - whether to skip side effects
 * @param verbose - whether to log progress
 */
export const processInvoice = (
  customerId: string,
  sendEmail: boolean,
  dryRun: boolean,
  verbose: boolean,
) =>
  Effect.gen(function* () {
    const repo = yield* OrderRepository;
    const mailer = yield* Mailer;
    const customer = yield* loading(customerId);
    if (!isActive(customer)) {
      return null;
    } else {
      const orders = yield* repo.listOrders(customerId);
      const totals = gatherTotals(orders);
      let lineCount = 0;
      for (const order of orders) {
        lineCount += order.lines.length;
      }
      const invoice = buildInvoice(customerId, totals, lineCount);
      if (verbose) {
        yield* Effect.log(`built invoice for ${invoice.total}`);
      }
      if (!dryRun) {
        if (sendEmail) {
          yield* mailer.send(customer.email!, invoice);
        }
      }
      return invoice;
    }
  });

// Handler for raw requests coming from the API
export const requestHandler = (input: unknown) => {
  if (typeof input === "string") {
    return processInvoice(input, true, false, false);
  }
  const body = input as { customerId: string; dryRun?: boolean };
  return processInvoice(body.customerId, true, body.dryRun ?? false, false);
};
```

With the preset, Oxlint reports 51 problems from 19 rules. Some of them, shortened:

```
before.ts:44:1   guardrails(no-comments): Comments are banned in source. Rename the thing, split the function, or model the state so the code says this.
before.ts:45:7   guardrails(single-use-function): The function "isActive" is used once. Inline it at its only call site.
before.ts:48:7   guardrails(suspect-of-suffix): The name "totalOf" ends in "Of", which names a projection. Prefer the noun it returns, or a verb phrase.
before.ts:57:7   guardrails(call-chain): The chain "gatherTotals -> totalOf" is 2 private functions deep; the limit is 1.
before.ts:67:7   guardrails(participle-function): The function "loading" is named for the state something ends in. Name the work it does.
before.ts:72:12  anti-slop(no-chained-type-assertions): This assertion chain discards type evidence. Parse untrusted input at its boundary before narrowing it.
before.ts:82:14  guardrails(banned-vocabulary): The name "processInvoice" contains the banned word "process".
before.ts:84:3   guardrails(flag-argument): The parameter "sendEmail" is a boolean flag. Split the function, or pass a value whose name says what it means.
before.ts:93:7   eslint(no-else-return): Unnecessary `else` after `return`.
before.ts:115:39 anti-slop(no-unknown-parameters): Parameter `input` leaves input unparsed. Run the expected schema at the I/O boundary.
before.ts:116:7  anti-slop(no-runtime-typeof): A `typeof` check narrows a representation without establishing its contract.
```

`examples/after.ts` is the same program after every report is fixed. Oxlint reports nothing.

```ts
import { Array as Arr, Context, Data, Effect, Number as Num, Schema } from "effect";

export class Line extends Schema.Class<Line>("Line")({
  sku: Schema.String,
  unitAmount: Schema.Number,
  quantity: Schema.Number,
}) {}

export class Order extends Schema.Class<Order>("Order")({
  id: Schema.String,
  lines: Schema.Array(Line),
}) {}

export class ActiveCustomer extends Schema.TaggedClass<ActiveCustomer>()("ActiveCustomer", {
  id: Schema.String,
  email: Schema.String,
}) {}

export class ClosedCustomer extends Schema.TaggedClass<ClosedCustomer>()("ClosedCustomer", {
  id: Schema.String,
}) {}

export const Customer = Schema.Union([ActiveCustomer, ClosedCustomer]);
export type Customer = typeof Customer.Type;

export class Invoice extends Schema.Class<Invoice>("Invoice")({
  customerId: Schema.String,
  total: Schema.Number,
  lineCount: Schema.Number,
}) {}

export class CustomerClosed extends Schema.TaggedError<CustomerClosed>()("CustomerClosed", {
  customerId: Schema.String,
}) {}

export class Orders extends Context.Service<
  Orders,
  {
    readonly customer: (id: string) => Effect.Effect<Customer>;
    readonly forCustomer: (id: string) => Effect.Effect<ReadonlyArray<Order>>;
  }
>()("examples/Orders") {}

export class Mail extends Context.Service<
  Mail,
  { readonly send: (to: string, invoice: Invoice) => Effect.Effect<void> }
>()("examples/Mail") {}

export type Delivery = Data.TaggedEnum<{
  readonly Send: {};
  readonly Preview: {};
}>;
export const Delivery = Data.taggedEnum<Delivery>();

export const invoice = Effect.fn("invoice")(function* (customerId: string, delivery: Delivery) {
  const orders = yield* Orders;
  const mail = yield* Mail;

  const customer = yield* orders.customer(customerId);
  if (customer._tag === "ClosedCustomer") return yield* new CustomerClosed({ customerId });

  const lines = Arr.flatMap(yield* orders.forCustomer(customerId), (order) => order.lines);
  const document = new Invoice({
    customerId,
    total: Num.sumAll(Arr.map(lines, (line) => line.unitAmount * line.quantity)),
    lineCount: lines.length,
  });

  return yield* Delivery.$match(delivery, {
    Preview: () => Effect.succeed(document),
    Send: () => Effect.as(mail.send(customer.email, document), document),
  });
});

export class InvoiceRequest extends Schema.Class<InvoiceRequest>("InvoiceRequest")({
  customerId: Schema.String,
  delivery: Schema.Literals(["send", "preview"]),
}) {}

export const decodeRequest = Schema.decodeUnknownEffect(InvoiceRequest);

const deliveries: Record<InvoiceRequest["delivery"], Delivery> = {
  send: Delivery.Send(),
  preview: Delivery.Preview(),
};

export const fromRequest = Effect.fn("fromRequest")(function* (request: InvoiceRequest) {
  return yield* invoice(request.customerId, deliveries[request.delivery]);
});
```

The helpers are gone, and each step sits where it is read, so the operation reads top to bottom. Customers are a tagged union, so a closed customer is a typed error instead of a `null`. The three boolean flags are one `Delivery` value with two cases. The `unknown` input is decoded with a `Schema` at the boundary, so no cast remains. Names say what a value is: `invoice`, `lines`, `document`, `deliveries`.

Run `pnpm demo` to print both reports.

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
