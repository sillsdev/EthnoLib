import { IScript } from "@ethnolib/find-language";
import { Field, ViewModel } from "../state-management";
import { Selectable } from "../selectable";

interface ViewModelArgs {
  onSelect?: () => void;
}

export class ScriptCardViewModel extends ViewModel implements Selectable {
  constructor(script: IScript, { onSelect }: ViewModelArgs = {}) {
    super();
    this.script = script;

    this.isSelected = new Field(false, (isSelected) => {
      if (isSelected && onSelect) {
        onSelect();
      }
      return isSelected;
    });
  }

  readonly script: IScript;
  readonly isSelected: Field<boolean>;
}
