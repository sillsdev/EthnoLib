/** @jsxImportSource @emotion/react */
import { css, ThemeProvider } from "@emotion/react";

import {
  createTheme,
  Icon,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  OutlinedInput,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

import {
  codeMatches,
  ILanguage,
  IScript,
  stripDemarcation,
  createTag,
  deepStripDemarcation,
} from "@ethnolib/find-language";
import { LanguageCard } from "./LanguageCard";
import { ScriptCard } from "./ScriptCard";
import { COLORS } from "./colors";
import {
  useLanguageChooser,
  isUnlistedLanguage,
  IOrthography,
  ILanguageChooser,
  createTagFromOrthography,
} from "@ethnolib/language-chooser-react-hook";
import { debounce } from "lodash";
import "./styles.css";
import { CustomizeLanguageButton } from "./CustomizeLanguageButton";
import { useEffect, useState } from "react";
import { CustomizeLanguageDialog } from "./CustomizeLanguageDialog";
import LazyLoad from "react-lazyload";
import { FuseResult } from "fuse.js";
import { FormFieldLabel } from "./FormFieldLabel";

// TODO future work: move all the colors used into the theme
export const languageChooserMuiTheme = createTheme({
  palette: {
    primary: {
      main: COLORS.blues[2],
    },
  },
  typography: {
    h1: {
      // Used by the top "Language Chooser" title bar
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: 1.6,
      letterSpacing: "0.0075em",
    },
    h2: {
      // Used for the primary language and script name(s)
      fontSize: "1rem",
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: "0.00938em",
    },
    subtitle1: {
      // Used for list of language regions and other language names
      fontSize: "0.75rem",
      lineHeight: 1.167,
      letterSpacing: "0.001em", // I'm not sure how MUI calculates its default letter spacings, but this looks about right
    },
    body2: {
      // used for language codes and tags
      fontFamily: "Roboto Mono, monospace",
      fontSize: "0.875rem",
      letterSpacing: "0.05rem",
    },
  },
});
const LANG_CARD_MIN_HEIGHT = "90px"; // The height of typical card - 1 line of alternate names and 1 line of regions

export interface ILanguageChooserProps {
  searchResultModifier: (
    results: FuseResult<ILanguage>[],
    searchString: string
  ) => ILanguage[];
  initialSearchString?: string;
  initialSelectionLanguageTag?: string;
  initialCustomDisplayName?: string;
  onSelectionChange?: (
    orthographyInfo: IOrthography | undefined,
    languageTag: string | undefined
  ) => void;
  rightPanelComponent?: React.ReactNode;
  actionButtons?: React.ReactNode;
}

export const LanguageChooser: React.FunctionComponent<ILanguageChooserProps> = (
  props
) => {
  const lp: ILanguageChooser = useLanguageChooser(props.searchResultModifier);

  useEffect(() => {
    if (searchInputRef) {
      searchInputRef.value = props.initialSearchString || "";
    }
    lp.resetTo(
      props.initialSearchString || "",
      props.initialSelectionLanguageTag,
      props.initialCustomDisplayName
    );
  }, []); // We only want this to run once

  const [previousStateWasValidSelection, setPreviousStateWasValidSelection] =
    useState(false);

  useEffect(() => {
    if (props.onSelectionChange) {
      if (lp.isReadyToSubmit) {
        const resultingOrthography = deepStripDemarcation({
          language: lp.selectedLanguage,
          script: lp.selectedScript,
          customDetails: lp.customizableLanguageDetails,
        }) as IOrthography;
        props.onSelectionChange(
          resultingOrthography,
          createTagFromOrthography(resultingOrthography)
        );
        setPreviousStateWasValidSelection(true);
      } else if (previousStateWasValidSelection) {
        props.onSelectionChange(undefined, undefined);
        setPreviousStateWasValidSelection(false);
      }
    }
  }, [lp.selectedLanguage, lp.selectedScript, lp.customizableLanguageDetails]);

  const [customizeLanguageDialogOpen, setCustomizeLanguageDialogOpen] =
    useState(false);

  // Used for both the tag preview on the right panel and the Customize/Create Unlisted Language button
  const currentTagPreview = createTag({
    languageCode: stripDemarcation(lp.selectedLanguage?.languageSubtag),
    scriptCode: stripDemarcation(lp.selectedScript?.code),
    regionCode: stripDemarcation(lp.customizableLanguageDetails?.region?.code),
    dialectCode: lp.selectedLanguage
      ? lp.customizableLanguageDetails?.dialect
      : lp.searchString, // we put the searchString in only when there is no language selected.
    // And in that case we don't show a language tag preview on the right panel anyway. Therefore the
    // search string never shows up in the right panel tag preview
  });

  let searchInputRef: HTMLInputElement | null = null;
  const clearSearchText = () => {
    if (searchInputRef) {
      searchInputRef.value = "";
    }
    lp.onSearchStringChange("");
  };

  return (
    <ThemeProvider theme={languageChooserMuiTheme}>
      <div
        id="lang-chooser-body"
        css={css`
          flex-grow: 1;
          display: flex;
          width: 100%;
          height: 100%;
        `}
      >
        <div
          id="left-pane"
          css={css`
            flex-grow: 1;
            // height: 100%;
            position: relative;
            display: flex; // to make the language list overflow scroll work
            flex-direction: column;
            padding: 10px 10px 10px 15px;
            background-color: ${COLORS.greys[0]};
          `}
        >
          <FormFieldLabel
            htmlFor="search-bar"
            label="Search by name, code, or country"
          />
          <OutlinedInput
            type="text"
            inputRef={(el) => (searchInputRef = el)} // for displaying initial search string
            css={css`
              background-color: white;
              margin-bottom: 10px;
              width: 100%;
              min-width: 100px;
              padding-left: 10px;
              padding-right: 10px;
            `}
            inputProps={{
              spellCheck: false,
            }}
            size="small"
            startAdornment={
              <InputAdornment
                position="start"
                css={css`
                  margin-left: 0;
                  color: ${COLORS.greys[2]};
                `}
              >
                <Icon component={SearchIcon} />
              </InputAdornment>
            }
            endAdornment={
              <IconButton
                onClick={clearSearchText}
                css={css`
                  padding-right: 0px;
                `}
              >
                <ClearIcon />
              </IconButton>
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
                  height={LANG_CARD_MIN_HEIGHT} // needs to match the min-height we set on the language card
                  overflow={true}
                  // Enhance: If we need to speed things up, it would be more efficient to use the iso639_3_code as the key
                  // though that currently would cause lazyload to show gaps (placeholders?) in the list (try searching "eng")
                  // so we would probably need to use forceCheck on the lazyload
                  key={index}
                >
                  <LanguageCard
                    css={css`
                      min-height: ${LANG_CARD_MIN_HEIGHT};
                      flex-direction: column;
                      margin: 5px 10px 5px 0px;
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
                          padding: 0px 0px 20px 30px;
                        `}
                      >
                        {language.scripts.map((script: IScript) => {
                          return (
                            <ListItem
                              key={script.code}
                              css={css`
                                padding: 5px 10px;
                                width: fit-content;
                              `}
                            >
                              <ScriptCard
                                css={css`
                                  min-width: 100px;
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
          <div id="bottom-of-left-pane">
            <CustomizeLanguageButton
              currentTagPreview={currentTagPreview}
              forUnlistedLanguage={
                !lp.selectedLanguage || isUnlistedLanguage(lp.selectedLanguage)
              }
              css={css`
                min-width: 60%;
                margin-top: 10px;
              `}
              onClick={() => setCustomizeLanguageDialogOpen(true)}
            ></CustomizeLanguageButton>
          </div>
        </div>
        <div
          id="right-pane"
          css={css`
            width: 421px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background-color: white;
            padding: 10px 15px 10px 20px;
          `}
        >
          <div id="right-panel-component-container">
            {props.rightPanelComponent}
          </div>
          <div id="right-pane-language-chooser-section">
            {lp.selectedLanguage && (
              <div id="right-pane-language-details=section">
                <FormFieldLabel
                  htmlFor="language-name-bar"
                  label="Display this language this way"
                />
                <OutlinedInput
                  type="text"
                  inputProps={{
                    spellCheck: false,
                  }}
                  css={css`
                    background-color: white;
                    margin-bottom: 10px;
                    font-size: 1.625rem; // 26px
                    font-weight: 700;
                  `}
                  id="language-name-bar"
                  size="small"
                  fullWidth
                  value={lp.customizableLanguageDetails.displayName}
                  onChange={(e) => {
                    lp.saveLanguageDetails(
                      {
                        ...lp.customizableLanguageDetails,
                        displayName: e.target.value,
                      },
                      lp.selectedScript
                    );
                  }}
                />
                <Typography
                  variant="body2"
                  css={css`
                    color: ${COLORS.greys[3]};
                  `}
                >
                  {currentTagPreview}
                </Typography>
              </div>
            )}
            {props.actionButtons}
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
    </ThemeProvider>
  );
};
