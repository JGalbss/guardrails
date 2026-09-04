import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const plugins = [
  { index: join(root, "src/index.ts"), rules: join(root, "src/rules") },
  { index: join(root, "src/effect/index.ts"), rules: join(root, "src/effect/rules") },
];

const problems = [];

for (const plugin of plugins) {
  const index = readFileSync(plugin.index, "utf8");
  const ruleFiles = readdirSync(plugin.rules).filter(
    (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
  );
  for (const name of ruleFiles) {
    const rulePath = join(plugin.rules, name);
    const testPath = rulePath.replace(/\.ts$/, ".test.ts");
    if (!existsSync(testPath)) {
      problems.push(`${relative(root, rulePath)} has no sibling ${relative(root, testPath)}.`);
    }
    if (!index.includes(`./rules/${name}`)) {
      problems.push(
        `${relative(root, rulePath)} is not registered in ${relative(root, plugin.index)}.`,
      );
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}

console.log("Every rule has a sibling test and is registered in its plugin index.");
