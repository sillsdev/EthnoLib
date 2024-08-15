/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

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

import {
  codeMatches,
  ILanguage,
  IScript,
  stripDemarcation,
} from "@ethnolib/find-language";
import { LanguageCard } from "./LanguageCard";
import { ScriptCard } from "./ScriptCard";
import { COLORS } from "./colors";
import {
  useLanguagePicker,
  isUnlistedLanguage,
  ILanguagePickerInitialState,
  ILanguagePicker,
} from "../../common/useLanguagePicker";
import { createTag } from "@ethnolib/find-language/languageTagUtils";
import { debounce } from "lodash";
import "./styles.css";
import { CustomizeLanguageButton } from "./CustomizeLanguageButton";
import { useEffect, useState } from "react";
import { CustomizeLanguageDialog } from "./CustomizeLanguageDialog";
import LazyLoad from "react-lazyload";
import { FuseResult } from "fuse.js";

export const LanguagePicker: React.FunctionComponent<{
  searchResultModifier: (results: FuseResult<ILanguage>[]) => ILanguage[];
  initialState: ILanguagePickerInitialState;
}> = (props) => {
  const lp: ILanguagePicker = useLanguagePicker(props.searchResultModifier);

  useEffect(() => {
    lp.resetTo(props.initialState);
    // We only want this to run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [customizeLanguageDialogOpen, setCustomizeLanguageDialogOpen] =
    useState(false);

  // Used for both the tag preview on the right panel and the Customize/Create Unlisted Language button
  const currentTagPreview = createTag({
    languageCode: stripDemarcation(lp.selectedLanguage?.displayCode),
    scriptCode: stripDemarcation(lp.selectedScript?.code),
    regionCode: stripDemarcation(lp.customizableLanguageDetails?.region?.code),
    dialectCode: lp.selectedLanguage
      ? lp.customizableLanguageDetails?.dialect
      : lp.searchString, // we put the searchString in only when there is no language selected.
    // And in that case we don't show a language tag preview on the right panel anyway. Therefore the
    // search string never shows up in the right panel tag preview
  });

  return (
    <div
      id="lang-picker"
      css={css`
        width: 1500px;
        background-color: ${COLORS.greys[0]};
        border-radius: 10px;
        position: relative;
        margin-left: auto;
        margin-right: auto;
        overflow: hidden;
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
                lp.onSearchStringChange(e.target.value);
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
            {lp.languageData.map((language, index) => {
              return (
                <LazyLoad
                  height={"125px"} // the min height we set on the language card
                  overflow={true}
                  key={index} // TODO this should be language.iso639_3_code, but that breaks the lazyload for some reason! (try searching "uzb")
                >
                  <LanguageCard
                    css={css`
                      width: 100%;
                      min-height: 125px;
                      flex-direction: column;
                      margin: 10px 0px;
                    `}
                    languageCardData={language}
                    isSelected={codeMatches(
                      language.iso639_3_code,
                      lp.selectedLanguage?.iso639_3_code
                    )}
                    onClick={() => lp.toggleSelectLanguage(language)}
                  ></LanguageCard>
                  {codeMatches(
                    language.iso639_3_code,
                    lp.selectedLanguage?.iso639_3_code
                  ) &&
                    language.scripts.length > 1 && (
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
                        {language.scripts.map((script: IScript) => {
                          return (
                            <ListItem
                              key={script.code}
                              css={css`
                                margin-right: 0;
                                padding-right: 0;
                                width: fit-content;
                              `}
                            >
                              <ScriptCard
                                css={css`
                                  min-width: 175px;
                                `}
                                scriptData={script}
                                isSelected={codeMatches(
                                  script.code,
                                  lp.selectedScript?.code
                                )}
                                onClick={() => lp.toggleSelectScript(script)}
                              />
                            </ListItem>
                          );
                        })}
                      </List>
                    )}
                </LazyLoad>
              );
            })}
          </div>
          <CustomizeLanguageButton
            currentTagPreview={currentTagPreview}
            forUnlistedLanguage={
              !lp.selectedLanguage || isUnlistedLanguage(lp.selectedLanguage)
            }
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
          {lp.selectedLanguage && (
            <div id="right-pane-language-details=section">
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
                value={lp.customizableLanguageDetails.displayName}
                onChange={(e) => {
                  lp.saveLanguageDetails({
                    displayName: e.target.value,
                  });
                }}
              />
              <Typography
                css={css`
                  color: ${COLORS.greys[3]};
                  font-family: "Roboto Mono", monospace;
                `}
              >
                {currentTagPreview}
              </Typography>
            </div>
          )}

          <div
            id="buttons-container"
            css={css`
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
              disabled={!lp.isReadyToSubmit}
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
        selectedLanguage={lp.selectedLanguage}
        selectedScript={lp.selectedScript}
        customizableLanguageDetails={lp.customizableLanguageDetails}
        saveLanguageDetails={lp.saveLanguageDetails}
        selectUnlistedLanguage={lp.selectUnlistedLanguage}
        searchString={lp.searchString}
        onClose={() => setCustomizeLanguageDialogOpen(false)}
      />
    </div>
  );
};
