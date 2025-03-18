/* eslint-disable @typescript-eslint/no-explicit-any */
// This file has lots of anys in order to parse and process langtags.json
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

const COMMA_SEPARATOR = ", ";

const scriptNames = iso15924.reduce(
  (acc, entry) => ({ ...acc, [entry.code]: entry.name }),
  {}
) as any;

const isoCodesDetails = {};
const iso639_1To639_3 = {};

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
  };
  isoCodesDetails[iso639_3Code] = {
    isMacrolanguage,
    languageType,
    iso639_3Code,
    iso639_1Code,
    name,
  };
}

function isMacrolanguage(iso639_3: string) {
  return isoCodesDetails[iso639_3]?.isMacrolanguage || false;
}

const macrolangMappingFile = fs.readFileSync(
  "language-data/iso-639-3-macrolanguages.tab",
  "utf8"
);
const indivlangsToMacrolangs = {};
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
const macrolangsToRepresentativeLangs = {};
const langTags = langTagsJson as any[];
for (const entry of langTags) {
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

function languageType(iso639_3: string) {
  return isoCodesDetails[iso639_3]?.languageType || "Unknown";
}

// turn "Uzbek, Northern" into "Northern Uzbek"
function uncomma(str: string | undefined) {
  if (!str) {
    return str;
  }
  const parts = str.split(COMMA_SEPARATOR);
  if (parts.length === 1) {
    return str;
  }
  return parts[1] + " " + parts[0];
}

function uncommaAll(strs: Set<string>) {
  const newSet = new Set<string>();
  strs.forEach((item: string) => {
    newSet.add(uncomma(item) as string);
  });
  return newSet;
}

const macrolanguagesByCode: { [key: string]: ILanguage } = {};
for (const {
  isMacrolanguage,
  name,
  iso639_3Code,
  iso639_1Code,
} of Object.values(isoCodesDetails) as any) {
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

interface ILanguageInternal {
  autonym: string;
  exonym: string;
  iso639_3_code: string;
  languageSubtag: string;
  regionNames: Set<string>; // ISO 3166 codes
  names: Set<string>;
  scripts: { [key: string]: IScript };
  alternativeTags: Set<string>;
}

function findPotentialIso639Code(languageTag: string): string | undefined {
  const parts = languageTag.split("-");
  const code = parts[0];
  if (code.length === 3) {
    return code;
  } else if (code.length === 2) {
    return iso639_1To639_3[code];
  }
  return undefined;
}

function getAllPossibleNames(entry: any) {
  return new Set([
    ...(entry.names || []),
    entry.localname,
    entry.name,
    ...(entry.localnames || []),
    ...(entry.iana || []),
    ...(entry.latnnames || []),
  ]);
}

// We want to have one entry for every ISO 639-3 code, whereas langtags.json sometimes has multiple entries per code
// Combine entry into the entry with matching ISO 630-3 code in langs if there is one, otherwise create a new entry
function addOrCombineLangtagsEntry(entry: any, langs: any) {
  if (!entry.iso639_3) {
    // langTags.json has metadata items in the same list mixed in with the data entries
    return;
  }

  if (langs[entry.iso639_3]) {
    // We already have an entry with this code, combine with it

    // We prioritize autonyms from the "localnames" field (which matches ethnologue if present)
    // over the "localname" field (which is from CLDR and may be specific to a region e.g. "español de México")
    // Some languages may have an entry with "localname" but not "localname" and another entry with "localname" but not "localnames"
    langs[entry.iso639_3].autonym = entry.localnames
      ? entry.localnames[0]
      : langs[entry.iso639_3].autonym || entry.localname;
    langs[entry.iso639_3].regionNames.add(entry.regionname);
    if (
      // some languages will have multiple entries with the same script. If so we just want to make sure we take one that has an autonym if possible
      !langs[entry.iso639_3].scripts[entry.script] ||
      (entry.localnames?.length || 0) > 0
    ) {
      langs[entry.iso639_3].scripts[entry.script] = {
        code: entry.script,
        name: scriptNames[entry.script],
        languageNameInScript:
          (entry.localnames || [undefined])[0] ||
          langs[entry.iso639_3].scripts[entry.script]?.autonym ||
          entry.localname,
      } as IScript;
    }
    langs[entry.iso639_3].names = new Set([
      ...langs[entry.iso639_3].names,
      ...getAllPossibleNames(entry),
    ]);
    langs[entry.iso639_3].alternativeTags = new Set([
      ...langs[entry.iso639_3].alternativeTags,
      entry.full,
      ...(entry.tags ?? []),
    ]);

    langs[entry.iso639_3].isRepresentativeForMacrolanguage =
      langs[entry.iso639_3].isRepresentativeForMacrolanguage ||
      entry.isRepresentativeForMacrolanguage;
  } else {
    const scriptCode = entry.script;
    const scripts = {};
    if (scriptCode) {
      scripts[scriptCode] = {
        code: scriptCode,
        name: scriptNames[scriptCode],
        languageNameInScript:
          (entry.localnames || [undefined])[0] || entry.localname,
      } as IScript;
    }
    // create a new entry for this language code
    langs[entry.iso639_3] = {
      autonym: entry.localnames ? entry.localnames[0] : entry.localname,
      exonym: entry.name,
      iso639_3_code: entry.iso639_3 as string,
      languageSubtag: entry.tag.split("-")[0], // might be 2-letter
      regionNames: new Set([entry.regionname]),
      names: getAllPossibleNames(entry),
      scripts,
      parentMacrolanguage:
        macrolanguagesByCode[indivlangsToMacrolangs[entry.iso639_3]],
      isRepresentativeForMacrolanguage: entry.isRepresentativeForMacrolanguage,
      isMacrolanguage: isMacrolanguage(entry.iso639_3),
      alternativeTags: new Set([entry.full, ...(entry.tags || [])]),
      languageType: languageType(entry.iso639_3),
    } as ILanguageInternal;
  }
}

function findIndivIsoCode(macrolangCodeEntry: any) {
  const macrolangCode = macrolangCodeEntry.iso639_3;
  const alreadyFoundChildCodes = new Set();
  for (const tag of macrolangCodeEntry.tags || []) {
    const childCode = findPotentialIso639Code(tag);
    if (childCode && childCode !== macrolangCode) {
      alreadyFoundChildCodes.add(childCode);
    }
  }

  // one of the childcodes could have been a 2 letter equivalent yielding the same macrolang code
  alreadyFoundChildCodes.delete(macrolangCode);

  if (alreadyFoundChildCodes.size === 1) {
    return [...alreadyFoundChildCodes][0];
  }
  return undefined;
}

function parseLangtagsJson() {
  // We want to have one entry for every ISO 630-3 code, whereas langtags.json sometimes has multiple entries per code
  const langTags = langTagsJson as any[];
  const consolidatedLangTags = {};
  for (const entry of langTags) {
    const languageSubtag = entry.tag.split("-")[0];
    // If listed with a macrolanguage code, this is a "representative language", we need to identify it by its equivalent
    // individual language code. See macrolanguageNotes.md
    if (isMacrolanguage(entry.iso639_3) || isMacrolanguage(languageSubtag)) {
      const indivIsoCode = isMacrolanguage(entry.iso639_3)
        ? macrolangsToRepresentativeLangs[entry.iso639_3]
        : entry.iso639_3;
      if (indivIsoCode) {
        addOrCombineLangtagsEntry(
          {
            ...entry,
            iso639_3: indivIsoCode,
            tag: indivIsoCode,
            isRepresentativeForMacrolanguage: true,
          },
          consolidatedLangTags
        );
      } else {
        // This is a data anomaly but we do have 5 as of Feb 2025: bnc, nor, san, hbs, zap
        // See macrolanguageNotes.md. These cases should be specially handled.
        console.log(
          "No indivIsoCode found for macrolang",
          entry.iso639_3,
          entry.tag
        );
        addOrCombineLangtagsEntry(
          {
            ...entry,
            isRepresentativeForMacrolanguage: true,
          },
          consolidatedLangTags
        );
      }
    } else {
      addOrCombineLangtagsEntry(entry, consolidatedLangTags);
    }
  }

  // Tweak some of the data into the format we want
  const reformattedLangs = Object.values(consolidatedLangTags).map(
    (langData: any) => {
      // Don't repeat the autonym and exonym in the names list
      langData.names.delete(langData.autonym);
      langData.names.delete(langData.exonym);
      const regionNamesForSearch = [
        ...(uncommaAll(langData.regionNames) as Set<string>),
      ].filter((regionName) => !!regionName);
      const regionNamesForDisplay = regionNamesForSearch.join(COMMA_SEPARATOR);
      return {
        autonym: uncomma(langData.autonym),
        exonym: uncomma(langData.exonym),
        iso639_3_code: langData.iso639_3_code,
        languageSubtag: langData.languageSubtag,
        // For all these normal individual languages, we display and search key the same region list
        regionNamesForSearch,
        regionNamesForDisplay,
        scripts: Object.values(langData.scripts),
        names: [...uncommaAll(langData.names)].filter((name) => !!name),
        alternativeTags: [...langData.alternativeTags],
        parentMacrolanguage: langData.parentMacrolanguage,
        isMacrolanguage: langData.isMacrolanguage,
        isRepresentativeForMacrolanguage:
          langData.isRepresentativeForMacrolanguage,
        languageType: langData.languageType,
      } as ILanguage;
    }
  );

  // Add macrolanguages to the list
  for (const macrolang of Object.values(macrolanguagesByCode)) {
    // check if consolidatedLangTags already has this macrolanguage
    if (consolidatedLangTags[macrolang.iso639_3_code]) {
      // This is one of the special cases and has already been added as if an individual language
      continue;
    } else {
      //add the macrolanguage to the list
      reformattedLangs.push(macrolang);
    }
  }

  //   write langs to a json file
  const data = JSON.stringify(reformattedLangs);
  fs.writeFileSync("language-data/languageData.json", data);
}

function parseLangTagsTxt() {
  /*
  From https://github.com/silnrsi/langtags/blob/master/doc/langtags.md 
  Langtags.txt contains a sequence of equivalence sets. Each set consists of a 
  list of language tags separated by =. The first tag on the line is the canonical
   tag and the last tag on the line is the maximal tag. In addition, a tag is 
   prefixed with * if there is an entry in the SLDR for that particular tag. */
  const langTagsTxtRaw = fs.readFileSync("language-data/langtags.txt", "utf8");
  const langTagsTxt = langTagsTxtRaw.replaceAll("*", "");
  const lines = langTagsTxt.split("\n");
  const tagLookups: any[] = [];
  for (const line of lines) {
    if (line.length === 0) {
      continue;
    }
    const tags = line.split(" = ");
    tagLookups.push({
      shortest: tags[0],
      maximal: tags[tags.length - 1],
      allTags: tags,
    });
  }
  fs.writeFileSync(
    "language-data/equivalentTags.json",
    JSON.stringify(tagLookups)
  );
}

function defaultScriptForLanguage(
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

parseLangtagsJson();
parseLangTagsTxt();
