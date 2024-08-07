import {
  ILanguage,
  IScript,
  fieldsToSearch,
} from "@ethnolib/find-language";
import { FuseResult } from "fuse.js";
import {
  demarcateResults,
  END_OF_MATCH_MARKER,
  START_OF_MATCH_MARKER,
  stripDemarcation,
} from "./matchingSubstringDemarcation";

export function stripResultMetadata(
  results: FuseResult<ILanguage>[]
): ILanguage[] {
  return results.map((result) => result.item);
}

export function filterScripts(
  scriptFilter: (value: IScript) => boolean,
  results: ILanguage[]
): ILanguage[] {
  return results.map((result) => ({
    ...result,
    scripts: result.scripts.filter(scriptFilter),
  }));
}

const SCRIPT_CODES_TO_EXCLUDE = new Set([
  "Brai",
  "Zyyy",
  "Zxxx",
  "Zinh",
  "Zmth",
  "Zsye",
  "Zsym",
]);

const scriptFilter = (script: IScript) =>
  !SCRIPT_CODES_TO_EXCLUDE.has(script.code);

const latinScriptData = { code: "Latn", name: "Latin" } as IScript;

// Replace the English result with a simpler version that only has "English" and the code on it
function simplifyEnglishResult(
  searchString: string,
  results: ILanguage[]
): ILanguage[] {
  return results.map((result) =>
    codeMatches(result.code, "eng")
      ? demarcateExactMatches(searchString, {
          autonym: undefined, // because exonym is mandatory and we don't want to repeat it
          exonym: result.exonym, // "English",
          code: "eng",
          regionNames: "",
          names: [],
          scripts: [latinScriptData],
          variants: "",
          alternativeTags: [],
        } as ILanguage)
      : result
  );
}

// Replace the French result with a simpler version that only has "Francais", "French" and the code on it
function simplifyFrenchResult(
  searchString: string,
  results: ILanguage[]
): ILanguage[] {
  return results.map((result) =>
    codeMatches(result.code, "fra")
      ? demarcateExactMatches(searchString, {
          autonym: result.autonym, // this will be "Français", but we want to keep demarcation in case user typed "Francais"
          exonym: result.exonym, // "French"
          code: "fra",
          regionNames: "",
          names: [],
          scripts: [latinScriptData],
          variants: "",
          alternativeTags: [],
        } as ILanguage)
      : result
  );
}

// Compare codes, ignoring any demarcation or casing
function codeMatches(code1: string, code2: string) {
  return (
    stripDemarcation(code1).toUpperCase() ===
    stripDemarcation(code2).toUpperCase()
  );
}

export function substituteInSpecialEntry(
  specialEntry: ILanguage,
  results: ILanguage[]
): ILanguage[] {
  return results.map((result) =>
    result.code === specialEntry.code ? specialEntry : result
  );
}

export function filterLangCodes(
  langCodeFilter: (value: string) => boolean,
  results: ILanguage[]
): ILanguage[] {
  return results.filter((result) => langCodeFilter(result.code));
}

const NOT_A_LANGUAGE_ENTRY_CODES = new Set([
  "mis", //Uncoded languages
  "mul", // Multiple languages
  "zxx", // no linguistic content
  "und", // Undetermined
]);

const ANCIENT_LANGUAGE_ENTRY_CODES = new Set([
  "ang", // Old English
  "enm", // Middle English
  "fro", // Old French
  "frm", // Middle French
  "oko", // old korean
  "sga", // Old Irish
  "goh", // Old High German
  "peo", // Old Persian
  // TODO future work there are a bunch more - search for things like (to 1500), (up to 700), BCE, B.C., ca., etc
  // Filter for deprecated, historical languages etc.
]);

const OTHER_EXCLUDED_LANGUAGE_CODES = new Set([
  "frc", // Francais cadien/Cajun french/Louisiana french, spoken in the U.S.
  // TODO need to confirm this is okay to exclude, but seems like it will cause confusion otherwise
]);

export function filterSpecialEntries(results: ILanguage[]): ILanguage[] {
  return filterLangCodes(
    (code) =>
      !NOT_A_LANGUAGE_ENTRY_CODES.has(code) &&
      !ANCIENT_LANGUAGE_ENTRY_CODES.has(code) &&
      !OTHER_EXCLUDED_LANGUAGE_CODES.has(code),
    results
  );
}

// if user starts typing keyword, lang should come up first. Note that this re-orders results but does not add any new results; if lang is not in the fuzzy-match results no change will be made
function prioritizeLangByKeywords(
  keywords: string[],
  searchString: string,
  langCodeToPrioritize: string,
  results: ILanguage[]
): ILanguage[] {
  // if any of hte keywords (lowercased) start with the searchstring (lowercased), prioritize the lang
  if (
    searchString.length > 0 &&
    keywords.some((keyword) =>
      keyword.toLowerCase().startsWith(searchString.toLowerCase())
    )
  ) {
    const indexOfLang = results.findIndex((result) =>
      codeMatches(result.code, langCodeToPrioritize)
    );
    if (indexOfLang !== -1) {
      const lang = results[indexOfLang];
      results.splice(indexOfLang, 1);
      results.unshift(lang);
    }
  }
  return results;
}

// TODO ask reviewer about modifying vs copying results
function demarcateExactMatches(searchString: string, result: ILanguage) {
  // I think we'll live with only exact matches for this
  const lowerCasedSearchString = searchString.toLowerCase();
  for (const field of fieldsToSearch) {
    //TODO maybe we should do imports differently so this looks like index.fieldsToSearch
    if (typeof result[field] !== "string") {
      continue;
    }
    const lowerCasedValue = result[field].toLowerCase();
    // TODO is it worth it to find additional matches? probably not
    const indexOfSearchString = lowerCasedValue.indexOf(lowerCasedSearchString);
    if (indexOfSearchString !== -1) {
      result[field] =
        result[field].slice(0, indexOfSearchString) +
        START_OF_MATCH_MARKER +
        result[field].slice(
          indexOfSearchString,
          indexOfSearchString + searchString.length
        ) +
        END_OF_MATCH_MARKER +
        result[field].slice(indexOfSearchString + searchString.length);
    }
  }
  return result;
}

export function bloomSearchResultModifier(
  results: FuseResult<ILanguage>[],
  searchString: string
): ILanguage[] {
  let modifiedResults = demarcateResults(results);
  modifiedResults = stripResultMetadata(modifiedResults);
  modifiedResults = prioritizeLangByKeywords(
    ["english"],
    searchString,
    "eng",
    modifiedResults
  );
  modifiedResults = prioritizeLangByKeywords(
    ["french", "francais", "français"],
    searchString,
    "fra",
    modifiedResults
  );
  modifiedResults = simplifyEnglishResult(searchString, modifiedResults);
  modifiedResults = simplifyFrenchResult(searchString, modifiedResults);
  modifiedResults = filterSpecialEntries(modifiedResults);
  modifiedResults = filterScripts(scriptFilter, modifiedResults);
  return modifiedResults;
}
