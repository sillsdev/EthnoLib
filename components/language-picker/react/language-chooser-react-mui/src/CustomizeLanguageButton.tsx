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
        box-shadow: 0px 2px 4px -1px rgba(0, 0, 0, 0.2),
          0px 4px 5px 0px rgba(0, 0, 0, 0.14),
          0px 1px 10px 0px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-transform: none;
        padding: 5px 10px;
      `}
      {...buttonProps}
    >
      <Typography
        variant="body1"
        css={css`
          text-transform: uppercase;
          font-weight: bold;
          display: flex; // for the icon
        `}
      >
        {showAsUnlistedLanguage && (
          <EditIcon
            css={css`
              margin-right: 5px;
            `}
          />
        )}
        {showAsUnlistedLanguage ? "Create Unlisted Language" : "Customize"}
      </Typography>
      <div
        id="custom-language-card-bottom"
        css={css`
          display: flex;
          width: 100%;
          justify-content: space-between;
        `}
      >
        <Typography
          variant="body2"
          css={css`
            text-align: left;
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
              color: ${COLORS.greys[2]};
            `}
          />
        </Tooltip>
      </div>
    </Button>
  );
};
