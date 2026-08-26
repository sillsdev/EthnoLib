import ReactDOM from "react-dom";
import DialogDemo from "./demos/DialogDemo";
import HostIntegrationDemo from "./demos/HostIntegrationDemo";
import React from "react";

// Read parameters from URL query parameters (for e2e testing)
const urlParams = new URLSearchParams(window.location.search);
const uiLanguage = urlParams.get("uiLanguage") || undefined;
const initialLanguageTag = urlParams.get("initialLanguageTag") || undefined;
const initialSearchString = urlParams.get("initialSearchString") || undefined;
const initialCustomDisplayName =
  urlParams.get("initialCustomDisplayName") || undefined;
// Which demo to serve. Defaults to DialogDemo, which is what every URL without this parameter has
// always got; "host-integration" serves HostIntegrationDemo instead.
const demo = urlParams.get("demo") || undefined;

const demoProps = {
  uiLanguage,
  initialLanguageTag,
  initialSearchString,
  initialCustomDisplayName,
};

ReactDOM.render(
  <React.StrictMode>
    {demo === "host-integration" ? (
      <HostIntegrationDemo {...demoProps} />
    ) : (
      <DialogDemo {...demoProps} />
    )}
  </React.StrictMode>,
  document.getElementById("root")
);
