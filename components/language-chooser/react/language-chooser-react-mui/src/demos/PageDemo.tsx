/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { defaultSearchResultModifier } from "@ethnolib/find-language";
import {
  AppBar,
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Toolbar,
  Typography,
} from "@mui/material";
import "../styles.css";
import { LanguageChooser } from "../LanguageChooser";
import React from "react";
import { OptionCard } from "../OptionCard";

const darkColor = "#800303";
const mediumColor = "#bd746f";
const lightColor = "#e8caca";

const TOP_ROW_HEIGHT = "600px";

export const PageDemo: React.FunctionComponent = () => {
  const [languageTag, setLanguageTag] = React.useState("");
  return (
    <div
      css={css`
        width: 100%;
        height: 100vh;
      `}
    >
      <AppBar
        position="static"
        css={css`
          background-color: ${darkColor};
          padding: 20px;
        `}
      >
        <Toolbar>
          <Typography
            variant="h3"
            component="div"
            align="center"
            css={css`
              flex-grow: 1;
            `}
          >
            Settings
          </Typography>
          <Button color="inherit">Login</Button>
        </Toolbar>
      </AppBar>
      <div
        css={css`
          display: flex;
          flex-direction: column;
        `}
      >
        <div
          css={css`
            display: flex;
            background-color: ${lightColor};
          `}
        >
          <div
            id="top-left"
            css={css`
              background-color: #ffffff;
              height: ${TOP_ROW_HEIGHT};
              width: 300px;
              flex-shrink: 1;
              flex-grow: 0;
              overflow: auto;
            `}
          >
            <div
              css={css`
                height: 100%;
                display: flex;
                flex-direction: column;
                gap: 10px;
                color: ${darkColor};
                padding: 20px;
                background-color: #f7e6e7;
                border-radius: 5px;
              `}
            >
              <Typography variant="h4">Font:</Typography>
              <OptionCard
                isSelected={false}
                backgroundColorWhenSelected={lightColor}
                backgroundColorWhenNotSelected={lightColor}
                css={css`
                  color: ${darkColor};
                  border: 1px solid ${darkColor};
                  height: 100px;
                `}
              >
                <div
                  css={css`
                    font-family: "Roboto Mono", monospace;
                    font-size: 2rem;
                    font-weight: 700;
                  `}
                >
                  Roboto Mono
                </div>
              </OptionCard>
              <OptionCard
                isSelected={false}
                backgroundColorWhenSelected={lightColor}
                backgroundColorWhenNotSelected={lightColor}
                css={css`
                  color: ${darkColor};
                  border: 1px solid ${darkColor};
                  height: 100px;
                `}
              >
                <div
                  css={css`
                    font-family: serif;
                    font-size: 2rem;
                    font-weight: 700;
                  `}
                >
                  Serif
                </div>
              </OptionCard>
              <OptionCard
                isSelected={false}
                backgroundColorWhenSelected={lightColor}
                backgroundColorWhenNotSelected={lightColor}
                css={css`
                  color: ${darkColor};
                  border: 1px solid ${darkColor};
                  height: 100px;
                `}
              >
                <div
                  css={css`
                    font-family: sans-serif;
                    font-size: 2rem;
                    font-weight: 700;
                  `}
                >
                  Sans-serif
                </div>
              </OptionCard>
            </div>
          </div>
          <div
            id="top-right"
            css={css`
              height: ${TOP_ROW_HEIGHT};
              width: 1000px;
              flex-shrink: 1;
              overflow: auto;
              background-color: white;
              color: ${darkColor};
              display: flex;
              flex-direction: column;
            `}
          >
            <Typography
              variant="h4"
              css={css`
                padding: 20px;
                padding-bottom: 10px;
              `}
            >
              Language:
            </Typography>
            <LanguageChooser
              css={css`
                border-radius: 0px;
              `}
              initialSearchString="uzbek"
              initialSelectionLanguageTag={"uz-cyrl"}
              searchResultModifier={defaultSearchResultModifier}
              onSelectionChange={(
                _orthography,
                languageTag: string | undefined
              ) => {
                setLanguageTag(languageTag || "");
              }}
            />
          </div>
          <div
            id="top-center"
            css={css`
              flex-grow: 0;
              background-color: ${lightColor};
              height: ${TOP_ROW_HEIGHT};
              color: ${darkColor};
              padding: 20px;
              flex-shrink: 1;
              border-radius: 5px;
            `}
          >
            <Typography variant="h4">Color:</Typography>

            <FormControl>
              <RadioGroup
                aria-labelledby="demo-radio-buttons-group-label"
                defaultValue="red"
                name="radio-buttons-group"
              >
                <FormControlLabel
                  value="red"
                  control={<Radio />}
                  label="Red"
                  disabled={true}
                />
                <FormControlLabel
                  value="blue"
                  control={<Radio />}
                  label="Blue"
                  disabled={true}
                />
                <FormControlLabel
                  value="green"
                  control={<Radio />}
                  label="Green"
                  disabled={true}
                />
              </RadioGroup>
            </FormControl>
            <Typography
              css={css`
                font-weight: bold;
                font-size: 1.25rem;
                border: 1px solid ${darkColor};
                border-radius: 5px;
                padding: 10px;
                width: 300px;
                margin-bottom: 20px;
                margin-top: 50px;
              `}
            >
              This is just a goofy page to demonstrate the language chooser in a
              non-dialog context.
            </Typography>
          </div>
        </div>
        <div
          id="bottom"
          css={css`
            background-color: ${mediumColor};
            flex-grow: 1;
            width: 100%;
            min-height: 300px;
            padding: 30px;
            color: ${darkColor};
            display: flex;
            justify-content: space-between;
          `}
        >
          <Typography variant="h4">Selected Font: Roboto Mono </Typography>
          <Typography
            variant="h4"
            css={css`
              font-weight: bold;
            `}
          >
            Selected Language Tag: {languageTag}{" "}
          </Typography>
          <Typography variant="h4">Selected Color: red </Typography>
        </div>
      </div>
    </div>
  );
};
