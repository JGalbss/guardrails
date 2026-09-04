import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

/**
 * `somethingOf` names a projection rather than a domain operation, and most of them exist only
 * to shorten a call site. Name the noun the value is, or the verb phrase that produces it.
 */
const SUFFIX = /[a-z]Of$/u;

export const suspectOfSuffixRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Question identifiers that end in Of.",
    },
    messages: {
      suspect:
        'The name "{{name}}" ends in "Of", which names a projection. Ask what the value is: prefer the noun it returns, or a verb phrase. Keep it only if no clearer name exists.',
    },
  },
  create(context) {
    const check = (node: ESTree.Node, id: ESTree.Node | null | undefined): void => {
      if (id === null || id === undefined || id.type !== "Identifier") return;
      if (!SUFFIX.test(id.name)) return;

      context.report({ node, messageId: "suspect", data: { name: id.name } });
    };

    return {
      VariableDeclarator: (node) => check(node.id, node.id),
      FunctionDeclaration: (node) => check(node, node.id),
      ClassDeclaration: (node) => check(node, node.id),
      TSInterfaceDeclaration: (node) => check(node, node.id),
      TSTypeAliasDeclaration: (node) => check(node, node.id),
      PropertyDefinition: (node) => check(node, node.key),
      MethodDefinition: (node) => check(node, node.key),
    };
  },
});
