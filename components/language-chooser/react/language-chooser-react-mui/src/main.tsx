import ReactDOM from "react-dom";
import DialogDemo from "./demos/DialogDemo";
import React from "react";

// Read parameters from URL query parameters (for e2e testing)
const urlParams = new URLSearchParams(window.location.search);
const uiLanguage = urlParams.get("uiLanguage") || undefined;
const initialLanguageTag = urlParams.get("initialLanguageTag") || undefined;
const initialSearchString = urlParams.get("initialSearchString") || undefined;
const initialCustomDisplayName =
  urlParams.get("initialCustomDisplayName") || undefined;

ReactDOM.render(
  <React.StrictMode>
    <DialogDemo
      uiLanguage={uiLanguage}
      initialLanguageTag={initialLanguageTag}
      initialSearchString={initialSearchString}
      initialCustomDisplayName={initialCustomDisplayName}
    />
  </React.StrictMode>,
  document.getElementById("root")
);
