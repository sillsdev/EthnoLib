import { ILanguage } from "@ethnolib/find-language";
import { ScriptCardViewModel } from "./script-card";
import { Field, ViewModel } from "../state-management";
import { Selectable, selectItem } from "../selectable";

interface ControllerArgs {
  onSelect?: () => void;
}

export class LanguageCardViewModel extends ViewModel implements Selectable {
  constructor(language: ILanguage, { onSelect }: ControllerArgs = {}) {
    super();
    this.language = new Field(language);

    this.isSelected = new Field(false, (isSelected) => {
      if (isSelected && onSelect) {
        onSelect();
      }
      return isSelected;
    });

    this.scripts = language.scripts.map(
      (script, i) =>
        new ScriptCardViewModel(script, {
          onSelect: () => {
            selectItem(i, this.scripts);
          },
        })
    );
  }

  isSelected: Field<boolean>;
  language: Field<ILanguage>;
  scripts: ScriptCardViewModel[];
}
