/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { defaultSearchResultModifier } from "@ethnolib/find-language";
import {
  Button,
  Card,
  createTheme,
  ThemeProvider,
  Typography,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import {
  defaultDisplayName,
  IOrthography,
  parseLangtagFromLangChooser,
} from "@ethnolib/language-chooser-react-hook";
import { LanguageChooserDialog } from "./LanguageChooserDialog";
import React from "react";
import { DummyRightPanelComponent } from "./DummyRightPanelComponent";
import availableLocales from "../../../../../../available-locales.json" with { type: "json" };

export const DialogDemo: React.FunctionComponent<{
  initialLanguageTag?: string;
  demoRightPanelComponent?: boolean;
  primaryColor?: string;
  initialSearchString?: string;
  initialCustomDisplayName?: string;
  dialogHeight?: string;
  dialogWidth?: string;
  languageCardBackgroundColorOverride?: string;
  scriptCardBackgroundColorOverride?: string;
}> = ({
  initialLanguageTag,
  demoRightPanelComponent,
  primaryColor,
  ...languageChooserDialogProps
}) => {
  // To demonstrate the ability to reopen to a desired state
  const initialSelection: IOrthography | undefined =
    parseLangtagFromLangChooser(initialLanguageTag || "");
  if (initialSelection?.language) {
    initialSelection.customDetails = {
      ...(initialSelection.customDetails || []),
      displayName:
        languageChooserDialogProps.initialCustomDisplayName ??
        defaultDisplayName(initialSelection.language),
    };
  }

  const [open, setOpen] = React.useState(true);
  const [selectedValue, setSelectedValue] = React.useState(
    initialSelection || ({} as IOrthography)
  );
  const [languageTag, setLanguageTag] = React.useState(
    initialLanguageTag || ""
  );
  const [uiLanguage, setUiLanguage] = React.useState("en");

  const handleClickOpen = () => {
    setOpen(true);
  };

  const onOk = (
    orthographyInfo: IOrthography | undefined,
    languageTag: string | undefined
  ) => {
    if (orthographyInfo !== undefined) {
      setSelectedValue(orthographyInfo);
    }
    if (languageTag !== undefined) {
      setLanguageTag(languageTag);
    }
    setOpen(false);
  };

  function onCancel() {
    setOpen(false);
  }
  const baseTheme = createTheme();
  if (primaryColor) {
    baseTheme.palette.primary.main = primaryColor;
  }

  return (
    <ThemeProvider theme={baseTheme}>
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
          <Typography variant="h6" component="div">
            UI:{" "}
            <LanguageSelector locale={uiLanguage} onChange={setUiLanguage} />
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
                Language Display Name:{" "}
                {selectedValue?.customDetails?.displayName}
                <br />
                Language Code: {selectedValue?.language?.languageSubtag}
                <br />
                Script: {selectedValue?.script?.name}
                <br />
                Region: {selectedValue?.customDetails?.region?.name}
                <br />
                Dialect: {selectedValue?.customDetails?.dialect}
                <br />
                Language tag: {languageTag}
              </Typography>
            </Card>
            <br />
            <Button variant="contained" onClick={handleClickOpen} size="large">
              Modify language selection
            </Button>
          </div>

          <LanguageChooserDialog
            open={open}
            searchResultModifier={defaultSearchResultModifier}
            initialSelectionLanguageTag={languageTag}
            onCancel={onCancel}
            onOk={onOk}
            rightPanelComponent={
              demoRightPanelComponent ? <DummyRightPanelComponent /> : undefined
            }
            {...languageChooserDialogProps}
            uiLanguage={uiLanguage}
          />
        </div>
      </div>
    </ThemeProvider>
  );
};

const LanguageSelector: React.FC<{
  locale: string;
  onChange: (value: string) => void;
}> = ({ locale, onChange }) => {
  return (
    <FormControl>
      <Select
        value={locale}
        onChange={(e) => onChange(e.target.value as string)}
        size="small"
      >
        {availableLocales.map((code: string) => (
          <MenuItem key={code} value={code}>
            {code}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default DialogDemo;
