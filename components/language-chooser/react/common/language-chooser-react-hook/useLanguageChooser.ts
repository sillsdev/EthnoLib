import {
  ILanguage,
  IScript,
  asyncSearchForLanguage,
  stripResultMetadata,
  stripDemarcation,
  deepStripDemarcation,
} from "@ethnolib/find-language";
import { useEffect, useRef, useState } from "react";
import { FuseResult } from "fuse.js";
import {
  isValidBcp47Tag,
  ICustomizableLanguageDetails,
  isManuallyEnteredTagLanguage,
  isUnlistedLanguage,
  languageForManuallyEnteredTag,
  parseLangtagFromLangChooser,
  UNLISTED_LANGUAGE,
  IOrthography,
  createTagFromOrthography,
} from "./languageTagHandling";

export interface ILanguageChooser {
  searchInProgress: boolean;
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
    results: FuseResult<ILanguage>[],
    searchString: string
  ) => ILanguage[]
) => {
  const [searchInProgress, setSearchInProgress] = useState(false);
  const searchStringRef = useRef(""); // we use useRef to help with asynchronously access the up-to-date value from the search function
  const [selectedLanguage, setSelectedLanguage] = useState<
    ILanguage | undefined
  >();
  const [selectedScript, setSelectedScript] = useState<IScript | undefined>();

  const EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS = {
    customDisplayName: undefined,
    region: undefined,
    dialect: undefined,
  } as ICustomizableLanguageDetails;

  const [customizableLanguageDetails, setCustomizableLanguageDetails] =
    useState<ICustomizableLanguageDetails>(EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS);

  function clearCustomizableLanguageDetails() {
    setCustomizableLanguageDetails(EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS);
  }

  const readyToSubmit = isReadyToSubmit({
    language: selectedLanguage,
    script: selectedScript,
    customDetails: customizableLanguageDetails,
  });

  const [languageResults, setLanguageResults] = useState<ILanguage[]>([]);

  // For faster results, the search function returns better results first but then continues searching for more results
  // and appends them to the result list, in several rounds.
  // Return true if we should continue searching for more results, and false if we should abort because the search string has changed
  function appendResults(
    additionalSearchResults: FuseResult<ILanguage>[],
    forSearchString: string
  ) {
    if (forSearchString !== searchStringRef.current) {
      // Search string has changed, stop looking for results for this search string
      return false;
    }
    const modifier = searchResultModifier || stripResultMetadata;
    //append the new results to the existing results
    setLanguageResults((r) =>
      r.concat(modifier(additionalSearchResults, forSearchString))
    );
    return true; // Keep looking for more results
  }

  useEffect(() => {
    const searchString = searchStringRef.current;
    setLanguageResults([]);
    if (!searchString || searchString.length < 2) {
      return;
    }
    setSearchInProgress(true);
    (async () => {
      await asyncSearchForLanguage(searchString, appendResults);
      setSearchInProgress(false);
    })();
  }, [searchStringRef.current]);

  // For reopening to a specific selection. We should then also set the search string
  // such that the selected language is visible.
  function resetTo(
    searchString: string,
    // if present, the language in selectionLanguageTag must be a result of this search string or selection won't display
    // unless it is a manually entered tag, in which case there is never a search result anyway
    selectionLanguageTag?: string,
    initialCustomDisplayName?: string // all info can be captured in language tag except display name
  ) {
    onSearchStringChange(searchString);
    if (!selectionLanguageTag) return;

    let initialSelections = parseLangtagFromLangChooser(
      selectionLanguageTag || "",
      searchResultModifier
    );
    if (selectionLanguageTag && !initialSelections) {
      // we failed to parse the tag, meaning this is a langtag requiring manual entry
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

    setCustomizableLanguageDetails({
      ...(initialSelections?.customDetails ||
        ({} as ICustomizableLanguageDetails)),
      // we only save the custom display name if it is different from the default
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

  function saveLanguageDetails(
    details: ICustomizableLanguageDetails,
    script: IScript | undefined
  ) {
    setCustomizableLanguageDetails(details);

    // If the provided script is empty but this language only has one script, automatically go back to that implied script
    if (!script && selectedLanguage?.scripts.length === 1) {
      script = selectedLanguage.scripts[0];
    }
    setSelectedScript(script);
  }

  function selectLanguage(language: ILanguage) {
    setSelectedLanguage(language);
    setSelectedScript(
      // If there is only one script option for this language, automatically select it
      language.scripts.length === 1 ? language.scripts[0] : undefined
    );
    clearCustomizableLanguageDetails();
  }

  function selectUnlistedLanguage() {
    selectLanguage(UNLISTED_LANGUAGE);
  }

  function selectManuallyEnteredTagLanguage(manuallyEnteredTag: string) {
    selectLanguage(languageForManuallyEnteredTag(manuallyEnteredTag));
  }

  function clearLanguageSelection() {
    setSelectedLanguage(undefined);
    setSelectedScript(undefined);
    clearCustomizableLanguageDetails();
  }

  function selectScript(script: IScript) {
    setSelectedScript(script);
  }
  function clearScriptSelection() {
    setSelectedScript(undefined);
  }

  function onSearchStringChange(searchString: string) {
    searchStringRef.current = searchString;
    setSelectedLanguage(undefined);
    setSelectedScript(undefined);
    clearCustomizableLanguageDetails();
  }

  const [previousStateWasValidSelection, setPreviousStateWasValidSelection] =
    useState(false);

  useEffect(() => {
    if (onSelectionChange) {
      if (readyToSubmit) {
        const resultingOrthography = deepStripDemarcation({
          language: selectedLanguage,
          script: selectedScript,
          customDetails: customizableLanguageDetails,
        }) as IOrthography;
        onSelectionChange(
          resultingOrthography,
          createTagFromOrthography(resultingOrthography)
        );
        setPreviousStateWasValidSelection(true);
      } else if (previousStateWasValidSelection) {
        onSelectionChange(undefined, undefined);
        setPreviousStateWasValidSelection(false);
      }
    }
  }, [selectedLanguage, selectedScript, customizableLanguageDetails]);

  return {
    searchInProgress,
    languageResults,
    selectedLanguage,
    selectedScript,
    customizableLanguageDetails,
    searchString: searchStringRef.current,
    onSearchStringChange,
    selectLanguage,
    selectUnlistedLanguage,
    selectManuallyEnteredTagLanguage,
    clearLanguageSelection,
    selectScript,
    clearScriptSelection,
    readyToSubmit,
    saveLanguageDetails,
    resetTo,
  } as ILanguageChooser;
};

export function defaultDisplayName(language?: ILanguage, script?: IScript) {
  if (
    !language ||
    isUnlistedLanguage(language) ||
    isManuallyEnteredTagLanguage(language)
  ) {
    return undefined;
  }

  return stripDemarcation(
    script?.languageNameInScript || language.autonym || language.exonym
  );
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
