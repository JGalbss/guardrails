import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";
import { numberOption } from "../options.ts";
import { cyclomatic, halstead, lines, named } from "../walk.ts";

/**
 * Oman and Hagemeister's Maintainability Index in the Visual Studio normalisation:
 * MI = max(0, (171 - 5.2 ln V - 0.23 CC - 16.2 ln LOC) * 100 / 171), with V the Halstead
 * volume, CC the cyclomatic complexity and LOC the lines of the function. Visual Studio
 * colours 0 to 9 red, 10 to 19 yellow and 20 up green. A function below the floor is long,
 * dense and branchy at the same time; shortening any one of the three fixes it. The default
 * floor was measured on a large Effect codebase; tune it from your own distribution.
 */
const FLOOR = 30;

export const maintainabilityIndexRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Reject a function whose maintainability index is below the floor.",
    },
    schema: [
      {
        type: "object",
        properties: { floor: { type: "number" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ floor: FLOOR }],
    messages: {
      unmaintainable:
        'The maintainability index of "{{name}}" is {{index}}; the floor is {{floor}}. It is long, dense and branchy at once: shorten it, split a decision out, or cut the vocabulary.',
    },
  },
  create(context) {
    const floor = numberOption(context.options, "floor", FLOOR);
    const naming = named();

    const check = (node: ESTree.Node): void => {
      const volume = Math.max(1, halstead(node).volume);
      const raw =
        171 - 5.2 * Math.log(volume) - 0.23 * cyclomatic(node) - 16.2 * Math.log(lines(node));
      const index = Math.round(Math.max(0, (raw * 100) / 171));
      if (index >= floor) return;
      context.report({
        node,
        messageId: "unmaintainable",
        data: { name: naming.of(node), index: String(index), floor: String(floor) },
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
