import { RuleTester } from "oxlint/plugins-dev";

import { noUnionStateWithRule } from "./no-union-state-with.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

tester.run("no-union-state-with", noUnionStateWithRule, {
  valid: [
    {
      name: "the variant's own with",
      code: `State.Active.with(state, { count: 1 });`,
    },
    {
      name: "with on a name outside the union list",
      code: `Builder.with(state, { count: 1 });`,
    },
    {
      name: "other union-level calls",
      code: `State.$match(state, { Active: () => 1, Idle: () => 0 });\nState.is("Active")(state);`,
    },
    {
      name: "a union reached through a member is not inspected",
      code: `Machine.State.with(state, { count: 1 });`,
    },
    {
      name: "a lowercase binding is a different name",
      code: `state.with(next, { count: 1 });`,
    },
    {
      name: "the unions option replaces the default list",
      options: [{ unions: ["Phase"] }],
      code: `State.with(state, { count: 1 });`,
    },
  ],
  invalid: [
    {
      name: "the union-level with",
      code: `State.with(state, { count: 1 });`,
      errors: [
        {
          messageId: "unionWith",
          data: { union: "State" },
          line: 1,
          column: 0,
          endLine: 1,
          endColumn: 10,
        },
      ],
    },
    {
      name: "inside a callback",
      code: `Ref.update(ref, (s) => State.with(s, { count: s.count + 1 }));`,
      errors: [{ messageId: "unionWith", data: { union: "State" }, line: 1, column: 23 }],
    },
    {
      name: "inside a generator",
      code: `
const step = Effect.gen(function* () {
  const current = yield* Ref.get(ref);
  yield* Ref.set(ref, State.with(current, { count: 0 }));
});
`,
      errors: [{ messageId: "unionWith", data: { union: "State" }, line: 4 }],
    },
    {
      name: "every call is reported",
      code: `const a = State.with(s, { count: 1 });\nconst b = State.with(a, { count: 2 });`,
      errors: [
        { messageId: "unionWith", data: { union: "State" }, line: 1 },
        { messageId: "unionWith", data: { union: "State" }, line: 2 },
      ],
    },
    {
      name: "the unions option names another union",
      options: [{ unions: ["Phase"] }],
      code: `Phase.with(phase, { step: 2 });`,
      errors: [{ messageId: "unionWith", data: { union: "Phase" }, line: 1 }],
    },
    {
      name: "the unions option can list several unions",
      options: [{ unions: ["State", "Phase"] }],
      code: `State.with(state, { count: 1 });\nPhase.with(phase, { step: 2 });`,
      errors: [
        { messageId: "unionWith", data: { union: "State" }, line: 1 },
        { messageId: "unionWith", data: { union: "Phase" }, line: 2 },
      ],
    },
  ],
});
