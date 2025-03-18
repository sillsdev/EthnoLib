import Fuse, { FuseResult } from "fuse.js";
import languages from "./language-data/languageData.json";
import { ILanguage } from "./findLanguageInterfaces";

function spacePad(target: string | undefined) {
  return target ? " " + target + " " : target;
}

// If we surround the search targets with spaces, we can detect exact whole-word matches or prefix matches simply by adding spaces around the query string
const spacePaddedLanguages = languages.map((language) => ({
  ...language,
  autonym: spacePad(language.autonym),
  exonym: spacePad(language.exonym),
  names: language.names.map(spacePad),
  languageSubtag: spacePad(language.languageSubtag),
}));

const exactMatchPrioritizableFuseSearchKeys = [
  { name: "autonym", weight: 100 },
  { name: "exonym", weight: 100 },
  { name: "languageSubtag", weight: 80 },
  { name: "names", weight: 8 },

  // All fields below are currently not displayed on the card, but we still want corresponding results to come up if people search for them
  { name: "iso639_3_code", weight: 70 },
  { name: "alternativeTags", weight: 70 },
  // If this language is a member of a macrolanguage, we want it to come up if the user searches for that macrolanguage
  {
    name: "macrolanguageISO639-3Code",
    getFn: (l: ILanguage) => l.parentMacrolanguage?.iso639_3_code || "",
    weight: 70,
  },
  {
    name: "macrolanguageSubtag",
    getFn: (l: ILanguage) => l.parentMacrolanguage?.languageSubtag || "",
    weight: 70,
  },
  {
    name: "macrolanguageName",
    getFn: (l: ILanguage) => l.parentMacrolanguage?.exonym || "",
    weight: 70,
  },
];
// We will bring results that exactly whole-word match or prefix-match to the top of the list
// but don't want to do this for region names
const allFuseSearchKeys = [
  ...exactMatchPrioritizableFuseSearchKeys,
  { name: "regionNamesForSearch", weight: 1 },
];

// exported for match-highlighting use
export const fieldsToSearch = allFuseSearchKeys.map((key) => key.name);

// a good alternative search library would be minisearch (https://github.com/lucaong/minisearch) which handles word tokenization
// and so we wouldn't need all this hacky space padding business. But if we switched to minisearch, I'm not sure how we would do
// highlighting of fuzzy match portions, e.g. higlighting "[japane]se" if the user searched "jpane"
// and what we have is working for now

export function searchForLanguage(
  queryString: string
): FuseResult<ILanguage>[] {
  const baseFuseOptions = {
    isCaseSensitive: false,
    includeMatches: true,
    minMatchCharLength: 2,

    keys: allFuseSearchKeys,
    ignoreLocation: true,
    ignoreFieldNorm: true,
    findAllMatches: false,
  };

  const exactMatchFuse = new Fuse(spacePaddedLanguages as ILanguage[], {
    ...baseFuseOptions,
    threshold: 0, //exact matches only
    keys: exactMatchPrioritizableFuseSearchKeys,
  });

  // We have padded with spaces, so e.g. if queryString is "cree", then " cree " is an exact match for " plains cree " but not " creek "
  const wholeWordMatchResults = exactMatchFuse.search(" " + queryString + " ");

  // e.g. if querystring is "otl", then " otl" is a prefix match for " San Felipe Otlaltepec Popoloca " but not "botlikh"
  const prefixMatchResults = exactMatchFuse.search(" " + queryString);

  const fuzzyMatchFuse = new Fuse(languages as ILanguage[], {
    ...baseFuseOptions,
    threshold: 0.3,
  });
  const fuzzyMatchResults = fuzzyMatchFuse.search(queryString);

  // Use the results from the fuzzy match search, since the others will have incorrect match indices due to the space padding.
  // But order the results in order of whole word matches, then prefix matches, then the rest with no duplicates
  const resultsByIso639_3Code = new Map<string, FuseResult<ILanguage>>();
  for (const result of fuzzyMatchResults) {
    resultsByIso639_3Code.set(result.item.iso639_3_code, result);
  }
  const orderedResults = [];
  for (const resultList of [
    wholeWordMatchResults,
    prefixMatchResults,
    fuzzyMatchResults,
  ]) {
    for (const r of resultList) {
      const isoCode = r.item.iso639_3_code;
      const correctResult = resultsByIso639_3Code.get(isoCode);
      if (correctResult) {
        // this language was not already added as part of a previous subset
        // (wholeWordMatchResults should be a subset of prefixMatchResults which should be a subset of fuzzyMatchResults)
        orderedResults.push(correctResult);
        resultsByIso639_3Code.delete(isoCode);
      }
    }
  }
  return orderedResults;
}

// get language with exact match on subtag
export function getLanguageBySubtag(
  code: string,
  searchResultModifier?: (
    results: FuseResult<ILanguage>[],
    searchString: string
  ) => ILanguage[]
): ILanguage | undefined {
  const fuse = new Fuse(languages as ILanguage[], {
    keys: ["languageSubtag", "iso639_3_code"],
    threshold: 0, // exact matches only
  });
  const rawResults = fuse.search(code);
  return searchResultModifier
    ? searchResultModifier(rawResults, code)[0]
    : rawResults[0]?.item;
}
