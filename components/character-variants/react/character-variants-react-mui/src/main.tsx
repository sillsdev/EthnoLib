import React from "react";
import ReactDOM from "react-dom";
import { CharacterVariantsDemo } from "./demos/CharacterVariantsDemo";

// Read parameters from URL query parameters (handy for e2e testing later)
const urlParams = new URLSearchParams(window.location.search);
const primaryColor = urlParams.get("primaryColor") || undefined;
const fontUrl = urlParams.get("fontUrl") || undefined;

ReactDOM.render(
  <React.StrictMode>
    <CharacterVariantsDemo primaryColor={primaryColor} fontUrl={fontUrl} />
  </React.StrictMode>,
  document.getElementById("root")
);
