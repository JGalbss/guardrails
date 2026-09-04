import { RuleTester } from "oxlint/plugins-dev";

import { flagArgumentRule } from "./flag-argument.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });
const error = { messageId: "flag" };

tester.run("guardrails/flag-argument", flagArgumentRule, {
  valid: [
    { name: "a parameter with a domain type", code: "function open(session: Session) {}" },
    { name: "a string union says what it means", code: 'function open(mode: "read" | "write") {}' },
    { name: "a literal true type", code: "function open(force: true) {}" },
    { name: "a literal false type", code: "function open(force: false) {}" },
    {
      name: "a destructured parameter",
      code: "function open({ verbose }: { verbose: boolean }) {}",
    },
    { name: "a rest parameter", code: "function open(...flags: boolean[]) {}" },
    { name: "a boolean array", code: "function open(flags: boolean[]) {}" },
    { name: "a generic boolean array", code: "function open(flags: Array<boolean>) {}" },
    {
      name: "a type alias for boolean",
      code: "type Flag = boolean;\nfunction open(flag: Flag) {}",
    },
    {
      name: "an interface method signature is not checked",
      code: "interface Api { open(verbose: boolean): void }",
    },
    { name: "a function type is not checked", code: "type Open = (verbose: boolean) => void;" },
    {
      name: "a declared function is not checked",
      code: "declare function open(verbose: boolean): void;",
    },
    { name: "a boolean return type", code: "function isOpen(): boolean { return true; }" },
    {
      name: "a boolean variable inside the body",
      code: "function open() { const verbose: boolean = false; return verbose; }",
    },
    { name: "a function without parameters", code: "const open = () => {};" },
  ],
  invalid: [
    {
      name: "a boolean parameter reports the parameter",
      code: "function open(verbose: boolean) {}",
      errors: [{ ...error, data: { name: "verbose" }, line: 1, column: 14 }],
    },
    {
      name: "an optional boolean",
      code: "function open(verbose?: boolean) {}",
      errors: [{ ...error, data: { name: "verbose" } }],
    },
    {
      name: "a boolean with a default reports the whole pattern",
      code: "function open(verbose: boolean = false) {}",
      errors: [{ ...error, data: { name: "verbose" }, line: 1, column: 14, endColumn: 38 }],
    },
    {
      name: "the Boolean object type",
      code: "function open(verbose: Boolean) {}",
      errors: [{ ...error, data: { name: "verbose" } }],
    },
    {
      name: "an arrow function",
      code: "const open = (verbose: boolean) => {};",
      errors: [{ ...error, data: { name: "verbose" } }],
    },
    {
      name: "a function expression",
      code: "const open = function (verbose: boolean) {};",
      errors: [{ ...error, data: { name: "verbose" } }],
    },
    {
      name: "a class method",
      code: "class Session { open(verbose: boolean) {} }",
      errors: [{ ...error, data: { name: "verbose" } }],
    },
    {
      name: "a constructor",
      code: "class Session { constructor(verbose: boolean) {} }",
      errors: [{ ...error, data: { name: "verbose" } }],
    },
    {
      name: "an object literal method",
      code: "const api = { open(verbose: boolean) {} };",
      errors: [{ ...error, data: { name: "verbose" } }],
    },
    {
      name: "an async function",
      code: "async function open(verbose: boolean) {}",
      errors: [{ ...error, data: { name: "verbose" } }],
    },
    {
      name: "a nested arrow function",
      code: "function outer() { return (verbose: boolean) => verbose; }",
      errors: [{ ...error, data: { name: "verbose" } }],
    },
    {
      name: "a flag after a domain parameter",
      code: "function open(session: Session, verbose: boolean) {}",
      errors: [{ ...error, data: { name: "verbose" } }],
    },
    {
      name: "each flag is reported",
      code: "function open(verbose: boolean, force: boolean) {}",
      errors: [
        { ...error, data: { name: "verbose" } },
        { ...error, data: { name: "force" } },
      ],
    },
  ],
});
