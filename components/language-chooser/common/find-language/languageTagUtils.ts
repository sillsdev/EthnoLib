import equivalentTags from "./language-data/equivalentTags.json" with { type: "json" };
import {
  ICustomizableLanguageDetails,
  ILanguage,
  IOrthography,
  IRegion,
  IScript,
  LanguageType,
} from "./findLanguageInterfaces";
import {
  deepStripDemarcation,
  stripDemarcation,
} from "./matchingSubstringDemarcation";
import { getRegionBySubtag, getScriptForLanguage } from "./regionsAndScripts";
import { getLanguageBySubtag } from "./searchForLanguage";

// Keys are lower cased
const shortPreferredTagLookup = new Map<string, string>();
const maximalTagLookup = new Map<string, string>();
for (const tagset of equivalentTags) {
  for (const tag of tagset.allTags) {
    shortPreferredTagLookup.set(tag.toLowerCase(), tagset.shortest);
    maximalTagLookup.set(tag.toLowerCase(), tagset.maximal);
  }
}

// case insensitive on input. Tries to find a shorter (or the same) equivalent in the language data
// loaded from langtags.txt.  If the input tag has a private use variant (starts with -x-), then it
// removes the private use variant from what is looked up and restores the variant to what is found.
// Returns undefined if the langtag (without any private use variant) is not in langtags.txt and so
// equivalents cannot be looked up.
export function getShortestSufficientLangtag(
  langtag: string
): string | undefined {
  const shorter = shortPreferredTagLookup.get(langtag.toLowerCase());
  if (!shorter && langtag.includes("-x-")) {
    // try to shorten the langtag before the private use section
    const parts = langtag.split("-x-");
    const preferredTag = shortPreferredTagLookup.get(parts[0].toLowerCase());
    if (preferredTag) {
      // If we found a preferred tag, return it with the private use section intact
      return `${preferredTag}-x-${parts.slice(1).join("-x-")}`;
    }
  }
  return shorter;
}

// case insensitive. Returns undefined if langtag is not in langtags.txt and so equivalents cannot be looked up
export function getMaximalLangtag(langtag: string): string | undefined {
  return maximalTagLookup.get(langtag.toLowerCase());
}

// This is pretty naive. If you are using the language-chooser-react-hook and there may be a manually entered language
// tag or bracket demarcation, use createTagFromOrthography in language-chooser-react-hook instead
export function createTag({
  languageCode,
  scriptCode,
  regionCode,
  dialectCode,
}: {
  languageCode?: string;
  scriptCode?: string;
  regionCode?: string;
  dialectCode?: string;
}): string {
  let tag = "";
  if (languageCode) {
    tag += languageCode;
  } else {
    // Unlisted language
    tag += "qaa";
  }
  if (scriptCode) {
    tag += `-${scriptCode}`;
  }
  if (regionCode) {
    tag += `-${regionCode}`;
  }
  // TODO future work: If we ever make the language chooser aware of registered variants, some should not be preceded by the "-x-"
  // For example, compare aai-x-suboro and be-tarask in langtags.txt and langtags.json
  if (!languageCode || dialectCode) {
    tag += "-x-";
  }
  // Subtags have a maximum length of 8 characters, so if dialectCode is longer than that, truncate it
  // when appending to the tag.  See BL-14806.
  if (dialectCode) {
    tag += `${dialectCode.length <= 8 ? dialectCode : dialectCode.slice(0, 8)}`;
  }
  return getShortestSufficientLangtag(tag) || tag;
}

// Compare codes, ignoring any demarcation or casing
// undefined does not match undefined
export function codeMatches(
  code1: string | undefined,
  code2: string | undefined
): boolean {
  return (
    !!code1 &&
    !!code2 &&
    stripDemarcation(code1)?.toUpperCase() ===
      stripDemarcation(code2)?.toUpperCase()
  );
}

const UNLISTED_LANGUAGE_CODE = "qaa";
export const UNLISTED_LANGUAGE = {
  iso639_3_code: UNLISTED_LANGUAGE_CODE,
  languageSubtag: UNLISTED_LANGUAGE_CODE,
  autonym: undefined,
  exonym: "Unknown Language",
  regionNamesForDisplay: "",
  regionNamesForSearch: [],
  scripts: [],
  alternativeTags: [],
  isMacrolanguage: false,
  languageType: LanguageType.Custom,
  names: [],
} as ILanguage;
export function isUnlistedLanguage(
  selectedLanguage: ILanguage | undefined
): boolean {
  return codeMatches(selectedLanguage?.iso639_3_code, UNLISTED_LANGUAGE_CODE);
}

const CODE_FOR_MANUALLY_ENTERED_TAG = "manuallyEnteredTag";
export function languageForManuallyEnteredTag(
  manuallyEnteredTag: string
): ILanguage {
  return {
    iso639_3_code: CODE_FOR_MANUALLY_ENTERED_TAG,
    languageSubtag: CODE_FOR_MANUALLY_ENTERED_TAG,
    autonym: undefined,
    exonym: "",
    regionNamesForDisplay: "",
    regionNamesForSearch: [],
    scripts: [],
    alternativeTags: [],
    isMacrolanguage: false,
    names: [],
    languageType: LanguageType.Custom,
    manuallyEnteredTag,
  } as ILanguage;
}

export function isManuallyEnteredTagLanguage(
  selectedLanguage: ILanguage | undefined
): boolean {
  return codeMatches(
    selectedLanguage?.iso639_3_code,
    CODE_FOR_MANUALLY_ENTERED_TAG
  );
}

export function isValidBcp47Tag(tag: string | undefined): boolean {
  // from https://stackoverflow.com/questions/7035825/regular-expression-for-a-language-tag-as-defined-by-bcp47
  const bcp47Regex =
    /^((?<grandfathered>(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?<language>([A-Za-z]{2,3}(-(?<extlang>[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?<script>[A-Za-z]{4}))?(-(?<region>[A-Za-z]{2}|[0-9]{3}))?(-(?<variant>[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?<extension>[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?<privateUse>x(-[A-Za-z0-9]{1,8})+))?)|(?<privateUse1>x(-[A-Za-z0-9]{1,8})+))$/;
  return !!tag && bcp47Regex.test(tag);
}

export function isValidBcp47VariantSubtag(subtag: string | undefined): boolean {
  // modified from https://stackoverflow.com/questions/7035825/regular-expression-for-a-language-tag-as-defined-by-bcp47
  const bcp47Regex = /^(?<variant>[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3})$/;
  // check for main BCP 47 format, except allow the ai- prefix since
  // consumers (eg Bloom) may use it in the variant field to denote ai translations
  return !!subtag && (bcp47Regex.test(subtag) || subtag.startsWith("ai-"));
}

interface ITagParts {
  languageSubtag: string | undefined;
  scriptSubtag: string | undefined;
  regionSubtag: string | undefined;
  variantSubtag?: string;
  privateUseSubtag?: string;
  otherSubtags?: string[];
}

export function splitTag(tag: string): ITagParts {
  const parts = tag.split(/-[xX]-/);
  const privateUseSubtag = parts[1];
  const mainTag = parts[0];
  const mainSubtags = mainTag.split("-");
  const languageSubtag = mainSubtags.shift();
  const regionSubtag = mainSubtags.find((s) =>
    /^[a-zA-Z]{2}$|^[0-9]{3}$/.test(s)
  );
  const scriptRegex = /^[a-zA-Z]{4}$/;
  const scriptSubtag = mainSubtags.find((s) => scriptRegex.test(s));
  const variantSubtag = mainSubtags.find((s) =>
    /^[0-9][a-zA-Z0-9]{3}$|^[a-zA-Z0-9]{5,8}$/.test(s)
  );
  const otherSubtags = mainSubtags.filter(
    (s) =>
      ![languageSubtag, scriptSubtag, regionSubtag, variantSubtag].includes(s)
  );
  return {
    languageSubtag,
    scriptSubtag,
    regionSubtag,
    variantSubtag,
    privateUseSubtag,
    otherSubtags,
  } as ITagParts;
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
  const isUnlistedLanguage = codeMatches(
    languageSubtag,
    UNLISTED_LANGUAGE_CODE
  );
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

// This is used by langtagProcessing.ts to clean the data for searching, so we can't use any searching in here
export function defaultRegionForLangTag(
  languageTag: string
): IRegion | undefined {
  // if languageTag already has a region tag in it, use that
  const { languageSubtag, scriptSubtag, regionSubtag } = splitTag(languageTag);
  if (regionSubtag) {
    return getRegionBySubtag(regionSubtag);
  }

  // Otherwise, the maximal equivalent language tag will have the region code
  // Take the most specific/relevant matching maximal tag that we are able to find
  const maximalTag =
    getMaximalLangtag(languageTag) ||
    getMaximalLangtag(`${languageSubtag}-${scriptSubtag}`) ||
    getMaximalLangtag(`${languageSubtag}`) ||
    "";

  const impliedRegionTag = splitTag(maximalTag).regionSubtag;
  if (impliedRegionTag) {
    return getRegionBySubtag(impliedRegionTag);
  }
}

export function createTagFromOrthography(orthography: IOrthography): string {
  const strippedOrthography = deepStripDemarcation(orthography);
  if (isManuallyEnteredTagLanguage(strippedOrthography.language)) {
    // This is a custom langtag the user entered by hand
    return strippedOrthography.language?.manuallyEnteredTag || "";
  }
  // If there is only one script for this language, it is implied and so extraneous in the language tag
  const scriptCode =
    strippedOrthography.language?.scripts.length === 1 &&
    codeMatches(
      strippedOrthography.script?.code,
      strippedOrthography.language.scripts[0].code
    )
      ? undefined
      : strippedOrthography.script?.code;
  return createTag({
    languageCode: strippedOrthography.language?.languageSubtag,
    scriptCode,
    regionCode: strippedOrthography.customDetails?.region?.code,
    dialectCode: strippedOrthography.customDetails?.dialect,
  });
}

export function defaultDisplayName(language?: ILanguage, script?: IScript) {
  if (
    !language ||
    isUnlistedLanguage(language) ||
    isManuallyEnteredTagLanguage(language)
  ) {
    return undefined;
  }

  return stripDemarcation(
    script?.languageNameInScript || language.autonym || language.exonym
  );
}
