import {
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
  scriptNodes: IScriptNode[];
}

export interface IScriptNode {
  nodeData: IScript;
  id: string;
}

export interface ICustomizableLanguageDetails {
  displayName?: string;
  scriptOverride?: IScript; // TODO see if this is still necessary
  region?: IRegion;
  dialect?: string;
}

export interface ILanguagePickerInitialState {
  languageCode?: string;
  scriptCode?: string;
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
  scriptNodes: [],
} as ILanguageNode;
export const SCRIPT_OVERRIDE_NODE_ID = "script-override";

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
  const [selectedScriptNode, setSelectedScriptNode] = useState<
    IScriptNode | undefined
  >();

  const EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS = {
    displayName: undefined,
    scriptOverride: undefined,
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
    (!!selectedScriptNode || selectedLanguageNode.scriptNodes?.length === 0);

  const languageData = useMemo(() => {
    if (searchString.length < 2) {
      return [];
    }
    return getModifiedSearchResults(searchString, searchResultModifier);
  }, [searchString]);

  // For reopening to a specific selection. We should then also set the search string
  // such that the selected language is visible.
  // *Note that if the desired script is a normal script option for the desired language
  // (i.e. there is an entry in langtags.json with that language and script combo), the script must be
  // passed in the scriptCode argument rather than as a script override
  // For example, for Uzbek with Latin Script, do reopenTo({languageCode: "uzb", scriptCode: "Latn"}) rather than
  // reopenTo({languageCode: "uzb", scriptOverride: {code: "Latn", name: "Latin"}}) because "uzb-Latn" is a
  // language tag
  function reopenTo({
    languageCode,
    scriptCode,
    customDetails,
  }: ILanguagePickerInitialState) {
    // clear everything
    setSelectedLanguageNode(undefined);
    setSelectedScriptNode(undefined);
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
      if (scriptCode) {
        const desiredScriptNode = desiredLanguageNode.scriptNodes.find(
          (scriptNode) => scriptNode.nodeData.code === scriptCode
        );
        if (desiredScriptNode) {
          setSelectedScriptNode(desiredScriptNode);
        }
      }
    }
    saveCustomizableLanguageDetails(
      customDetails || ({} as ICustomizableLanguageDetails)
    );
  }

  // TODO ask reviewer: within a function, define other functions as functions or consts?

  // details should only include the properties it wants to modify
  const saveCustomizableLanguageDetails = (
    details: ICustomizableLanguageDetails
  ) => {
    // first check if the script override really is an override
    if (details.scriptOverride) {
      for (const scriptNode of selectedLanguageNode?.scriptNodes || []) {
        if (
          stripDemarcation(scriptNode.nodeData.code || "") ===
          stripDemarcation(details.scriptOverride?.code || "")
        ) {
          // This script is a normal script choice for this language.
          // Select the script card instead of treating it as an override.
          setSelectedScriptNode(scriptNode);
          details.scriptOverride = undefined;
          break;
        }
      }
    }
    // If there really is a script override (we didn't clear it in the last block)
    if (details.scriptOverride) {
      setSelectedScriptNode({
        nodeData: details.scriptOverride,
        id: SCRIPT_OVERRIDE_NODE_ID,
      });
    }
    const updatedDetails = { ...CustomizableLanguageDetails, ...details };
    setCustomizableLanguageDetails(updatedDetails);
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
        scriptNodes: [],
      };

      const scriptNodes = language.scripts.map((script) => {
        return {
          nodeData: script,
          id: script.code,
        } as IScriptNode;
      });

      languageNode.scriptNodes = scriptNodes;
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
      setSelectedScriptNode(undefined);
      clearCustomizableLanguageDetails();
      return;
    } else {
      setSelectedLanguageNode(languageNode);
      setSelectedScriptNode(
        languageNode.scriptNodes.length == 1
          ? languageNode.scriptNodes[0]
          : undefined
      );
      setCustomizableLanguageDetails({
        displayName: stripDemarcation(
          languageNodeData.autonym || languageNodeData.exonym || ""
        ),
      } as ICustomizableLanguageDetails);
      return;
    }
  }
  function toggleSelectScriptNode(scriptNode: IScriptNode) {
    if (scriptNode.id === selectedScriptNode?.id) {
      // clicking on the selected script node unselects it
      setSelectedScriptNode(undefined);
      return;
    } else {
      setSelectedScriptNode(scriptNode);
    }
  }

  function selectUnlistedLanguage() {
    setSelectedLanguageNode(UNLISTED_LANGUAGE_NODE);
    setSelectedScriptNode(undefined);
    clearCustomizableLanguageDetails();
  }

  const onSearchStringChange = (searchString: string) => {
    setSearchString(searchString);
    setSelectedLanguageNode(undefined);
    setSelectedScriptNode(undefined);
    clearCustomizableLanguageDetails();
  };

  return {
    // TODO make this an object
    languageData,
    selectedLanguageNode,
    selectedScriptNode,
    CustomizableLanguageDetails,
    searchString,
    onSearchStringChange,
    toggleSelectLanguageNode,
    toggleSelectScriptNode,
    isReadyToSubmit,
    saveCustomizableLanguageDetails,
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
