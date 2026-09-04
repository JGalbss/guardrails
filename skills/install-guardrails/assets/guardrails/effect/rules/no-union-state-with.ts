import { defineRule } from "@oxlint/plugins";

import { stringsOption } from "../../options.ts";

/**
 * A tagged union built with effect-machine's `State(...)` exposes `.with` at two levels. The
 * variant's own `.with` (`State.Active.with(state, { count: 1 })`) checks the fields it copies
 * and sets. The union-level `State.with` types its partial as unknown, so a wrong field
 * compiles. The rule is name-based: any call whose callee is an identifier in `unions` followed
 * by `.with` is reported, and imports and types are never inspected.
 */
const UNIONS: ReadonlyArray<string> = ["State"];

export const noUnionStateWithRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Reject the union-level `.with` on a tagged state union, whose partial is typed as unknown and checks nothing.",
    },
    schema: [
      {
        type: "object",
        properties: { unions: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ unions: [...UNIONS] }],
    messages: {
      unionWith:
        "Call .with on the variant, for example {{union}}.Active.with(state, { count: 1 }). The union-level {{union}}.with types its partial as unknown and checks nothing.",
    },
  },
  create(context) {
    const unions = new Set(stringsOption(context.options, "unions", UNIONS));

    return {
      CallExpression: (node) => {
        const callee = node.callee;
        if (callee.type !== "MemberExpression") return;
        if (callee.object.type !== "Identifier" || !unions.has(callee.object.name)) return;
        if (callee.property.type !== "Identifier" || callee.property.name !== "with") return;
        context.report({
          node: callee,
          messageId: "unionWith",
          data: { union: callee.object.name },
        });
      },
    };
  },
});
