/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import * as React from "react";
import { useLingui, Trans } from "@lingui/react/macro";
import {
  Autocomplete,
  DialogActions,
  DialogContent,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  Typography,
  Card,
  useTheme,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningIcon from "@mui/icons-material/Warning";
import { TextInput } from "./TextInput";
import {
  getAllRegions,
  getAllScripts,
  ILanguage,
  IRegion,
  IScript,
  ICustomizableLanguageDetails,
  isUnlistedLanguage,
  createTagFromOrthography,
  IOrthography,
} from "@ethnolib/find-language";
import { FormFieldLabel } from "./FormFieldLabel";
import { PrimaryTooltip } from "./PrimaryTooltip";
import { IconAndText } from "./IconAndText";

// ISO-3166-1 is a region code to region name lookup
function getAllRegionOptions() {
  return getAllRegions().map((region: IRegion) => {
    return {
      label: region.name,
      id: region.code,
    };
  });
}

// ISO-15924 is a script code to script name lookup
function getAllScriptOptions() {
  return getAllScripts().map((script: IScript) => {
    return {
      label: script.name,
      id: script.code,
    };
  });
}

export const CustomizeLanguageDialog: React.FunctionComponent<{
  open: boolean;
  selectedLanguage: ILanguage | undefined;
  selectedScript: IScript | undefined;
  customizableLanguageDetails: ICustomizableLanguageDetails;
  saveLanguageDetails: (
    details: ICustomizableLanguageDetails,
    script: IScript | undefined
  ) => void;
  selectUnlistedLanguage: () => void;
  promptForManualTagEntry: (
    defaultValue: string | undefined,
    cancelIfEmtpy?: boolean
  ) => void;
  searchString: string;
  onClose: () => void;
}> = (props) => {
  const { t } = useLingui();
  const isUnlistedLanguageDialog =
    !props.selectedLanguage || isUnlistedLanguage(props.selectedLanguage);

  // Store dialog state. Used to create a tag preview just inside the dialog, before saving anything
  const [dialogSelectedScript, setDialogSelectedScript] = React.useState<
    IScript | undefined
  >();
  const [dialogSelectedRegion, setDialogSelectedRegion] = React.useState<
    IRegion | undefined
  >();
  const [dialogSelectedDialect, setDialogSelectedDialect] =
    React.useState<string>("");

  // Note: if there is a valid manuallyEnteredLanguageTag we automatically close this customization dialog without checking isReadyToSubmit.
  // name (dialect) and country (region) are required for unlisted language
  const isReadyToSubmit =
    !isUnlistedLanguageDialog ||
    (dialogSelectedDialect !== "" && !!dialogSelectedRegion);

  const theme = useTheme();

  // To clear stale values and dynamically prepopulate form every time it is opened
  React.useEffect(() => {
    setDialogSelectedScript(
      // Prepopulate with the selected script only if this language has multiple associated scripts; otherwise the selected script is the default which we can take for granted
      props.selectedScript?.code &&
        (props.selectedLanguage?.scripts?.length || 0) > 1
        ? props.selectedScript
        : undefined
    );
    setDialogSelectedRegion(props.customizableLanguageDetails.region);
    setDialogSelectedDialect(
      // if the user has not selected any language, not even the unlisted language button, then
      // there will be no language details and we suggest the search string as a
      // starting point for the unlisted language name (which is actually stored in the dialect field)
      props.selectedLanguage
        ? props.customizableLanguageDetails.dialect || ""
        : props.searchString
    );
  }, [props]);

  return (
    <Dialog
      onClose={props.onClose}
      open={props.open}
      css={css`
        .MuiDialog-paper {
          padding: 20px 25px 25px 25px;
          display: flex;
          gap: 20px;
        }
      `}
      maxWidth={"xs"}
      fullWidth={true}
      data-testid={"customization-dialog"}
    >
      <DialogTitle
        css={css`
          font-weight: bold;
          padding: 0; //using padding on the entire dialog instead, plus gap between sections
        `}
      >
        {isUnlistedLanguageDialog ? (
          <Trans>Unlisted Language Tag</Trans>
        ) : (
          <Trans>Custom Language Tag</Trans>
        )}
      </DialogTitle>
      <DialogContent
        css={css`
          display: flex;
          flex-direction: column;
          gap: 15px;
          padding: 0; //using padding on the entire dialog instead, plus gap between sections
        `}
      >
        <Card
          variant="outlined"
          css={css`
            border: 1px solid ${theme.palette.primary.main};
            padding: 7px;
            flex-shrink: 0;
            margin-bottom: 10px; // extra space between info box and form fields
          `}
        >
          <Typography
            css={css`
              color: ${theme.palette.primary.main};
              font-size: 0.875rem;
              display: flex;
              align-items: start;
              gap: 7px;
            `}
          >
            <InfoIcon />
            {isUnlistedLanguageDialog ? (
              <Trans>
                If you cannot find a language and it does not appear in
                ethnologue.com, you can instead define the language here.
              </Trans>
            ) : (
              <Trans>
                If you found the main language but need to change some of the
                specifics like Script or Dialect, you can do that here.
              </Trans>
            )}
          </Typography>
        </Card>
        {isUnlistedLanguageDialog && (
          <TextInput
            id="unlisted-lang-name-field"
            label={t`Name`}
            value={dialogSelectedDialect}
            onChange={(event) => {
              setDialogSelectedDialect(event.target.value);
            }}
            size={"small"}
            css={css`
              width: 100%;
            `}
            required={true}
          />
        )}
        {!isUnlistedLanguageDialog && (
          <div id="customize-script-field-wrapper">
            {/* TODO future work: make these fuzzy search */}

            <FormFieldLabel
              htmlFor="customize-script-field"
              label={t`Script`}
            />
            <Autocomplete
              id="customize-script-field"
              value={{
                label: dialogSelectedScript?.name || "",
                id: dialogSelectedScript?.code || "",
              }}
              onChange={(
                _event,
                newValue: { label: string; id: string } | null
              ) => {
                setDialogSelectedScript(
                  newValue
                    ? ({
                        code: newValue.id,
                        name: newValue.label,
                      } as IScript)
                    : undefined
                );
              }}
              options={getAllScriptOptions()}
              renderInput={(params) => <TextField {...params} />}
              size={"small"}
            />
          </div>
        )}

        <div id="customize-region-field-wrapper">
          <FormFieldLabel
            htmlFor="customize-region-field"
            label={t`Country`}
            required={isUnlistedLanguageDialog}
          />
          <Autocomplete
            id="customize-region-field"
            value={{
              label: dialogSelectedRegion?.name || "",
              id: dialogSelectedRegion?.code || "",
            }}
            onChange={(
              _event,
              newValue: { label: string; id: string } | null
            ) => {
              setDialogSelectedRegion(
                newValue
                  ? ({
                      name: newValue.label,
                      code: newValue.id,
                    } as IRegion)
                  : undefined
              );
            }}
            options={getAllRegionOptions()}
            renderInput={(params) => <TextField {...params} />}
            size={"small"}
          />
        </div>
        {!isUnlistedLanguageDialog && (
          <TextInput
            // {/* TODO future work: make this also a autocomplete with registered variants */}
            // {/* use ROLV from langtags repo? */}
            // {/* // from BCP-47 https://www.rfc-editor.org/bcp/bcp47.txt:
            //   // 4.  Variant subtags MUST be registered with IANA according to the
            //   // rules in Section 3.5 of this document before being used to form
            //   // language tags.  In order to distinguish variants from other types
            //   // of subtags, registrations MUST meet the following length and
            //   // content restrictions:

            //   // 1.  Variant subtags that begin with a letter (a-z, A-Z) MUST be
            //   //     at least five characters long.  */}

            // For now, we are putting whatever the user types in the dialect field after "-x-" in the language tag,
            // e.g. "ood-x-pima"
            id="customize-variant-field"
            label={t`Variant (dialect)`}
            value={dialogSelectedDialect}
            onChange={(event) => {
              setDialogSelectedDialect(event.target.value);
            }}
            size={"small"}
            css={css`
              width: 100%;
            `}
            inputProps={{
              spellCheck: false,
            }}
          />
        )}
        <div
          onClick={(event) => {
            if (event.ctrlKey) {
              props.promptForManualTagEntry(undefined, true);
            }
          }}
          css={css`
            // Since we are trying to detect CTRL+clicks on this so it should be about the size of its visible contents
            width: fit-content;
          `}
        >
          <Typography
            data-testid="customization-dialog-tag-preview"
            css={css`
              // We will be trying to detect CTRL+clicks on this so it should be about the size of its visible contents
              width: fit-content;
            `}
          >
            <Trans>
              BCP 47 Tag:{" "}
              <span
                css={css`
                  font-weight: bold;
                `}
              >
                {createTagFromOrthography({
                  language: props.selectedLanguage,
                  script: dialogSelectedScript,
                  customDetails: {
                    dialect: dialogSelectedDialect,
                    region: dialogSelectedRegion,
                  } as ICustomizableLanguageDetails,
                } as IOrthography)}
              </span>
            </Trans>
            <PrimaryTooltip
              title={
                <div
                  css={css`
                    font-size: 0.75rem;
                  `}
                >
                  {/* Have MUI align the icon */}
                  <IconAndText
                    icon={
                      <WarningIcon
                        css={css`
                          font-size: inherit;
                        `}
                      />
                    }
                    text={
                      <Typography
                        css={css`
                          font-size: inherit;
                        `}
                      >
                        <Trans>Advanced</Trans>
                      </Typography>
                    }
                  />

                  <Typography
                    css={css`
                      font-size: inherit;
                      a {
                        color: inherit; // same color as the rest of the text. Otherwise it is by default hard to see on the dark background
                      }
                    `}
                  >
                    <Trans>
                      If this user interface is not offering you a code that you
                      know is valid{" "}
                      <a href="https://en.wikipedia.org/wiki/IETF_language_tag">
                        BCP 47 code
                      </a>
                      , you can enter it by hand. Hold down CTRL key while
                      clicking on this tag.
                    </Trans>
                  </Typography>
                </div>
              }
            >
              <InfoOutlinedIcon
                css={css`
                  margin-left: 5px;
                  font-size: inherit;
                `}
              />
            </PrimaryTooltip>
          </Typography>
        </div>
      </DialogContent>
      {/* // TODO abstract out these buttons which are copied from app.tsx */}
      <DialogActions
        css={css`
          padding: 0; //using padding on the entire dialog instead, plus gap between sections
          padding-top: 20px; // extra space on top of the buttons
        `}
      >
        <div
          id="customize-dialog-action-buttons-container"
          css={css`
            width: 100%;
            display: flex;
            justify-content: flex-end;
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
            onClick={() => {
              if (isUnlistedLanguageDialog) {
                props.selectUnlistedLanguage();
              }

              props.saveLanguageDetails(
                {
                  // For unlisted languages, automatically copy the Name they entered to be the display name
                  customDisplayName: isUnlistedLanguageDialog
                    ? dialogSelectedDialect
                    : props.customizableLanguageDetails.customDisplayName,
                  region: dialogSelectedRegion,
                  dialect: dialogSelectedDialect,
                } as ICustomizableLanguageDetails,
                dialogSelectedScript
              );
              props.onClose();
            }}
            data-testid="customization-dialog-ok-button"
          >
            <Trans>OK</Trans>
          </Button>
          <Button
            css={css`
              min-width: 100px;
            `}
            variant="outlined"
            color="primary"
            onClick={props.onClose}
            data-testid="customization-dialog-cancel-button"
          >
            <Trans>Cancel</Trans>
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
};
