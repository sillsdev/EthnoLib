import { iso15924 } from "iso-15924";
import langTagsJson from "./langtags.json" assert { type: "json" };
import * as fs from "fs";
import { ILanguage, IScript } from "../findLanguageInterfaces";
// import iso3166 from "iso-3166-1";

const COMMA_SEPARATOR = ", ";

const scriptNames = iso15924.reduce(
  (acc, entry) => ({ ...acc, [entry.code]: entry.name }),
  {}
);

// const regionNames = iso3166
//   .all()
//   .reduce((acc, entry) => ({ ...acc, [entry.alpha2]: entry.country }), {});

// function getRegionName(code: string) {
//   return regionNames[code];
// }

function getIso639_3CodeDetails() {
  const codeDetails = new Set();
  // downloaded from https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3.tab
  const codeDetailsFile = fs.readFileSync("iso-639-3.tab", "utf8");
  for (const line of codeDetailsFile.split("\n")) {
    if (line.length === 0) {
      continue;
    }
    const parts = line.split("\t");

    codeDetails.add(parts[0]);
  }
  return codeDetails;
}

// turn "Uzbek, Northern" into "Northern Uzbek"
function uncomma(str: string) {
  if (!str) {
    return "";
  }
  const parts = str.split(COMMA_SEPARATOR);
  if (parts.length === 1) {
    return str;
  }
  return parts[1] + " " + parts[0];
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
  if (parts[0].length === 3) {
    return parts[0];
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

function autonymOrFallback(entry: any, fallback: string) {
  // We are currently ignoring the "localname" field because it appears to be more specific than what we want,
  // e.g. the "es-Latn-ES" entry of langtags.json has "localname": "español de España" and "localnames": [ "castellano", "español" ]
  return entry.localnames ? entry.localnames[0] : undefined ?? fallback;
}

// We want to have one entry for every ISO 630-3 code, whereas langtags.json sometimes has multiple entries per code
// Combine entry into the entry with matching ISO 630-3 code in langs if there is one, otherwise create a new entry
function addOrCombineLangtagsEntry(entry, langs) {
  if (!entry.iso639_3) {
    // langTags.json has metadata items in the same list mixed in with the data entries
    return;
  }

  if (langs[entry.iso639_3]) {
    // We already have an entry with this code, combine with it
    langs[entry.iso639_3].autonym = autonymOrFallback(
      entry,
      langs[entry.iso639_3].autonym
    ); // We want to take an autonym from any of the entries that we are combining and fallback to undefined
    // only if none of them have autonyms
    langs[entry.iso639_3].regionNames.add(entry.regionname);
    langs[entry.iso639_3].scripts.add(entry.script);
    langs[entry.iso639_3].names = new Set([
      ...langs[entry.iso639_3].names,
      ...getAllPossibleNames(entry),
    ]);
    langs[entry.iso639_3].alternativeTags = new Set([
      ...langs[entry.iso639_3].alternativeTags,
      ...(entry.tags ?? []),
    ]);
    langs[entry.iso639_3].isForMacrolanguageDisambiguation =
      langs[entry.iso639_3].isForMacrolanguageDisambiguation &&
      entry.isForMacrolanguageDisambiguation;
  } else {
    // create a new entry for this language code
    langs[entry.iso639_3] = {
      autonym: autonymOrFallback(entry, undefined),
      exonym: entry.name,
      iso639_3_code: entry.iso639_3 as string,
      // TODO decide if we should work with the display codes on the backend, see how it interacts with macrolanguage situations
      languageSubtag: entry.tag.split("-")[0], // might be 2-letter
      regionNames: new Set([entry.regionname]),
      names: getAllPossibleNames(entry),
      scripts: new Set([entry.script]),
      alternativeTags: new Set(entry.tags || []),
      isForMacrolanguageDisambiguation:
        entry.isForMacrolanguageDisambiguation || false,
    } as ILanguageInternal;
  }
}

function parseLangtagsJson() {
  // We want to have one entry for every ISO 630-3 code, whereas langtags.json sometimes has multiple entries per code
  const langTags = langTagsJson as any[];
  const iso639_3CodeDetails = getIso639_3CodeDetails();
  const consolidatedLangTags = {};
  for (const entry of langTags) {
    addOrCombineLangtagsEntry(entry, consolidatedLangTags);

    // TODO I haven't finished implementing Macrolanguage/specific language handling. See README
    if (iso639_3CodeDetails.has(entry.iso639_3)) {
      const iso639_3Codes = new Set([entry.iso639_3]);
      for (const tag of entry.tags || []) {
        const iso639_3Code = findPotentialIso639_3Code(tag);
        if (iso639_3Code && !iso639_3Codes.has(iso639_3Code)) {
          iso639_3Codes.add(iso639_3Code);
          addOrCombineLangtagsEntry(
            {
              ...entry,
              iso639_3_code: iso639_3Code,
              isForMacrolanguageDisambiguation: true,
            },
            consolidatedLangTags
          );
        }
      }
      if (iso639_3Codes.size > 2) {
        // TODO future work handle these cases when we get language type/status data and deal with macrolanguages
        console.log("multiple iso639_3 codes", entry.iso639_3, iso639_3Codes);
      }
    }
  }

  // Tweak some of the data into the format we want
  const reformattedLangs = Object.values(consolidatedLangTags).map(
    (langData: ILanguageInternal) => {
      // Don't repeat the autonym and exonym in the names list
      langData.names.delete(langData.autonym);
      langData.names.delete(langData.exonym);
      langData.names.forEach(uncomma);
      langData.regionNames.forEach(uncomma);
      return {
        autonym: uncomma(langData.autonym),
        exonym: uncomma(langData.exonym),
        iso639_3_code: langData.iso639_3_code,
        languageSubtag: langData.languageSubtag,
        regionNames: [...langData.regionNames].join(COMMA_SEPARATOR),
        scripts: [...new Set([...langData.scripts])].map((scriptCode) => {
          return {
            code: scriptCode,
            name: uncomma(scriptNames[scriptCode]),
          } as IScript;
        }),
        names: [...langData.names],
        alternativeTags: [...langData.alternativeTags],
      } as ILanguage;
    }
  );

  // TODO still in progress implementing this
  // // Macrolanguage/specific language handling. See README
  // for (const lang of reformattedLangs) {
  //   if (!macrolangs.has(lang.code)) {
  //     continue;
  //   }
  //   lang.isMacrolanguage = true;
  //   const iso639_3Codes = new Set([lang.code]);
  //   for (const tag of lang.alternativeTags || []) {
  //     const iso639_3Code = findPotentialIso639_3Code(tag);
  //     if (iso639_3Code && !iso639_3Codes.has(iso639_3Code)) {
  //       iso639_3Codes.add(iso639_3Code);
  //       reformattedLangs.push({
  //         ...lang,
  //         code: iso639_3Code,
  //         isForMacrolanguageDisambiguation: true,
  //       });
  //     }
  //   }
  //   if (iso639_3Codes.size > 2) {
  //     console.log("multiple iso639_3 codes", lang.code, iso639_3Codes);
  //   }
  // }

  // const latinScriptData: IScript = {
  //   code: "Latn",
  //   name: "Latin",
  // };

  //   write langs to a json file
  const data = JSON.stringify(reformattedLangs);
  fs.writeFileSync("language-data/languageData.json", data);
}

function parseLangTagsTxt() {
  const langTagsTxtRaw = fs.readFileSync("langtags.txt", "utf8");
  const langTagsTxt = langTagsTxtRaw.replaceAll("*", "");
  const lines = langTagsTxt.split("\n");
  const tagLookups = [];
  for (const line of lines) {
    const tags = line.split(" = ");
    tagLookups.push({
      shortest: tags[0],
      allTags: tags,
    });
  }
  fs.writeFileSync("shortestTagLookups.json", JSON.stringify(tagLookups));
}

parseLangtagsJson();
parseLangTagsTxt();

// counting scripts
// let scriptOptions = new Set();
// let allScripts = new Set();
// for (const lang of reformattedLangs) {
//   allScripts = new Set([...allScripts, ...lang.scripts]);
//   const langScripts = new Set(lang.scripts);
//   // TODO do this more cleanly
//   langScripts.delete("Brai");
//   langScripts.delete("Zxxx");
//   langScripts.delete("Zyyy");
//   langScripts.delete("Zzzz");
//   langScripts.delete("Zmth");
//   langScripts.delete("Zsym");
//   if (langScripts.size > 1) {
//     scriptOptions = new Set([...scriptOptions, ...langScripts]);
//   }
// }
// console.log([...scriptOptions].length);
// console.log([...allScripts].length);
// fs.writeFileSync("scripts.json", [...scriptOptions].sort().join("\n"));

// macrolang checking...

// const macrolangs = new Set();
// for (const entry of langTags2) {
//   if (!entry.iso639_3) {
//     // console.log("skipping", entry);
//     // langTags.json has metadata items in the same list mixed in with the data entries
//     continue;
//   }
//   if (entry.macrolang) {
//     macrolangs.add(entry.macrolang);
//   }
// }
// console.log([...macrolangs].sort().join("\n"));

// for (const entry of langTags2) {
//   if (!entry.iso639_3) {
//     // console.log("skipping", entry);
//     // langTags.json has metadata items in the same list mixed in with the data entries
//     continue;
//   }
//   if (macrolangs.has(entry.iso639_3)) {
//     if (
//       !entry.tags?.some((tag) => {
//         tag.length === 3 && tag !== entry.iso639_3)
//       }
//     ) {
//       console.log("trouble", entry.iso639_3, entry.tags);
//     }
//   }
// }

// check if whenever there are multiple 3-letter codes in tags, we can unambiguously map them
// const langCodeSetsObj = {};
// for (const entry of langTags2) {
//   if (!entry.iso639_3) {
//     // console.log("skipping", entry);
//     // langTags.json has metadata items in the same list mixed in with the data entries
//     continue;
//   }
//   const codes = new Set();
//   for (const tag of entry.tags || []) {
//     const tag1 = tag.split("-")[0];
//     if (tag1.length === 3 && tag1 !== "sgn") {
//       codes.add(tag1);
//     }
//   }
//   if (codes.size > 1) {
//     // console.log(entry.iso639_3, codes);?
//     const codesList = [...codes].sort();
//     langCodeSets.push(codesList);
//     if (
//       langCodeSetsObj[codesList[0] as string] &&
//       langCodeSetsObj[codesList[0] as string] !== codesList[1]
//     )
//       console.log(
//         "Nonmatch ",
//         codesList[0],
//         codesList[1],
//         langCodeSetsObj[codesList[0] as string]
//       );
//     langCodeSetsObj[codesList[0] as string] = codesList[1];
//   }
// }
// console.log(
//   langCodeSets.sort()
// );
