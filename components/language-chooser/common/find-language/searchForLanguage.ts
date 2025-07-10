import Fuse, { FuseResult } from "fuse.js";
import rawLanguages from "./language-data/languageData.json";
import { ILanguage } from "./findLanguageInterfaces";

const ORIGINAL_LANGUAGE_OBJECT_KEY = "_originalLanguageObject";

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
    getFn: (l: any) => l.parentMacrolanguage?.iso639_3_code || "",
    weight: 70,
  },
  {
    name: "macrolanguageSubtag",
    getFn: (l: any) => l.parentMacrolanguage?.languageSubtag || "",
    weight: 70,
  },
  {
    name: "macrolanguageName",
    getFn: (l: any) => l.parentMacrolanguage?.exonym || "",
    weight: 70,
  },
];

const defaultFuseOptions = {
  isCaseSensitive: false,
  includeMatches: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
  ignoreFieldNorm: true,
  findAllMatches: false,
};

// exported for match-highlighting use
export const fieldsToSearch = allFuseSearchKeys.map((key) => key.name);

// a good alternative search library would be minisearch (https://github.com/lucaong/minisearch) which handles word tokenization
// and so we wouldn't need all this hacky space padding business.

export class LanguageSearcher {
  private queryString: string;
  private languagesToSearch: Record<string, unknown>[];
  private baseFuseOptions: Record<string, unknown>;
  private spacePaddedLanguages: Record<string, unknown>[];
  private keysOverride?: string[];

  // Fuse objects as properties
  private completeMatchFuse: Fuse<Record<string, unknown>>;
  private spacePaddedFuse: Fuse<Record<string, unknown>>;
  private substringMatchFuse: Fuse<Record<string, unknown>>;
  private fuzzyMatchFuse: Fuse<Record<string, unknown>>;

  constructor(
    queryString: string,
    additionalFuseOptions: Record<string, unknown> = {},
    languagesToSearch?: Record<string, unknown>[],
    keysOverride?: string[]
  ) {
    this.queryString = queryString;
    if (languagesToSearch === undefined) {
      this.languagesToSearch = rawLanguages as ILanguage[];
    } else {
      this.languagesToSearch = languagesToSearch;
    }
    this.keysOverride = keysOverride;

    // If we surround the search targets with spaces, we can detect exact whole-word matches or start-of-word matches
    // simply by adding spaces around the query string
    this.spacePaddedLanguages = this.languagesToSearch.map(
      (language: Record<string, unknown>) => {
        const spacePaddedLanguage = { ...language };
        if (this.keysOverride) {
          for (const key of this.keysOverride) {
            if (typeof spacePaddedLanguage[key] === "string") {
              spacePaddedLanguage[key] = this.spacePad(
                spacePaddedLanguage[key]
              );
            }
          }
        } else {
          const spacePaddedILanguage = spacePaddedLanguage as ILanguage;
          spacePaddedLanguage.autonym = this.spacePad(
            spacePaddedILanguage.autonym
          );
          spacePaddedLanguage.exonym =
            this.spacePad(spacePaddedILanguage.exonym) || "";
          spacePaddedLanguage.names = spacePaddedILanguage.names.map(
            (name: string) => this.spacePad(name) || ""
          );
          spacePaddedLanguage.languageSubtag =
            this.spacePad(spacePaddedILanguage.languageSubtag) || "";
        }
        // Check that originalLanguageObject is not already a key
        if (ORIGINAL_LANGUAGE_OBJECT_KEY in spacePaddedLanguage) {
          console.error(
            `Language object already contains key '${ORIGINAL_LANGUAGE_OBJECT_KEY}'`
          );
        }
        spacePaddedLanguage[ORIGINAL_LANGUAGE_OBJECT_KEY] = language; // keep the original object for later use
        return spacePaddedLanguage;
      }
    );

    this.baseFuseOptions = {
      ...defaultFuseOptions,
      ...additionalFuseOptions,
    };

    // Initialize Fuse objects
    this.completeMatchFuse = new Fuse(this.languagesToSearch, {
      ...this.baseFuseOptions,
      keys: this.keysOverride || exactMatchPrioritizableFuseSearchKeys,
      useExtendedSearch: true,
    });

    this.spacePaddedFuse = new Fuse(this.spacePaddedLanguages, {
      ...this.baseFuseOptions,
      keys: this.keysOverride || exactMatchPrioritizableFuseSearchKeys,
      threshold: 0, // exact matches only
    });

    this.substringMatchFuse = new Fuse(this.languagesToSearch, {
      ...this.baseFuseOptions,
      keys: this.keysOverride || exactMatchPrioritizableFuseSearchKeys,
      threshold: 0,
    });

    this.fuzzyMatchFuse = new Fuse(this.languagesToSearch, {
      ...this.baseFuseOptions,
      keys: this.keysOverride || allFuseSearchKeys,
      threshold: 0.3,
    });
  }

  private spacePad(target: string | undefined) {
    return target ? " " + target + " " : target;
  }

  private convertSpacePaddedResults(
    spacePaddedResults: FuseResult<Record<string, unknown>>[]
  ): FuseResult<Record<string, unknown>>[] {
    // Get the versions without space padding
    return spacePaddedResults.map((r) => {
      return {
        ...r,
        item: r.item[ORIGINAL_LANGUAGE_OBJECT_KEY],
      } as FuseResult<Record<string, unknown>>;
    });
  }

  /* Complete matches: e.g "Foo" for search string "foo" */
  public searchCompleteMatches(): FuseResult<Record<string, unknown>>[] {
    return this.completeMatchFuse.search(`="${this.queryString}"`);
  }

  /* Whole word matches: e.g "Foo Bar" or "Bar Foo" for search string "foo" */
  public searchWholeWordMatches(): FuseResult<Record<string, unknown>>[] {
    return this.convertSpacePaddedResults(
      this.spacePaddedFuse.search(" " + this.queryString + " ")
    );
  }

  /* Start-of-word matches: e.g "Foobar" or "Baz Foobar" for search string "foo" */
  public searchStartOfWordMatches(): FuseResult<Record<string, unknown>>[] {
    return this.convertSpacePaddedResults(
      this.spacePaddedFuse.search(" " + this.queryString)
    );
  }

  /* Substring matches: e.g. "Barfoobaz" for search string "foo" */
  public searchSubstringMatches(): FuseResult<Record<string, unknown>>[] {
    return this.substringMatchFuse.search(this.queryString);
  }

  /* Fuzzy matches: e.g. "Fxoo" or "Barfxobaz" for search string "foo" */
  public searchFuzzyMatches(): FuseResult<Record<string, unknown>>[] {
    return this.fuzzyMatchFuse.search(this.queryString);
  }
}

export function searchForLanguage(
  queryString: string,
  additionalFuseOptions: Record<string, unknown> = {},
  languagesToSearch?: Record<string, unknown>[],
  languageToId: (language: Record<string, unknown>) => string = (l) =>
    l.iso639_3_code as string,
  keysOverride?: string[]
): Record<string, unknown>[] {
  const searcher = new LanguageSearcher(
    queryString,
    additionalFuseOptions,
    languagesToSearch,
    keysOverride
  );

  const seenLanguageIds = new Set<string>();
  const uniqueResults: Record<string, unknown>[] = [];

  // Process results in order of priority, removing duplicates
  const allResults = [
    ...searcher.searchCompleteMatches().map((result) => result.item),
    ...searcher.searchWholeWordMatches().map((result) => result.item),
    ...searcher.searchStartOfWordMatches().map((result) => result.item),
    ...searcher.searchSubstringMatches().map((result) => result.item),
    ...searcher.searchFuzzyMatches().map((result) => result.item),
  ];

  for (const result of allResults) {
    const languageId = languageToId(result);
    if (!seenLanguageIds.has(languageId)) {
      seenLanguageIds.add(languageId);
      uniqueResults.push(result);
    }
  }

  return uniqueResults;
}

export async function asyncSearchForLanguage(
  queryString: string,
  appendResults: (
    results: Record<string, unknown>[],
    forSearchString: string
  ) => boolean,
  // Consumers can freely specify: isCaseSensitive, ignoreDiacritics, includeScore, includeMatches, keys, threshold, and getFn.
  // All other options should be specified with care as there may be unexpected results.
  additionalFuseOptions?: Record<string, unknown>,
  languagesToSearch?: Record<string, unknown>[],
  languageToId: (language: Record<string, unknown>) => string = (l) =>
    l.iso639_3_code as string,
  keysOverride?: string[]
): Promise<void> {
  if (languagesToSearch && languagesToSearch.length === 0) {
    console.warn("No languages to search. Returning without results.");
    return;
  }
  const searcher = new LanguageSearcher(
    queryString,
    additionalFuseOptions,
    languagesToSearch,
    keysOverride
  );

  const alreadyFoundIds = new Set<string>();

  const processNewResults = async (
    newResults: FuseResult<Record<string, unknown>>[]
  ): Promise<boolean> => {
    const filteredResults: Record<string, unknown>[] = newResults
      .map((r) => r.item)
      .filter((result) => !alreadyFoundIds.has(languageToId(result)));

    filteredResults
      .map((result) => languageToId(result))
      .forEach(alreadyFoundIds.add, alreadyFoundIds);

    const yieldToEventLoop = () =>
      new Promise((resolve) => setTimeout(resolve, 0));
    await yieldToEventLoop();

    return appendResults(filteredResults, queryString);
  };

  let continueSearching = true;

  // Execute searches in order of relevance/quality - results are appended in this priority order:
  // 1. Complete matches: e.g "Foo" for search string "foo"
  // 2. Whole word matches: e.g "Foo Bar" or "Bar Foo" for search string "foo"
  // 3. Start-of-word matches: e.g "Foobar" or "Baz Foobar" for search string "foo"
  // 4. Substring matches: e.g. "Barfoobaz" for search string "foo"
  // 5. Fuzzy matches: e.g. "Fxoo" or "Barfxobaz" for search string "foo"
  const completeResults = searcher.searchCompleteMatches();
  continueSearching = await processNewResults(completeResults);
  if (!continueSearching) return;

  const wholeWordResults = searcher.searchWholeWordMatches();
  continueSearching = await processNewResults(wholeWordResults);
  if (!continueSearching) return;

  const startOfWordResults = searcher.searchStartOfWordMatches();
  continueSearching = await processNewResults(startOfWordResults);
  if (!continueSearching) return;

  const substringResults = searcher.searchSubstringMatches();
  continueSearching = await processNewResults(substringResults);
  if (!continueSearching) return;

  const fuzzyResults = searcher.searchFuzzyMatches();
  continueSearching = await processNewResults(fuzzyResults);
  if (!continueSearching) return;
}

// get language with exact match on subtag
export function getLanguageBySubtag(
  code: string,
  searchResultModifier?: (
    results: ILanguage[],
    searchString: string
  ) => ILanguage[]
): ILanguage | undefined {
  const languages = rawLanguages as ILanguage[];
  /* If the code is used for both a macrolanguage and the representative language (macrolanguageNotes.md),
  return the representative language by default (BL-14824). */
  const macrolanguageRepFuse = new Fuse(languages as ILanguage[], {
    keys: [
      "parentMacrolanguage.languageSubtag",
      "parentMacrolanguage.iso639_3_code",
      "isRepresentativeForMacrolanguage",
    ],
    threshold: 0, // exact matches only
    useExtendedSearch: true,
  });
  let rawResults = macrolanguageRepFuse.search({
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

  if (rawResults.length > 1)
    console.error(
      "Unexpectedly found multiple representative languages for " +
        code +
        ": " +
        rawResults.map((r) => r.item.iso639_3_code).join(", ")
    );

  /* If search for code didn't find exactly one representative language for a macrolanguage,
  do normal language search instead */
  if (rawResults.length !== 1) {
    const fuse = new Fuse(languages as ILanguage[], {
      keys: ["languageSubtag", "iso639_3_code"],
      threshold: 0, // exact matches only
      useExtendedSearch: true,
    });
    rawResults = fuse.search("=" + code); // exact match
  }

  const result = rawResults[0]?.item;
  return searchResultModifier
    ? searchResultModifier([result], code)[0]
    : result;
}
