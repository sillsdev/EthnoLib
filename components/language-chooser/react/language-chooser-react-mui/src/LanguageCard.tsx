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
          flex-wrap: wrap;
          gap: 20px;
          align-items: flex-end;
        `}
      >
        {/* Top row */}

        <PartiallyBoldedTypography
          variant="h2"
          css={css`
            flex-grow: 1;
          `}
        >
          {languageCardData.autonym || languageCardData.exonym}
        </PartiallyBoldedTypography>
        {languageCardData.autonym && (
          <PartiallyBoldedTypography
            variant="h2"
            css={css`
              flex-grow: 0;
            `}
          >
            {languageCardData.exonym}
          </PartiallyBoldedTypography>
        )}
        <PartiallyBoldedTypography
          variant="body2"
          css={css`
            flex-grow: 0;
            color: ${COLORS.greys[3]};
          `}
        >
          {languageCardData.languageSubtag}
        </PartiallyBoldedTypography>
      </div>
      {languageCardData.regionNames?.length > 0 && (
        <PartiallyBoldedTypography
          variant="subtitle1"
          gutterBottom
          css={css`
            margin-top: 8px;
            // Copilot gave me this to cut off after 2 lines with an ellipsis
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            color: ${COLORS.greys[3]};
          `}
        >{`A language of ${languageCardData.regionNames}`}</PartiallyBoldedTypography>
      )}
      {languageCardData.names.length > 0 && (
        <PartiallyBoldedTypography
          // Always show all the names.
          variant="subtitle1"
          css={css`
            text-wrap: balance;
            color: ${COLORS.greys[3]};
          `}
        >
          {languageCardData.names.join(", ")}
        </PartiallyBoldedTypography>
      )}
    </OptionCard>
  );
});
