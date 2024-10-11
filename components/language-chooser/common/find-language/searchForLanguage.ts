import Fuse, { FuseResult } from "fuse.js";
import languages from "./language-data/languageData.json";
import { ILanguage } from "./findLanguageInterfaces";

const fuseSearchKeys = [
  { name: "autonym", weight: 100 },
  { name: "exonym", weight: 100 },
  { name: "languageSubtag", weight: 80 },
  { name: "names", weight: 8 },
  { name: "regionNames", weight: 1 },
];

// We will bring results that start with the query string to the top of the list
// except for results that just have a region name that starts with the query string
const prefixPrioritizableFuseSearchKeys = [
  { name: "autonym", weight: 100 },
  { name: "exonym", weight: 100 },
  { name: "languageSubtag", weight: 80 },
  { name: "names", weight: 8 },
];

export const fieldsToSearch = fuseSearchKeys.map((key) => key.name);

export function searchForLanguage(
  queryString: string
): FuseResult<ILanguage>[] {
  const baseFuseOptions = {
    isCaseSensitive: false,
    includeMatches: true,
    minMatchCharLength: 2,

    keys: fuseSearchKeys,
    ignoreFieldNorm: true,
    findAllMatches: false,
  };

  // separately collect results that start with the query string, so we can prioritize them
  const prefixOnlyFuse = new Fuse(languages as ILanguage[], {
    ...baseFuseOptions,
    threshold: 0.2, // we can turn this down if we find it's prioritizing things that are not so close matches
    keys: prefixPrioritizableFuseSearchKeys,
    location: 0,
    distance: 1,
  });
  const prefixOnlyResults = prefixOnlyFuse.search(queryString);

  const allResultsFuse = new Fuse(languages as ILanguage[], {
    ...baseFuseOptions,
    ignoreLocation: true,
    threshold: 0.2,
  });
  const allResults = allResultsFuse.search(queryString);

  // remove the results in prefixOnlyResults from locationIndependentResults
  // so we can combine without duplicates
  const prefixOnlyResultsCodes = new Set(
    prefixOnlyResults.map((result) => result.item.iso639_3_code)
  );
  const nonPrefixResults = allResults.filter(
    (result) => !prefixOnlyResultsCodes.has(result.item.iso639_3_code)
  );
  return [...prefixOnlyResults, ...nonPrefixResults];
}
