// TODO rename this file

export interface IRegion {
  name: string;
  code: string;
};

export interface IScript {
  code: string;
  name: string;
};

export interface ILanguage {
  autonym: string | undefined;
  exonym: string;
  code: string; // ISO 639-3
  regionNames: "";
  names: [];
  scripts: IScript[];
  variants?: string; // comma-joined
  alternativeTags: string[];
  isForMacrolanguageDisambiguation?: boolean;
  isMacrolanguage?: boolean;
};
