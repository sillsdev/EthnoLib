/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { IScript, IRegion } from "@ethnolib/find-language";
import { ThemeProvider, createTheme } from "@mui/material";
import { COLORS } from "./colors";
import { ILanguageChooserInitialState } from "@ethnolib/language-chooser-react-hook";
import "./styles.css";
import { defaultSearchResultModifier } from "@ethnolib/find-language/searchResultModifiers";
import { LanguageChooser } from "./LanguageChooser";

function Demo() {
  // TODO future work: move all the colors used into the theme
  const theme = createTheme({
    palette: {
      primary: {
        main: COLORS.blues[2],
      },
    },
  });

  const uzbekLanguage = {
    autonym: "ўзбек тили",
    exonym: "[Uzb]ek",
    iso639_3_code: "uzb",
    languageSubtag: "uz",
    regionNames: "[Uzb]ekistan, Afghanistan, China",
    scripts: [
      {
        code: "Latn",
        name: "Latin",
      },
      {
        code: "Arab",
        name: "Arabic",
      },
      {
        code: "Cyrl",
        name: "Cyrillic",
      },
      {
        code: "Sogd",
        name: "Sogdian",
      },
    ],
    names: [
      "O[uzb]ek",
      "O’zbek",
      "Usbaki",
      "Usbeki",
      "[Uzb]ek, Northern",
      "oʻzbek",
      "oʻzbek tili",
      "oʻzbekcha",
      "Özbek",
      "o‘zbek",
      null,
      "اوزبیک",
      "ўзбекча",
    ],
    alternativeTags: [
      "uz-Latn",
      "uz-UZ",
      "uz-uzn",
      "uz-uzn-Latn",
      "uz-uzn-Latn-UZ",
      "uz-uzn-UZ",
      "uzn",
      "uzn-Latn",
      "uzn-Latn-UZ",
      "uzn-UZ",
      "uz-Arab",
      "uz-uzn-Arab",
      "uz-uzn-Arab-AF",
      "uzn-Arab",
      "uzn-Arab-AF",
      "uz-uzn-Brai",
      "uz-uzn-Brai-UZ",
      "uzn-Brai",
      "uzn-Brai-UZ",
      "uz-uzn-Cyrl",
      "uz-uzn-Cyrl-UZ",
      "uzn-Cyrl",
      "uzn-Cyrl-UZ",
      "uz-uzn-Sogd",
      "uz-uzn-Sogd-CN",
      "uzn-Sogd",
      "uzn-Sogd-CN",
    ],
  };

  // To demonstrate the ability to reopen to a desired state
  const initialState: ILanguageChooserInitialState = {
    language: uzbekLanguage,
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
  } as ILanguageChooserInitialState;

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
        <LanguageChooser
          searchResultModifier={defaultSearchResultModifier}
          initialState={initialState}
        />
      </div>
    </ThemeProvider>
  );
}

export default Demo;
