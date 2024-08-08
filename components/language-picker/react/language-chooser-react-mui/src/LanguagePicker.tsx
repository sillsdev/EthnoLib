/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { ILanguage, IScript } from "@ethnolib/find-language";
import { LanguageCard } from "./LanguageCard";
import {
  AppBar,
  Button,
  CardActionArea,
  Icon,
  InputAdornment,
  List,
  ListItem,
  OutlinedInput,
  Toolbar,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { ScriptCard } from "./ScriptCard";
import { COLORS } from "./Colors";
import {
  useLanguagePicker,
  shouldShowUnlistedLanguageControls,
  ILanguagePickerInitialState,
} from "../../common/useLanguagePicker";
import { OptionNode, NodeType } from "../../common/useLanguagePicker";
import { createTag } from "@ethnolib/find-language/languageTagUtils";
import { debounce } from "lodash";
import "./styles.css";
import { CustomizeLanguageButton } from "./CustomizeLanguageButton";
import { useEffect, useState } from "react";
import { CustomizeLanguageDialog } from "./CustomizeLanguageDialog";
import LazyLoad from "react-lazyload";
import { FuseResult } from "fuse.js";

export const LanguagePicker: React.FunctionComponent<{
  searchResultModifier: (
    results: FuseResult<ILanguage>[],
    searchString: string
  ) => ILanguage[];
  getInitialState: () => ILanguagePickerInitialState;
}> = (props) => {
  const {
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
  } = useLanguagePicker(props.searchResultModifier);

  useEffect(() => {
    const initialState = props.getInitialState();
    reopenTo(initialState);
  }, []);

  const [customizeLanguageDialogOpen, setCustomizeLanguageDialogOpen] =
    useState(false);

  const currentTagPreview = createTag({
    languageCode: selectedLanguageNode?.nodeData.code,
    scriptCode: selectedScriptNode?.nodeData.code,
    regionCode: CustomizableLanguageDetails?.region?.code,
    dialectCode: selectedLanguageNode
      ? CustomizableLanguageDetails?.dialect
      : searchString,
  });

  return (
    <div
      id="lang-picker-container"
      css={css`
        width: 1500px;
        background-color: ${COLORS.greys[0]};
        border-radius: 10px;
        position: relative;
        margin-left: auto;
        margin-right: auto;
        overflow: hidden; // TODO otherwise things cover the rounded corners. Better way to fix?
      `}
    >
      <AppBar
        position="static"
        css={css`
          background-color: white;
          box-shadow: none;
          border-bottom: 2px solid ${COLORS.greys[1]};
        `}
      >
        <Toolbar
          disableGutters
          css={css`
            padding-left: 15px;
          `}
        >
          <Typography
            variant="h6"
            component="div"
            css={css`
              color: black;
              font-weight: bold;
            `}
          >
            Choose Language
          </Typography>
        </Toolbar>
      </AppBar>
      <div
        id="lang-picker-body"
        css={css`
          height: 750px;
          display: flex;
        `}
      >
        <div
          id="left-pane"
          css={css`
            width: 50%;
            height: 100%;
            position: relative;
            display: flex; // to make the language list overflow scroll work
            flex-direction: column;
            padding: 15px 15px 25px 25px;
          `}
        >
          <label htmlFor="search-bar">
            <Typography
              css={css`
                color: ${COLORS.greys[3]};
                font-weight: bold;
                margin-bottom: 5px;
              `}
            >
              Search by name, code, or country
            </Typography>
          </label>
          <OutlinedInput
            type="text"
            css={css`
              background-color: white;
              margin-right: 0;
              margin-bottom: 10px;
            `}
            endAdornment={
              <InputAdornment
                position="end"
                css={css`
                  margin-right: 0;
                `}
              >
                <Icon component={SearchIcon} />
              </InputAdornment>
            }
            id="search-bar"
            fullWidth
            onChange={(e) => {
              debounce(async () => {
                onSearchStringChange(e.target.value);
              }, 0)();
            }}
          />
          <div
            id="language-card-list"
            css={css`
              overflow-y: auto;
              scrollbar-width: thick;
              flex-basis: 0;
              flex-grow: 1;
            `}
          >
            {languageData.map((languageNode, index) => {
              if (languageNode.nodeType !== NodeType.Language) {
                console.error(
                  "unexpected node is not language node: ",
                  languageNode.id
                );
                return <></>;
              }
              return (
                <LazyLoad
                  height={"125px"} // the min height we set on the language card
                  overflow={true}
                  key={index} // TODO this should be languageNode.id, but that breaks the lazyload for some reason! (try searching "uzb")
                >
                  <CardActionArea
                    onClick={() => toggleSelectNode(languageNode)}
                    css={css`
                      margin: 10px 0px;
                    `}
                  >
                    <LanguageCard
                      css={css`
                        width: 100%;
                        min-height: 125px;
                        flex-direction: column;
                      `}
                      languageCardData={languageNode.nodeData as ILanguage}
                      isSelected={languageNode.id === selectedLanguageNode?.id}
                      colorWhenNotSelected={COLORS.white}
                      colorWhenSelected={COLORS.blues[0]}
                    ></LanguageCard>
                  </CardActionArea>
                  {languageNode.id === selectedLanguageNode?.id &&
                    languageNode.childNodes.length > 1 && (
                      <List
                        css={css`
                          width: 100%;
                          display: flex;
                          flex-direction: row;
                          justify-content: flex-end;
                          flex-wrap: wrap;
                          padding-left: 30px;
                        `}
                      >
                        {languageNode.childNodes.map(
                          (scriptNode: OptionNode) => {
                            if (scriptNode.nodeType !== NodeType.Script) {
                              // this shouldn't happen
                              console.error(
                                "unexpected node is not script: ",
                                scriptNode.id
                              );
                              return;
                            }
                            return (
                              <ListItem
                                key={scriptNode.id}
                                css={css`
                                  margin-right: 0;
                                  padding-right: 0;
                                  width: fit-content;
                                `}
                              >
                                <CardActionArea
                                  onClick={() => toggleSelectNode(scriptNode)}
                                >
                                  <ScriptCard
                                    css={css`
                                      min-width: 175px;
                                    `}
                                    scriptData={scriptNode.nodeData as IScript}
                                    isSelected={
                                      scriptNode.id === selectedScriptNode?.id
                                    }
                                    colorWhenNotSelected={COLORS.white}
                                    colorWhenSelected={COLORS.blues[1]}
                                  />
                                </CardActionArea>
                              </ListItem>
                            );
                          }
                        )}
                      </List>
                    )}
                </LazyLoad>
              );
            })}
          </div>
          <CustomizeLanguageButton
            currentTagPreview={currentTagPreview}
            showAsUnlistedLanguage={shouldShowUnlistedLanguageControls(
              selectedLanguageNode
            )}
            css={css`
              min-width: 300px;
              width: fit-content;
              margin-top: 20px;
            `}
            onClick={() => setCustomizeLanguageDialogOpen(true)}
          ></CustomizeLanguageButton>
        </div>
        <div
          id="right-pane"
          css={css`
            width: 50%;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            background-color: white;
            padding: 15px 25px 25px 15px;
          `}
        >
          <div
            id="language-name-bar-container"
            css={css`
              // padding: 10px 25px;
              // width: 50%;
              // height: 100%;
              // position: relative;
            `}
          >
            <label htmlFor="language-name-bar">
              <Typography
                css={css`
                  color: ${COLORS.greys[3]};
                  font-weight: bold;
                `}
              >
                Display this language this way
              </Typography>
            </label>
            <OutlinedInput
              type="text"
              css={css`
                background-color: white;
                margin-right: 16px;
                margin-bottom: 10px;
              `}
              id="language-name-bar"
              fullWidth
              value={CustomizableLanguageDetails.displayName}
              onChange={(e) => {
                saveCustomizableLanguageDetails({
                  displayName: e.target.value,
                });
              }}
            />
          </div>
          <Typography
            css={css`
              color: ${COLORS.greys[3]};
              font-family: "Roboto Mono", monospace;
            `}
          >
            {/* If no language has been selected, the tag preview is qaa-x. 
                We don't want to show this unless the user has specifically 
                selected/modified the unlsited language (which sets selectedLanguageNode 
                to unlisted language).*/}
            {selectedLanguageNode !== undefined && currentTagPreview}
          </Typography>
          <div
            id="buttons-container"
            css={css`
              // position: absolute;
              width: 100%;
              display: flex;
              justify-content: flex-end;
              padding-top: 15px;
            `}
          >
            <Button
              css={css`
                margin-left: auto;
                margin-right: 10px;
                min-width: 100px;
              `}
              variant="contained"
              color="primary"
              disabled={!isReadyToSubmit}
            >
              OK
            </Button>
            <Button
              css={css`
                min-width: 100px;
              `}
              variant="outlined"
              color="primary"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
      <CustomizeLanguageDialog
        open={customizeLanguageDialogOpen}
        selectedLanguageNode={selectedLanguageNode}
        selectedScriptNode={selectedScriptNode}
        customizableLanguageDetails={CustomizableLanguageDetails}
        saveCustomizableLanguageDetails={saveCustomizableLanguageDetails}
        selectUnlistedLanguage={selectUnlistedLanguage}
        searchString={searchString}
        onClose={() => setCustomizeLanguageDialogOpen(false)}
      />
    </div>
  );
};