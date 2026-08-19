// eBible.org's translation catalogue, read for one thing only: which writing
// systems it has a text in. Nothing here fetches a scripture file, and nothing
// here reads scripture text — the catalogue is a 700 KB CSV index of what
// exists, the same kind of metadata Bloom's `language` table is.
//
// Why the catalogue can name a script and Bloom's cannot: eBible records one per
// translation, in a free-text `script` column ("Latin", "Devanagari",
// "Ethiopic (Ge'ez)"). Most of it maps cleanly onto ISO 15924; a few entries name
// a language rather than a script ("Amheric", "Hindi", "Nepali") or decline to
// say ("Code for uncoded script"), and those fall back to langtags' default
// script for the language code, which is the same rule the Bloom set uses. Both
// paths are counted so the page can say how many took which.
//
// What a text in a language is evidence OF is a separate question, and a sharper
// one here than for Bloom: a scripture translation is running text somebody
// published for readers of the language, so it can support an alphabet, but as
// *sample text* it carries the content risk docs/bloom-walker-plan.md already
// names. This module counts corpora; it does not propose a harvest.

/** ISO 15924 for the script names the catalogue actually uses. */
const SCRIPT_CODES = {
  Latin: "Latn",
  "Latin (Roman) with Papua New Guinea enhancements": "Latn",
  Devanagari: "Deva",
  "Devanagari (Nagari)": "Deva",
  Arabic: "Arab",
  Ethiopic: "Ethi",
  "Ethiopic (Geʻez)": "Ethi",
  Telugu: "Telu",
  Bengali: "Beng",
  Khmer: "Khmr",
  Thai: "Thai",
  Cyrillic: "Cyrl",
  Tibetan: "Tibt",
  Hebrew: "Hebr",
  Malayalam: "Mlym",
  Tamil: "Taml",
  Coptic: "Copt",
  Gujarati: "Gujr",
  Kannada: "Knda",
  "Unified Canadian Aboriginal Syllabics": "Cans",
  Oriya: "Orya",
  Syriac: "Syrc",
  "Han (Simplified variant)": "Hans",
  "Han (Traditional Variant)": "Hant",
  Thaana: "Thaa",
  "Kayah Li": "Kali",
  Burmese: "Mymr",
  Lao: "Laoo",
  Gurmukhi: "Guru",
  Tifinagh: "Tfng",
  Tifenagh: "Tfng",
  "Syloti Nagri": "Sylo",
};

export const TRANSLATIONS_CSV = "https://ebible.org/Scriptures/translations.csv";

/** RFC 4180 enough for this file: quoted fields, doubled quotes, CRLF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let at = 0; at < text.length; at++) {
    const char = text[at];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (text[at + 1] === '"') {
        cell += '"';
        at++;
      } else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * One entry per writing system eBible has a translation in, keyed
 * `{language}-{Script}`, with how many translations sit behind it and how many
 * of those the catalogue marks redistributable.
 *
 * `defaultScriptFor` is asked for a script only when the catalogue's own name
 * for one is not an ISO 15924 script; it takes the language code and returns a
 * script subtag or undefined.
 */
export async function ebibleWritingSystems(defaultScriptFor) {
  const response = await fetch(TRANSLATIONS_CSV);
  if (!response.ok)
    throw new Error(
      `eBible catalogue: ${response.status} ${response.statusText}`
    );
  const rows = parseCsv((await response.text()).replace(/^﻿/, ""));
  const header = rows[0] ?? [];
  const column = (name) => header.indexOf(name);
  const codeAt = column("languageCode");
  const scriptAt = column("script");
  const redistributableAt = column("Redistributable");
  if (codeAt < 0 || scriptAt < 0)
    throw new Error("eBible catalogue: no languageCode/script column");

  const systems = new Map();
  const counts = {
    translations: 0,
    /** The catalogue named a script we could map to ISO 15924. */
    scriptNamed: 0,
    /** It named something else, so langtags' default for the code stood in. */
    scriptFromLangtags: 0,
    /** No script either way: no writing system to count. */
    unresolved: 0,
  };
  for (const row of rows.slice(1)) {
    if (row.length < header.length) continue;
    const code = (row[codeAt] ?? "").trim();
    if (!code) continue;
    counts.translations++;
    let script = SCRIPT_CODES[(row[scriptAt] ?? "").trim()];
    if (script) counts.scriptNamed++;
    else {
      script = defaultScriptFor(code);
      if (!script) {
        counts.unresolved++;
        continue;
      }
      counts.scriptFromLangtags++;
    }
    const tag = `${code}-${script}`;
    const seen = systems.get(tag) ?? { translations: 0, redistributable: 0 };
    seen.translations++;
    if ((row[redistributableAt] ?? "").trim() === "True")
      seen.redistributable++;
    systems.set(tag, seen);
  }
  return { systems, counts };
}
