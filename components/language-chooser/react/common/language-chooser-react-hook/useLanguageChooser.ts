import {
  codeMatches,
  ILanguage,
  IScript,
  searchForLanguage,
  stripResultMetadata,
  stripDemarcation,
} from "@ethnolib/find-language";
import { useMemo, useState } from "react";
import { FuseResult } from "fuse.js";
import {
  ICustomizableLanguageDetails,
  isUnlistedLanguage,
  parseLangtagForLangChooser,
  UNLISTED_LANGUAGE,
} from "./languageTagHandling";

export interface ILanguageChooser {
  languageData: ILanguage[];
  selectedLanguage: ILanguage | undefined;
  selectedScript: IScript | undefined;
  customizableLanguageDetails: ICustomizableLanguageDetails;
  searchString: string;
  onSearchStringChange: (searchString: string) => void;
  toggleSelectLanguage: (language: ILanguage) => void;
  toggleSelectScript: (script: IScript) => void;
  isReadyToSubmit: boolean;
  saveLanguageDetails: (
    details: ICustomizableLanguageDetails,
    script: IScript | undefined
  ) => void;
  selectUnlistedLanguage: () => void;
  resetTo: (initialLanguageTag: string) => void;
}

export const useLanguageChooser = (
  searchResultModifier?: (
    results: FuseResult<ILanguage>[],
    searchString: string
  ) => ILanguage[]
) => {
  const [searchString, setSearchString] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<
    ILanguage | undefined
  >();
  const [selectedScript, setSelectedScript] = useState<IScript | undefined>();

  const EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS = {
    displayName: undefined,
    region: undefined,
    dialect: undefined,
  } as ICustomizableLanguageDetails;

  const [customizableLanguageDetails, setCustomizableLanguageDetails] =
    useState<ICustomizableLanguageDetails>(EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS);

  function clearCustomizableLanguageDetails() {
    setCustomizableLanguageDetails(EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS);
  }

  const isReadyToSubmit =
    !!selectedLanguage &&
    // either a script is selected or there are no scripts for the selected language
    (!!selectedScript || selectedLanguage.scripts?.length === 0) &&
    // if unlisted language, name and country are required
    (!isUnlistedLanguage ||
      (customizableLanguageDetails.dialect !== "" &&
        customizableLanguageDetails.region?.name !== ""));

  const languageData = useMemo(() => {
    if (!searchString || searchString.length < 2) {
      return [];
    }
    return getModifiedSearchResults(searchString, searchResultModifier);
  }, [searchString]);

  // For reopening to a specific selection. We should then also set the search string
  // such that the selected language is visible.
  function resetTo(initialLanguageTag: string) {
    // clear everything
    setSelectedLanguage(undefined);
    setSelectedScript(undefined);
    clearCustomizableLanguageDetails();

    const initialSelections = parseLangtagForLangChooser(initialLanguageTag);
    if (initialSelections) {
      // TODO if there is a language code that is also the start of so many language names
      // that the language card with that code isn't initially visible and one must scroll to see it,
      // scroll to it
      onSearchStringChange(initialSelections.language?.languageSubtag || "");
      setSelectedLanguage(initialSelections.language);
      saveLanguageDetails(
        initialSelections.customDetails || ({} as ICustomizableLanguageDetails),
        initialSelections.script
      );
    }
  }

  function saveLanguageDetails(
    details: ICustomizableLanguageDetails,
    script: IScript | undefined
  ) {
    setSelectedScript(script);
    setCustomizableLanguageDetails(details);
  }

  function getModifiedSearchResults(
    searchString: string,
    searchResultModifier?: (
      results: FuseResult<ILanguage>[],
      searchString: string
    ) => ILanguage[]
  ) {
    const searchResults = searchForLanguage(searchString);
    if (searchResultModifier) {
      return searchResultModifier(searchResults, searchString);
    } else {
      // fuse leaves some metadata in the results which search result modifiers might use
      return stripResultMetadata(searchResults);
    }
  }

  function toggleSelectLanguage(language: ILanguage) {
    if (codeMatches(language.iso639_3_code, selectedLanguage?.iso639_3_code)) {
      // Clicking on the selected language unselects it and clears data specific to that language
      setSelectedLanguage(undefined);
      setSelectedScript(undefined);
      clearCustomizableLanguageDetails();
    } else {
      setSelectedLanguage(language);
      setSelectedScript(
        // If there is only one script option for this language, automatically select it
        language.scripts.length == 1 ? language.scripts[0] : undefined
      );
      setCustomizableLanguageDetails({
        displayName: stripDemarcation(
          language.autonym || language.exonym || ""
        ),
      } as ICustomizableLanguageDetails);
    }
  }

  function toggleSelectScript(script: IScript) {
    if (codeMatches(script.code, selectedScript?.code)) {
      // clicking on the selected script unselects it
      setSelectedScript(undefined);
    } else {
      setSelectedScript(script);
    }
  }

  function selectUnlistedLanguage() {
    setSelectedLanguage(UNLISTED_LANGUAGE);
    setSelectedScript(undefined);
    clearCustomizableLanguageDetails();
  }

  function onSearchStringChange(searchString: string) {
    setSearchString(searchString);
    setSelectedLanguage(undefined);
    setSelectedScript(undefined);
    clearCustomizableLanguageDetails();
  }

  return {
    languageData,
    selectedLanguage,
    selectedScript,
    customizableLanguageDetails,
    searchString,
    onSearchStringChange,
    toggleSelectLanguage,
    toggleSelectScript,
    isReadyToSubmit,
    saveLanguageDetails,
    selectUnlistedLanguage,
    resetTo,
  } as ILanguageChooser;
};
