import { ILanguage } from "@ethnolib/find-language";

interface ControllerArgs {
  onSelect: () => void;
}

export class LanguageCardController {
  constructor(language: ILanguage, { onSelect }: ControllerArgs) {
    this.language = language;
    this.onSelect = onSelect;
  }

  observer: LanguageCardObserver = new LanguageCardObserverFake();
  language: ILanguage;

  private onSelect: () => void;

  select() {
    this.observer.onSelect();
    this.onSelect();
  }

  deselect() {
    this.observer.onDeselect();
  }
}

export abstract class LanguageCardObserver {
  abstract onSelect(): void;

  abstract onDeselect(): void;
}

export class LanguageCardObserverFake extends LanguageCardObserver {
  isSelected: boolean = false;

  override onSelect(): void {
    this.isSelected = true;
  }

  override onDeselect(): void {
    this.isSelected = false;
  }
}
