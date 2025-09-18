export interface LanguageChooserTranslations {
  macrolanguageLabel: string;
  macrolanguageOfRegionLabel: (regions: string) => string;
  languageOfRegionLabel: (regions: string) => string;
}

export const defaultTranslations: LanguageChooserTranslations = {
  macrolanguageLabel: "A macrolanguage",
  macrolanguageOfRegionLabel: (regions) => `A macrolanguage of ${regions}`,
  languageOfRegionLabel: (regions: string) => `A language of ${regions}`,
};
