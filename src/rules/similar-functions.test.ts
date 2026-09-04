import { RuleTester } from "oxlint/plugins-dev";

import { similarFunctionsRule } from "./similar-functions.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

const loadUser = `
const loadUser = async (id: string) => {
  const response = await fetch("/users/" + id);
  if (!response.ok) throw new Error("user");
  const body = await response.json();
  return body.user;
};
`;

const loadOrder = `
const loadOrder = async (id: string) => {
  const response = await fetch("/orders/" + id);
  if (!response.ok) throw new Error("order");
  const body = await response.json();
  return body.order;
};
`;

const loadInvoice = `
const loadInvoice = async (id: string) => {
  const response = await fetch("/invoices/" + id);
  if (!response.ok) throw new Error("invoice");
  const body = await response.json();
  return body.invoice;
};
`;

const loadOrderId = `
const loadOrderId = async (id: string) => {
  const response = await fetch("/orders/" + id);
  if (!response.ok) throw new Error("order");
  const body = await response.json();
  return body.order.id;
};
`;

const loadOrderGuarded = `
const loadOrderGuarded = async (id: string) => {
  const response = await fetch("/orders/" + id);
  if (!response.ok) throw new Error("order");
  const body = await response.json();
  if (body.error) return null;
  return body.order;
};
`;

const loadOrderTwiceGuarded = `
const loadOrderTwiceGuarded = async (id: string) => {
  const response = await fetch("/orders/" + id);
  if (!response.ok) throw new Error("order");
  const body = await response.json();
  if (body.error) return null;
  if (body.stale) return undefined;
  return body.order;
};
`;

const sumAll = `
const sumAll = (items: ReadonlyArray<number>) => {
  let total = 0;
  for (const item of items) {
    total += item;
  }
  return total;
};
`;

const addLeft = `
const addLeft = (left: number, right: number) => {
  const total = left + right;
  return total * 2;
};
`;

const addRight = `
const addRight = (first: number, second: number) => {
  const sum = first + second;
  return sum * 3;
};
`;

tester.run("similar-functions", similarFunctionsRule, {
  valid: [
    {
      name: "a single function has nothing to match",
      code: loadUser,
    },
    {
      name: "two functions with different structure are not similar",
      code: loadUser + sumAll,
    },
    {
      name: "two identical functions below minTokens are skipped",
      code: addLeft + addRight,
    },
    {
      name: "a function 80% the same is below the default floor",
      code: loadUser + loadOrderTwiceGuarded,
    },
    {
      name: "schema and table declarations are not fingerprinted",
      code: `
export class User extends Schema.Class<User>("User")({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  createdAt: Schema.Date,
}) {}
export class Order extends Schema.Class<Order>("Order")({
  id: Schema.String,
  total: Schema.Number,
  currency: Schema.String,
  createdAt: Schema.Date,
}) {}
export const users = table("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
});
export const orders = table("orders", {
  id: text("id").primaryKey(),
  total: integer("total").notNull(),
  currency: text("currency").notNull(),
});
`,
    },
    {
      name: "anonymous callbacks are not fingerprinted",
      code: `
export const users = ids.map(async (id: string) => {
  const response = await fetch("/users/" + id);
  if (!response.ok) throw new Error("user");
  const body = await response.json();
  return body.user;
});
export const orders = ids.map(async (id: string) => {
  const response = await fetch("/orders/" + id);
  if (!response.ok) throw new Error("order");
  const body = await response.json();
  return body.order;
});
`,
    },
    {
      name: "class methods are not fingerprinted",
      code: `
export class Users {
  async load(id: string) {
    const response = await fetch("/users/" + id);
    if (!response.ok) throw new Error("user");
    const body = await response.json();
    return body.user;
  }
}
export class Orders {
  async load(id: string) {
    const response = await fetch("/orders/" + id);
    if (!response.ok) throw new Error("order");
    const body = await response.json();
    return body.order;
  }
}
`,
    },
    {
      name: "similarity raised to 0.9 allows a function 85% the same",
      options: [{ similarity: 0.9 }],
      code: loadUser + loadOrderGuarded,
    },
    {
      name: "minTokens raised to 50 skips two identical 49-token functions",
      options: [{ minTokens: 50 }],
      code: loadUser + loadOrder,
    },
  ],

  invalid: [
    {
      name: "two functions that differ only in names and strings are reported",
      code: loadUser + loadOrder,
      errors: [
        {
          messageId: "similar",
          data: { first: "loadUser", second: "loadOrder", percent: "100" },
          line: 9,
          column: 18,
        },
      ],
    },
    {
      name: "function declarations are fingerprinted with their header",
      code: `
function loadUser(id: string) {
  const response = fetch("/users/" + id);
  if (!response.ok) throw new Error("user");
  const body = response.json();
  return body.user;
}
function loadOrder(id: string) {
  const response = fetch("/orders/" + id);
  if (!response.ok) throw new Error("order");
  const body = response.json();
  return body.order;
}
`,
      errors: [
        {
          messageId: "similar",
          data: { first: "loadUser", second: "loadOrder", percent: "100" },
          line: 8,
          column: 0,
        },
      ],
    },
    {
      name: "three clones are each reported against the first",
      code: loadUser + loadOrder + loadInvoice,
      errors: [
        {
          messageId: "similar",
          data: { first: "loadUser", second: "loadOrder", percent: "100" },
        },
        {
          messageId: "similar",
          data: { first: "loadUser", second: "loadInvoice", percent: "100" },
        },
      ],
    },
    {
      name: "one extra member access leaves the pair 98% the same",
      code: loadUser + loadOrderId,
      errors: [
        {
          messageId: "similar",
          data: { first: "loadUser", second: "loadOrderId", percent: "98" },
        },
      ],
    },
    {
      name: "a function exactly at the floor is reported",
      code: loadUser + loadOrderGuarded,
      errors: [
        {
          messageId: "similar",
          data: { first: "loadUser", second: "loadOrderGuarded", percent: "85" },
        },
      ],
    },
    {
      name: "numbers are normalised",
      code: `
const scaleUp = (items: ReadonlyArray<number>) => {
  let total = 0;
  for (const item of items) {
    total += item * 10;
  }
  return total;
};
const scaleDown = (items: ReadonlyArray<number>) => {
  let total = 1;
  for (const item of items) {
    total += item * 0.5;
  }
  return total;
};
`,
      errors: [
        {
          messageId: "similar",
          data: { first: "scaleUp", second: "scaleDown", percent: "100" },
        },
      ],
    },
    {
      name: "a template literal with interpolations is one string token",
      code: `
const userUrl = (id: string, page: number) => {
  const base = \`/users/\${id}?page=\${page}\`;
  if (page < 0) throw new Error("page");
  const url = new URL(base, "https://example.com");
  return url.toString();
};
const orderUrl = (id: string, page: number) => {
  const base = "/orders/" + id;
  if (page < 0) throw new Error("page");
  const url = new URL(base, "https://example.com");
  return url.toString();
};
`,
      errors: [
        {
          messageId: "similar",
          data: { first: "userUrl", second: "orderUrl", percent: "87" },
        },
      ],
    },
    {
      name: "Effect.fn wrappers are fingerprinted",
      code: `
const loadUser = Effect.fn("loadUser")(function* (id: string) {
  const response = yield* http.get("/users/" + id);
  if (!response.ok) return yield* Effect.fail(new NotFound("user"));
  const body = yield* response.json();
  return body.user;
});
const loadOrder = Effect.fn("loadOrder")(function* (id: string) {
  const response = yield* http.get("/orders/" + id);
  if (!response.ok) return yield* Effect.fail(new NotFound("order"));
  const body = yield* response.json();
  return body.order;
});
`,
      errors: [
        {
          messageId: "similar",
          data: { first: "loadUser", second: "loadOrder", percent: "100" },
        },
      ],
    },
    {
      name: "named functions inside a body are fingerprinted too",
      code: `
export const start = () => {
  const loadUser = async (id: string) => {
    const response = await fetch("/users/" + id);
    if (!response.ok) throw new Error("user");
    const body = await response.json();
    return body.user;
  };
  const loadOrder = async (id: string) => {
    const response = await fetch("/orders/" + id);
    if (!response.ok) throw new Error("order");
    const body = await response.json();
    return body.order;
  };
  return [loadUser, loadOrder];
};
`,
      errors: [
        {
          messageId: "similar",
          data: { first: "loadUser", second: "loadOrder", percent: "100" },
          line: 9,
        },
      ],
    },
    {
      name: "similarity lowered to 0.75 reports a function 80% the same",
      options: [{ similarity: 0.75 }],
      code: loadUser + loadOrderTwiceGuarded,
      errors: [
        {
          messageId: "similar",
          data: { first: "loadUser", second: "loadOrderTwiceGuarded", percent: "80" },
        },
      ],
    },
    {
      name: "minTokens lowered to 20 reports two identical 24-token functions",
      options: [{ minTokens: 20 }],
      code: addLeft + addRight,
      errors: [
        {
          messageId: "similar",
          data: { first: "addLeft", second: "addRight", percent: "100" },
        },
      ],
    },
  ],
});
