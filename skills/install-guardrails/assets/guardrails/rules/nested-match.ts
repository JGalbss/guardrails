import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";
import { numberOption, stringsOption } from "../options.ts";
import { children } from "../walk.ts";

/**
 * A match nested inside a match inside a match is one classification written as several. A
 * call counts as a matcher when its callee is a member expression whose property name is in
 * `matchers`; the object is never inspected, so `text.match(regex)` counts too.
 */
const CEILING = 2;

const MATCHERS: ReadonlyArray<string> = ["match", "$match", "matchLeft", "matchRight"];

export const nestedMatchRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Reject a pyramid of matches standing in for one domain decision.",
    },
    schema: [
      {
        type: "object",
        properties: {
          ceiling: { type: "number" },
          matchers: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ ceiling: CEILING, matchers: [...MATCHERS] }],
    messages: {
      pyramid:
        "This nests {{depth}} matches; the ceiling is {{ceiling}}. A pyramid of matches is one classification written as several. Name the decision in one function that returns the facts it establishes, and match on them once.",
    },
  },
  create(context) {
    const ceiling = numberOption(context.options, "ceiling", CEILING);
    const matchers = new Set(stringsOption(context.options, "matchers", MATCHERS));

    const isMatch = (node: ESTree.Node): boolean => {
      if (node.type !== "CallExpression") return false;
      if (node.callee.type !== "MemberExpression") return false;
      if (node.callee.property.type !== "Identifier") return false;
      return matchers.has(node.callee.property.name);
    };

    const deepest = (node: ESTree.Node, depth: number): number => {
      const reached = isMatch(node) ? depth + 1 : depth;
      return children(node).reduce(
        (most, child) => Math.max(most, deepest(child, reached)),
        reached,
      );
    };

    return {
      CallExpression: (node) => {
        if (!isMatch(node)) return;

        const depth = deepest(node, 0);
        if (depth <= ceiling) return;

        context.report({
          node,
          messageId: "pyramid",
          data: { depth: String(depth), ceiling: String(ceiling) },
        });
      },
    };
  },
});
