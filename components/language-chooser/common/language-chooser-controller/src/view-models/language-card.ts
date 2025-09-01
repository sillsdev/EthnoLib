import { ILanguage } from "@ethnolib/find-language";
import { Field, ViewModel } from "../state-management";
import { Selectable } from "../selectable";

interface ViewModelArgs {
  onSelect?: (isSelected: boolean) => void;
}

export class LanguageCardViewModel extends ViewModel implements Selectable {
  constructor(language: ILanguage, { onSelect }: ViewModelArgs = {}) {
    super();
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
