// Regenerates src/suggestions/bundled/alphabets.json — every language's main
// exemplar set, straight out of the SLDR.
//
//   node tools/refreshAlphabetsSnapshot.mjs
//   node tools/refreshAlphabetsSnapshot.mjs --from ../sldr.tar.gz
//
// The SLDR archive is ~13MB and three generators read it, so download it once
// and hand each of them the path:
//
//   curl -Lo sldr.tar.gz https://codeload.github.com/silnrsi/sldr/tar.gz/refs/heads/master
//   node tools/refreshAlphabetsSnapshot.mjs --from sldr.tar.gz
//   node tools/refreshFontFeatureDefaultsSnapshot.mjs --from sldr.tar.gz
//   node tools/refreshLanguageFontsSnapshot.mjs --from sldr.tar.gz
//
// The exemplar string is stored raw, exactly as LDML writes it —
// `[a b c {ch} æ]` — and not parsed into characters here. Parsing it is
// `parseUnicodeSetToAlphabet`'s job at read time, and doing it here would freeze
// today's parser's answers into the snapshot: fix a bug in the parser and every
// bundled alphabet would still carry the old mistake until somebody re-ran this.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { readTarballBytes, fromArgument } from "./lib/fetchTarball.mjs";
import { sldrFiles, SLDR_TARBALL, SLDR_SOURCE } from "./lib/sldrScan.mjs";
import { writeJsonAndReport } from "./lib/reportSize.mjs";

/** Ported verbatim from src/suggestions/sldrAlphabet.ts; see its comment. */
const EXEMPLARS = /<exemplarCharacters([^>]*)>([\s\S]*?)<\/exemplarCharacters\s*>/g;

/** Below this the archive's shape has changed and the snapshot is not replaced. */
const MINIMUM_ENTRIES = 500;

const out = fileURLToPath(
  new URL("../src/suggestions/bundled/alphabets.json", import.meta.url)
);

const bytes = await readTarballBytes(SLDR_TARBALL, fromArgument());

const alphabets = {};
let scanned = 0;
for await (const { tag, xml } of sldrFiles(bytes)) {
  scanned++;
  const exemplars = readMainExemplars(xml);
  if (exemplars) alphabets[tag] = exemplars;
}

const tags = Object.keys(alphabets).sort();
if (tags.length < MINIMUM_ENTRIES) {
  throw new Error(
    `Only ${tags.length} alphabets from ${scanned} LDML files — the archive's shape has probably changed; not overwriting.`
  );
}

await mkdir(dirname(out), { recursive: true });
await writeJsonAndReport(out, {
  generatedAt: new Date().toISOString(),
  source: SLDR_SOURCE,
  // Sorted so a regenerated snapshot's diff is the data that changed rather
  // than the order the tar happened to be walked in.
  alphabets: Object.fromEntries(tags.map((tag) => [tag, alphabets[tag]])),
});
console.log(`${tags.length} alphabets from ${scanned} LDML files`);

/**
 * The raw text of the main exemplar set, if the document has one.
 *
 * The main set is the `<exemplarCharacters>` carrying no `type` — `auxiliary`,
 * `index`, `numbers` and `punctuation` are the same element name and a different
 * question. Entities are decoded, because we are reading the element's text
 * rather than letting a parser hand it to us; nothing else is touched.
 */
function readMainExemplars(xml) {
  const exemplars = new RegExp(EXEMPLARS.source, EXEMPLARS.flags);
  for (
    let match = exemplars.exec(xml);
    match !== null;
    match = exemplars.exec(xml)
  ) {
    if (/\btype\s*=/.test(match[1])) continue;
    const text = decodeEntities(match[2]).trim();
    if (text.length > 0) return text;
  }
  return undefined;
}

/** Ported from src/suggestions/sldrAlphabet.ts. `&amp;` last, deliberately. */
function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => fromCodePoint(hex, 16))
    .replace(/&#(\d+);/g, (_, digits) => fromCodePoint(digits, 10))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function fromCodePoint(digits, radix) {
  const codePoint = parseInt(digits, radix);
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return radix === 16 ? `&#x${digits};` : `&#${digits};`;
  }
  return String.fromCodePoint(codePoint);
}
