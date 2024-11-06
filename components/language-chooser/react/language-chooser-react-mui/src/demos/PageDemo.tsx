/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { defaultSearchResultModifier } from "@ethnolib/find-language";
import {
  AppBar,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
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

export const PageDemo: React.FunctionComponent = () => {
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
              height: 550px;
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
                padding: 30px;
                padding-top: 40px;
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
            id="top-center"
            css={css`
              flex-grow: 0;
              background-color: ${lightColor};
              height: 550px;
              color: ${darkColor};
              padding: 20px;
              padding-top: 100px;
              flex-shrink: 1;
              border-radius: 5px;
              // overflow: auto;
            `}
          >
            <Typography
              css={css`
                font-weight: bold;
                font-size: 1.25rem;
                // padding-top: 100%;
                // padding-bottom: 100%;
                border: 1px solid ${darkColor};
                border-radius: 5px;
                padding: 10px;
                width: 300px;
                margin-bottom: 20px;
              `}
            >
              This is just a goofy page to demonstrate the language chooser in a
              non-dialog context.
            </Typography>
            <FormControl>
              <FormLabel
                id="demo-radio-buttons-group-label"
                css={css`
                  color: ${darkColor};
                  font-size: 2rem;
                `}
              >
                Color:
              </FormLabel>
              <RadioGroup
                aria-labelledby="demo-radio-buttons-group-label"
                defaultValue="red"
                name="radio-buttons-group"
              >
                <FormControlLabel value="red" control={<Radio />} label="Red" />
                <FormControlLabel
                  value="blue"
                  control={<Radio />}
                  label="Blue"
                />
                <FormControlLabel
                  value="green"
                  control={<Radio />}
                  label="Green"
                />
              </RadioGroup>
            </FormControl>
          </div>
          <div
            css={css`
              height: 550px;
              width: 1000px;
              flex-shrink: 1;
              overflow: auto;
            `}
          >
            <LanguageChooser
              css={css`
                border-radius: 0px;
              `}
              searchResultModifier={defaultSearchResultModifier}
              onClose={() => undefined}
            />
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
          `}
        >
          <Typography>
            We are a global, faith-based nonprofit that works with local
            communities around the world to develop language solutions that
            expand possibilities for a better life. SIL's core contribution
            areas are Scripture translation, literacy, education, development,
            linguistic research and language tools. We are eager for the day
            when all people enjoy equal access to education, to socio-economic
            opportunities, and to resources for spiritual growth - no matter
            what language they speak or sign. We are a global, faith-based
            nonprofit that works with local communities around the world to
            develop language solutions that expand possibilities for a better
            life. SIL's core contribution areas are Scripture translation,
            literacy, education, development, linguistic research and language
            tools. We are eager for the day when all people enjoy equal access
            to education, to socio-economic opportunities, and to resources for
            spiritual growth - no matter what language they speak or sign. We
            are a global, faith-based nonprofit that works with local
            communities around the world to develop language solutions that
            expand possibilities for a better life. SIL's core contribution
            areas are Scripture translation, literacy, education, development,
            linguistic research and language tools. We are eager for the day
            when all people enjoy equal access to education, to socio-economic
            opportunities, and to resources for spiritual growth - no matter
            what language they speak or sign. We are a global, faith-based
            nonprofit that works with local communities around the world to
            develop language solutions that expand possibilities for a better
            life. SIL's core contribution areas are Scripture translation,
            literacy, education, development, linguistic research and language
            tools. We are eager for the day when all people enjoy equal access
            to education, to socio-economic opportunities, and to resources for
            spiritual growth - no matter what language they speak or sign. We
            are a global, faith-based nonprofit that works with local
            communities around the world to develop language solutions that
            expand possibilities for a better life. SIL's core contribution
            areas are Scripture translation, literacy, education, development,
            linguistic research and language tools. We are eager for the day
            when all people enjoy equal access to education, to socio-economic
            opportunities, and to resources for spiritual growth - no matter
            what language they speak or sign.
          </Typography>
        </div>
      </div>
    </div>
  );
};
