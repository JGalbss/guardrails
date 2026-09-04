import { RuleTester } from "oxlint/plugins-dev";

import { maintainabilityIndexRule } from "./maintainability-index.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

/** `count` lines of one two-way decision: each adds two paths, three operands and one line. */
const decisions = (count: number): string =>
  Array.from({ length: count }, () => "if (a && b) {}").join("\n");

tester.run("maintainability-index", maintainabilityIndexRule, {
  valid: [
    {
      name: "a one-line function is close to 100",
      code: "const id = (x) => x;",
    },
    {
      name: "a branchy function of moderate length stays above the floor",
      code: `function branchy(a, b) {\n${decisions(50)}\n}`,
    },
    {
      name: "a short body on one line is not penalised for lines",
      code: "function f(a, b) { return a && b; }",
      options: [{ floor: 50 }],
    },
    {
      name: "an index at the floor passes",
      code: `function f(a, b) {\n${decisions(20)}\n}`,
      options: [{ floor: 50 }],
    },
    {
      name: "the floor option lowers the limit",
      code: `function branchy(a, b) {\n${decisions(70)}\n}`,
      options: [{ floor: 10 }],
    },
  ],
  invalid: [
    {
      name: "a function that is long, dense and branchy at once",
      code: `function branchy(a, b) {\n${decisions(70)}\n}`,
      errors: [
        {
          messageId: "unmaintainable",
          data: { name: "branchy", index: "22", floor: "30" },
          line: 1,
          column: 0,
        },
      ],
    },
    {
      name: "an index just below the floor is reported",
      code: `function branchy(a, b) {\n${decisions(60)}\n}`,
      errors: [
        { messageId: "unmaintainable", data: { name: "branchy", index: "27", floor: "30" } },
      ],
    },
    {
      name: "lines are measured from the signature to the closing brace",
      code: `function f(a, b) {\n${"\n".repeat(120)}return a && b;\n}`,
      options: [{ floor: 50 }],
      errors: [{ messageId: "unmaintainable", data: { name: "f", index: "47", floor: "50" } }],
    },
    {
      name: "decisions inside a nested function count only for the nested function",
      code: `const outer = (a, b) => {\nconst inner = () => {\n${decisions(70)}\n};\nreturn inner;\n};`,
      errors: [
        {
          messageId: "unmaintainable",
          data: { name: "inner", index: "23", floor: "30" },
          line: 2,
          column: 14,
        },
      ],
    },
    {
      name: "a callback is named for its enclosing binding",
      code: `const outer = (items, a, b) => {\nitems.forEach(function () {\n${decisions(70)}\n});\n};`,
      errors: [
        {
          messageId: "unmaintainable",
          data: { name: "the body of outer", index: "23", floor: "30" },
          line: 2,
          column: 14,
        },
      ],
    },
    {
      name: "an Effect.fn body is named for its binding",
      code: `const run = Effect.fn("run")(function* (a, b) {\n${decisions(70)}\n});`,
      errors: [
        {
          messageId: "unmaintainable",
          data: { name: "the body of run", index: "23", floor: "30" },
        },
      ],
    },
    {
      name: "the floor option raises the limit",
      code: `function f(a, b) {\n${decisions(20)}\n}`,
      options: [{ floor: 51 }],
      errors: [{ messageId: "unmaintainable", data: { name: "f", index: "50", floor: "51" } }],
    },
  ],
});
