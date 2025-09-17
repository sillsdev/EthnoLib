import { IScript } from "@ethnolib/find-language";
import { Field } from "@ethnolib/state-management-core";
import { Selectable } from "../selectable";

interface ViewModelArgs {
  onSelect?: (isSelected: boolean) => void;
}

export class ScriptCardViewModel implements Selectable {
  constructor(script: IScript, { onSelect }: ViewModelArgs = {}) {
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
