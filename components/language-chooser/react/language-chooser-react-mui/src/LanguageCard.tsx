/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  OptionCard,
  OptionCardProps,
  OptionCardPropsWithoutColors,
} from "./OptionCard";
import { ILanguage } from "@ethnolib/find-language";
import { PartiallyBoldedTypography } from "./PartiallyBoldedTypography";
import { useTheme } from "@mui/material";

const COMMA_SEPARATOR = ", ";

export const LanguageCard: React.FunctionComponent<
  { languageCardData: ILanguage } & OptionCardPropsWithoutColors
> = ({ languageCardData, ...partialOptionCardProps }) => {
  const theme = useTheme();
  const optionCardProps = {
    ...partialOptionCardProps,
    backgroundColorWhenNotSelected: theme.palette.background.paper,
    backgroundColorWhenSelected: theme.palette.primary.lighter,
  } as OptionCardProps;
  return (
    <OptionCard {...optionCardProps}>
      <div
        // The top row of text on the card. Autonym exonym, language tag
        css={css`
          display: flex;
          flex-direction: row;
          gap: 20px;
          align-items: flex-start;
          margin-bottom: 8px;
        `}
        data-testid={`language-card-${languageCardData.iso639_3_code}`}
      >
        <div
          // holds the autonym and/or exonym. Grows to take up most of the top row
          css={css`
            flex-grow: 1;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            row-gap: 5px;
            column-gap: 20px;
          `}
        >
          {languageCardData.autonym && (
            <PartiallyBoldedTypography
              variant="h2"
              css={css`
                flex-grow: 1;
              `}
            >
              {languageCardData.autonym}
            </PartiallyBoldedTypography>
          )}
          {languageCardData.exonym !== languageCardData.autonym && (
            <PartiallyBoldedTypography
              variant="h2"
              css={css`
                flex-grow: 0;
              `}
            >
              {languageCardData.exonym}
            </PartiallyBoldedTypography>
          )}
        </div>
        <PartiallyBoldedTypography
          variant="body2"
          css={css`
            flex-grow: 0;
            margin-bottom: 1px; // for visual alignment
            color: ${theme.palette.grey[700]};
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
            // Copilot gave me this to cut off after 2 lines with an ellipsis
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            color: ${theme.palette.grey[700]};
          `}
        >{`A language of ${languageCardData.regionNames}`}</PartiallyBoldedTypography>
      )}
      {languageCardData.names.length > 0 && (
        <PartiallyBoldedTypography
          // Always show all the names.
          variant="subtitle1"
          css={css`
            text-wrap: balance;
            color: ${theme.palette.grey[700]};
          `}
        >
          {languageCardData.names.join(COMMA_SEPARATOR)}
        </PartiallyBoldedTypography>
      )}
    </OptionCard>
  );
};
