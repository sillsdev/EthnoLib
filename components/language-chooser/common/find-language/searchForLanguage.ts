import Fuse, { FuseResult } from "fuse.js";
import languages from "./language-data/languageData.json";
import { ILanguage } from "./findLanguageInterfaces";

function spacePad(target: string | undefined) {
  return target ? " " + target + " " : target;
}

// We will then also pad the search terms with spaces and so be able to detect an exact whole-word match or prefix match
const spacePaddedLanguages = languages.map((language) => ({
  ...language,
  autonym: spacePad(language.autonym),
  exonym: spacePad(language.exonym),
  names: language.names.map(spacePad),
  languageSubtag: spacePad(language.languageSubtag),
}));

// We will bring results that exactly whole-word match or prefix-match to the top of the list
// but don't want to do this for region names
const exactMatchPrioritizableFuseSearchKeys = [
  { name: "autonym", weight: 100 },
  { name: "exonym", weight: 100 },
  { name: "languageSubtag", weight: 80 },
  { name: "names", weight: 8 },
];

const allFuseSearchKeys = [
  ...exactMatchPrioritizableFuseSearchKeys,
  { name: "regionNames", weight: 1 },
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

  const fuzzyMatchFuse = new Fuse(spacePaddedLanguages as ILanguage[], {
    ...baseFuseOptions,
    threshold: 0.3,
  });
  const fuzzyMatchResults = fuzzyMatchFuse.search(queryString);

  // Combine all the result lists with no duplicates, prioritizing whole word exact matches then prefix exact matches then all other fuzzy matches
  const results = [];
  const alreadyIncludedResultCodes = new Set();
  for (const resultList of [
    wholeWordMatchResults,
    prefixMatchResults,
    fuzzyMatchResults,
  ]) {
    for (const result of resultList) {
      if (!alreadyIncludedResultCodes.has(result.item.iso639_3_code)) {
        results.push(result);
        alreadyIncludedResultCodes.add(result.item.iso639_3_code);
      }
    }
  }

  return results.map((result) => ({
    ...result,
    item: {
      ...result.item,
      autonym: result.item.autonym ? result.item.autonym.trim() : undefined,
      exonym: result.item.exonym.trim(),
      names: result.item.names.map((n) => n.trim()),
      languageSubtag: result.item.languageSubtag.trim(),
    },
  }));
}

// get language (not macrolanguage) with exact match on subtag
export function getLanguageBySubtag(code: string): ILanguage | undefined {
  const fuse = new Fuse(languages as ILanguage[], {
    keys: ["languageSubtag", "iso639_3_code"],
    threshold: 0, // exact matches only
    findAllMatches: true, // in case one is a macrolanguage
  });
  const results = fuse.search(code);
  const filteredResults = results.filter(
    (result) => !result.item.isMacrolanguage
  );
  return filteredResults[0]?.item;
}
