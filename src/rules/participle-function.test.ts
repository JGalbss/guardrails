import { RuleTester } from "oxlint/plugins-dev";

import { participleFunctionRule } from "./participle-function.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });
const error = { messageId: "participle" };

tester.run("guardrails/participle-function", participleFunctionRule, {
  valid: [
    { name: "a verb phrase arrow function", code: "const openSession = () => {};" },
    { name: "a verb phrase declaration", code: "function closeSession() {}" },
    { name: "a value is exempt", code: "const settled = compute();" },
    { name: "a literal value is exempt", code: "const closed = true;" },
    {
      name: "an awaited value is exempt",
      code: "async function load() { const parsed = await read(); return parsed; }",
    },
    {
      name: "a generator value is exempt",
      code: "function* flow() { const settled = yield* step(); return settled; }",
    },
    { name: "only the last word counts: closedSessions", code: "const closedSessions = () => [];" },
    { name: "only the last word counts: openingHours", code: "function openingHours() {}" },
    { name: "a class method is not checked", code: "class Box { closed() {} }" },
    {
      name: "an object literal method is not checked",
      code: "const api = { closed() {}, opened: () => {} };",
    },
    { name: "an assignment to a property is not a declaration", code: "api.closed = () => {};" },
    {
      name: "a word that ends in ed but is not listed",
      code: "function proceed() {}\nfunction feed() {}\nfunction need() {}",
    },
    { name: "loaded is not in the default list", code: "const loaded = () => true;" },
    { name: "created is not in the default list", code: "function created() {}" },
    { name: "an anonymous default export has no name", code: "export default function () {}" },
    {
      name: "the words option replaces the default list",
      code: "const opened = () => {};",
      options: [{ words: ["fetched"] }],
    },
    {
      name: "an empty words option reports nothing",
      code: "function opened() {}",
      options: [{ words: [] }],
    },
  ],
  invalid: [
    {
      name: "an arrow function reports the declarator",
      code: "const refused = () => {};",
      errors: [{ ...error, data: { name: "refused" }, line: 1, column: 6 }],
    },
    {
      name: "a function declaration reports the declaration",
      code: "function opened() {}",
      errors: [{ ...error, data: { name: "opened" }, line: 1, column: 0 }],
    },
    {
      name: "a function expression",
      code: "const closing = function () {};",
      errors: [{ ...error, data: { name: "closing" } }],
    },
    {
      name: "a present participle on an async arrow function",
      code: "const loading = async () => {};",
      errors: [{ ...error, data: { name: "loading" } }],
    },
    {
      name: "a generator declaration",
      code: "function* saving() {}",
      errors: [{ ...error, data: { name: "saving" } }],
    },
    {
      name: "only the last word counts",
      code: "function markAsClosed() {}",
      errors: [{ ...error, data: { name: "markAsClosed" } }],
    },
    {
      name: "a predicate whose last word is listed",
      code: "const isConnected = () => true;",
      errors: [{ ...error, data: { name: "isConnected" } }],
    },
    {
      name: "matching ignores case",
      code: "function SIGNED() {}",
      errors: [{ ...error, data: { name: "SIGNED" } }],
    },
    {
      name: "a capitalised name",
      code: "const Verified = () => true;",
      errors: [{ ...error, data: { name: "Verified" } }],
    },
    {
      name: "an exported function",
      code: 'export const written = () => "";',
      errors: [{ ...error, data: { name: "written" } }],
    },
    {
      name: "a nested function",
      code: "function outer() { const parsed = () => 1; return parsed; }",
      errors: [{ ...error, data: { name: "parsed" } }],
    },
    {
      name: "every declaration is reported",
      code: "function opened() {}\nfunction closed() {}",
      errors: [
        { ...error, data: { name: "opened" }, line: 1 },
        { ...error, data: { name: "closed" }, line: 2 },
      ],
    },
    {
      name: "a word from the words option",
      code: "const fetched = () => {};",
      options: [{ words: ["fetched"] }],
      errors: [{ ...error, data: { name: "fetched" } }],
    },
  ],
});
