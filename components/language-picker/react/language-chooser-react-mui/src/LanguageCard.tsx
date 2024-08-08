/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { OptionCard, OptionCardProps } from "./OptionCard";
import { ILanguage } from "@ethnolib/find-language";
import { memo } from "react";
import { PartiallyBoldedTypography } from "./PartiallyBoldedTypography";

// TODO is this memo still useful?
export const LanguageCard: React.FunctionComponent<
  { languageCardData: ILanguage } & OptionCardProps
> = memo(({ languageCardData, ...optionCardProps }) => {
  return (
    <>
      <OptionCard {...optionCardProps}>
        <PartiallyBoldedTypography
          variant="h5"
          dangerouslySetDemarcatedText={
            languageCardData.autonym || languageCardData.exonym
          }
        />
        {languageCardData.autonym && (
          <PartiallyBoldedTypography
            variant="body2"
            dangerouslySetDemarcatedText={languageCardData.exonym}
          />
        )}
        <PartiallyBoldedTypography
          css={css`
            right: 0;
            top: 0;
            position: absolute;
            margin: 16px; // what should this be? To match the padding of the card
            font-family: "Roboto Mono", monospace;
          `}
          variant="body2"
          dangerouslySetDemarcatedText={languageCardData.code}
        />
        {languageCardData.regionNames?.length > 0 && (
          <PartiallyBoldedTypography
            variant="h5"
            gutterBottom
            css={css`
              margin-top: 8px; // above elements don't have bottom-gutters because one is optional
              // TODO Copilot did this and I don't understand it but it works
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            `}
            dangerouslySetDemarcatedText={`A language of ${languageCardData.regionNames}`}
          />
        )}
        {languageCardData.names.length > 0 && (
          <PartiallyBoldedTypography
            variant="body2"
            // Always show all the names
            css={css`
              text-wrap: balance;
            `}
            dangerouslySetDemarcatedText={languageCardData.names.join(", ")} // TODO
          />
        )}
      </OptionCard>
    </>
  );
});
