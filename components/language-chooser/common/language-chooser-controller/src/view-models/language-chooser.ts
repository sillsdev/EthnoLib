import {
  asyncSearchForLanguage,
  createTagFromOrthography,
  defaultDisplayName,
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
      ? this.languagesToViewModels(initialLanguages)
      : [];

    this.searchString = new Field("", (search) => {
      this.search(search);
      return search;
    });
    this.tagPreview = new Field("");
    this.displayName = new Field("");
  }

  listedLanguages: LanguageCardViewModel[];
  listedScripts: ScriptCardViewModel[] = [];
  readonly searchString: Field<string>;
  readonly tagPreview: Field<string>;
  readonly displayName: Field<string>;

  #selectedLanguage: ILanguage | undefined;
  #selectedScript: IScript | undefined;
  #currentSearchId = 0;

  async search(query: string) {
    this.#currentSearchId++;
    await asyncSearchForLanguage(query, (results) =>
      this.appendLanguages(results, this.#currentSearchId)
    );
  }

  private appendLanguages(languages: ILanguage[], searchId: number) {
    if (searchId !== this.#currentSearchId) {
      return false;
    }
    this.listedLanguages.push(...this.languagesToViewModels(languages));
    return true;
  }

  private onLanguageSelected(index: number) {
    selectItem(index, this.listedLanguages);
    this.#selectedLanguage = this.listedLanguages[index].language;
    this.setScriptList(this.listedLanguages[index].language.scripts);
    this.updateTagPreview();
    this.updateDisplayName();
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
    this.updateDisplayName();
  }

  private updateTagPreview() {
    this.tagPreview.value = createTagFromOrthography({
      language: this.#selectedLanguage,
      script: this.#selectedScript,
    });
  }

  private updateDisplayName() {
    this.displayName.value =
      defaultDisplayName(this.#selectedLanguage, this.#selectedScript) ?? "";
  }

  private languagesToViewModels(languages: ILanguage[]) {
    return languages.map(
      (lang, i) =>
        new LanguageCardViewModel(lang, {
          onSelect: () => this.onLanguageSelected(i),
        })
    );
  }
}
