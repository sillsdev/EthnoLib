/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { defaultSearchResultModifier } from "@ethnolib/find-language";
import { Button, Card, Dialog, Typography } from "@mui/material";
import {
  defaultDisplayName,
  IOrthography,
  parseLangtagFromLangChooser,
} from "@ethnolib/language-chooser-react-hook";
import "../styles.css";
import { LanguageChooserDialog } from "./LanguageChooserDialog";
import React from "react";
import { DummyRightPanelComponent } from "./DummyRightPanelComponent";

export const DialogDemo: React.FunctionComponent<{
  initialSearchString?: string;
  initialLanguageTag?: string;
  initialCustomDisplayName?: string;
  demoRightPanelComponent?: boolean;
  dialogHeight?: string;
  dialogWidth?: string;
}> = (props) => {
  // To demonstrate the ability to reopen to a desired state
  const initialSelection: IOrthography | undefined =
    parseLangtagFromLangChooser(props.initialLanguageTag || "");
  if (initialSelection?.language) {
    initialSelection.customDetails = {
      ...(initialSelection.customDetails || []),
      displayName:
        props.initialCustomDisplayName ??
        defaultDisplayName(initialSelection.language),
    };
  }

  const [open, setOpen] = React.useState(true);
  const [selectedValue, setSelectedValue] = React.useState(
    initialSelection || ({} as IOrthography)
  );
  const [languageTag, setLanguageTag] = React.useState(
    props.initialLanguageTag || ""
  );

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

        <LanguageChooserDialog
          open={open}
          dialogWidth={props.dialogWidth}
          dialogHeight={props.dialogHeight}
          searchResultModifier={defaultSearchResultModifier}
          initialSearchString={props.initialSearchString}
          initialSelectionLanguageTag={languageTag}
          initialCustomDisplayName={props.initialCustomDisplayName}
          onCancel={onCancel}
          onOk={onOk}
          rightPanelComponent={
            props.demoRightPanelComponent ? (
              <DummyRightPanelComponent />
            ) : undefined
          }
        />
      </div>
    </div>
  );
};

export default DialogDemo;
