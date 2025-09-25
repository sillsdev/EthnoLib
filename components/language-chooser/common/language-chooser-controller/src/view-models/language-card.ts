import { ILanguage } from "@ethnolib/find-language";
import { Field } from "@ethnolib/state-management-core";
import { Selectable } from "../selectable";
import { LanguageChooserTranslations } from "./translations";

interface ViewModelArgs {
  onSelect?: (isSelected: boolean) => void;
  translations: LanguageChooserTranslations;
}

export class LanguageCardViewModel implements Selectable {
  constructor(language: ILanguage, { onSelect, translations }: ViewModelArgs) {
    this.language = language;

    this.title = language.autonym ?? language.exonym;

    if (language.autonym && language.autonym !== language.exonym) {
      this.secondTitle = language.exonym;
    }

    if (language.regionNamesForDisplay || language.isMacrolanguage) {
      this.description = language.isMacrolanguage
        ? language.regionNamesForDisplay
          ? translations.macrolanguageOfRegionLabel(
              language.regionNamesForDisplay
            )
          : translations.macrolanguageLabel
        : translations.languageOfRegionLabel(language.regionNamesForDisplay);
    }

    this.isSelected = new Field(false, (isSelected) => {
      if (onSelect) {
        onSelect(isSelected);
      }
    });
  }

  readonly language: ILanguage;

  // Display data
  readonly title: string;
  readonly secondTitle?: string;
  readonly description?: string;

  readonly isSelected: Field<boolean>;
}
