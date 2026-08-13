/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { Alert } from "@mui/material";
import React, { useMemo, useState } from "react";
import { readCharacterVariants } from "./readCharacterVariants";
import { CharacterVariantCard } from "./CharacterVariantCard";
import { DEFAULT_SAMPLE_SIZE, scaledPx } from "./FormTile";
import type { ShapeInfo } from "./ShapeInfoLine";
import {
  filterVariantsForAlphabet,
  parseAlphabet,
  variantsBeyond,
} from "./alphabet";
import {
  chooseForm,
  chosenForm,
  groupVariants,
  type CharacterVariantChoices,
  type VariantForm,
  type VariantGroup,
} from "./variantGroups";

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
   * Leave out the variants that affect none of these characters — for a caller
   * showing them in a list of their own, as the font chooser does with the digits.
   */
  excludeCharacters?: string;
  /**
   * The form chosen for each feature, by tag: 0 (or absent) for the font's default,
   * or the 1-based alternate. Pass this to control the choices from outside;
   * otherwise the component keeps them itself.
   */
  choices?: CharacterVariantChoices;
  onChoicesChange?: (choices: CharacterVariantChoices) => void;
  /** Font size, in px, for the glyph samples. `<FormTile>` sets the default. */
  sampleSize?: number;
  /**
   * Told what the shape tile under the pointer is — its name and the CSS that
   * produces it — and told null when the pointer leaves. Nothing is written next
   * to the tiles; a caller with somewhere settled to put it, such as the foot of a
   * pane, shows it with `<ShapeInfoLine>`.
   */
  onHoverChange?: (info: ShapeInfo | null) => void;
  className?: string;
}

export type { CharacterVariantChoices };

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
  excludeCharacters,
  choices,
  onChoicesChange,
  // No default here. It used to be 32, which quietly beat the one in FormTile and
  // made that one dead code — so changing the size in the obvious place did
  // nothing. The tile owns its own size; everything above it only passes a size on.
  sampleSize,
  onHoverChange,
  className,
}) => {
  const [ownChoices, setOwnChoices] = useState<CharacterVariantChoices>({});
  const chosen = choices ?? ownChoices;

  const choose = (group: VariantGroup, form?: VariantForm) => {
    const next = chooseForm(chosen, group, form);
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

  const shown = useMemo(() => {
    if (!variants) return undefined;
    const forAlphabet = filterVariantsForAlphabet(
      variants,
      parseAlphabet(alphabet)
    );
    return excludeCharacters
      ? variantsBeyond(forAlphabet, parseAlphabet(excludeCharacters))
      : forAlphabet;
  }, [variants, alphabet, excludeCharacters]);

  // Several features can be different answers to one question — "how should Ŋ be
  // drawn?" — and belong in one row; see variantGroups.ts.
  const groups = useMemo(() => shown && groupVariants(shown), [shown]);

  if (error) {
    return (
      <Alert severity="error" className={className}>
        {`Could not read ${fontFamily}: ${error.message}`}
      </Alert>
    );
  }

  if (!variants || !shown || !groups) return null;

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
      <div
        css={css`
          // Groups run across and wrap, rather than one to a line: most hold two
          // or three narrow tiles, and stacking them wasted most of the pane.
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          // Wide enough that two rows side by side don't read as one row. In
          // multiples of the sample size like everything else, so the whole
          // control scales off that one number.
          gap: ${scaledPx(sampleSize ?? DEFAULT_SAMPLE_SIZE, 0.94)};
        `}
      >
        {groups.map((group) => (
          <CharacterVariantCard
            key={group.key}
            group={group}
            fontFamily={fontFamily}
            sampleSize={sampleSize}
            chosen={chosenForm(group, chosen)}
            onChoose={(form) => choose(group, form)}
            onHoverChange={onHoverChange}
          />
        ))}
      </div>
    </div>
  );
};
