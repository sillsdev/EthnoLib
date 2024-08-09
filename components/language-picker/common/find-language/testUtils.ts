import { ILanguage } from "./dataHolderTypes";

export function testLanguageEntry(languageSpecifications: any): ILanguage {
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
