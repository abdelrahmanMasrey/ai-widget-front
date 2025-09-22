import React from "react";
import ReactDOM from "react-dom/client";
import CallWidget from "./callWidget";

// find or create the widget root
const host =
  document.querySelector("#ai-voice-widget-root") ||
  document.body.appendChild(document.createElement("div"));

// create shadow DOM
const shadow = host.attachShadow({ mode: "open" });

// inject stylesheet into shadow root
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "https://ai-widget-front.vercel.app/index.css"; // 👈 your CSS file
shadow.appendChild(link);

// inject dynamic CSS variables
const color = host.getAttribute("data-color") || "#ca25ae";
const styleVars = document.createElement("style");
styleVars.textContent = `:host { --aiw-color: ${color}; }`;
shadow.appendChild(styleVars);

// create container for React to render inside shadow root
const container = document.createElement("div");
shadow.appendChild(container);

// read config from host element
const position = host.getAttribute("data-position") || "bottom-right";
const agentId = host.getAttribute("data-agent-id") || "";
const text = host.getAttribute("data-text") || "";

// render the widget into the shadow DOM
ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <CallWidget
      position={position}
      agentId={agentId}
      color={color}
      text={text}
    />
  </React.StrictMode>
);
