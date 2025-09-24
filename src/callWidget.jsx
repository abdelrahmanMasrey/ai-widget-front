import React, { useEffect, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import "./callWidget.css";
import emoji from "./assets/ai-emoji.png";


/* ===========================
   Siri Orb Visualization
   =========================== */
function SiriOrb({ agentTalking }) {
  return (
    <div
      className={`siri-orb ${agentTalking ? "aiw-speaking" : ""}`}
      style={{ "--animation-duration": "10s" }} // keeps constant rotation
    ></div>
  );
}

/* ===========================
   Web Call Component
   =========================== */
function WebCallComponent({ onAgentTalking, agentTalking, agentId, color }) {
  const [retellClient, setRetellClient] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const client = new RetellWebClient();
    setRetellClient(client);

    client.on("call_started", () => {
      console.log("✅ Call started");
      setCallActive(true);
      setConnecting(false);
    });

    client.on("call_ended", () => {
      console.log("❌ Call ended");
      setCallActive(false);
      setConnecting(false);
      onAgentTalking(false);
    });

    client.on("agent_start_talking", () => {
      console.log("🗣️ Agent started talking");
      onAgentTalking(true);
    });

    client.on("agent_stop_talking", () => {
      console.log("🤫 Agent stopped talking");
      onAgentTalking(false);
    });

    client.on("error", (err) => {
      console.error("⚠️ Error during call:", err);
      client.stopCall();
      setCallActive(false);
      setConnecting(false);
      onAgentTalking(false);
    });

    return () => {
      client.stopCall();
    };
  }, [onAgentTalking]);

const startWebCall = async () => {
  if (!retellClient || connecting) return;
  setConnecting(true);

  try {
    const resp = await fetch("https://ai-widget-front.vercel.app/api/create-web-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: agentId, // 👈 send the agentId from props
        metadata: { origin: window.location.origin }, // optional
      }),
    });

    const data = await resp.json();
    const accessToken = data.access_token;

    if (!accessToken) {
      console.error("No access token returned:", data);
      setConnecting(false);
      return;
    }

    await retellClient.startCall({
      accessToken,
      inputAudioDeviceConfig: { deviceId: "default" },
      outputAudioDeviceConfig: { deviceId: "default" },
      sampleRate: 24000,
    });
  } catch (err) {
    console.error("Failed to start call:", err);
    setConnecting(false);
  }
};


  const stopWebCall = () => {
    if (retellClient) retellClient.stopCall();
  };

  return (
    <div className="aiw-call-panel">
      {/* Siri Orb */}
      <SiriOrb agentTalking={agentTalking} />

      {/* Call buttons */}
      <div className="aiw-call-actions">
        {!callActive ? (
          <button
            className="aiw-icon-btn aiw-start-btn"
            onClick={startWebCall}
            disabled={connecting}
          >
            {connecting ? (
              <span className="aiw-loader"></span>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                fill="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="1.8"
              >
                <path d="M12 3a1 1 0 011 1v16a1 1 0 11-2 0V4a1 1 0 011-1zm5 3a1 1 0 011 1v10a1 1 0 11-2 0V7a1 1 0 011-1zm-10 0a1 1 0 011 1v10a1 1 0 11-2 0V7a1 1 0 011-1z" />
              </svg>
            )}
          </button>
        ) : (
          <button className="aiw-icon-btn aiw-end-btn" onClick={stopWebCall}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="26"
              height="25"
              fill="none"
              viewBox="0 0 23 23"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-3.75-3h9m0 0l-3-3m3 3l-3 3"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/* ===========================
   AI Call Widget (main export)
   =========================== */
function AICallWidget({ position = "bottom-right", agentId, color, text }) {
  const [isOpen, setIsOpen] = useState(false);
  const [agentTalking, setAgentTalking] = useState(false);

  const isLeft = position.includes("left");

  const positionStyles = {
    position: "fixed",
    bottom: "24px",
    [isLeft ? "left" : "right"]: "24px",
    zIndex: 9999,
  };

  const panelStyles = {
    position: "fixed",
    bottom: "100px",
    [isLeft ? "left" : "right"]: isOpen ? "24px" : "-380px",
    width: "320px",
    height: "360px",
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.15)",
    transition: `${isLeft ? "left" : "right"} 0.4s ease`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    padding: "20px",
    zIndex: 9998,
  };

  return (
    <>
      {/* Floating toggle button */}
      <div style={positionStyles}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="aiw-floating-btn"
          aria-label="Toggle AI Assistant"
          style={{ backgroundColor: color }}
        >
            <img src={emoji} alt="AI Assistant" style={{ width: "45px", height: "45px" }} />
            
        </button>
      </div>

      {/* Sliding panel */}
      <div style={panelStyles}>
        {text && (
          <div style={{ fontFamily: "'Poppins', sans-serif", marginBottom: "8px" }}>{text}</div>
        )}

        <WebCallComponent
          onAgentTalking={setAgentTalking}
          agentTalking={agentTalking}
          agentId={agentId}
          color={color}
        />
      </div>
    </>
  );
}

/* ===========================
   Export
   =========================== */
export default function CallWidget({ position, agentId, color, text }) {
  return (
    <AICallWidget
      position={position}
      agentId={agentId}
      color={color}
      text={text}
    />
  );
}
