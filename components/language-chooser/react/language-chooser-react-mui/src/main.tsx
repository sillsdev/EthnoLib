// import React from "react";
import ReactDOM from "react-dom";
import DialogDemo from "./demos/DialogDemo";
import React from "react";

ReactDOM.render(
  <React.StrictMode>
    <DialogDemo initialSearchString={"uz"} initialLanguageTag={"uz-arab"} />,
  </React.StrictMode>,
  document.getElementById("root")
);
