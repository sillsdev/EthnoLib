/** @jsxImportSource @emotion/react */
import { css, ThemeProvider } from "@emotion/react";

import {
  createTheme,
  Icon,
  IconButton,
  InputAdornment,
  lighten,
  List,
  ListItem,
  OutlinedInput,
  Typography,
  useTheme,
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
import { useEffect, useRef, useState } from "react";
import { CustomizeLanguageDialog } from "./CustomizeLanguageDialog";
import LazyLoad from "react-lazyload";
import { FuseResult } from "fuse.js";
import { FormFieldLabel } from "./FormFieldLabel";
import { TypographyOptions } from "@mui/material/styles/createTypography";

// so we can put "lighter" in the mui theme palette
// https://mui.com/material-ui/customization/palette/#typescript-2
declare module "@mui/material/styles" {
  interface PaletteColor {
    lighter?: string;
    lightest?: string;
  }

  interface SimplePaletteColorOptions {
    lighter?: string;
    lightest?: string;
  }
}

const languageChooserTypography: TypographyOptions = {
  // TODO future work: figure out how to incorporate base theme typography?
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
};

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
  languageCardBackgroundColorOverride?: string; // If not provided, will use theme.palette.primary.lighter if present or fall back to lighten(primaryColor, 0.7)
  scriptCardBackgroundColorOverride?: string; // If not provided, will use theme.palette.primary.lightest if present or fall back to lighten(primaryColor, 0.88)
}

export const LanguageChooser: React.FunctionComponent<ILanguageChooserProps> = (
  props
) => {
  const lp: ILanguageChooser = useLanguageChooser(props.searchResultModifier);

  useEffect(() => {
    if (searchInputRef) {
      searchInputRef.value = props.initialSearchString || "";
      searchInputRef.focus();
    }
    lp.resetTo(
      props.initialSearchString || "",
      props.initialSelectionLanguageTag,
      props.initialCustomDisplayName
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // We only want this to run once

  // on first load, if there is an initialSelectionLanguageTag, we want to scroll to the selected language card
  const [initialScrollingNeeded, setInitialScrollingNeeded] = useState(
    !!props.initialSelectionLanguageTag
  );
  const selectedLanguageCardRef = useRef<HTMLDivElement>(null);
  useEffect(
    () => {
      if (
        initialScrollingNeeded &&
        props.initialSelectionLanguageTag &&
        selectedLanguageCardRef.current
      ) {
        selectedLanguageCardRef.current?.scrollIntoView({
          block: "center",
        });
        setInitialScrollingNeeded(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      // The ref is not ready yet when this first runs, so we rely on the selectedLanguageCardRef.current dependency to trigger it.
      // Even though "Mutable values aren't valid dependencies because mutating them doesn't re-render the component", it still triggers
      // the effect which does the scrolling, and then the effect calls setInitialScrollingNeeded which triggers a re-render and so syncs the state back up.
      selectedLanguageCardRef.current,
      initialScrollingNeeded,
      props.initialSelectionLanguageTag,
    ]
  );

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

  // Scroll to top whenever the language list changes
  const languageCardListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    languageCardListRef.current?.scrollTo(0, 0);
  }, [lp.languageData]);

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
    searchInputRef?.focus();
  };

  const originalTheme = useTheme();
  const primaryMainColor = originalTheme.palette.primary.main;
  const theme = createTheme({
    ...originalTheme,
    typography: languageChooserTypography,
    palette: {
      ...originalTheme.palette,
      primary: {
        ...originalTheme.palette.primary,
        // mui palettes have a "light" also, but for the card backgrounds we want very light colors, lighter than "light" usually is
        lighter:
          props.languageCardBackgroundColorOverride ||
          originalTheme.palette.primary.lighter ||
          lighten(primaryMainColor, 0.7),
        lightest:
          props.scriptCardBackgroundColorOverride ||
          originalTheme.palette.primary.lightest ||
          lighten(primaryMainColor, 0.88),
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
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
            background-color: ${theme.palette.grey[50]};
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
                  color: ${theme.palette.grey[400]};
                `}
              >
                <Icon component={SearchIcon} />
              </InputAdornment>
            }
            endAdornment={
              <IconButton
                data-testid="clear-search-X-button"
                onClick={clearSearchText}
                css={css`
                  padding-right: 0px;
                `}
              >
                <ClearIcon />
              </IconButton>
            }
            id="search-bar"
            data-testid="search-bar"
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
            ref={languageCardListRef}
          >
            {lp.languageData.map((language, index) => {
              const isSelectedLanguageCard = codeMatches(
                language.iso639_3_code,
                lp.selectedLanguage?.iso639_3_code
              );
              return (
                <div
                  key={index}
                  // We use this ref to scroll the initially selected language card into view
                  ref={
                    isSelectedLanguageCard ? selectedLanguageCardRef : undefined
                  }
                >
                  <LazyLoad
                    offset={initialScrollingNeeded ? 1000000 : 500} // Normally, load a 500px buffer under the visible area so we don't have to get the calculation perfect. But if initial scrolling is needed, load everything so we can scroll the appropriate amount
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
                      isSelected={isSelectedLanguageCard}
                      onClick={() => lp.toggleSelectLanguage(language)}
                    ></LanguageCard>
                    {codeMatches(
                      language.iso639_3_code,
                      lp.selectedLanguage?.iso639_3_code
                    ) &&
                      language.scripts.length > 1 && (
                        <List
                          css={css`
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
                </div>
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
                    color: ${theme.palette.grey[700]};
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
        key={lp.selectedLanguage?.iso639_3 + "_" + lp.selectedScript?.code} // This is to force a re-render when the user has changed language or script selection and then reopens dialog
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
