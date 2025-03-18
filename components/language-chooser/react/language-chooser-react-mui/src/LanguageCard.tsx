/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { OptionCard, OptionCardProps } from "./OptionCard";
import { ILanguage, rawIsoCode } from "@ethnolib/find-language";
import { PartiallyBoldedTypography } from "./PartiallyBoldedTypography";
import WarningIcon from "@mui/icons-material/Warning";
import { lighten, Stack, Typography, useTheme } from "@mui/material";
import { useLingui } from "@lingui/react/macro";

const COMMA_SEPARATOR = ", ";

export const LanguageCard: React.FunctionComponent<
  { languageCardData: ILanguage } & OptionCardProps
> = ({ languageCardData, ...origOptionCardProps }) => {
  const theme = useTheme();
  const { t } = useLingui();
  const optionCardProps = {
    ...origOptionCardProps,
    backgroundColorWhenSelected:
      origOptionCardProps.backgroundColorWhenSelected ??
      lighten(theme.palette.primary.main, 0.7), // If color not provided, fall back to 70% of primary color
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
        data-testid={`language-card-${rawIsoCode(languageCardData)}`}
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
      {/* For debugging. */}
      {/* <PartiallyBoldedTypography variant="subtitle1">
        {`ISO 639-3 code: ${languageCardData.iso639_3_code}`}
      </PartiallyBoldedTypography> */}
      {(languageCardData.regionNamesForDisplay?.length > 0 ||
        languageCardData.isMacrolanguage) && (
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
        >
          {languageCardData.isMacrolanguage
            ? languageCardData.regionNamesForDisplay?.length > 0
              ? t`A macrolanguage of ${languageCardData.regionNamesForDisplay}`
              : "A macrolanguage"
            : t`A language of ${languageCardData.regionNamesForDisplay}`}
        </PartiallyBoldedTypography>
      )}
      {languageCardData.isMacrolanguage && (
        // TODO this may need a gutterbottom
        <Stack
          alignItems="center"
          direction="row"
          gap={0.5}
          css={css`
            color: ${theme.palette.grey[700]};
          `}
        >
          <WarningIcon
            css={css`
              font-size: inherit;
              color: inherit;
            `}
          />
          <Typography variant="subtitle1">
            {t`It is usually better to pick a specific language instead of a macrolanguage.`}
          </Typography>
        </Stack>
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
