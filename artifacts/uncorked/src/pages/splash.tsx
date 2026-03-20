import { useEffect, useState } from "react";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 600);
    const t2 = setTimeout(() => setPhase("out"), 2000);
    const t3 = setTimeout(() => onDone(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        backgroundColor: "#7b1c34",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "in" ? "opacity 0.6s ease" : phase === "out" ? "opacity 0.5s ease" : "none",
      }}
    >
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem",
          opacity: phase === "in" ? 0 : 1,
          transform: phase === "in" ? "translateY(16px)" : "translateY(0)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        <SplashGlass />

        <div style={{ textAlign: "center" }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "3.25rem", fontWeight: 600, color: "#faf7f2",
            letterSpacing: "0.06em", lineHeight: 1, margin: 0,
          }}>
            Uncorked
          </h1>
          <div style={{
            width: "48px", height: "1px", backgroundColor: "#c9a84c",
            margin: "0.75rem auto 0",
          }} />
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "0.95rem", fontStyle: "italic",
            color: "rgba(250, 247, 242, 0.6)",
            marginTop: "0.5rem", letterSpacing: "0.03em",
          }}>
            Your AI sommelier
          </p>
        </div>
      </div>
    </div>
  );
}

function SplashGlass() {
  return (
    <svg width="56" height="78" viewBox="0 0 52 72" fill="none">
      <path d="M8 4 C8 4 4 18 4 26 C4 39 14 48 26 48 C38 48 48 39 48 26 C48 18 44 4 44 4 Z"
        stroke="rgba(250,247,242,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M10 30 C10 30 8 28 8 26 C8 24 9 22 9 22 C14 22 38 22 43 22 C43 22 44 24 44 26 C44 28 42 30 42 30 C38 40 14 40 10 30 Z"
        fill="rgba(250,247,242,0.18)" />
      <line x1="26" y1="48" x2="26" y2="64" stroke="rgba(250,247,242,0.85)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="14" y1="64" x2="38" y2="64" stroke="rgba(250,247,242,0.85)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 14 C18 14 16 20 16 24" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}
