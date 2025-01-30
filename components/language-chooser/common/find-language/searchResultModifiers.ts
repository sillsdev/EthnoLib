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

export function modifyScripts(
  scriptModifier: (value: IScript) => IScript,
  results: ILanguage[]
): ILanguage[] {
  return results.map((result) => ({
    ...result,
    scripts: result.scripts.map(scriptModifier),
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
      iso639_3_code: result.iso639_3_code,
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

// langtags.json lists spanish with localnames ["castellano", "español"]
// so castellano becomes the autonym, but we want to list español as the autonym
// while preserving any match demarcation
function simplifySpanishResult(results: ILanguage[]): ILanguage[] {
  function getSpecialEntry(result: ILanguage) {
    let demarcatedCastellano = result.autonym;
    if (stripDemarcation(demarcatedCastellano) !== "castellano") {
      demarcatedCastellano = "castellano";
    }

    const demarcatedEspanol = result.names.find(
      (name) => stripDemarcation(name) === "español"
    );
    return {
      ...result,
      autonym: demarcatedEspanol,
      names: [
        // make sure castellano is in the names list exactly once
        demarcatedCastellano,
        ...result.names.filter(
          (name) => name !== demarcatedCastellano && name !== demarcatedEspanol
        ),
      ],
      scripts: [latinScriptData],
    } as ILanguage;
  }
  return substituteInSpecialEntry("spa", getSpecialEntry, results);
}

function simplifyChineseResult(results: ILanguage[]): ILanguage[] {
  function getSpecialEntry(result: ILanguage) {
    return {
      ...result,
      autonym: "中文",
      regionNames: "", // clear the long and confusing list of region names
      names: result.names.filter(
        (name) => name !== "中文" && name !== "繁體中文"
        // 繁體中文 is traditional script chinese, and since there is no equivalent in the names list for simplified script chinese,
        // take it out so as not to confuse people since they should select this card regardless of script
      ),
      scripts: [
        {
          code: "Hans",
          name: "Chinese (Simplified)",
        } as IScript,
        {
          code: "Hant",
          name: "Chinese (Traditional)",
        } as IScript,
        latinScriptData,
      ],
    } as ILanguage;
  }
  return substituteInSpecialEntry("zho", getSpecialEntry, results);
}

export function rawIsoCode(result: ILanguage) {
  return stripDemarcation(result.iso639_3_code);
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
  return results.filter((result) => langCodeFilter(rawIsoCode(result) || ""));
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
  "osp", // Old Spanish
  "lzh", // Literary Chinese
  "ltc", // Late Middle Chinese
  "och", // Old Chinese

  // TODO future work there are a bunch more - search for things like (to 1500), (up to 700), BCE, B.C., ca., etc
  // Filter for deprecated, historical languages etc.
]);

const SPECIAL_CASE_EXCLUDED_ENTRY_CODES = new Set([
  "zhx", // I don't understand why this entry is in langtags.json. It is an ISO-639-5 (language collection) code covering the zho macrolanguage, has no Ethnologue entry, only listed script is Nshu
  "cmn", // TODO when we implement macrolanguage handling, see if the situation is taken care of and we can remove this exception.
  // In langtags.json, most chinese entries have ISO 639-3 code "zho" (which is the macrolanguage code) except zh-Brai-CN and zh-Hant-ES which have "cmn"
  // so we end up with two search results and don't want to keep the "cmn" one
]);

const DEFAULT_EXCLUDED_ENTRY_CODES = new Set([
  ...NOT_A_LANGUAGE_ENTRY_CODES,
  ...ANCIENT_LANGUAGE_ENTRY_CODES,
  ...SPECIAL_CASE_EXCLUDED_ENTRY_CODES,
]);

export function filterOutDefaultExcludedLanguages(
  results: ILanguage[]
): ILanguage[] {
  return filterLanguageCodes(
    ((code) => !DEFAULT_EXCLUDED_ENTRY_CODES.has(code)) as (
      value: string
    ) => boolean,
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
  modifiedResults = prioritizeLangByKeywords(
    ["chinese"],
    searchString,
    "zho", // TODO: if we implement improved macrolanguage handling, see if we should change this to cmn
    modifiedResults
  );
  modifiedResults = prioritizeLangByKeywords(
    ["espanol", "español", "spanish", "castellano"],
    searchString,
    "spa",
    modifiedResults
  );
  modifiedResults = simplifyEnglishResult(modifiedResults);
  modifiedResults = simplifyFrenchResult(modifiedResults);
  modifiedResults = simplifyChineseResult(modifiedResults);
  modifiedResults = simplifySpanishResult(modifiedResults);
  modifiedResults = filterOutDefaultExcludedLanguages(modifiedResults);
  modifiedResults = filterScripts(scriptFilter, modifiedResults);
  return modifiedResults;
}
