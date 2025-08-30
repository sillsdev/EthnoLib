import { ILanguage } from "components/language-chooser/common/find-language";
import { ViewModel } from "../state-management";
import { LanguageCardViewModel } from "./language-card";
import { ScriptCardViewModel } from "./script-card";
import { selectItem } from "../selectable";

interface ViewModelArgs {
  initialLanguages?: ILanguage[];
}

export class LanguageChooserViewModel extends ViewModel {
  constructor({ initialLanguages }: ViewModelArgs = {}) {
    super();
    this.listedLanguages = initialLanguages
      ? initialLanguages.map(
          (lang, i) =>
            new LanguageCardViewModel(lang, {
              onSelect: () => this.onLanguageSelected(i),
            })
        )
      : [];
  }

  listedLanguages: LanguageCardViewModel[];
  listedScripts: ScriptCardViewModel[] = [];

  private onLanguageSelected(index: number) {
    selectItem(index, this.listedLanguages);
    this.listedScripts = this.listedLanguages[index].language.scripts.map(
      (script, i) =>
        new ScriptCardViewModel(script, {
          onSelect: () => this.onScriptSelected(i),
        })
    );
  }

  private onScriptSelected(index: number) {
    selectItem(index, this.listedScripts);
  }
}
