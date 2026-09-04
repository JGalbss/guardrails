import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";
import { numberOption } from "../options.ts";
import { children, DECISIONS, FUNCTIONS, named } from "../walk.ts";

/**
 * Fitzpatrick's ABC metric: the size of a function is the vector length of its Assignments,
 * Branches (calls) and Conditions, sqrt(A^2 + B^2 + C^2). RuboCop ships it as
 * Metrics/AbcSize with a default of 17 for Ruby. The default ceiling here was measured on a
 * large Effect codebase, which calls more and assigns less; tune it from your own distribution.
 * The message prints the size with one decimal. The comparison uses the unrounded size, so a
 * rounded size of 35 can be over a ceiling of 35.
 */
const CEILING = 35;

const COMPARISONS = new Set(["==", "!=", "===", "!==", "<", "<=", ">", ">="]);

export const abcSizeRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Reject a function whose ABC size (assignments, branches, conditions) is too large.",
    },
    schema: [
      {
        type: "object",
        properties: { ceiling: { type: "number" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ ceiling: CEILING }],
    messages: {
      tooBig:
        'The ABC size of "{{name}}" is {{size}} (A {{a}}, B {{b}}, C {{c}}); the ceiling is {{ceiling}}. It does too many things in one place.',
    },
  },
  create(context) {
    const ceiling = numberOption(context.options, "ceiling", CEILING);
    const naming = named();

    const check = (node: ESTree.Node): void => {
      let assignments = 0;
      let branches = 0;
      let conditions = 0;
      const visit = (current: ESTree.Node): void => {
        if (current.type === "AssignmentExpression" || current.type === "UpdateExpression") {
          assignments += 1;
        }
        if (current.type === "VariableDeclarator" && current.init) assignments += 1;
        if (current.type === "CallExpression" || current.type === "NewExpression") branches += 1;
        if (DECISIONS.has(current.type) || current.type === "LogicalExpression") conditions += 1;
        if (current.type === "BinaryExpression" && COMPARISONS.has(current.operator)) {
          conditions += 1;
        }
        for (const child of children(current)) {
          if (!FUNCTIONS.has(child.type)) visit(child);
        }
      };
      for (const child of children(node)) visit(child);
      const size = Math.sqrt(assignments ** 2 + branches ** 2 + conditions ** 2);
      if (size <= ceiling) return;
      context.report({
        node,
        messageId: "tooBig",
        data: {
          name: naming.of(node),
          size: size.toFixed(1),
          a: String(assignments),
          b: String(branches),
          c: String(conditions),
          ceiling: String(ceiling),
        },
      });
    };

    return {
      VariableDeclarator: (node) => naming.record(node),
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
});
