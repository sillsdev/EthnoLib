#!/usr/bin/env node

const fs = require("fs");

const commitMsgFile = process.argv[2];

if (!commitMsgFile) {
  console.error("❌ Missing commit message file argument.");
  process.exit(1);
}

const commitMessage = fs.readFileSync(commitMsgFile, "utf8").trim();
const firstLine = commitMessage.split("\n")[0].trim();

if (!firstLine) {
  console.error("❌ Commit message cannot be empty.");
  process.exit(1);
}

if (/^(Merge|Revert|fixup!|squash!)/.test(firstLine)) {
  process.exit(0);
}

const conventionalReleasePrefix = /^(feat|fix|chore)(\([^)]+\))?(!)?:\s.+$/;

if (!conventionalReleasePrefix.test(firstLine)) {
  console.error("❌ Invalid conventional commit message.");
  console.error(
    "   Required prefix: feat:, fix:, or chore: (scope and ! are allowed)."
  );
  console.error("   Examples:");
  console.error("   - feat: add language search sorting");
  console.error("   - fix(find-language): handle zh-CN fallback");
  console.error("   - chore(repo): update dev tooling");
  console.error("   - feat(api)!: remove legacy endpoint");
  process.exit(1);
}

process.exit(0);
