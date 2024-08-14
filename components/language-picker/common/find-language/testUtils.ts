import { ILanguage } from "./findLanguageInterfaces";

interface ILanguageTestEntry {
  autonym?: string;
  exonym?: string;
  iso639_3_code?: string;
  displayCode?: string;
  regionNames?: string;
  names?: string[];
  scripts?: any[];
  variants?: string;
  alternativeTags?: string[];
}

export function createTestLanguageEntry(
  languageSpecifications: ILanguageTestEntry
): ILanguage {
  return {
    autonym: undefined,
    exonym: "",
    iso639_3_code: "",
    displayCode: "",
    regionNames: "",
    names: [],
    scripts: [],
    variants: "",
    alternativeTags: [],
    ...languageSpecifications,
  } as ILanguage;
}
