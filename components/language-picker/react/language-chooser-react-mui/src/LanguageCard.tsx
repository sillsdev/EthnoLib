/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  OptionCard,
  OptionCardProps,
  OptionCardPropsWithoutColors,
} from "./OptionCard";
import { ILanguage } from "@nabalones/find-language";
import { memo } from "react";
import { PartiallyBoldedTypography } from "./PartiallyBoldedTypography";
import { COLORS } from "./colors";

export const LanguageCard: React.FunctionComponent<
  { languageCardData: ILanguage } & OptionCardPropsWithoutColors
> = memo(({ languageCardData, ...partialOptionCardProps }) => {
  const optionCardProps = {
    ...partialOptionCardProps,
    backgroundColorWhenNotSelected: COLORS.white,
    backgroundColorWhenSelected: COLORS.blues[0],
  } as OptionCardProps;
  return (
    <OptionCard {...optionCardProps}>
      <PartiallyBoldedTypography variant="h5">
        {languageCardData.autonym || languageCardData.exonym}
      </PartiallyBoldedTypography>
      {languageCardData.autonym && (
        <PartiallyBoldedTypography variant="body2">
          {languageCardData.exonym}
        </PartiallyBoldedTypography>
      )}
      <PartiallyBoldedTypography
        css={css`
          right: 0;
          top: 0;
          position: absolute;
          margin: 16px; // To match the padding of the card
          font-family: "Roboto Mono", monospace;
        `}
        variant="body2"
      >
        {languageCardData.languageSubtag}
      </PartiallyBoldedTypography>
      {languageCardData.regionNames?.length > 0 && (
        <PartiallyBoldedTypography
          variant="h5"
          gutterBottom
          css={css`
            margin-top: 8px;
            // Copilot gave me this to cut off after 2 lines with an ellipsis
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          `}
        >{`A language xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx of ${languageCardData.regionNames}`}</PartiallyBoldedTypography>
      )}
      {languageCardData.names.length > 0 && (
        <PartiallyBoldedTypography
          variant="body2"
          // Always show all the names.
          css={css`
            text-wrap: balance;
          `}
        >
          {languageCardData.names.join(", ")}
        </PartiallyBoldedTypography>
      )}
    </OptionCard>
  );
});
