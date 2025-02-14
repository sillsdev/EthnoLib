/* eslint-disable @typescript-eslint/no-explicit-any */
// This file has lots of anys in order to parse and process langtags.json
import { iso15924 } from "iso-15924";
import langTagsJson from "./language-data/langtags.json" assert { type: "json" };
import fs from "fs";
import {
  ILanguage,
  IScript,
  MACROLANGUAGE_SITUATION_UNKNOWN,
} from "./findLanguageInterfaces";

const COMMA_SEPARATOR = ", ";

const scriptNames = iso15924.reduce(
  (acc, entry) => ({ ...acc, [entry.code]: entry.name }),
  {}
) as any;

const isoCodesDetails = {};
const iso639_1To639_3 = {};
const iso639_3Codes = new Set();
const mappableIso639_1Codes = new Set();
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
  iso639_3Codes.add(iso639_3Code);
  const iso639_1Code = parts[3];
  if (iso639_1Code) {
    mappableIso639_1Codes.add(iso639_1Code);
    iso639_1To639_3[iso639_1Code] = iso639_3Code;
  }

  const scope = parts[4];
  const typeLetter = parts[5];
  let languageType;
  switch (typeLetter) {
    case "A":
      languageType = "Ancient";
      break;
    case "C":
      languageType = "Constructed";
      break;
    case "E":
      languageType = "Extinct";
      break;
    case "H":
      languageType = "Historical";
      break;
    case "L":
      languageType = "Living";
      break;
    case "S":
      languageType = "Special";
      break;
    default:
      languageType = "Unknown";
  }
  isoCodesDetails[iso639_3Code] = {
    isMacrolanguage: scope === "M",
    languageType,
  };
}

function isMacrolanguage(iso639_3: string) {
  return isoCodesDetails[iso639_3]?.isMacrolanguage || false;
}

// From the Langtags repo:
// "For many macro languages, there is a representative language for that macrolanguage. In many cases the macro language code is more popular than the representative langauge code. Thus, for example, in the CLDR, the macro language code is used instead of the representative language code. For this reason, langtags.json unifies the representative language tags into the macro language tag set rather than having a separate tag set for them, and gives the tag for the tag set in terms of the macro language rather than the representative language."
// So in langtags.json, for representative languages, the iso639_3 field is often the macrolangauge code,
// but the tags field (in some but not all entries) contains equivalent tags that use the individual language codes.
// We want to save the individual language codes, so gather as many macrolangauge to representative individual language
// mappings as we can. As of 2/2025, this covers all macrolanguage codes in langtags.json except for
// bnc, nor, san, hbs, and zap which should all be handled by search result modifiers.
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

interface ILanguageInternal {
  autonym: string;
  exonym: string;
  iso639_3_code: string;
  languageSubtag: string;
  regionNames: Set<string>; // ISO 3166 codes
  names: Set<string>;
  scripts: Set<string>;
  alternativeTags: Set<string>;
}

function findPotentialIso639_3Code(languageTag: string): string | undefined {
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
    entry.macrolang, // A macrolanguage that contains this language. Include so this language will come up when people search the macrolanguage name
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
    // over the "localname" field (which may be specific to a language/region/script combo)
    // Some languages may have an entry with "localname" but not "localname" and another entry with "localname" but not "localnames"
    langs[entry.iso639_3].autonym = entry.localnames
      ? entry.localnames[0]
      : langs[entry.iso639_3].autonym || entry.localname;
    langs[entry.iso639_3].regionNames.add(entry.regionname);
    langs[entry.iso639_3].scripts.add(entry.script);
    langs[entry.iso639_3].names = new Set([
      ...langs[entry.iso639_3].names,
      ...getAllPossibleNames(entry),
    ]);
    langs[entry.iso639_3].alternativeTags = new Set([
      ...langs[entry.iso639_3].alternativeTags,
      entry.full,
      ...(entry.tags ?? []),
    ]);
    langs[entry.iso639_3].isRepresentativeForMacrolang =
      langs[entry.iso639_3].isRepresentativeForMacrolang ||
      entry.isRepresentativeForMacrolang;
  } else {
    // create a new entry for this language code
    langs[entry.iso639_3] = {
      autonym: entry.localnames ? entry.localnames[0] : entry.localname,
      exonym: entry.name,
      iso639_3_code: entry.iso639_3 as string,
      languageSubtag: entry.tag.split("-")[0], // might be 2-letter
      regionNames: new Set([entry.regionname]),
      names: getAllPossibleNames(entry),
      scripts: new Set([entry.script]),
      isRepresentativeForMacrolang: entry.isRepresentativeForMacrolang,
      alternativeTags: new Set([entry.full, ...(entry.tags || [])]),
      languageType: languageType(entry.iso639_3),
    } as ILanguageInternal;
  }
}

function findIndivIsoCode(macrolangEntry: any) {
  const macrolangCode = macrolangEntry.iso639_3;
  const alreadyFoundChildCodes = new Set();
  for (const tag of macrolangEntry.tags || []) {
    const childCode = findPotentialIso639_3Code(tag);
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
    if (isMacrolanguage(entry.iso639_3)) {
      const indivIsoCode = macrolangsToRepresentativeLangs[entry.iso639_3];
      if (indivIsoCode) {
        addOrCombineLangtagsEntry(
          {
            ...entry,
            iso639_3: indivIsoCode,
            isRepresentativeForMacrolang: entry.iso639_3,
          },
          consolidatedLangTags
        );
      } else {
        console.log("No indivIsoCode found for macrolang", entry.iso639_3);
        addOrCombineLangtagsEntry(
          {
            ...entry,
            isRepresentativeForMacrolang: MACROLANGUAGE_SITUATION_UNKNOWN,
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
      return {
        autonym: uncomma(langData.autonym),
        exonym: uncomma(langData.exonym),
        iso639_3_code: langData.iso639_3_code,
        languageSubtag: langData.languageSubtag,
        regionNames: [...(uncommaAll(langData.regionNames) as Set<string>)]
          .filter((regionName) => !!regionName)
          .join(COMMA_SEPARATOR),
        scripts: [...new Set([...langData.scripts])].map((scriptCode) => {
          return {
            code: scriptCode,
            name: uncomma(scriptNames[scriptCode]),
          } as IScript;
        }),
        names: [...uncommaAll(langData.names)].filter((name) => !!name),
        alternativeTags: [...langData.alternativeTags],
        isRepresentativeForMacrolang: langData.isRepresentativeForMacrolang,
        languageType: langData.languageType,
      } as ILanguage;
    }
  );

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

parseLangtagsJson();
parseLangTagsTxt();
