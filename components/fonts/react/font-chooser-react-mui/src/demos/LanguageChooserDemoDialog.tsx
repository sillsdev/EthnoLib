/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  AppBar,
  Button,
  Dialog,
  ThemeProvider,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import React, { useState } from "react";
import {
  LanguageChooser,
  defaultDisplayName,
  defaultSearchResultModifier,
} from "@ethnolib/language-chooser-react-mui";
import type { IOrthography } from "@ethnolib/language-chooser-react-mui";

/**
 * The language chooser in a dialog, so the font demo can ask which language the
 * user is working in.
 *
 * A pared-down copy of the language chooser package's own dialog demo: the
 * strings here are hardcoded English rather than translated, since this demo
 * harness has no lingui setup of its own. The chooser itself is translated —
 * it brings its own I18nProvider.
 */
export const LanguageChooserDemoDialog: React.FunctionComponent<{
  open: boolean;
  /** The tag to open on, so reopening the dialog lands where the user left it. */
  initialLanguageTag?: string;
  /**
   * The script code comes back alongside the tag because most tags don't carry
   * one, and the sample text is filed by language and script together.
   */
  onSelected: (
    languageTag: string,
    displayName: string,
    scriptCode?: string
  ) => void;
  onCancel: () => void;
}> = ({ open, initialLanguageTag, onSelected, onCancel }) => {
  const [selection, setSelection] = useState<IOrthography | undefined>();
  const [tag, setTag] = useState<string>(initialLanguageTag ?? "");
  const theme = useTheme();

  // A language on its own isn't enough: without a script there is no alphabet to
  // look up and no font list worth showing.
  const ready = !!selection?.language && !!selection?.script && !!tag;

  const actionButtons = (
    <ThemeProvider theme={theme}>
      <div
        css={css`
          width: 100%;
          display: flex;
          justify-content: flex-end;
          padding-top: 15px;
          padding-bottom: 5px;
        `}
      >
        <Button
          data-testid="language-dialog-ok"
          css={css`
            margin-left: auto;
            margin-right: 10px;
            min-width: 100px;
          `}
          variant="contained"
          color="primary"
          disabled={!ready}
          onClick={() =>
            onSelected(
              tag,
              defaultDisplayName(selection?.language, selection?.script) ||
                selection?.language?.exonym ||
                tag,
              selection?.script?.code
            )
          }
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
    </ThemeProvider>
  );

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
      fullWidth={true}
      css={css`
        .MuiDialog-paper {
          height: 586px;
        }
      `}
    >
      <div
        css={css`
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
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
          searchResultModifier={defaultSearchResultModifier}
          initialSelectionLanguageTag={initialLanguageTag}
          onSelectionChange={(orthography, languageTag) => {
            setSelection(orthography);
            setTag(languageTag ?? "");
          }}
          actionButtons={actionButtons}
        />
      </div>
    </Dialog>
  );
};
