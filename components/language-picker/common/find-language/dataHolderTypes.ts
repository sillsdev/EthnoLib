// TODO rename this file

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
  code: string; // ISO 639-3
  regionNames: string;
  names: string[];
  scripts: IScript[];
  variants?: string; // comma-joined
  alternativeTags: string[];
  isForMacrolanguageDisambiguation?: boolean;
  isMacrolanguage?: boolean;
  [key: string]: any; // allow indexing by string
}
