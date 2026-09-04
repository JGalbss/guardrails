import { RuleTester } from "oxlint/plugins-dev";

import { abcSizeRule } from "./abc-size.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

/** `count` copies of `line`, each on its own line, with every `#` replaced by the line index. */
const repeatLine = (line: string, count: number): string =>
  Array.from({ length: count }, (_, index) => line.replaceAll("#", String(index))).join("\n");

const everyCondition = `function decides(a, b, c, o) {
  if (a) {}
  a ? b : c;
  for (;;) {}
  for (const k in o) {}
  for (const k of o) {}
  while (a) {}
  do {} while (a);
  try {} catch (e) {}
  switch (a) { case 1: break; default: break; }
  a && b;
  a || b;
  a ?? b;
  a === b;
  a !== b;
  a == b;
  a != b;
  a < b;
  a <= b;
  a > b;
  a >= b;
  a + b;
  a instanceof b;
  a in o;
}`;

tester.run("abc-size", abcSizeRule, {
  valid: [
    {
      name: "a small function has size 0",
      code: "function small(a) { return a + 1; }",
    },
    {
      name: "a size at the ceiling passes",
      code: `function fills() {\n${repeatLine("const v# = #;", 35)}\n}`,
    },
    {
      name: "await, yield and tagged templates are not branches",
      code: `async function* waits(a, tag) {\n${repeatLine("await a;", 12)}\n${repeatLine("yield a;", 12)}\n${repeatLine("tag`x`;", 12)}\n}`,
    },
    {
      name: "a declaration without an initializer is not an assignment",
      code: `function declares() {\n${repeatLine("let v#;", 36)}\n}`,
    },
    {
      name: "a nested function is scored on its own, not with its parent",
      code: `function outer() {\n${repeatLine("const v# = #;", 20)}\nconst inner = () => {\n${repeatLine("const w# = #;", 20)}\n};\nreturn inner;\n}`,
    },
    {
      name: "type annotations add nothing to the size",
      code: `function typed<T extends string>(x: T extends "a" ? 1 : 2, y: Array<T>): Promise<T | undefined> {\n${repeatLine("const v# = #;", 35)}\nreturn y;\n}`,
    },
    {
      name: "the ceiling option raises the limit",
      code: `function fills() {\n${repeatLine("const v# = #;", 36)}\n}`,
      options: [{ ceiling: 36 }],
    },
  ],
  invalid: [
    {
      name: "assignments alone push the size over the ceiling",
      code: `function assigns() {\n${repeatLine("const v# = #;", 36)}\n}`,
      errors: [
        {
          messageId: "tooBig",
          data: { name: "assigns", size: "36.0", a: "36", b: "0", c: "0", ceiling: "35" },
          line: 1,
          column: 0,
        },
      ],
    },
    {
      name: "assignment and update expressions are assignments",
      code: `function counts() {\nlet x;\n${repeatLine("x = 1;", 12)}\n${repeatLine("x += 1;", 12)}\n${repeatLine("x++;", 12)}\n}`,
      errors: [
        {
          messageId: "tooBig",
          data: { name: "counts", size: "36.0", a: "36", b: "0", c: "0", ceiling: "35" },
        },
      ],
    },
    {
      name: "calls and constructions are branches, and a const arrow takes its binding name",
      code: `const build = (make, Make) => {\n${repeatLine("make();", 18)}\n${repeatLine("new Make();", 18)}\n};`,
      errors: [
        {
          messageId: "tooBig",
          data: { name: "build", size: "36.0", a: "0", b: "36", c: "0", ceiling: "35" },
          line: 1,
          column: 14,
        },
      ],
    },
    {
      name: "every switch case is a condition, including default",
      code: `function routes(v) {\n${repeatLine("switch (v) { case 1: break; case 2: break; default: break; }", 12)}\n}`,
      errors: [
        {
          messageId: "tooBig",
          data: { name: "routes", size: "36.0", a: "0", b: "0", c: "36", ceiling: "35" },
        },
      ],
    },
    {
      name: "an if, a logical operator and a comparison each count once",
      code: `function compares(a, b, c) {\n${repeatLine("if (a === b || c) {}", 12)}\n}`,
      errors: [
        {
          messageId: "tooBig",
          data: { name: "compares", size: "36.0", a: "0", b: "0", c: "36", ceiling: "35" },
        },
      ],
    },
    {
      name: "the three counts combine as a vector length",
      code: `function mixed(f, a) {\n${repeatLine("const v# = #;", 21)}\n${repeatLine("f();", 21)}\n${repeatLine("if (a) {}", 21)}\n}`,
      errors: [
        {
          messageId: "tooBig",
          data: { name: "mixed", size: "36.4", a: "21", b: "21", c: "21", ceiling: "35" },
        },
      ],
    },
    {
      name: "a size just over the ceiling prints one decimal",
      code: `function edge(x) {\n${repeatLine("const v# = x;", 35)}\n${repeatLine("x();", 5)}\n}`,
      errors: [
        {
          messageId: "tooBig",
          data: { name: "edge", size: "35.4", a: "35", b: "5", c: "0", ceiling: "35" },
        },
      ],
    },
    {
      name: "a callback is named for its enclosing binding",
      code: `const outer = (items) => {\n  items.forEach(function () {\n${repeatLine("const v# = #;", 36)}\n  });\n};`,
      errors: [
        {
          messageId: "tooBig",
          data: {
            name: "the body of outer",
            size: "36.0",
            a: "36",
            b: "0",
            c: "0",
            ceiling: "35",
          },
          line: 2,
          column: 16,
        },
      ],
    },
    {
      name: "an Effect.fn body is named for its binding",
      code: `const run = Effect.fn("run")(function* () {\n${repeatLine("const v# = #;", 36)}\n});`,
      errors: [
        {
          messageId: "tooBig",
          data: { name: "the body of run", size: "36.0", a: "36", b: "0", c: "0", ceiling: "35" },
        },
      ],
    },
    {
      name: "a function nothing names is this function",
      code: `(function () {\n${repeatLine("const v# = #;", 36)}\n})();`,
      errors: [
        {
          messageId: "tooBig",
          data: { name: "this function", size: "36.0", a: "36", b: "0", c: "0", ceiling: "35" },
        },
      ],
    },
    {
      name: "the ceiling option lowers the limit",
      code: `function six() {\n${repeatLine("const v# = #;", 6)}\n}`,
      options: [{ ceiling: 5 }],
      errors: [
        {
          messageId: "tooBig",
          data: { name: "six", size: "6.0", a: "6", b: "0", c: "0", ceiling: "5" },
        },
      ],
    },
    {
      name: "every decision, logical operator and comparison is a condition",
      code: everyCondition,
      options: [{ ceiling: 20 }],
      errors: [
        {
          messageId: "tooBig",
          data: { name: "decides", size: "21.0", a: "0", b: "0", c: "21", ceiling: "20" },
        },
      ],
    },
  ],
});
