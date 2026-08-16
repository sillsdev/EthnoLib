/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import React, { useState } from "react";
import { parseGoogleFontsFamily } from "@ethnolib/font-core";

export interface AddFontFromUrlDialogProps {
  open: boolean;
  onCancel: () => void;
  /**
   * Add the font this address names. Rejecting is how the dialog is told the
   * address didn't lead anywhere: it stays open wearing the reason, with what
   * the user pasted still in the box to correct.
   */
  onAdd: (url: string) => Promise<void>;
}

/**
 * Whether the affirmative button goes first, which is a question about the
 * user's operating system rather than about this dialog: Windows and most Linux
 * desktops read "OK Cancel" left to right, macOS puts the affirmative last, and
 * a dialog that guesses wrong is one where muscle memory cancels the thing the
 * user meant to do.
 *
 * `userAgentData` where the browser has it, and the user agent string where it
 * doesn't; anything we can't place is treated as Windows, which is the majority
 * and the convention every non-Apple desktop follows anyway.
 */
function affirmativeFirst(): boolean {
  const data = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData;
  const platform = data?.platform ?? navigator.userAgent;
  return !/mac/i.test(platform);
}

/**
 * The little dialog behind "Add from URL…".
 *
 * It asks for one thing, and the one thing is usually already in the clipboard —
 * somebody has just been on fonts.google.com looking at the font they want — so
 * the box has a Paste button beside it and the address it wants as its
 * watermark. "Add" waits until what is in the box could actually be such an
 * address: pressing it on anything else could only produce an error message, and
 * a button that is live and always fails is worse than one that is plainly not
 * ready.
 */
export const AddFontFromUrlDialog: React.FunctionComponent<
  AddFontFromUrlDialogProps
> = ({ open, onCancel, onAdd }) => {
  const theme = useTheme();
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const family = parseGoogleFontsFamily(url);
  const canAdd = !!family && !adding;

  const close = () => {
    setUrl("");
    setError(undefined);
    onCancel();
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setError(undefined);
      }
    } catch {
      // Reading the clipboard can be refused, and on some browsers isn't
      // offered at all. The box is still a box.
      setError("This browser wouldn't let us read the clipboard; paste into the box instead.");
    }
  };

  const add = async () => {
    if (!canAdd) return;
    setAdding(true);
    setError(undefined);
    try {
      await onAdd(url.trim());
      setUrl("");
      setAdding(false);
    } catch (failure) {
      setAdding(false);
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };

  const cancelButton = (
    <Button key="cancel" onClick={close} disabled={adding}>
      Cancel
    </Button>
  );
  const addButton = (
    <Button
      key="add"
      type="submit"
      variant="contained"
      disabled={!canAdd}
      startIcon={adding ? <CircularProgress size={14} /> : undefined}
    >
      Add
    </Button>
  );

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      {/* A form, so Enter in the box does what the Add button does — which is
          what somebody who has just pasted an address will press. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <DialogTitle
          css={css`
            font-size: 18px;
          `}
        >
          Add a font from a URL
        </DialogTitle>
        <DialogContent>
          <Typography
            css={css`
              font-size: 13px;
              color: ${theme.palette.text.secondary};
            `}
          >
            To add a font from fonts.google.com, paste the url here.
          </Typography>
          <div
            css={css`
              display: flex;
              align-items: flex-start;
              gap: 8px;
              margin-top: 12px;
            `}
          >
            <TextField
              autoFocus
              fullWidth
              size="small"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(undefined);
              }}
              placeholder="https://fonts.google.com/noto/specimen/some+font"
              inputProps={{ "aria-label": "Google Fonts address" }}
              css={css`
                input {
                  font-size: 13px;
                }
              `}
            />
            <Button
              onClick={() => void paste()}
              disabled={adding}
              css={css`
                flex: none;
                /* Level with the field, which is a touch taller than the
                   button's natural height. */
                height: 40px;
              `}
            >
              Paste
            </Button>
          </div>
          {/* The name we read out of the address, so the user can see we
              understood it before they commit to a download. */}
          {family && !error && (
            <Typography
              css={css`
                margin-top: 8px;
                font-size: 12px;
                color: ${theme.palette.text.secondary};
              `}
            >
              {adding ? `Looking for ${family}…` : `Adds ${family}.`}
            </Typography>
          )}
          {error && (
            <Typography
              role="alert"
              css={css`
                margin-top: 8px;
                font-size: 12px;
                line-height: 1.4;
                color: ${theme.palette.error.main};
              `}
            >
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {affirmativeFirst()
            ? [addButton, cancelButton]
            : [cancelButton, addButton]}
        </DialogActions>
      </form>
    </Dialog>
  );
};
