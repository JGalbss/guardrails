import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";
import { numberOption } from "../options.ts";
import { definesFunction } from "../walk.ts";

/**
 * Two functions in one file that differ only in names and literals are one function with a
 * parameter missing. A function's fingerprint is its token stream with every identifier
 * replaced by I, every string by S and every number by N; two fingerprints are compared by
 * the Jaccard similarity of their token trigrams. Short functions are skipped because every
 * two-line accessor looks like every other. Only function bodies count: a schema class, a
 * table definition or a tagged struct is a declaration, and declarations look alike by design.
 */
const SIMILARITY = 0.85;
const MIN_TOKENS = 30;

const KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "of",
  "return",
  "satisfies",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "yield",
]);

interface Fingerprint {
  readonly node: ESTree.Node;
  readonly name: string;
  readonly trigrams: ReadonlySet<string>;
}

const TOKEN =
  /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\d+(?:\.\d+)?|[A-Za-z_$][\w$]*|=>|[^\s\w]/g;

const similarity = (first: Fingerprint, second: Fingerprint): number => {
  let shared = 0;
  for (const gram of first.trigrams) {
    if (second.trigrams.has(gram)) shared += 1;
  }
  const union = first.trigrams.size + second.trigrams.size - shared;
  return union === 0 ? 0 : shared / union;
};

export const similarFunctionsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Reject two functions in one file that are the same function with different names in it.",
    },
    schema: [
      {
        type: "object",
        properties: { similarity: { type: "number" }, minTokens: { type: "number" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ similarity: SIMILARITY, minTokens: MIN_TOKENS }],
    messages: {
      similar:
        '"{{second}}" is {{percent}}% the same as "{{first}}". Merge them, or pass the difference in as a parameter.',
    },
  },
  create(context) {
    const floor = numberOption(context.options, "similarity", SIMILARITY);
    const minTokens = numberOption(context.options, "minTokens", MIN_TOKENS);
    const fingerprints: Array<Fingerprint> = [];

    const consider = (node: ESTree.Node, name: string): void => {
      const tokens = (context.sourceCode.getText(node).match(TOKEN) ?? []).map((token) => {
        const first = token.charAt(0);
        if (first === '"' || first === "'" || first === "`") return "S";
        if (first >= "0" && first <= "9") return "N";
        if (KEYWORDS.has(token)) return token;
        if (/^[A-Za-z_$]/.test(token)) return "I";
        return token;
      });
      if (tokens.length < minTokens) return;
      const trigrams = new Set<string>();
      for (let index = 0; index + 3 <= tokens.length; index += 1) {
        trigrams.add(tokens.slice(index, index + 3).join(" "));
      }
      fingerprints.push({ node, name, trigrams });
    };

    return {
      FunctionDeclaration: (node) => {
        if (node.id === null || node.id === undefined) return;
        consider(node, node.id.name);
      },

      VariableDeclarator: (node) => {
        if (node.id.type !== "Identifier") return;
        const init = node.init;
        if (init === null || init === undefined) return;
        if (!definesFunction(init)) return;
        consider(init, node.id.name);
      },

      "Program:exit": () => {
        fingerprints.forEach((second, later) => {
          const first = fingerprints
            .slice(0, later)
            .find((earlier) => similarity(earlier, second) >= floor);
          if (first === undefined) return;

          context.report({
            node: second.node,
            messageId: "similar",
            data: {
              first: first.name,
              second: second.name,
              percent: String(Math.round(similarity(first, second) * 100)),
            },
          });
        });
      },
    };
  },
});
