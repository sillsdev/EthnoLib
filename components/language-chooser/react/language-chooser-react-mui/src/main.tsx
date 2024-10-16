// import React from "react";
import ReactDOM from "react-dom";
import Demo from "./Demo";
import React from "react";

ReactDOM.render(
  <React.StrictMode>
    <Demo alreadyFilled={true} demoRightPanelComponent={true} />,
  </React.StrictMode>,
  document.getElementById("root")
);
