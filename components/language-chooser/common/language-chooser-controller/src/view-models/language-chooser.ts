import {
  asyncSearchForLanguage,
  codeMatches,
  createTagFromOrthography,
  deepStripDemarcation,
  defaultDisplayName,
  formatDialectCode,
  type ICustomizableLanguageDetails,
  type ILanguage,
  type IOrthography,
  type IRegion,
  type IScript,
  isManuallyEnteredTagLanguage,
  isUnlistedLanguage,
  isValidBcp47Tag,
  languageForManuallyEnteredTag,
  parseLangtagFromLangChooser,
  UNLISTED_LANGUAGE,
} from "@ethnolib/find-language";
import { Field } from "@ethnolib/state-management-core";
import {
  LanguageCardViewModel,
  useLanguageCardViewModel,
} from "./language-card";
import { ScriptCardViewModel, useScriptCardViewModel } from "./script-card";

interface UseLanguageChooserParams {
  initialLanguages?: ILanguage[];
  onSelectionChange?: (
    orthography: IOrthography | undefined,
    langtag: string | undefined
  ) => void;
  searchResultModifier?: (
    results: ILanguage[],
    searchString: string
  ) => ILanguage[];
}

export type LanguageChooserViewModel = ReturnType<
  typeof useLanguageChooserViewModel
>;

export function useLanguageChooserViewModel(
  params: UseLanguageChooserParams = {}
) {
  const { initialLanguages } = params;
  let selectionChangeListener = params.onSelectionChange;
  let searchResultModifier = params.searchResultModifier;
  let previousStateWasValidSelection = false;

  const languageResults = new Field<ILanguage[]>([]);
  const listedLanguages = new Field<LanguageCardViewModel[]>([]);
  const listedScripts = new Field<ScriptCardViewModel[]>([]);
  const tagPreview = new Field("");
  const selectedLanguage = new Field<ILanguage | undefined>(undefined);
  const selectedScript = new Field<IScript | undefined>(undefined);
  const isReadyToSubmit = new Field(false);
  const showUnlistedLanguageModal = new Field<
    (populateWith: { name?: string; region?: IRegion }) => void
  >(
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    () => {}
  );
  const showCustomizeLanguageModal = new Field<
    (populateWith: {
      script?: IScript;
      region?: IRegion;
      dialect?: string;
    }) => void
  >(
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    () => {}
  );
  const promptForCustomTag = new Field<(populateWith?: string) => void>(
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    () => {}
  );

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
  let rawLanguageResults: ILanguage[] = [];

  function _onSearchStringUpdated() {
    search(searchString.value);
  }

  function _clearCustomizations() {
    customizations.value = undefined;
  }

  function _clearCustomizationsExceptDisplayName() {
    customizations.value = {
      customDisplayName: customizations.value?.customDisplayName,
    };
  }

  function _syncLanguageCardSelection() {
    listedLanguages.value.forEach((languageCard) => {
      languageCard.isSelected.value = codeMatches(
        languageCard.language.iso639_3_code,
        selectedLanguage.value?.iso639_3_code
      );
    });
  }

  function _syncScriptSelection() {
    listedScripts.value.forEach((scriptCard) => {
      scriptCard.isSelected.value = codeMatches(
        scriptCard.script.code,
        selectedScript.value?.code
      );
    });
  }

  function _createLanguageCardViewModel(language: ILanguage) {
    const languageCard = useLanguageCardViewModel(language, {
      onSelect: (isSelected) => {
        if (isSelected) {
          selectLanguage(language);
        } else if (
          codeMatches(
            language.iso639_3_code,
            selectedLanguage.value?.iso639_3_code
          )
        ) {
          clearLanguageSelection();
        }
      },
    });
    languageCard.isSelected.value = codeMatches(
      language.iso639_3_code,
      selectedLanguage.value?.iso639_3_code
    );
    return languageCard;
  }

  function _appendLanguages(
    languages: ILanguage[],
    modifier: (results: ILanguage[], searchString: string) => ILanguage[],
    searchQuery: string
  ) {
    rawLanguageResults = [...rawLanguageResults, ...languages];
    const modifiedLanguages = modifier(rawLanguageResults, searchQuery);
    languageResults.value = modifiedLanguages;
    listedLanguages.value = modifiedLanguages.map(_createLanguageCardViewModel);
    _syncLanguageCardSelection();
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
          isSelected ? _onScriptSelected(i) : clearScriptSelection(),
      })
    );
    _syncScriptSelection();
  }

  function _onScriptSelected(index: number) {
    selectScript(listedScripts.value[index].script);
  }

  function _onDisplayNameChanged() {
    customizations.value = {
      ...(customizations.value ?? {}),
      customDisplayName: displayName.value,
    };
    _updateIsReadyToSubmit();
  }

  function _onCustomizationsChanged() {
    selectedLanguage.value ??= UNLISTED_LANGUAGE;
    _onOrthographyChanged();
  }

  function _onCustomLanguageTagChanged() {
    searchString.value = "";
    _cancelSearch();
    rawLanguageResults = [];
    languageResults.value = [];
    listedLanguages.value = [];
    listedScripts.value = [];
    selectedLanguage.value = languageForManuallyEnteredTag(
      customLanguageTag.value
    );
    selectedScript.value = undefined;
    tagPreview.value = customLanguageTag.value;
    _clearCustomizations();
    _onOrthographyChanged();
  }

  function _onOrthographyChanged() {
    _updateTagPreview();
    _updateDisplayName();
    _updateIsReadyToSubmit();
    _notifySelectionChange();
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

  function _cancelSearch() {
    _currentSearchId++;
  }

  function _notifySelectionChange() {
    if (!selectionChangeListener) {
      return;
    }

    if (isReadyToSubmit.value) {
      const resultingOrthography = deepStripDemarcation({
        language: selectedLanguage.value,
        script: selectedScript.value,
        customDetails: customizations.value,
      }) as IOrthography;
      selectionChangeListener(
        resultingOrthography,
        createTagFromOrthography(resultingOrthography)
      );
      previousStateWasValidSelection = true;
    } else if (previousStateWasValidSelection) {
      selectionChangeListener(undefined, undefined);
      previousStateWasValidSelection = false;
    }
  }

  // Public methods
  async function search(query: string) {
    searchString.value = query;
    selectedLanguage.value = undefined;
    selectedScript.value = undefined;
    listedScripts.value = [];
    _syncLanguageCardSelection();
    _syncScriptSelection();
    customLanguageTag.value = "";
    _clearCustomizations();
    _updateTagPreview();
    rawLanguageResults = [];
    languageResults.value = [];
    listedLanguages.value = [];
    _cancelSearch();
    _onOrthographyChanged();
    if (query.length > 1) {
      const searchId = _currentSearchId;
      const modifierForThisSearch =
        searchResultModifier || ((results) => results);
      await asyncSearchForLanguage(query, (results) => {
        if (searchId !== _currentSearchId) {
          return false;
        }
        _appendLanguages(results, modifierForThisSearch, query);
        return true;
      });
    }
  }

  function onSearchStringChange(query: string) {
    searchString.requestUpdate(query);
  }

  function selectLanguage(language: ILanguage) {
    selectedLanguage.value = language;
    selectedScript.value =
      language.scripts.length === 1 ? language.scripts[0] : undefined;
    _updateScriptList(language);
    _clearCustomizations();
    _syncLanguageCardSelection();
    _syncScriptSelection();
    _onOrthographyChanged();
  }

  function selectUnlistedLanguage() {
    selectLanguage(UNLISTED_LANGUAGE);
  }

  function selectManuallyEnteredTagLanguage(manuallyEnteredTag: string) {
    searchString.value = "";
    rawLanguageResults = [];
    languageResults.value = [];
    listedLanguages.value = [];
    listedScripts.value = [];
    selectedLanguage.value = languageForManuallyEnteredTag(manuallyEnteredTag);
    selectedScript.value = undefined;
    customLanguageTag.value = manuallyEnteredTag;
    _clearCustomizations();
    _syncLanguageCardSelection();
    _syncScriptSelection();
    _onOrthographyChanged();
  }

  function clearLanguageSelection() {
    selectedLanguage.value = undefined;
    selectedScript.value = undefined;
    listedScripts.value = [];
    _clearCustomizations();
    _syncLanguageCardSelection();
    _syncScriptSelection();
    _onOrthographyChanged();
  }

  function selectScript(script: IScript) {
    selectedScript.value = script;
    _clearCustomizationsExceptDisplayName();
    _syncScriptSelection();
    _onOrthographyChanged();
  }

  function clearScriptSelection() {
    selectedScript.value = undefined;
    _clearCustomizationsExceptDisplayName();
    _syncScriptSelection();
    _onOrthographyChanged();
  }

  function saveLanguageDetails(
    details: ICustomizableLanguageDetails,
    script: IScript | undefined
  ) {
    customizations.value = details;
    if (!script && selectedLanguage.value?.scripts.length === 1) {
      script = selectedLanguage.value.scripts[0];
    }
    selectedScript.value = script;
    _syncScriptSelection();
    _onOrthographyChanged();
  }

  function resetTo(
    initialSearchString?: string,
    selectionLanguageTag?: string,
    initialCustomDisplayName?: string
  ) {
    if (!selectionLanguageTag) {
      onSearchStringChange(initialSearchString || "");
      return;
    }

    let initialSelections = parseLangtagFromLangChooser(
      selectionLanguageTag || "",
      searchResultModifier
    );
    if (selectionLanguageTag && !initialSelections) {
      initialSelections = {
        language: languageForManuallyEnteredTag(selectionLanguageTag || ""),
        script: undefined,
        customDetails: {
          customDisplayName: initialCustomDisplayName,
        },
      };
    }

    initialSearchString =
      initialSearchString || initialSelections?.language?.languageSubtag;
    onSearchStringChange(initialSearchString || "");

    if (initialSelections?.language) {
      selectLanguage(initialSelections.language as ILanguage);
    }
    if (initialSelections?.script) {
      selectScript(initialSelections.script);
    }

    customizations.value = {
      ...(initialSelections?.customDetails || {}),
      customDisplayName:
        initialCustomDisplayName &&
        initialCustomDisplayName !==
          defaultDisplayName(
            initialSelections?.language,
            initialSelections?.script
          )
          ? initialCustomDisplayName
          : undefined,
    };
    _onOrthographyChanged();
  }

  function setSelectionChangeListener(
    callback:
      | ((
          orthography: IOrthography | undefined,
          langtag: string | undefined
        ) => void)
      | undefined
  ) {
    selectionChangeListener = callback;
  }

  function setSearchResultModifier(
    modifier:
      | ((results: ILanguage[], searchString: string) => ILanguage[])
      | undefined
  ) {
    searchResultModifier = modifier;
  }

  function onCustomizeButtonClicked() {
    if (customLanguageTag.value) {
      promptForCustomTag.value(customLanguageTag.value);
    } else if (
      selectedLanguage.value &&
      selectedLanguage.value.languageSubtag !== "qaa"
    ) {
      showCustomizeLanguageModal.value({
        script: selectedScript.value,
        dialect: customizations.value?.dialect,
        region: customizations.value?.region,
      });
    } else {
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
    const normalizedDialect = formatDialectCode(name);
    selectUnlistedLanguage();
    customizations.value = {
      customDisplayName: name,
      dialect: normalizedDialect,
      region,
    };
    _onOrthographyChanged();
  }

  function submitCustomizeLanguageModal({
    script,
    region,
    dialect,
  }: {
    script?: IScript;
    region?: IRegion;
    dialect?: string;
  }) {
    saveLanguageDetails(
      {
        region,
        dialect,
        customDisplayName: customizations.value?.customDisplayName,
      },
      script
    );
  }

  if (initialLanguages) {
    _appendLanguages(
      initialLanguages,
      searchResultModifier || ((results) => results),
      ""
    );
  }
  _updateTagPreview();

  return {
    // Fields
    languageResults,
    listedLanguages,
    listedScripts,
    searchString,
    tagPreview,
    displayName,
    selectedLanguage,
    selectedScript,
    customizableLanguageDetails: customizations,
    customizations,
    customLanguageTag,
    readyToSubmit: isReadyToSubmit,
    isReadyToSubmit,
    showUnlistedLanguageModal,
    showCustomizeLanguageModal,
    promptForCustomTag,

    // Methods
    search,
    onSearchStringChange,
    selectLanguage,
    selectUnlistedLanguage,
    selectManuallyEnteredTagLanguage,
    clearLanguageSelection,
    selectScript,
    clearScriptSelection,
    saveLanguageDetails,
    resetTo,
    setSelectionChangeListener,
    setSearchResultModifier,
    onCustomizeButtonClicked,
    submitUnlistedLanguageModal,
    submitCustomizeLanguageModal,
  };
}

function hasValidDisplayName(selection: IOrthography) {
  if (!selection.language) {
    return false;
  }
  const trimmedCustomDisplayName =
    selection.customDetails?.customDisplayName?.trim();
  // Check that user has not entered an empty string or whitespace only in the custom display name
  if (
    typeof selection.customDetails?.customDisplayName === "string" &&
    !trimmedCustomDisplayName
  ) {
    return false;
  }
  // Check that we have a default display name and/or a custom display name
  return (
    !!defaultDisplayName(selection.language, selection.script) ||
    !!trimmedCustomDisplayName
  );
}

export function canSubmitOrthography(selection: IOrthography): boolean {
  const normalizedDialect = formatDialectCode(selection.customDetails?.dialect);
  const hasDialectCode = /[a-z0-9]/i.test(normalizedDialect);
  const hasRegionName = !!selection.customDetails?.region?.name?.trim();
  return (
    !!selection.language &&
    hasValidDisplayName(selection) &&
    // either a script is selected or there are no scripts for the selected language
    (!!selection.script || selection.language?.scripts?.length === 0) &&
    // if unlisted language, name and country are required
    (!isUnlistedLanguage(selection.language) ||
      (hasDialectCode && hasRegionName)) &&
    // if this was a manually entered langtag, check that tag is valid BCP 47
    (!isManuallyEnteredTagLanguage(selection.language) ||
      isValidBcp47Tag(selection.language?.manuallyEnteredTag))
  );
}
