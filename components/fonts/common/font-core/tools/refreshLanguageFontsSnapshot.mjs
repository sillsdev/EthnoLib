// Regenerates src/suggestions/bundled/languageFonts.json — which fonts a
// language's community recommends, and what to fall back on for a script when
// nobody has said.
//
//   node tools/refreshLanguageFontsSnapshot.mjs
//   node tools/refreshLanguageFontsSnapshot.mjs --from sldr.tar.gz
//
// This is the Language Font Finder's own answer, assembled from the same three
// upstream files the service assembles it from rather than from the service:
//
//   * the per-language recommendations, which live in the SLDR's `<sil:font>`
//     elements — LFF generates its fontrules from exactly these;
//   * the per-script fallbacks in langfontfinder's fallback.json, which is what
//     the service uses for a language nobody has written a rule for;
//   * the family catalogue in silnrsi/fonts' families.json, for the download
//     URL and the licence.
//
// The families are trimmed the way `languageFontFinder.ts` trims the service's
// reply — no family we are told not to redistribute, none without a downloadable
// TTF, licences classified rather than guessed at — so that reading this
// snapshot and reading the service give the chooser the same fonts. Families
// nothing points at are dropped: the catalogue is 431 families and the languages
// and scripts between them name a fraction of that.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { readTarballBytes, fromArgument } from "./lib/fetchTarball.mjs";
import { sldrFiles, SLDR_TARBALL, SLDR_SOURCE } from "./lib/sldrScan.mjs";
import { writeJsonAndReport } from "./lib/reportSize.mjs";

const FAMILIES_URL = "https://raw.githubusercontent.com/silnrsi/fonts/main/families.json";
const FALLBACK_URL =
  "https://raw.githubusercontent.com/silnrsi/langfontfinder/main/data/fallback.json";

/** Ported from src/suggestions/languageFontFinder.ts. */
const PREFERRED_WEIGHT = 400;
const GITHUB_RAW = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/(.+)$/;

/** Below these the upstream shapes have changed and the snapshot is not replaced. */
const MINIMUM_FAMILIES = 100;
const MINIMUM_LANGUAGES = 500;

/** Every `<sil:font>`, as in src/suggestions/sldrFontFeatures.ts. */
const SIL_FONTS = /<sil:font\b([^>]*?)\/?>/g;

const out = fileURLToPath(
  new URL("../src/suggestions/bundled/languageFonts.json", import.meta.url)
);

const catalogue = await fetchJson(FAMILIES_URL);
const fallback = await fetchJson(FALLBACK_URL);
const bytes = await readTarballBytes(SLDR_TARBALL, fromArgument());

// Every family we could actually hand a user, keyed by the id both the SLDR
// names and the fallback rules refer to it by.
const usable = new Map();
for (const [id, family] of Object.entries(catalogue)) {
  const entry = toFamilyEntry(family);
  if (entry) usable.set(id, entry);
}

const languages = {};
let scanned = 0;
for await (const { tag, xml } of sldrFiles(bytes)) {
  scanned++;
  const ids = recommendedFamilyIds(xml).filter((id) => usable.has(id));
  if (ids.length > 0) languages[tag] = ids;
}

const scriptDefaults = {};
for (const [script, rules] of Object.entries(fallback)) {
  const kept = trimRules(rules, usable);
  if (kept.length > 0) scriptDefaults[script] = kept;
}

// Only the families something points at. A family in the catalogue that no
// language recommends and no script falls back to is weight in every host app
// that ships this for an answer nothing can ask for.
const referenced = new Set();
for (const ids of Object.values(languages)) for (const id of ids) referenced.add(id);
for (const rules of Object.values(scriptDefaults)) {
  for (const rule of rules) {
    for (const ids of Object.values(rule.roles ?? {})) {
      for (const id of ids) referenced.add(id);
    }
  }
}

const familyIds = [...referenced].sort();
if (familyIds.length < MINIMUM_FAMILIES) {
  throw new Error(
    `Only ${familyIds.length} referenced families out of ${usable.size} usable — an upstream shape has probably changed; not overwriting.`
  );
}
const languageTags = Object.keys(languages).sort();
if (languageTags.length < MINIMUM_LANGUAGES) {
  throw new Error(
    `Only ${languageTags.length} languages with fonts out of ${scanned} LDML files — an upstream shape has probably changed; not overwriting.`
  );
}

await mkdir(dirname(out), { recursive: true });
await writeJsonAndReport(out, {
  generatedAt: new Date().toISOString(),
  sources: [SLDR_SOURCE, FAMILIES_URL, FALLBACK_URL],
  languages: Object.fromEntries(languageTags.map((tag) => [tag, languages[tag]])),
  scriptDefaults: Object.fromEntries(
    Object.keys(scriptDefaults)
      .sort()
      .map((script) => [script, scriptDefaults[script]])
  ),
  families: Object.fromEntries(familyIds.map((id) => [id, usable.get(id)])),
});
console.log(
  `${languageTags.length} languages (of ${scanned} LDML files), ${Object.keys(scriptDefaults).length} scripts, ${familyIds.length} families kept of ${usable.size} usable and ${Object.keys(catalogue).length} in the catalogue`
);

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * What we keep about one family, or nothing if it isn't ours to offer.
 *
 * Same two refusals as `languageFontFinder.ts`: a family marked as not
 * distributable must not be offered for download, and one the catalogue lists no
 * TTF for is something the chooser could show and then fail to fetch.
 */
function toFamilyEntry(family) {
  if (family?.distributable === false) return undefined;
  const ttfUrl = downloadUrl(family);
  if (!ttfUrl) return undefined;
  const name = family.family ?? family.familyid;
  if (!name) return undefined;

  const { category, url } = classify(family.license);
  const entry = { family: name, ttfUrl, license: category };
  if (url) entry.licenseUrl = url;
  return entry;
}

/**
 * The file to fetch the font's bytes from: the family's nominated regular TTF,
 * else an upright regular weight, else any TTF at all — `ttfUrl` in
 * languageFontFinder.ts, over the catalogue's own file list.
 */
function downloadUrl(family) {
  const files = family?.files ?? {};
  const nominated = family.defaults?.ttf;
  const chosen =
    (nominated && files[nominated] && fileUrl(files[nominated])) ||
    pickTtf(files);
  return chosen;
}

function pickTtf(files) {
  const entries = Object.entries(files).filter(([name]) =>
    name.toLowerCase().endsWith(".ttf")
  );
  const regular = entries.find(
    ([, file]) =>
      fileUrl(file) &&
      file.axes?.wght === PREFERRED_WEIGHT &&
      (file.axes?.ital ?? 0) === 0
  );
  if (regular) return fileUrl(regular[1]);
  for (const [, file] of entries) {
    const url = fileUrl(file);
    if (url) return url;
  }
  return undefined;
}

/**
 * Where one file can be fetched from by a browser.
 *
 * `flourl` — fonts.languagetechnology.org — first, because that is the host SIL
 * publishes these for downloading from, and it is what the Language Font Finder
 * itself hands out. The catalogue's `url` is a `github.com/.../raw/...` link,
 * which serves no CORS header at all and so cannot be read from a page; the same
 * rewrite `languageFontFinder.ts` does sends it to `raw.githubusercontent.com`,
 * which does.
 */
function fileUrl(file) {
  if (file?.flourl) return file.flourl;
  if (!file?.url) return undefined;
  const match = GITHUB_RAW.exec(file.url);
  if (!match) return file.url;
  const [, owner, repo, refAndPath] = match;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${refAndPath}`;
}

/** Ported from src/suggestions/languageFontFinder.ts: no licence is guessed at. */
function classify(license) {
  const name = (license ?? "").trim().toUpperCase();
  if (name.startsWith("OFL"))
    return { category: "open", url: "https://openfontlicense.org/" };
  if (name.startsWith("APACHE"))
    return { category: "open", url: "https://www.apache.org/licenses/LICENSE-2.0" };
  return { category: "unknown" };
}

/**
 * The family ids one LDML file recommends, best first.
 *
 * The SLDR marks preference with `types="default"` or `types="default=2"`, a
 * rank rather than a flag, and that ordering is the community's judgement about
 * their own language — the whole reason to prefer this over coverage-checking.
 * Fonts with no `default` follow, in the order the file lists them.
 *
 * The name is turned into a family id the way the catalogue keys itself:
 * lowercased with everything that isn't a letter or digit dropped, so
 * "Noto Sans Thai" is `notosansthai`.
 */
function recommendedFamilyIds(xml) {
  const ranked = [];
  const silFonts = new RegExp(SIL_FONTS.source, SIL_FONTS.flags);
  for (let match = silFonts.exec(xml); match !== null; match = silFonts.exec(xml)) {
    const name = attribute(match[1], "name");
    if (!name) continue;
    const id = familyId(name);
    if (!id || ranked.some((entry) => entry.id === id)) continue;
    ranked.push({ id, rank: defaultRank(attribute(match[1], "types")) });
  }
  return ranked
    .map((entry, at) => ({ ...entry, at }))
    .sort((a, b) => a.rank - b.rank || a.at - b.at)
    .map((entry) => entry.id);
}

/**
 * How strongly the file recommends this font: `default` is first choice,
 * `default=2` second, and a font not marked at all comes after all of them.
 */
function defaultRank(types) {
  for (const token of (types ?? "").split(/\s+/)) {
    const match = /^default(?:=(\d+))?$/.exec(token);
    if (match) return match[1] ? Number(match[1]) : 1;
  }
  return Number.POSITIVE_INFINITY;
}

function familyId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * One script's fallback rules with the families we can't offer taken out, and
 * any rule left with nothing in it dropped. The `regions` of a rule carry
 * through untouched: which families a script falls back to genuinely differs by
 * country — Arabic in Pakistan wants Awami Nastaliq, Arabic in Senegal wants
 * Harmattan — and flattening that away would give West Africa Pakistan's fonts.
 */
function trimRules(rules, usable) {
  const kept = [];
  for (const rule of rules ?? []) {
    const roles = {};
    for (const [role, ids] of Object.entries(rule.roles ?? {})) {
      const filtered = (ids ?? []).filter((id) => usable.has(id));
      if (filtered.length > 0) roles[role] = filtered;
    }
    if (Object.keys(roles).length === 0) continue;
    kept.push(rule.regions ? { regions: rule.regions, roles } : { roles });
  }
  return kept;
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
