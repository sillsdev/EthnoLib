/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  IScript,
  IRegion,
  stripDemarcation,
  defaultSearchResultModifier,
} from "@ethnolib/find-language";
import { Button, Card, Dialog, Typography } from "@mui/material";
import { IOrthography } from "@ethnolib/language-chooser-react-hook";
import "./styles.css";
import { LanguageChooser } from "./LanguageChooser";
import React from "react";

export const Demo: React.FunctionComponent<{
  alreadyFilled?: boolean;
  dialogHeight?: string;
  dialogWidth?: string;
}> = (props) => {
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
  const samplePrefilledSelections: IOrthography = {
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
  } as IOrthography;

  const [open, setOpen] = React.useState(true);
  const [selectedValue, setSelectedValue] = React.useState(
    props.alreadyFilled ? samplePrefilledSelections : ({} as IOrthography)
  );

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = (value: IOrthography | undefined) => {
    setOpen(false);
    if (value !== undefined) {
      setSelectedValue(value);
    }
  };

  return (
    <div
      css={css`
        width: 100%;
        height: 100vh;
        padding: 17px;
      `}
    >
      <div>
        <Typography variant="h3" component="div">
          Language Chooser Demo
        </Typography>
        <br></br>
        <div
          css={css`
            width: max-content;
            margin-left: 20px;
          `}
        >
          <Card
            css={css`
              margin-top: 20px;
              padding: 20px;
              background-color: rgb(220, 220, 220);
              border-radius: 0px;
              box-shadow: none;
              width: 500px;
            `}
          >
            <Typography component="div" css={css``}>
              Language Display Name: {selectedValue?.customDetails?.displayName}
              <br />
              Language Code:{" "}
              {stripDemarcation(selectedValue?.language?.languageSubtag)}
              <br />
              Script: {stripDemarcation(selectedValue?.script?.name)}
              <br />
              Region:{" "}
              {stripDemarcation(selectedValue?.customDetails?.region?.name)}
              <br />
              Dialect: {selectedValue?.customDetails?.dialect}
            </Typography>
          </Card>
          <br />
          <Button
            variant="contained"
            onClick={handleClickOpen}
            size="large"
            css={css`
              background-color: #1976d2;
            `}
          >
            Modify language selection
          </Button>
        </div>
        <Dialog
          open={open}
          maxWidth={props.dialogWidth ? "xl" : "md"}
          fullWidth={true}
          css={css`
            .MuiDialog-paper {
              height: ${props.dialogHeight ? props.dialogHeight : "586px"};
              ${props.dialogWidth ? `width: ${props.dialogWidth};` : ""}
            }
          `}
        >
          <LanguageChooser
            searchResultModifier={defaultSearchResultModifier}
            initialState={selectedValue}
            onClose={handleClose}
          />
        </Dialog>
      </div>
    </div>
  );
};

export default Demo;
