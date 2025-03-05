export interface IRegion {
  name: string;
  code: string;
}

export interface IScript {
  scriptCode: string;
  scriptName: string;
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

export const MACROLANGUAGE_SITUATION_UNKNOWN = "unknown";

export interface ILanguage {
  autonym?: string;
  exonym: string;
  iso639_3_code: string; // ISO 639-3 code
  languageSubtag: string; // BCP-47 canonical code
  regionNames: string;
  names: string[];
  scripts: IScript[];
  variants?: string; // comma-joined
  alternativeTags: string[];
  // The macrolanguage for which this language is the representative language.
  // If this is from a macrolanguage entry which we were unable to map to a representative language, value will be
  // MACROLANGUAGE_SITUATION_UNKNOWN and desired behavior should be handled by search result modifiers.
  // See macrolanguageNotes.md
  aliasMacrolanguage?: string;
  languageType: LanguageType;
  // This field should only be used for a language that was manually entered, i.e. the full langtag is not in langtags.json
  manuallyEnteredTag?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // allow indexing by string
}
