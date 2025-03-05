import {
  codeMatches,
  createTag,
  deepStripDemarcation,
  getLanguageBySubtag,
  getMaximalLangtag,
  getRegionBySubtag,
  getScriptForLanguage,
  ILanguage,
  IRegion,
  IScript,
  LanguageType,
} from "@ethnolib/find-language";
import { FuseResult } from "fuse.js";

const UNLISTED_LANGUAGE_CODE = "qaa";
export const UNLISTED_LANGUAGE = {
  iso639_3_code: UNLISTED_LANGUAGE_CODE,
  languageSubtag: UNLISTED_LANGUAGE_CODE,
  autonym: undefined,
  exonym: "Unknown Language",
  regionNames: "",
  scripts: [],
  alternativeTags: [],
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
    regionNames: "",
    scripts: [],
    alternativeTags: [],
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

export interface ICustomizableLanguageDetails {
  customDisplayName?: string;
  region?: IRegion;
  dialect?: string;
}

export interface IOrthography {
  language?: ILanguage;
  script?: IScript;
  customDetails?: ICustomizableLanguageDetails;
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
      strippedOrthography.script?.scriptCode,
      strippedOrthography.language.scripts[0].scriptCode
    )
      ? undefined
      : strippedOrthography.script?.scriptCode;
  return createTag({
    languageCode: strippedOrthography.language?.languageSubtag,
    scriptCode,
    regionCode: strippedOrthography.customDetails?.region?.code,
    dialectCode: strippedOrthography.customDetails?.dialect,
  });
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
    results: FuseResult<ILanguage>[],
    searchString: string
  ) => ILanguage[]
): IOrthography | undefined {
  const parts = languageTag.split(/-[xX]-/);
  const privateUseSubtag = parts[1];
  const mainTag = parts[0];
  const subtags = mainTag.split("-");
  const languageSubtag = subtags.shift();
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
  const regionSubtag = subtags.find((s) => /^[a-zA-Z]{2}$|^[0-9]{3}$/.test(s));
  const region = getRegionBySubtag(regionSubtag || "");

  // If we received a region code but were unable to map it to a ISO 3166-1 region code, this is a tag requiring manual entry
  if (regionSubtag && !region) {
    console.log("langtag parsing found unexpected region tag", regionSubtag);
    return undefined;
  }

  const scriptRegex = /^[a-zA-Z]{4}$/;
  let script: IScript | undefined = undefined;

  // First, check if there is an explicit script subtag
  let scriptSubtag = subtags.find((s) => scriptRegex.test(s));
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
    scriptSubtag = maximalTag
      .split(/-[xX]-/)[0]
      .split("-")
      .find((s) => scriptRegex.test(s));
    script = getScriptForLanguage(scriptSubtag || "", language);
  }

  // if the langtag has subtags (excluding private use section) that are not the language, script, or region tags,
  // this must be a tag requiring manual entry
  if (
    subtags.some(
      (s) => ![languageSubtag, scriptSubtag, regionSubtag].includes(s)
    )
  ) {
    console.log("langtag parsing found unexpected subtags", subtags);
    return undefined;
  }

  const variantSubtag = subtags.find((s) =>
    /^[0-9][a-zA-Z0-9]{3}$|^[a-zA-Z0-9]{5,8}$/.test(s)
  );
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

export function defaultRegionForLangTag(
  languageTag: string,
  searchResultModifier?: (
    results: FuseResult<ILanguage>[],
    searchString: string
  ) => ILanguage[]
): IRegion | undefined {
  // if languageTag already has a region tag in it, use that
  const orthography = parseLangtagFromLangChooser(
    languageTag,
    searchResultModifier
  );
  if (orthography?.customDetails?.region) {
    return orthography.customDetails.region;
  }

  // Otherwise, the maximal equivalent language tag will have the region code
  const languageSubtag = orthography?.language?.languageSubtag;
  const scriptSubtag = orthography?.script?.scriptCode;

  // Take the most specific/relevant matching maximal tag that we are able to find
  const maximalTag =
    getMaximalLangtag(languageTag) ||
    getMaximalLangtag(`${languageSubtag}-${scriptSubtag}`) ||
    getMaximalLangtag(`${languageSubtag}`) ||
    "";
  const maximalTagOrthography = parseLangtagFromLangChooser(
    maximalTag,
    searchResultModifier
  );
  return maximalTagOrthography?.customDetails?.region;
}
