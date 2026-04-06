import { useEffect, useState } from "react";
import { Home } from "lucide-react";
import type { SavedWine, Wine } from "./home";
import type { SearchResult } from "../types/search";
import { apiUrl } from "../lib/api";
import BuyOnlineDrawer from "../components/BuyOnlineDrawer";

type WineDetailAI = {
  consensusScore: number | null;
  tastingNotes: string | null;
  flavorTags: string[];
  foodPairings: string[];
  retailPriceMin: number | null;
  retailPriceMax: number | null;
  valueLabel: "Great Value" | "Fair Price" | "Overpriced" | null;
};

type CriticRating = { criticScore: number | null; criticScoreCount?: number; criticScoreLabel?: string | null; source?: string };
type CellarRating = { communityScore: number | null; reviewCount: number | null };

type Merchant = { name: string; price: number; location: string; url: string };
type MarketPriceData = { merchants: Merchant[]; avgPrice: number | null };

type TriedEntry = { rating: number; notes: string; triedAt: number };

type Props = {
  wine: SearchResult;
  savedWines: SavedWine[];
  onSaveToggle: (wine: Wine) => void;
  onHome: () => void;
};

export default function WineDetailScreen({ wine, savedWines, onSaveToggle, onHome }: Props) {
  const [aiDetail, setAiDetail] = useState<WineDetailAI | null>(null);
  const [vivinoRating, setVivinoRating] = useState<{ rating: number | null; ratingsCount: number | null } | null>(
    wine.vivinoRating != null ? { rating: wine.vivinoRating, ratingsCount: wine.vivinoRatingsCount } : null
  );
  const [criticRating, setCriticRating] = useState<CriticRating | null>(null);
  const [cellarRating, setCellarRating] = useState<CellarRating | null>(null);
  const [loadingAI, setLoadingAI] = useState(true);
  const [loadingVivino, setLoadingVivino] = useState(wine.vivinoRating == null);
  const [loadingCritic, setLoadingCritic] = useState(true);
  const [loadingCellar, setLoadingCellar] = useState(true);
  const [marketData, setMarketData] = useState<MarketPriceData | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [showMarket, setShowMarket] = useState(false);
  const [showTriedModal, setShowTriedModal] = useState(false);
  const [showBuyOnline, setShowBuyOnline] = useState(false);
  const [triedEntry, setTriedEntry] = useState<TriedEntry | null>(() => {
    try {
      const all: Record<string, TriedEntry> = JSON.parse(localStorage.getItem("uncorked_tried") ?? "{}");
      return all[`${wine.name}||${wine.vintage}`] ?? null;
    } catch { return null; }
  });

  const isSaved = savedWines.some((w) => w.name === wine.name && w.vintage === wine.vintage);
  const wineAsWine: Wine = { name: wine.name, vintage: wine.vintage, region: wine.region, grape: wine.grape, menuPrice: null, tastingNotes: wine.tastingNotes ?? null };

  useEffect(() => {
    // Fetch AI detail
    fetch(apiUrl("api/ai/wine-detail"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wine.name, vintage: wine.vintage, region: wine.region, grape: wine.grape }),
    })
      .then((r) => r.json())
      .then((d: WineDetailAI) => { setAiDetail(d); setLoadingAI(false); })
      .catch(() => setLoadingAI(false));

    // Fetch Vivino rating if not already known
    if (wine.vivinoRating == null) {
      fetch(apiUrl("api/ratings/vivino"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wine.name, vintage: wine.vintage }),
      })
        .then((r) => r.json())
        .then((d) => { setVivinoRating({ rating: d.rating, ratingsCount: d.ratingsCount }); setLoadingVivino(false); })
        .catch(() => setLoadingVivino(false));
    }

    // Fetch critic score (Wine-Searcher via RapidAPI)
    fetch(apiUrl("api/ratings/critic"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wine.name, vintage: wine.vintage }),
    })
      .then((r) => r.json())
      .then((d: CriticRating) => { setCriticRating(d); setLoadingCritic(false); })
      .catch(() => { setCriticRating({ criticScore: null, source: "Wine-Searcher" }); setLoadingCritic(false); });

    // Fetch CellarTracker community score
    fetch(apiUrl("api/ratings/cellartracker"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wine.name, vintage: wine.vintage }),
    })
      .then((r) => r.json())
      .then((d: CellarRating) => { setCellarRating(d); setLoadingCellar(false); })
      .catch(() => { setCellarRating({ communityScore: null, reviewCount: null }); setLoadingCellar(false); });

    // Fetch Wine-Searcher market prices
    fetch(apiUrl("api/market/prices"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wine.name, vintage: wine.vintage }),
    })
      .then((r) => r.json())
      .then((d: MarketPriceData) => { setMarketData(d); setLoadingMarket(false); })
      .catch(() => { setMarketData({ merchants: [], avgPrice: null }); setLoadingMarket(false); });
  }, []);

  const handleSaveTried = (rating: number, notes: string) => {
    const entry = { rating, notes, triedAt: Date.now() };
    setTriedEntry(entry);
    try {
      const all: Record<string, TriedEntry> = JSON.parse(localStorage.getItem("uncorked_tried") ?? "{}");
      all[`${wine.name}||${wine.vintage}`] = entry;
      localStorage.setItem("uncorked_tried", JSON.stringify(all));
    } catch { /* ignore */ }
    setShowTriedModal(false);
  };

  return (
    <div style={{ minHeight: "100svh", backgroundColor: "#faf7f2", maxWidth: "430px", margin: "0 auto" }}>

      {/* Hero header */}
      <div style={{
        background: "linear-gradient(160deg, #7b1c34 0%, #5a1225 100%)",
        padding: "3rem 1.5rem 2rem",
        position: "relative",
      }}>
        <button
          onClick={onHome}
          title="Home"
          style={{
            position: "absolute", top: "calc(1rem + env(safe-area-inset-top, 12px))", right: "1rem",
            background: "rgba(255,255,255,0.2)", border: "none",
            borderRadius: "50%", padding: "0.5rem",
            cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Home size={20} color="white" />
        </button>

        <div style={{ textAlign: "center", paddingTop: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🍷</div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(1.75rem, 7vw, 2.5rem)",
            fontWeight: 600, color: "#faf7f2",
            letterSpacing: "0.02em", lineHeight: 1.15,
            margin: "0 0 0.25rem",
          }}>
            {wine.name}
          </h1>
          {wine.vintage && (
            <span style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "1.25rem", color: "rgba(250,247,242,0.65)", fontWeight: 400,
            }}>
              {wine.vintage}
            </span>
          )}
          <div style={{ width: "40px", height: "1px", backgroundColor: "#c9a84c", margin: "0.875rem auto" }} />
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {wine.region && (
              <span style={{
                fontSize: "0.75rem", color: "rgba(250,247,242,0.7)",
                fontFamily: "'Inter', sans-serif",
                display: "flex", alignItems: "center", gap: "4px",
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                {wine.region}
              </span>
            )}
            {wine.grape && (
              <span style={{
                fontSize: "0.75rem", color: "rgba(250,247,242,0.7)",
                fontFamily: "'Inter', sans-serif",
                display: "flex", alignItems: "center", gap: "4px",
              }}>
                🍇 {wine.grape}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scores cluster */}
      <div className="px-5 py-5">
        <SectionLabel>Ratings</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>

          {/* Vivino */}
          <RatingCard
            label="🍷 VIVINO"
            labelColor="#AC1539"
            loading={loadingVivino}
            score={vivinoRating?.rating != null ? vivinoRating.rating.toFixed(1) : null}
            suffix="/5 ★"
            subtitle={vivinoRating?.ratingsCount != null
              ? `${vivinoRating.ratingsCount >= 1000 ? `${(vivinoRating.ratingsCount / 1000).toFixed(1)}k` : vivinoRating.ratingsCount} ratings`
              : "community"}
            na="Not rated"
          />

          {/* Critic Score — GPT-4o multi-publication average, with Vivino-derived fallback */}
          {(() => {
            const realCritic = criticRating?.criticScore ?? null;
            const vivinoVal = vivinoRating?.rating ?? null;
            const criticDisplay = realCritic !== null ? realCritic
              : vivinoVal != null && !loadingCritic ? Math.min(97, Math.round(75 + ((vivinoVal - 3.0) / (5.0 - 3.0)) * 22)) : null;
            const criticSub = realCritic !== null ? (criticRating?.criticScoreLabel ?? "critics")
              : vivinoVal != null && !loadingCritic ? "est." : "critics";
            const isEst = realCritic === null && criticDisplay !== null;
            return (
              <RatingCard
                label="🏆 CRITIC"
                labelColor="#c9a84c"
                loading={loadingCritic}
                score={criticDisplay !== null ? String(criticDisplay) : null}
                suffix="/100"
                subtitle={criticSub}
                tooltip="Averaged from Wine Spectator, Wine Enthusiast, James Suckling, Robert Parker, Vinous, Decanter & Jancis Robinson"
                na="N/A"
                estimated={isEst}
              />
            );
          })()}

          {/* Community Score — CellarTracker */}
          <RatingCard
            label="👥 COMMUNITY"
            labelColor="#5a7a5a"
            loading={loadingCellar}
            score={cellarRating?.communityScore != null ? String(cellarRating.communityScore) : null}
            suffix="/100"
            subtitle={cellarRating?.reviewCount != null
              ? `${cellarRating.reviewCount.toLocaleString()} reviews`
              : "CellarTracker"}
            tooltip="Based on community reviews from CellarTracker"
            na="N/A"
          />
        </div>

        {/* Value + retail price */}
        {!loadingAI && (aiDetail?.valueLabel || aiDetail?.retailPriceMin) && (
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {aiDetail?.valueLabel && <ValueBadge label={aiDetail.valueLabel} />}
            {aiDetail?.retailPriceMin != null && (
              <span style={{
                fontSize: "0.78rem", color: "rgba(123,28,52,0.55)",
                fontFamily: "'Inter', sans-serif",
              }}>
                Typical retail: <strong style={{ color: "#7b1c34" }}>
                  ${aiDetail.retailPriceMin}{aiDetail.retailPriceMax ? `–$${aiDetail.retailPriceMax}` : ""}
                </strong>
              </span>
            )}
          </div>
        )}

        {/* Wine-Searcher avg market price */}
        <div style={{ marginTop: "0.75rem" }}>
          {loadingMarket ? (
            <Shimmer width={160} height={13} radius={4} />
          ) : marketData?.avgPrice != null ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span style={{ fontSize: "0.75rem", color: "rgba(123,28,52,0.6)", fontFamily: "'Inter', sans-serif" }}>
                Avg. market price: <strong style={{ color: "#7b1c34" }}>${marketData.avgPrice.toFixed(2)}</strong>
              </span>
              {marketData.merchants.length > 0 && (
                <span style={{ fontSize: "0.65rem", color: "rgba(123,28,52,0.38)", fontFamily: "'Inter', sans-serif" }}>
                  · {marketData.merchants.length} {marketData.merchants.length === 1 ? "retailer" : "retailers"}
                </span>
              )}
            </div>
          ) : marketData?.merchants.length === 0 && !loadingMarket ? null : null}
        </div>
      </div>

      <Divider />

      {/* Tasting notes */}
      <div className="px-5 py-4">
        <SectionLabel>Tasting Notes</SectionLabel>
        {loadingAI ? (
          <div className="flex flex-col gap-2">
            <Shimmer width="100%" height={14} /><Shimmer width="90%" height={14} delay="0.15s" /><Shimmer width="75%" height={14} delay="0.3s" />
          </div>
        ) : (aiDetail?.tastingNotes || wine.tastingNotes) ? (
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.1rem", fontStyle: "italic",
            color: "rgba(60,15,25,0.78)", lineHeight: 1.65, margin: 0,
          }}>
            {aiDetail?.tastingNotes ?? wine.tastingNotes}
          </p>
        ) : null}
      </div>

      {/* Flavor tags */}
      {(!loadingAI && aiDetail?.flavorTags && aiDetail.flavorTags.length > 0) && (
        <>
          <Divider />
          <div className="px-5 py-4">
            <SectionLabel>Flavor Profile</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {aiDetail.flavorTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "5px 12px", borderRadius: "20px",
                    backgroundColor: "rgba(123,28,52,0.07)",
                    border: "1px solid rgba(123,28,52,0.12)",
                    fontSize: "0.75rem", fontWeight: 500,
                    color: "#7b1c34", fontFamily: "'Inter', sans-serif",
                    letterSpacing: "0.01em",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Food pairings */}
      {(!loadingAI && aiDetail?.foodPairings && aiDetail.foodPairings.length > 0) && (
        <>
          <Divider />
          <div className="px-5 py-4">
            <SectionLabel>Food Pairings</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {aiDetail.foodPairings.map((food) => (
                <span
                  key={food}
                  style={{
                    padding: "5px 12px", borderRadius: "20px",
                    backgroundColor: "rgba(201,168,76,0.1)",
                    border: "1px solid rgba(201,168,76,0.25)",
                    fontSize: "0.75rem", fontWeight: 500,
                    color: "#7b1c34", fontFamily: "'Inter', sans-serif",
                    display: "flex", alignItems: "center", gap: "5px",
                  }}
                >
                  🍽️ {food}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Critic links */}
      <Divider />
      <div className="px-5 py-4">
        <SectionLabel>Critic Reviews</SectionLabel>
        {(() => {
          const q = encodeURIComponent(wine.vintage ? `${wine.name} ${wine.vintage}` : wine.name);
          return (
            <div className="flex gap-2 flex-wrap">
              {[
                { abbr: "G", label: "Google", url: `https://www.google.com/search?q=${q}+wine+rating` },
                { abbr: "WS", label: "Wine Spectator", url: `https://www.winespectator.com/search?t=${q}` },
                { abbr: "WE", label: "Wine Enthusiast", url: `https://www.winemag.com/?s=${q}` },
                { abbr: "RP", label: "Robert Parker", url: `https://www.robertparker.com/search?query=${q}` },
              ].map(({ abbr, label, url }) => (
                <a key={abbr} href={url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "6px 12px", borderRadius: "8px",
                    border: "1px solid rgba(123,28,52,0.18)",
                    backgroundColor: "rgba(123,28,52,0.04)",
                    textDecoration: "none",
                  }}
                >
                  <span style={{
                    width: "18px", height: "18px", borderRadius: "4px",
                    backgroundColor: "#7b1c34", color: "#faf7f2",
                    fontSize: "0.55rem", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{abbr}</span>
                  <span style={{ fontSize: "0.72rem", color: "#7b1c34", fontFamily: "'Inter', sans-serif", fontWeight: 500, whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                </a>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Action buttons */}
      <div className="px-5 py-5 flex flex-col gap-3" style={{ paddingBottom: "2.5rem" }}>

        {/* Buy This Wine — Wine-Searcher market prices */}
        <button
          onClick={() => setShowMarket(true)}
          style={{
            width: "100%", padding: "1rem",
            borderRadius: "14px", cursor: "pointer",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.15rem", fontWeight: 600, letterSpacing: "0.03em",
            background: "linear-gradient(135deg, #7b1c34 0%, #5a1225 100%)",
            color: "#faf7f2",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            border: "none",
            boxShadow: "0 4px 16px rgba(123,28,52,0.3)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          🛒 Buy This Wine
          {!loadingMarket && marketData && marketData.merchants.length > 0 && (
            <span style={{
              fontSize: "0.7rem", fontFamily: "'Inter', sans-serif", fontWeight: 600,
              backgroundColor: "rgba(201,168,76,0.25)", borderRadius: "8px",
              padding: "2px 8px", color: "#c9a84c",
            }}>
              from ${marketData.merchants[0].price.toFixed(2)}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowBuyOnline(true)}
          style={{
            width: "100%", padding: "1rem",
            borderRadius: "14px", cursor: "pointer",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.15rem", fontWeight: 600, letterSpacing: "0.03em",
            backgroundColor: "transparent",
            color: "#c9a84c",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            border: "1.5px solid #c9a84c",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          Search Wine Online
        </button>

        <button
          onClick={() => onSaveToggle(wineAsWine)}
          style={{
            width: "100%", padding: "1rem",
            borderRadius: "14px",
            border: isSaved ? "1px solid rgba(201,168,76,0.4)" : "none",
            cursor: "pointer",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.15rem", fontWeight: 600, letterSpacing: "0.03em",
            backgroundColor: isSaved ? "rgba(201,168,76,0.15)" : "#7b1c34",
            color: isSaved ? "#c9a84c" : "#faf7f2",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "all 0.2s",
            boxShadow: isSaved ? "none" : "0 4px 16px rgba(123,28,52,0.28)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24"
            fill={isSaved ? "currentColor" : "none"} stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {isSaved ? "Saved to Cellar" : "Save to Cellar"}
        </button>

        <button
          onClick={() => setShowTriedModal(true)}
          style={{
            width: "100%", padding: "1rem",
            borderRadius: "14px", cursor: "pointer",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.15rem", fontWeight: 600, letterSpacing: "0.03em",
            backgroundColor: "transparent",
            color: "#7b1c34",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            border: "1.5px solid rgba(123,28,52,0.25)",
          }}
        >
          {triedEntry ? (
            <>
              {"★".repeat(triedEntry.rating)} I've tried this
            </>
          ) : (
            "☆ I've tried this"
          )}
        </button>
      </div>

      {showMarket && (
        <MerchantSheet
          name={wine.name}
          vintage={wine.vintage ?? null}
          loading={loadingMarket}
          data={marketData}
          onClose={() => setShowMarket(false)}
        />
      )}

      {showTriedModal && (
        <TriedModal
          current={triedEntry}
          onSave={handleSaveTried}
          onClose={() => setShowTriedModal(false)}
        />
      )}

      {showBuyOnline && (
        <BuyOnlineDrawer
          name={wine.name}
          vintage={wine.vintage ?? null}
          onClose={() => setShowBuyOnline(false)}
        />
      )}
    </div>
  );
}

// ─── Tried It Modal ───────────────────────────────────────────────────────────

function TriedModal({
  current, onSave, onClose,
}: { current: TriedEntry | null; onSave: (rating: number, notes: string) => void; onClose: () => void }) {
  const [rating, setRating] = useState(current?.rating ?? 0);
  const [notes, setNotes] = useState(current?.notes ?? "");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      backgroundColor: "rgba(60,15,25,0.6)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: "430px",
        backgroundColor: "#faf7f2", borderRadius: "24px 24px 0 0",
        padding: "1.5rem 1.5rem 2.5rem",
        boxShadow: "0 -8px 40px rgba(60,15,25,0.2)",
      }}>
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "rgba(123,28,52,0.2)", margin: "0 auto 1.5rem" }} />

        <h2 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "1.5rem", fontWeight: 600, color: "#7b1c34",
          marginBottom: "1.25rem", textAlign: "center",
        }}>
          Your Rating
        </h2>

        <div className="flex justify-center gap-3 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "2rem", lineHeight: 1,
                color: n <= rating ? "#c9a84c" : "rgba(123,28,52,0.18)",
                transition: "color 0.1s, transform 0.1s",
                transform: n <= rating ? "scale(1.1)" : "scale(1)",
              }}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a personal note... (optional)"
          rows={3}
          style={{
            width: "100%", padding: "0.75rem 1rem",
            borderRadius: "10px", border: "1px solid rgba(123,28,52,0.18)",
            backgroundColor: "#fff", fontFamily: "'Inter', sans-serif",
            fontSize: "0.85rem", color: "#3c0f19",
            resize: "none", outline: "none", boxSizing: "border-box",
            marginBottom: "1rem",
          }}
        />

        <button
          onClick={() => { if (rating > 0) onSave(rating, notes); }}
          disabled={rating === 0}
          style={{
            width: "100%", padding: "1rem", borderRadius: "12px",
            backgroundColor: rating > 0 ? "#7b1c34" : "rgba(123,28,52,0.2)",
            color: "#faf7f2", border: "none", cursor: rating > 0 ? "pointer" : "default",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.15rem", fontWeight: 600, letterSpacing: "0.03em",
            transition: "background-color 0.15s",
          }}
        >
          Save Rating
        </button>
      </div>
    </div>
  );
}

// ─── Merchant Sheet ───────────────────────────────────────────────────────────

function MerchantSheet({
  name, vintage, loading, data, onClose,
}: {
  name: string;
  vintage: number | null;
  loading: boolean;
  data: MarketPriceData | null;
  onClose: () => void;
}) {
  const merchants = data?.merchants ?? [];
  const cheapest = merchants[0];
  const mostExpensive = merchants[merchants.length - 1];
  const savingsVsHighest = cheapest && mostExpensive && mostExpensive.price > 0 && cheapest !== mostExpensive
    ? ((mostExpensive.price - cheapest.price) / mostExpensive.price) > 0.2
      ? (mostExpensive.price - cheapest.price).toFixed(2)
      : null
    : null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        backgroundColor: "rgba(40,8,18,0.65)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: "430px",
        backgroundColor: "#faf7f2", borderRadius: "24px 24px 0 0",
        maxHeight: "88svh", display: "flex", flexDirection: "column",
        boxShadow: "0 -8px 40px rgba(40,8,18,0.25)",
      }}>
        {/* Handle + header */}
        <div style={{ padding: "1.25rem 1.5rem 1rem", flexShrink: 0 }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "rgba(123,28,52,0.2)", margin: "0 auto 1.25rem" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "1.4rem", fontWeight: 600, color: "#7b1c34", margin: 0, lineHeight: 1.2,
              }}>
                🛒 Buy This Wine
              </h2>
              <p style={{
                fontSize: "0.72rem", color: "rgba(123,28,52,0.5)",
                fontFamily: "'Inter', sans-serif", margin: "0.25rem 0 0",
              }}>
                {name}{vintage ? ` ${vintage}` : ""}
              </p>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(123,28,52,0.07)", border: "none", cursor: "pointer",
              borderRadius: "10px", width: "34px", height: "34px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7b1c34" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Summary row */}
          {!loading && merchants.length > 0 && (
            <div style={{
              marginTop: "0.875rem", padding: "0.75rem 1rem",
              backgroundColor: "rgba(123,28,52,0.05)", borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "0.78rem", color: "#7b1c34", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                Found at {merchants.length} {merchants.length === 1 ? "retailer" : "retailers"}
              </span>
              {data?.avgPrice != null && (
                <span style={{ fontSize: "0.72rem", color: "rgba(123,28,52,0.55)", fontFamily: "'Inter', sans-serif" }}>
                  Avg. ${data.avgPrice.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Scrollable merchant list */}
        <div style={{ overflowY: "auto", flex: 1, paddingBottom: "2rem" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem", gap: "1rem" }}>
              <div style={{
                width: "36px", height: "36px", border: "3px solid rgba(123,28,52,0.15)",
                borderTop: "3px solid #7b1c34", borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontSize: "0.8rem", color: "rgba(123,28,52,0.5)", fontFamily: "'Inter', sans-serif", margin: 0 }}>
                Finding the best prices…
              </p>
            </div>
          ) : merchants.length === 0 ? (
            <div style={{ padding: "0.5rem 1.5rem 2rem" }}>
              <p style={{
                fontSize: "0.72rem", color: "rgba(123,28,52,0.45)",
                fontFamily: "'Inter', sans-serif", marginBottom: "1rem",
                textAlign: "center", letterSpacing: "0.03em", textTransform: "uppercase",
                fontWeight: 600,
              }}>
                Search for this wine at
              </p>
              {[
                {
                  name: "Wine-Searcher",
                  description: "Compare prices from hundreds of merchants worldwide",
                  url: `https://www.wine-searcher.com/find/${encodeURIComponent(vintage ? `${name} ${vintage}` : name)}`,
                  badge: "WS", badgeColor: "#c0392b",
                },
                {
                  name: "Vivino",
                  description: "Buy directly with community reviews & ratings",
                  url: `https://www.vivino.com/search/wines?q=${encodeURIComponent(vintage ? `${name} ${vintage}` : name)}`,
                  badge: "V", badgeColor: "#AC1539",
                },
                {
                  name: "Total Wine",
                  description: "In-store pickup or delivery across the US",
                  url: `https://www.totalwine.com/search/all?text=${encodeURIComponent(name)}`,
                  badge: "TW", badgeColor: "#1a4a7a",
                },
                {
                  name: "Wine.com",
                  description: "Fast delivery, large selection, expert picks",
                  url: `https://www.wine.com/search/${encodeURIComponent(name)}/0`,
                  badge: "WC", badgeColor: "#2e6b3e",
                },
              ].map((r, idx, arr) => (
                <a
                  key={r.name}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: "0.875rem",
                    padding: "0.875rem 0",
                    textDecoration: "none",
                    borderBottom: idx < arr.length - 1 ? "1px solid rgba(123,28,52,0.07)" : "none",
                  }}
                >
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "10px",
                    backgroundColor: r.badgeColor, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  }}>
                    <span style={{
                      fontSize: r.badge.length > 1 ? "0.6rem" : "0.85rem",
                      fontWeight: 800, color: "#fff",
                      fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em",
                    }}>
                      {r.badge}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "'Inter', sans-serif", fontSize: "0.88rem",
                      fontWeight: 600, color: "#7b1c34", margin: "0 0 0.15rem",
                    }}>
                      {r.name}
                    </p>
                    <p style={{
                      fontFamily: "'Inter', sans-serif", fontSize: "0.72rem",
                      color: "rgba(123,28,52,0.5)", margin: 0, lineHeight: 1.3,
                    }}>
                      {r.description}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(123,28,52,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </a>
              ))}
            </div>
          ) : (
            <div style={{ padding: "0 1.5rem" }}>
              {merchants.map((m, idx) => (
                <div key={idx}>
                  {idx > 0 && <div style={{ height: "1px", backgroundColor: "rgba(123,28,52,0.06)" }} />}
                  <div style={{ padding: "1rem 0", display: "flex", alignItems: "center", gap: "0.75rem" }}>

                    {/* Price column */}
                    <div style={{ minWidth: "64px", textAlign: "right" }}>
                      <div style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: "1.35rem", fontWeight: 700,
                        color: idx === 0 ? "#1a7a1a" : "#7b1c34", lineHeight: 1,
                      }}>
                        ${m.price.toFixed(2)}
                      </div>
                    </div>

                    {/* Details column */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{
                          fontFamily: "'Inter', sans-serif", fontSize: "0.85rem",
                          fontWeight: 600, color: "#3c0f19",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {m.name}
                        </span>
                        {idx === 0 && (
                          <span style={{
                            fontSize: "0.58rem", fontWeight: 700, color: "#1a7a1a",
                            backgroundColor: "rgba(34,139,34,0.1)", border: "1px solid rgba(34,139,34,0.25)",
                            borderRadius: "6px", padding: "1px 6px",
                            fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em",
                          }}>
                            BEST PRICE
                          </span>
                        )}
                        {idx === 0 && savingsVsHighest != null && (
                          <span style={{
                            fontSize: "0.58rem", fontWeight: 600, color: "#1a7a1a",
                            fontFamily: "'Inter', sans-serif",
                          }}>
                            · Save ${savingsVsHighest} vs highest
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: "0.7rem", color: "rgba(123,28,52,0.45)",
                        fontFamily: "'Inter', sans-serif", margin: "2px 0 0",
                        display: "flex", alignItems: "center", gap: "4px",
                      }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                        {m.location}
                      </p>
                    </div>

                    {/* Visit button */}
                    {m.url ? (
                      <a
                        href={m.url} target="_blank" rel="noopener noreferrer"
                        style={{
                          flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "4px",
                          padding: "7px 12px", borderRadius: "10px",
                          border: "1.5px solid rgba(123,28,52,0.2)",
                          backgroundColor: "rgba(123,28,52,0.04)",
                          textDecoration: "none",
                          fontSize: "0.7rem", fontWeight: 700,
                          color: "#7b1c34", fontFamily: "'Inter', sans-serif",
                          letterSpacing: "0.02em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Visit Store
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M7 1h4v4M11 1L5 7M3 3H1v8h8V9" />
                        </svg>
                      </a>
                    ) : (
                      <a
                        href={`https://www.wine-searcher.com/find/${encodeURIComponent(vintage ? `${name} ${vintage}` : name)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "4px",
                          padding: "7px 12px", borderRadius: "10px",
                          border: "1.5px solid rgba(123,28,52,0.2)",
                          backgroundColor: "rgba(123,28,52,0.04)",
                          textDecoration: "none",
                          fontSize: "0.7rem", fontWeight: 700,
                          color: "#7b1c34", fontFamily: "'Inter', sans-serif",
                          letterSpacing: "0.02em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Search →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RatingCard({
  label, labelColor, loading, score, suffix, subtitle, tooltip, na, estimated,
}: {
  label: string; labelColor: string; loading: boolean;
  score: string | null; suffix: string; subtitle: string;
  tooltip?: string; na: string; estimated?: boolean;
}) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div style={{
      padding: "0.75rem 0.5rem", backgroundColor: "#fff", borderRadius: "12px",
      border: "1px solid rgba(123,28,52,0.09)", boxShadow: "0 2px 8px rgba(123,28,52,0.05)",
      textAlign: "center", position: "relative",
    }}>
      <div style={{
        fontSize: "0.5rem", fontWeight: 700, color: labelColor,
        fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em",
        marginBottom: "0.35rem", lineHeight: 1.2,
        display: "flex", alignItems: "center", justifyContent: "center", gap: "2px",
      }}>
        {label}
        {tooltip && (
          <button
            onClick={() => setShowTip((p) => !p)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 1, marginLeft: "2px" }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={labelColor} strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </button>
        )}
      </div>
      {showTip && tooltip && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          backgroundColor: "#3c0f19", color: "#faf7f2", borderRadius: "8px",
          padding: "6px 10px", fontSize: "0.6rem", fontFamily: "'Inter', sans-serif",
          lineHeight: 1.4, width: "180px", zIndex: 10, textAlign: "left",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        }}>
          {tooltip}
        </div>
      )}
      {loading ? (
        <Shimmer width="60%" height={24} radius={5} />
      ) : score != null ? (
        <>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.6rem", fontWeight: 700, lineHeight: 1,
            color: estimated ? "rgba(123,28,52,0.42)" : "#7b1c34",
            fontStyle: estimated ? "italic" : "normal",
          }}>
            {score}
          </div>
          <div style={{ fontSize: "0.6rem", color: "rgba(123,28,52,0.38)", fontFamily: "'Inter', sans-serif", marginTop: "2px" }}>
            {suffix}
          </div>
          <div style={{ fontSize: "0.55rem", color: "rgba(123,28,52,0.35)", fontFamily: "'Inter', sans-serif", marginTop: "2px", lineHeight: 1.3, fontStyle: estimated ? "italic" : "normal" }}>
            {subtitle}
          </div>
        </>
      ) : (
        <div style={{ fontSize: "0.7rem", color: "rgba(123,28,52,0.32)", fontStyle: "italic", fontFamily: "'Inter', sans-serif" }}>
          {na}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: "0.6rem", fontWeight: 700,
      fontFamily: "'Inter', sans-serif",
      color: "rgba(123,28,52,0.4)", letterSpacing: "0.1em",
      textTransform: "uppercase", marginBottom: "0.75rem",
    }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ height: "1px", backgroundColor: "rgba(123,28,52,0.07)", margin: "0 1.25rem" }} />;
}

function ValueBadge({ label }: { label: "Great Value" | "Fair Price" | "Overpriced" }) {
  const s = {
    "Great Value": { bg: "rgba(34,139,34,0.08)", border: "rgba(34,139,34,0.25)", text: "#1a7a1a", dot: "#228B22" },
    "Fair Price": { bg: "rgba(123,28,52,0.06)", border: "rgba(123,28,52,0.15)", text: "rgba(123,28,52,0.55)", dot: "rgba(123,28,52,0.4)" },
    "Overpriced": { bg: "rgba(185,28,28,0.07)", border: "rgba(185,28,28,0.2)", text: "#b91c1c", dot: "#b91c1c" },
  }[label];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "8px", backgroundColor: s.bg, border: `1px solid ${s.border}` }}>
      <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: s.dot, display: "inline-block" }} />
      <span style={{ fontSize: "0.72rem", fontWeight: 600, color: s.text, fontFamily: "'Inter', sans-serif" }}>{label}</span>
    </div>
  );
}

function Shimmer({ width, height, delay = "0s", radius = 4 }: { width: number | string; height: number; delay?: string; radius?: number }) {
  return (
    <>
      <div style={{
        width, height, borderRadius: radius,
        background: "linear-gradient(90deg, rgba(123,28,52,0.08) 25%, rgba(201,168,76,0.12) 50%, rgba(123,28,52,0.08) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite", animationDelay: delay,
        margin: "4px auto 0",
      }} />
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </>
  );
}
