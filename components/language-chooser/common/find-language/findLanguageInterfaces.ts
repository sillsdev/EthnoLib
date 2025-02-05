export interface IRegion {
  name: string;
  code: string;
}

export interface IScript {
  code: string;
  name: string;
}

export enum LanguageType {
  Ancient = "Ancient",
  Constructed = "Constructed",
  Extinct = "Extinct",
  Historical = "Historical",
  Living = "Living",
  Special = "Special",
  Unknown = "Unknown",
}

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
  isMacrolanguage?: boolean;
  languageType: LanguageType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // allow indexing by string
}
