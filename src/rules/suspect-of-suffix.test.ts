import { RuleTester } from "oxlint/plugins-dev";

import { suspectOfSuffixRule } from "./suspect-of-suffix.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });
const error = { messageId: "suspect" };

tester.run("guardrails/suspect-of-suffix", suspectOfSuffixRule, {
  valid: [
    { name: "a noun", code: "const owner = 1;" },
    { name: "Of alone has no lowercase letter before it", code: "const Of = 1;" },
    { name: "an all-caps ending is not Of", code: "const PROOF = 1;" },
    { name: "a lowercase of is not Of", code: "const sizeof = 1;" },
    { name: "an underscore before Of", code: "const _Of = 1;" },
    { name: "a capital before Of", code: "const XOf = 1;" },
    { name: "a digit before Of", code: "const item2Of = 1;" },
    { name: "Of in the middle", code: "const nameOfOwner = 1;" },
    { name: "Off is not Of", code: "const allOff = 1;" },
    { name: "a parameter is not checked", code: "function find(nameOf: string) {}" },
    {
      name: "interface members are not checked",
      code: "interface Api { nameOf(): string; readonly sizeOf: number }",
    },
    { name: "enums are not checked", code: "enum kindOf { nameOf }" },
    { name: "object literal keys are not checked", code: "const config = { nameOf: 1 };" },
    { name: "a destructured variable is not checked", code: "const { nameOf } = source;" },
    { name: "a call and a member access are not declarations", code: "nameOf(source.sizeOf);" },
    { name: "a class expression is not checked", code: "const Box = class KindOf {};" },
  ],
  invalid: [
    {
      name: "a variable reports the identifier",
      code: "const nameOf = (value) => value.name;",
      errors: [{ ...error, data: { name: "nameOf" }, line: 1, column: 6 }],
    },
    {
      name: "a function declaration reports the declaration",
      code: "function allOf() {}",
      errors: [{ ...error, data: { name: "allOf" }, line: 1, column: 0 }],
    },
    {
      name: "a class",
      code: "class KindOf {}",
      errors: [{ ...error, data: { name: "KindOf" } }],
    },
    {
      name: "an interface",
      code: "interface OwnerOf { id: string }",
      errors: [{ ...error, data: { name: "OwnerOf" } }],
    },
    {
      name: "a type alias",
      code: "type ValueOf = string;",
      errors: [{ ...error, data: { name: "ValueOf" } }],
    },
    {
      name: "a class property",
      code: "class Box { sizeOf = 1; }",
      errors: [{ ...error, data: { name: "sizeOf" } }],
    },
    {
      name: "a static class property",
      code: "class Box { static countOf = 0; }",
      errors: [{ ...error, data: { name: "countOf" } }],
    },
    {
      name: "a class method",
      code: "class Box { nameOf() {} }",
      errors: [{ ...error, data: { name: "nameOf" } }],
    },
    {
      name: "a declaration without an initializer",
      code: "let indexOf;",
      errors: [{ ...error, data: { name: "indexOf" } }],
    },
    {
      name: "each declarator is reported",
      code: "const nameOf = 1, sizeOf = 2;",
      errors: [
        { ...error, data: { name: "nameOf" } },
        { ...error, data: { name: "sizeOf" } },
      ],
    },
    {
      name: "an exported variable",
      code: "export const typeOf = 1;",
      errors: [{ ...error, data: { name: "typeOf" } }],
    },
    {
      name: "a nested declaration",
      code: "function outer() { const nameOf = 1; return nameOf; }",
      errors: [{ ...error, data: { name: "nameOf" } }],
    },
  ],
});
