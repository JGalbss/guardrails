import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const oxlint = join(root, "node_modules/.bin/oxlint");
const config = join(root, "examples/lint.config.ts");

const lint = (file) => {
  const run = spawnSync(oxlint, ["-c", config, "--format=json", file], {
    cwd: root,
    encoding: "utf8",
  });
  const start = run.stdout.indexOf("{");
  if (start < 0) throw new Error(`oxlint produced no JSON for ${file}.\n${run.stderr}`);
  return JSON.parse(run.stdout.slice(start)).diagnostics;
};

const expected = [
  "guardrails(no-comments)",
  "guardrails(banned-vocabulary)",
  "guardrails(participle-function)",
  "guardrails(single-use-function)",
  "guardrails(call-chain)",
  "guardrails(flag-argument)",
  "guardrails(suspect-of-suffix)",
  "anti-slop(no-chained-type-assertions)",
  "anti-slop(no-unknown-parameters)",
  "anti-slop(no-runtime-typeof)",
  "anti-slop(no-shape-in-symbol-names)",
  "anti-slop(require-safety-comment-for-type-assertion)",
  "eslint(max-params)",
  "eslint(no-else-return)",
  "typescript(no-explicit-any)",
];

const before = lint("examples/before.ts");
const after = lint("examples/after.ts");
const codes = new Set(before.map((diagnostic) => diagnostic.code));
const ruleCount = codes.size;

const readme = readFileSync(join(root, "README.md"), "utf8");
const section = readme.slice(readme.indexOf("## Example"), readme.indexOf("## How the rules work"));
const blocks = [...section.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => match[1]);
const sources = ["examples/before.ts", "examples/after.ts"].map((file) =>
  readFileSync(join(root, file), "utf8"),
);
const counted = section.match(/reports (\d+) problems from (\d+) rules/);

const problems = [
  ...expected
    .filter((code) => !codes.has(code))
    .map((code) => `examples/before.ts no longer triggers ${code}.`),
  ...(after.length === 0
    ? []
    : [`examples/after.ts has ${after.length} diagnostics; the README promises none.`]),
  ...(blocks.length === 2 && blocks[0] === sources[0] && blocks[1] === sources[1]
    ? []
    : [
        "The two code blocks under README.md Example differ from examples/before.ts and examples/after.ts.",
      ]),
  ...(counted !== null && Number(counted[1]) === before.length && Number(counted[2]) === ruleCount
    ? []
    : [`README.md must say "reports ${before.length} problems from ${ruleCount} rules".`]),
];

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}

console.log(
  `examples/before.ts reports ${before.length} problems from ${ruleCount} rules, examples/after.ts reports none, and the README matches.`,
);
