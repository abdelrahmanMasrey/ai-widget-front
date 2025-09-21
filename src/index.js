import React from "react";
import axiosInstance from "./api"; 
import ReactDOM from "react-dom/client";
import CallWidget from "./callWidget";

const div = document.querySelector("#ai-voice-widget-root");

if (div) {
  const position = div.dataset.position || "bottom-right";
  const agentId = div.dataset.agentId;

  const root = ReactDOM.createRoot(div);
  root.render(
    <React.StrictMode>
      <CallWidget position={position} agentId={agentId} />
    </React.StrictMode>
  );
}

