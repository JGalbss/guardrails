import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";
import { numberOption } from "../options.ts";
import { definesFunction, referencedNames } from "../walk.ts";

/**
 * A private function that calls another private function of the same file makes the reader
 * chase a chain: `start` calls `launch` calls `open`. The default allows one layer. An exported
 * function may lean on private steps; a private step does its own work.
 *
 * Only module-level bindings count, so closures inside a function body are free to compose.
 * Recursion is not a chain.
 */
const MAX_DEPTH = 1;

interface Binding {
  readonly node: ESTree.Node;
  readonly name: string;
  readonly exported: boolean;
}

export const callChainRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Reject a private function that calls another private function of the same file.",
    },
    schema: [
      {
        type: "object",
        properties: { maxDepth: { type: "number" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ maxDepth: MAX_DEPTH }],
    messages: {
      chain:
        'The chain "{{chain}}" is {{depth}} private functions deep; the limit is {{maxDepth}}. Inline the inner function or give the step one name.',
    },
  },
  create(context) {
    const maxDepth = numberOption(context.options, "maxDepth", MAX_DEPTH);
    const bindings: Array<Binding> = [];
    const exportedNames = new Set<string>();

    return {
      ExportNamedDeclaration: (node) => {
        node.specifiers.forEach((specifier) => {
          if (specifier.local.type === "Identifier") exportedNames.add(specifier.local.name);
        });
      },

      ExportDefaultDeclaration: (node) => {
        if (node.declaration.type === "Identifier") exportedNames.add(node.declaration.name);
      },

      VariableDeclarator: (node) => {
        if (node.id.type !== "Identifier") return;
        if (!definesFunction(node.init)) return;
        const exported = node.parent?.parent?.type === "ExportNamedDeclaration";
        const topLevel = node.parent?.parent?.type === "Program" || exported;
        if (!topLevel) return;
        bindings.push({ node, name: node.id.name, exported });
      },

      FunctionDeclaration: (node) => {
        if (node.id === null || node.id === undefined) return;
        const exported = node.parent?.type === "ExportNamedDeclaration";
        const topLevel = node.parent?.type === "Program" || exported;
        if (!topLevel) return;
        bindings.push({ node, name: node.id.name, exported });
      },

      "Program:exit": () => {
        const privates = new Map(
          bindings
            .filter((binding) => !binding.exported && !exportedNames.has(binding.name))
            .map((binding) => [binding.name, binding]),
        );
        const privateNames = new Set(privates.keys());
        const callees = new Map<string, ReadonlySet<string>>();
        for (const [name, binding] of privates) {
          const refs = new Set(
            referencedNames(binding.node).filter((ref) => privateNames.has(ref)),
          );
          refs.delete(name);
          callees.set(name, refs);
        }

        const longest = (name: string, seen: ReadonlySet<string>): ReadonlyArray<string> => {
          if (seen.has(name)) return [name];
          const next = [...(callees.get(name) ?? [])];
          const deeper = next
            .map((callee) => longest(callee, new Set([...seen, name])))
            .toSorted((left, right) => right.length - left.length);
          const tail = deeper[0] ?? [];
          return [name, ...tail];
        };

        for (const [name, binding] of privates) {
          const chain = longest(name, new Set());
          if (chain.length <= maxDepth) continue;
          const callers = [...privates.values()].some((other) =>
            (callees.get(other.name) ?? new Set()).has(name),
          );
          if (callers) continue;

          context.report({
            node: binding.node,
            messageId: "chain",
            data: {
              chain: chain.join(" -> "),
              depth: String(chain.length),
              maxDepth: String(maxDepth),
            },
          });
        }
      },
    };
  },
});
