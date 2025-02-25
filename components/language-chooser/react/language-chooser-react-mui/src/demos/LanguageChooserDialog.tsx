/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

import {
  AppBar,
  Button,
  Dialog,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";

import "../styles.css";
import { ILanguageChooserProps, LanguageChooser } from "../LanguageChooser";
import { IOrthography } from "@ethnolib/language-chooser-react-hook";
import React from "react";

export const LanguageChooserDialog: React.FunctionComponent<
  {
    open: boolean;
    onOk: (selection: IOrthography, languageTag: string) => void;
    onCancel: () => void;
    dialogWidth?: string;
    dialogHeight?: string;
  } & ILanguageChooserProps
> = ({
  open,
  onOk,
  onCancel,
  dialogWidth,
  dialogHeight,
  ...languageChooserProps
}) => {
  const [pendingSelection, setPendingSelection] = React.useState(
    {} as IOrthography
  );
  const [pendingLanguageTag, setPendingLanguageTag] = React.useState(
    languageChooserProps.initialSelectionLanguageTag || ""
  );
  function onSelectionChange(
    orthographyInfo: IOrthography | undefined,
    languageTag: string | undefined
  ) {
    setPendingSelection(orthographyInfo || ({} as IOrthography));
    setPendingLanguageTag(languageTag || "");
  }
  const theme = useTheme();
  const dialogActionButtons = (
    <div
      id="dialog-action-buttons-container"
      css={css`
        width: 100%;
        display: flex;
        justify-content: flex-end;
        padding-top: 15px;
        padding-bottom: 5px;
      `}
    >
      <Button
        data-testid="lang-chooser-dialog-ok-button"
        css={css`
          margin-left: auto;
          margin-right: 10px;
          min-width: 100px;
        `}
        variant="contained"
        color="primary"
        disabled={pendingSelection.language === undefined}
        onClick={() => {
          onOk(pendingSelection, pendingLanguageTag);
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
        onClick={onCancel}
      >
        Cancel
      </Button>
    </div>
  );

  return (
    <Dialog
      open={open}
      maxWidth={dialogWidth ? "xl" : "md"}
      fullWidth={true}
      css={css`
        .MuiDialog-paper {
          height: ${dialogHeight ? dialogHeight : "586px"};
          ${dialogWidth ? `width: ${dialogWidth};` : ""}
        }
      `}
    >
      <div
        id="lang-chooser-dialog-content"
        css={css`
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          border-radius: 5px;
          position: relative;
          margin-left: auto;
          margin-right: auto;
          overflow: auto;
        `}
      >
        <AppBar
          position="static"
          css={css`
            background-color: white;
            box-shadow: none;
            border-bottom: 2px solid ${theme.palette.grey[300]};
            flex-grow: 0;
          `}
        >
          <Toolbar
            disableGutters
            variant="dense"
            css={css`
              padding-top: 5px;
              padding-left: 15px;
            `}
          >
            <Typography
              variant="h5"
              component="div"
              css={css`
                color: black;
              `}
            >
              Choose Language
            </Typography>
          </Toolbar>
        </AppBar>
        <LanguageChooser
          {...languageChooserProps}
          onSelectionChange={onSelectionChange}
          actionButtons={dialogActionButtons}
        />
      </div>
    </Dialog>
  );
};
