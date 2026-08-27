// Builds the demo and deploys it to Vercel, refusing to touch the production
// URL (font-chooser-react-mui.vercel.app) from a branch that doesn't own the
// demo.
//
//   node src/demos/tools/deployDemo.mjs           preview URL, any branch
//   node src/demos/tools/deployDemo.mjs --prod    production URL, PROD_BRANCH only
//
// The guard exists because a `vercel deploy --prod` from any checkout of this
// repo replaces what font-chooser-react-mui.vercel.app serves -- there is no
// per-branch production URL -- so a session working in another worktree can
// take over the URL somebody is being asked to review, with nothing in the
// repo to warn it. Pass --allow-any-branch when the takeover is deliberate.
import { execFileSync } from "child_process";
import * as path from "path";

// The branch whose build belongs on the production URL. Change this when the
// demo's home branch changes; the whole point is that the value is written
// down somewhere both a person and an agent will read.
const PROD_BRANCH = "CharacterVariants";

const packageDir = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const wantsProd = args.includes("--prod");
const allowAnyBranch = args.includes("--allow-any-branch");

function run(command, commandArgs) {
  execFileSync(command, commandArgs, {
    cwd: packageDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function currentBranch() {
  return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: packageDir,
    encoding: "utf8",
  }).trim();
}

if (wantsProd && !allowAnyBranch) {
  const branch = currentBranch();
  if (branch !== PROD_BRANCH) {
    console.error(
      [
        `Refusing to deploy to production from the branch "${branch}".`,
        `The production URL carries the demo of the "${PROD_BRANCH}" branch.`,
        "",
        "Deploy a preview instead (drop --prod), or, if you mean to replace",
        "what reviewers see, repeat the command with --allow-any-branch.",
      ].join("\n")
    );
    process.exit(1);
  }
}

run("npx", ["vite", "build", "--config", "vite.demo.config.ts"]);
run("npx", [
  "vercel",
  "deploy",
  "--prebuilt",
  "--yes",
  ...(wantsProd ? ["--prod"] : []),
]);
