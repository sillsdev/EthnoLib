/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { Button, ButtonProps, Tooltip, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { COLORS } from "./colors";

export const CustomizeLanguageButton: React.FunctionComponent<
  {
    currentTagPreview: string;
    forUnlistedLanguage: boolean;
  } & ButtonProps
> = ({
  currentTagPreview,
  forUnlistedLanguage: showAsUnlistedLanguage,
  ...buttonProps
}) => {
  return (
    <Button
      variant="outlined"
      color="primary"
      css={css`
        border: 1.5px solid ${COLORS.greys[1]};
        :hover {
          border-color: ${COLORS.black};
        }
        background-color: ${COLORS.white};
        box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-transform: none;
        padding: 5px 7px;
      `}
      {...buttonProps}
    >
      <Typography
        css={css`
          text-transform: uppercase;
          color: ${COLORS.black};
          font-size: 0.75rem;
          font-weight: bold;
          display: flex; // for the icon
          align-items: center;
        `}
      >
        {!showAsUnlistedLanguage && (
          <EditIcon
            css={css`
              height: 0.75rem;
              width: 0.75rem;
              // for visual alignment
              margin-right: 3px;
              margin-bottom: 3px;
            `}
          />
        )}
        {showAsUnlistedLanguage ? "Create Unlisted Language" : "Customize"}
      </Typography>
      <div
        id="custom-language-card-bottom"
        css={css`
          display: flex;
          align-items: center;
          width: 100%;
          justify-content: space-between;
        `}
      >
        <Typography
          variant="body2"
          css={css`
            text-align: left;
            color: ${COLORS.greys[3]};
          `}
        >
          {currentTagPreview}
        </Typography>
        <Tooltip
          title={
            showAsUnlistedLanguage
              ? "If you cannot find a language and it does not appear in ethnologue.com, you can instead define the language here."
              : "If you found main the language but need to change some of the specifics like Script or Dialect, you can do that here."
          }
        >
          <InfoOutlinedIcon
            css={css`
              color: ${COLORS.greys[3]};
              margin-left: 10px;
            `}
          />
        </Tooltip>
      </div>
    </Button>
  );
};
