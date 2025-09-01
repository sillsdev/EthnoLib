import { IScript } from "@ethnolib/find-language";
import { Field, ViewModel } from "@ethnolib/state-management-core";
import { Selectable } from "../selectable";

interface ViewModelArgs {
  onSelect?: (isSelected: boolean) => void;
}

export class ScriptCardViewModel extends ViewModel implements Selectable {
  constructor(script: IScript, { onSelect }: ViewModelArgs = {}) {
    super();
    this.script = script;

    this.isSelected = new Field(false, (isSelected) => {
      if (onSelect) {
        onSelect(isSelected);
      }
    });
  }

  readonly script: IScript;
  readonly isSelected: Field<boolean>;
}
