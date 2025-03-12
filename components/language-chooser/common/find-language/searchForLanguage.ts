import Fuse, { FuseResult } from "fuse.js";
import rawLanguages from "./language-data/languageData.json";
import { ILanguage } from "./findLanguageInterfaces";

const languages = rawLanguages as ILanguage[];

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

const languagesByIsoCode = {
  ...Object.fromEntries(
    languages.map((language: ILanguage) => [language.iso639_3_code, language])
  ),
};

const exactMatchPrioritizableFuseSearchKeys = [
  { name: "autonym", weight: 100 },
  { name: "exonym", weight: 100 },
  { name: "languageSubtag", weight: 80 },
  { name: "names", weight: 8 },

  // These are currently not displayed on the card, but we still want corresponding results to come up if people search for them
  { name: "iso639_3_code", weight: 70 }, // e.g. eng
  { name: "alternativeTags", weight: 70 }, // e.g. en-Latn, en-US, en-US-Latn
];
// We will bring results that exactly whole-word match or prefix-match to the top of the list
// but don't want to do this for region names
const allFuseSearchKeys = [
  ...exactMatchPrioritizableFuseSearchKeys,
  { name: "regionNames", weight: 1 },
];

// TODO stop using fuse types, make all ILanguage[]
// exported for match-highlighting use
export const fieldsToSearch = allFuseSearchKeys.map((key) => key.name);

// a good alternative search library would be minisearch (https://github.com/lucaong/minisearch) which handles word tokenization
// and so we wouldn't need all this hacky space padding business.

export async function asyncSearchForLanguage(
  queryString: string,
  appendResults: (
    results: FuseResult<ILanguage>[],
    forSearchString: string
  ) => boolean
): Promise<void> {
  let alreadyFoundIsoCodes = new Set<string>();
  let continueSearching = true;

  async function newResultsFound(
    newResults: FuseResult<ILanguage>[]
  ): Promise<boolean> {
    const filteredResults = newResults.filter(
      (result) => !alreadyFoundIsoCodes.has(result.item.iso639_3_code)
    );
    alreadyFoundIsoCodes = new Set([
      ...alreadyFoundIsoCodes,
      ...filteredResults.map((result) => result.item.iso639_3_code),
    ]);

    const yieldToEventLoop = () =>
      new Promise((resolve) => setTimeout(resolve, 0));
    await yieldToEventLoop();

    return appendResults(filteredResults, queryString);
  }

  const baseFuseOptions = {
    isCaseSensitive: false,
    includeMatches: true,
    minMatchCharLength: 2,

    keys: allFuseSearchKeys,
    ignoreLocation: true,
    ignoreFieldNorm: true,
    findAllMatches: false,
  };
  /* Complete matches: e.g "Foo" for search string "foo" */
  const completeMatchFuse = new Fuse(languages as ILanguage[], {
    ...baseFuseOptions,
    useExtendedSearch: true,
    keys: exactMatchPrioritizableFuseSearchKeys,
  });

  const spacePaddedFuse = new Fuse(spacePaddedLanguages as ILanguage[], {
    ...baseFuseOptions,
    threshold: 0, //exact matches only
    keys: exactMatchPrioritizableFuseSearchKeys,
  });

  const completeMatchResults = completeMatchFuse.search(`="${queryString}"`);
  continueSearching = await newResultsFound(completeMatchResults);
  if (!continueSearching) return;

  /* Whole word matches: e.g "Foo Bar" or "Bar Foo" for search string "foo" */
  // We have padded with spaces, so e.g. if queryString is "cree", then " cree " is an exact match for " plains cree " but not " creek "
  const spacePaddedWholeWordMatchResults = spacePaddedFuse.search(
    " " + queryString + " "
  );

  // Get the versions without space padding
  const wholeWordMatchResults = spacePaddedWholeWordMatchResults.map((r) => {
    return {
      ...r,
      item: languagesByIsoCode[r.item.iso639_3_code],
    };
  });
  continueSearching = await newResultsFound(wholeWordMatchResults);
  if (!continueSearching) return;

  /* Prefix matches: e.g "Foobar" or "Baz Foobar" for search string "foo" */
  // e.g. if querystring is "otl", then " otl" is a prefix match for " San Felipe Otlaltepec Popoloca " but not "botlikh"
  const spacePaddedPrefixMatchResults = spacePaddedFuse.search(
    " " + queryString
  );

  // Get the versions without space padding
  const prefixMatchResults = spacePaddedPrefixMatchResults.map((r) => {
    return {
      ...r,
      item: languagesByIsoCode[r.item.iso639_3_code],
    };
  });
  continueSearching = await newResultsFound(prefixMatchResults);
  if (!continueSearching) return;

  /* Substring matches: e.g. "Barfoobaz" for search string "foo" */
  const substringMatchFuse = new Fuse(languages as ILanguage[], {
    ...baseFuseOptions,
    threshold: 0,
    keys: exactMatchPrioritizableFuseSearchKeys,
  });
  const substringMatchResults = substringMatchFuse.search(queryString);
  continueSearching = await newResultsFound(substringMatchResults);
  if (!continueSearching) return;

  /* Fuzzy matches: e.g. "Fxoo" or "Barfxobaz" for search string "foo" */
  const fuzzyMatchFuse = new Fuse(languages as ILanguage[], {
    ...baseFuseOptions,
    threshold: 0.3,
  });
  const fuzzyMatchResults = fuzzyMatchFuse.search(queryString);
  continueSearching = await newResultsFound(fuzzyMatchResults);
  if (!continueSearching) return;
}

export async function getAllLanguageResults(
  searchString: string
): Promise<FuseResult<ILanguage>[]> {
  const results: FuseResult<ILanguage>[] = [];
  await asyncSearchForLanguage(searchString, (newResults) => {
    results.push(...newResults);
    return true;
  });
  return results;
}

// get language (not macrolanguage) with exact match on subtag
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
