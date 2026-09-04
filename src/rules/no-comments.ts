import { defineRule } from "@oxlint/plugins";

import { stringsOption } from "../options.ts";

/**
 * A comment whose text, after leading whitespace, starts with one of these prefixes is a
 * directive for a tool and is never reported. A shebang line is not a comment. Consecutive
 * full-line comments are one diagnostic at the first line; a comment after code on its line
 * is always its own diagnostic.
 */
const ALLOW: ReadonlyArray<string> = [
  "SAFETY:",
  "oxlint-",
  "eslint-",
  "@ts-",
  "oxfmt-",
  "biome-",
  "v8 ignore",
  "c8 ignore",
  "#__PURE__",
];

export const noCommentsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Reject a comment unless it starts with an allowed prefix. A comment records only what the code cannot: a determinism constraint, a protocol invariant, or an external quirk.",
    },
    schema: [
      {
        type: "object",
        properties: { allow: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allow: [...ALLOW] }],
    messages: {
      comment:
        "Comments are banned in source. Rename the thing, split the function, or model the state so the code says this. If the note records a constraint the code cannot express, keep it and add `// oxlint-disable-next-line guardrails/no-comments` above it.",
    },
  },
  create(context) {
    const allow = stringsOption(context.options, "allow", ALLOW);

    return {
      Program: () => {
        let notedThrough = -1;

        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === "Shebang") continue;
          const text = comment.value.trimStart();
          if (allow.some((prefix) => text.startsWith(prefix))) continue;

          const { line, column } = comment.loc.start;
          const before = context.sourceCode.lines[line - 1].slice(0, column);
          const continues =
            comment.type === "Line" && line === notedThrough + 1 && before.trim() === "";
          notedThrough = comment.loc.end.line;

          if (continues) continue;
          context.report({ loc: comment.loc, messageId: "comment" });
        }
      },
    };
  },
});
