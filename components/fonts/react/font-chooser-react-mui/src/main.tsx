import React from "react";
import ReactDOM from "react-dom";
import { FontChooserScreenDemo } from "./demos/FontChooserScreenDemo";
import { injectVercelAnalytics } from "./demos/vercelAnalytics";

injectVercelAnalytics();

ReactDOM.render(
  <React.StrictMode>
    <FontChooserScreenDemo />
  </React.StrictMode>,
  document.getElementById("root")
);
