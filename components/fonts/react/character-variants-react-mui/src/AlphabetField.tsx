/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { TextField, useTheme } from "@mui/material";
import React, { useState } from "react";
import { fontFamilyWithTofu } from "@ethnolib/font-core";

export interface AlphabetFieldProps {
  value: string;
  onChange: (alphabet: string) => void;
  /** Renders the typed alphabet in the font under inspection. */
  fontFamily?: string;
  /**
   * Characters of the alphabet that have a variant to choose among; they are
   * picked out in the field. The caller decides when to recompute this — doing it
   * on every keystroke makes the text flicker as you type.
   */
  marked?: Set<string>;
  /** Called when the field loses focus, which is when marking is worth redoing. */
  onBlur?: () => void;
  /** The field's floating label. Pass null for none, where the caller draws its
   * own label above the field. */
  label?: React.ReactNode;
  /**
   * Greyed text for an empty field — "Loading…" while the caller is still
   * looking the alphabet up. An empty box says the language has no alphabet
   * data; this says the answer hasn't arrived yet, which is a different thing
   * to sit and wait through.
   */
  placeholder?: string;
  className?: string;
}

// The metrics of a small outlined MUI input, needed by the layer that sits over it.
const INPUT_PADDING = "8.5px 14px";
const INPUT_BORDER = "1px";
const INPUT_LINE_HEIGHT = "1.4375em";

/**
 * Where the user types the characters their language uses, so that the variants
 * below can be narrowed to the ones that matter to them.
 *
 * The marked characters are drawn by a layer over the input rather than in it,
 * since an <input> cannot style part of its own text.
 */
export const AlphabetField: React.FunctionComponent<AlphabetFieldProps> = ({
  value,
  onChange,
  fontFamily,
  marked,
  onBlur,
  label = "Alphabet",
  placeholder,
  className,
}) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  // While the field has focus it is the plain input, marks and all set aside: bold
  // characters are wider than plain ones, so a layer over the text would put the
  // caret in the wrong place.
  const anyMarked =
    !focused && !!marked && [...value].some((c) => marked.has(c));

  const textStyle = css`
    /* The font, then tofu: a letter of their alphabet the font hasn't got must
       show as a box here of all places. */
    font-family: ${fontFamilyWithTofu(fontFamily)};
    font-size: 1rem;
    letter-spacing: inherit;
    line-height: ${INPUT_LINE_HEIGHT};
  `;

  return (
    <div
      className={className}
      css={css`
        position: relative;
        width: 100%;
        max-width: 40em;
      `}
    >
      <TextField
        label={label}
        size="small"
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        placeholder={placeholder}
        inputProps={{
          // Seeing the alphabet in the font is half the point of typing it here.
          style: {
            fontFamily: fontFamily ? fontFamilyWithTofu(fontFamily) : undefined,
            // Hide the input's own text under the layer that can mark it up, but
            // only once there is something to mark.
            color: anyMarked ? "transparent" : undefined,
            caretColor: theme.palette.text.primary,
          },
          spellCheck: false,
          autoCapitalize: "off",
          autoCorrect: "off",
        }}
      />
      {anyMarked && (
        <div
          aria-hidden
          css={[
            textStyle,
            css`
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              padding: calc(${INPUT_PADDING.split(" ")[0]} + ${INPUT_BORDER})
                calc(${INPUT_PADDING.split(" ")[1]} + ${INPUT_BORDER});
              white-space: pre;
              overflow: hidden;
              pointer-events: none;
              color: ${theme.palette.text.primary};
            `,
          ]}
        >
          {[...value].map((character, i) =>
            marked?.has(character) ? (
              <b
                key={i}
                css={css`
                  color: ${theme.palette.primary.main};
                `}
              >
                {character}
              </b>
            ) : (
              <React.Fragment key={i}>{character}</React.Fragment>
            )
          )}
        </div>
      )}
    </div>
  );
};
