/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  OptionCard,
  OptionCardProps,
  OptionCardPropsWithoutColors,
} from "./OptionCard";
import { ILanguage } from "@ethnolib/find-language";
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
      <div
        css={css`
          display: flex;
          flex-direction: row;
          gap: 20px;
          align-items: flex-end;
        `}
      >
        {/* Top row */}

        <PartiallyBoldedTypography
          css={css`
            font-size: 16px;
            flex-grow: 1;
          `}
        >
          {languageCardData.autonym || languageCardData.exonym}
        </PartiallyBoldedTypography>
        {languageCardData.autonym && (
          <PartiallyBoldedTypography
            css={css`
              font-size: 16px;
              flex-grow: 0;
            `}
          >
            {languageCardData.exonym}
          </PartiallyBoldedTypography>
        )}
        <PartiallyBoldedTypography
          css={css`
            flex-grow: 0;
            font-family: "Roboto Mono", monospace;
            font-size: 14px;
            color: ${COLORS.greys[3]};
          `}
        >
          {languageCardData.languageSubtag}
        </PartiallyBoldedTypography>
      </div>

      {languageCardData.regionNames?.length > 0 && (
        <PartiallyBoldedTypography
          gutterBottom
          css={css`
            margin-top: 8px;
            // Copilot gave me this to cut off after 2 lines with an ellipsis
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            font-size: 12px;
            color: ${COLORS.greys[3]};
          `}
        >{`A language of ${languageCardData.regionNames}`}</PartiallyBoldedTypography>
      )}
      {languageCardData.names.length > 0 && (
        <PartiallyBoldedTypography
          // Always show all the names.
          css={css`
            text-wrap: balance;
            font-size: 12px;
            color: ${COLORS.greys[3]};
          `}
        >
          {languageCardData.names.join(", ")}
        </PartiallyBoldedTypography>
      )}
    </OptionCard>
  );
});
