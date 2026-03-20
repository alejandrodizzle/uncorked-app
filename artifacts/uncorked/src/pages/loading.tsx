import { useEffect, useState } from "react";

export default function LoadingScreen() {
  const [scanPos, setScanPos] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const scanInterval = setInterval(() => {
      setScanPos((p) => (p >= 100 ? 0 : p + 1));
    }, 18);
    return () => clearInterval(scanInterval);
  }, []);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(dotsInterval);
  }, []);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ backgroundColor: "#faf7f2" }}
    >
      <div
        className="w-full flex flex-col items-center justify-center min-h-screen px-6 py-12"
        style={{ maxWidth: "430px" }}
      >
        {/* Scanner card */}
        <div
          className="w-full rounded-2xl overflow-hidden relative mb-10"
          style={{
            backgroundColor: "#fff",
            border: "1px solid rgba(123, 28, 52, 0.12)",
            boxShadow: "0 8px 32px rgba(123, 28, 52, 0.12)",
            aspectRatio: "4/3",
          }}
        >
          {/* Corner brackets */}
          <CornerBrackets />

          {/* Simulated menu text lines */}
          <div className="absolute inset-0 flex flex-col justify-center px-10 gap-3 opacity-10">
            {[80, 60, 75, 50, 70, 55, 65].map((w, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  height: "8px",
                  width: `${w}%`,
                  backgroundColor: "#7b1c34",
                }}
              />
            ))}
          </div>

          {/* Animated scan line */}
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${scanPos}%`,
              transition: "top 18ms linear",
              zIndex: 10,
            }}
          >
            {/* Glow above */}
            <div
              style={{
                height: "40px",
                background:
                  "linear-gradient(to bottom, transparent, rgba(201, 168, 76, 0.12))",
                marginBottom: "-1px",
              }}
            />
            {/* Line */}
            <div
              style={{
                height: "2px",
                background:
                  "linear-gradient(to right, transparent, #c9a84c 20%, #c9a84c 80%, transparent)",
                boxShadow: "0 0 12px rgba(201, 168, 76, 0.8), 0 0 4px rgba(201, 168, 76, 1)",
              }}
            />
            {/* Glow below */}
            <div
              style={{
                height: "40px",
                background:
                  "linear-gradient(to top, transparent, rgba(201, 168, 76, 0.12))",
                marginTop: "-1px",
              }}
            />
          </div>
        </div>

        {/* Wine glass icon */}
        <div className="mb-6">
          <svg
            width="36"
            height="50"
            viewBox="0 0 52 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 4 C8 4 4 18 4 26 C4 39 14 48 26 48 C38 48 48 39 48 26 C48 18 44 4 44 4 Z"
              stroke="#7b1c34"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M10 30 C10 30 8 28 8 26 C8 24 9 22 9 22 C14 22 38 22 43 22 C43 22 44 24 44 26 C44 28 42 30 42 30 C38 40 14 40 10 30 Z"
              fill="#7b1c34"
              opacity="0.18"
            />
            <line x1="26" y1="48" x2="26" y2="64" stroke="#7b1c34" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="14" y1="64" x2="38" y2="64" stroke="#7b1c34" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M18 14 C18 14 16 20 16 24" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>

        <h2
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#7b1c34",
            letterSpacing: "0.02em",
            marginBottom: "0.5rem",
          }}
        >
          Reading your wine list{dots}
        </h2>

        <p
          style={{
            fontSize: "0.875rem",
            color: "rgba(123, 28, 52, 0.55)",
            fontFamily: "'Inter', sans-serif",
            textAlign: "center",
          }}
        >
          Our AI sommelier is identifying each wine
        </p>

        {/* Gold divider */}
        <div
          style={{
            width: "40px",
            height: "1px",
            backgroundColor: "#c9a84c",
            marginTop: "1.5rem",
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}

function CornerBrackets() {
  const size = 24;
  const thickness = 2.5;
  const color = "#c9a84c";
  const offset = 16;

  const style = (pos: { top?: number; bottom?: number; left?: number; right?: number }) =>
    ({
      position: "absolute" as const,
      width: size,
      height: size,
      ...pos,
      zIndex: 20,
    });

  return (
    <>
      {/* Top-left */}
      <div style={style({ top: offset, left: offset })}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <path
            d={`M ${size} 0 L 0 0 L 0 ${size}`}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {/* Top-right */}
      <div style={style({ top: offset, right: offset })}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <path
            d={`M 0 0 L ${size} 0 L ${size} ${size}`}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {/* Bottom-left */}
      <div style={style({ bottom: offset, left: offset })}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <path
            d={`M 0 0 L 0 ${size} L ${size} ${size}`}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {/* Bottom-right */}
      <div style={style({ bottom: offset, right: offset })}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <path
            d={`M ${size} 0 L ${size} ${size} L 0 ${size}`}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  );
}
