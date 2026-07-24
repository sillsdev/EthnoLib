export interface IRegion {
  name: string;
  code: string;
}

export interface IScript {
  code: string;
  name: string;
  isRtl?: boolean;
  languageNameInScript?: string;
}

export enum LanguageType {
  Ancient = "Ancient",
  Constructed = "Constructed",
  Extinct = "Extinct",
  Historical = "Historical",
  Living = "Living",
  Special = "Special",
  Unknown = "Unknown",
  Custom = "Custom", // For special situation/user-entered languages that are not in langtags
}

export interface ILanguage {
  autonym?: string;
  exonym: string;
  iso639_3_code: string; // ISO 639-3 code
  languageSubtag: string; // BCP-47 canonical code, except for representative languages where the canonical code is actually the macrolanguage code, in which case we use a specifically individual language code instead
  regionNamesForDisplay: string; // For macrolanguages, we display a region but don't want the macrolanguage to come up in searches for that region
  regionNamesForSearch: string[];
  names: string[];
  scripts: IScript[];
  variants?: string; // comma-joined
  alternativeTags: string[];
  isMacrolanguage: boolean;
  // The macrolanguage which includes this individual language, if applicable.
  // As of March 2025, the parentMacrolanguage lacks scripts and other data, we put just enough info to facilitate searching
  parentMacrolanguage?: ILanguage;
  // This is an individual language which the parent macrolanguage code is sometimes used to represent. See macrolanguageNotes.md
  // If isMacrolanguage and isRepresentativeForMacrolanguage are both true, this language is an anomalous case which probably needs special handling
  isRepresentativeForMacrolanguage?: boolean;
  languageType: LanguageType;
  // This field should only be used for a language that was manually entered, i.e. the full langtag is not in langtags.json
  manuallyEnteredTag?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // allow indexing by string
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

// Intl.Locale takes in a bcp47 tag, but here we are giving it
// the tag und-{insert script code}, where the und means no
// specified language, so that the rtl attribute will be based
// solely on the selected script. If you give the full tag generated
// by createTagFromOrthography, and use .maximizeSince to get the
// most possible values, then you can actually end up with the wrong
// rtl attribute. For example, if you were to choose the Uzbek langauge
// and the country Afghanistan, you would get the tag uz-AF. You can
// specify the Latin script for this combination, but looking up the script
// uz-AF can create a mismatch between Arabic(RTL) and Latin(LTR), since the
// .maximize will return the Arabic script for uz-AF. We always want the
// isRtl setting to match its IScript in every case, which can accomplish
// with und-{script}.
export function isRTLScript(scriptCode: string): boolean {
  try {
    const locale = new Intl.Locale(`und-${scriptCode}`);
    // getTextInfo is the standardized property; textInfo is the older name
    const info = locale.getTextInfo?.() ?? (locale as any).textInfo;
    return info?.direction === "rtl";
  } catch {
    // An unrecognized/malformed script code makes Intl.Locale throw. Such a
    // script has no known RTL direction, so treat it as not RTL.
    return false;
  }
}
