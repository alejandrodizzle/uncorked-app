import { useState } from "react";
import { Home } from "lucide-react";
import type { ScanHistory } from "./home";
import type { Wine } from "./home";

type Props = {
  history: ScanHistory[];
  onViewScan: (wines: Wine[]) => void;
  onHome: () => void;
};

export default function HistoryScreen({ history, onViewScan, onHome }: Props) {
  return (
    <div style={{ minHeight: "100svh", width: "100%", backgroundColor: "#faf7f2" }}>
      <div style={{
        paddingTop: "env(safe-area-inset-top, 48px)",
        paddingLeft: "1.5rem",
        paddingRight: "1.5rem",
        paddingBottom: "1rem",
        borderBottom: "1px solid rgba(123,28,52,0.08)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "2rem", fontWeight: 700, color: "#5a1225",
              letterSpacing: "0.02em", lineHeight: 1,
            }}>
              History
            </h1>
            <p style={{
              color: "#9e7b7b", fontSize: "0.85rem",
              fontFamily: "'Inter', sans-serif", marginTop: "0.25rem",
            }}>
              Last {history.length} {history.length === 1 ? "scan" : "scans"}
            </p>
          </div>
          <button
            onClick={onHome}
            title="Home"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "0.5rem" }}
          >
            <Home size={24} color="#5a1225" />
          </button>
        </div>
        <div style={{ width: "40px", height: "1px", backgroundColor: "#c9a84c", marginTop: "0.75rem" }} />
      </div>

      <div className="px-6 py-4" style={{ paddingBottom: "100px" }}>
        {history.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((entry, i) => (
              <HistoryCard key={entry.id} entry={entry} index={i} onView={() => onViewScan(entry.wines)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryCard({ entry, index, onView }: { entry: ScanHistory; index: number; onView: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(entry.scannedAt);
  const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "#fff",
        border: "1px solid rgba(123,28,52,0.08)",
        boxShadow: "0 2px 12px rgba(123,28,52,0.05)",
        animation: "fadeInUp 0.35s ease both",
        animationDelay: `${index * 60}ms`,
      }}
    >
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{ height: "3px", background: "linear-gradient(to right, #c9a84c, #7b1c34)" }} />

      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "1.1rem", fontWeight: 600, color: "#7b1c34",
              }}>
                {dateStr}
              </span>
              <span style={{
                fontSize: "0.7rem", color: "rgba(123,28,52,0.4)",
                fontFamily: "'Inter', sans-serif",
              }}>
                {timeStr}
              </span>
            </div>
            <p style={{
              fontSize: "0.72rem", color: "rgba(123,28,52,0.45)",
              fontFamily: "'Inter', sans-serif", marginTop: "2px",
            }}>
              {entry.wines.length} {entry.wines.length === 1 ? "wine" : "wines"} scanned
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onView}
              style={{
                padding: "5px 12px", borderRadius: "8px",
                backgroundColor: "#7b1c34", color: "#faf7f2",
                fontSize: "0.7rem", fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                border: "none", cursor: "pointer", letterSpacing: "0.02em",
              }}
            >
              View
            </button>
            <button
              onClick={() => setExpanded(p => !p)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(123,28,52,0.4)", padding: "4px",
                transition: "transform 0.2s",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>

        {expanded && (
          <div style={{ marginTop: "0.75rem", borderTop: "1px solid rgba(123,28,52,0.07)", paddingTop: "0.75rem" }}>
            <div className="flex flex-col gap-1.5">
              {entry.wines.map((wine, j) => (
                <div key={j} className="flex items-center justify-between">
                  <span style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "0.95rem", color: "#7b1c34",
                  }}>
                    {wine.name}
                    {wine.vintage && (
                      <span style={{ fontWeight: 400, opacity: 0.55, fontSize: "0.85rem", marginLeft: "0.3em" }}>
                        {wine.vintage}
                      </span>
                    )}
                  </span>
                  {wine.menuPrice != null && (
                    <span style={{
                      fontSize: "0.8rem", fontWeight: 600, color: "rgba(123,28,52,0.6)",
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                    }}>
                      ${wine.menuPrice}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div style={{ color: "rgba(123,28,52,0.2)", marginBottom: "1rem" }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <p style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: "1.2rem", fontWeight: 500, color: "#7b1c34", opacity: 0.5,
      }}>
        No scans yet
      </p>
      <p style={{
        fontSize: "0.78rem", color: "rgba(123,28,52,0.35)",
        fontFamily: "'Inter', sans-serif", marginTop: "0.5rem",
      }}>
        Your scan history will appear here
      </p>
    </div>
  );
}
