/**
 * Fetches the demo's "minimum font bundle" into `public/fonts/`, and writes the
 * manifest the demo reads to hand those files to the chooser.
 *
 * The bundle stands in for what an installed host app would carry in its own
 * installation: twenty families chosen by greedy language coverage over the
 * language/font data bundled into @ethnolib/font-core, five more picked by
 * speaker count rather than language count (the mid-size Indian scripts the
 * greedy pass undervalues), plus Andika as the literacy companion, each in
 * every style its publisher ships. That is what
 * makes a machine which has never seen the network still able to be offered a
 * font it does not have.
 *
 * Run it with `npm run fetch-fonts` from the package directory. It is a
 * developer tool, not part of the published component and not part of the
 * build: the font files it writes are committed, so an ordinary checkout has
 * them already and never touches the network.
 *
 * Where the files come from: silnrsi/fonts' `families.json`, the same catalog
 * behind fonts.languagetechnology.org. Every family in the list is under the
 * SIL Open Font License 1.1.
 *
 * The manifest also carries, per family, the three facts the chooser's sweep
 * would otherwise read out of every one of these files on first load: its
 * licence, its coverage and its character variants. They are computed here by
 * font-core's own readers — the same functions the sweep calls, in the same
 * order, on the same regular face — so the two cannot answer differently. See
 * declaredFamilyFacts.ts for what the chooser does with them, and
 * hostBundledFonts.spec.ts for the test that holds this script and those readers
 * together.
 *
 * Usage:
 *   node src/demos/tools/fetchMinimumFontBundle.mjs [--force] [--dry-run]
 *
 *   --force    re-download files that are already on disk
 *   --dry-run  work out and size the bundle, write nothing
 */

import { createHash } from "node:crypto";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { brotliCompressSync, constants } from "node:zlib";

/**
 * The families, by their id in `families.json`.
 *
 * The first twenty are the coverage picks, in the order the greedy pass chose
 * them, so the head of the list is where most of the languages are. The next
 * five are the Indian-script cluster — Malayalam, Odia, Gujarati, Gurmukhi,
 * Sinhala — each adding only one or two languages to the count but tens of
 * millions of speakers, which is exactly the weighting the greedy pass cannot
 * see. `andika` is last and is there for a different reason: it is the
 * literacy font, the one whose letterforms are drawn for someone learning to
 * read rather than for covering a script nothing else covers.
 */
const FAMILY_IDS = [
  "charis",
  "scheherazadenew",
  "annapurnasil",
  "abyssinicasil",
  "awaminastaliq",
  "notosanstifinagh",
  "khmermondulkiri",
  "notosansmiao",
  "notoserifbengali",
  "harmattan",
  "notoseriftibetan",
  "padauk",
  "notosansthai",
  "notosanstelugu",
  "lateef",
  "notosanstamil",
  "notosanscanadianaboriginal",
  "notosanscoptic",
  "badami",
  "notosanslao",
  "notosansmalayalam",
  "japasansoriya",
  "notosansgujarati",
  "notosansgurmukhi",
  "notosanssinhala",
  "andika",
];

/** The literacy companion, which the size report counts separately. */
const COMPANION_ID = "andika";

const CATALOG_URL =
  "https://raw.githubusercontent.com/silnrsi/fonts/main/families.json";

/**
 * The four styles a document editor actually asks a font for. Anything else a
 * family publishes — the mediums, semibolds, thins, the condensed and UI
 * cuts — is left upstream: this is a bundle an installer has to carry, and
 * doubling it to have a weight nothing in the product selects is not a trade
 * worth making.
 */
const STYLES = [
  { style: "R", weight: 400, italic: false, long: "Regular", short: "R" },
  { style: "B", weight: 700, italic: false, long: "Bold", short: "B" },
  { style: "I", weight: 400, italic: true, long: "Italic", short: "I" },
  {
    style: "BI",
    weight: 700,
    italic: true,
    long: "BoldItalic",
    short: "BI",
  },
];

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = join(here, "..", "..", "..");
const fontsDir = join(packageDir, "public", "fonts");
const manifestPath = join(fontsDir, "bundleManifest.json");

const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");

const fontCore = await loadFontCore();

await main();

/**
 * font-core's readers, from the built package rather than its source: this is a
 * plain node script, so there is nothing here to compile TypeScript.
 */
async function loadFontCore() {
  const dist = join(
    packageDir,
    "..",
    "..",
    "common",
    "font-core",
    "dist",
    "index.mjs"
  );
  try {
    return await import(pathToFileURL(dist).href);
  } catch (error) {
    throw new Error(
      `Could not load @ethnolib/font-core from ${dist}. Build it first:\n` +
        `  npm run build -w @ethnolib/font-core\n` +
        `(the original error was: ${error.message})`
    );
  }
}

async function main() {
  console.log(`Reading ${CATALOG_URL}`);
  const catalog = await fetchJson(CATALOG_URL);

  const families = [];
  for (const familyid of FAMILY_IDS) {
    const entry = catalog[familyid];
    if (!entry) {
      throw new Error(`${familyid} is not in families.json`);
    }
    families.push(planFamily(familyid, entry));
  }

  if (!dryRun) await mkdir(fontsDir, { recursive: true });

  for (const family of families) {
    for (const face of family.styles) {
      face.bytes = await obtain(face);
    }
    family.facts = await readFacts(family);
  }

  if (!dryRun) {
    await writeFile(
      manifestPath,
      `${JSON.stringify(manifest(families), undefined, 2)}\n`
    );
    console.log(`\nWrote ${manifestPath}`);
    await reportStrays(families);
  }

  report(families);
}

/**
 * Which files of one family the bundle wants, and where to get them.
 *
 * The catalog's own `defaults.ttf` is what anchors this, rather than sifting
 * the file list by the `axes` each entry carries. Two things go wrong when you
 * sift: the Noto families publish a condensed cut and often a "UI" cut at the
 * same weight and slant as the regular one, so "wght 400, no italic" matches
 * several files and picking among them is a coin toss the catalog has already
 * called — `notosanstelugu`'s default is `NotoSansTeluguUI-Regular.ttf`, which
 * is also the file the bundled language data points at. And Khmer Mondulkiri's
 * axes are simply wrong upstream: `Mondulkiri-I.ttf` and `Mondulkiri-BI.ttf`
 * are both recorded as `ital: 0`, so an axes-led pass drops its italics and
 * takes the bold as the regular.
 *
 * So: take the default face's stem as the family's base name and its suffix as
 * the family's naming convention (`-Regular` or the older `-R`), then ask for
 * exactly those four names. A family that doesn't publish a style simply
 * doesn't have that file, which is the case for most of them.
 */
function planFamily(familyid, entry) {
  const defaultFile = entry.defaults?.ttf;
  if (!defaultFile) {
    throw new Error(`${familyid} has no default ttf in families.json`);
  }
  const match = /^(.*)-([^-]+)\.ttf$/i.exec(defaultFile);
  if (!match) {
    throw new Error(`Cannot read a base name out of ${defaultFile}`);
  }
  const [, base, defaultSuffix] = match;
  const abbreviated = defaultSuffix.toUpperCase() === "R";

  const styles = [];
  for (const style of STYLES) {
    const file = `${base}-${abbreviated ? style.short : style.long}.ttf`;
    const meta = entry.files?.[file];
    if (!meta) continue;
    const url = downloadUrl(meta);
    if (!url) {
      throw new Error(`${file} has no url in families.json`);
    }
    styles.push({
      style: style.style,
      file,
      // The face's PostScript name as the demo will use it. Stood in for
      // rather than read out of the file's `name` table: it is a handle the
      // chooser hands back to the demo's own font access, and both ends are
      // ours. The stem is what the real name almost always is anyway.
      postscriptName: file.replace(/\.ttf$/i, ""),
      weight: style.weight,
      italic: style.italic,
      url,
    });
  }

  if (!styles.some((face) => face.style === "R")) {
    throw new Error(`${familyid} has no regular face`);
  }

  return {
    family: entry.family ?? familyid,
    familyid,
    license: entry.license ?? "OFL",
    styles,
  };
}

/**
 * `flourl` is the copy on fonts.languagetechnology.org, which is where the
 * catalog means people to get fonts. Falling back to `url` needs a rewrite:
 * those are `github.com/…/raw/…` links, which redirect, and the direct
 * `raw.githubusercontent.com` form is the one that answers straight.
 */
function downloadUrl(meta) {
  if (meta.flourl) return meta.flourl;
  return meta.url?.replace(
    /^https:\/\/github\.com\/(.+?)\/raw\/(.+)$/,
    "https://raw.githubusercontent.com/$1/$2"
  );
}

/**
 * The file on disk, downloading it if it isn't there. Returns its bytes.
 *
 * A file already present is left alone unless `--force`: the bundle is
 * committed, so the ordinary run of this script after adding one family should
 * fetch that family and nothing else.
 */
async function obtain(face) {
  const path = join(fontsDir, face.file);
  if (!force && existsSync(path)) {
    const data = await readFile(path);
    console.log(`  have ${face.file} (${kb(data.length)})`);
    return data;
  }
  if (dryRun) {
    const data = Buffer.from(await fetchBytes(face.url));
    console.log(`  would fetch ${face.file} (${kb(data.length)})`);
    return data;
  }
  const data = Buffer.from(await fetchBytes(face.url));
  await writeFile(path, data);
  console.log(`  fetched ${face.file} (${kb(data.length)})`);
  return data;
}

/**
 * What the chooser would otherwise read out of this family's file, read here
 * once instead.
 *
 * The regular face, because that is the face the sweep inspects: a family's list
 * entry names it, and "can this font write my alphabet" is a question about the
 * roman rather than the bold. The three reads are the sweep's own, in its order —
 * the cmap for coverage, the ranged `name`/OS-2 read for the licence hints, then
 * the cheap "any shape feature at all?" check before the whole file is parsed for
 * the features themselves.
 */
async function readFacts(family) {
  const face = family.styles.find((one) => one.style === "R");
  const blob = new Blob([face.bytes]);
  const name = face.postscriptName;

  const coverage = await fontCore.readCoverageRanges(blob, name);
  const hints = await fontCore.readLicenseHintsFromBlob(blob, name);
  const verdict = fontCore.describeLicense(hints);
  const variants = (await fontCore.fontBlobHasCharacterVariants(blob, name))
    ? fontCore.readCharacterVariants(await blob.arrayBuffer(), name)
    : [];

  return fontCore.serializeFamilyFacts({
    license: verdict.category,
    licenseUrl: hints.url,
    licenseReason: verdict.notes,
    coverage,
    variants,
  });
}

function manifest(families) {
  return {
    generatedAt: new Date().toISOString(),
    source: CATALOG_URL,
    families: families.map((family) => ({
      family: family.family,
      familyid: family.familyid,
      license: family.license,
      // What the font's own tables say, as against the `license` above, which is
      // the catalog's word for the whole family. For this bundle they agree —
      // everything in it is OFL — and a test says so; they are both kept because
      // they are different claims by different parties, and a family where they
      // disagreed would be worth seeing rather than silently reconciling.
      facts: family.facts,
      styles: family.styles.map((face) => ({
        style: face.style,
        file: face.file,
        postscriptName: face.postscriptName,
        weight: face.weight,
        italic: face.italic,
        bytes: face.bytes.length,
        // So a later run can tell a file it left alone from one that was
        // replaced upstream, without keeping the bytes to compare.
        sha256: createHash("sha256")
          .update(face.bytes)
          .digest("hex")
          .slice(0, 16),
      })),
    })),
  };
}

/**
 * Font files in the folder that the manifest doesn't claim — a family dropped
 * from the list, or a file renamed upstream. Said rather than deleted: this
 * script fetches, and quietly removing files somebody may have put there by
 * hand is not its business.
 */
async function reportStrays(families) {
  const wanted = new Set(
    families.flatMap((family) => family.styles.map((face) => face.file))
  );
  const present = (await readdir(fontsDir)).filter((name) =>
    /\.(ttf|otf|woff2?)$/i.test(name)
  );
  const strays = present.filter((name) => !wanted.has(name));
  if (strays.length === 0) return;
  console.log(
    `\n${strays.length} font file(s) in public/fonts are not in the manifest; ` +
      `delete them by hand if they are leftovers:`
  );
  for (const name of strays) console.log(`  ${name}`);
}

/**
 * What the bundle costs, raw and compressed.
 *
 * Brotli at its highest quality because that is what an installer or an app
 * package would do with these, and it is a big difference for font files —
 * quoting the raw total overstates what shipping the bundle actually adds by
 * more than half. Andika is counted apart because it is in the bundle for a
 * reason of its own, so whether to carry it is a decision someone may want to
 * take on its own numbers.
 */
function report(families) {
  console.log(
    "\nFamily                                 files      raw    brotli"
  );
  let files = 0;
  let raw = 0;
  let br = 0;
  let companionFiles = 0;
  let companionRaw = 0;
  let companionBr = 0;

  for (const family of families) {
    const familyRaw = sum(family.styles.map((face) => face.bytes.length));
    const familyBr = sum(
      family.styles.map((face) => brotli(face.bytes).length)
    );
    const styles = family.styles.map((face) => face.style).join("/");
    console.log(
      `${family.family.padEnd(32)} ${styles.padEnd(9)} ${kb(familyRaw).padStart(8)} ${kb(
        familyBr
      ).padStart(9)}`
    );
    files += family.styles.length;
    raw += familyRaw;
    br += familyBr;
    if (family.familyid === COMPANION_ID) {
      companionFiles = family.styles.length;
      companionRaw = familyRaw;
      companionBr = familyBr;
    }
  }

  console.log(
    `\nWhole bundle:      ${files} files, ${kb(raw)} raw, ${kb(br)} brotli`
  );
  console.log(
    `Without Andika:    ${files - companionFiles} files, ${kb(
      raw - companionRaw
    )} raw, ${kb(br - companionBr)} brotli`
  );
  console.log(
    `Andika alone:      ${companionFiles} files, ${kb(companionRaw)} raw, ${kb(
      companionBr
    )} brotli`
  );
}

function brotli(data) {
  return brotliCompressSync(data, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  });
}

function sum(numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}

function kb(bytes) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  return await response.json();
}

async function fetchBytes(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  return await response.arrayBuffer();
}
