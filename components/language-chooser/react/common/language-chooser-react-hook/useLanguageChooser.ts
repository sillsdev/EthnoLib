import {
  ILanguage,
  IScript,
  ICustomizableLanguageDetails,
  IOrthography,
} from "@ethnolib/find-language";
import { useEffect, useRef } from "react";
import {
  canSubmitOrthography,
  useLanguageChooserViewModel,
} from "@ethnolib/language-chooser-controller";
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
    searchString?: string,
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
  const stateRef = useRef<ReturnType<
    typeof useLanguageChooserViewModel
  > | null>(null);
  if (stateRef.current === null) {
    stateRef.current = useLanguageChooserViewModel({
      onSelectionChange,
      searchResultModifier,
    });
  }

  const viewModel = stateRef.current;

  useEffect(() => {
    viewModel.setSelectionChangeListener(onSelectionChange);
    viewModel.setSearchResultModifier(searchResultModifier);
  }, [onSelectionChange, searchResultModifier]);

  const [searchString] = useField(viewModel.searchString);
  const [selectedLanguage] = useField(viewModel.selectedLanguage);
  const [selectedScript] = useField(viewModel.selectedScript);
  const [customizableLanguageDetailsValue] = useField(
    viewModel.customizableLanguageDetails
  );
  const [languageResults] = useField(viewModel.languageResults);
  const [readyToSubmit] = useField(viewModel.readyToSubmit);

  const customizableLanguageDetails =
    customizableLanguageDetailsValue ||
    createEmptyCustomizableLanguageDetails();

  return {
    languageResults,
    selectedLanguage,
    selectedScript,
    customizableLanguageDetails,
    searchString,
    onSearchStringChange: viewModel.onSearchStringChange,
    selectLanguage: viewModel.selectLanguage,
    selectUnlistedLanguage: viewModel.selectUnlistedLanguage,
    selectManuallyEnteredTagLanguage:
      viewModel.selectManuallyEnteredTagLanguage,
    clearLanguageSelection: viewModel.clearLanguageSelection,
    selectScript: viewModel.selectScript,
    clearScriptSelection: viewModel.clearScriptSelection,
    readyToSubmit,
    saveLanguageDetails: viewModel.saveLanguageDetails,
    resetTo: viewModel.resetTo,
  } as ILanguageChooser;
};

function createEmptyCustomizableLanguageDetails(): ICustomizableLanguageDetails {
  return {
    customDisplayName: undefined,
    region: undefined,
    dialect: undefined,
  } as ICustomizableLanguageDetails;
}

export function isReadyToSubmit(selection: IOrthography): boolean {
  return canSubmitOrthography(selection);
}
