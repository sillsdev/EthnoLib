import { IScript } from "@ethnolib/find-language";
import { no_op } from "./utils";

interface ControllerArgs {
  onSelect?: () => void;
}

export class ScriptCardController {
  constructor(script: IScript, { onSelect }: ControllerArgs = {}) {
    this.script = script;
    this.onSelect = onSelect ?? no_op;
  }

  script: IScript;
  observer: ScriptCardObserver = new ScriptCardObserverFake();
  onSelect: () => void;

  private isSelected: boolean = false;

  toggleSelect() {
    if (this.isSelected) {
      this.deselect();
    } else {
      this.observer.onSelect();
      this.onSelect();
    }
    this.isSelected = !this.isSelected;
  }

  deselect() {
    this.observer.onDeselect();
  }
}

export interface ScriptCardObserver {
  onSelect(): void;
  onDeselect(): void;
}

export class ScriptCardObserverFake implements ScriptCardObserver {
  isSelected: boolean = false;

  onSelect(): void {
    this.isSelected = true;
  }

  onDeselect(): void {
    this.isSelected = false;
  }
}
