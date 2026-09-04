import { RuleTester } from "oxlint/plugins-dev";

import { bannedVocabularyRule } from "./banned-vocabulary.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });
const error = { messageId: "bannedWord" };

tester.run("guardrails/banned-vocabulary", bannedVocabularyRule, {
  valid: [
    { name: "a plain name", code: "const clickCount = 1;" },
    {
      name: "matching is on whole words: mishandle is not handle",
      code: "function mishandle() {}",
    },
    { name: "handled is not in the default list", code: "const Handled = 1;" },
    { name: "handles is not in the default list", code: "const handles = new Map();" },
    { name: "an acronym splits off cleanly", code: "const HTTPClient = 1;" },
    {
      name: "object literal keys are not declarations",
      code: "const config = { handler: 1, process: 2 };",
    },
    { name: "enum members are not checked", code: "enum Role { Handler, Manager }" },
    { name: "import bindings are not checked", code: 'import { handler } from "./handler.ts";' },
    { name: "a class expression name is not checked", code: "const Box = class Handler {};" },
    {
      name: "type parameters are not checked",
      code: "function identity<Handler>(value: Handler): Handler { return value; }",
    },
    {
      name: "a constructor parameter property is not checked",
      code: "class Box { constructor(private readonly handler: number) {} }",
    },
    {
      name: "a destructured variable is not checked",
      code: "const { handler, manager } = source;",
    },
    { name: "a destructured array is not checked", code: "const [helper] = list;" },
    {
      name: "a destructured parameter is not checked",
      code: "const fn = ({ handler }: Config) => handler;",
    },
    { name: "member access and calls are not declarations", code: "source.handler.process();" },
    { name: "a string literal is not a name", code: 'const label = "handler";' },
    {
      name: "a JSX attribute name is not checked",
      code: "const view = <Button handler={1} />;",
      filename: "view.tsx",
    },
    { name: "a label is not checked", code: "handler: for (;;) break handler;" },
    {
      name: "the words option replaces the default list",
      code: "const handleClick = 1;",
      options: [{ words: ["widget"] }],
    },
    {
      name: "an empty words option reports nothing",
      code: "function processOrder(handler: number) {}",
      options: [{ words: [] }],
    },
  ],
  invalid: [
    {
      name: "a variable reports the identifier",
      code: "const handleClick = () => {};",
      errors: [{ ...error, data: { name: "handleClick", word: "handle" }, line: 1, column: 6 }],
    },
    {
      name: "a function declaration reports the declaration",
      code: "function processOrder() {}",
      errors: [{ ...error, data: { name: "processOrder", word: "process" }, line: 1, column: 0 }],
    },
    {
      name: "a class",
      code: "class SessionManager {}",
      errors: [{ ...error, data: { name: "SessionManager", word: "manager" } }],
    },
    {
      name: "an interface",
      code: "interface EventHandler { id: string }",
      errors: [{ ...error, data: { name: "EventHandler", word: "handler" } }],
    },
    {
      name: "a type alias",
      code: "type Orchestrator = string;",
      errors: [{ ...error, data: { name: "Orchestrator", word: "orchestrator" } }],
    },
    {
      name: "an enum",
      code: "enum Misc { A }",
      errors: [{ ...error, data: { name: "Misc", word: "misc" } }],
    },
    {
      name: "a class property",
      code: "class Box { helper = 1; }",
      errors: [{ ...error, data: { name: "helper", word: "helper" } }],
    },
    {
      name: "a class method",
      code: "class Box { gather() {} }",
      errors: [{ ...error, data: { name: "gather", word: "gather" } }],
    },
    {
      name: "an interface property",
      code: "interface Config { readonly coordinator: string }",
      errors: [{ ...error, data: { name: "coordinator", word: "coordinator" } }],
    },
    {
      name: "an interface method parameter",
      code: "interface Api { start(handler: () => void): void }",
      errors: [{ ...error, data: { name: "handler", word: "handler" } }],
    },
    {
      name: "a function type parameter",
      code: "type Callback = (processor: number) => void;",
      errors: [{ ...error, data: { name: "processor", word: "processor" } }],
    },
    {
      name: "an arrow function parameter",
      code: "const fn = (handle: number) => handle;",
      errors: [{ ...error, data: { name: "handle", word: "handle" } }],
    },
    {
      name: "a function expression parameter",
      code: "const fn = function (helper: number) {};",
      errors: [{ ...error, data: { name: "helper", word: "helper" } }],
    },
    {
      name: "a parameter with a default",
      code: "function fn(manager = 1) {}",
      errors: [{ ...error, data: { name: "manager", word: "manager" } }],
    },
    {
      name: "a rest parameter",
      code: "function fn(...misc: number[]) {}",
      errors: [{ ...error, data: { name: "misc", word: "misc" } }],
    },
    {
      name: "an acronym prefix still splits the banned word off",
      code: "const HTTPHandler = 1;",
      errors: [{ ...error, data: { name: "HTTPHandler", word: "handler" } }],
    },
    {
      name: "a screaming-case name splits on underscores",
      code: "const HANDLE_ALL = 1;",
      errors: [{ ...error, data: { name: "HANDLE_ALL", word: "handle" } }],
    },
    {
      name: "a digit separates words",
      code: "const v2Process = 1;",
      errors: [{ ...error, data: { name: "v2Process", word: "process" } }],
    },
    {
      name: "only the first banned word is reported",
      code: "const processHandler = 1;",
      errors: [{ ...error, data: { name: "processHandler", word: "process" } }],
    },
    {
      name: "a declaration without an initializer",
      code: "let handle;",
      errors: [{ ...error, data: { name: "handle", word: "handle" } }],
    },
    {
      name: "each declarator is reported",
      code: "const wish = 1, seal = 2;",
      errors: [
        { ...error, data: { name: "wish", word: "wish" } },
        { ...error, data: { name: "seal", word: "seal" } },
      ],
    },
    {
      name: "a function name and its parameter are both reported",
      code: "function announce(whisper: string) {}",
      errors: [
        { ...error, data: { name: "announce", word: "announce" }, column: 0 },
        { ...error, data: { name: "whisper", word: "whisper" }, column: 18 },
      ],
    },
    {
      name: "a word from the words option",
      code: "function buildWidget() {}",
      options: [{ words: ["widget"] }],
      errors: [{ ...error, data: { name: "buildWidget", word: "widget" } }],
    },
    {
      name: "the words option matches after lowercasing",
      code: "const WidgetCount = 1;",
      options: [{ words: ["widget"] }],
      errors: [{ ...error, data: { name: "WidgetCount", word: "widget" } }],
    },
  ],
});
