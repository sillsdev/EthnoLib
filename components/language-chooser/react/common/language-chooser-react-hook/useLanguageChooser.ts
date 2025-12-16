import {
  ILanguage,
  IScript,
  asyncSearchForLanguage,
  ICustomizableLanguageDetails,
  deepStripDemarcation,
} from "@ethnolib/find-language";
import { useRef } from "react";
import {
  isValidBcp47Tag,
  isManuallyEnteredTagLanguage,
  isUnlistedLanguage,
  languageForManuallyEnteredTag,
  parseLangtagFromLangChooser,
  UNLISTED_LANGUAGE,
  IOrthography,
  createTagFromOrthography,
  defaultDisplayName,
} from "@ethnolib/find-language";
import { Field } from "@ethnolib/state-management-core";
import { useField } from "@ethnolib/state-management-react";

export interface ILanguageChooser {
  languageResults: ILanguage[];
  selectedLanguage: ILanguage | undefined;
  selectedScript: IScript | undefined;
  customizableLanguageDetails: ICustomizableLanguageDetails;
  searchString: string;
  onSearchStringChange: (searchString: string) => void;
  selectLanguage: (language: ILanguage) => void;
  selectUnlistedLanguage: () => void;
  selectManuallyEnteredTagLanguage: (manuallyEnteredTag: string) => void;
  clearLanguageSelection: () => void;
  selectScript: (script: IScript) => void;
  clearScriptSelection: () => void;
  readyToSubmit: boolean;
  saveLanguageDetails: (
    details: ICustomizableLanguageDetails,
    script: IScript | undefined
  ) => void;
  resetTo: (
    searchString: string,
    selectionLanguageTag?: string,
    initialCustomDisplayName?: string
  ) => void;
}

export const useLanguageChooser = (
  onSelectionChange?: (
    orthography: IOrthography | undefined,
    langtag: string | undefined
  ) => void,
  searchResultModifier?: (
    results: ILanguage[],
    searchString: string
  ) => ILanguage[]
) => {
  const viewModelRef = useRef<ReturnType<typeof createLanguageChooserViewModel>>();

  if (!viewModelRef.current) {
    viewModelRef.current = createLanguageChooserViewModel(
      onSelectionChange,
      searchResultModifier
    );
  }

  const vm = viewModelRef.current;

  const [searchString, setSearchString] = useField(vm.searchString);
  const [languageResults] = useField(vm.languageResults);
  const [selectedLanguage] = useField(vm.selectedLanguage);
  const [selectedScript] = useField(vm.selectedScript);
  const [customizableLanguageDetails] = useField(vm.customizableLanguageDetails);

  return {
    languageResults,
    selectedLanguage,
    selectedScript,
    customizableLanguageDetails,
    searchString,
    onSearchStringChange: setSearchString,
    selectLanguage: vm.selectLanguage,
    selectUnlistedLanguage: vm.selectUnlistedLanguage,
    selectManuallyEnteredTagLanguage: vm.selectManuallyEnteredTagLanguage,
    clearLanguageSelection: vm.clearLanguageSelection,
    selectScript: vm.selectScript,
    clearScriptSelection: vm.clearScriptSelection,
    readyToSubmit: vm.readyToSubmit(),
    saveLanguageDetails: vm.saveLanguageDetails,
    resetTo: vm.resetTo,
  } as ILanguageChooser;
};

function createLanguageChooserViewModel(
  onSelectionChange?: (
    orthography: IOrthography | undefined,
    langtag: string | undefined
  ) => void,
  searchResultModifier?: (
    results: ILanguage[],
    searchString: string
  ) => ILanguage[]
) {
  const EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS = {
    customDisplayName: undefined,
    region: undefined,
    dialect: undefined,
  } as ICustomizableLanguageDetails;

  const languageResults = new Field<ILanguage[]>([]);
  const selectedLanguage = new Field<ILanguage | undefined>(undefined, () =>
    checkSelectionChange()
  );
  const selectedScript = new Field<IScript | undefined>(undefined, () =>
    checkSelectionChange()
  );
  const customizableLanguageDetails =
    new Field<ICustomizableLanguageDetails>(
      EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS,
      () => checkSelectionChange()
    );

  let previousStateWasValidSelection = false;

  const searchString = new Field<string>("", (newSearchString) => {
    languageResults.value = [];
    clearLanguageSelection();
    if (!newSearchString || newSearchString.length < 2) {
      return;
    }
    (async () => {
      await asyncSearchForLanguage(newSearchString, appendResults);
    })();
  });

  function appendResults(
    additionalSearchResults: ILanguage[],
    forSearchString: string
  ) {
    if (forSearchString !== searchString.value) {
      return false;
    }
    const modifier = searchResultModifier || ((r) => r);
    languageResults.value = languageResults.value.concat(
      modifier(additionalSearchResults, forSearchString)
    );
    return true;
  }

  function readyToSubmitInternal() {
    return isReadyToSubmit({
      language: selectedLanguage.value,
      script: selectedScript.value,
      customDetails: customizableLanguageDetails.value,
    });
  }

  function checkSelectionChange() {
    if (!onSelectionChange) return;
    if (readyToSubmitInternal()) {
      const resultingOrthography = deepStripDemarcation({
        language: selectedLanguage.value,
        script: selectedScript.value,
        customDetails: customizableLanguageDetails.value,
      }) as IOrthography;
      onSelectionChange(
        resultingOrthography,
        createTagFromOrthography(resultingOrthography)
      );
      previousStateWasValidSelection = true;
    } else if (previousStateWasValidSelection) {
      onSelectionChange(undefined, undefined);
      previousStateWasValidSelection = false;
    }
  }

  function clearLanguageSelection() {
    selectedLanguage.requestUpdate(undefined);
    selectedScript.requestUpdate(undefined);
    customizableLanguageDetails.requestUpdate(
      EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS
    );
  }

  function selectLanguage(language: ILanguage) {
    selectedLanguage.requestUpdate(language);
    selectedScript.requestUpdate(
      language.scripts.length === 1 ? language.scripts[0] : undefined
    );
    customizableLanguageDetails.requestUpdate(
      EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS
    );
  }

  function selectScript(script: IScript) {
    selectedScript.requestUpdate(script);
    customizableLanguageDetails.requestUpdate(
      EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS
    );
  }

  function saveLanguageDetails(
    details: ICustomizableLanguageDetails,
    script: IScript | undefined
  ) {
    customizableLanguageDetails.requestUpdate(details);

    if (!script && selectedLanguage.value?.scripts.length === 1) {
      script = selectedLanguage.value.scripts[0];
    }
    selectedScript.requestUpdate(script);
  }

  function resetTo(
    newSearchString: string,
    selectionLanguageTag?: string,
    initialCustomDisplayName?: string
  ) {
    searchString.requestUpdate(newSearchString);
    if (!selectionLanguageTag) return;

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
    if (initialSelections?.language) {
      selectLanguage(initialSelections?.language as ILanguage);
    }
    if (initialSelections?.script) {
      selectScript(initialSelections.script);
    }

    customizableLanguageDetails.requestUpdate({
      ...(initialSelections?.customDetails ||
        ({} as ICustomizableLanguageDetails)),
      customDisplayName:
        initialCustomDisplayName &&
        initialCustomDisplayName !==
          defaultDisplayName(
            initialSelections?.language,
            initialSelections?.script
          )
          ? initialCustomDisplayName
          : undefined,
    });
  }

  function selectUnlistedLanguage() {
    selectLanguage(UNLISTED_LANGUAGE);
  }

  function selectManuallyEnteredTagLanguage(manuallyEnteredTag: string) {
    selectLanguage(languageForManuallyEnteredTag(manuallyEnteredTag));
  }

  function clearScriptSelection() {
    selectedScript.requestUpdate(undefined);
    customizableLanguageDetails.requestUpdate(
      EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS
    );
  }

  return {
    searchString,
    languageResults,
    selectedLanguage,
    selectedScript,
    customizableLanguageDetails,
    onSearchStringChange: (value: string) => searchString.requestUpdate(value),
    selectLanguage,
    selectUnlistedLanguage,
    selectManuallyEnteredTagLanguage,
    clearLanguageSelection,
    selectScript,
    clearScriptSelection,
    readyToSubmit: readyToSubmitInternal,
    saveLanguageDetails,
    resetTo,
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
