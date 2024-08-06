/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { EthnolibCard, EthnolibCardProps } from "./EthnolibCard";
import { ILanguage } from "@ethnolib/find-language";
import { memo } from "react";
import { PartiallyBoldedTypography } from "./PartiallyBoldedTypography";

// inherits from EthnolibCardProps
interface LanguageCardProps extends EthnolibCardProps {
  languageCardData: ILanguage;
}

export const LanguageCard: React.FunctionComponent<LanguageCardProps> = memo(
  (props) => {
    return (
      <>
        <EthnolibCard {...props}>
          <PartiallyBoldedTypography
            variant="h5"
            dangerouslySetDemarcatedText={
              props.languageCardData.autonym || props.languageCardData.exonym
            }
          />
          {props.languageCardData.autonym && (
            <PartiallyBoldedTypography
              variant="body2"
              dangerouslySetDemarcatedText={props.languageCardData.exonym}
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
            dangerouslySetDemarcatedText={props.languageCardData.code}
          />
          {props.languageCardData.regionNames?.length > 0 && (
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
              dangerouslySetDemarcatedText={`A language of ${props.languageCardData.regionNames}`}
            />
          )}
          {props.languageCardData.names && (
            <PartiallyBoldedTypography
              variant="body2"
              // Always show all the names
              css={css`
                text-wrap: balance;
              `}
              dangerouslySetDemarcatedText={props.languageCardData.names}
            />
          )}
        </EthnolibCard>
      </>
    );
  }
);
