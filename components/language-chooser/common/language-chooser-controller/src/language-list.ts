import { ILanguage } from "@ethnolib/find-language";
import { LanguageCardController } from "./language-card";

export class LanguageListController {
  constructor(languages: ILanguage[]) {
    this.languageCards = languages.map(
      (lang, i) =>
        new LanguageCardController(lang, {
          onSelect: () => {
            this.onLanguageSelected(i);
          },
        })
    );
  }

  observer: LanguageListObserver = new LanguageListObserverFake();
  languageCards: LanguageCardController[];

  private onLanguageSelected(index: number) {
    this.languageCards.forEach((card, i) => {
      if (i !== index) {
        card.deselect();
      }
    });
  }
}

export abstract class LanguageListObserver {}

export class LanguageListObserverFake implements LanguageListObserver {}
