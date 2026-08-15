// Regenerates src/suggestions/bundled/sampleTexts.json — a real passage per
// language and script, out of Google's gflanguages data.
//
//   node tools/refreshSampleTextsSnapshot.mjs
//   node tools/refreshSampleTextsSnapshot.mjs --from lang.tar.gz
//
// Keyed `{lang}_{Script}` exactly as the data set names its files, which is the
// key `gflanguagesSampleText.ts` already builds from a language tag, so the
// bundled lookup takes the same id the live one does.
//
// One field per language, chosen by the same preference order the live provider
// uses: the passages in a file are alternative lengths of the same text, so
// keeping more than one would grow the snapshot without adding an answer.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { readTarballBytes, fromArgument, tarEntries } from "./lib/fetchTarball.mjs";
import { writeJsonAndReport } from "./lib/reportSize.mjs";

const TARBALL = "https://codeload.github.com/googlefonts/lang/tar.gz/refs/heads/main";
const SOURCE = "https://github.com/googlefonts/lang";

/** `{owner}-{branch}/Lib/gflanguages/data/languages/{lang}_{Script}.textproto`. */
const LANGUAGE_FILE = /(?:^|\/)data\/languages\/([^/]+)\.textproto$/;

/** Ported from src/suggestions/gflanguagesSampleText.ts. */
const PREFERRED_FIELDS = ["specimen_21", "specimen_16", "tester", "styles"];

/** Below this the data set's shape has changed and the snapshot is not replaced. */
const MINIMUM_ENTRIES = 500;

const out = fileURLToPath(
  new URL("../src/suggestions/bundled/sampleTexts.json", import.meta.url)
);

const bytes = await readTarballBytes(TARBALL, fromArgument());

const samples = {};
let scanned = 0;
for await (const entry of tarEntries(bytes)) {
  const match = LANGUAGE_FILE.exec(entry.name);
  if (!match) continue;
  scanned++;
  const text = readSampleText(entry.text);
  if (text) samples[match[1]] = text;
}

const ids = Object.keys(samples).sort();
if (ids.length < MINIMUM_ENTRIES) {
  throw new Error(
    `Only ${ids.length} samples out of ${scanned} language files — the data set's shape has probably changed; not overwriting.`
  );
}

await mkdir(dirname(out), { recursive: true });
await writeJsonAndReport(out, {
  generatedAt: new Date().toISOString(),
  source: SOURCE,
  samples: Object.fromEntries(ids.map((id) => [id, samples[id]])),
});
console.log(`${ids.length} samples out of ${scanned} language files`);

/** Ported from src/suggestions/gflanguagesSampleText.ts. */
function readSampleText(textproto) {
  const block = sampleTextBlock(textproto);
  if (block === undefined) return undefined;
  const fields = stringFields(block);
  for (const field of PREFERRED_FIELDS) {
    const value = fields.get(field);
    if (value) return value;
  }
  return undefined;
}

/** Brace-counted, so a brace inside a quoted string can't end the block early. */
function sampleTextBlock(textproto) {
  const opening = /(^|\n)\s*sample_text\s*\{/.exec(textproto);
  if (!opening) return undefined;

  const start = opening.index + opening[0].length;
  let depth = 1;
  let inString = false;
  for (let at = start; at < textproto.length; at++) {
    const character = textproto[at];
    if (inString) {
      if (character === "\\") at++;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth++;
    else if (character === "}" && --depth === 0) return textproto.slice(start, at);
  }
  return textproto.slice(start);
}

function stringFields(block) {
  const fields = new Map();
  const pattern = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  for (let match = pattern.exec(block); match !== null; match = pattern.exec(block)) {
    if (!fields.has(match[1])) fields.set(match[1], unescapeString(match[2]));
  }
  return fields;
}

function unescapeString(value) {
  return value.replace(/\\(.)/g, (_, escaped) => {
    switch (escaped) {
      case "n":
        return "\n";
      case "t":
        return "\t";
      case "r":
        return "\r";
      default:
        return escaped;
    }
  });
}
