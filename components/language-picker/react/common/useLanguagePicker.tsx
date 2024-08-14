import {
  codeMatches,
  ILanguage,
  IRegion,
  IScript,
  searchForLanguage,
} from "@ethnolib/find-language";
import { useMemo, useState } from "react";
import { stripResultMetadata } from "@ethnolib/find-language";
import { FuseResult } from "fuse.js";
import { stripDemarcation } from "@ethnolib/find-language";

export interface ICustomizableLanguageDetails {
  displayName?: string;
  region?: IRegion;
  dialect?: string;
}

export interface ILanguagePickerInitialState {
  languageCode?: string;
  script?: IScript;
  customDetails?: ICustomizableLanguageDetails;
}

export const UNLISTED_LANGUAGE_CODE = "qaa";
export const UNLISTED_LANGUAGE = {
  code: UNLISTED_LANGUAGE_CODE,
  displayCode: UNLISTED_LANGUAGE_CODE,
  autonym: undefined,
  exonym: "Unknown Language",
  regionNames: "",
  scripts: [],
  alternativeTags: [],
  names: [],
} as ILanguage;

export const useLanguagePicker = (
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

  const [CustomizableLanguageDetails, setCustomizableLanguageDetails] =
    useState<ICustomizableLanguageDetails>(EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS);

  function clearCustomizableLanguageDetails() {
    setCustomizableLanguageDetails(EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS);
  }

  const isReadyToSubmit =
    !!selectedLanguage &&
    // either a script is selected or there are no scripts for the selected language
    (!!selectedScript || selectedLanguage.scripts?.length === 0);

  const languageData = useMemo(() => {
    if (searchString.length < 2) {
      return [];
    }
    return getModifiedSearchResults(searchString, searchResultModifier);
  }, [searchString]);

  // For reopening to a specific selection. We should then also set the search string
  // such that the selected language is visible.

  function reopenTo({
    languageCode,
    script,
    customDetails,
  }: ILanguagePickerInitialState) {
    // clear everything
    setSelectedLanguage(undefined);
    setSelectedScript(undefined);
    clearCustomizableLanguageDetails();

    if (!languageCode) {
      return;
    }

    // TODO what if there is a language code that is also the start of so many language names
    // that the language card with that code isn't initially visible and one must scroll to see it?
    // Do we need to make the language picker scroll to it? Seems like overkill to me
    onSearchStringChange(languageCode);
    // TODO this is inefficient... languageData won't get updated until rerender
    // and so selectedLanguage won't yet have the desired language, so do a search for it
    const tempLanguageData = getModifiedSearchResults(
      languageCode,
      searchResultModifier
    );
    const desiredLanguage = tempLanguageData.find((language) =>
      codeMatches(language.code, languageCode)
    );
    if (desiredLanguage) {
      setSelectedLanguage(desiredLanguage);
      saveLanguageDetails(
        customDetails || ({} as ICustomizableLanguageDetails),
        script
      );
    }
  }

  // details should only include the properties it wants to modify
  const saveLanguageDetails = (
    details: ICustomizableLanguageDetails,
    script?: IScript
  ) => {
    setSelectedScript(script);
    const updatedCustomizableDetails = {
      ...CustomizableLanguageDetails,
      ...details,
    };
    setCustomizableLanguageDetails(updatedCustomizableDetails);
  };

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
    if (!language) {
      console.error("no language selected");
      return;
    }
    if (codeMatches(language.code, selectedLanguage?.code)) {
      // Clicking on the selected language unselects it and clears data specific to that language
      setSelectedLanguage(undefined);
      setSelectedScript(undefined);
      clearCustomizableLanguageDetails();
      return;
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
      return;
    }
  }
  function toggleSelectScript(script: IScript) {
    if (codeMatches(script.code, selectedScript?.code)) {
      // clicking on the selected script unselects it
      setSelectedScript(undefined);
      return;
    } else {
      setSelectedScript(script);
    }
  }

  function selectUnlistedLanguage() {
    setSelectedLanguage(UNLISTED_LANGUAGE);
    setSelectedScript(undefined);
    clearCustomizableLanguageDetails();
  }

  const onSearchStringChange = (searchString: string) => {
    setSearchString(searchString);
    setSelectedLanguage(undefined);
    setSelectedScript(undefined);
    clearCustomizableLanguageDetails();
  };

  return {
    // TODO make this an object
    languageData,
    selectedLanguage,
    selectedScript,
    CustomizableLanguageDetails,
    searchString,
    onSearchStringChange,
    toggleSelectLanguage,
    toggleSelectScript,
    isReadyToSubmit,
    saveLanguageDetails,
    selectUnlistedLanguage,
    reopenTo,
  };
};

// TODO consts to functions

// We show the unlisted language controls unless a language is selected
export function shouldShowUnlistedLanguageControls(
  selectedLanguage: ILanguage | undefined
) {
  return (
    selectedLanguage === undefined ||
    codeMatches(selectedLanguage.code, UNLISTED_LANGUAGE_CODE)
  );
}
