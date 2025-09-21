// src/callwidget.jsx
import React, { useEffect, useRef, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";

/* --------------------------
   Helpers
   -------------------------- */
function hexToRgba(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* Build a layered gradient string using a base color */
function buildGlowBackground(hexColor = "#ca25ae") {
  // Make a few rgba variants for layering (alpha and slight offsets)
  const c1 = hexToRgba(hexColor, 0.95);
  const c2 = hexToRgba(hexColor, 0.75);
  const c3 = hexToRgba(hexColor, 0.55);

  // A multi-layer radial/conic-ish look — simplified for broad browser support
  return [
    `radial-gradient(circle at 40% 60%, ${c1} 0%, transparent 35%)`,
    `radial-gradient(circle at 70% 30%, ${c2} 0%, transparent 30%)`,
    `radial-gradient(circle at 30% 25%, ${c3} 0%, transparent 40%)`,
    // faint color wash
    `linear-gradient(120deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02))`
  ].join(", ");
}

/* --------------------------
   SiriOrb (JS-driven visuals + animations)
   -------------------------- */
function SiriOrb({ agentTalking = false, color = "#ca25ae", size = 160 }) {
  const orbRef = useRef(null);
  const glowRef = useRef(null);

  // Keep animation handles so we can cancel on unmount or when toggling
  const rotateAnimRef = useRef(null);
  const pulseAnimRef = useRef(null);
  const brightenAnimRef = useRef(null);

  useEffect(() => {
    const orbEl = orbRef.current;
    const glowEl = glowRef.current;
    if (!orbEl || !glowEl) return;

    // initial inline styles
    orbEl.style.width = `${size}px`;
    orbEl.style.height = `${size}px`;
    orbEl.style.borderRadius = "50%";
    orbEl.style.position = "relative";
    orbEl.style.overflow = "hidden";
    orbEl.style.display = "grid";
    orbEl.style.gridTemplateAreas = `"stack"`;
    orbEl.style.background = "transparent";

    glowEl.style.position = "absolute";
    glowEl.style.inset = "0";
    glowEl.style.borderRadius = "50%";
    glowEl.style.background = buildGlowBackground(color);
    glowEl.style.filter = "blur(12px) contrast(1.2) saturate(1)";
    glowEl.style.opacity = "0.5";
    glowEl.style.willChange = "transform, opacity, filter";

    // Rotation animation (continuous)
    if (rotateAnimRef.current) rotateAnimRef.current.cancel();
    rotateAnimRef.current = glowEl.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(360deg)" }
      ],
      {
        duration: 20000, // one full rotation = 20s
        iterations: Infinity,
        easing: "linear"
      }
    );

    // Set speaking/not-speaking states
    const updateSpeakingState = (speaking) => {
      // Pulse (scale) on orb
      if (pulseAnimRef.current) {
        pulseAnimRef.current.cancel();
        pulseAnimRef.current = null;
      }
      if (speaking) {
        pulseAnimRef.current = orbEl.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.05)" },
            { transform: "scale(1)" }
          ],
          {
            duration: 2000,
            iterations: Infinity,
            easing: "ease-in-out"
          }
        );
      } else {
        orbEl.style.transform = "scale(1)"; // reset
      }

      // Brighten/dim the glow using animation to smooth transition
      if (brightenAnimRef.current) brightenAnimRef.current.cancel();
      brightenAnimRef.current = glowEl.animate(
        speaking
          ? [
              { opacity: 0.5, filter: "blur(12px) contrast(1.2) saturate(1)" },
              { opacity: 1, filter: "blur(12px) contrast(1.8) saturate(1.6)" }
            ]
          : [
              { opacity: 1, filter: "blur(12px) contrast(1.8) saturate(1.6)" },
              { opacity: 0.5, filter: "blur(12px) contrast(1.2) saturate(1)" }
            ],
        {
          duration: 350,
          fill: "forwards",
          easing: "ease-out"
        }
      );
    };

    updateSpeakingState(agentTalking);

    return () => {
      // cleanup animations
      if (rotateAnimRef.current) rotateAnimRef.current.cancel();
      if (pulseAnimRef.current) pulseAnimRef.current.cancel();
      if (brightenAnimRef.current) brightenAnimRef.current.cancel();
    };
  }, [color, size]); // run when color or size changes

  // react to agentTalking toggles (start/stop pulse & brightening)
  useEffect(() => {
    const glowEl = glowRef.current;
    const orbEl = orbRef.current;
    if (!glowEl || !orbEl) return;

    // Reuse the same animation logic as above but in the effect responding to agentTalking.
    // For fairness we replicate animation start/cancel logic to ensure immediate feedback.
    if (orbEl._pulse) {
      orbEl._pulse.cancel();
      orbEl._pulse = null;
    }
    if (glowEl._bright) {
      glowEl._bright.cancel();
      glowEl._bright = null;
    }

    if (agentTalking) {
      orbEl._pulse = orbEl.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.05)" }, { transform: "scale(1)" }],
        { duration: 2000, iterations: Infinity, easing: "ease-in-out" }
      );
      glowEl._bright = glowEl.animate(
        [
          { opacity: 0.5, filter: "blur(12px) contrast(1.2) saturate(1)" },
          { opacity: 1, filter: "blur(12px) contrast(1.8) saturate(1.6)" }
        ],
        { duration: 350, fill: "forwards", easing: "ease-out" }
      );
    } else {
      // stop pulse and dim glow
      try { if (orbEl._pulse) orbEl._pulse.cancel(); } catch (e) {}
      orbEl.style.transform = "scale(1)";
      glowEl._bright = glowEl.animate(
        [
          { opacity: 1, filter: "blur(12px) contrast(1.8) saturate(1.6)" },
          { opacity: 0.5, filter: "blur(12px) contrast(1.2) saturate(1)" }
        ],
        { duration: 350, fill: "forwards", easing: "ease-out" }
      );
    }

    // cleanup on unmount toggles
    return () => {
      try { if (orbEl._pulse) orbEl._pulse.cancel(); } catch (e) {}
      try { if (glowEl._bright) glowEl._bright.cancel(); } catch (e) {}
    };
  }, [agentTalking]);

  // Render two layers: glow (rotating) and highlight overlay
  const orbContainerStyle = {
    display: "grid",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    position: "relative",
    overflow: "hidden",
    background: "transparent"
  };

  const glowLayerStyle = {
    position: "absolute",
    inset: "0",
    borderRadius: "50%",
    background: buildGlowBackground(color),
    filter: "blur(12px) contrast(1.2) saturate(1)",
    opacity: 0.5,
    willChange: "transform, opacity, filter"
  };

  const highlightLayerStyle = {
    position: "absolute",
    inset: "0",
    borderRadius: "50%",
    background: "radial-gradient(circle at 45% 55%, rgba(255,255,255,0.12), rgba(255,255,255,0.06) 30%, transparent 60%)",
    mixBlendMode: "overlay",
    pointerEvents: "none"
  };

  return (
    <div ref={orbRef} style={orbContainerStyle} aria-hidden>
      <div ref={glowRef} style={glowLayerStyle} />
      <div style={highlightLayerStyle} />
    </div>
  );
}

/* --------------------------
   Web Call Component (unchanged logic - UI now inline styles)
   -------------------------- */
function WebCallComponent({ onAgentTalking, agentTalking, color }) {
  const [retellClient, setRetellClient] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const client = new RetellWebClient();
    setRetellClient(client);

    client.on("call_started", () => {
      setCallActive(true);
      setConnecting(false);
    });

    client.on("call_ended", () => {
      setCallActive(false);
      setConnecting(false);
      onAgentTalking(false);
    });

    client.on("agent_start_talking", () => {
      onAgentTalking(true);
    });

    client.on("agent_stop_talking", () => {
      onAgentTalking(false);
    });

    client.on("error", (err) => {
      console.error("Retell error:", err);
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
      const resp = await fetch("https://voice-widget-virid.vercel.app/api/create-web-call", { method: "POST" });
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
        sampleRate: 24000
      });
    } catch (err) {
      console.error("Failed to start call:", err);
      setConnecting(false);
    }
  };

  const stopWebCall = () => {
    if (retellClient) retellClient.stopCall();
  };

  /* Inline styles for the panel + controls */
  const panelStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    width: "100%",
    height: "100%"
  };

  const actionsStyle = {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    justifyContent: "center"
  };

  const iconBtnBase = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
    borderRadius: "8px",
    padding: "8px"
  };

  const startBtnStyle = {
    ...iconBtnBase,
    width: "40px",
    height: "40px",
    background: color || "#ca25ae",
    color: "#fff",
    boxShadow: `0 6px 18px ${hexToRgba(color || "#ca25ae", 0.32)}`
  };

  const endBtnStyle = { ...startBtnStyle };

  /* Spinner (SVG) */
  const Spinner = () => (
    <svg width="20" height="20" viewBox="0 0 50 50" aria-hidden>
      <circle cx="25" cy="25" r="18" stroke="rgba(255,255,255,0.3)" strokeWidth="4" fill="none"></circle>
      <circle cx="25" cy="25" r="18" stroke="#fff" strokeWidth="4" strokeDasharray="80" strokeDashoffset="60" fill="none">
        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  );

  return (
    <div style={panelStyle}>
      <SiriOrb agentTalking={agentTalking} color={color} />

      <div style={actionsStyle}>
        {!callActive ? (
          <button onClick={startWebCall} disabled={connecting} style={startBtnStyle} aria-label="Start call">
            {connecting ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a1 1 0 011 1v16a1 1 0 11-2 0V4a1 1 0 011-1zm5 3a1 1 0 011 1v10a1 1 0 11-2 0V7a1 1 0 011-1zm-10 0a1 1 0 011 1v10a1 1 0 11-2 0V7a1 1 0 011-1z" /></svg>}
          </button>
        ) : (
          <button onClick={stopWebCall} style={endBtnStyle} aria-label="End call">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 23 23" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-3.75-3h9m0 0l-3-3m3 3l-3 3"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}

/* --------------------------
   Main widget wrapper (keeps previous API)
   -------------------------- */
export default function CallWidget({ position = "bottom-right", agentId = "", color = "#ca25ae", text = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [agentTalking, setAgentTalking] = useState(false);

  const isLeft = position.includes("left");
  const buttonStyle = {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    border: "none",
    background: color,
    color: "#fff",
    fontSize: "28px",
    cursor: "pointer",
    boxShadow: `0 8px 32px ${hexToRgba(color, 0.32)}`
  };

  const wrapperPosition = {
    position: "fixed",
    bottom: "24px",
    [isLeft ? "left" : "right"]: "24px",
    zIndex: 9999
  };

  const panelStyles = {
    position: "fixed",
    bottom: "100px",
    [isLeft ? "left" : "right"]: isOpen ? "24px" : "-380px",
    width: "320px",
    height: "360px",
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 12px 48px rgba(0,0,0,0.15)",
    transition: `${isLeft ? "left" : "right"} 0.4s ease`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    padding: "20px",
    zIndex: 9998
  };

  return (
    <>
      <div style={wrapperPosition}>
        <button onClick={() => setIsOpen(s => !s)} style={buttonStyle} aria-label="Toggle AI Assistant">
          🤖
        </button>
      </div>

      <div style={panelStyles}>
        {text ? <div style={{ marginBottom: 16, fontWeight: 700 }}>{text}</div> : null}
        <WebCallComponent onAgentTalking={setAgentTalking} agentTalking={agentTalking} color={color} />
      </div>
    </>
  );
}
