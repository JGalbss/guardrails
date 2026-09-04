import { RuleTester } from "oxlint/plugins-dev";

import { cognitiveComplexityRule } from "./cognitive-complexity.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

/** `count` copies of `line`, each on its own line. */
const repeatLine = (line: string, count: number): string =>
  Array.from({ length: count }, () => line).join("\n");

tester.run("cognitive-complexity", cognitiveComplexityRule, {
  valid: [
    {
      name: "a function without branches scores 0",
      code: "function plain(a) { return a; }",
    },
    {
      name: "a score at the ceiling passes",
      code: `function flat(a) {\n${repeatLine("if (a) {}", 22)}\n}`,
    },
    {
      name: "a run of one logical operator scores once",
      code: `function runs(a, b, c, d) {\n${repeatLine("a && b && c && d;", 22)}\n}`,
    },
    {
      name: "a plain else adds nothing",
      code: "function f(a) { if (a) {} else {} }",
      options: [{ ceiling: 1 }],
    },
    {
      name: "try and finally add nothing",
      code: "function f() { try {} finally {} }",
      options: [{ ceiling: 0 }],
    },
    {
      name: "a switch scores once, not once per case",
      code: "function f(a) { switch (a) { case 1: break; case 2: break; default: break; } }",
      options: [{ ceiling: 1 }],
    },
    {
      name: "a ternary scores without deepening the nesting",
      code: "function f(a, b, c, d, e, g, h) { return a ? (b ? (c ? d : e) : g) : h; }",
      options: [{ ceiling: 3 }],
    },
    {
      name: "nesting resets inside a nested function",
      code: "function f(a, items) { if (a) { items.map((x) => { if (x) {} }); } }",
      options: [{ ceiling: 2 }],
    },
    {
      name: "the ceiling option raises the limit",
      code: `function flat(a) {\n${repeatLine("if (a) {}", 23)}\n}`,
      options: [{ ceiling: 23 }],
    },
  ],
  invalid: [
    {
      name: "flat branches over the ceiling",
      code: `function flat(a) {\n${repeatLine("if (a) {}", 23)}\n}`,
      errors: [
        {
          messageId: "tooTangled",
          data: { name: "flat", score: "23", ceiling: "22" },
          line: 1,
          column: 0,
        },
      ],
    },
    {
      name: "a nested branch scores one plus its depth",
      code: "function deep(a) { if (a) { if (a) { if (a) { if (a) { if (a) { if (a) { if (a) {} } } } } } } }",
      errors: [{ messageId: "tooTangled", data: { name: "deep", score: "28", ceiling: "22" } }],
    },
    {
      name: "a different logical operator starts a new run",
      code: `function f(a, b, c) {\n${repeatLine("a && b || c;", 12)}\n}`,
      errors: [{ messageId: "tooTangled", data: { name: "f", score: "24", ceiling: "22" } }],
    },
    {
      name: "a nested function still adds to the enclosing score",
      code: `function outer(a) {\n${repeatLine("if (a) {}", 12)}\nconst inner = () => {\n${repeatLine("if (a) {}", 11)}\n};\nreturn inner;\n}`,
      errors: [{ messageId: "tooTangled", data: { name: "outer", score: "23", ceiling: "22" } }],
    },
    {
      name: "a const arrow takes its binding name",
      code: `const route = (a) => {\n${repeatLine("if (a) {}", 23)}\n};`,
      errors: [
        {
          messageId: "tooTangled",
          data: { name: "route", score: "23", ceiling: "22" },
          line: 1,
          column: 14,
        },
      ],
    },
    {
      name: "a callback is named for its enclosing binding and counts toward it",
      code: `const outer = (items, a) => {\n  items.forEach(function () {\n${repeatLine("if (a) {}", 23)}\n  });\n};`,
      errors: [
        {
          messageId: "tooTangled",
          data: { name: "outer", score: "23", ceiling: "22" },
          line: 1,
          column: 14,
        },
        {
          messageId: "tooTangled",
          data: { name: "the body of outer", score: "23", ceiling: "22" },
          line: 2,
          column: 16,
        },
      ],
    },
    {
      name: "an else if is nested inside the alternate",
      code: "function f(a, b) { if (a) {} else if (b) {} }",
      options: [{ ceiling: 2 }],
      errors: [{ messageId: "tooTangled", data: { name: "f", score: "3", ceiling: "2" } }],
    },
    {
      name: "the test of an if is nested too",
      code: "function f(a, b, c) { if (a ? b : c) {} }",
      options: [{ ceiling: 2 }],
      errors: [{ messageId: "tooTangled", data: { name: "f", score: "3", ceiling: "2" } }],
    },
    {
      name: "a catch clause scores and nests while a try adds nothing",
      code: "function f(a) { try {} catch (e) { if (a) {} } }",
      options: [{ ceiling: 2 }],
      errors: [{ messageId: "tooTangled", data: { name: "f", score: "3", ceiling: "2" } }],
    },
    {
      name: "every loop kind scores and nests",
      code: "function f(a, b) { for (;;) { while (a) { do {} while (b); } } }",
      options: [{ ceiling: 5 }],
      errors: [{ messageId: "tooTangled", data: { name: "f", score: "6", ceiling: "5" } }],
    },
    {
      name: "for-in and for-of score and nest",
      code: "function f(o) { for (const k in o) { for (const v of o) {} } }",
      options: [{ ceiling: 2 }],
      errors: [{ messageId: "tooTangled", data: { name: "f", score: "3", ceiling: "2" } }],
    },
    {
      name: "a run of ?? scores once",
      code: "function f(a, b, c) { a ?? b ?? c; }",
      options: [{ ceiling: 0 }],
      errors: [{ messageId: "tooTangled", data: { name: "f", score: "1", ceiling: "0" } }],
    },
    {
      name: "?? followed by || is two runs",
      code: "function f(a, b, c) { (a ?? b) || c; }",
      options: [{ ceiling: 1 }],
      errors: [{ messageId: "tooTangled", data: { name: "f", score: "2", ceiling: "1" } }],
    },
    {
      name: "a parenthesised run inside another run scores once more",
      code: "function f(a, b, c, d) { a || (b && c) || d; }",
      options: [{ ceiling: 1 }],
      errors: [{ messageId: "tooTangled", data: { name: "f", score: "2", ceiling: "1" } }],
    },
    {
      name: "the ceiling option lowers the limit",
      code: "function once(a) { if (a) {} }",
      options: [{ ceiling: 0 }],
      errors: [{ messageId: "tooTangled", data: { name: "once", score: "1", ceiling: "0" } }],
    },
  ],
});
