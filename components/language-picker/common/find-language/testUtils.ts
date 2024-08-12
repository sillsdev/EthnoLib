import { ILanguage } from "./findLanguageInterfaces";

interface ILanguageTestEntry {
  autonym?: string;
  exonym?: string;
  code?: string;
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
    code: "",
    regionNames: "",
    names: [],
    scripts: [],
    variants: "",
    alternativeTags: [],
    ...languageSpecifications,
  } as ILanguage;
}
