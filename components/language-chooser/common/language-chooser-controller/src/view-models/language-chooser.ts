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
    this.listedLanguages = new Field(
      initialLanguages ? this.languagesToViewModels(initialLanguages) : []
    );

    this.searchString = new Field("", (search) => {
      this.onSearchStringUpdated(search);
      return search;
    });
    this.tagPreview = new Field("qaa-x-");
    this.displayName = new Field("");
  }

  readonly listedLanguages: Field<LanguageCardViewModel[]>;
  readonly listedScripts = new Field<ScriptCardViewModel[]>([]);
  readonly searchString: Field<string>;
  readonly tagPreview: Field<string>;
  readonly displayName: Field<string>;

  readonly selectedLanguage = new Field<ILanguage | undefined>(undefined);
  readonly selectedScript = new Field<IScript | undefined>(undefined);

  #currentSearchId = 0;

  private onSearchStringUpdated(query: string) {
    this.tagPreview.value = "qaa-x-" + query;
    this.search(query);
  }

  async search(query: string) {
    this.listedLanguages.value = [];
    if (query.length > 1) {
      this.#currentSearchId++;
      await asyncSearchForLanguage(query, (results) =>
        this.appendLanguages(results, this.#currentSearchId)
      );
    }
  }

  private appendLanguages(languages: ILanguage[], searchId: number) {
    if (searchId !== this.#currentSearchId) {
      return false;
    }
    this.listedLanguages.value = [
      ...this.listedLanguages.value,
      ...this.languagesToViewModels(languages),
    ];
    return true;
  }

  private onLanguageSelected(index: number) {
    const languages = this.listedLanguages.value;
    selectItem(index, languages);
    this.selectedLanguage.value = languages[index].language;

    if (languages[index].language.scripts.length === 1) {
      // Automatically select a language's only script
      this.setScriptList([]);
      this.selectedScript.value = languages[index].language.scripts[0];
    } else {
      this.setScriptList(languages[index].language.scripts);
    }

    this.updateTagPreview();
    this.updateDisplayName();
  }

  private onLanguageDeselected() {
    this.selectedLanguage.value = undefined;
    this.selectedScript.value = undefined;
    this.tagPreview.value = "qaa-x-" + this.searchString.value;
  }

  private setScriptList(scripts: IScript[]) {
    this.listedScripts.value = scripts.map(
      (script, i) =>
        new ScriptCardViewModel(script, {
          onSelect: (isSelected) =>
            isSelected ? this.onScriptSelected(i) : this.onScriptDeselected(),
        })
    );
  }

  private onScriptSelected(index: number) {
    selectItem(index, this.listedScripts.value);
    this.selectedScript.value = this.listedScripts.value[index].script;
    this.updateTagPreview();
    this.updateDisplayName();
  }

  private onScriptDeselected() {
    this.selectedScript.value = undefined;
  }

  private updateTagPreview() {
    this.tagPreview.value = createTagFromOrthography({
      language: this.selectedLanguage.value,
      script: this.selectedScript.value,
    });
  }

  private updateDisplayName() {
    this.displayName.value =
      defaultDisplayName(
        this.selectedLanguage.value,
        this.selectedScript.value
      ) ?? "";
  }

  private languagesToViewModels(languages: ILanguage[]) {
    return languages.map(
      (lang, i) =>
        new LanguageCardViewModel(lang, {
          onSelect: (isSelected) =>
            isSelected
              ? this.onLanguageSelected(i)
              : this.onLanguageDeselected(),
        })
    );
  }
}
