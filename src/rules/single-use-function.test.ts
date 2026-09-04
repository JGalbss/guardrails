import { RuleTester } from "oxlint/plugins-dev";

import { singleUseFunctionRule } from "./single-use-function.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

const longBody = Array.from({ length: 60 }, (_, index) => `  const step${index} = ${index};`).join(
  "\n",
);

const longOnce = `
const open = () => {
${longBody}
  return step0;
};
export const start = () => open();
`;

tester.run("single-use-function", singleUseFunctionRule, {
  valid: [
    {
      name: "a private function used twice keeps its name",
      code: `
const open = () => 1;
export const start = () => open();
export const restart = () => open();
`,
    },
    {
      name: "an exported const is never reported",
      code: `
export const open = () => 1;
export const start = () => open();
`,
    },
    {
      name: "an exported function declaration is never reported",
      code: `
export function open() {
  return 1;
}
export const start = () => open();
`,
    },
    {
      name: "a function exported through a specifier is never reported",
      code: `
const open = () => 1;
export { open };
`,
    },
    {
      name: "a function exported under another name is never reported",
      code: `
const open = () => 1;
export { open as begin };
`,
    },
    {
      name: "the default export is never reported",
      code: `
const open = () => 1;
export default open;
`,
    },
    {
      name: "a function that is never referenced is left to no-unused-vars",
      code: `
const open = () => 1;
export const start = () => 2;
`,
    },
    {
      name: "a shorthand property is a reference",
      code: `
const open = () => 1;
export const api = { open };
export const start = () => open();
`,
    },
    {
      name: "a computed property key is a reference",
      code: `
const open = () => "open";
export const api = { [open()]: 1 };
export const start = () => open();
`,
    },
    {
      name: "a JSX tag used twice is two references",
      filename: "table.tsx",
      code: `
const Row = () => <tr />;
export const Table = () => (
  <table>
    <Row />
    <Row />
  </table>
);
`,
    },
    {
      name: "passing a function as a callback is a reference",
      code: `
const double = (n: number) => n * 2;
export const start = () => [1].map(double);
export const restart = () => [2].map(double);
`,
    },
    {
      name: "typeof in a type position is a reference",
      code: `
const open = () => 1;
export const start = (step: typeof open) => step();
export const run = () => start(open);
`,
    },
    {
      name: "an Effect.fn function used twice keeps its name",
      code: `
const open = Effect.fn("open")(function* () {
  return 1;
});
export const start = Effect.fn("start")(function* () {
  return yield* open();
});
export const restart = Effect.fn("restart")(function* () {
  return yield* open();
});
`,
    },
    {
      name: "a class method is not a private function",
      code: `
class Session {
  open() {
    return 1;
  }
}
export const start = () => new Session().open();
`,
    },
    {
      name: "an object literal method is not a private function",
      code: `
export const api = {
  open() {
    return 1;
  },
};
export const start = () => api.open();
`,
    },
    {
      name: "a function longer than maxLength keeps its name whatever the use count",
      code: longOnce,
    },
    {
      name: "maxLength lowered to 10 exempts a short one-use function",
      options: [{ maxLength: 10 }],
      code: `
const open = () => 1;
export const start = () => open();
`,
    },
  ],

  invalid: [
    {
      name: "an arrow function used once is reported at its declarator",
      code: `
const open = () => 1;
export const start = () => open();
`,
      errors: [{ messageId: "singleUse", data: { name: "open" }, line: 2, column: 6 }],
    },
    {
      name: "a function declaration used once is reported",
      code: `
function open() {
  return 1;
}
export const start = () => open();
`,
      errors: [{ messageId: "singleUse", data: { name: "open" }, line: 2, column: 0 }],
    },
    {
      name: "a function expression used once is reported",
      code: `
const open = function () {
  return 1;
};
export const start = () => open();
`,
      errors: [{ messageId: "singleUse", data: { name: "open" } }],
    },
    {
      name: "an Effect.fn function used once is reported",
      code: `
const open = Effect.fn("open")(function* () {
  return 1;
});
export const start = Effect.fn("start")(function* () {
  return yield* open();
});
`,
      errors: [{ messageId: "singleUse", data: { name: "open" } }],
    },
    {
      name: "an Effect.fnUntraced function used once is reported",
      code: `
const open = Effect.fnUntraced(function* () {
  return 1;
});
export const start = () => open();
`,
      errors: [{ messageId: "singleUse", data: { name: "open" } }],
    },
    {
      name: "a JSX tag used once is the one reference",
      filename: "table.tsx",
      code: `
const Row = () => <tr />;
export const Table = () => (
  <table>
    <Row />
  </table>
);
`,
      errors: [{ messageId: "singleUse", data: { name: "Row" } }],
    },
    {
      name: "passing a function as a callback once is the one reference",
      code: `
const double = (n: number) => n * 2;
export const start = () => [1].map(double);
`,
      errors: [{ messageId: "singleUse", data: { name: "double" } }],
    },
    {
      name: "a function declared inside a body and used once is reported",
      code: `
export const start = () => {
  const open = () => 1;
  return open();
};
`,
      errors: [{ messageId: "singleUse", data: { name: "open" }, line: 3, column: 8 }],
    },
    {
      name: "a member name is not a reference",
      code: `
const open = () => 1;
export const start = (session) => session.open() + open();
`,
      errors: [{ messageId: "singleUse", data: { name: "open" } }],
    },
    {
      name: "an object key is not a reference",
      code: `
const open = () => 1;
export const api = { open: 1 };
export const start = () => open();
`,
      errors: [{ messageId: "singleUse", data: { name: "open" } }],
    },
    {
      name: "two one-use functions produce two reports",
      code: `
const open = () => 1;
const close = () => 2;
export const start = () => open();
export const end = () => close();
`,
      errors: [
        { messageId: "singleUse", data: { name: "open" }, line: 2 },
        { messageId: "singleUse", data: { name: "close" }, line: 3 },
      ],
    },
    {
      name: "maxLength raised to 5000 reports a long one-use function",
      options: [{ maxLength: 5000 }],
      code: longOnce,
      errors: [{ messageId: "singleUse", data: { name: "open" }, line: 2 }],
    },
  ],
});
