import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";
import { stringsOption } from "../options.ts";

/**
 * A function is a verb phrase, because a reader meets it at a call site where something is
 * about to happen. A past participle names a finished state: `refused(cause)` reads as a
 * description. A call site needs an instruction.
 *
 * Values are exempt on purpose. `const settled = yield* ...` is ordinary English and reading it
 * as an adjective is correct.
 *
 * Only listed words count. Deriving this from a suffix is wrong: open, token, feed, need and
 * proceed all end the same way and none of them is a participle. The default list was measured
 * on a large Effect codebase; replace it with the `words` option to fit your own domain.
 */
const WORDS: ReadonlyArray<string> = [
  "answered",
  "closing",
  "launching",
  "loading",
  "opening",
  "posting",
  "saving",
  "starting",
  "stopping",
  "applied",
  "asked",
  "attempted",
  "batched",
  "called",
  "catalogued",
  "chained",
  "checked",
  "closed",
  "connected",
  "counted",
  "delivered",
  "encoded",
  "expected",
  "fitted",
  "flattened",
  "focused",
  "framed",
  "hinted",
  "joined",
  "keyworded",
  "linked",
  "offered",
  "opened",
  "owned",
  "parsed",
  "quoted",
  "refused",
  "rehomed",
  "rejected",
  "relayed",
  "rendered",
  "replied",
  "rooted",
  "scored",
  "sealed",
  "settled",
  "shortened",
  "signed",
  "spoken",
  "staged",
  "stated",
  "synced",
  "tapped",
  "texted",
  "thinned",
  "touched",
  "verified",
  "woken",
  "written",
];

const WORD = /[A-Z]+(?![a-z])|[A-Z][a-z]*|[a-z]+/gu;

export const participleFunctionRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Require a function to be named for what it does.",
    },
    schema: [
      {
        type: "object",
        properties: { words: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ words: [...WORDS] }],
    messages: {
      participle:
        'The function "{{name}}" is named for the state something ends in. Name the work it does: a reader meets this at a call site where something is about to happen.',
    },
  },
  create(context) {
    const participles = new Set(stringsOption(context.options, "words", WORDS));

    const check = (node: ESTree.Node, id: ESTree.Node | null | undefined): void => {
      if (id === null || id === undefined || id.type !== "Identifier") return;
      const lastWord = (id.name.match(WORD) ?? []).at(-1) ?? "";
      if (!participles.has(lastWord.toLowerCase())) return;

      context.report({ node, messageId: "participle", data: { name: id.name } });
    };

    return {
      VariableDeclarator: (node) => {
        const init = node.init?.type;
        if (init !== "ArrowFunctionExpression" && init !== "FunctionExpression") return;
        check(node, node.id);
      },
      FunctionDeclaration: (node) => check(node, node.id),
    };
  },
});
