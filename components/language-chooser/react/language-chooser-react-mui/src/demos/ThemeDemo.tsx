/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { LanguageChooser } from "../LanguageChooser";
import React from "react";
import {
  Button,
  createTheme,
  FormControl,
  FormControlLabel,
  lighten,
  darken,
  Radio,
  RadioGroup,
  ThemeProvider,
  Typography,
  Checkbox,
} from "@mui/material";
import { defaultSearchResultModifier } from "@ethnolib/find-language";

const PrimaryColorChoices = ["#1d94a4", "#512f6b", "#3b1e04", "#800303"];

export const ThemeDemo: React.FunctionComponent = () => {
  const [primaryColor, setPrimaryColor] = React.useState(
    PrimaryColorChoices[0]
  );
  const [colorOverrides, setColorOverrides] = React.useState(false);
  const theme = createTheme();
  if (primaryColor) {
    theme.palette.primary.main = primaryColor;
    theme.palette.primary.light = lighten(primaryColor, 0.2);
    theme.palette.primary.dark = darken(primaryColor, 0.2);
  }
  const dialogActionButtons = (
    <div
      id="dialog-action-buttons-container"
      css={css`
        width: 100%;
        display: flex;
        justify-content: flex-end;
        padding-top: 15px;
        padding-bottom: 5px;
      `}
    >
      <Button
        css={css`
          margin-left: auto;
          margin-right: 10px;
          min-width: 100px;
        `}
        variant="contained"
        color="primary"
        onClick={() => undefined}
      >
        OK
      </Button>
      <Button
        css={css`
          min-width: 100px;
        `}
        variant="outlined"
        color="primary"
        onClick={() => undefined}
      >
        Cancel
      </Button>
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <div
        css={css`
          border-bottom: 2px solid ${primaryColor};
          padding: 20px;
        `}
      >
        <Typography
          variant="h1"
          css={css`
            font-size: 2rem;
            color: ${primaryColor};
          `}
        >
          This demonstrates the Language Chooser in different MUI theme
          contexts.
        </Typography>
      </div>
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: 40px;
        `}
      >
        <div
          id="color-chooser-container"
          css={css`
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
          `}
        >
          <Typography
            css={css`
              font-size: 1.5rem;
              margin-bottom: 10px;
            `}
          >
            Change theme primary color:
          </Typography>
          <FormControl>
            <RadioGroup
              name="radio-buttons-group"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            >
              {PrimaryColorChoices.map((color) => (
                <FormControlLabel
                  value={color}
                  control={<Radio />}
                  label={color}
                  key={color}
                  css={css`
                    color: ${color};
                    font-weight: bold;
                  `}
                />
              ))}
            </RadioGroup>
          </FormControl>
          {/* Add a checkbox to override the colors */}
          <FormControlLabel
            control={
              <Checkbox
                checked={colorOverrides}
                onChange={(e) => setColorOverrides(e.target.checked)}
                color="primary"
              />
            }
            label="Override theme colors"
          />
        </div>
        <div
          css={css`
            height: 600px;
            width: 1000px;
            border: 1px solid #888888;
            margin-top: 20px;
          `}
        >
          <LanguageChooser
            initialSearchString="uzbek"
            initialSelectionLanguageTag={"uz-cyrl"}
            searchResultModifier={defaultSearchResultModifier}
            actionButtons={dialogActionButtons}
            {...(colorOverrides && {
              languageCardBackgroundColorOverride: "#d2ebb2",
              scriptCardBackgroundColorOverride: "#ebe9b2",
            })}
          />
        </div>
      </div>
    </ThemeProvider>
  );
};
