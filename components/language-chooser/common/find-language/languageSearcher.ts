/* allow anys so we can handle any shape of language object */
/* eslint-disable @typescript-eslint/no-explicit-any */

import Fuse, { FuseResult } from "fuse.js";

const ORIGINAL_LANGUAGE_OBJECT_KEY = "_originalLanguageObject";

const defaultFuseOptions = {
  isCaseSensitive: false,
  includeMatches: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
  ignoreFieldNorm: true,
  findAllMatches: false,
};

// a good alternative search library to fuse would be minisearch (https://github.com/lucaong/minisearch) which handles word tokenization
// and so we wouldn't need all this hacky space padding business. We used fuse because we used to be using its match indices
// for highlighting, but now that we are doing that ourselves, we could potentially switch to minisearch. But we would need
// to investigate whether we can get a satisfactory ordering of results from it.

// Can be used to search through language objects of any shape
// Executes searches in order of relevance/quality - results are appended in this priority order:
// 1. Complete matches: e.g "Foo" for search string "foo"
// 2. Whole word matches: e.g "Foo Bar" or "Bar Foo" for search string "foo"
// 3. Start-of-word matches: e.g "Foobar" or "Baz Foobar" for search string "foo"
// 4. Substring matches: e.g. "Barfoobaz" for search string "foo"
// 5. Fuzzy matches: e.g. "Fxoo" or "Barfxobaz" for search string "foo"
export class LanguageSearcher {
  private languageData: object[];
  private baseFuseOptions: any;
  private spacePaddedLanguages: any[];
  private languageToId: (language: any) => string;

  // Fuse objects as properties
  private completeMatchFuse: Fuse<any>;
  private spacePaddedFuse: Fuse<any>;
  private substringMatchFuse: Fuse<any>;
  private fuzzyMatchFuse: Fuse<any>;

  constructor(
    languageData: any[],
    languageToId: (language: any) => string,
    exactMatchFuseSearchKeys: any[],
    fuzzyMatchFuseSearchKeys: any[],
    // Consumers can freely specify: isCaseSensitive, ignoreDiacritics, includeScore, includeMatches, keys, threshold, and getFn.
    // All other options should be specified with care as there may be unexpected results.
    additionalFuseOptions?: any,
    customLanguageSpacePadder?: (language: any) => any
  ) {
    this.languageData = languageData;
    this.languageToId = languageToId;

    // If we surround the search targets with spaces, we can detect exact whole-word matches or start-of-word matches
    // simply by adding spaces around the query string
    this.spacePaddedLanguages = languageData.map((language) => {
      let spacePaddedLanguage: any;

      if (customLanguageSpacePadder) {
        spacePaddedLanguage = customLanguageSpacePadder(language);
      } else {
        spacePaddedLanguage = { ...language };
        for (const key of exactMatchFuseSearchKeys) {
          if (typeof spacePaddedLanguage[key] === "string") {
            spacePaddedLanguage[key] = ` ${spacePaddedLanguage[key]} `;
          }
        }

        if (
          typeof language === "object" &&
          language !== null &&
          ORIGINAL_LANGUAGE_OBJECT_KEY in language
        ) {
          console.error(
            `Language object already contains key '${ORIGINAL_LANGUAGE_OBJECT_KEY}'. Will be overwritten.`
          );
        }
      }
      spacePaddedLanguage[ORIGINAL_LANGUAGE_OBJECT_KEY] = language; // keep the original object for later use
      return spacePaddedLanguage;
    });

    this.baseFuseOptions = {
      ...defaultFuseOptions,
      ...(additionalFuseOptions || {}),
    };

    this.completeMatchFuse = new Fuse(this.languageData, {
      ...this.baseFuseOptions,
      keys: exactMatchFuseSearchKeys,
      useExtendedSearch: true,
    });

    this.spacePaddedFuse = new Fuse(this.spacePaddedLanguages, {
      ...this.baseFuseOptions,
      keys: exactMatchFuseSearchKeys,
      threshold: 0, // exact matches only
    });

    this.substringMatchFuse = new Fuse(this.languageData, {
      ...this.baseFuseOptions,
      keys: exactMatchFuseSearchKeys,
      threshold: 0,
    });

    this.fuzzyMatchFuse = new Fuse(this.languageData, {
      ...this.baseFuseOptions,
      keys: fuzzyMatchFuseSearchKeys,
      threshold: 0.3,
    });
  }

  /* Complete matches: e.g "Foo" for search string "foo" */
  private searchCompleteMatches(queryString: string): FuseResult<any>[] {
    return this.completeMatchFuse.search(`="${queryString}"`);
  }

  /* Whole word matches: e.g "Foo Bar" or "Bar Foo" for search string "foo" */
  private searchWholeWordMatches(queryString: string): FuseResult<any>[] {
    return this.revertSpacePaddedResults(
      this.spacePaddedFuse.search(" " + queryString + " ")
    );
  }

  /* Start-of-word matches: e.g "Foobar" or "Baz Foobar" for search string "foo" */
  private searchStartOfWordMatches(queryString: string): FuseResult<any>[] {
    return this.revertSpacePaddedResults(
      this.spacePaddedFuse.search(" " + queryString)
    );
  }

  /* Substring matches: e.g. "Barfoobaz" for search string "foo" */
  private searchSubstringMatches(queryString: string): FuseResult<any>[] {
    return this.substringMatchFuse.search(queryString);
  }

  /* Fuzzy matches: e.g. "Fxoo" or "Barfxobaz" for search string "foo" */
  private searchFuzzyMatches(queryString: string): FuseResult<any>[] {
    return this.fuzzyMatchFuse.search(queryString);
  }

  private revertSpacePaddedResults(
    spacePaddedResults: FuseResult<any>[]
  ): FuseResult<any>[] {
    // Get the versions without space padding
    return spacePaddedResults.map((r) => {
      return {
        ...r,
        item: r.item[ORIGINAL_LANGUAGE_OBJECT_KEY],
      } as FuseResult<any>;
    });
  }

  public searchForLanguage(queryString: string): any[] {
    const seenLanguageIds = new Set<string>();
    const uniqueResults: any[] = [];

    // Process results in order of priority, removing duplicates
    const allResults = [
      ...this.searchCompleteMatches(queryString).map((result) => result.item),
      ...this.searchWholeWordMatches(queryString).map((result) => result.item),
      ...this.searchStartOfWordMatches(queryString).map(
        (result) => result.item
      ),
      ...this.searchSubstringMatches(queryString).map((result) => result.item),
      ...this.searchFuzzyMatches(queryString).map((result) => result.item),
    ];

    for (const result of allResults) {
      const languageId = this.languageToId(result);
      if (!seenLanguageIds.has(languageId)) {
        seenLanguageIds.add(languageId);
        uniqueResults.push(result);
      }
    }

    return uniqueResults;
  }

  public async asyncSearchForLanguage(
    queryString: string,
    appendResults: (results: any[], forSearchString: string) => boolean
  ): Promise<void> {
    if (this.languageData && this.languageData.length === 0) {
      console.warn("No languages to search. Returning without results.");
      return;
    }

    const alreadyFoundIds = new Set<string>();

    const processNewResults = async (
      newResults: FuseResult<any>[]
    ): Promise<boolean> => {
      const filteredResults: any[] = newResults
        .map((r) => r.item)
        .filter((result) => !alreadyFoundIds.has(this.languageToId(result)));

      filteredResults
        .map((result) => this.languageToId(result))
        .forEach(alreadyFoundIds.add, alreadyFoundIds);

      const yieldToEventLoop = () =>
        new Promise((resolve) => setTimeout(resolve, 0));
      await yieldToEventLoop();

      return appendResults(filteredResults, queryString);
    };

    let continueSearching = true;

    for (const searchFunction of [
      this.searchCompleteMatches.bind(this),
      this.searchWholeWordMatches.bind(this),
      this.searchStartOfWordMatches.bind(this),
      this.searchSubstringMatches.bind(this),
      this.searchFuzzyMatches.bind(this),
    ]) {
      const results = searchFunction(queryString);
      continueSearching = await processNewResults(results);
      if (!continueSearching) return;
    }
  }
}
