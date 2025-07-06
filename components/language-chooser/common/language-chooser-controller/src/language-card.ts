import { ILanguage } from "@ethnolib/find-language";
import { no_op } from "./utils";
import { ScriptCardController } from "./script-card";

interface ControllerArgs {
  onSelect?: () => void;
}

export class LanguageCardController {
  constructor(language: ILanguage, { onSelect }: ControllerArgs = {}) {
    this.language = language;
    this.onSelect = onSelect ?? no_op;
    this.scripts = language.scripts.map(
      (script, i) =>
        new ScriptCardController(script, {
          onSelect: () => {
            this.selectScript(i);
          },
        })
    );
  }

  observer: LanguageCardObserver = new LanguageCardObserverFake();
  language: ILanguage;
  scripts: ScriptCardController[];

  private onSelect: () => void;
  private isSelected = false;

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

  private selectScript(index: number) {
    this.scripts.forEach((script, i) => {
      if (i !== index) {
        script.deselect();
      }
    });
  }
}

export interface LanguageCardObserver {
  onSelect(): void;
  onDeselect(): void;
}

export class LanguageCardObserverFake implements LanguageCardObserver {
  isSelected: boolean = false;

  onSelect(): void {
    this.isSelected = true;
  }

  onDeselect(): void {
    this.isSelected = false;
  }
}
