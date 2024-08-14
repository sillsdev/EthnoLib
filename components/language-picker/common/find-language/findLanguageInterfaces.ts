export interface IRegion {
  name: string;
  code: string;
}

export interface IScript {
  code: string;
  name: string;
}

export interface ILanguage {
  autonym?: string;
  exonym: string;
  iso639_3_code: string; // ISO 639-3 code
  displayCode: string; // BCP-47 canonical code
  regionNames: string;
  names: string[];
  scripts: IScript[];
  variants?: string; // comma-joined
  alternativeTags: string[];
  isForMacrolanguageDisambiguation?: boolean;
  isMacrolanguage?: boolean;
  [key: string]: any; // allow indexing by string
}
