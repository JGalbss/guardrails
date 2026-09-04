#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(skillRoot, "assets/guardrails");
const argv = process.argv.slice(2);
const targetArgument = argv.find((entry) => !entry.startsWith("--"));
const target = resolve(process.cwd(), targetArgument ?? "tools/oxlint/guardrails");
const force = argv.includes("--force");

if (!existsSync(source)) {
  console.error(`The skill assets are missing at ${source}. Reinstall the skill and try again.`);
  process.exit(1);
}

if (existsSync(target) && !force) {
  console.error(
    `Refusing to overwrite ${target}. Review the existing files, then re-run with --force to replace the directory.`,
  );
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });

const relativeTarget = relative(process.cwd(), target).split(sep).join("/");
const specifier = relativeTarget.startsWith(".") ? relativeTarget : `./${relativeTarget}`;
console.log(`Copied the guardrails and anti-slop plugins to ${target}`);
console.log("Suggested oxlint.config.ts:");
console.log("");
console.log('  import { defineConfig } from "oxlint";');
console.log(`  import { recommended } from "${specifier}/preset.ts";`);
console.log("  export default defineConfig(recommended({ effect: true }));");
console.log("");
console.log("Pass { effect: true } only when the repository depends directly on effect.");
if (specifier !== "./tools/oxlint/guardrails") {
  console.log(
    `Pass { root: "${specifier}" } as well, because the plugins are not at the default path.`,
  );
}
