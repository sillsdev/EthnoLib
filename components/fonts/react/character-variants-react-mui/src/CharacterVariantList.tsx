/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { Alert, Typography, useTheme } from "@mui/material";
import React, { useMemo, useState } from "react";
import {
  CharacterVariant,
  readCharacterVariants,
} from "./readCharacterVariants";
import { CharacterVariantCard } from "./CharacterVariantCard";
import { filterVariantsForAlphabet, parseAlphabet } from "./alphabet";

export interface CharacterVariantListProps {
  /**
   * The CSS font family used to render the samples. It has to be a family the
   * browser can resolve: installed on the machine, or added with
   * `document.fonts.add()`.
   */
  fontFamily: string;
  /** The bytes of that font, which is where the cvXX information comes from. */
  fontData?: ArrayBuffer;
  /**
   * Which face those bytes are of. Only matters for a font collection (.ttc),
   * where the bytes hold several families and this says which one is meant;
   * without it the first font in the collection answers.
   */
  postscriptName?: string;
  /**
   * Show only the variants that affect these characters, and only those characters
   * within each variant. Empty means show everything.
   */
  alphabet?: string;
  /**
   * The form chosen for each feature, by tag: 0 (or absent) for the font's default,
   * or the 1-based alternate. Pass this to control the choices from outside;
   * otherwise the component keeps them itself.
   */
  choices?: CharacterVariantChoices;
  onChoicesChange?: (choices: CharacterVariantChoices) => void;
  /** Font size, in px, for the glyph samples. */
  sampleSize?: number;
  className?: string;
}

/** Which form of each cvXX feature is chosen, keyed by tag ("cv07"). */
export type CharacterVariantChoices = Record<string, number>;

/**
 * The character variants of one font, given both its name and its bytes. Split out
 * of `<CharacterVariants>` for an app that already has a font picker of its own.
 */
export const CharacterVariantList: React.FunctionComponent<
  CharacterVariantListProps
> = ({
  fontFamily,
  fontData,
  postscriptName,
  alphabet = "",
  choices,
  onChoicesChange,
  sampleSize = 28,
  className,
}) => {
  const theme = useTheme();
  const [ownChoices, setOwnChoices] = useState<CharacterVariantChoices>({});
  const chosen = choices ?? ownChoices;

  const choose = (tag: string, choice: number) => {
    const next = { ...chosen, [tag]: choice };
    if (!choices) setOwnChoices(next);
    onChoicesChange?.(next);
  };

  const { variants, error } = useMemo(() => {
    if (!fontData) return { variants: undefined, error: undefined };
    try {
      return {
        variants: readCharacterVariants(fontData, postscriptName),
        error: undefined,
      };
    } catch (e) {
      return { variants: undefined, error: e as Error };
    }
  }, [fontData, postscriptName]);

  const shown = useMemo(
    () =>
      variants && filterVariantsForAlphabet(variants, parseAlphabet(alphabet)),
    [variants, alphabet]
  );

  if (error) {
    return (
      <Alert severity="error" className={className}>
        {`Could not read ${fontFamily}: ${error.message}`}
      </Alert>
    );
  }

  if (!variants || !shown) return null;

  // Either the font has no cvXX features at all or none that touch this alphabet.
  // The difference doesn't matter to someone who just wants to see their letters.
  if (shown.length === 0) {
    return (
      <Alert severity="info" className={className}>
        {`${fontFamily} does not have any features related to this alphabet.`}
      </Alert>
    );
  }

  return (
    <div className={className}>
      <Typography
        variant="body2"
        css={css`
          margin-bottom: ${theme.spacing(1)};
        `}
      >
        {`${fontFamily} supports the following letter shapes for your alphabet:`}
      </Typography>
      <div
        css={css`
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: ${theme.spacing(2)};
          align-items: start;
        `}
      >
        {shown.map((variant: CharacterVariant) => (
          <CharacterVariantCard
            key={variant.tag}
            variant={variant}
            fontFamily={fontFamily}
            sampleSize={sampleSize}
            choice={chosen[variant.tag] ?? 0}
            onChoose={(choice) => choose(variant.tag, choice)}
          />
        ))}
      </div>
    </div>
  );
};
