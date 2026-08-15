// Regenerates src/suggestions/bundled/fontFeatureDefaults.json — the font
// feature settings the SLDR records per language.
//
//   node tools/refreshFontFeatureDefaultsSnapshot.mjs
//   node tools/refreshFontFeatureDefaultsSnapshot.mjs --from sldr.tar.gz
//
// See refreshAlphabetsSnapshot.mjs for downloading the archive once and sharing
// it between the three SLDR generators.
//
// Each entry is the same `FontFeatureDefault[]` that `sldrFontFeatures.ts`
// builds from the live service, so a bundled read and a live read are the same
// shape and the offline path needs no translation.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { readTarballBytes, fromArgument } from "./lib/fetchTarball.mjs";
import { sldrFiles, SLDR_TARBALL, SLDR_SOURCE } from "./lib/sldrScan.mjs";
import { writeJsonAndReport } from "./lib/reportSize.mjs";

/** Ported verbatim from src/suggestions/sldrFontFeatures.ts. */
const SIL_FONTS = /<sil:font\b([^>]*?)\/?>/g;
const OPENTYPE_FEATURE_KEY = /^(cv|ss)\d{2}$/i;

/** Below this the archive's shape has changed and the snapshot is not replaced. */
const MINIMUM_ENTRIES = 20;

const out = fileURLToPath(
  new URL("../src/suggestions/bundled/fontFeatureDefaults.json", import.meta.url)
);

const bytes = await readTarballBytes(SLDR_TARBALL, fromArgument());

const defaults = {};
let scanned = 0;
for await (const { tag, xml } of sldrFiles(bytes)) {
  scanned++;
  const fonts = readFontFeatures(xml);
  // A tag whose file names no fonts has nothing to say, and an entry saying so
  // would be a third of the snapshot for no gain: the reader treats a missing
  // key and an empty array alike.
  if (fonts.length > 0) defaults[tag] = fonts;
}

const tags = Object.keys(defaults).sort();
if (tags.length < MINIMUM_ENTRIES) {
  throw new Error(
    `Only ${tags.length} tags with font settings out of ${scanned} LDML files — the archive's shape has probably changed; not overwriting.`
  );
}

await mkdir(dirname(out), { recursive: true });
await writeJsonAndReport(out, {
  generatedAt: new Date().toISOString(),
  source: SLDR_SOURCE,
  defaults: Object.fromEntries(tags.map((tag) => [tag, defaults[tag]])),
});
const withFeatures = tags.filter((tag) =>
  defaults[tag].some((font) => Object.keys(font.features).length > 0)
).length;
console.log(
  `${tags.length} tags name a font, ${withFeatures} of them with OpenType settings, out of ${scanned} LDML files`
);

/** Ported from src/suggestions/sldrFontFeatures.ts: every `<sil:font>` element. */
function readFontFeatures(xml) {
  const fonts = [];
  const silFonts = new RegExp(SIL_FONTS.source, SIL_FONTS.flags);
  for (let match = silFonts.exec(xml); match !== null; match = silFonts.exec(xml)) {
    const fontName = attribute(match[1], "name");
    if (!fontName) continue;
    const featureList = attribute(match[1], "features");
    fonts.push({
      fontName,
      features: featureList ? readFeatureList(featureList) : {},
    });
  }
  return fonts;
}

/** Only the OpenType keys; a bare number is a Graphite id and means nothing here. */
function readFeatureList(featureList) {
  const features = {};
  for (const pair of featureList.split(/\s+/)) {
    const [key, rawValue, ...extra] = pair.split("=");
    if (!key || rawValue === undefined || extra.length > 0) continue;
    if (!OPENTYPE_FEATURE_KEY.test(key)) continue;
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value < 0) continue;
    features[key.toLowerCase()] = value;
  }
  return features;
}

function attribute(attributes, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(attributes);
  return match ? decodeEntities(match[1]) : undefined;
}

function decodeEntities(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
