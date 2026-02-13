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

// Test data may be truncated or simplified

// Common test data for representative languages
export const NORTHERN_UZBEK_LANGUAGE: ILanguage = {
  iso639_3_code: "uzn",
  languageSubtag: "uzn",
  isRepresentativeForMacrolanguage: true,
  isMacrolanguage: false,
  exonym: "Northern Uzbek",
  scripts: [
    { code: "Cyrl", name: "Cyrillic" },
    { code: "Latn", name: "Latin" },
  ],
  regionNamesForDisplay: "",
  regionNamesForSearch: [],
  names: [],
  alternativeTags: ["uz", "uz-Latn"],
  languageType: LanguageType.Living,
} as ILanguage;

export const STANDARD_ARABIC_LANGUAGE: ILanguage = {
  iso639_3_code: "arb",
  languageSubtag: "arb",
  isRepresentativeForMacrolanguage: true,
  isMacrolanguage: false,
  exonym: "Standard Arabic",
  scripts: [{ code: "Arab", name: "Arabic" }],
  regionNamesForDisplay: "",
  regionNamesForSearch: [],
  names: [],
  alternativeTags: [
    "ar",
    "ar-Arab-EG",
    "ar-Arab",
    "ar-EG",
    "ar-Arab-AE",
    "ar-arb-Brai-SA",
    "arb-Brai",
    "ar",
  ],
  languageType: LanguageType.Living,
} as ILanguage;

export const ENGLISH_LANGUAGE: ILanguage = {
  iso639_3_code: "eng",
  languageSubtag: "en",
  isRepresentativeForMacrolanguage: false,
  isMacrolanguage: false,
  exonym: "English",
  scripts: [{ code: "Latn", name: "Latin" }],
  regionNamesForDisplay: "",
  regionNamesForSearch: [],
  names: [],
  alternativeTags: [],
  languageType: LanguageType.Living,
} as ILanguage;

// Macrolanguages with preferred code (both isMacrolanguage and isRepresentativeForMacrolanguage)
export const NORWEGIAN_MACROLANGUAGE: ILanguage = {
  autonym: "Norsk",
  exonym: "Norwegian",
  iso639_3_code: "nor",
  languageSubtag: "no",
  regionNamesForSearch: ["Norway", "World"],
  regionNamesForDisplay: "Norway, World",
  scripts: [
    { code: "Latn", name: "Latin", languageNameInScript: "Norsk" },
    { code: "Brai", name: "Braille" },
    { code: "Runr", name: "Runic" },
  ],
  names: ["norsk"],
  alternativeTags: [
    "no",
    "no-Latn-NO",
    "no-Latn",
    "no-NO",
    "no-Brai-NO",
    "no-Runr-001",
    "no-001",
  ],
  isMacrolanguage: true,
  isRepresentativeForMacrolanguage: true,
  languageType: LanguageType.Living,
} as ILanguage;

export const SERBO_CROATIAN_MACROLANGUAGE: ILanguage = {
  exonym: "Serbo-Croatian",
  iso639_3_code: "hbs",
  languageSubtag: "sh",
  regionNamesForSearch: ["Serbia"],
  regionNamesForDisplay: "Serbia",
  scripts: [{ code: "Latn", name: "Latin" }],
  names: [],
  alternativeTags: ["sh", "sh-Latn-RS", "sh-Latn", "sh-RS"],
  isMacrolanguage: true,
  isRepresentativeForMacrolanguage: true,
  languageType: LanguageType.Living,
} as ILanguage;

export const SANSKRIT_LANGUAGE: ILanguage = {
  autonym: "संस्कृतम्",
  exonym: "Sanskrit",
  iso639_3_code: "san",
  languageSubtag: "sa",
  regionNamesForSearch: ["India"],
  regionNamesForDisplay: "India",
  scripts: [
    {
      code: "Deva",
      name: "Devanagari (Nagari)",
      languageNameInScript: "संस्कृतम्",
    },
    { code: "Bhks", name: "Bhaiksuki" },
    { code: "Gran", name: "Grantha" },
    { code: "Kawi", name: "Kawi" },
    { code: "Khar", name: "Kharoshthi" },
    { code: "Latn", name: "Latin" },
    { code: "Mong", name: "Mongolian" },
    { code: "Mymr", name: "Myanmar (Burmese)" },
    { code: "Nand", name: "Nandinagari" },
    { code: "Newa", name: "Newa, Newar, Newari, Nepāla lipi" },
    { code: "Shrd", name: "Sharada, Śāradā" },
    { code: "Sidd", name: "Siddham, Siddhaṃ, Siddhamātṛkā" },
    { code: "Sinh", name: "Sinhala" },
    { code: "Soyo", name: "Soyombo" },
    { code: "Tirh", name: "Tirhuta" },
  ],
  names: ["Deva Bhasha", "Deva vani", "Sanskrit bhasha", "Saṃskṛtam"],
  alternativeTags: [
    "sa",
    "sa-Deva-IN",
    "cls",
    "cls-Deva",
    "cls-Deva-IN",
    "cls-IN",
    "sa-Deva",
    "sa-IN",
    "vsn",
    "vsn-Deva",
    "vsn-Deva-IN",
    "vsn-IN",
    "sa-Bhks-IN",
    "sa-Gran-IN",
    "sa-Kawi-IN",
    "sa-Khar-IN",
    "sa-Latn-IN",
    "sa-Mong-IN",
    "sa-Mymr-IN",
    "sa-Nand-IN",
    "sa-Newa-IN",
    "sa-Shrd-IN",
    "sa-Sidd-IN",
    "sa-Sinh-IN",
    "sa-Soyo-IN",
    "sa-Tirh-IN",
  ],
  isMacrolanguage: true,
  isRepresentativeForMacrolanguage: true,
  languageType: LanguageType.Historical,
} as ILanguage;

// Pure macrolanguages (not representative for any individual language)
export const ARABIC_MACROLANGUAGE: ILanguage = {
  isMacrolanguage: true,
  iso639_3_code: "ara",
  languageSubtag: "ar",
  exonym: "Arabic",
  regionNamesForDisplay: "Egypt",
  regionNamesForSearch: [],
  names: [],
  scripts: [
    {
      name: "Arabic",
      code: "Arab",
    },
  ],
  alternativeTags: [],
  languageType: LanguageType.Living,
} as ILanguage;

export const AYMARA_MACROLANGUAGE: ILanguage = {
  isMacrolanguage: true,
  iso639_3_code: "aym",
  languageSubtag: "ay",
  exonym: "Aymara",
  regionNamesForDisplay: "Bolivia (Plurinational State of)",
  regionNamesForSearch: [],
  names: [],
  scripts: [
    {
      name: "Latin",
      code: "Latn",
    },
  ],
  alternativeTags: [],
  languageType: LanguageType.Living,
} as ILanguage;

// Anomalous languages for special handling
export const AKAN_LANGUAGE: ILanguage = {
  autonym: "Akan",
  exonym: "Akan",
  iso639_3_code: "twi",
  languageSubtag: "twi",
  regionNamesForSearch: ["Ghana"],
  regionNamesForDisplay: "Ghana",
  scripts: [
    { code: "Latn", name: "Latin", languageNameInScript: "Akan" },
    { code: "Arab", name: "Arabic" },
    { code: "Brai", name: "Braille" },
    { code: "Zzzz", name: "Code for uncoded script" },
  ],
  names: [],
  alternativeTags: [
    "ak",
    "ak-Latn-GH",
    "ak-GH",
    "ak-Latn",
    "fat",
    "fat-GH",
    "fat-Latn",
    "fat-Latn-GH",
    "tw",
    "tw-GH",
    "tw-Latn",
    "tw-Latn-GH",
    "ak-Arab-GH",
    "ak-Brai-GH",
    "tw-Brai",
    "tw-Brai-GH",
    "ak-Zzzz-GH-x-adinkra",
    "ak-GH-x-adinkra",
  ],
  parentMacrolanguage: {
    isMacrolanguage: true,
    iso639_3_code: "aka",
    languageSubtag: "ak",
    exonym: "Akan",
    regionNamesForDisplay: "Ghana",
    regionNamesForSearch: [],
    names: [],
    scripts: [{ name: "Latin", code: "Latn" }],
    alternativeTags: [],
    languageType: LanguageType.Living,
  } as ILanguage,
  isMacrolanguage: false,
  isRepresentativeForMacrolanguage: true,
  languageType: LanguageType.Living,
} as ILanguage;

export const NORWEGIAN_BOKMAL_LANGUAGE: ILanguage = {
  autonym: "norsk bokmål",
  exonym: "Norwegian Bokmål",
  iso639_3_code: "nob",
  languageSubtag: "nb",
  regionNamesForSearch: ["Norway", "Svalbard and Jan Mayen"],
  regionNamesForDisplay: "Norway, Svalbard and Jan Mayen",
  scripts: [
    { code: "Latn", name: "Latin", languageNameInScript: "norsk bokmål" },
    { code: "Brai", name: "Braille" },
  ],
  names: [],
  alternativeTags: [
    "nb",
    "nb-Latn-NO",
    "nb-Latn",
    "nb-NO",
    "nb-Brai-NO",
    "nb-Latn-SJ",
  ],
  parentMacrolanguage: {
    isMacrolanguage: true,
    iso639_3_code: "nor",
    languageSubtag: "no",
    exonym: "Norwegian",
    regionNamesForDisplay: "",
    regionNamesForSearch: [],
    names: [],
    scripts: [],
    alternativeTags: [],
    languageType: LanguageType.Living,
  } as ILanguage,
  isMacrolanguage: false,
  languageType: LanguageType.Living,
} as ILanguage;

export const NORWEGIAN_NYNORSK_LANGUAGE: ILanguage = {
  autonym: "norsk nynorsk",
  exonym: "Norwegian Nynorsk",
  iso639_3_code: "nno",
  languageSubtag: "nn",
  regionNamesForSearch: ["Norway"],
  regionNamesForDisplay: "Norway",
  scripts: [
    { code: "Latn", name: "Latin", languageNameInScript: "norsk nynorsk" },
    { code: "Brai", name: "Braille" },
  ],
  names: [],
  alternativeTags: ["nn", "nn-Latn-NO", "nn-Latn", "nn-NO", "nn-Brai-NO"],
  parentMacrolanguage: {
    isMacrolanguage: true,
    iso639_3_code: "nor",
    languageSubtag: "no",
    exonym: "Norwegian",
    regionNamesForDisplay: "",
    regionNamesForSearch: [],
    names: [],
    scripts: [],
    alternativeTags: [],
    languageType: LanguageType.Living,
  } as ILanguage,
  isMacrolanguage: false,
  languageType: LanguageType.Living,
} as ILanguage;

export const BOSNIAN_LANGUAGE: ILanguage = {
  autonym: "Bosanski jezik",
  exonym: "Bosnian",
  iso639_3_code: "bos",
  languageSubtag: "bs",
  regionNamesForSearch: ["Bosnia and Herzegovina"],
  regionNamesForDisplay: "Bosnia and Herzegovina",
  scripts: [
    { code: "Latn", name: "Latin", languageNameInScript: "Bosanski jezik" },
    { code: "Arab", name: "Arabic" },
    { code: "Brai", name: "Braille" },
    { code: "Cyrl", name: "Cyrillic", languageNameInScript: "босански" },
  ],
  names: ["Serbo-Croatian", "bosanski", "босански"],
  alternativeTags: [
    "bs",
    "bs-Latn-BA",
    "bs-BA",
    "bs-Latn",
    "bs-Arab-BA",
    "bs-Brai-BA",
    "bs-Cyrl-BA",
  ],
  parentMacrolanguage: {
    isMacrolanguage: true,
    iso639_3_code: "hbs",
    languageSubtag: "sh",
    exonym: "Serbo-Croatian",
    regionNamesForDisplay: "",
    regionNamesForSearch: [],
    names: [],
    scripts: [],
    alternativeTags: [],
    languageType: LanguageType.Living,
  } as ILanguage,
  isMacrolanguage: false,
  languageType: LanguageType.Living,
} as ILanguage;

export const MONTENEGRIN_LANGUAGE: ILanguage = {
  autonym: "црногорски",
  exonym: "Montenegrin",
  iso639_3_code: "cnr",
  languageSubtag: "cnr",
  regionNamesForSearch: ["Montenegro"],
  regionNamesForDisplay: "Montenegro",
  scripts: [
    { code: "Cyrl", name: "Cyrillic", languageNameInScript: "црногорски" },
    { code: "Latn", name: "Latin" },
  ],
  names: ["Serbo-Croatian", "Crnogorski"],
  alternativeTags: ["cnr", "cnr-Cyrl-ME", "cnr-Cyrl", "cnr-ME", "cnr-Latn-ME"],
  parentMacrolanguage: {
    isMacrolanguage: true,
    iso639_3_code: "hbs",
    languageSubtag: "sh",
    exonym: "Serbo-Croatian",
    regionNamesForDisplay: "",
    regionNamesForSearch: [],
    names: [],
    scripts: [],
    alternativeTags: [],
    languageType: LanguageType.Living,
  } as ILanguage,
  isMacrolanguage: false,
  languageType: LanguageType.Living,
} as ILanguage;

export const CROATIAN_LANGUAGE: ILanguage = {
  autonym: "Hrvatski",
  exonym: "Croatian",
  iso639_3_code: "hrv",
  languageSubtag: "hr",
  regionNamesForSearch: ["Croatia", "Bosnia and Herzegovina"],
  regionNamesForDisplay: "Croatia, Bosnia and Herzegovina",
  scripts: [
    { code: "Latn", name: "Latin", languageNameInScript: "Hrvatski" },
    { code: "Brai", name: "Braille" },
  ],
  names: ["Serbo-Croatian", "hrvatski"],
  alternativeTags: [
    "hr",
    "hr-Latn-HR",
    "hr-HR",
    "hr-Latn",
    "hr-Latn-BA",
    "hr-Brai-HR",
  ],
  parentMacrolanguage: {
    isMacrolanguage: true,
    iso639_3_code: "hbs",
    languageSubtag: "sh",
    exonym: "Serbo-Croatian",
    regionNamesForDisplay: "",
    regionNamesForSearch: [],
    names: [],
    scripts: [],
    alternativeTags: [],
    languageType: LanguageType.Living,
  } as ILanguage,
  isMacrolanguage: false,
  languageType: LanguageType.Living,
} as ILanguage;

export const SERBIAN_LANGUAGE: ILanguage = {
  autonym: "српски",
  exonym: "Serbian",
  iso639_3_code: "srp",
  languageSubtag: "sr",
  regionNamesForSearch: [
    "Serbia",
    "Bosnia and Herzegovina",
    "Montenegro",
    "Kosovo",
    "Romania",
    "Russian Federation",
    "Turkey",
  ],
  regionNamesForDisplay:
    "Serbia, Bosnia and Herzegovina, Montenegro, Kosovo, Romania, Russian Federation, Turkey",
  scripts: [
    { code: "Cyrl", name: "Cyrillic", languageNameInScript: "српски" },
    { code: "Brai", name: "Braille" },
    { code: "Glag", name: "Glagolitic" },
    { code: "Latn", name: "Latin", languageNameInScript: "srpski" },
  ],
  names: ["Montenegrin", "Serbo-Croatian", "Srpski", "srpski"],
  alternativeTags: [
    "sr",
    "sr-Cyrl-RS",
    "sr-Cyrl",
    "sr-RS",
    "sr-Cyrl-BA",
    "sr-Brai-RS",
    "sr-Cyrl-ME",
    "sr-Glag-RS",
    "sr-Latn-RS",
    "sr-Latn-BA",
    "sr-Latn-XK",
    "sr-Latn-ME",
    "sr-Latn-RO",
    "sr-Latn-RU",
    "sr-Latn-TR",
    "sr-Cyrl-XK",
  ],
  parentMacrolanguage: {
    isMacrolanguage: true,
    iso639_3_code: "hbs",
    languageSubtag: "sh",
    exonym: "Serbo-Croatian",
    regionNamesForDisplay: "",
    regionNamesForSearch: [],
    names: [],
    scripts: [],
    alternativeTags: [],
    languageType: LanguageType.Living,
  } as ILanguage,
  isMacrolanguage: false,
  languageType: LanguageType.Living,
} as ILanguage;
