import assert from "node:assert/strict";
import { test } from "node:test";

import type { Plugin } from "@oxlint/plugins";

import antiSlopEffect from "./anti-slop/effect/index.ts";
import antiSlop from "./anti-slop/index.ts";
import guardrailsEffect from "./effect/index.ts";
import guardrails from "./index.ts";
import {
  antiSlopEffectRules,
  antiSlopRules,
  guardrailsEffectRules,
  guardrailsRules,
  ignorePatterns,
  plugins,
  recommended,
  typeAwareRules,
} from "./preset.ts";

const ruleIds = (plugin: Plugin): string[] => {
  const name = plugin.meta?.name;
  assert.ok(name, "every plugin names itself");
  return Object.keys(plugin.rules)
    .map((rule) => `${name}/${rule}`)
    .toSorted();
};

const enabled = (rules: object): string[] => Object.keys(rules).toSorted();

test("each rule object lists exactly the rules its plugin registers", () => {
  assert.deepEqual(enabled(antiSlopRules), ruleIds(antiSlop));
  assert.deepEqual(enabled(antiSlopEffectRules), ruleIds(antiSlopEffect));
  assert.deepEqual(enabled(guardrailsRules), ruleIds(guardrails));
  assert.deepEqual(enabled(guardrailsEffectRules), ruleIds(guardrailsEffect));
});

test("recommended with effect enables every rule of the four plugins", () => {
  const rules = enabled(recommended({ effect: true }).rules ?? {});
  const every = [antiSlop, antiSlopEffect, guardrails, guardrailsEffect].flatMap(ruleIds);
  for (const id of every) assert.ok(rules.includes(id), `${id} is enabled`);
  assert.ok(rules.includes("eslint/no-underscore-dangle"));
});

test("recommended without effect leaves the effect groups out", () => {
  const rules = enabled(recommended().rules ?? {});
  for (const id of [...ruleIds(antiSlopEffect), ...ruleIds(guardrailsEffect)]) {
    assert.ok(!rules.includes(id), `${id} is not enabled`);
  }
  assert.ok(!rules.includes("eslint/no-underscore-dangle"));
  for (const id of [...ruleIds(antiSlop), ...ruleIds(guardrails)]) {
    assert.ok(rules.includes(id), `${id} is enabled`);
  }
});

test("type-aware rules are opt in", () => {
  const typeAware = enabled(typeAwareRules);
  const without = enabled(recommended().rules ?? {});
  const withFlag = enabled(recommended({ typeAware: true }).rules ?? {});
  for (const id of typeAware) {
    assert.ok(!without.includes(id), `${id} is off by default`);
    assert.ok(withFlag.includes(id), `${id} is on with typeAware`);
  }
});

test("specifiers start with the root and the root is ignored", () => {
  const root = "./vendor/lint";
  for (const entry of plugins(root)) {
    assert.ok(typeof entry === "object" && entry.specifier.startsWith(`${root}/`));
  }
  assert.equal(plugins(root).length, 4);
  assert.ok(ignorePatterns(root).includes("vendor/lint/**"));
  assert.ok(ignorePatterns(root).includes("node_modules/**"));
  assert.ok(ignorePatterns(root).includes(".claude/**"));
  const config = recommended({ root });
  assert.deepEqual(config.jsPlugins, plugins(root));
  assert.deepEqual(config.ignorePatterns, ignorePatterns(root));
});
