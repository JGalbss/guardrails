import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";
import { numberOption } from "../options.ts";
import { definesFunction } from "../walk.ts";

/**
 * A private function used in exactly one place is a name the reader has to chase for no gain.
 * Inline it at the call site. Exported functions are somebody else's seam, and a body long
 * enough to scroll past earns its name whatever the call count.
 *
 * `Effect.fn("name")(function* ...)`, `Effect.fnUntraced(...)` and plain `function`
 * declarations count too; the wrapper does not make the function less of a detour. A use is a
 * reference to the binding: `open(x)`, `Effect.map(x, open)`, `<Open />`. A property named
 * the same way (`session.open`, `{ open: ... }`) is not.
 */
const MAX_LENGTH = 900;

interface Declared {
  readonly node: ESTree.Node;
  readonly name: string;
}

export const singleUseFunctionRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Forbid private functions that are used exactly once.",
    },
    schema: [
      {
        type: "object",
        properties: { maxLength: { type: "number" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ maxLength: MAX_LENGTH }],
    messages: {
      singleUse:
        'The function "{{name}}" is used once. Inline it at its only call site so the reader does not have to chase the name.',
    },
  },
  create(context) {
    const maxLength = numberOption(context.options, "maxLength", MAX_LENGTH);
    const declared: Array<Declared> = [];
    const uses = new Map<string, number>();
    const exported = new Set<string>();

    const count = (name: string): void => {
      uses.set(name, (uses.get(name) ?? 0) + 1);
    };

    const declare = (
      node: ESTree.Node,
      name: string,
      owner: ESTree.Node | null | undefined,
    ): void => {
      if (owner?.type === "ExportNamedDeclaration") return;
      const range = node.range ?? [0, 0];
      if (range[1] - range[0] > maxLength) return;
      declared.push({ node, name });
    };

    return {
      ExportNamedDeclaration: (node) => {
        for (const specifier of node.specifiers) {
          if (specifier.local.type === "Identifier") exported.add(specifier.local.name);
        }
      },

      ExportDefaultDeclaration: (node) => {
        if (node.declaration.type === "Identifier") exported.add(node.declaration.name);
      },

      VariableDeclarator: (node) => {
        if (node.id.type !== "Identifier") return;
        if (!definesFunction(node.init)) return;
        declare(node, node.id.name, node.parent?.parent);
      },

      FunctionDeclaration: (node) => {
        if (node.id === null || node.id === undefined) return;
        declare(node, node.id.name, node.parent);
      },

      Identifier: (node) => {
        const parent = node.parent;
        const isMemberName =
          parent?.type === "MemberExpression" && parent.property === node && !parent.computed;
        const isKey =
          parent?.type === "Property" &&
          parent.key === node &&
          !parent.computed &&
          !parent.shorthand;
        if (isMemberName || isKey) return;
        count(node.name);
      },

      JSXIdentifier: (node) => {
        count(node.name);
      },

      "Program:exit": () => {
        for (const entry of declared) {
          if (exported.has(entry.name)) continue;
          if ((uses.get(entry.name) ?? 0) !== 2) continue;

          context.report({
            node: entry.node,
            messageId: "singleUse",
            data: { name: entry.name },
          });
        }
      },
    };
  },
});
