import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = join(root, "src/anti-slop");
const upstreamFile = join(destination, "UPSTREAM");
const repository = "https://github.com/dmmulroy/anti-slop";
const check = process.argv.includes("--check");

const git = (directory, ...args) =>
  execFileSync("git", ["-C", directory, ...args], { encoding: "utf8" }).trim();

const recordedSha = () =>
  existsSync(upstreamFile) ? readFileSync(upstreamFile, "utf8").split("\n")[0] : "none";

if (check) {
  const upstream = existsSync(upstreamFile) ? readFileSync(upstreamFile, "utf8") : "";
  const [sha = "", date = ""] = upstream.split("\n");
  const checks = [
    { ok: existsSync(upstreamFile), problem: "src/anti-slop/UPSTREAM is missing." },
    { ok: /^[0-9a-f]{40}$/.test(sha), problem: "src/anti-slop/UPSTREAM has no 40-hex commit SHA." },
    { ok: !Number.isNaN(Date.parse(date)), problem: "src/anti-slop/UPSTREAM has no ISO date." },
    ...["index.ts", "effect/index.ts", "LICENSE"].map((name) => ({
      ok: existsSync(join(destination, name)),
      problem: `src/anti-slop/${name} is missing.`,
    })),
  ];
  const problems = checks.filter((entry) => !entry.ok).map((entry) => entry.problem);
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    console.error("Run `pnpm sync:anti-slop` to vendor upstream again.");
    process.exit(1);
  }
  console.log(`src/anti-slop is vendored at ${recordedSha()}.`);
} else {
  const previous = recordedSha();
  const clone = mkdtempSync(join(tmpdir(), "anti-slop-"));
  try {
    execFileSync("git", ["clone", "--depth", "1", "--branch", "main", repository, clone], {
      stdio: "inherit",
    });
    const sha = git(clone, "log", "-1", "--format=%H");
    const date = git(clone, "log", "-1", "--format=%cI");
    rmSync(destination, { recursive: true, force: true });
    cpSync(join(clone, "src"), destination, { recursive: true });
    cpSync(join(clone, "LICENSE"), join(destination, "LICENSE"));
    writeFileSync(upstreamFile, `${sha}\n${date}\n`);
    console.log(`Vendored ${repository} into ${relative(root, destination)}.`);
    console.log(`Previous: ${previous}`);
    console.log(`Current:  ${sha} (${date})`);
    console.log("Run `pnpm sync:skill-assets` and `pnpm check` to pick up the change.");
  } finally {
    rmSync(clone, { recursive: true, force: true });
  }
}
