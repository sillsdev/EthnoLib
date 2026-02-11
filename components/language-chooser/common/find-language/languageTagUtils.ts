import equivalentTags from "./language-data/equivalentTags.json" with { type: "json" };
import {
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
import { getRegionBySubtag } from "./regionsAndScripts";

// Keys are lower cased - lazily initialized to avoid side effects on import
let shortPreferredTagLookup: Map<string, string> | null = null;
let maximalTagLookup: Map<string, string> | null = null;
let tagsetLookup: Map<
  string,
  { shortest: string; maximal: string; allTags: string[] }
> | null = null;

function initializeLookupMaps(): void {
  if (shortPreferredTagLookup && maximalTagLookup && tagsetLookup) {
    return; // Already initialized
  }

  shortPreferredTagLookup = new Map<string, string>();
  maximalTagLookup = new Map<string, string>();
  tagsetLookup = new Map<
    string,
    { shortest: string; maximal: string; allTags: string[] }
  >();

  for (const tagset of equivalentTags) {
    for (const tag of tagset.allTags) {
      shortPreferredTagLookup.set(tag.toLowerCase(), tagset.shortest);
      maximalTagLookup.set(tag.toLowerCase(), tagset.maximal);
      tagsetLookup.set(tag.toLowerCase(), tagset);
    }
  }
}

function getShortPreferredTagLookup(): Map<string, string> {
  initializeLookupMaps();
  return shortPreferredTagLookup!;
}

function getMaximalTagLookup(): Map<string, string> {
  initializeLookupMaps();
  return maximalTagLookup!;
}

function getTagsetLookup(): Map<
  string,
  { shortest: string; maximal: string; allTags: string[] }
> {
  initializeLookupMaps();
  return tagsetLookup!;
}

// case insensitive on input. Tries to find a shorter (or the same) equivalent in the language data
// loaded from langtags.txt.  If the input tag has a private use variant (starts with -x-), then it
// removes the private use variant from what is looked up and restores the variant to what is found.
// Returns undefined if the langtag (without any private use variant) is not in langtags.txt and so
// equivalents cannot be looked up.
export function getShortestSufficientLangtag(
  langtag: string
): string | undefined {
  const lookup = getShortPreferredTagLookup();
  const shorter = lookup.get(langtag.toLowerCase());
  if (!shorter && langtag.includes("-x-")) {
    // try to shorten the langtag before the private use section
    const parts = langtag.split("-x-");
    const preferredTag = lookup.get(parts[0].toLowerCase());
    if (preferredTag) {
      // If we found a preferred tag, return it with the private use section intact
      return `${preferredTag}-x-${parts.slice(1).join("-x-")}`;
    }
  }
  return shorter;
}

// Like getShortestSufficientLangtag, but avoids changing the primary language subtag.
// This matters for macrolanguage-equivalent tags (e.g. uzn ≈ uz) where we want to preserve
// the specific language the user selected.
function getShortestSufficientLangtagPreservingLanguageSubtag(
  langtag: string,
  desiredLanguageSubtag: string
): string | undefined {
  const desired = desiredLanguageSubtag.toLowerCase();
  const [baseTag, ...privateUseParts] = langtag.split(/-[xX]-/);
  const privateUseSuffix = privateUseParts.length
    ? `-x-${privateUseParts.join("-x-")}`
    : "";

  const tagset = getTagsetLookup().get(baseTag.toLowerCase());
  if (!tagset) {
    return undefined;
  }

  // Prefer the shortest equivalent that keeps the same primary language subtag.
  // Use string length as a cheap proxy for "shortest".
  const candidates = tagset.allTags
    .filter((t) => splitTag(t).languageSubtag?.toLowerCase() === desired)
    .sort((a, b) => a.length - b.length);

  const best = candidates[0];
  return best ? `${best}${privateUseSuffix}` : undefined;
}

function createTagUnshortened({
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
  const normalizedDialectCode = formatDialectCode(dialectCode);
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
  if (!languageCode || normalizedDialectCode) {
    tag += "-x-";
  }
  // Dialect code is normalized to BCP-47 private use constraints
  if (normalizedDialectCode) {
    tag += `${normalizedDialectCode}`;
  }
  return tag;
}

// case insensitive. Returns undefined if langtag is not in langtags.txt and so equivalents cannot be looked up
export function getMaximalLangtag(langtag: string): string | undefined {
  const lookup = getMaximalTagLookup();
  return lookup.get(langtag.toLowerCase());
}

// This is pretty naive. Exported for unit testing, but most situations should use createTagFromOrthography instead
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
  const tag = createTagUnshortened({
    languageCode,
    scriptCode,
    regionCode,
    dialectCode,
  });
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

/// Returns a code for use in the Private Use section of a BCP 47 tag,
/// made up of strings of up to 8 alphanumeric characters, separated by hyphens.
/// Removes non-alphanumeric characters (other than hyphens) and truncates each section to 8 characters
/// Enhance: we could further enforce BCP-47 rules, e.g. minimum length of each section
/// see https://www.rfc-editor.org/rfc/bcp/bcp47.txt
export function formatDialectCode(dialect?: string): string {
  if (!dialect) return "";
  return dialect
    .split("-")
    .map((s) => {
      const alphanumeric = s.replace(/[^a-zA-Z0-9]/g, "");
      return alphanumeric.slice(0, 8);
    })
    .filter((s) => s.length > 0)
    .join("-");
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
  // return createTag({
  //   languageCode: strippedOrthography.language?.languageSubtag,
  //   scriptCode,
  //   regionCode: strippedOrthography.customDetails?.region?.code,
  //   dialectCode: formatDialectCode(strippedOrthography.customDetails?.dialect),
  // });

  const languageCode = strippedOrthography.language?.languageSubtag;
  const unshortened = createTagUnshortened({
    languageCode,
    scriptCode,
    regionCode: strippedOrthography.customDetails?.region?.code,
    dialectCode: formatDialectCode(strippedOrthography.customDetails?.dialect),
  });

  // Important: do not shorten in a way that changes the primary language subtag.
  // (For example, uzn is canonically equivalent to uz in langtags.txt.)
  return (
    (languageCode
      ? getShortestSufficientLangtagPreservingLanguageSubtag(
          unshortened,
          languageCode
        )
      : undefined) ||
    getShortestSufficientLangtag(unshortened) ||
    unshortened
  );
}

export function defaultDisplayName(
  language?: ILanguage,
  script?: IScript
): string {
  if (
    !language ||
    isUnlistedLanguage(language) ||
    isManuallyEnteredTagLanguage(language)
  ) {
    return "";
  }

  return (
    stripDemarcation(
      script?.languageNameInScript || language.autonym || language.exonym
    ) ?? ""
  );
}
