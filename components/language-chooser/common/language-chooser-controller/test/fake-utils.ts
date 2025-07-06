import { ILanguage, IScript, LanguageType } from "@ethnolib/find-language";

interface FakeLanguageParams {
  scriptCount?: number;
}

export function fakeLanguage({
  scriptCount,
}: FakeLanguageParams = {}): ILanguage {
  return {
    exonym: "",
    iso639_3_code: "",
    languageSubtag: "",
    regionNamesForDisplay: "",
    regionNamesForSearch: [],
    names: [],
    scripts: Array.from({ length: scriptCount ?? 0 }, () => fakeScript()),
    alternativeTags: [],
    isMacrolanguage: false,
    languageType: LanguageType.Ancient,
  };
}

export function fakeLanguages(count: number): ILanguage[] {
  return Array.from({ length: count }, () => fakeLanguage());
}

export function fakeScript(): IScript {
  return {
    code: "",
    name: "",
  };
}
