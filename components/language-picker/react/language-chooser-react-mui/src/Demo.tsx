/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { IScript, IRegion } from "@ethnolib/find-language";
import { ThemeProvider, createTheme } from "@mui/material";
import { COLORS } from "./colors";
import { ILanguagePickerInitialState } from "../../common/useLanguagePicker";
import "./styles.css";
import { defaultSearchResultModifier } from "@ethnolib/find-language/searchResultModifiers";
import { LanguagePicker } from "./LanguagePicker";

function Demo() {
  // TODO use this theme more? Put all the colors into the theme?
  const theme = createTheme({
    palette: {
      primary: {
        main: COLORS.blues[2],
      },
    },
  });

  // To demonstrate the ability to reopen to a desired state
  function getDemoInitialState() {
    return {
      languageCode: "uzb",
      script: {
        code: "Cyrl",
        name: "Cyrillic",
      } as IScript,
      customDetails: {
        displayName: "TestOverridenDisplayName",
        region: {
          code: "US",
          name: "United States of America",
        } as IRegion,
        dialect: "testDialectName",
      },
    } as ILanguagePickerInitialState;
  }

  return (
    <ThemeProvider theme={theme}>
      <div
        css={css`
          background-color: rgb(60, 60, 60);
          width: 100%;
          height: 100vh;
          padding: 17px;
        `}
      >
        <LanguagePicker
          searchResultModifier={defaultSearchResultModifier}
          getInitialState={getDemoInitialState}
        />
      </div>
    </ThemeProvider>
  );
}

export default Demo;
