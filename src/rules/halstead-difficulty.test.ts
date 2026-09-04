import { RuleTester } from "oxlint/plugins-dev";

import { halsteadDifficultyRule } from "./halstead-difficulty.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

/** Five distinct operators over one name: difficulty (5 / 2) * (uses / distinct operands). */
const CHAIN = "x + x - x * x / x % x";

/** Twelve distinct assignment operators over one name. */
const ASSIGNMENTS = [
  "x += x;",
  "x -= x;",
  "x *= x;",
  "x /= x;",
  "x %= x;",
  "x **= x;",
  "x <<= x;",
  "x >>= x;",
  "x >>>= x;",
  "x &= x;",
  "x |= x;",
  "x ^= x;",
].join("\n");

const denseFunction = `function dense(x) {\n${ASSIGNMENTS}\nx &&= x;\nx ||= x;\nx ??= x;\n}`;

tester.run("halstead-difficulty", halsteadDifficultyRule, {
  valid: [
    {
      name: "a function without operators scores 0",
      code: "const id = (x) => x;",
    },
    {
      name: "an empty function scores 0",
      code: "function noop() {}",
    },
    {
      name: "a short arithmetic chain stays under the ceiling",
      code: `function f(x) { return ${CHAIN}; }`,
    },
    {
      name: "a score at the ceiling passes",
      code: `function f(x) { return ${CHAIN}; }`,
      options: [{ ceiling: 10 }],
    },
    {
      name: "the score is rounded before the comparison",
      code: "const f = (a, b, c) => a + b - c * a / b % c + a;",
      options: [{ ceiling: 8 }],
    },
    {
      name: "an identifier in a type position is an operand",
      code: `function f(x: Foo): Foo { return ${CHAIN}; }`,
      options: [{ ceiling: 9 }],
    },
    {
      name: "the ceiling option raises the limit",
      code: denseFunction,
      options: [{ ceiling: 120 }],
    },
  ],
  invalid: [
    {
      name: "many distinct operators over one reused name",
      code: denseFunction,
      errors: [
        {
          messageId: "tooDense",
          data: { name: "dense", score: "120", ceiling: "80" },
          line: 1,
          column: 0,
        },
      ],
    },
    {
      name: "unary, update, await, yield, new, spread, call, member, template and logical operators all count",
      code: [
        "async function* kinds(x) {",
        "x = -x;",
        "x = +x;",
        "x = !x;",
        "x = ~x;",
        "x = typeof x;",
        "x = void x;",
        "delete x.x;",
        "x++;",
        "x--;",
        "await x;",
        "yield x;",
        "new x(...x);",
        "x(...x);",
        "`${x}`;",
        "x && x;",
        "x || x;",
        "x ?? x;",
        "}",
      ].join("\n"),
      errors: [{ messageId: "tooDense", data: { name: "kinds", score: "155", ceiling: "80" } }],
    },
    {
      name: "a nested function is included in the enclosing score",
      code: `const outer = () => {\n  const inner = (x) => {\n${ASSIGNMENTS}\n  };\n  return inner;\n};`,
      errors: [
        {
          messageId: "tooDense",
          data: { name: "outer", score: "81", ceiling: "80" },
          line: 1,
          column: 14,
        },
        {
          messageId: "tooDense",
          data: { name: "inner", score: "150", ceiling: "80" },
          line: 2,
          column: 16,
        },
      ],
    },
    {
      name: "a member property name is an operand",
      code: "function f(o) { return o.x.x.x.x.x.x.x.x.x.x; }",
      options: [{ ceiling: 1 }],
      errors: [{ messageId: "tooDense", data: { name: "f", score: "2", ceiling: "1" } }],
    },
    {
      name: "a literal is an operand",
      code: "function f() { return 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1; }",
      options: [{ ceiling: 4 }],
      errors: [{ messageId: "tooDense", data: { name: "f", score: "5", ceiling: "4" } }],
    },
    {
      name: "template text is not an operand",
      code: "const f = (a) => `x${a}y${a}z${a}w`;",
      options: [{ ceiling: 1 }],
      errors: [{ messageId: "tooDense", data: { name: "f", score: "2", ceiling: "1" } }],
    },
    {
      name: "the rounded score is what the message prints",
      code: "const f = (a, b, c) => a + b - c * a / b % c + a;",
      options: [{ ceiling: 7 }],
      errors: [{ messageId: "tooDense", data: { name: "f", score: "8", ceiling: "7" } }],
    },
    {
      name: "a callback is named for its enclosing binding",
      code: `const outer = (items) => items.map(function (x) { return ${CHAIN}; });`,
      options: [{ ceiling: 17 }],
      errors: [
        {
          messageId: "tooDense",
          data: { name: "the body of outer", score: "18", ceiling: "17" },
          line: 1,
          column: 35,
        },
      ],
    },
    {
      name: "an Effect.fn body is named for its binding",
      code: `const run = Effect.fn("run")(function* (x) { return ${CHAIN}; });`,
      options: [{ ceiling: 17 }],
      errors: [
        {
          messageId: "tooDense",
          data: { name: "the body of run", score: "18", ceiling: "17" },
        },
      ],
    },
    {
      name: "the ceiling option lowers the limit",
      code: `function f(x) { return ${CHAIN}; }`,
      options: [{ ceiling: 9 }],
      errors: [{ messageId: "tooDense", data: { name: "f", score: "10", ceiling: "9" } }],
    },
  ],
});
