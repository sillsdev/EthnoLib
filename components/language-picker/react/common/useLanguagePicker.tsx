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

export interface ILanguageNode {
  nodeData: ILanguage; // TODO rename nodeData?
  id: string;
  scripts: IScript[];
}

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

export const UNLISTED_LANGUAGE_NODE_ID = "unlisted-language";
export const UNLISTED_LANGUAGE_NODE = {
  nodeData: {
    code: "qaa",
    autonym: undefined,
    exonym: "Unknown Language",
    regionNames: "",
    scripts: [],
    alternativeTags: [],
    names: [],
  } as ILanguage,
  id: UNLISTED_LANGUAGE_NODE_ID,
  scripts: [],
} as ILanguageNode;

export const useLanguagePicker = (
  searchResultModifier?: (
    results: FuseResult<ILanguage>[],
    searchString: string
  ) => ILanguage[]
) => {
  const [searchString, setSearchString] = useState("");
  const [selectedLanguageNode, setSelectedLanguageNode] = useState<
    ILanguageNode | undefined
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
    !!selectedLanguageNode &&
    // either a script is selected or there are no scripts for the selected language
    (!!selectedScript || selectedLanguageNode.scripts?.length === 0);

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
    setSelectedLanguageNode(undefined);
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
    // and so won't yet have the desired language node, so do a search for it
    const tempLanguageData = getModifiedSearchResults(
      languageCode,
      searchResultModifier
    );
    const desiredLanguageNode = tempLanguageData.find(
      (langNode) =>
        stripDemarcation(langNode.nodeData.code || "") === languageCode
    );
    if (desiredLanguageNode) {
      setSelectedLanguageNode(desiredLanguageNode);
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
    let modifiedSearchResults: ILanguage[];
    if (searchResultModifier) {
      modifiedSearchResults = searchResultModifier(searchResults, searchString);
    } else {
      // fuse leaves some metadata in the results which search result modifiers might use
      modifiedSearchResults = stripResultMetadata(searchResults);
    }
    const languageData = modifiedSearchResults.map((language) => {
      const languageNode: ILanguageNode = {
        nodeData: language,
        id: stripDemarcation(language.code),
        scripts: [],
      };

      languageNode.scripts = language.scripts;
      return languageNode;
    });
    return languageData;
  }

  function toggleSelectLanguageNode(languageNode: ILanguageNode) {
    if (!languageNode) {
      console.error("no node selected");
      return;
    }
    // else if node is an ILanguageNode
    const languageNodeData = languageNode.nodeData as ILanguage;
    if (languageNode.id === selectedLanguageNode?.id) {
      // Clicking on the selected language node unselects it and clears data specific to that language
      setSelectedLanguageNode(undefined);
      setSelectedScript(undefined);
      clearCustomizableLanguageDetails();
      return;
    } else {
      setSelectedLanguageNode(languageNode);
      setSelectedScript(
        languageNode.scripts.length == 1 ? languageNode.scripts[0] : undefined
      );
      setCustomizableLanguageDetails({
        displayName: stripDemarcation(
          languageNodeData.autonym || languageNodeData.exonym || ""
        ),
      } as ICustomizableLanguageDetails);
      return;
    }
  }
  function toggleSelectScript(script: IScript) {
    if (codeMatches(script.code, selectedScript?.code)) {
      // clicking on the selected script node unselects it
      setSelectedScript(undefined);
      return;
    } else {
      setSelectedScript(script);
    }
  }

  function selectUnlistedLanguage() {
    setSelectedLanguageNode(UNLISTED_LANGUAGE_NODE);
    setSelectedScript(undefined);
    clearCustomizableLanguageDetails();
  }

  const onSearchStringChange = (searchString: string) => {
    setSearchString(searchString);
    setSelectedLanguageNode(undefined);
    setSelectedScript(undefined);
    clearCustomizableLanguageDetails();
  };

  return {
    // TODO make this an object
    languageData,
    selectedLanguageNode,
    selectedScript,
    CustomizableLanguageDetails,
    searchString,
    onSearchStringChange,
    toggleSelectLanguageNode,
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
  selectedLanguageNode: ILanguageNode | undefined
) {
  return (
    selectedLanguageNode === undefined ||
    selectedLanguageNode.id === UNLISTED_LANGUAGE_NODE_ID
  );
}
