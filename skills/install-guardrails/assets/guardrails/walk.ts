import type { ESTree } from "@oxlint/plugins";

const isNode = (value: unknown): value is ESTree.Node =>
  typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";

/**
 * The direct child nodes of an ESTree node, in object key order. Type annotations, decorators
 * and type parameters are children too; the `parent` back-reference is skipped.
 */
export const children = (node: ESTree.Node): ReadonlyArray<ESTree.Node> => {
  const found: Array<ESTree.Node> = [];

  const fields: ReadonlyArray<readonly [string, unknown]> = Object.entries(node);
  for (const [key, value] of fields) {
    if (key === "parent") continue;
    const entries: ReadonlyArray<unknown> = Array.isArray(value) ? value : [value];
    for (const entry of entries) {
      if (isNode(entry)) found.push(entry);
    }
  }

  return found;
};

export const FUNCTIONS = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);

/**
 * Names a function for a diagnostic. `record` must run on every VariableDeclarator so a const
 * bound arrow gets its binding name; `of` falls back to "the body of <binding>" for callbacks
 * and to "this function" when nothing names it.
 */
export const named = (): {
  readonly record: (node: ESTree.Node) => void;
  readonly of: (node: ESTree.Node) => string;
} => {
  const byNode = new WeakMap<object, string>();

  return {
    record: (node) => {
      if (node.type !== "VariableDeclarator") return;
      if (node.id.type !== "Identifier") return;
      if (node.init === null || node.init === undefined) return;

      byNode.set(node.init, node.id.name);
    },
    of: (node) => {
      if ("id" in node && isNode(node.id) && node.id.type === "Identifier") return node.id.name;
      const own = byNode.get(node);
      if (own !== undefined) return own;
      let ancestor: ESTree.Node | null | undefined = node.parent;
      while (ancestor !== null && ancestor !== undefined) {
        if (ancestor.type === "VariableDeclarator" && ancestor.id.type === "Identifier") {
          return `the body of ${ancestor.id.name}`;
        }
        if (ancestor.type === "FunctionDeclaration" && ancestor.id) {
          return `the body of ${ancestor.id.name}`;
        }
        ancestor = ancestor.parent;
      }
      return "this function";
    },
  };
};

/**
 * `Effect.fn("name")(function* ...)` and `Effect.fnUntraced(...)` define a function too. The
 * object is not inspected, so any `<object>.fn(...)` call counts.
 */
export const isEffectFn = (init: ESTree.Node): boolean => {
  if (init.type !== "CallExpression") return false;
  const wrapper = init.callee.type === "CallExpression" ? init.callee.callee : init.callee;
  return (
    wrapper.type === "MemberExpression" &&
    wrapper.property.type === "Identifier" &&
    (wrapper.property.name === "fn" || wrapper.property.name === "fnUntraced")
  );
};

export const definesFunction = (init: ESTree.Node | null | undefined): boolean =>
  init !== null &&
  init !== undefined &&
  (init.type === "ArrowFunctionExpression" ||
    init.type === "FunctionExpression" ||
    isEffectFn(init));

/** Identifiers a node refers to as values: not `a.name`, not `{ name: 1 }`, not `{ name }` keys. */
export const referencedNames = (node: ESTree.Node): ReadonlyArray<string> => {
  const found: Array<string> = [];
  const visit = (current: ESTree.Node): void => {
    if (current.type === "Identifier") {
      const parent = current.parent;
      const isMemberName =
        parent?.type === "MemberExpression" && parent.property === current && !parent.computed;
      const isKey =
        parent?.type === "Property" &&
        parent.key === current &&
        !parent.computed &&
        !parent.shorthand;
      if (!isMemberName && !isKey) found.push(current.name);
    }
    for (const child of children(current)) visit(child);
  };
  visit(node);
  return found;
};

export interface Halstead {
  readonly distinctOperators: number;
  readonly distinctOperands: number;
  readonly operatorUses: number;
  readonly operandUses: number;
  readonly volume: number;
  readonly difficulty: number;
}

const IMPLIED_OPERATORS = new Set([
  "CallExpression",
  "NewExpression",
  "MemberExpression",
  "AwaitExpression",
  "SpreadElement",
  "TemplateLiteral",
  "YieldExpression",
]);

/**
 * Halstead's vocabulary and length over a node's descendants. The node itself is skipped;
 * its params, type annotations and nested functions are counted.
 */
export const halstead = (node: ESTree.Node): Halstead => {
  const operators = new Set<string>();
  const operands = new Set<string>();
  let operatorUses = 0;
  let operandUses = 0;
  const visit = (current: ESTree.Node): void => {
    if ("operator" in current) {
      operators.add(`${current.type}:${current.operator}`);
      operatorUses += 1;
    } else if (IMPLIED_OPERATORS.has(current.type)) {
      operators.add(current.type);
      operatorUses += 1;
    }
    if (current.type === "Identifier") {
      operands.add(`id:${current.name}`);
      operandUses += 1;
    } else if (current.type === "Literal") {
      operands.add(`lit:${String(current.value)}`);
      operandUses += 1;
    }
    for (const child of children(current)) visit(child);
  };
  for (const child of children(node)) visit(child);
  const vocabulary = operators.size + operands.size;
  const length = operatorUses + operandUses;
  return {
    distinctOperators: operators.size,
    distinctOperands: operands.size,
    operatorUses,
    operandUses,
    volume: vocabulary === 0 ? 0 : length * Math.log2(vocabulary),
    difficulty: operands.size === 0 ? 0 : (operators.size / 2) * (operandUses / operands.size),
  };
};

export const DECISIONS = new Set([
  "IfStatement",
  "ConditionalExpression",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "CatchClause",
  "SwitchCase",
]);

/** McCabe's cyclomatic complexity: one path plus one per decision, counting && and || and ??. */
export const cyclomatic = (node: ESTree.Node): number => {
  let paths = 1;
  const visit = (current: ESTree.Node): void => {
    if (DECISIONS.has(current.type)) paths += 1;
    if (current.type === "LogicalExpression") paths += 1;
    for (const child of children(current)) {
      if (!FUNCTIONS.has(child.type)) visit(child);
    }
  };
  for (const child of children(node)) visit(child);
  return paths;
};

export const lines = (node: ESTree.Node): number => {
  const loc = node.loc;
  if (loc === null || loc === undefined) return 1;
  return loc.end.line - loc.start.line + 1;
};
