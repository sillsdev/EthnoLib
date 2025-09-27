import { ILanguage } from "@ethnolib/find-language";
import { Field } from "@ethnolib/state-management-core";

interface ViewModelArgs {
  onSelect?: (isSelected: boolean) => void;
}

export type LanguageCardViewModel = ReturnType<
  typeof useLanguageChardViewModel
>;

export function useLanguageChardViewModel(
  language: ILanguage,
  { onSelect }: ViewModelArgs = {}
) {
  const isSelected = new Field(false, (isSelected) => {
    if (onSelect) {
      onSelect(isSelected);
    }
  });

  const title = language.autonym ?? language.exonym;

  const secondTitle =
    language.autonym && language.autonym !== language.exonym
      ? language.exonym
      : undefined;

  function description(
    translations: {
      macrolanguageLabel: string;
      macrolanguageOfRegionLabel: (regions: string) => string;
      languageOfRegionLabel: (regions: string) => string;
    } = {
      macrolanguageLabel: "A macrolanguage",
      macrolanguageOfRegionLabel: (regions) => `A macrolanguage of ${regions}`,
      languageOfRegionLabel: (regions: string) => `A language of ${regions}`,
    }
  ) {
    return language.regionNamesForDisplay || language.isMacrolanguage
      ? language.isMacrolanguage
        ? language.regionNamesForDisplay
          ? translations.macrolanguageOfRegionLabel(
              language.regionNamesForDisplay
            )
          : translations.macrolanguageLabel
        : translations.languageOfRegionLabel(language.regionNamesForDisplay)
      : undefined;
  }

  return { language, isSelected, title, secondTitle, description };
}
