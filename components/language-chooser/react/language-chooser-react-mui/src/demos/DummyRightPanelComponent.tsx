/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { OptionCard } from "../OptionCard";
import { Typography } from "@mui/material";

// Just a quick dummy to demonstrate the right panel slot
export const DummyRightPanelComponent: React.FunctionComponent = () => {
  const darkColor = "#800303";
  const lightColor = "#e3dada";
  return (
    <div
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 10px;
        color: ${darkColor};
        padding: 15px;
      `}
    >
      <Typography>
        This language chooser component allows you to add other components you
        might need in this area. For example, a font picker.
      </Typography>
      <Typography variant="h1">Font:</Typography>
      <OptionCard
        isSelected={false}
        backgroundColorWhenSelected={lightColor}
        backgroundColorWhenNotSelected={"#FFFFFF"}
        css={css`
          color: ${darkColor};
          border: 1px solid ${darkColor};
        `}
      >
        <div
          css={css`
            font-family: "Roboto Mono", monospace;
            font-size: 1.25rem;
            font-weight: 700;
          `}
        >
          Roboto Mono
        </div>
      </OptionCard>
      <OptionCard
        isSelected={true}
        backgroundColorWhenSelected={lightColor}
        backgroundColorWhenNotSelected={"#FFFFFF"}
        css={css`
          color: ${darkColor};
          border: 1px solid ${darkColor};
        `}
      >
        <div
          css={css`
            font-family: serif;
            font-size: 1.25rem;
            font-weight: 700;
          `}
        >
          Serif
        </div>
      </OptionCard>
      <OptionCard
        isSelected={false}
        backgroundColorWhenSelected={lightColor}
        backgroundColorWhenNotSelected={"#FFFFFF"}
        css={css`
          color: ${darkColor};
          border: 1px solid ${darkColor};
        `}
      >
        <div
          css={css`
            font-family: sans-serif;
            font-size: 1.25rem;
            font-weight: 700;
          `}
        >
          Sans-serif
        </div>
      </OptionCard>
    </div>
  );
};
