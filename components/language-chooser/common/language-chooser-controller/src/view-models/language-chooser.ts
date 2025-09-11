import {
  asyncSearchForLanguage,
  createTagFromOrthography,
  defaultDisplayName,
  ICustomizableLanguageDetails,
  ILanguage,
  IOrthography,
  IScript,
  isManuallyEnteredTagLanguage,
  isUnlistedLanguage,
  isValidBcp47Tag,
  languageForManuallyEnteredTag,
  UNLISTED_LANGUAGE,
} from "@ethnolib/find-language";
import { Field, ViewModel } from "@ethnolib/state-management-core";
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

    this.searchString = new Field("", () => {
      this.onSearchStringUpdated();
    });
    this.tagPreview = new Field("");
    this.displayName = new Field("", () => this.onDisplayNameChanged());

    this.customizations = new Field<ICustomizableLanguageDetails | undefined>(
      undefined,
      () => {
        this.onCustomizationsChanged();
      }
    );

    this.customLanguageTag = new Field("", () => {
      this.onCustomLanguageTagChanged();
    });

    this.updateTagPreview();
  }

  readonly listedLanguages: Field<LanguageCardViewModel[]>;
  readonly listedScripts = new Field<ScriptCardViewModel[]>([]);
  readonly searchString: Field<string>;
  readonly tagPreview: Field<string>;
  readonly displayName: Field<string>;

  readonly selectedLanguage = new Field<ILanguage | undefined>(undefined);
  readonly selectedScript = new Field<IScript | undefined>(undefined);
  readonly customizations: Field<ICustomizableLanguageDetails | undefined>;
  readonly customLanguageTag: Field<string>;

  readonly isReadyToSubmit = new Field(false);

  #currentSearchId = 0;

  private onSearchStringUpdated() {
    this.onLanguageDeselected();
    this.customizations.value = undefined;
    this.updateTagPreview();
    this.search(this.searchString.value);
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

  private onLanguageSelected(index: number) {
    selectItem(index, this.listedLanguages.value);
    this.selectedLanguage.value = this.listedLanguages.value[index].language;
    this.updateScriptList(this.selectedLanguage.value);
    this.customizations.value = undefined;
    this.onOrthographyChanged();
  }

  private onLanguageDeselected() {
    this.selectedLanguage.value = undefined;
    this.selectedScript.value = undefined;
    this.onOrthographyChanged();
  }

  private updateScriptList(selectedLanguage: ILanguage) {
    if (selectedLanguage.scripts.length === 1) {
      // Automatically select a language's only script
      this.setScriptList([]);
      this.selectedScript.value = selectedLanguage.scripts[0];
    } else {
      this.setScriptList(selectedLanguage.scripts);
    }
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
    this.onOrthographyChanged();
  }

  private onScriptDeselected() {
    this.selectedScript.value = undefined;
    this.onOrthographyChanged();
  }

  private onDisplayNameChanged() {
    this.customizations.value ??= {};
    this.customizations.value.customDisplayName = this.displayName.value;
    this.updateIsReadyToSubmit();
  }

  private onCustomizationsChanged() {
    this.selectedLanguage.value ??= UNLISTED_LANGUAGE;
    this.onOrthographyChanged();
  }

  private onCustomLanguageTagChanged() {
    this.searchString.requestUpdate("");
    this.tagPreview.value = this.customLanguageTag.value;
    this.selectedLanguage.value = languageForManuallyEnteredTag(
      this.customLanguageTag.value
    );
    this.onOrthographyChanged();
  }

  private onOrthographyChanged() {
    this.updateTagPreview();
    this.updateDisplayName();
    this.updateIsReadyToSubmit();
  }

  private updateTagPreview() {
    this.tagPreview.value = createTagFromOrthography({
      language: this.selectedLanguage.value,
      script: this.selectedScript.value,
      customDetails: this.selectedLanguage.value
        ? this.customizations.value
        : { dialect: this.searchString.value },
    });
  }

  private updateDisplayName() {
    this.displayName.value =
      this.customizations.value?.customDisplayName ??
      defaultDisplayName(
        this.selectedLanguage.value,
        this.selectedScript.value
      ) ??
      "";
  }

  private updateIsReadyToSubmit() {
    this.isReadyToSubmit.value = isReadyToSubmit({
      language: this.selectedLanguage.value,
      script: this.selectedScript.value,
      customDetails: this.customizations.value,
    });
  }
}

function hasValidDisplayName(selection: IOrthography) {
  if (!selection.language) {
    return false;
  }
  // Check that user has not entered an empty string or whitespace only in the custom display name
  if (
    typeof selection.customDetails?.customDisplayName === "string" &&
    !selection.customDetails?.customDisplayName?.trim()
  ) {
    return false;
  }
  // Check that we have a default display name and/or a custom display name
  return (
    !!defaultDisplayName(selection.language, selection.script) ||
    !!selection.customDetails?.customDisplayName
  );
}

export function isReadyToSubmit(selection: IOrthography): boolean {
  return (
    !!selection.language &&
    hasValidDisplayName(selection) &&
    // either a script is selected or there are no scripts for the selected language
    (!!selection.script || selection.language?.scripts?.length === 0) &&
    // if unlisted language, name and country are required
    (!isUnlistedLanguage(selection.language) ||
      (!!selection.customDetails?.dialect &&
        !!selection.customDetails?.region?.name)) &&
    // if this was a manually entered langtag, check that tag is valid BCP 47
    (!isManuallyEnteredTagLanguage(selection.language) ||
      isValidBcp47Tag(selection.language?.manuallyEnteredTag))
  );
}
