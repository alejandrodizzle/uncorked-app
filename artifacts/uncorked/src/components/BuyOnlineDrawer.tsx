import { useEffect, useRef } from "react";

type Props = {
  name: string;
  vintage: number | null;
  onClose: () => void;
};

type Retailer = {
  key: string;
  name: string;
  description: string;
  url: string;
  badge: string;
  badgeColor: string;
};

export default function BuyOnlineDrawer({ name, vintage, onClose }: Props) {
  const q = encodeURIComponent(vintage ? `${name} ${vintage}` : name);
  const qName = encodeURIComponent(name);
  const overlayRef = useRef<HTMLDivElement>(null);

  const retailers: Retailer[] = [
    {
      key: "wine-searcher",
      name: "Wine-Searcher",
      description: "Compare prices from hundreds of merchants worldwide",
      url: `https://www.wine-searcher.com/find/${q}`,
      badge: "WS",
      badgeColor: "#c0392b",
    },
    {
      key: "vivino",
      name: "Vivino",
      description: "Buy directly with community reviews & ratings",
      url: `https://www.vivino.com/search/wines?q=${q}`,
      badge: "V",
      badgeColor: "#AC1539",
    },
    {
      key: "total-wine",
      name: "Total Wine",
      description: "In-store pickup or delivery across the US",
      url: `https://www.totalwine.com/search/all?text=${qName}`,
      badge: "TW",
      badgeColor: "#1a4a7a",
    },
  ];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        backgroundColor: "rgba(20,5,10,0.65)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        animation: "fadeInOverlay 0.2s ease",
      }}
    >
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpDrawer { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      <div
        style={{
          width: "100%", maxWidth: "430px",
          background: "linear-gradient(160deg, #7b1c34 0%, #4d1120 100%)",
          borderRadius: "24px 24px 0 0",
          padding: "0 0 env(safe-area-inset-bottom, 0)",
          boxShadow: "0 -12px 50px rgba(20,5,10,0.4)",
          animation: "slideUpDrawer 0.3s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* Handle */}
        <div style={{ paddingTop: "0.875rem", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "rgba(250,247,242,0.2)" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "1rem 1.25rem 0.75rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{
              fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#c9a84c",
              fontFamily: "'Inter', sans-serif", margin: "0 0 0.25rem",
            }}>
              Buy Online
            </p>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "1.35rem", fontWeight: 600, color: "#faf7f2",
              letterSpacing: "0.01em", lineHeight: 1.2, margin: 0,
            }}>
              {name}
              {vintage && (
                <span style={{ fontWeight: 400, color: "rgba(250,247,242,0.55)", marginLeft: "0.4em", fontSize: "1.15rem" }}>
                  {vintage}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(250,247,242,0.12)", border: "none",
              borderRadius: "10px", width: "32px", height: "32px",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: "2px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(250,247,242,0.8)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Gold separator */}
        <div style={{ height: "1px", backgroundColor: "rgba(201,168,76,0.25)", margin: "0 1.25rem 0.25rem" }} />

        {/* Retailer rows */}
        <div style={{ padding: "0.25rem 0 1.5rem" }}>
          {retailers.map((r, idx) => (
            <a
              key={r.key}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: "0.875rem",
                padding: "0.875rem 1.25rem",
                textDecoration: "none",
                borderBottom: idx < retailers.length - 1 ? "1px solid rgba(250,247,242,0.07)" : "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(250,247,242,0.05)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              {/* Badge */}
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px",
                backgroundColor: r.badgeColor,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}>
                <span style={{
                  fontSize: r.badge.length > 1 ? "0.62rem" : "0.85rem",
                  fontWeight: 800, color: "#fff",
                  fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em",
                }}>
                  {r.badge}
                </span>
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: "'Inter', sans-serif", fontSize: "0.88rem",
                  fontWeight: 600, color: "#faf7f2",
                  margin: "0 0 0.15rem", lineHeight: 1,
                }}>
                  {r.name}
                </p>
                <p style={{
                  fontFamily: "'Inter', sans-serif", fontSize: "0.72rem",
                  color: "rgba(250,247,242,0.5)", margin: 0, lineHeight: 1.3,
                }}>
                  {r.description}
                </p>
              </div>

              {/* Arrow */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
