import { FuseResult } from "fuse.js";
import { ILanguage, IScript } from "@ethnolib/find-language";
import {
  demarcateExactMatches,
  demarcateResults,
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
  const getSpecialEntry = (result) =>
    demarcateExactMatches(searchString, {
      autonym: undefined, // because exonym is mandatory and we don't want to repeat it
      exonym: result.exonym, // "English",
      code: "eng",
      regionNames: "",
      names: [],
      scripts: [latinScriptData],
      variants: "",
      alternativeTags: [],
    } as ILanguage);
  return substituteInSpecialEntry("eng", getSpecialEntry, results);
}

// Replace the French result with a simpler version that only has "Francais", "French" and the code on it
function simplifyFrenchResult(
  searchString: string,
  results: ILanguage[]
): ILanguage[] {
  const getSpecialEntry = (result) =>
    demarcateExactMatches(searchString, {
      autonym: result.autonym, // this will be "Français", but we want to keep demarcation in case user typed "Francais"
      exonym: result.exonym, // "French"
      code: "fra",
      regionNames: "",
      names: [],
      scripts: [latinScriptData],
      variants: "",
      alternativeTags: [],
    } as ILanguage);
  return substituteInSpecialEntry("fra", getSpecialEntry, results);
}

// Compare codes, ignoring any demarcation or casing
export function codeMatches(code1: string, code2: string) {
  return (
    stripDemarcation(code1).toUpperCase() ===
    stripDemarcation(code2).toUpperCase()
  );
}

export function substituteInSpecialEntry(
  targetCode: string,
  getSpecialEntry: (result: ILanguage) => ILanguage,
  results: ILanguage[]
): ILanguage[] {
  return results.map((result) =>
    codeMatches(result.code, targetCode) ? getSpecialEntry(result) : result
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

export function filterOutDefaultExcludedLanguages(
  results: ILanguage[]
): ILanguage[] {
  return filterLangCodes(
    (code) =>
      !NOT_A_LANGUAGE_ENTRY_CODES.has(code) &&
      !ANCIENT_LANGUAGE_ENTRY_CODES.has(code) &&
      !OTHER_EXCLUDED_LANGUAGE_CODES.has(code),
    results
  );
}

// if user starts typing keyword, lang should come up first. Note that this re-orders results but does not add any new results; if lang is not in the fuzzy-match results no change will be made
export function prioritizeLangByKeywords(
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

// demarcateResults starts by making a deep clone so we aren't modifying the original results
// Other implementations will probably also want to ensure a deep copy before modifying
export function defaultSearchResultModifier(
  results: FuseResult<ILanguage>[],
  searchString: string
): ILanguage[] {
  let modifiedResults: ILanguage[] = stripResultMetadata(
    demarcateResults(results)
  );
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
  modifiedResults = filterOutDefaultExcludedLanguages(modifiedResults);
  modifiedResults = filterScripts(scriptFilter, modifiedResults);
  return modifiedResults;
}
