import { Home } from "lucide-react";
import type { SavedWine } from "./home";
import type { SearchResult } from "../types/search";

type Props = {
  savedWines: SavedWine[];
  onRemove: (wine: SavedWine) => void;
  onHome: () => void;
  onWineSelect: (wine: SearchResult) => void;
};

export default function SavedScreen({ savedWines, onRemove, onHome, onWineSelect }: Props) {
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
              Saved Wines
            </h1>
            <p style={{
              color: "#9e7b7b", fontSize: "0.85rem",
              fontFamily: "'Inter', sans-serif", marginTop: "0.25rem",
            }}>
              {savedWines.length} {savedWines.length !== 1 ? "wines" : "wine"} bookmarked
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
        {savedWines.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {savedWines.slice().reverse().map((wine, i) => (
              <SavedCard
                key={`${wine.name}||${wine.vintage}||${i}`}
                wine={wine}
                onRemove={() => onRemove(wine)}
                onSelect={() => onWineSelect({
                  name: wine.name,
                  vintage: wine.vintage,
                  region: wine.region,
                  grape: wine.grape,
                  vivinoRating: null,
                  vivinoRatingsCount: null,
                  vivinoWineId: null,
                  tastingNotes: wine.tastingNotes ?? null,
                })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SavedCard({ wine, onRemove, onSelect }: { wine: SavedWine; onRemove: () => void; onSelect: () => void }) {
  const query = encodeURIComponent(wine.vintage ? `${wine.name} ${wine.vintage}` : wine.name);
  const savedDate = new Date(wine.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      onClick={onSelect}
      style={{
        backgroundColor: "#fff",
        border: "1px solid rgba(123,28,52,0.08)",
        boxShadow: "0 2px 12px rgba(123,28,52,0.05)",
        animation: "fadeInUp 0.35s ease both",
        cursor: "pointer",
      }}
    >
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{ height: "3px", background: "linear-gradient(to right, #7b1c34, #c9a84c)" }} />

      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.15rem", fontWeight: 600, color: "#7b1c34",
            lineHeight: 1.25, flex: 1,
          }}>
            {wine.name}
            {wine.vintage && (
              <span style={{ fontWeight: 400, color: "rgba(123,28,52,0.5)", fontSize: "1rem", marginLeft: "0.4em" }}>
                {wine.vintage}
              </span>
            )}
          </h3>

          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title="Remove bookmark"
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "2px", flexShrink: 0, color: "#c9a84c",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {wine.region && (
            <span style={{
              fontSize: "0.72rem", color: "rgba(123,28,52,0.6)",
              fontFamily: "'Inter', sans-serif",
              backgroundColor: "rgba(123,28,52,0.06)",
              padding: "2px 8px", borderRadius: "6px",
              border: "1px solid rgba(123,28,52,0.08)",
            }}>
              {wine.region}
            </span>
          )}
          {wine.grape && (
            <span style={{
              fontSize: "0.72rem", color: "rgba(123,28,52,0.6)",
              fontFamily: "'Inter', sans-serif",
              backgroundColor: "rgba(123,28,52,0.06)",
              padding: "2px 8px", borderRadius: "6px",
              border: "1px solid rgba(123,28,52,0.08)",
            }}>
              {wine.grape}
            </span>
          )}
          {wine.menuPrice != null && (
            <span style={{
              fontSize: "0.72rem", color: "#7b1c34", fontWeight: 600,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              backgroundColor: "rgba(201,168,76,0.1)",
              padding: "2px 8px", borderRadius: "6px",
              border: "1px solid rgba(201,168,76,0.25)",
            }}>
              ${wine.menuPrice}
            </span>
          )}
        </div>

        {wine.tastingNotes && (
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "0.95rem", fontStyle: "italic",
            color: "rgba(60,15,25,0.65)", lineHeight: 1.5,
            marginBottom: "0.75rem",
          }}>
            {wine.tastingNotes}
          </p>
        )}

        <div style={{ height: "1px", backgroundColor: "rgba(123,28,52,0.07)", marginBottom: "0.75rem" }} />

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {[
              { abbr: "G", url: `https://www.google.com/search?q=${query}+wine+rating` },
              { abbr: "WS", url: `https://www.winespectator.com/search?t=${query}` },
              { abbr: "WE", url: `https://www.winemag.com/?s=${query}` },
              { abbr: "RP", url: `https://www.robertparker.com/search?query=${query}` },
            ].map(({ abbr, url }) => (
              <a key={abbr} href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "26px", height: "22px", borderRadius: "5px",
                  backgroundColor: "#7b1c34", color: "#faf7f2",
                  fontSize: "0.55rem", fontWeight: 700,
                  fontFamily: "'Inter', sans-serif", textDecoration: "none",
                  letterSpacing: "0.02em",
                }}>
                {abbr}
              </a>
            ))}
          </div>
          <span style={{
            fontSize: "0.65rem", color: "rgba(123,28,52,0.35)",
            fontFamily: "'Inter', sans-serif",
          }}>
            Saved {savedDate}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div style={{ color: "rgba(123,28,52,0.2)", marginBottom: "1rem" }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <p style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: "1.2rem", fontWeight: 500, color: "#7b1c34", opacity: 0.5,
      }}>
        No saved wines yet
      </p>
      <p style={{
        fontSize: "0.78rem", color: "rgba(123,28,52,0.35)",
        fontFamily: "'Inter', sans-serif", marginTop: "0.5rem", maxWidth: "220px",
      }}>
        Tap the bookmark icon on any wine card to save it here
      </p>
    </div>
  );
}
