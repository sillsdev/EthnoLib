import { iso15924 } from "iso-15924";
import langTagsJson from "./language-data/langtags.json" with { type: "json" };
import fs from "fs";
import { ILanguage, IScript, LanguageType } from "./findLanguageInterfaces";
import {
  defaultRegionForLangTag,
  getMaximalLangtag,
  splitTag,
} from "./languageTagUtils";
import { getScriptForLanguage } from "./regionsAndScripts";

export const COMMA_SEPARATOR = ", ";

export interface ILanguageInternal {
  autonym: string;
  exonym: string;
  iso639_3_code: string;
  languageSubtag: string;
  regionNames: Set<string>; // ISO 3166 codes
  names: Set<string>;
  scripts: { [key: string]: IScript };
  alternativeTags: Set<string>;
  isRepresentativeForMacrolanguage: boolean;
  isMacrolanguage: boolean;
  parentMacrolanguage?: ILanguage;
  languageType: LanguageType;
}

export interface ILangtagsJsonEntryInternal {
  full: string;
  iso639_3: string;
  iana: string[];
  latnnames: string[];
  localname: string;
  localnames: string[];
  macrolang: string;
  name: string;
  names: string[];
  nophonvars: boolean;
  obsolete: boolean; // TODO future work: look into whether we should use this
  region: string;
  regions: string[];
  regionname: string;
  rod: string;
  script: string;
  sldr: string;
  supress: boolean; // TODO future work: look into whether we should use this
  tag: string;
  tags: string[];
  unwritten: boolean; // TODO future work: look into whether we should use this
  variants: string[];
  windows: string;

  // These are not in the langtags.json file but may be added in the processing
  isRepresentativeForMacrolanguage: boolean;
}

interface IIsoCodeDetailsInternal {
  isMacrolanguage: boolean;
  languageType: LanguageType;
  iso639_3Code: string;
  iso639_1Code: string;
  name: string;
}

export const scriptNames: { [key: string]: string } = iso15924.reduce(
  (acc, entry) => ({ ...acc, [entry.code]: entry.name }),
  {}
);

// downloaded from https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3.tab
/*
         Scope   char(1) NOT NULL,  -- I(ndividual), M(acrolanguage), S(pecial)
         Type    char(1) NOT NULL,  -- A(ncient), C(onstructed),  
                                    -- E(xtinct), H(istorical), L(iving), S(pecial)
*/
const isoCodesDetailsFile = fs.readFileSync(
  "language-data/iso-639-3.tab",
  "utf8"
);

export const isoCodesDetails: { [key: string]: IIsoCodeDetailsInternal } = {};
export const iso639_1To639_3: { [key: string]: string } = {};

for (const line of isoCodesDetailsFile.split("\n")) {
  if (line.length === 0) {
    continue;
  }
  const parts = line.split("\t");
  const iso639_3Code = parts[0];
  const iso639_1Code = parts[3];
  if (iso639_1Code) {
    iso639_1To639_3[iso639_1Code] = iso639_3Code;
  }

  const scope = parts[4];
  const typeLetter = parts[5];
  let languageType;
  switch (typeLetter) {
    case "A":
      languageType = LanguageType.Ancient;
      break;
    case "C":
      languageType = LanguageType.Constructed;
      break;
    case "E":
      languageType = LanguageType.Extinct;
      break;
    case "H":
      languageType = LanguageType.Historical;
      break;
    case "L":
      languageType = LanguageType.Living;
      break;
    case "S":
      languageType = LanguageType.Special;
      break;
    default:
      languageType = LanguageType.Unknown;
  }
  const isMacrolanguage = scope === "M";
  const name = parts[6];
  isoCodesDetails[iso639_1Code] = {
    isMacrolanguage,
    languageType,
    iso639_3Code,
    iso639_1Code,
    name,
  } as IIsoCodeDetailsInternal;
  isoCodesDetails[iso639_3Code] = {
    isMacrolanguage,
    languageType,
    iso639_3Code,
    iso639_1Code,
    name,
  } as IIsoCodeDetailsInternal;
}

const macrolangMappingFile = fs.readFileSync(
  "language-data/iso-639-3-macrolanguages.tab",
  "utf8"
);
export const indivlangsToMacrolangs: { [key: string]: string } = {};
for (const line of macrolangMappingFile.split("\n")) {
  if (line.length === 0) {
    continue;
  }
  const parts = line.split("\t");
  const macrolangCode = parts[0];
  const indivLangCode = parts[1];
  indivlangsToMacrolangs[indivLangCode] = macrolangCode;
}

// From the Langtags repo:
// "For many macro languages, there is a representative language for that macrolanguage. In many cases the macro language code is more popular than the representative langauge code. Thus, for example, in the CLDR, the macro language code is used instead of the representative language code. For this reason, langtags.json unifies the representative language tags into the macro language tag set rather than having a separate tag set for them, and gives the tag for the tag set in terms of the macro language rather than the representative language."
// So in langtags.json, for representative languages, the iso639_3 field is often the macrolangauge code,
// but the tags field (in some but not all entries) contains equivalent tags that use the individual language codes.
// We want to save the individual language codes, so gather as many macrolangauge to representative individual language
// mappings as we can. As of 2/2025, this covers all macrolanguage codes in langtags.json except for
// bnc, nor, san, hbs, and zap which should all be handled by search result modifiers.
// See macrolanguageNotes.md for more explanation.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const langTags = langTagsJson as any[];
export const macrolangsToRepresentativeLangs: { [key: string]: string } = {};
for (const rawEntry of langTags) {
  const entry = rawEntry as ILangtagsJsonEntryInternal;
  if (isMacrolanguage(entry.iso639_3)) {
    const newIndivCode = findIndivIsoCode(entry);
    if (!newIndivCode) continue;
    if (
      macrolangsToRepresentativeLangs[entry.iso639_3] &&
      macrolangsToRepresentativeLangs[entry.iso639_3] !== newIndivCode
    ) {
      console.log(
        "conflicting representative lang for macrolang",
        entry.iso639_3,
        newIndivCode,
        macrolangsToRepresentativeLangs[entry.iso639_3]
      );
    }
    macrolangsToRepresentativeLangs[entry.iso639_3] = newIndivCode;
  }
}

export const macrolanguagesByCode: { [key: string]: ILanguage } = {};
for (const {
  isMacrolanguage,
  name,
  iso639_3Code,
  iso639_1Code,
} of Object.values(isoCodesDetails) as IIsoCodeDetailsInternal[]) {
  if (isMacrolanguage) {
    const representativeLangCode =
      macrolangsToRepresentativeLangs[iso639_3Code];
    let script;
    let region;
    if (!representativeLangCode) {
      console.log(
        // This is a data anomaly which will be handled with the individual languages
        "no representative lang code found for macrolang",
        iso639_3Code
      );
    } else {
      script =
        defaultScriptForLanguage(iso639_3Code) ||
        defaultScriptForLanguage(iso639_1Code) ||
        defaultScriptForLanguage(representativeLangCode);
      if (!script) {
        console.log("no script found for macrolang", iso639_3Code);
      }
      region =
        defaultRegionForLangTag(iso639_3Code) ||
        defaultRegionForLangTag(iso639_1Code) ||
        defaultRegionForLangTag(representativeLangCode);
      if (!region) {
        console.log("no region found for ", representativeLangCode);
      }
    }
    // We keep these macrolanguage entries minimal; we only want them to come up if user searches for the macrolanguage name or code
    macrolanguagesByCode[iso639_3Code] = {
      isMacrolanguage: true,
      iso639_3_code: iso639_3Code,
      languageSubtag: iso639_1Code || iso639_3Code, // from langtags.txt it looks like the ISO 639-1 code is generally used when a macrolanguage has one
      exonym: name.replace(" (macrolanguage)", ""), // we are already denoting elsewhere that this is a macrolanguage
      regionNamesForDisplay: region?.name || "",
      regionNamesForSearch: [], // We don't want these to come up in region searches
      names: [], // We delete the autonym and exonym from the names list to avoid repetitions
      scripts: script ? [script] : [],
      alternativeTags: [],
      languageType: LanguageType.Living,
    } as ILanguage;
  }
}

/* Helper Functions */

export function getLanguageType(iso639_3: string) {
  return isoCodesDetails[iso639_3]?.languageType || LanguageType.Unknown;
}
export function isMacrolanguage(iso639_3: string) {
  return isoCodesDetails[iso639_3]?.isMacrolanguage || false;
}

export function defaultScriptForLanguage(
  languageTag: string,
  language?: ILanguage
): IScript | undefined {
  let { languageSubtag, scriptSubtag } = splitTag(languageTag);

  // If there is no explicit script tag, get the maximal tag which will have the most likely script in it
  if (!scriptSubtag) {
    const maximalTag =
      getMaximalLangtag(languageTag) ||
      getMaximalLangtag(`${languageSubtag}`) ||
      "";
    scriptSubtag = splitTag(maximalTag).scriptSubtag;
  }
  if (!scriptSubtag) {
    return undefined;
  }
  return getScriptForLanguage(scriptSubtag, language);
}

function findIndivIsoCode(
  macrolangCodeEntry: ILangtagsJsonEntryInternal
): string | undefined {
  const macrolangCode = macrolangCodeEntry.iso639_3;
  const alreadyFoundChildCodes = new Set<string | undefined>();
  for (const tag of macrolangCodeEntry.tags || []) {
    const parts = tag.split("-");
    const isoCodeDetails =
      isoCodesDetails[parts[0]] || isoCodesDetails[iso639_1To639_3[parts[0]]];
    if (!isoCodeDetails) {
      // probably a deprecated code
      console.log("failed to find iso639_3 code for", tag);
      continue;
    }
    if (
      isoCodeDetails.isMacrolanguage ||
      isoCodeDetails.iso639_3Code === macrolangCode
    ) {
      continue;
    }
    alreadyFoundChildCodes.add(isoCodeDetails.iso639_3Code);
  }

  if (alreadyFoundChildCodes.size === 1) {
    return [...alreadyFoundChildCodes][0];
  }
  if (alreadyFoundChildCodes.size > 1) {
    console.log(
      "multiple child codes found for macrolang",
      macrolangCode,
      alreadyFoundChildCodes
    );
  }
  return undefined;
}

export function getAllPossibleNames(entry: ILangtagsJsonEntryInternal) {
  return new Set([
    ...(entry.names || []),
    entry.localname,
    entry.name,
    ...(entry.localnames || []),
    ...(entry.iana || []),
    ...(entry.latnnames || []),
  ]);
}

// turn "Uzbek, Northern" into "Northern Uzbek"
export function uncomma(str: string | undefined) {
  if (!str) {
    return str;
  }
  const parts = str.split(COMMA_SEPARATOR);
  if (parts.length === 1) {
    return str;
  }
  return parts[1] + " " + parts[0];
}

export function uncommaAll(strs: Set<string>) {
  const newSet = new Set<string>();
  strs.forEach((item: string) => {
    newSet.add(uncomma(item) as string);
  });
  return newSet;
}
