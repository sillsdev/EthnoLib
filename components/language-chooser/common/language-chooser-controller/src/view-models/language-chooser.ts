import {
  createTagFromOrthography,
  ILanguage,
  IScript,
} from "@ethnolib/find-language";
import { Field, ViewModel } from "../state-management";
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

    this.tagPreview = new Field("");
  }

  listedLanguages: LanguageCardViewModel[];
  listedScripts: ScriptCardViewModel[] = [];
  readonly tagPreview: Field<string>;

  #selectedLanguage: ILanguage | undefined;
  #selectedScript: IScript | undefined;

  private onLanguageSelected(index: number) {
    selectItem(index, this.listedLanguages);
    this.#selectedLanguage = this.listedLanguages[index].language;
    this.setScriptList(this.listedLanguages[index].language.scripts);
    this.updateTagPreview();
  }

  private setScriptList(scripts: IScript[]) {
    this.listedScripts = scripts.map(
      (script, i) =>
        new ScriptCardViewModel(script, {
          onSelect: () => this.onScriptSelected(i),
        })
    );
  }

  private onScriptSelected(index: number) {
    selectItem(index, this.listedScripts);
    this.#selectedScript = this.listedScripts[index].script;
    this.updateTagPreview();
  }

  private updateTagPreview() {
    this.tagPreview.value = createTagFromOrthography({
      language: this.#selectedLanguage,
      script: this.#selectedScript,
    });
  }
}
