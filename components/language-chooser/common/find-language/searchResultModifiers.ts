import { FuseResult } from "fuse.js";
import { ILanguage, IScript, LanguageType } from "./findLanguageInterfaces";
import {
  demarcateResults,
  stripDemarcation,
} from "./matchingSubstringDemarcation";
import { DEFAULT_EXCLUDED_HISTORIC_LANGUAGE_CODES } from "./defaultExcludedHistoricLanguages";

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

const DEFAULT_EXCLUDED_SCRIPT_CODES = new Set([
  "Brai",
  "Zyyy",
  "Zxxx",
  "Zinh",
  "Zmth",
  "Zsye",
  "Zsym",
]);

const latinScriptData = { code: "Latn", name: "Latin" } as IScript;

// Replace the English result with a simpler version that only has "English" and the code on it
function simplifyEnglishResult(results: ILanguage[]): ILanguage[] {
  function getSimplifiedEnglishResult(result: ILanguage) {
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
      languageType: LanguageType.Living,
    } as ILanguage;
  }
  return substituteInModifiedEntry("eng", getSimplifiedEnglishResult, results);
}

// Replace the French result with a simpler version that only has "Francais", "French" and the code on it
function simplifyFrenchResult(results: ILanguage[]): ILanguage[] {
  function getSimplifiedFrenchResult(result: ILanguage) {
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
      languageType: LanguageType.Living,
    } as ILanguage;
  }
  return substituteInModifiedEntry("fra", getSimplifiedFrenchResult, results);
}

// langtags.json lists spanish with localnames ["castellano", "español"]
// so castellano becomes the autonym, but we want to list español as the autonym
// while preserving any match demarcation
function simplifySpanishResult(results: ILanguage[]): ILanguage[] {
  function getSimplifiedSpanishResult(result: ILanguage) {
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
  return substituteInModifiedEntry("spa", getSimplifiedSpanishResult, results);
}

function simplifyChineseResult(results: ILanguage[]): ILanguage[] {
  function getSimplifiedChineseResult(result: ILanguage) {
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
  return substituteInModifiedEntry("cmn", getSimplifiedChineseResult, results);
}

// If excluding macrolanguages, use this for special cases which are technically macrolanguages but
// should be treated as individual languages
export function overrideAsIndividualLanguages(
  isoCodesToOverride: string[],
  results: ILanguage[]
) {
  return results.map((result) => {
    if (isoCodesToOverride.includes(result.iso639_3_code)) {
      return {
        ...result,
        isMacrolanguage: false,
      };
    }
    return result;
  });
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

// Replace the result which has targetCode with getModifiedEntry called on that result
export function substituteInModifiedEntry(
  targetCode: string,
  getModifiedEntry: (result: ILanguage) => ILanguage,
  results: ILanguage[]
): ILanguage[] {
  return results.map((result) =>
    codeMatches(result.iso639_3_code, targetCode)
      ? getModifiedEntry(result)
      : result
  );
}

export function filterOnLanguageCode(
  langCodeFilter: (value: string) => boolean,
  results: ILanguage[]
): ILanguage[] {
  return results.filter((result) => langCodeFilter(rawIsoCode(result) || ""));
}

const EXCLUDED_PROBLEMATIC_LANGUAGE_CODES = new Set([
  "zhx", // I don't understand why this entry is in langtags.json. It is an ISO-639-5 (language collection) code covering the zho macrolanguage, has no Ethnologue entry, only listed script is Nshu
]);

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
    "cmn",
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

  // These are cases where it is not clear in langtags.json or not well defined what individual langs these macrolanguage codes are representing.
  // TODO future work: handle these cases more carefully.
  // For nor, I think we should treat is as a indiv language with two scripts, Bokmål and Nynorsk - ? https://www.ethnologue.com/language/nor/
  // For san: according to langtags.txt, san = cls = vsn. Both cls and vsn are individual ISO639-3 languages. Not sure which to use.
  // Look into aka and hbs further
  modifiedResults = overrideAsIndividualLanguages(
    ["bnc", "aka", "nor", "hbs", "san", "zap"],
    modifiedResults
  );
  // remove all macrolangauges, now that we have already marked the exceptions as individual langauges
  modifiedResults = modifiedResults.filter((r) => !r.isMacrolanguage);

  // Filters out mis (Uncoded languages), mul (Multiple languages), zxx (no linguistic content), und (Undetermined)
  modifiedResults = modifiedResults.filter(
    (r) => r.languageType !== LanguageType.Special
  );

  modifiedResults = filterOnLanguageCode(
    (code) => !EXCLUDED_PROBLEMATIC_LANGUAGE_CODES.has(code),
    modifiedResults
  );
  modifiedResults = filterOnLanguageCode(
    (code) => !DEFAULT_EXCLUDED_HISTORIC_LANGUAGE_CODES.has(code),
    modifiedResults
  );

  modifiedResults = filterScripts(
    (s) => !DEFAULT_EXCLUDED_SCRIPT_CODES.has(s.code),
    modifiedResults
  );

  return modifiedResults;
}
