/* eslint-disable @typescript-eslint/no-explicit-any */
// Can be used to search through language objects of any shape

import Fuse, { FuseResult } from "fuse.js";
import {
  ILanguage,
  IOrthography,
  IScript,
  ICustomizableLanguageDetails,
} from "./findLanguageInterfaces";
import { getLanguageBySubtag } from "./languageSearch";
import {
  splitTag,
  codeMatches,
  UNLISTED_LANGUAGE,
  getMaximalLangtag,
} from "./languageTagUtils";
import { getRegionBySubtag, getScriptForLanguage } from "./regionsAndScripts";

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
// and so we wouldn't need all this hacky space padding business.

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
    additionalFuseOptions: any = {},
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
      ...additionalFuseOptions,
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

  public searchDataForLanguage(queryString: string): any[] {
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

  public async asyncSearchDataForLanguage(
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

// This is not a comprehensive language tag parser. It's just built to parse the
// langtags output by the language chooser and the libPalasso language picker that
// was in BloomDesktop. The languageTag must be the default language subtag for
// that language (the first part of the "tag" field of langtags.json), which may
// be a 2-letter code even if an equivalent ISO 639-3 code exists. This parser is not
// designed to handle other BCP-47 langtag corner cases, e.g. irregular codes,
// extension codes, langtags with both macrolanguage code and language code. It will return
// undefined if it encounters any of these, e.g. in cases where a langtag was manually
// entered in the language chooser.
export function parseLangtagFromLangChooser(
  languageTag: string, // must be the default language subtag for the language
  searchResultModifier?: (
    results: ILanguage[],
    searchString: string
  ) => ILanguage[]
): IOrthography | undefined {
  if (!languageTag) {
    return undefined;
  }
  const {
    languageSubtag,
    scriptSubtag,
    regionSubtag,
    variantSubtag,
    privateUseSubtag,
    otherSubtags,
  } = splitTag(languageTag);

  // if the langtag has subtags (excluding private use section) that are not the language, script, or region tags,
  // this must be a tag requiring manual entry
  if (otherSubtags?.length || variantSubtag) {
    console.log("langtag parsing found unexpected subtags", otherSubtags);
    return undefined;
  }

  let language = undefined;
  const isUnlistedLanguage = codeMatches(languageSubtag, "qaa");
  if (isUnlistedLanguage) {
    language = UNLISTED_LANGUAGE;
  } else {
    language = getLanguageBySubtag(languageSubtag || "", searchResultModifier);
  }
  if (!language) {
    console.log(
      "langtag parsing found unexpected language subtag",
      languageSubtag
    );
    return undefined;
  }
  const region = getRegionBySubtag(regionSubtag || "");

  // If we received a region code but were unable to map it to a ISO 3166-1 region code, this is a tag requiring manual entry
  if (regionSubtag && !region) {
    console.log("langtag parsing found unexpected region tag", regionSubtag);
    return undefined;
  }

  const scriptRegex = /^[a-zA-Z]{4}$/;
  let script: IScript | undefined = undefined;

  // First, check if there is an explicit script subtag
  if (scriptSubtag) {
    script = getScriptForLanguage(scriptSubtag, language);
  }
  // if we recieved a script subtag but were unable to map it to a ISO 15924 script code, this is a tag requiring manual entry
  if (scriptSubtag && !script) {
    console.log("langtag parsing found unexpected script subtag", scriptSubtag);
    return undefined;
  }

  // If we have no explicit script specified but this language only has one script, use that script
  if (!script && language.scripts.length === 1) {
    script = language.scripts[0];
  }

  // Otherwise, the script must be implied, look for the equivalent maximal tag, which will have a script subtag explicit.
  if (!script && !scriptSubtag) {
    const maximalTag =
      getMaximalLangtag(languageTag) ||
      // The user may have entered a dialect and/or region that are not in the langtags database
      // so if necessary check for the langtag without the dialect and/or region
      getMaximalLangtag(`${languageSubtag}-${regionSubtag}`) ||
      getMaximalLangtag(`${languageSubtag}`) ||
      "";
    // Look for a script code in the maximal tag:
    const impliedScriptSubtag = maximalTag
      .split(/-[xX]-/)[0]
      .split("-")
      .find((s) => scriptRegex.test(s));
    script = getScriptForLanguage(impliedScriptSubtag || "", language);
  }

  return {
    language,
    script,
    customDetails: {
      customDisplayName: undefined,
      region,
      // TODO future work: improve handling if we get both. Currently, we should not be getting variantSubtags.
      dialect: privateUseSubtag || variantSubtag,
    } as ICustomizableLanguageDetails,
  } as IOrthography;
}
