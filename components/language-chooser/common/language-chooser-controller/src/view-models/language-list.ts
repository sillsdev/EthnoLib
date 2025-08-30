import { ILanguage } from "@ethnolib/find-language";
import { LanguageCardViewModel } from "./language-card";
import { ViewModel } from "../state-management";
import { selectItem } from "../selectable";

export class LanguageListViewModel extends ViewModel {
  constructor(languages: ILanguage[]) {
    super();
    this.languageCards = languages.map(
      (lang, i) =>
        new LanguageCardViewModel(lang, {
          onSelect: () => selectItem(i, this.languageCards),
        })
    );
  }

  languageCards: LanguageCardViewModel[];
}
