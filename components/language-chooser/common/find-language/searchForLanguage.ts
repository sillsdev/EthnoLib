import Fuse, { FuseResult } from "fuse.js";
import rawLanguages from "./language-data/languageData.json";
import { ILanguage } from "./findLanguageInterfaces";

const languages = rawLanguages as ILanguage[];

function spacePad(target: string | undefined) {
  return target ? " " + target + " " : target;
}

// If we surround the search targets with spaces, we can detect exact whole-word matches or start-of-word matches simply by adding spaces around the query string
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

  // All fields below are currently not displayed on the card, but we still want corresponding results to come up if people search for them
  { name: "iso639_3_code", weight: 70 },
  { name: "alternativeTags", weight: 70 },
];
// We will bring results that exactly whole-word match or start-of-word match to the top of the list
// but don't want to do this for region names or invisible macrolanguage info
const allFuseSearchKeys = [
  ...exactMatchPrioritizableFuseSearchKeys,
  { name: "regionNamesForSearch", weight: 1 },
  // If this language is a member of a macrolanguage, we want it to come up if the user searches for that macrolanguage (though this macrolanguage info is not visible on the card)
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

// exported for match-highlighting use
export const fieldsToSearch = allFuseSearchKeys.map((key) => key.name);

// a good alternative search library would be minisearch (https://github.com/lucaong/minisearch) which handles word tokenization
// and so we wouldn't need all this hacky space padding business.

export async function asyncSearchForLanguage(
  queryString: string,
  appendResults: (results: ILanguage[], forSearchString: string) => boolean
): Promise<void> {
  const alreadyFoundIsoCodes = new Set<string>();
  let continueSearching = true;

  async function newResultsFound(
    newResults: FuseResult<ILanguage>[]
  ): Promise<boolean> {
    const filteredResults: ILanguage[] = newResults
      .map((r) => r.item)
      .filter((result) => !alreadyFoundIsoCodes.has(result.iso639_3_code));

    filteredResults
      .map((result) => result.iso639_3_code)
      .forEach(alreadyFoundIsoCodes.add, alreadyFoundIsoCodes);

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

  /* Start-of-word matches: e.g "Foobar" or "Baz Foobar" for search string "foo" */
  // e.g. if querystring is "otl", then " otl" is a start-of-word match for " San Felipe Otlaltepec Popoloca " but not "botlikh"
  const spacePaddedStartOfWordMatchResults = spacePaddedFuse.search(
    " " + queryString
  );

  // Get the versions without space padding
  const startOfWordMatchResults = spacePaddedStartOfWordMatchResults.map(
    (r) => {
      return {
        ...r,
        item: languagesByIsoCode[r.item.iso639_3_code],
      };
    }
  );
  continueSearching = await newResultsFound(startOfWordMatchResults);
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

export async function asyncGetAllLanguageResults(
  searchString: string
): Promise<ILanguage[]> {
  const results: ILanguage[] = [];
  await asyncSearchForLanguage(searchString, (newResults) => {
    results.push(...newResults);
    return true;
  });
  return results;
}

// get language with exact match on subtag
export function getLanguageBySubtag(
  code: string,
  searchResultModifier?: (
    results: ILanguage[],
    searchString: string
  ) => ILanguage[]
): ILanguage | undefined {
  const macrolanguageRepFuse = new Fuse(languages as ILanguage[], {
    keys: [
      "parentMacrolanguage.languageSubtag",
      "parentMacrolanguage.iso639_3_code",
      "isRepresentativeForMacrolanguage",
    ],
    threshold: 0, // exact matches only
    useExtendedSearch: true,
  });
  var rawResults = macrolanguageRepFuse.search({
    $and: [
      {
        $or: [
          { "parentMacrolanguage.languageSubtag": "=" + code },
          { "parentMacrolanguage.iso639_3_code": "=" + code },
        ],
      },
      { isRepresentativeForMacrolanguage: "=true" },
    ],
  });

  if (rawResults.length === 1) {
    // either have parents - so use searchResultModifier if possible,
    const result = rawResults[0].item;
    return searchResultModifier
      ? searchResultModifier([result], code)[0]
      : result;
  }

  // or no parents, so re-search all languages for code
  const fuse = new Fuse(languages as ILanguage[], {
    keys: ["languageSubtag", "iso639_3_code"],
    threshold: 0, // exact matches only
    useExtendedSearch: true,
  });
  rawResults = fuse.search("=" + code); // exact match

  return searchResultModifier
    ? searchResultModifier([rawResults[0]?.item], code)[0]
    : rawResults[0]?.item;
}
