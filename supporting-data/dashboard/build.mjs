// Build the supporting-data coverage dashboard: read the database, write one
// static HTML file. Run by .github/workflows/supporting-data-dashboard.yml on
// every push, and by hand with:
//
//   node supporting-data/dashboard/build.mjs
//   node supporting-data/dashboard/build.mjs --out some/other/dir
//
// Reads only. It cannot write to the database — the fetch helper in
// coverage.mjs does GETs and nothing else — so running this is always safe.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import { gatherCoverage } from "./coverage.mjs";
import { renderPage } from "./page.mjs";

const here = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const options = { out: resolve(here, "dist") };
  for (let at = 0; at < argv.length; at++) {
    if (argv[at] === "--out") {
      const value = argv[++at];
      if (value === undefined) throw new Error("--out needs a value");
      options.out = resolve(process.cwd(), value);
    } else throw new Error(`unknown option: ${argv[at]}`);
  }
  return options;
}

/**
 * Which commit this page came from. CI hands it to us in the environment; a
 * local run asks git. Either can be absent (a tarball, a detached worktree),
 * and an unknown commit is worth saying out loud rather than guessing at.
 */
function buildStamp() {
  const fromGit = (...args) => {
    try {
      return execFileSync("git", ["-C", here, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return "";
    }
  };
  const commit =
    process.env.GITHUB_SHA?.slice(0, 8) ||
    fromGit("rev-parse", "--short=8", "HEAD") ||
    "unknown commit";
  const ref =
    process.env.GITHUB_REF_NAME ||
    fromGit("rev-parse", "--abbrev-ref", "HEAD") ||
    "unknown branch";
  return {
    commit,
    ref,
    generatedAt:
      new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC",
  };
}

const { out } = parseArgs(process.argv.slice(2));
const data = await gatherCoverage();
const build = buildStamp();

await mkdir(out, { recursive: true });
const target = resolve(out, "index.html");
await writeFile(target, renderPage(data, build), "utf8");

// The same report an importer prints, for the same reason: a build that quietly
// produced a page of zeroes should be obvious from the log.
console.log(`\nCoverage dashboard — ${build.ref} @ ${build.commit}`);
console.log(`  writing systems      ${data.denominator.writingSystems}`);
console.log(`  with any claim       ${data.anyCovered}`);
for (const kind of data.kinds) {
  console.log(
    `  ${kind.label.padEnd(20)} ${kind.covered} covered, ${kind.claims} claims`
  );
}
console.log(
  `  claims preferred     ${data.preferredTotal} of ${data.claimTotal}`
);
console.log(`\n  wrote ${target}`);
