import { ILanguage, IScript, LanguageType } from "./findLanguageInterfaces";

interface ILanguageTestEntry {
  autonym?: string;
  exonym?: string;
  iso639_3_code?: string;
  languageSubtag?: string;
  regionNamesForDisplay?: string;
  regionNamesForSearch?: string[];
  names?: string[];
  scripts?: IScript[];
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
    languageSubtag: "",
    regionNamesForDisplay: "",
    regionNamesForSearch: [],
    names: [],
    scripts: [],
    variants: "",
    alternativeTags: [],
    languageType: LanguageType.Living,
    ...languageSpecifications,
  } as ILanguage;
}
