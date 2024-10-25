import {
  codeMatches,
  createTag,
  getLanguageBySubtag,
  getMaximalLangtag,
  getRegionBySubtag,
  getScriptBySubtag,
  ILanguage,
  IRegion,
  IScript,
} from "@ethnolib/find-language";

const UNLISTED_LANGUAGE_CODE = "qaa";
export const UNLISTED_LANGUAGE = {
  iso639_3_code: UNLISTED_LANGUAGE_CODE,
  languageSubtag: UNLISTED_LANGUAGE_CODE,
  autonym: undefined,
  exonym: "Unknown Language",
  regionNames: "",
  scripts: [],
  alternativeTags: [],
  names: [],
} as ILanguage;
export function isUnlistedLanguage(selectedLanguage: ILanguage) {
  return codeMatches(selectedLanguage.iso639_3_code, UNLISTED_LANGUAGE_CODE);
}

export interface ICustomizableLanguageDetails {
  displayName?: string;
  region?: IRegion;
  dialect?: string;
}

export interface IOrthography {
  language?: ILanguage;
  script?: IScript;
  customDetails?: ICustomizableLanguageDetails;
}

export function createTagFromOrthography(orthography: IOrthography) {
  return createTag({
    languageCode: orthography.language?.languageSubtag,
    scriptCode: orthography.script?.code,
    regionCode: orthography.customDetails?.region?.code,
    dialectCode: orthography.customDetails?.dialect,
  });
}

// We don't want to export this outside of the language-chooser-react-hook package
// because it is not a comprehensive langtag parser. It's just built to handle the
// langtags output by the language chooser and the libPalasso language picker that
// was in BloomDesktop. The languageTag must be the default language subtag for
// that language (the first part of the "tag" field of langtags.json), which may
// be a 2-letter code even if an equivalent ISO 639-3 code exists. We also may not
// correctly handle other BCP-47 langtag corner cases, e.g. irregular codes,
// extension codes, langtags with both macrolanguage code and language code
export function parseLangtagForLangChooser(
  languageTag: string // must be the default language subtag for the language
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
    language = getLanguageBySubtag(languageSubtag || "");
  }
  if (!language) {
    return undefined;
  }
  const regionSubtag = subtags.find((s) => /^[a-zA-Z]{2}$|^[0-9]{3}$/.test(s));
  const region = getRegionBySubtag(regionSubtag || "");

  const scriptRegex = /^[a-zA-Z]{4}$/;
  let script = undefined;
  // First, check if there is an explicit script subtag
  let scriptSubtag = subtags.find((s) => scriptRegex.test(s));
  // Next, if this language only has one script, use that script
  if (!scriptSubtag && language.scripts.length === 1) {
    script = language.scripts[0];
  }
  // Otherwise, the script is implied, look for the equivalent maximal tag, which will have a script subtag explicit.
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
  }
  if (scriptSubtag && !script) {
    script = getScriptBySubtag(scriptSubtag);
  }

  const variantSubtag = subtags.find((s) =>
    /^[0-9][a-zA-Z0-9]{3}$|^[a-zA-Z0-9]{5,8}$/.test(s)
  );
  return {
    language,
    script,
    customDetails: {
      displayName: undefined,
      region,
      // TODO future work: improve handling if we get both. Currently, we should not be getting variantSubtags.
      dialect: privateUseSubtag || variantSubtag,
    } as ICustomizableLanguageDetails,
  } as IOrthography;
}
