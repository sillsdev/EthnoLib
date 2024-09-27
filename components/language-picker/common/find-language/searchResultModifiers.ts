import { FuseResult } from "fuse.js";
import { ILanguage, IScript } from "./findLanguageInterfaces";
import {
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
function simplifyEnglishResult(results: ILanguage[]): ILanguage[] {
  function getSpecialEntry(result: ILanguage) {
    return {
      autonym: undefined, // because exonym is mandatory and we don't want to repeat it
      exonym: result.exonym, // "English",
      iso639_3_code: result.iso639_3_code,
      languageSubtag: result.languageSubtag,
      regionNames: "",
      names: [],
      scripts: [latinScriptData],
      variants: "",
      alternativeTags: [],
    } as ILanguage;
  }
  return substituteInSpecialEntry("eng", getSpecialEntry, results);
}

// Replace the French result with a simpler version that only has "Francais", "French" and the code on it
function simplifyFrenchResult(results: ILanguage[]): ILanguage[] {
  function getSpecialEntry(result: ILanguage) {
    return {
      autonym: result.autonym, // this will be "Français", but we want to keep demarcation in case user typed "Francais"
      exonym: result.exonym, // "French"
      iso639_3_code: result.code,
      languageSubtag: result.languageSubtag,
      regionNames: "",
      names: [],
      scripts: [latinScriptData],
      variants: "",
      alternativeTags: [],
    } as ILanguage;
  }
  return substituteInSpecialEntry("fra", getSpecialEntry, results);
}

// Compare codes, ignoring any demarcation or casing
// undefined does not match undefined
export function codeMatches(
  code1: string | undefined,
  code2: string | undefined
): boolean {
  return (
    !!code1 &&
    !!code2 &&
    stripDemarcation(code1)?.toUpperCase() ===
      stripDemarcation(code2)?.toUpperCase()
  );
}

// Replace the result which has targetCode with getSpecialEntry called on that result
export function substituteInSpecialEntry(
  targetCode: string,
  getSpecialEntry: (result: ILanguage) => ILanguage,
  results: ILanguage[]
): ILanguage[] {
  return results.map((result) =>
    codeMatches(result.iso639_3_code, targetCode)
      ? getSpecialEntry(result)
      : result
  );
}

export function filterLanguageCodes(
  langCodeFilter: (value: string) => boolean,
  results: ILanguage[]
): ILanguage[] {
  return results.filter((result) => langCodeFilter(result.iso639_3_code));
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

export function filterOutDefaultExcludedLanguages(
  results: ILanguage[]
): ILanguage[] {
  return filterLanguageCodes(
    ((code) =>
      !NOT_A_LANGUAGE_ENTRY_CODES.has(code) &&
      !ANCIENT_LANGUAGE_ENTRY_CODES.has(code)) as (value: string) => boolean,
    results
  );
}

// if user starts typing keyword, the language option with code langCodeToPrioritize should come up first.
// Note that this re-orders results but does not add
// any new results; if the desired language is not already in the fuzzy-match results, no change will be made
export function prioritizeLangByKeywords(
  keywords: string[],
  searchString: string,
  langCodeToPrioritize: string,
  results: ILanguage[]
): ILanguage[] {
  // if any of the keywords (lowercased) start with the searchstring (lowercased), prioritize the desired language
  if (
    searchString.length > 0 &&
    keywords.some((keyword) =>
      keyword.toLowerCase().startsWith(searchString.toLowerCase())
    )
  ) {
    const indexOfLang = results.findIndex((result) =>
      codeMatches(result.iso639_3_code, langCodeToPrioritize)
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
  modifiedResults = simplifyEnglishResult(modifiedResults);
  modifiedResults = simplifyFrenchResult(modifiedResults);
  modifiedResults = filterOutDefaultExcludedLanguages(modifiedResults);
  modifiedResults = filterScripts(scriptFilter, modifiedResults);
  return modifiedResults;
}
