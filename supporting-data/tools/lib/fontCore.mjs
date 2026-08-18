// Where the bundled snapshots live.
//
// Stages 2 and 3 import data the font chooser already ships —
// `bundled/alphabets.json` (SLDR exemplars) and `bundled/sampleTexts.json`
// (gflanguages passages) — rather than downloading anything. Importing the
// bundled copies is deliberate: the claims we file then say exactly what the
// chooser would have shown for that language, and re-running
// `refresh*Snapshot.mjs` is the one place the upstream data is refreshed.
//
// The path is a flag because font-core is not always beside us: the package
// lives in `components/fonts`, which is not on every branch of this repo, and
// on a checkout without it the importer must say so plainly instead of
// reporting zero entries.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const REPO_RELATIVE = fileURLToPath(
  new URL("../../../components/fonts/common/font-core", import.meta.url)
);

/** The font-core package, from --font-core, $FONT_CORE_DIR, or this repo. */
export function fontCoreDir(fromOption) {
  const candidates = [fromOption, process.env.FONT_CORE_DIR, REPO_RELATIVE];
  for (const candidate of candidates) {
    if (candidate && existsSync(join(candidate, "src/suggestions/bundled"))) {
      return candidate;
    }
  }
  throw new Error(
    [
      "Could not find font-core's bundled snapshots.",
      `Looked in: ${candidates.filter(Boolean).join(", ")}`,
      "Pass --font-core <path to components/fonts/common/font-core>, or set",
      "FONT_CORE_DIR. The fonts component is not on every branch of this repo.",
    ].join("\n")
  );
}

/** One bundled snapshot, parsed, with the path it came from. */
export function readBundled(name, fromOption) {
  const dir = fontCoreDir(fromOption);
  const path = join(dir, "src/suggestions/bundled", name);
  return { path, data: JSON.parse(readFileSync(path, "utf8")) };
}
