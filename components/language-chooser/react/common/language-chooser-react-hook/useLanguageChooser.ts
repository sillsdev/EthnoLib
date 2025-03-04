import {
  ILanguage,
  IScript,
  searchForLanguage,
  stripResultMetadata,
  stripDemarcation,
  deepStripDemarcation,
} from "@ethnolib/find-language";
import { useEffect, useMemo, useState } from "react";
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
  languageData: ILanguage[];
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

  const readyToSubmit = isReadyToSubmit({
    language: selectedLanguage,
    script: selectedScript,
    customDetails: customizableLanguageDetails,
  });

  const languageData = useMemo(() => {
    if (!searchString || searchString.length < 2) {
      return [];
    }
    return getModifiedSearchResults(searchString, searchResultModifier);
  }, [searchString]);

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
          displayName: initialCustomDisplayName,
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
      displayName:
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
    setSearchString(searchString);
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
    languageData,
    selectedLanguage,
    selectedScript,
    customizableLanguageDetails,
    searchString,
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
    typeof selection.customDetails?.displayName === "string" &&
    !selection.customDetails?.displayName?.trim()
  ) {
    return false;
  }
  // Check that we have a default display name and/or a custom display name
  return (
    !!defaultDisplayName(selection.language, selection.script) ||
    !!selection.customDetails?.displayName
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
