export interface IRegion {
  name: string;
  code: string;
}

export interface IScript {
  code: string;
  name: string;
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
