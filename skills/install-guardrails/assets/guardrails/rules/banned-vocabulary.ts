import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";
import { stringsOption } from "../options.ts";

/**
 * Words that name a role, a mechanism or a narration instead of the thing itself: handler,
 * manager, process, gather, reveal. An identifier is split into its camelCase words and
 * reported when any word, lowercased, is in the list. The default list was measured on a large
 * Effect codebase; replace it with the `words` option to fit your own domain.
 */
const WORDS: ReadonlyArray<string> = [
  "absorb",
  "askedof",
  "adopt",
  "announce",
  "attenuate",
  "blossom",
  "coordinator",
  "distill",
  "finalizer",
  "fold",
  "gather",
  "handle",
  "handler",
  "harvest",
  "helper",
  "manager",
  "copied",
  "drained",
  "drive",
  "forgotten",
  "gathered",
  "granted",
  "here",
  "misc",
  "offer",
  "orchestrator",
  "process",
  "processor",
  "readof",
  "remember",
  "reveal",
  "say",
  "says",
  "seal",
  "substrate",
  "wanted",
  "weave",
  "withdrawn",
  "wish",
  "whisper",
];

const WORD = /[A-Z]+(?![a-z])|[A-Z][a-z]*|[a-z]+/gu;

export const bannedVocabularyRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow banned words in declared identifiers.",
    },
    schema: [
      {
        type: "object",
        properties: { words: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ words: [...WORDS] }],
    messages: {
      bannedWord:
        'The name "{{name}}" contains the banned word "{{word}}". Name the thing it is and state a fact about the domain.',
    },
  },
  create(context) {
    const banned = new Set(stringsOption(context.options, "words", WORDS));

    const check = (node: ESTree.Node, id: ESTree.Node | null | undefined): void => {
      if (id === null || id === undefined || id.type !== "Identifier") return;

      const word = (id.name.match(WORD) ?? [])
        .map((part) => part.toLowerCase())
        .find((part) => banned.has(part));
      if (word === undefined) return;

      context.report({ node, messageId: "bannedWord", data: { name: id.name, word } });
    };

    const checkParams = (
      node: ESTree.Node & { readonly params: ReadonlyArray<ESTree.Node> },
    ): void => {
      node.params.forEach((param) => {
        if (param.type === "AssignmentPattern") return check(param.left, param.left);
        if (param.type === "RestElement") return check(param.argument, param.argument);
        check(param, param);
      });
    };

    return {
      VariableDeclarator: (node) => check(node.id, node.id),
      ArrowFunctionExpression: checkParams,
      FunctionExpression: checkParams,
      TSFunctionType: checkParams,
      TSMethodSignature: checkParams,
      TSPropertySignature: (node) => check(node.key, node.key),
      FunctionDeclaration: (node) => {
        check(node, node.id);
        checkParams(node);
      },
      ClassDeclaration: (node) => check(node, node.id),
      TSInterfaceDeclaration: (node) => check(node, node.id),
      TSTypeAliasDeclaration: (node) => check(node, node.id),
      TSEnumDeclaration: (node) => check(node, node.id),
      PropertyDefinition: (node) => check(node, node.key),
      MethodDefinition: (node) => check(node, node.key),
    };
  },
});
