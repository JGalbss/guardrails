import { RuleTester } from "oxlint/plugins-dev";

import { noCommentsRule } from "./no-comments.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

tester.run("no-comments", noCommentsRule, {
  valid: [
    {
      name: "code without comments",
      code: `const x = 1;\nconst y = x + 1;`,
    },
    {
      name: "a SAFETY note",
      code: `// SAFETY: the list is checked for length above\nconst first = list[0];`,
    },
    {
      name: "tool directives",
      code: `
// oxlint-disable-next-line guardrails/no-comments
// eslint-disable-next-line no-console
// @ts-expect-error the stub has no types
// oxfmt-ignore
// biome-ignore lint: measured
/* v8 ignore next */
/* c8 ignore next */
const x = /*#__PURE__*/ make();
`,
    },
    {
      name: "leading whitespace before an allowed prefix",
      code: `//     SAFETY: aligned\n/*\n   SAFETY: on its own line\n*/\nconst x = 1;`,
    },
    {
      name: "a shebang",
      code: `#!/usr/bin/env node\nconst x = 1;`,
    },
    {
      name: "the allow option replaces the default list",
      options: [{ allow: ["TODO:"] }],
      code: `// TODO: remove after the migration\nconst x = 1;`,
    },
  ],
  invalid: [
    {
      name: "a line comment",
      code: `// note\nconst x = 1;`,
      errors: [{ messageId: "comment", line: 1, column: 0 }],
    },
    {
      name: "a block comment",
      code: `/* note */\nconst x = 1;`,
      errors: [{ messageId: "comment", line: 1, column: 0 }],
    },
    {
      name: "a trailing comment",
      code: `const x = 1; // note`,
      errors: [{ messageId: "comment", line: 1, column: 13 }],
    },
    {
      name: "a run of line comments is one diagnostic at its first line",
      code: `// one\n// two\n// three\nconst x = 1;`,
      errors: [{ messageId: "comment", line: 1 }],
    },
    {
      name: "runs separated by code are separate diagnostics",
      code: `// one\nconst x = 1;\n// two\nconst y = 2;`,
      errors: [
        { messageId: "comment", line: 1 },
        { messageId: "comment", line: 3 },
      ],
    },
    {
      name: "a blank line ends a run",
      code: `// one\n\n// two\nconst x = 1;`,
      errors: [
        { messageId: "comment", line: 1 },
        { messageId: "comment", line: 3 },
      ],
    },
    {
      name: "a block comment then a line comment is one diagnostic",
      code: `/* one */\n// two\nconst x = 1;`,
      errors: [{ messageId: "comment", line: 1 }],
    },
    {
      name: "a multi-line block comment then a line comment is one diagnostic",
      code: `/*\n one\n*/\n// two\nconst x = 1;`,
      errors: [{ messageId: "comment", line: 1, endLine: 3 }],
    },
    {
      name: "a line comment then a block comment is two diagnostics",
      code: `// one\n/* two */\nconst x = 1;`,
      errors: [
        { messageId: "comment", line: 1 },
        { messageId: "comment", line: 2 },
      ],
    },
    {
      name: "a trailing comment after a reported line is its own diagnostic",
      code: `// one\nconst x = 1; // two`,
      errors: [
        { messageId: "comment", line: 1 },
        { messageId: "comment", line: 2, column: 13 },
      ],
    },
    {
      name: "an allowed comment inside a run splits it",
      code: `// one\n// SAFETY: two\n// three\nconst x = 1;`,
      errors: [
        { messageId: "comment", line: 1 },
        { messageId: "comment", line: 3 },
      ],
    },
    {
      name: "a shebang does not shield the comment below it",
      code: `#!/usr/bin/env node\n// note\nconst x = 1;`,
      errors: [{ messageId: "comment", line: 2 }],
    },
    {
      name: "the disable directive above a run leaves the first line as the reported location",
      code: `// oxlint-disable-next-line guardrails/no-comments\n// one\n// two\nconst x = 1;`,
      errors: [{ messageId: "comment", line: 2 }],
    },
    {
      name: "a JSX comment",
      filename: "component.tsx",
      code: `const el = <div>{/* note */}</div>;`,
      errors: [{ messageId: "comment", line: 1, column: 17 }],
    },
    {
      name: "the allow option replaces the default list",
      options: [{ allow: ["TODO:"] }],
      code: `// SAFETY: no longer allowed\nconst x = 1;`,
      errors: [{ messageId: "comment", line: 1 }],
    },
  ],
});
