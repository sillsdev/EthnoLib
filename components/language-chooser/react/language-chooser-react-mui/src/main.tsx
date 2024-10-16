// import React from "react";
import ReactDOM from "react-dom";
import DialogDemo from "./demos/DialogDemo";
import React from "react";

ReactDOM.render(
  <React.StrictMode>
    <DialogDemo alreadyFilled={true} demoRightPanelComponent={true} />,
  </React.StrictMode>,
  document.getElementById("root")
);
