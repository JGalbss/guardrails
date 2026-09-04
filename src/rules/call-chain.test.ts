import { RuleTester } from "oxlint/plugins-dev";

import { callChainRule } from "./call-chain.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

const threeDeep = `
const start = () => launch();
const launch = () => open();
const open = () => 1;
export const run = () => start();
`;

tester.run("call-chain", callChainRule, {
  valid: [
    {
      name: "an exported function may call one private step",
      code: `
export const start = () => open();
const open = () => 1;
`,
    },
    {
      name: "an exported function may call any number of private steps",
      code: `
export const start = () => {
  open();
  launch();
  land();
};
const open = () => 1;
const launch = () => 2;
const land = () => 3;
`,
    },
    {
      name: "two private functions that do their own work are not a chain",
      code: `
const open = () => 1;
const close = () => 2;
export const run = () => open() + close();
`,
    },
    {
      name: "a private function may call an exported function",
      code: `
export const open = () => 1;
const launch = () => open();
export const start = () => launch();
`,
    },
    {
      name: "a private function may call a function exported through a specifier",
      code: `
const open = () => 1;
const launch = () => open();
export const start = () => launch();
export { open };
`,
    },
    {
      name: "a private function may call the default export",
      code: `
const open = () => 1;
const launch = () => open();
export const start = () => launch();
export default open;
`,
    },
    {
      name: "a function exported through a specifier is not a chain root",
      code: `
const launch = () => open();
const open = () => 1;
export { launch };
`,
    },
    {
      name: "closures inside a function body may compose",
      code: `
export const start = () => {
  const launch = () => open();
  const open = () => 1;
  return launch();
};
`,
    },
    {
      name: "direct recursion is not a chain",
      code: `
function count(n: number): number {
  if (n === 0) return 0;
  return count(n - 1);
}
export const total = () => count(3);
`,
    },
    {
      name: "mutual recursion has no root and is not reported",
      code: `
const ping = (n: number): number => pong(n);
const pong = (n: number): number => ping(n);
export const start = () => ping(1);
`,
    },
    {
      name: "a JSX tag is not a reference to a private function",
      filename: "table.tsx",
      code: `
const Row = () => <tr />;
const Table = () => (
  <table>
    <Row />
  </table>
);
export const App = () => <Table />;
`,
    },
    {
      name: "a default exported function declaration is not tracked",
      code: `
export default function main() {
  return launch();
}
const launch = () => 1;
`,
    },
    {
      name: "a let binding assigned later is not tracked",
      code: `
let open: () => number;
open = () => 1;
const launch = () => open();
export const start = () => launch();
`,
    },
    {
      name: "a property named like a private function is not a reference",
      code: `
const open = () => 1;
const launch = () => ({ open: 2 }).open;
export const start = () => launch() + open();
`,
    },
    {
      name: "maxDepth raised to 3 allows a three-deep chain",
      options: [{ maxDepth: 3 }],
      code: threeDeep,
    },
  ],

  invalid: [
    {
      name: "a private function that calls a private function is a two-deep chain",
      code: `
const launch = () => open();
const open = () => 1;
export const start = () => launch();
`,
      errors: [
        {
          messageId: "chain",
          data: { chain: "launch -> open", depth: "2", maxDepth: "1" },
          line: 2,
          column: 6,
        },
      ],
    },
    {
      name: "only the top of a three-deep chain is reported",
      code: threeDeep,
      errors: [
        {
          messageId: "chain",
          data: { chain: "start -> launch -> open", depth: "3", maxDepth: "1" },
          line: 2,
        },
      ],
    },
    {
      name: "function declarations chain too",
      code: `
function launch() {
  return open();
}
function open() {
  return 1;
}
export function start() {
  return launch();
}
`,
      errors: [
        {
          messageId: "chain",
          data: { chain: "launch -> open", depth: "2", maxDepth: "1" },
          line: 2,
          column: 0,
        },
      ],
    },
    {
      name: "the longest path from the root names the chain",
      code: `
const start = () => {
  short();
  long();
};
const short = () => 1;
const long = () => deeper();
const deeper = () => 2;
export const run = () => start();
`,
      errors: [
        {
          messageId: "chain",
          data: { chain: "start -> long -> deeper", depth: "3", maxDepth: "1" },
        },
      ],
    },
    {
      name: "passing a private function as a callback is a reference",
      code: `
const launch = () => [1, 2].map(open);
const open = (n: number) => n;
export const start = () => launch();
`,
      errors: [
        { messageId: "chain", data: { chain: "launch -> open", depth: "2", maxDepth: "1" } },
      ],
    },
    {
      name: "reading a private function in a default parameter is a reference",
      code: `
const launch = (step = open) => step();
const open = () => 1;
export const start = () => launch();
`,
      errors: [
        { messageId: "chain", data: { chain: "launch -> open", depth: "2", maxDepth: "1" } },
      ],
    },
    {
      name: "typeof in a type position is a reference",
      code: `
const launch = (step: typeof open) => step();
const open = () => 1;
export const start = () => launch(open);
`,
      errors: [
        { messageId: "chain", data: { chain: "launch -> open", depth: "2", maxDepth: "1" } },
      ],
    },
    {
      name: "Effect.fn wrappers define functions and chain",
      code: `
const launch = Effect.fn("launch")(function* () {
  return yield* open();
});
const open = Effect.fn("open")(function* () {
  return 1;
});
export const start = () => launch();
`,
      errors: [
        { messageId: "chain", data: { chain: "launch -> open", depth: "2", maxDepth: "1" } },
      ],
    },
    {
      name: "a function expression binding chains",
      code: `
const launch = function () {
  return open();
};
const open = () => 1;
export const start = () => launch();
`,
      errors: [
        { messageId: "chain", data: { chain: "launch -> open", depth: "2", maxDepth: "1" } },
      ],
    },
    {
      name: "two independent chains produce two reports",
      code: `
const launch = () => open();
const open = () => 1;
const stop = () => close();
const close = () => 2;
export const start = () => launch();
export const end = () => stop();
`,
      errors: [
        {
          messageId: "chain",
          data: { chain: "launch -> open", depth: "2", maxDepth: "1" },
          line: 2,
        },
        {
          messageId: "chain",
          data: { chain: "stop -> close", depth: "2", maxDepth: "1" },
          line: 4,
        },
      ],
    },
    {
      name: "a chain that ends in a cycle is reported at its root",
      code: `
const start = () => ping(1);
const ping = (n: number): number => pong(n);
const pong = (n: number): number => ping(n);
export const run = () => start();
`,
      errors: [
        {
          messageId: "chain",
          data: { chain: "start -> ping -> pong -> ping", depth: "4", maxDepth: "1" },
          line: 2,
        },
      ],
    },
    {
      name: "maxDepth 2 still rejects a three-deep chain",
      options: [{ maxDepth: 2 }],
      code: threeDeep,
      errors: [
        {
          messageId: "chain",
          data: { chain: "start -> launch -> open", depth: "3", maxDepth: "2" },
        },
      ],
    },
  ],
});
