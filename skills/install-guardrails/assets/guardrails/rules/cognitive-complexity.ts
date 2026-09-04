import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";
import { numberOption } from "../options.ts";
import { children, FUNCTIONS, named } from "../walk.ts";

/**
 * Cognitive complexity after Campbell (SonarSource): a branch scores one plus its nesting depth,
 * and a run of the same logical operator scores one. The default ceiling was measured on a large
 * Effect codebase; tune it from your own distribution.
 */
const CEILING = 22;

const BRANCHES = new Set([
  "IfStatement",
  "SwitchStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "CatchClause",
  "ConditionalExpression",
]);

const NESTS = new Set([
  "IfStatement",
  "SwitchStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "CatchClause",
]);

const scoreNode = (node: ESTree.Node, nesting: number): number => {
  const own = BRANCHES.has(node.type) ? 1 + nesting : 0;
  const startsSequence =
    node.type === "LogicalExpression" &&
    (node.left.type !== "LogicalExpression" || node.left.operator !== node.operator);
  const sequence = startsSequence ? 1 : 0;
  const deeper = NESTS.has(node.type) ? nesting + 1 : nesting;

  return children(node).reduce(
    (total, child) => total + scoreNode(child, FUNCTIONS.has(child.type) ? 0 : deeper),
    own + sequence,
  );
};

export const cognitiveComplexityRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Reject a function whose cognitive complexity is above the ceiling.",
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
      tooTangled:
        'The cognitive complexity of "{{name}}" is {{score}}. The ceiling is {{ceiling}}. Nested branching counts more than flat branching, so moving a nested block into a module-level function is usually the fix.',
    },
  },
  create(context) {
    const ceiling = numberOption(context.options, "ceiling", CEILING);
    const naming = named();

    const check = (node: ESTree.Node): void => {
      const score = children(node).reduce((total, child) => total + scoreNode(child, 0), 0);
      if (score <= ceiling) return;

      context.report({
        node,
        messageId: "tooTangled",
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
