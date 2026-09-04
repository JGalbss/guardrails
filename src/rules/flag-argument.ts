import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

/**
 * A boolean parameter is a flag argument (Fowler, Refactoring; Martin, Clean Code): the caller
 * reads `open(session, true)` and has to look up what true means, and the function body forks
 * on it. Split the function in two, or pass a value whose name says what it is.
 */
const isBoolean = (annotation: ESTree.Node | null | undefined): boolean => {
  if (annotation === null || annotation === undefined) return false;
  if (annotation.type === "TSTypeAnnotation") return isBoolean(annotation.typeAnnotation);
  if (annotation.type === "TSBooleanKeyword") return true;
  if (annotation.type === "TSTypeReference") {
    return annotation.typeName.type === "Identifier" && annotation.typeName.name === "Boolean";
  }
  return false;
};

export const flagArgumentRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Reject a boolean parameter.",
    },
    messages: {
      flag: 'The parameter "{{name}}" is a boolean flag. Split the function, or pass a value whose name says what it means.',
    },
  },
  create(context) {
    const check = (node: ESTree.Node & { readonly params: ReadonlyArray<ESTree.Node> }): void => {
      for (const param of node.params) {
        const target = param.type === "AssignmentPattern" ? param.left : param;
        if (target.type !== "Identifier") continue;
        if (!isBoolean(target.typeAnnotation)) continue;
        context.report({ node: param, messageId: "flag", data: { name: target.name } });
      }
    };

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
});
