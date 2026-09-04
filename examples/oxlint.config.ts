import { defineConfig } from "oxlint";

import { recommended } from "../src/preset.ts";

const preset = recommended({ root: "../src", effect: true });

export default defineConfig({
  plugins: preset.plugins,
  categories: preset.categories,
  jsPlugins: preset.jsPlugins,
  rules: preset.rules,
  overrides: preset.overrides,
  ignorePatterns: ["node_modules/**"],
});
