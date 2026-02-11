import Fuse from "fuse.js";
import {
  ICustomizableLanguageDetails,
  ILanguage,
  IOrthography,
  IScript,
} from "./findLanguageInterfaces";
import rawLanguages from "./language-data/languageData.json";
import { LanguageSearcher } from "./languageSearcher";
import {
  splitTag,
  codeMatches,
  UNLISTED_LANGUAGE,
  getMaximalLangtag,
} from "./languageTagUtils";
import { getRegionBySubtag, getScriptForLanguage } from "./regionsAndScripts";

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
  return getLanguageSearcher().searchForLanguage(queryString);
}

export async function asyncSearchForLanguage(
  queryString: string,
  appendResults: (results: ILanguage[], forSearchString: string) => boolean
): Promise<void> {
  return getLanguageSearcher().asyncSearchForLanguage(
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

// This is not a comprehensive language tag parser. It's just built to parse the
// langtags output by the language chooser and the libPalasso language picker that
// was in BloomDesktop.
//
// Notes on language subtags:
// - Many languages have both ISO 639-1 and ISO 639-3 codes (e.g. en/eng). Either may appear.
// - Some individual languages are canonically equivalent (in langtags.txt) to a macrolanguage code
//   (e.g. uzn ≈ uz). The language chooser preserves the specific selected language subtag in its
//   output tags (so selecting uzn yields a tag starting with uzn, not uz).
//
// This parser is not designed to handle BCP-47 corner cases, e.g. irregular codes,
// extension codes, or tags with both macrolanguage code and language code. It will return
// undefined if it encounters these, e.g. in cases where a langtag was manually entered in
// the language chooser.

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
