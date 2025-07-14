import Fuse from "fuse.js";
import { ILanguage } from "./findLanguageInterfaces";
import rawLanguages from "./language-data/languageData.json";
import { LanguageSearcher } from "./languageSearchUtils";

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

function spacePadderForILanguages(language: ILanguage): ILanguage {
  return {
    ...language,
    autonym: ` ${language.autonym} `,
    exonym: ` ${language.exonym} `,
    names: language.names.map((name) => ` ${name} `),
    languageSubtag: ` ${language.languageSubtag} `,
  };
}

// Lazily initialized to avoid side effects on import
let languageSearcher: LanguageSearcher | null = null;

function getLanguageSearcher(): LanguageSearcher {
  if (!languageSearcher) {
    languageSearcher = new LanguageSearcher(
      rawLanguages as ILanguage[],
      (language) => language.iso639_3_code,
      exactMatchPrioritizableFuseSearchKeys,
      allFuseSearchKeys,
      {},
      spacePadderForILanguages
    );
  }
  return languageSearcher;
}

export function searchForLanguage(queryString: string): ILanguage[] {
  return getLanguageSearcher().searchDataForLanguage(queryString);
}

export async function asyncSearchForLanguage(
  queryString: string,
  appendResults: (results: ILanguage[], forSearchString: string) => boolean
): Promise<void> {
  return getLanguageSearcher().asyncSearchDataForLanguage(
    queryString,
    appendResults
  );
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
