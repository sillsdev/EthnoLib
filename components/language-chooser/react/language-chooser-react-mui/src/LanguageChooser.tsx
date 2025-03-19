/** @jsxImportSource @emotion/react */
import { css, ThemeProvider } from "@emotion/react";
import { useLingui, Trans } from "@lingui/react/macro";

import {
  ScopedCssBaseline,
  Button,
  createTheme,
  Fade,
  Icon,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  OutlinedInput,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  codeMatches,
  ILanguage,
  IScript,
  IOrthography,
  isUnlistedLanguage,
  createTagFromOrthography,
  isManuallyEnteredTagLanguage,
  isValidBcp47Tag,
} from "@ethnolib/find-language";
import { LanguageCard } from "./LanguageCard";
import { ScriptCard } from "./ScriptCard";
import {
  useLanguageChooser,
  ILanguageChooser,
  isReadyToSubmit,
  defaultDisplayName,
} from "@ethnolib/language-chooser-react-hook";
import { debounce } from "lodash";
import { useEffect, useRef, useState } from "react";
import { CustomizeLanguageDialog } from "./CustomizeLanguageDialog";
import LazyLoad from "react-lazyload";
import { FuseResult } from "fuse.js";
import { FormFieldLabel } from "./FormFieldLabel";
import { TypographyOptions } from "@mui/material/styles/createTypography";
import { PrimaryTooltip } from "./PrimaryTooltip";
import { I18nProvider } from "../../common/I18nProvider";

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
    // Used for language codes and tags
    fontFamily: "Roboto Mono, monospace",
    fontSize: "0.875rem",
    letterSpacing: "0.05rem",
  },
};

const LANG_CARD_MIN_HEIGHT = "90px"; // The height of typical card - 1 line of alternate names and 1 line of regions

export interface ILanguageChooserProps {
  uiLanguage?: string; // defaults to English
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
  languageCardBackgroundColorOverride?: string; // If not provided, will use lighten(primaryColor, 0.7)
  scriptCardBackgroundColorOverride?: string; // If not provided, will use lighten(primaryColor, 0.88)
}

// We want localization to be handled internal to this library.
// So any UI component a client may include must be wrapped in an I18nProvider.
// We need this wrapper or else calling useLingui() will throw an error.
export const LanguageChooser: React.FunctionComponent<ILanguageChooserProps> = (
  props
) => {
  return (
    <I18nProvider locale={props.uiLanguage}>
      <LanguageChooserInner {...props} />
    </I18nProvider>
  );
};

export const LanguageChooserInner: React.FunctionComponent<
  ILanguageChooserProps
> = (props) => {
  const { t } = useLingui();
  const lp: ILanguageChooser = useLanguageChooser(
    props.onSelectionChange,
    props.searchResultModifier
  );

  // If we need to show language cards on initial load, we paint the language chooser first and then show skeleton until the cards are ready
  const [isWaitingForResults, setIsWaitingForResults] = useState(false);

  useEffect(() => {
    if (searchInputRef) {
      searchInputRef.value = props.initialSearchString || "";
      searchInputRef.focus();
    }
    if (props.initialSearchString) {
      // Show the skeleton while waiting for search results
      setIsWaitingForResults(true);
    }
    setTimeout(() => {
      // This can take a bit, so push it to the end of the event queue so that we paint the rest of the component first
      lp.resetTo(
        props.initialSearchString || "",
        props.initialSelectionLanguageTag,
        props.initialCustomDisplayName
      );
      setIsWaitingForResults(false);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // We only want this to run once

  const [customizeLanguageDialogOpen, setCustomizeLanguageDialogOpen] =
    useState(false);

  // Show a tooltip prompting user to start typing, only on first load, until they start typing
  const [showInitialPrompt, setShowInitialPrompt] = useState(
    !props.initialSearchString
  );
  useEffect(() => {
    if (showInitialPrompt && (lp.searchString || customizeLanguageDialogOpen)) {
      setShowInitialPrompt(false);
    }
    // No reason for this to be triggered by changes to showInitialPrompt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lp.searchString, customizeLanguageDialogOpen]);

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

  // Scroll to top whenever the language list changes
  const languageCardListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    languageCardListRef.current?.scrollTo(0, 0);
  }, [lp.languageResults]);

  // Used for both the tag preview on the right panel and the Customize/Create Unlisted Language button
  const currentTagPreview = createTagFromOrthography({
    language: lp.selectedLanguage,
    script: lp.selectedScript,
    customDetails: lp.selectedLanguage
      ? lp.customizableLanguageDetails
      : { dialect: lp.searchString }, // we put the searchString in only when there is no language selected.
    // And in that case we don't show a language tag preview on the right panel anyway. Therefore the
    // search string never shows up in the right panel tag preview
  } as IOrthography);

  let searchInputRef: HTMLInputElement | null = null;
  const clearSearchText = () => {
    if (searchInputRef) {
      searchInputRef.value = "";
    }
    lp.onSearchStringChange("");
    searchInputRef?.focus();
  };

  const originalTheme = useTheme();
  const theme = createTheme({
    ...originalTheme,
    typography: languageChooserTypography,
  });

  function toggleSelectLanguage(language: ILanguage) {
    if (
      codeMatches(language.iso639_3_code, lp.selectedLanguage?.iso639_3_code)
    ) {
      // Clicking on the selected language unselects it
      lp.clearLanguageSelection();
    } else {
      lp.selectLanguage(language);
    }
  }

  function toggleSelectScript(script: IScript) {
    if (codeMatches(script.code, lp.selectedScript?.code)) {
      // clicking on the selected script unselects it
      lp.clearScriptSelection();
    } else {
      lp.selectScript(script);
    }
  }

  const showUnlistedLanguageOptions =
    !lp.selectedLanguage || isUnlistedLanguage(lp.selectedLanguage);

  const manualTagLanguageSelected = isManuallyEnteredTagLanguage(
    lp.selectedLanguage
  );

  function promptForManualTagEntry(
    defaultValue: string | undefined,
    cancelIfEmpty?: boolean // If true, then pressing ok with empty input is treated the same as pressing cancel, otherwise it will clear the selection
    // Probably makes sense to use cancelIfEmpty when there is no default value
  ): void {
    const customTag = window.prompt(
      t`If this user interface is not offering you a code that you know is valid ISO 639 code, you can enter it here:`,
      defaultValue
    );
    if (customTag === null || (cancelIfEmpty && customTag.length === 0)) {
      return;
    }
    if (customTag && !isValidBcp47Tag(customTag)) {
      alert(t`This is not in a valid IETF BCP 47 format: ${customTag}`);
      return;
    }
    // clear previous search string and selection
    clearSearchText();
    setCustomizeLanguageDialogOpen(false);

    if (customTag.length > 0) {
      lp.selectManuallyEnteredTagLanguage(customTag);
    }
  }

  // When a card is selected, scroll that card to the top, so that if it has script cards under it they become visible
  useEffect(() => {
    if (selectedLanguageCardRef.current && lp.selectedLanguage) {
      selectedLanguageCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [lp.selectedLanguage]);

  return (
    <ThemeProvider theme={theme}>
      <ScopedCssBaseline // Puts box-sizing: border-box and other "normalizations" on all descendants
        css={css`
          height: 100%;
        `}
      >
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
              label={t`Search by name, code, or country`}
            />
            <PrimaryTooltip
              title={
                <>
                  <Trans>Start typing to find your language.</Trans>
                  <br />
                  <br />
                  <Trans>
                    We have a list of almost every known language, where it is
                    spoken, and how it is written.
                  </Trans>
                </>
              }
              placement="right"
              open={showInitialPrompt}
              onClose={() => setShowInitialPrompt(false)}
              disableFocusListener
              disableHoverListener
              disableTouchListener
              slots={{
                transition: Fade,
              }}
              slotProps={{
                transition: { timeout: 200 },
              }}
            >
              {/* Wrapping div stabilizes the tooltip position */}
              <div>
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
              </div>
            </PrimaryTooltip>
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
              {isWaitingForResults &&
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    variant="rounded"
                    height={LANG_CARD_MIN_HEIGHT}
                    css={css`
                      margin: 5px 0px;
                    `}
                  />
                ))}
              {lp.languageResults.map((language, index) => {
                const isSelectedLanguageCard = codeMatches(
                  language.iso639_3_code,
                  lp.selectedLanguage?.iso639_3_code
                );
                return (
                  <div
                    key={index}
                    // We use this ref to scroll the initially selected language card into view
                    ref={
                      isSelectedLanguageCard
                        ? selectedLanguageCardRef
                        : undefined
                    }
                  >
                    <LazyLoad
                      offset={500} // Load a 500px buffer under the visible area so we don't have to get the calculation perfect
                      height={LANG_CARD_MIN_HEIGHT} // needs to match the min-height we set on the language card
                      overflow={true}
                      // Enhance: If we need to speed things up, it would be more efficient to use the iso code as the key
                      // though that currently would cause lazyload to show gaps (placeholders?) in the list (try searching "eng")
                      // so we would probably need to use forceCheck on the lazyload
                      key={index}
                    >
                      <LanguageCard
                        css={css`
                          min-height: ${LANG_CARD_MIN_HEIGHT};
                          flex-direction: column;
                          margin: 5px 0px;
                        `}
                        languageCardData={language}
                        isSelected={isSelectedLanguageCard}
                        onClick={() => toggleSelectLanguage(language)}
                        // If languageCardBackgroundColorOverride is not provided, LanguageCard will fall back toa default based on the primary color
                        backgroundColorWhenSelected={
                          props.languageCardBackgroundColorOverride
                        }
                        backgroundColorWhenNotSelected={
                          theme.palette.background.paper
                        }
                      ></LanguageCard>
                      {codeMatches(
                        language.iso639_3_code,
                        lp.selectedLanguage?.iso639_3_code
                      ) &&
                        language.scripts.length > 1 && (
                          <PrimaryTooltip
                            title={t`Select a script`}
                            placement="right"
                            open={!lp.selectedScript}
                            css={css`
                              // hide popper when reference element (the script cards) is scrolled out of view
                              // https://popper.js.org/docs/v2/modifiers/hide/
                              &[data-popper-reference-hidden] {
                                visibility: hidden;
                                pointer-events: none;
                              }

                              // Also hide the popper if the customization dialog is open
                              ${customizeLanguageDialogOpen
                                ? `
                                  visibility: hidden;
                                  pointer-events: none;
                                `
                                : ""}
                            `}
                          >
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
                                      onClick={() => toggleSelectScript(script)}
                                      // If scriptCardBackgroundColorOverride is not provided, ScriptCard will fall back to a default based on the primary color
                                      backgroundColorWhenSelected={
                                        props.scriptCardBackgroundColorOverride
                                      }
                                      backgroundColorWhenNotSelected={
                                        theme.palette.background.paper
                                      }
                                    />
                                  </ListItem>
                                );
                              })}
                            </List>
                          </PrimaryTooltip>
                        )}
                    </LazyLoad>
                  </div>
                );
              })}
            </div>
            <div
              id="bottom-of-left-pane"
              css={css`
                padding-top: 10px;
              `}
            >
              <Button
                data-testid="customization-button"
                variant="outlined"
                color="primary"
                css={css`
                  min-width: 60%;
                  border: 1.5px solid ${theme.palette.grey[300]};
                  :hover {
                    border-color: ${theme.palette.text.primary};
                  }
                  background-color: ${theme.palette.background.paper};
                  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
                  display: flex;
                  flex-direction: column;
                  align-items: flex-start;
                  text-transform: none;
                  padding: 5px 7px;
                `}
                onClick={() =>
                  manualTagLanguageSelected
                    ? promptForManualTagEntry(currentTagPreview)
                    : setCustomizeLanguageDialogOpen(true)
                }
              >
                {/* Have MUI align the icon */}
                <Stack
                  alignItems="center"
                  direction="row"
                  gap={0.5}
                  css={css`
                    color: ${theme.palette.text.primary};
                  `}
                >
                  {!showUnlistedLanguageOptions && (
                    <EditIcon
                      css={css`
                        font-size: 1rem;
                      `}
                    />
                  )}
                  <Typography
                    css={css`
                      text-transform: uppercase;
                      font-size: 0.75rem;
                      font-weight: bold;
                    `}
                  >
                    {showUnlistedLanguageOptions
                      ? t`Create Unlisted Language`
                      : manualTagLanguageSelected
                        ? t`Edit Language Tag`
                        : t`Customize`}
                  </Typography>
                </Stack>

                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    width: 100%;
                    justify-content: space-between;
                  `}
                >
                  <Typography
                    variant="body2"
                    css={css`
                      text-align: left;
                      color: ${theme.palette.grey[700]};
                    `}
                  >
                    {currentTagPreview}
                  </Typography>
                  {!manualTagLanguageSelected && (
                    <PrimaryTooltip
                      title={
                        showUnlistedLanguageOptions ? (
                          <Trans>
                            If you cannot find a language and it does not appear
                            in ethnologue.com, you can instead define the
                            language here.
                          </Trans>
                        ) : (
                          <Trans>
                            If you found the main language but need to change
                            some of the specifics like Script or Dialect, you
                            can do that here.
                          </Trans>
                        )
                      }
                    >
                      <InfoOutlinedIcon
                        css={css`
                          color: ${theme.palette.grey[700]};
                          margin-left: 10px;
                        `}
                      />
                    </PrimaryTooltip>
                  )}
                </div>
              </Button>
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
                    label={t`Display this language this way`}
                    required={
                      // If submission is prevented only because a display name is still needed, show the red "required" label
                      !lp.readyToSubmit &&
                      // We would be ready to submit if we just added a display name
                      isReadyToSubmit({
                        language: lp.selectedLanguage,
                        script: lp.selectedScript,
                        customDetails: {
                          ...lp.customizableLanguageDetails,
                          customDisplayName: "hypotheticalDisplayName",
                        },
                      })
                    }
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
                    value={
                      lp.customizableLanguageDetails.customDisplayName !==
                      undefined
                        ? lp.customizableLanguageDetails.customDisplayName
                        : defaultDisplayName(
                            lp.selectedLanguage,
                            lp.selectedScript
                          )
                    }
                    onChange={(e) => {
                      lp.saveLanguageDetails(
                        {
                          ...lp.customizableLanguageDetails,
                          customDisplayName: e.target.value,
                        },
                        lp.selectedScript
                      );
                    }}
                  />
                  <Typography
                    variant="body2"
                    data-testid="right-panel-langtag-preview"
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
          promptForManualTagEntry={promptForManualTagEntry}
          searchString={lp.searchString}
          onClose={() => setCustomizeLanguageDialogOpen(false)}
        />
      </ScopedCssBaseline>
    </ThemeProvider>
  );
};
