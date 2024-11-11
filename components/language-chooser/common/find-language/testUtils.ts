import { ILanguage, IScript } from "./findLanguageInterfaces";

interface ILanguageTestEntry {
  autonym?: string;
  exonym?: string;
  iso639_3_code?: string;
  languageSubtag?: string;
  regionNames?: string;
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
    regionNames: "",
    names: [],
    scripts: [],
    variants: "",
    alternativeTags: [],
    ...languageSpecifications,
  } as ILanguage;
}
