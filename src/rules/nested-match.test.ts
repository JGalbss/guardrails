import { RuleTester } from "oxlint/plugins-dev";

import { nestedMatchRule } from "./nested-match.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

tester.run("nested-match", nestedMatchRule, {
  valid: [
    {
      name: "one match",
      code: `Option.match(user, { onNone: () => "guest", onSome: (u) => u.name });`,
    },
    {
      name: "two nested matches sit at the ceiling",
      code: `
Option.match(user, {
  onNone: () => "guest",
  onSome: (u) => Option.match(u.nickname, { onNone: () => u.name, onSome: (n) => n }),
});
`,
    },
    {
      name: "sibling matches inside one match count once",
      code: `
Option.match(user, {
  onNone: () => Option.match(fallback, { onNone: () => "guest", onSome: (f) => f }),
  onSome: (u) => Option.match(u.nickname, { onNone: () => u.name, onSome: (n) => n }),
});
`,
    },
    {
      name: "a bare match call is not a matcher",
      code: `match(a, { A: () => match(b, { B: () => match(c, { C: () => 1 }) }) });`,
    },
    {
      name: "a computed property is not a matcher",
      code: `
Option["match"](a, {
  onSome: () => Option["match"](b, { onSome: () => Option["match"](c, { onSome: () => 1 }) }),
});
`,
    },
    {
      name: "the ceiling option raises the allowed depth",
      options: [{ ceiling: 3 }],
      code: `
Option.match(a, {
  onSome: () => Option.match(b, { onSome: () => Option.match(c, { onSome: () => 1 }) }),
});
`,
    },
    {
      name: "the matchers option replaces the default names",
      options: [{ matchers: ["fold"] }],
      code: `
Option.match(a, {
  onSome: () => Option.match(b, { onSome: () => Option.match(c, { onSome: () => 1 }) }),
});
`,
    },
  ],
  invalid: [
    {
      name: "three nested matches",
      code: `
Option.match(a, {
  onSome: () => Option.match(b, { onSome: () => Option.match(c, { onSome: () => 1 }) }),
});
`,
      errors: [{ messageId: "pyramid", data: { depth: "3", ceiling: "2" }, line: 2, column: 0 }],
    },
    {
      name: "four nested matches report the two outer calls",
      code: `
Option.match(a, {
  onSome: () =>
    Option.match(b, {
      onSome: () => Option.match(c, { onSome: () => Option.match(d, { onSome: () => 1 }) }),
    }),
});
`,
      errors: [
        { messageId: "pyramid", data: { depth: "4", ceiling: "2" }, line: 2 },
        { messageId: "pyramid", data: { depth: "3", ceiling: "2" }, line: 4 },
      ],
    },
    {
      name: "matches in argument position nest",
      code: `Option.match(Option.match(Option.match(a, onA), onB), onC);`,
      errors: [{ messageId: "pyramid", data: { depth: "3", ceiling: "2" }, line: 1, column: 0 }],
    },
    {
      name: "every matcher name counts",
      code: `
State.$match(state, {
  Active: () =>
    Either.matchLeft(left, {
      onLeft: () => Either.matchRight(right, { onRight: () => 1 }),
    }),
});
`,
      errors: [{ messageId: "pyramid", data: { depth: "3", ceiling: "2" }, line: 2 }],
    },
    {
      name: "matches inside pipe nest",
      code: `
pipe(
  a,
  Option.match({
    onNone: () => 0,
    onSome: () =>
      pipe(
        b,
        Option.match({
          onNone: () => 0,
          onSome: () => pipe(c, Option.match({ onNone: () => 0, onSome: () => 1 })),
        }),
      ),
  }),
);
`,
      errors: [{ messageId: "pyramid", data: { depth: "3", ceiling: "2" }, line: 4 }],
    },
    {
      name: "a regex match counts because only the property name is checked",
      code: `
Option.match(a, {
  onSome: () => Option.match(b, { onSome: (name) => name.match(WORD) }),
});
`,
      errors: [{ messageId: "pyramid", data: { depth: "3", ceiling: "2" }, line: 2 }],
    },
    {
      name: "the ceiling option lowers the allowed depth",
      options: [{ ceiling: 1 }],
      code: `
Option.match(user, {
  onNone: () => "guest",
  onSome: (u) => Option.match(u.nickname, { onNone: () => u.name, onSome: (n) => n }),
});
`,
      errors: [{ messageId: "pyramid", data: { depth: "2", ceiling: "1" }, line: 2 }],
    },
    {
      name: "the matchers option adds a name",
      options: [{ matchers: ["fold"] }],
      code: `
Option.fold(a, {
  onSome: () => Option.fold(b, { onSome: () => Option.fold(c, { onSome: () => 1 }) }),
});
`,
      errors: [{ messageId: "pyramid", data: { depth: "3", ceiling: "2" }, line: 2 }],
    },
  ],
});
