import { ILanguage } from "@ethnolib/find-language";
import { Field, ViewModel } from "../state-management";
import { Selectable } from "../selectable";

interface ControllerArgs {
  onSelect?: () => void;
}

export class LanguageCardViewModel extends ViewModel implements Selectable {
  constructor(language: ILanguage, { onSelect }: ControllerArgs = {}) {
    super();
    this.language = language;

    this.isSelected = new Field(false, (isSelected) => {
      if (isSelected && onSelect) {
        onSelect();
      }
      return isSelected;
    });
  }

  readonly language: ILanguage;
  readonly isSelected: Field<boolean>;
}
