/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import React, { useState } from "react";
import { collectionConfigured, sendFeedback } from "./collection";

/**
 * The demo's way of hearing back from the people we send it to.
 *
 * It sits directly under the chooser card, in the same centred column, so it
 * reads as "now tell us what you thought of that" — the next thing after the
 * thing you came to look at. It was floating bottom-right at first, which put
 * it out in the margin where it looked like unrelated page furniture.
 *
 * This is demo harness, not part of the published component. A host app would
 * have its own feedback channel.
 */
export const FeedbackButton: React.FunctionComponent<{
  /** Context to file the comment under, so "this is wrong" has a subject. */
  languageTag?: string;
  fontFamily?: string;
}> = ({ languageTag, fontFamily }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"editing" | "sending" | "sent">("editing");
  const [error, setError] = useState<string | undefined>();

  function close() {
    setOpen(false);
    // Wait for the dialog's own fade-out before resetting, so the text doesn't
    // visibly blank out on the way off screen.
    window.setTimeout(() => {
      setMessage("");
      setEmail("");
      setState("editing");
      setError(undefined);
    }, 200);
  }

  async function submit() {
    setState("sending");
    setError(undefined);
    try {
      await sendFeedback({
        message: message.trim(),
        email: email.trim() || undefined,
        languageTag,
        fontFamily,
      });
      setState("sent");
    } catch (e) {
      setState("editing");
      setError(
        // The real error is worth showing: the people trying this demo are
        // colleagues who can tell us what it said.
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  return (
    <>
      <Button
        variant="contained"
        color="secondary"
        onClick={() => setOpen(true)}
        css={css`
          display: block;
          margin: 20px auto 8px;
          border-radius: 22px;
          padding: 10px 24px;
          font-weight: 600;
          text-transform: none;
        `}
      >
        Send feedback to John
      </Button>

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>Thanks for experimenting with me!</DialogTitle>
        <DialogContent>
          {state === "sent" ? (
            <Alert severity="success">
              Thank you — your feedback went through.
            </Alert>
          ) : (
            <>
              {!collectionConfigured && (
                <Alert
                  severity="warning"
                  css={css`
                    margin-bottom: 16px;
                  `}
                >
                  This build has no feedback server configured, so nothing can
                  be sent from here.
                </Alert>
              )}
              {error && (
                <Alert
                  severity="error"
                  css={css`
                    margin-bottom: 16px;
                  `}
                >
                  Could not send: {error}
                </Alert>
              )}

              <TextField
                autoFocus
                fullWidth
                multiline
                minRows={5}
                label="Your feedback"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={state === "sending"}
              />
              <TextField
                fullWidth
                type="email"
                label="Email (optional)"
                placeholder="Only if you would like a reply"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={state === "sending"}
                css={css`
                  margin-top: 16px;
                `}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          {state === "sent" ? (
            <Button variant="contained" onClick={close}>
              Close
            </Button>
          ) : (
            <>
              <Button onClick={close} disabled={state === "sending"}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={submit}
                disabled={
                  !message.trim() ||
                  state === "sending" ||
                  !collectionConfigured
                }
              >
                {state === "sending" ? "Sending…" : "Send"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};
