import { ILanguage, IRegion, IScript, searchForLanguage } from "@ethnolib/find-language";
import { useMemo, useState } from "react";
import { stripResultMetadata } from "./searchResultModifiers";
import { FuseResult } from "fuse.js";
import { stripDemarcation } from "./matchingSubstringDemarcation";

export enum NodeType {
  Language = "language",
  Script = "script",
}

export interface OptionNode {
  nodeData: ILanguage | IScript;
  id: string;
  nodeType: NodeType;
  childNodes: OptionNode[]; // In a language node, this will have all the relevant scripts as nodes
};

export interface CustomizableLanguageDetails {
  displayName?: string;
  scriptOverride?: IScript | null;
  region?: IRegion | null;
  dialect?: string;
};

export const UNLISTED_LANGUAGE_NODE_ID = "unlisted-language";
export const UNLISTED_LANGUAGE_NODE = {
  nodeData: {
    code: "qaa",
    autonym: undefined,
    exonym: "Unknown Lanuage",
    regionNames: "",
    scripts: [],
    alternativeTags: [],
    names: "",
  } as ILanguage,
  id: UNLISTED_LANGUAGE_NODE_ID,
  nodeType: NodeType.Language,
  childNodes: [],
} as OptionNode;
export const SCRIPT_OVERRIDE_NODE_ID = "script-override";


export const useLanguagePicker = (
  searchResultModifier?: (
    results: FuseResult<ILanguage>[],
    searchString: string
  ) => ILanguage[]
) => {
  const [searchString, setSearchString] = useState("");
  const [selectedLanguageNode, setSelectedLanguageNode] = useState<
    OptionNode | undefined
  >();
  const [selectedScriptNode, setSelectedScriptNode] = useState<
    OptionNode | undefined
  >();

  // So we don't flip things between controlled and uncontrolled inputs
  const EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS = {
    displayName: "",
    scriptOverride: null,
    region: null,
    dialect: "",
  } as CustomizableLanguageDetails;

  const [CustomizableLanguageDetails, setCustomizableLanguageDetails] =
    useState<CustomizableLanguageDetails>(EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS);

  EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS;

  const clearCustomizableLanguageDetails = () => {
    setCustomizableLanguageDetails(EMPTY_CUSTOMIZABLE_LANGUAGE_DETAILS);
  };

  const isReadyToSubmit =
    !!selectedLanguageNode &&
    (!!selectedScriptNode || selectedLanguageNode.childNodes?.length === 0);

  const languageData = useMemo(() => {
    if (searchString.length < 2) {
      return [];
    }
    return getModifiedSearchResults(searchString, searchResultModifier);
  }, [searchString]);

  // For reopening to a specific selection. We should then also set the search string
  // such that the selected language is visible
  // *Note that if the desired script is a script of the desired language, it must be
  // passed in the scriptCode argument rather than as a script override
  function reopenTo(
    languageCode: string,
    scriptCode?: string,
    customDetails?: CustomizableLanguageDetails
  ) {
    // TODO what if there is a language code that is also the start of so many language names
    // that the language card with that code isn't initially visible and one must scroll to see it?
    // Do we need to make the language picker scroll to it? Seems like overkill to me
    onSearchStringChange(languageCode);
    // TODO this is inneficient... languageData won't get updated until rerender
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
        const desiredScriptNode = desiredLanguageNode.childNodes.find(
          (scriptNode) => scriptNode.nodeData.code === scriptCode
        );
        if (desiredScriptNode) {
          setSelectedScriptNode(desiredScriptNode);
        }
      }
    }
    saveCustomizableLanguageDetails(customDetails || {});
  }

  // details should only include the properties it wants to modify
  const saveCustomizableLanguageDetails = (
    details: CustomizableLanguageDetails
  ) => {
    // first check if the script override really is an override
    if (details.scriptOverride) {
      for (const scriptNode of selectedLanguageNode?.childNodes || []) {
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
        nodeType: NodeType.Script,
        childNodes: [],
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
      const languageNode: OptionNode = {
        nodeData: language,
        id: stripDemarcation(language.code),
        nodeType: NodeType.Language,
        childNodes: [],
      };

      const scriptNodes = language.scripts.map((script) => {
        return {
          nodeData: script,
          id: script.code,
          nodeType: NodeType.Script,
          childNodes: [],
        } as OptionNode;
      });

      languageNode.childNodes = scriptNodes;
      return languageNode;
    });
    return languageData;
  }

  const toggleSelectNode = (node: OptionNode) => {
    if (!node) {
      console.error("no node selected");
      return;
    } else if (node.nodeType === NodeType.Language) {
      if (node.id === selectedLanguageNode?.id) {
        // Clicking on the selected language node unselects it and clears data specific to that language
        setSelectedLanguageNode(undefined);
        setSelectedScriptNode(undefined);
        clearCustomizableLanguageDetails();
        return;
      } else {
        setSelectedLanguageNode(node);
        setSelectedScriptNode(
          node.childNodes.length == 1 ? node.childNodes[0] : undefined
        );
        setCustomizableLanguageDetails({
          displayName: stripDemarcation(
            node.nodeData.autonym || node.nodeData.exonym || ""
          ),
        } as CustomizableLanguageDetails);
        return;
      }
    } else if (node.nodeType === NodeType.Script) {
      if (node.id === selectedScriptNode?.id) {
        // clicking on the selected script node unselects it
        setSelectedScriptNode(undefined);
        return;
      } else if (node.nodeType === NodeType.Script) {
        setSelectedScriptNode(node);
      }
    }
  };

  const selectUnlistedLanguage = () => {
    setSelectedLanguageNode(UNLISTED_LANGUAGE_NODE);
    setSelectedScriptNode(undefined);
    clearCustomizableLanguageDetails();
  };

  const onSearchStringChange = (searchString: string) => {
    setSearchString(searchString);
    setSelectedLanguageNode(undefined);
    setSelectedScriptNode(undefined);
    clearCustomizableLanguageDetails();
  };

  return {
    languageData,
    selectedLanguageNode,
    selectedScriptNode,
    CustomizableLanguageDetails,
    searchString,
    onSearchStringChange,
    toggleSelectNode,
    isReadyToSubmit,
    saveCustomizableLanguageDetails,
    selectUnlistedLanguage,
    reopenTo,
  };
};


// We show the unlisted language controls unles a language is selected
export function shouldShowUnlistedLanguageControls(
  selectedLanguageNode: OptionNode | undefined
) {
  return (
    selectedLanguageNode === undefined ||
    selectedLanguageNode.id === UNLISTED_LANGUAGE_NODE_ID
  );
}
