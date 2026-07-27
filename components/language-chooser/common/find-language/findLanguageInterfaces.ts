import { iso15924 } from "iso-15924";

export interface IRegion {
  name: string;
  code: string;
}

export interface IScript {
  code: string;
  name: string;
  // true = right-to-left, false = left-to-right, undefined = we don't know.
  // Undefined is a real and meaningful state: see isRTLScript below for the
  // cases that produce it. Consumers that need a hard boolean should decide
  // their own fallback (`script.isRtl ?? false`) rather than assume we
  // determined the direction to be left-to-right.
  isRtl?: boolean;
  languageNameInScript?: string;
}

export enum LanguageType {
  Ancient = "Ancient",
  Constructed = "Constructed",
  Extinct = "Extinct",
  Historical = "Historical",
  Living = "Living",
  Special = "Special",
  Unknown = "Unknown",
  Custom = "Custom", // For special situation/user-entered languages that are not in langtags
}

export interface ILanguage {
  autonym?: string;
  exonym: string;
  iso639_3_code: string; // ISO 639-3 code
  languageSubtag: string; // BCP-47 canonical code, except for representative languages where the canonical code is actually the macrolanguage code, in which case we use a specifically individual language code instead
  regionNamesForDisplay: string; // For macrolanguages, we display a region but don't want the macrolanguage to come up in searches for that region
  regionNamesForSearch: string[];
  names: string[];
  scripts: IScript[];
  variants?: string; // comma-joined
  alternativeTags: string[];
  isMacrolanguage: boolean;
  // The macrolanguage which includes this individual language, if applicable.
  // As of March 2025, the parentMacrolanguage lacks scripts and other data, we put just enough info to facilitate searching
  parentMacrolanguage?: ILanguage;
  // This is an individual language which the parent macrolanguage code is sometimes used to represent. See macrolanguageNotes.md
  // If isMacrolanguage and isRepresentativeForMacrolanguage are both true, this language is an anomalous case which probably needs special handling
  isRepresentativeForMacrolanguage?: boolean;
  languageType: LanguageType;
  // This field should only be used for a language that was manually entered, i.e. the full langtag is not in langtags.json
  manuallyEnteredTag?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // allow indexing by string
}

export interface ICustomizableLanguageDetails {
  customDisplayName?: string;
  region?: IRegion;
  dialect?: string;
}

export interface IOrthography {
  language?: ILanguage;
  script?: IScript;
  customDetails?: ICustomizableLanguageDetails;
}

// ISO 15924 codes which are placeholders rather than actual scripts, so
// reading direction is either unknown or not applicable. Zxxx in particular
// covers 165 languages in our data (mostly sign languages), which have no
// written form and therefore no reading direction at all. Intl reports all of
// these as "ltr", which is a fabricated answer rather than a real one.
const SCRIPT_CODES_WITH_NO_DIRECTION = new Set([
  "Zinh", // inherited
  "Zmth", // mathematical notation
  "Zsye", // symbols (emoji variant)
  "Zsym", // symbols
  "Zxxx", // unwritten
  "Zyyy", // undetermined
  "Zzzz", // uncoded
]);

// Scripts a runtime's ICU build may not know are right-to-left yet. This is
// deliberately NOT a mirror of CLDR's RTL list: Intl agrees with CLDR on 178
// of the 179 scripts CLDR has an explicit verdict for, so duplicating that
// list would add a second source of truth to maintain for no benefit. Only
// genuine gaps belong here, and entries should be deleted as ICU catches up.
//
// Verified against field 6 (RTL) of CLDR release-48-2 scriptMetadata.txt:
// https://github.com/unicode-org/cldr/blob/release-48-2/common/properties/scriptMetadata.txt
const RTL_SCRIPTS_UNKNOWN_TO_OLDER_ICU = new Set([
  // Sidetic, added in Unicode 16. Node 22 reports it as left-to-right.
  "Sidt",
]);

const ISO_15924_CODES = new Set(iso15924.map((script) => script.code));

// ISO 15924 states variant relationships in its own script names: Aran is
// "Arabic (Nastaliq variant)", Syrj is "Syriac (Western variant)", and so on.
// Neither Intl nor CLDR carries direction data for those variant codes, but a
// Nastaliq Arabic document is still Arabic, so we take the parent's direction.
//
// This is derived from the registry rather than hand-listed so that a variant
// code added upstream is picked up when the iso-15924 dependency is bumped,
// and so nobody has to trust a transcribed table. It currently resolves:
//   Aran -> Arab, Syre/Syrj/Syrn -> Syrc  (these four change the answer)
//   Cyrs -> Cyrl, Latf/Latg -> Latn, Hans/Hant -> Hani  (same answer either way)
const SCRIPT_CODE_VARIANT_PARENTS: ReadonlyMap<string, string> = (() => {
  const codesByScriptName = new Map<string, string>();
  for (const { code, name, pva } of iso15924) {
    codesByScriptName.set(name.toLowerCase(), code);
    if (pva) codesByScriptName.set(pva.toLowerCase().replace(/_/g, " "), code);
  }

  const parents = new Map<string, string>();
  for (const { code, name } of iso15924) {
    // Matches "<parent script name> (<qualifier> variant)".
    const match = name.match(/^(.+?)\s*\([^)]*variant[^)]*\)$/i);
    if (!match) continue;
    const parent = codesByScriptName.get(match[1].trim().toLowerCase());
    // A placeholder keeps its own "no direction" answer; Zsye is "Symbols
    // (Emoji variant)" and must not inherit anything from Zsym.
    if (
      parent &&
      parent !== code &&
      !SCRIPT_CODES_WITH_NO_DIRECTION.has(code)
    ) {
      parents.set(code, parent);
    }
  }

  // The one variant relationship the registry does not put in a name: ISO 15924
  // lists Phli "Inscriptional Pahlavi" and Phlp "Psalter Pahlavi" (both RTL per
  // CLDR) beside Phlv "Book Pahlavi", with nothing tying them together
  // mechanically. Reachable only by typing a tag by hand, never from a search.
  parents.set("Phlv", "Phli");

  return parents;
})();

// ISO 15924 reserves Qaaa through Qabx for private use. The registry only
// lists the two endpoints, so we range check instead of looking them up.
function isPrivateUseScriptCode(titleCaseCode: string): boolean {
  return (
    /^Qa[ab][a-z]$/.test(titleCaseCode) &&
    titleCaseCode >= "Qaaa" &&
    titleCaseCode <= "Qabx"
  );
}

// Script codes are conventionally title case (e.g. "Arab"), but tags that a
// user typed by hand may not be.
function toTitleCase(scriptCode: string): string {
  return scriptCode.charAt(0).toUpperCase() + scriptCode.slice(1).toLowerCase();
}

// Determines a script's reading direction, or undefined if we cannot know it.
//
// Returning undefined rather than false matters because "we know this script
// is left-to-right" and "we have no idea" call for different handling: a
// consumer storing a writing system's direction can leave an existing setting
// (or a user's own choice) alone instead of silently overwriting it with a
// guess. We report undefined for placeholder script codes, private use codes,
// and anything that isn't a real ISO 15924 script.
//
// Intl remains the authority for the actual left/right answer. It reports
// "ltr" for every script it has no real data on, which keeps a useful answer
// for the obscure tail (Tengwar, Mayan hieroglyphs, Braille and so on) at the
// cost of trusting a default we cannot verify. Because of that fallback, the
// answer for a very new script can differ between ICU builds; only outright
// gaps are pinned above. Egyptian demotic (Egyd) and hieratic (Egyh) are the
// known weak spots: both were normally written right to left, but they are
// unencoded and no machine-readable source states a direction, so rather than
// assert one we let them fall through and report left-to-right.
//
// Intl.Locale takes in a bcp47 tag, but here we are giving it
// the tag und-{insert script code}, where the und means no
// specified language, so that the rtl attribute will be based
// solely on the selected script. If you give the full tag generated
// by createTagFromOrthography, and use .maximizeSince to get the
// most possible values, then you can actually end up with the wrong
// rtl attribute. For example, if you were to choose the Uzbek langauge
// and the country Afghanistan, you would get the tag uz-AF. You can
// specify the Latin script for this combination, but looking up the script
// uz-AF can create a mismatch between Arabic(RTL) and Latin(LTR), since the
// .maximize will return the Arabic script for uz-AF. We always want the
// isRtl setting to match its IScript in every case, which can accomplish
// with und-{script}.
export function isRTLScript(scriptCode: string): boolean | undefined {
  if (!scriptCode) {
    return undefined;
  }
  const code = toTitleCase(scriptCode);

  if (
    SCRIPT_CODES_WITH_NO_DIRECTION.has(code) ||
    isPrivateUseScriptCode(code) ||
    // A well formed but unregistered code such as "Xyzw" is not a script we
    // know anything about, even though Intl will confidently answer "ltr".
    !ISO_15924_CODES.has(code)
  ) {
    return undefined;
  }

  // A variant code carries the direction of the script it is a variant of.
  const effectiveCode = SCRIPT_CODE_VARIANT_PARENTS.get(code) ?? code;

  // No registry entry currently pairs a real script with a placeholder parent,
  // but if one ever appears the variant must inherit "no direction" rather than
  // fall through to the Intl default below.
  if (SCRIPT_CODES_WITH_NO_DIRECTION.has(effectiveCode)) {
    return undefined;
  }

  if (RTL_SCRIPTS_UNKNOWN_TO_OLDER_ICU.has(effectiveCode)) {
    return true;
  }

  try {
    const locale = new Intl.Locale(`und-${effectiveCode}`);
    // getTextInfo is the standardized property; textInfo is the older name
    const info = locale.getTextInfo?.() ?? (locale as any).textInfo;
    if (info?.direction !== "rtl" && info?.direction !== "ltr") {
      return undefined;
    }
    return info.direction === "rtl";
  } catch {
    // A malformed script code makes Intl.Locale throw, leaving us with no
    // direction information for it.
    return undefined;
  }
}
