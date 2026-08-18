// Which commit a generated artefact came from. Shared by the page generator and
// the JSON export so a reader of either can tell what produced it.

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * CI hands us the commit in the environment; a local run asks git. Either can be
 * absent (a tarball, a detached worktree), and an unknown commit is worth saying
 * out loud rather than guessing at.
 */
export function buildStamp() {
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
    generatedAt: new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC",
  };
}
