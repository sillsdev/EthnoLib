import {
  asyncSearchForLanguage,
  createTagFromOrthography,
  defaultDisplayName,
  type ICustomizableLanguageDetails,
  type ILanguage,
  type IOrthography,
  type IRegion,
  type IScript,
  isManuallyEnteredTagLanguage,
  isUnlistedLanguage,
  isValidBcp47Tag,
  languageForManuallyEnteredTag,
  UNLISTED_LANGUAGE,
} from "@ethnolib/find-language";
import { Field } from "@ethnolib/state-management-core";
import {
  LanguageCardViewModel,
  useLanguageChardViewModel,
} from "./language-card";
import { ScriptCardViewModel, useScriptCardViewModel } from "./script-card";
import { selectItem } from "../selectable";

interface UseLanguageChooserParams {
  initialLanguages?: ILanguage[];
}

export type LanguageChooserViewModel = ReturnType<
  typeof useLanguageChooserViewModel
>;

export function useLanguageChooserViewModel(
  params: UseLanguageChooserParams = {}
) {
  const { initialLanguages } = params;

  const listedLanguages = new Field<LanguageCardViewModel[]>([]);
  const listedScripts = new Field<ScriptCardViewModel[]>([]);
  const tagPreview = new Field("");
  const selectedLanguage = new Field<ILanguage | undefined>(undefined);
  const selectedScript = new Field<IScript | undefined>(undefined);
  const isReadyToSubmit = new Field(false);
  const showUnlistedLanguageModal = new Field<
    ((populateWith: { name?: string; region?: IRegion }) => void) | undefined
  >(undefined);
  const showCustomizeLanguageModal = new Field<
    | ((populateWith: {
        script?: IScript;
        region?: IRegion;
        dialect?: string;
      }) => void)
    | undefined
  >(undefined);

  const searchString = new Field("", () => {
    _onSearchStringUpdated();
  });

  const displayName = new Field("", () => _onDisplayNameChanged());

  const customizations = new Field<ICustomizableLanguageDetails | undefined>(
    undefined,
    () => {
      _onCustomizationsChanged();
    }
  );

  const customLanguageTag = new Field("", () => {
    _onCustomLanguageTagChanged();
  });

  let _currentSearchId = 0;

  function _onSearchStringUpdated() {
    _onLanguageDeselected();
    customizations.value = undefined;
    _updateTagPreview();
    search(searchString.value);
  }

  function _appendLanguages(languages: ILanguage[]) {
    const baseIndex = listedLanguages.value.length;
    const newLanguages = languages.map((lang, i) =>
      useLanguageChardViewModel(lang, {
        onSelect: (isSelected) =>
          isSelected
            ? _onLanguageSelected(baseIndex + i)
            : _onLanguageDeselected(),
      })
    );

    listedLanguages.value = [...listedLanguages.value, ...newLanguages];
  }

  function _onLanguageSelected(index: number) {
    selectItem(index, listedLanguages.value);
    selectedLanguage.value = listedLanguages.value[index].language;
    selectedScript.value = undefined;
    _updateScriptList(selectedLanguage.value);
    customizations.value = undefined;
    _onOrthographyChanged();
  }

  function _onLanguageDeselected() {
    selectedLanguage.value = undefined;
    selectedScript.value = undefined;
    _onOrthographyChanged();
  }

  function _updateScriptList(selectedLang: ILanguage) {
    if (selectedLang.scripts.length === 1) {
      // Automatically select a language's only script
      _setScriptList([]);
      selectedScript.value = selectedLang.scripts[0];
    } else {
      _setScriptList(selectedLang.scripts);
    }
  }

  function _setScriptList(scripts: IScript[]) {
    listedScripts.value = scripts.map((script, i) =>
      useScriptCardViewModel(script, {
        onSelect: (isSelected) =>
          isSelected ? _onScriptSelected(i) : _onScriptDeselected(),
      })
    );
  }

  function _onScriptSelected(index: number) {
    selectItem(index, listedScripts.value);
    selectedScript.value = listedScripts.value[index].script;
    _onOrthographyChanged();
  }

  function _onScriptDeselected() {
    selectedScript.value = undefined;
    _onOrthographyChanged();
  }

  function _onDisplayNameChanged() {
    customizations.value ??= {};
    customizations.value.customDisplayName = displayName.value;
    _updateIsReadyToSubmit();
  }

  function _onCustomizationsChanged() {
    selectedLanguage.value ??= UNLISTED_LANGUAGE;
    _onOrthographyChanged();
  }

  function _onCustomLanguageTagChanged() {
    searchString.requestUpdate("");
    tagPreview.value = customLanguageTag.value;
    selectedLanguage.value = languageForManuallyEnteredTag(
      customLanguageTag.value
    );
    _onOrthographyChanged();
  }

  function _onOrthographyChanged() {
    _updateTagPreview();
    _updateDisplayName();
    _updateIsReadyToSubmit();
  }

  function _updateTagPreview() {
    tagPreview.value = createTagFromOrthography({
      language: selectedLanguage.value,
      script: selectedScript.value,
      customDetails: selectedLanguage.value
        ? customizations.value
        : { dialect: searchString.value },
    });
  }

  function _updateDisplayName() {
    displayName.value =
      customizations.value?.customDisplayName ??
      defaultDisplayName(selectedLanguage.value, selectedScript.value) ??
      "";
  }

  function _updateIsReadyToSubmit() {
    isReadyToSubmit.value = canSubmitOrthography({
      language: selectedLanguage.value,
      script: selectedScript.value,
      customDetails: customizations.value,
    });
  }

  // Public methods
  async function search(query: string) {
    listedLanguages.value = [];
    if (query.length > 1) {
      _currentSearchId++;
      const searchId = _currentSearchId;
      await asyncSearchForLanguage(query, (results) => {
        if (searchId !== _currentSearchId) {
          return false;
        }
        _appendLanguages(results);
        return true;
      });
    }
  }

  function onCustomizeButtonClicked() {
    if (
      selectedLanguage.value &&
      selectedLanguage.value.languageSubtag !== "qaa" &&
      showCustomizeLanguageModal.value
    ) {
      showCustomizeLanguageModal.value({
        script: selectedScript.value,
        dialect: customizations.value?.dialect,
        region: customizations.value?.region,
      });
    } else if (showUnlistedLanguageModal.value) {
      showUnlistedLanguageModal.value({
        name: customizations.value?.dialect,
        region: customizations.value?.region,
      });
    }
  }

  function submitUnlistedLanguageModal({
    name,
    region,
  }: {
    name: string;
    region: IRegion;
  }) {
    customizations.requestUpdate({
      customDisplayName: name,
      dialect: name,
      region,
    });
  }

  function submitCustomizeLangaugeModal({
    script,
    region,
    dialect,
  }: {
    script?: IScript;
    region?: IRegion;
    dialect?: string;
  }) {
    customizations.requestUpdate({
      region,
      dialect,
      customDisplayName: customizations.value?.customDisplayName,
    });
    selectedScript.requestUpdate(script);
  }

  if (initialLanguages) {
    _appendLanguages(initialLanguages);
  }
  _updateTagPreview();

  return {
    // Fields
    listedLanguages,
    listedScripts,
    searchString,
    tagPreview,
    displayName,
    selectedLanguage,
    selectedScript,
    customizations,
    customLanguageTag,
    isReadyToSubmit,
    showUnlistedLanguageModal,
    showCustomizeLanguageModal,

    // Methods
    search,
    onCustomizeButtonClicked,
    submitUnlistedLanguageModal,
    submitCustomizeLangaugeModal,
  };
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

export function canSubmitOrthography(selection: IOrthography): boolean {
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
