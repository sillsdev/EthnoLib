/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import * as React from "react";
import {
  ICustomizableLanguageDetails,
  isUnlistedLanguage,
} from "@ethnolib/language-chooser-react-hook";
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
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { TextInput } from "./TextInput";
import { COLORS } from "./colors";
import {
  getAllRegions,
  getAllScripts,
  ILanguage,
  IRegion,
  IScript,
  stripDemarcation,
  createTag,
} from "@ethnolib/find-language";
import { FormFieldLabel } from "./FormFieldLabel";

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
  searchString: string;
  onClose: () => void;
}> = (props) => {
  const isUnlistedLanguageDialog =
    !props.selectedLanguage || isUnlistedLanguage(props.selectedLanguage);

  const EMPTY_COMBOBOX_VALUE = React.useMemo(() => ({ label: "", id: "" }), []);

  // Store dialog state. Used to create a tag preview just inside the dialog, before saving anything
  const [dialogSelectedScript, setDialogSelectedScript] = React.useState<{
    label: string;
    id: string;
  }>(EMPTY_COMBOBOX_VALUE);
  const [dialogSelectedRegion, setDialogSelectedRegion] = React.useState<{
    label: string;
    id: string;
  }>(EMPTY_COMBOBOX_VALUE);
  const [dialogSelectedDialect, setDialogSelectedDialect] =
    React.useState<string>("");

  // name (dialect) and country (region) are required for unlisted language
  const isReadyToSubmit =
    !isUnlistedLanguageDialog ||
    (dialogSelectedDialect !== "" && dialogSelectedRegion.label !== "");

  // To reset the dialog if the user closes and reopens it, since they may have changed the language
  //or script selection in between
  React.useEffect(() => {
    setDialogSelectedScript(
      props.selectedScript?.code
        ? {
            label: props.selectedScript.name,
            id: props.selectedScript.code,
          }
        : EMPTY_COMBOBOX_VALUE
    );
    setDialogSelectedRegion(
      props.customizableLanguageDetails.region?.code
        ? {
            label: props.customizableLanguageDetails.region.name,
            id: props.customizableLanguageDetails.region.code,
          }
        : EMPTY_COMBOBOX_VALUE
    );
    setDialogSelectedDialect(
      // if the user has not selected any language, not even the unlisted language button, then
      // there will be no language details and we suggest the search string as a
      // starting point for the unlisted language name (which is actually stored in the dialect field)
      props.selectedLanguage
        ? props.customizableLanguageDetails.dialect || ""
        : props.searchString
    );
  }, [props, EMPTY_COMBOBOX_VALUE]);

  return (
    <Dialog
      onClose={props.onClose}
      open={props.open}
      css={css`
        .MuiDialog-paper {
          padding: 20px 25px 25px 25px;
          display: flex;
          gap: 15px;
        }
      `}
      maxWidth={"sm"}
      fullWidth={true}
    >
      <DialogTitle
        css={css`
          font-weight: bold;
          padding: 0; //using padding on the entire dialog instead, plus gap between sections
        `}
      >
        {isUnlistedLanguageDialog
          ? "Unlisted Language Tag"
          : "Custom Language Tag"}
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
            border: 1px solid ${COLORS.blues[2]};
            padding: 7px;
            flex-shrink: 0;
          `}
        >
          <Typography
            css={css`
              color: ${COLORS.blues[2]};
              font-size: 0.875rem;
              display: flex;
              align-items: start;
              gap: 7px;
            `}
          >
            <InfoIcon />
            {isUnlistedLanguageDialog
              ? "If you cannot find a language and it does not appear in ethnologue.com, you can instead define the language here."
              : "If you found the main language but need to change some of the specifics like Script or Dialect, you can do that here."}
          </Typography>
        </Card>
        {isUnlistedLanguageDialog && (
          <TextInput
            id="unlisted-lang-name-field"
            label="Name"
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
          <div id="customize-script">
            {/* TODO future work: make these fuzzy search */}

            <FormFieldLabel htmlFor="customize-script-field" label="Script" />
            <Autocomplete
              value={dialogSelectedScript}
              onChange={(
                _event,
                newValue: { label: string; id: string } | null
              ) => {
                setDialogSelectedScript(newValue || EMPTY_COMBOBOX_VALUE);
              }}
              disablePortal
              id="combo-box-language-chooser-react-mui"
              options={getAllScriptOptions()}
              renderInput={(params) => (
                <TextField {...params} id="customize-script-field" />
              )}
              size={"small"}
            />
          </div>
        )}

        <div id="customize-region">
          <FormFieldLabel
            htmlFor="customize-region-field"
            label="Country"
            required={isUnlistedLanguageDialog}
          />
          <Autocomplete
            value={dialogSelectedRegion}
            onChange={(
              _event,
              newValue: { label: string; id: string } | null
            ) => {
              setDialogSelectedRegion(newValue || EMPTY_COMBOBOX_VALUE);
            }}
            disablePortal
            id="combo-box-language-chooser-react-mui"
            options={getAllRegionOptions()}
            renderInput={(params) => (
              <TextField {...params} id="customize-region-field" />
            )}
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
            label="Variant (dialect)"
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
        <Typography>
          BCP 47 Tag:{" "}
          <span
            css={css`
              font-weight: bold;
            `}
          >
            {createTag({
              languageCode: stripDemarcation(
                props.selectedLanguage?.languageSubtag
              ),
              scriptCode: stripDemarcation(dialogSelectedScript?.id),
              regionCode: stripDemarcation(dialogSelectedRegion?.id),
              dialectCode: stripDemarcation(dialogSelectedDialect),
            })}
          </span>
        </Typography>
      </DialogContent>
      {/* // TODO abstract out these buttons which are copied from app.tsx */}
      <DialogActions
        css={css`
          padding: 0; //using padding on the entire dialog instead, plus gap between sections
        `}
      >
        <div
          id="customize-dialog-action-buttons-container"
          css={css`
            // position: absolute;
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
                  displayName: isUnlistedLanguageDialog
                    ? dialogSelectedDialect
                    : props.customizableLanguageDetails.displayName,
                  region: {
                    code: dialogSelectedRegion?.id,
                    name: dialogSelectedRegion?.label,
                  } as IRegion,
                  dialect: dialogSelectedDialect,
                } as ICustomizableLanguageDetails,
                dialogSelectedScript?.id
                  ? ({
                      code: dialogSelectedScript?.id,
                      name: dialogSelectedScript?.label,
                    } as IScript)
                  : undefined
              );
              props.onClose();
            }}
          >
            OK
          </Button>
          <Button
            css={css`
              min-width: 100px;
            `}
            variant="outlined"
            color="primary"
            onClick={props.onClose}
          >
            Cancel
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
};
