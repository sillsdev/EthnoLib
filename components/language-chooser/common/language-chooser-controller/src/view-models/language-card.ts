import { ILanguage } from "@ethnolib/find-language";
import { Field } from "@ethnolib/state-management-core";
import { Selectable } from "../selectable";

interface ViewModelArgs {
  onSelect?: (isSelected: boolean) => void;
}

export class LanguageCardViewModel implements Selectable {
  constructor(language: ILanguage, { onSelect }: ViewModelArgs = {}) {
    this.language = language;

    this.isSelected = new Field(false, (isSelected) => {
      if (onSelect) {
        onSelect(isSelected);
      }
    });
  }

  readonly language: ILanguage;
  readonly isSelected: Field<boolean>;
}
