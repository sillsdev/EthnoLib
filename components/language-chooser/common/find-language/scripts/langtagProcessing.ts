import { IScript, ILanguage } from "../findLanguageInterfaces";
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
import langTagsJson from "../language-data/langtags.json" with { type: "json" };

function bestAutonymFromEntry(entry: any) {
  return entry.localnames ? entry.localnames[0] : entry.localname;
}

// We want to have one entry for every ISO 639-3 code, whereas langtags.json sometimes has multiple entries per code
// Combine entry into the entry with matching ISO 630-3 code in langs if there is one, otherwise create a new entry
function addOrCombineLangtagsEntry(
  entry: ILangtagsJsonEntryInternal,
  langs: { [key: string]: ILanguageInternal }
) {
  if (!entry.indivIsoCode) {
    console.log("Missing indivIsoCode for ", entry.full);
    // langTags.json has metadata items in the same list mixed in with the data entries
    return;
  }

  if (langs[entry.indivIsoCode]) {
    // We already have an entry with this code, combine with it

    // We prioritize autonyms from the "localnames" field (which matches ethnologue if present)
    // over the "localname" field (which is from CLDR and may be specific to a region e.g. "español de México")
    // Some languages may have an entry with "localname" but not "localname" and another entry with "localname" but not "localnames"
    langs[entry.indivIsoCode].autonym = entry.localnames
      ? entry.localnames[0]
      : langs[entry.indivIsoCode].autonym || entry.localname;
    if (!entry.tag.includes("-")) {
      langs[entry.indivIsoCode].defaultScriptAutonym =
        bestAutonymFromEntry(entry);
    }
    langs[entry.indivIsoCode].regionNames.add(entry.regionname);
    if (
      // some languages will have multiple entries with the same script. If so we just want to make sure we take one that has an autonym if possible
      !langs[entry.indivIsoCode].scripts[entry.script] ||
      (entry.localnames?.length || 0) > 0
    ) {
      langs[entry.indivIsoCode].scripts[entry.script] = {
        code: entry.script,
        name: scriptNames[entry.script],
        languageNameInScript:
          (entry.localnames || [undefined])[0] ||
          langs[entry.indivIsoCode].scripts[entry.script]
            ?.languageNameInScript ||
          entry.localname,
      } as IScript;
    }
    langs[entry.indivIsoCode].names = new Set([
      ...langs[entry.indivIsoCode].names,
      ...getAllPossibleNames(entry),
    ]);
    langs[entry.indivIsoCode].alternativeTags = new Set([
      ...langs[entry.indivIsoCode].alternativeTags,
      entry.full,
      ...(entry.tags ?? []),
    ]);

    langs[entry.indivIsoCode].isRepresentativeForMacrolanguage =
      langs[entry.indivIsoCode].isRepresentativeForMacrolanguage ||
      entry.isRepresentativeForMacrolanguage;
  } else {
    const scriptCode = entry.script;
    const scripts: { [key: string]: IScript } = {};
    if (scriptCode) {
      scripts[scriptCode] = {
        code: scriptCode,
        name: scriptNames[scriptCode],
        languageNameInScript:
          (entry.localnames || [undefined])[0] || entry.localname,
      } as IScript;
    }
    // create a new entry for this language code
    langs[entry.indivIsoCode] = {
      autonym: bestAutonymFromEntry(entry),
      // if there is no "-" in entry.tag, the language subtag alone is considered equivalent to this entry i.e. this is the default script
      defaultScriptAutonym: entry.tag.includes("-")
        ? undefined
        : bestAutonymFromEntry(entry),
      exonym: entry.name,
      iso639_3_code: entry.indivIsoCode as string,
      // If the indivIsoCode is different from the iso639_3 code, the iso639_3 (and so probably also the tag) was a
      // macrolanguage code so we want to make sure to use the individual language code instead
      languageSubtag:
        entry.indivIsoCode != entry.iso639_3
          ? entry.indivIsoCode
          : entry.tag.split("-")[0], // might be 2-letter
      regionNames: new Set([entry.regionname]),
      names: getAllPossibleNames(entry),
      scripts,
      isMacrolanguage: entry.isMacrolanguage || false,
      parentMacrolanguage:
        macrolanguagesByCode[indivlangsToMacrolangs[entry.indivIsoCode]],
      isRepresentativeForMacrolanguage: entry.isRepresentativeForMacrolanguage,
      alternativeTags: new Set([entry.full, ...(entry.tags || [])]),
      languageType: getLanguageType(entry.indivIsoCode),
    } as ILanguageInternal;
  }
}

function parseLangtagsJson() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const langTags = langTagsJson as any[];
  const consolidatedLangTags: { [key: string]: ILanguageInternal } = {};
  for (const entry of langTags) {
    const augmentedEntry = entry as ILangtagsJsonEntryInternal;
    const languageSubtag = entry.tag.split("-")[0];

    // If listed with a macrolanguage code, this is a "representative language", we need to identify it by its equivalent
    // individual language code. See macrolanguageNotes.md
    if (isMacrolanguage(entry.iso639_3) || isMacrolanguage(languageSubtag)) {
      augmentedEntry["isRepresentativeForMacrolanguage"] = true;
      augmentedEntry["indivIsoCode"] = isMacrolanguage(entry.iso639_3)
        ? macrolangsToRepresentativeLangs[entry.iso639_3]
        : entry.iso639_3;

      if (!augmentedEntry["indivIsoCode"]) {
        // This is a data anomaly but we do have a few as of Sep 2025: nor, san, hbs, zap, ar-SA, ku-Arab-TR, and man-Latn-GN
        // See macrolanguageNotes.md. These cases should be specially handled.
        console.log(
          "No indivIsoCode found for macrolang",
          entry.iso639_3,
          entry.tag
        );
        augmentedEntry["isMacrolanguage"] = true;
      }
    }

    // in normal cases, indivIsoCode is just the iso639_3 code
    augmentedEntry["indivIsoCode"] =
      augmentedEntry["indivIsoCode"] || entry.iso639_3;

    addOrCombineLangtagsEntry(augmentedEntry, consolidatedLangTags);
  }

  // Tweak some of the data into the format we want
  const reformattedLangs: ILanguage[] = Object.values(consolidatedLangTags).map(
    (langData: ILanguageInternal) => {
      const autonym = stripMacrolanguageParenthetical(
        langData.defaultScriptAutonym || langData.autonym
      );
      const exonym = stripMacrolanguageParenthetical(langData.exonym);
      // Don't repeat the autonym and exonym in the names list
      langData.names.delete(autonym);
      langData.names.delete(exonym);
      const regionNamesForSearch = [
        ...(uncommaAll(langData.regionNames) as Set<string>),
      ].filter((regionName) => !!regionName);
      const regionNamesForDisplay = regionNamesForSearch.join(COMMA_SEPARATOR);
      return {
        autonym: uncomma(autonym),
        exonym: uncomma(exonym),
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
    const tags = line.split(" = ").map((t) => t.trim());
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
