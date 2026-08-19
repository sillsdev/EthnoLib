// langtags.json read two ways: as the list of writing systems stage 1
// pre-populates, and as the lookup that gives a bare tag its script in stages
// 2 and 3.
//
// The file is SIL's, and the repo already ships a copy for the language
// chooser, so nothing here downloads anything. Entries whose tag starts with
// `_` are the file's own metadata (`_version`, `_conformance`) rather than
// languages.
//
// A writing system here is `{language}-{Script}`: region and variants are
// dropped, because a claim is about how a language is written and not about
// where. `full` is the field to read that off, since langtags guarantees it
// spells the language, script and region out even when `tag` doesn't.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The copy the language chooser already ships, relative to this file. */
export const DEFAULT_LANGTAGS_PATH = fileURLToPath(
  new URL(
    "../../../components/language-chooser/common/find-language/language-data/source/langtags.json",
    import.meta.url
  )
);

/**
 * Scripts that name the absence of an answer rather than a writing system:
 * Zxxx "unwritten", Zyyy "undetermined", Zzzz "unknown". They pass the
 * database's script-subtag check, so callers that want them out have to say so.
 */
export const NON_SCRIPTS = new Set(["Zxxx", "Zyyy", "Zzzz"]);

export function loadLangtags(path = DEFAULT_LANGTAGS_PATH) {
  const entries = JSON.parse(readFileSync(path, "utf8"));
  return entries.filter((entry) => !String(entry.tag ?? "").startsWith("_"));
}

/**
 * One record per `{language}-{Script}`, first entry wins for the name. The
 * order is langtags' own, which is alphabetical by tag.
 */
export function writingSystems(entries) {
  const systems = new Map();
  for (const entry of entries) {
    const parsed = writingSystemOf(entry.full);
    if (!parsed) continue;
    if (systems.has(parsed.tag)) continue;
    systems.set(parsed.tag, {
      tag: parsed.tag,
      script: parsed.script,
      language: parsed.language,
      name: typeof entry.name === "string" ? entry.name : undefined,
    });
  }
  return systems;
}

/** `aa-Latn-ET` → `{ tag: 'aa-Latn', language: 'aa', script: 'Latn' }`. */
export function writingSystemOf(full) {
  if (typeof full !== "string") return undefined;
  const parts = full.split("-");
  if (parts.length < 2 || !isScriptSubtag(parts[1])) return undefined;
  const script = titleCaseScript(parts[1]);
  return { tag: `${parts[0]}-${script}`, language: parts[0], script };
}

export function isScriptSubtag(subtag) {
  return /^[A-Za-z]{4}$/.test(subtag ?? "");
}

export function titleCaseScript(subtag) {
  return subtag[0].toUpperCase() + subtag.slice(1).toLowerCase();
}

/**
 * A source's own tag, rewritten to name the script we actually observed, with
 * everything else it carried left in place: `ar-SA` + Arab → `ar-Arab-SA`,
 * `ahk-Laoo-x-Ershee` + Latn → `ahk-Latn-x-Ershee`, `ace` + Arab → `ace-Arab`.
 *
 * Two rules meet here. The script comes from the text, because a source that
 * omits it is not evidence about it and one that states it can still be
 * carrying text in another. And the rest of the tag survives, because a region
 * or private-use subtag is a distinction somebody drew on purpose and this
 * project is not the place it gets dropped.
 *
 * The database also requires a script subtag on every language row, so a tag
 * like `ar-SA` cannot be stored as it stands; this is what makes it storable
 * without discarding the `SA`.
 */
export function retagWithScript(tag, script) {
  const parts = String(tag).split("-").filter(Boolean);
  const named = titleCaseScript(script);
  if (isScriptSubtag(parts[1])) {
    parts[1] = named;
    return parts.join("-");
  }
  return [parts[0], named, ...parts.slice(1)].join("-");
}

/**
 * Every tag spelling langtags knows — the short `tag`, the alternates in
 * `tags`, and `full` — pointing at the writing system it belongs to. Lowercased
 * keys, because tag case is a convention and not a guarantee.
 *
 * This is what lets stages 2 and 3 turn an SLDR key like `ffm` into `ffm-Latn`.
 * A tag we don't find here can't be script-qualified, and the importer counts
 * it as a skip rather than guessing.
 */
export function tagIndex(entries) {
  const index = new Map();
  for (const entry of entries) {
    const parsed = writingSystemOf(entry.full);
    if (!parsed) continue;
    const record = {
      ...parsed,
      name: typeof entry.name === "string" ? entry.name : undefined,
    };
    const spellings = [entry.tag, entry.full, ...(entry.tags ?? [])];
    for (const spelling of spellings) {
      if (typeof spelling !== "string" || !spelling) continue;
      const key = spelling.toLowerCase();
      // First writing under a spelling wins: langtags lists a language's
      // primary script first, and a later entry reusing the spelling is the
      // less likely reading of it.
      if (!index.has(key)) index.set(key, record);
    }
  }
  return index;
}

/**
 * The writing system a tag belongs to, trying shorter and shorter forms — the
 * same walk `candidateTags` does in font-core, for the same reason: SLDR keys
 * carry regions and variants (`de-CH`, `acr-x-cubulco`) that langtags indexes
 * under the bare language.
 *
 * An explicit script subtag in the tag itself is believed without a lookup:
 * `abq-Latn` says which script it is even when langtags files Abaza under
 * Cyrillic.
 */
export function resolveWritingSystem(tag, index) {
  const parts = tag.split("-").filter(Boolean);
  if (parts.length === 0) return undefined;

  if (isScriptSubtag(parts[1])) {
    const script = titleCaseScript(parts[1]);
    const wsTag = `${parts[0]}-${script}`;
    const known = index.get(wsTag.toLowerCase());
    return {
      tag: wsTag,
      language: parts[0],
      script,
      name: known?.name,
      via: "explicit script",
    };
  }

  for (let length = parts.length; length >= 1; length--) {
    const candidate = parts.slice(0, length).join("-").toLowerCase();
    const found = index.get(candidate);
    if (found) {
      return {
        ...found,
        via: length === parts.length ? "langtags" : `langtags (${candidate})`,
      };
    }
  }
  return undefined;
}

/**
 * The subtags that are neither language, script nor region — `x-cubulco`,
 * `TARASK`, `POLYTON` — joined into a label. Those name an orthography, which
 * is exactly what `orthography_label` is for: rival orthographies in one script
 * are sibling rows that tell each other apart by this. A region alone is not an
 * orthography and yields nothing.
 */
export function orthographyLabelFrom(tag) {
  const parts = tag.split("-").filter(Boolean);
  const rest = [];
  let at = 1;
  if (isScriptSubtag(parts[at])) at++;
  if (parts[at] && /^([A-Za-z]{2}|\d{3})$/.test(parts[at])) at++;
  for (; at < parts.length; at++) {
    if (parts[at].toLowerCase() === "x") continue;
    rest.push(parts[at]);
  }
  return rest.length > 0 ? rest.join(" ") : undefined;
}
