import { IScript, ILanguage } from "./findLanguageInterfaces";
import {
  getAllPossibleNames,
  isMacrolanguage,
  getLanguageType,
  uncomma,
  uncommaAll,
  scriptNames,
  macrolanguagesByCode,
  indivlangsToMacrolangs,
  ILanguageInternal,
  macrolangsToRepresentativeLangs,
  COMMA_SEPARATOR,
  ILangtagsJsonEntryInternal,
  stripMacrolanguageParenthetical,
  stripMacrolanguageParentheticalFromAll,
} from "./langtagProcessingHelpers";

import fs from "fs";
import langTagsJson from "./language-data/langtags.json" with { type: "json" };

// We want to have one entry for every ISO 639-3 code, whereas langtags.json sometimes has multiple entries per code
// Combine entry into the entry with matching ISO 630-3 code in langs if there is one, otherwise create a new entry
function addOrCombineLangtagsEntry(
  entry: ILangtagsJsonEntryInternal,
  langs: { [key: string]: ILanguageInternal }
) {
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
          langs[entry.iso639_3].scripts[entry.script]?.languageNameInScript ||
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
      languageType: getLanguageType(entry.iso639_3),
    } as ILanguageInternal;
  }
}

function parseLangtagsJson() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const langTags = langTagsJson as any[];
  const consolidatedLangTags: { [key: string]: ILanguageInternal } = {};
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
          } as ILangtagsJsonEntryInternal,
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
          } as ILangtagsJsonEntryInternal,
          consolidatedLangTags
        );
      }
    } else {
      addOrCombineLangtagsEntry(entry, consolidatedLangTags);
    }
  }

  // Tweak some of the data into the format we want
  const reformattedLangs: ILanguage[] = Object.values(consolidatedLangTags).map(
    (langData: ILanguageInternal) => {
      // Don't repeat the autonym and exonym in the names list
      langData.names.delete(langData.autonym);
      langData.names.delete(langData.exonym);
      const regionNamesForSearch = [
        ...(uncommaAll(langData.regionNames) as Set<string>),
      ].filter((regionName) => !!regionName);
      const regionNamesForDisplay = regionNamesForSearch.join(COMMA_SEPARATOR);
      return {
        autonym: uncomma(stripMacrolanguageParenthetical(langData.autonym)),
        exonym: uncomma(stripMacrolanguageParenthetical(langData.exonym)),
        iso639_3_code: langData.iso639_3_code,
        languageSubtag: langData.languageSubtag,
        // For all these normal individual languages, we display and search key the same region list
        regionNamesForSearch,
        regionNamesForDisplay,
        scripts: Object.values(langData.scripts),
        names: [
          ...uncommaAll(stripMacrolanguageParentheticalFromAll(langData.names)),
        ].filter((name) => !!name),
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

/* From https://github.com/silnrsi/langtags/blob/master/doc/langtags.md 
Langtags.txt contains a sequence of equivalence sets. Each set consists of a 
list of language tags separated by =. The first tag on the line is the canonical
tag and the last tag on the line is the maximal tag. In addition, a tag is 
prefixed with * if there is an entry in the SLDR for that particular tag. */
function parseLangTagsTxt() {
  const langTagsTxtRaw = fs.readFileSync("language-data/langtags.txt", "utf8");
  const langTagsTxt = langTagsTxtRaw.replaceAll("*", "");
  const lines = langTagsTxt.split("\n");
  const tagLookups: {
    shortest: string;
    maximal: string;
    allTags: string[];
  }[] = [];
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
