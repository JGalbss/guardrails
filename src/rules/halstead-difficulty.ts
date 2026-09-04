import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";
import { numberOption } from "../options.ts";
import { halstead, named } from "../walk.ts";

/**
 * Halstead difficulty: (distinct operators / 2) * (operand uses / distinct operands). The score
 * is rounded before it is compared with the ceiling. The default ceiling was measured on a large
 * Effect codebase; tune it from your own distribution.
 */
const CEILING = 80;

export const halsteadDifficultyRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Reject a function that names too many distinct things at once.",
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
      tooDense:
        'The Halstead difficulty of "{{name}}" is {{score}}. The ceiling is {{ceiling}}. The measure rises with distinct operators and with how often the body repeats each name. Split the body along its own seams.',
    },
  },
  create(context) {
    const ceiling = numberOption(context.options, "ceiling", CEILING);
    const naming = named();

    const check = (node: ESTree.Node): void => {
      const score = Math.round(halstead(node).difficulty);
      if (score <= ceiling) return;

      context.report({
        node,
        messageId: "tooDense",
        data: { name: naming.of(node), score: String(score), ceiling: String(ceiling) },
      });
    };

    return {
      VariableDeclarator: naming.record,
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
});
