import { useEffect, useRef, useState } from "react";
import { Home } from "lucide-react";
import type { Wine, SavedWine } from "./home";
import { apiUrl } from "../lib/api";
import BuyOnlineDrawer from "../components/BuyOnlineDrawer";
import { Share } from "@capacitor/share";

type VivinoRating = {
  rating: number | null;
  ratingsCount: number | null;
  wineId: number | null;
  isEstimated?: boolean;
};

type AIAnalysis = {
  consensusScore: number | null;
  tastingNotes: string | null;
  valueLabel: "Great Value" | "Fair Price" | "Overpriced" | null;
};

type RetailPrice = {
  avgRetailPrice: number | null;
  priceRange: string | null;
};

type CriticScore = { criticScore: number | null };
type CellarScore = { communityScore: number | null; reviewCount: number | null };
type FetchStatus = "loading" | "done";
type FilterType = "all" | "90plus" | "best-value" | "top-picks";

type Props = {
  wines: Wine[];
  savedWines: SavedWine[];
  onSaveToggle: (wine: Wine) => void;
  onHome: () => void;
  onWineSelect: (wine: Wine) => void;
};

export default function ResultsScreen({ wines, savedWines, onSaveToggle, onHome, onWineSelect }: Props) {
  const [vivinoRatings, setVivinoRatings] = useState<Record<number, VivinoRating>>({});
  const [vivinoStatus, setVivinoStatus] = useState<Record<number, FetchStatus>>({});
  const [aiAnalyses, setAiAnalyses] = useState<Record<number, AIAnalysis>>({});
  const [aiStatus, setAiStatus] = useState<Record<number, FetchStatus>>({});
  const [retailPrices, setRetailPrices] = useState<Record<number, RetailPrice>>({});
  const [retailStatus, setRetailStatus] = useState<Record<number, FetchStatus>>({});
  const [criticScores, setCriticScores] = useState<Record<number, CriticScore>>({});
  const [criticStatus, setCriticStatus] = useState<Record<number, FetchStatus>>({});
  const [cellarScores, setCellarScores] = useState<Record<number, CellarScore>>({});
  const [cellarStatus, setCellarStatus] = useState<Record<number, FetchStatus>>({});
  const [listInsight, setListInsight] = useState<string | null>(null);
  const [insightStatus, setInsightStatus] = useState<"idle" | "loading" | "done">("idle");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const insightFired = useRef(false);

  useEffect(() => {
    if (wines.length === 0) return;
    const initStatus: Record<number, FetchStatus> = {};
    wines.forEach((_, i) => { initStatus[i] = "loading"; });
    setVivinoStatus(initStatus);
    setAiStatus(initStatus);
    setVivinoRatings({});
    setAiAnalyses({});
    setRetailPrices({});
    setRetailStatus(initStatus);
    setCriticScores({});
    setCriticStatus(initStatus);
    setCellarScores({});
    setCellarStatus(initStatus);
    setListInsight(null);
    setInsightStatus("idle");
    insightFired.current = false;
    setActiveFilter("all");

    wines.forEach((wine, i) => {
      fetch(apiUrl("api/ratings/vivino"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wine.name, vintage: wine.vintage, region: wine.region, grape: wine.grape, menuPrice: wine.menuPrice }),
      })
        .then((r) => r.json())
        .then((data: VivinoRating) => {
          setVivinoRatings((prev) => ({ ...prev, [i]: data }));
          setVivinoStatus((prev) => ({ ...prev, [i]: "done" }));
        })
        .catch(() => {
          setVivinoRatings((prev) => ({ ...prev, [i]: { rating: null, ratingsCount: null, wineId: null } }));
          setVivinoStatus((prev) => ({ ...prev, [i]: "done" }));
        });

      fetch(apiUrl("api/ai/analyze-wine"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wine.name, vintage: wine.vintage, region: wine.region, grape: wine.grape, menuPrice: wine.menuPrice }),
      })
        .then((r) => r.json())
        .then((data: AIAnalysis) => {
          setAiAnalyses((prev) => ({ ...prev, [i]: data }));
          setAiStatus((prev) => ({ ...prev, [i]: "done" }));
        })
        .catch(() => {
          setAiAnalyses((prev) => ({ ...prev, [i]: { consensusScore: null, tastingNotes: null, valueLabel: null } }));
          setAiStatus((prev) => ({ ...prev, [i]: "done" }));
        });

      fetch(apiUrl("api/ai/retail-price"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wine.name, vintage: wine.vintage }),
      })
        .then((r) => r.json())
        .then((data: RetailPrice) => {
          setRetailPrices((prev) => ({ ...prev, [i]: data }));
          setRetailStatus((prev) => ({ ...prev, [i]: "done" }));
        })
        .catch(() => {
          setRetailPrices((prev) => ({ ...prev, [i]: { avgRetailPrice: null, priceRange: null } }));
          setRetailStatus((prev) => ({ ...prev, [i]: "done" }));
        });

      fetch(apiUrl("api/ratings/critic"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wine.name, vintage: wine.vintage }),
      })
        .then((r) => r.json())
        .then((data: CriticScore) => {
          setCriticScores((prev) => ({ ...prev, [i]: data }));
          setCriticStatus((prev) => ({ ...prev, [i]: "done" }));
        })
        .catch(() => {
          setCriticScores((prev) => ({ ...prev, [i]: { criticScore: null } }));
          setCriticStatus((prev) => ({ ...prev, [i]: "done" }));
        });

      fetch(apiUrl("api/ratings/cellartracker"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wine.name, vintage: wine.vintage }),
      })
        .then((r) => r.json())
        .then((data: CellarScore) => {
          setCellarScores((prev) => ({ ...prev, [i]: data }));
          setCellarStatus((prev) => ({ ...prev, [i]: "done" }));
        })
        .catch(() => {
          setCellarScores((prev) => ({ ...prev, [i]: { communityScore: null, reviewCount: null } }));
          setCellarStatus((prev) => ({ ...prev, [i]: "done" }));
        });
    });
  }, [wines]);

  useEffect(() => {
    if (wines.length === 0 || insightFired.current) return;
    const allDone =
      wines.every((_, i) => aiStatus[i] === "done") &&
      wines.every((_, i) => vivinoStatus[i] === "done");
    if (!allDone) return;
    insightFired.current = true;
    setInsightStatus("loading");

    const payload = wines.map((wine, i) => ({
      name: wine.name, vintage: wine.vintage,
      consensusScore: aiAnalyses[i]?.consensusScore ?? null,
      vivinoRating: vivinoRatings[i]?.rating ?? null,
      valueLabel: aiAnalyses[i]?.valueLabel ?? null,
      menuPrice: wine.menuPrice,
    }));

    fetch(apiUrl("api/ai/list-insight"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wines: payload }),
    })
      .then((r) => r.json())
      .then((data: { insight: string | null }) => { setListInsight(data.insight); setInsightStatus("done"); })
      .catch(() => setInsightStatus("done"));
  }, [aiStatus, vivinoStatus]);

  // Filter logic — wines still loading are included in score-based filters
  const topScoreIndex = wines.reduce<number>((best, _, i) => {
    const score = aiAnalyses[i]?.consensusScore ?? 0;
    const bestScore = aiAnalyses[best]?.consensusScore ?? 0;
    return score > bestScore ? i : best;
  }, 0);

  const filteredIndices = wines.reduce<number[]>((acc, _, i) => {
    if (activeFilter === "all") { acc.push(i); return acc; }
    if (activeFilter === "90plus") {
      if (aiStatus[i] === "loading" || (aiAnalyses[i]?.consensusScore ?? 0) >= 90) acc.push(i);
      return acc;
    }
    if (activeFilter === "best-value") {
      if (aiStatus[i] === "loading" || aiAnalyses[i]?.valueLabel === "Great Value") acc.push(i);
      return acc;
    }
    if (activeFilter === "top-picks") {
      if (i === topScoreIndex || (aiAnalyses[i]?.consensusScore ?? 0) >= 93 || (vivinoRatings[i]?.rating ?? 0) >= 4.4) acc.push(i);
      return acc;
    }
    return acc;
  }, []);

  const handleShare = async () => {
    const topIdx = Object.entries(aiAnalyses).reduce<number>((best, [idxStr, a]) => {
      const score = a.consensusScore ?? 0;
      const bestScore = aiAnalyses[parseInt(best.toString())]?.consensusScore ?? 0;
      return score > bestScore ? parseInt(idxStr) : best;
    }, 0);
    const top = wines[topIdx];
    const wineName = top?.name ?? "Pocket Somm";
    try {
      await Share.share({
        title: wineName,
        text: top
          ? `Check out ${wineName} on Pocket Somm.`
          : "Scan any wine list instantly with Pocket Somm.",
        url: "https://getpocketsomm.com",
        dialogTitle: "Share this wine",
      });
    } catch { /* user cancelled or unavailable */ }
  };

  const isSaved = (wine: Wine) =>
    savedWines.some((w) => w.name === wine.name && w.vintage === wine.vintage);

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#faf7f2" }}>

      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-6 pb-3"
        style={{ backgroundColor: "#faf7f2", borderBottom: "1px solid rgba(123,28,52,0.08)", paddingTop: "env(safe-area-inset-top, 40px)" }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "2rem", fontWeight: 600, color: "#7b1c34",
              letterSpacing: "0.02em", lineHeight: 1,
            }}>
              Wine List
            </h1>
            <p style={{
              fontSize: "0.75rem", color: "rgba(123,28,52,0.5)",
              fontFamily: "'Inter', sans-serif", marginTop: "0.25rem",
            }}>
              {wines.length} {wines.length === 1 ? "wine" : "wines"} found
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onHome}
              title="Home"
              style={{
                background: "rgba(123,28,52,0.07)", border: "1px solid rgba(123,28,52,0.12)",
                borderRadius: "10px", padding: "7px", cursor: "pointer",
                display: "flex", alignItems: "center", color: "#7b1c34",
              }}
            >
              <Home size={18} />
            </button>
            <button
              onClick={handleShare}
              title="Share top wine"
              style={{
                background: "rgba(123,28,52,0.07)", border: "1px solid rgba(123,28,52,0.12)",
                borderRadius: "10px", padding: "7px 10px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "5px",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7b1c34" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#7b1c34", fontFamily: "'Inter', sans-serif", letterSpacing: "0.03em" }}>
                Share
              </span>
            </button>
            <svg width="24" height="33" viewBox="0 0 52 72" fill="none">
              <path d="M8 4 C8 4 4 18 4 26 C4 39 14 48 26 48 C38 48 48 39 48 26 C48 18 44 4 44 4 Z"
                stroke="#7b1c34" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M10 30 C10 30 8 28 8 26 C8 24 9 22 9 22 C14 22 38 22 43 22 C43 22 44 24 44 26 C44 28 42 30 42 30 C38 40 14 40 10 30 Z"
                fill="#7b1c34" opacity="0.18" />
              <line x1="26" y1="48" x2="26" y2="64" stroke="#7b1c34" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="14" y1="64" x2="38" y2="64" stroke="#7b1c34" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div style={{ width: "40px", height: "1px", backgroundColor: "#c9a84c", marginTop: "0.5rem" }} />

        {/* Filter pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {([
            { id: "all", label: "All" },
            { id: "90plus", label: "90+ Points" },
            { id: "best-value", label: "Best Value" },
            { id: "top-picks", label: "Top Picks" },
          ] as { id: FilterType; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveFilter(id)}
              style={{
                flexShrink: 0, padding: "5px 14px", borderRadius: "20px",
                fontSize: "0.72rem", fontWeight: 600,
                fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em",
                border: activeFilter === id ? "1px solid #7b1c34" : "1px solid rgba(123,28,52,0.18)",
                backgroundColor: activeFilter === id ? "#7b1c34" : "transparent",
                color: activeFilter === id ? "#faf7f2" : "rgba(123,28,52,0.55)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="px-6 py-4" style={{ paddingBottom: "90px" }}>
        {wines.length > 0 && insightStatus !== "idle" && (
          <InsightBanner insight={listInsight} status={insightStatus} />
        )}

        {wines.length === 0 ? (
          <EmptyState />
        ) : filteredIndices.length === 0 ? (
          <FilterEmptyState filter={activeFilter} onClear={() => setActiveFilter("all")} />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredIndices.map((i, displayIdx) => (
              <WineCard
                key={i}
                wine={wines[i]}
                index={displayIdx}
                vivinoRating={vivinoRatings[i] ?? null}
                vivinoStatus={vivinoStatus[i] ?? "loading"}
                aiAnalysis={aiAnalyses[i] ?? null}
                aiStatus={aiStatus[i] ?? "loading"}
                retailPrice={retailPrices[i] ?? null}
                retailStatus={retailStatus[i] ?? "loading"}
                criticScore={criticScores[i] ?? null}
                criticStatus={criticStatus[i] ?? "loading"}
                cellarScore={cellarScores[i] ?? null}
                cellarStatus={cellarStatus[i] ?? "loading"}
                isSaved={isSaved(wines[i])}
                onSaveToggle={() => onSaveToggle(wines[i])}
                onSelect={() => onWineSelect(wines[i])}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Smart Insight Banner ─────────────────────────────────────────────────────

function InsightBanner({ insight, status }: { insight: string | null; status: "loading" | "done" }) {
  return (
    <div className="w-full rounded-2xl mb-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #7b1c34 0%, #5a1225 100%)",
        boxShadow: "0 4px 20px rgba(123,28,52,0.25)",
        animation: "fadeInUp 0.4s ease both",
      }}
    >
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#c9a84c">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
          <span style={{
            fontSize: "0.6rem", fontWeight: 700, color: "#c9a84c",
            fontFamily: "'Inter', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            Sommelier Insight
          </span>
        </div>
        {status === "loading" || !insight ? (
          <div className="flex flex-col gap-2">
            <Shimmer width="100%" height={14} />
            <Shimmer width="80%" height={14} delay="0.2s" />
          </div>
        ) : (
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.05rem", fontStyle: "italic",
            color: "rgba(250,247,242,0.92)", lineHeight: 1.55, margin: 0,
          }}>
            {insight}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Wine Card ────────────────────────────────────────────────────────────────

function WineCard({
  wine, index, vivinoRating, vivinoStatus, aiAnalysis, aiStatus, retailPrice, retailStatus,
  criticScore, criticStatus, cellarScore, cellarStatus, isSaved, onSaveToggle, onSelect,
}: {
  wine: Wine;
  index: number;
  vivinoRating: VivinoRating | null;
  vivinoStatus: FetchStatus;
  aiAnalysis: AIAnalysis | null;
  aiStatus: FetchStatus;
  retailPrice: RetailPrice | null;
  retailStatus: FetchStatus;
  criticScore: CriticScore | null;
  criticStatus: FetchStatus;
  cellarScore: CellarScore | null;
  cellarStatus: FetchStatus;
  isSaved: boolean;
  onSaveToggle: () => void;
  onSelect: () => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [showBuyOnline, setShowBuyOnline] = useState(false);
  const isEven = index % 2 === 0;

  const avgRetail = retailPrice?.avgRetailPrice ?? null;
  const menuPrice = wine.menuPrice;
  const markupBadge: "high" | "deal" | null =
    avgRetail != null && menuPrice != null
      ? menuPrice > avgRetail * 2 ? "high"
        : menuPrice < avgRetail * 1.5 ? "deal"
        : null
      : null;
  const displayedNotes = aiAnalysis?.tastingNotes ?? wine.tastingNotes;
  const hasNotes = !!displayedNotes;

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      onClick={onSelect}
      style={{
        backgroundColor: "#fff",
        border: "1px solid rgba(123,28,52,0.08)",
        boxShadow: "0 2px 12px rgba(123,28,52,0.06)",
        animation: "fadeInUp 0.4s ease both",
        animationDelay: `${index * 70}ms`,
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(123,28,52,0.13)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(123,28,52,0.06)";
      }}
    >
      <div style={{
        height: "3px",
        background: isEven ? "linear-gradient(to right, #7b1c34, #c9a84c)" : "linear-gradient(to right, #c9a84c, #7b1c34)",
      }} />

      <div className="px-5 py-4">

        {/* Name row + price + bookmark */}
        <div className="flex items-start gap-2 mb-2">
          <h3 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.15rem", fontWeight: 600, color: "#7b1c34",
            letterSpacing: "0.01em", lineHeight: 1.25, flex: 1,
          }}>
            {wine.name}
            {wine.vintage && (
              <span style={{ fontWeight: 400, color: "rgba(123,28,52,0.5)", fontSize: "1rem", marginLeft: "0.4em" }}>
                {wine.vintage}
              </span>
            )}
          </h3>

          <div className="flex items-center gap-2 shrink-0">
            {wine.menuPrice != null && (
              <div style={{ textAlign: "right" }}>
                <div className="px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)" }}>
                  <span style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "1rem", fontWeight: 600, color: "#7b1c34",
                  }}>
                    ${wine.menuPrice}
                  </span>
                </div>
                {retailStatus === "loading" ? (
                  <div style={{ marginTop: "3px" }}><Shimmer width={64} height={10} radius={4} /></div>
                ) : avgRetail != null ? (
                  <p style={{
                    fontSize: "0.62rem", color: "rgba(123,28,52,0.42)",
                    fontFamily: "'Inter', sans-serif", margin: "3px 0 0",
                    textAlign: "right",
                  }}>
                    Retail: ${avgRetail}
                  </p>
                ) : null}
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onSaveToggle(); }}
              title={isSaved ? "Remove bookmark" : "Save wine"}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "2px",
                color: isSaved ? "#c9a84c" : "rgba(123,28,52,0.22)",
                transition: "color 0.15s, transform 0.15s",
                transform: "scale(1)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.15)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tags */}
        {(wine.region || wine.grape) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {wine.region && <Tag icon={<GlobeIcon />} label={wine.region} />}
            {wine.grape && <Tag icon={<GrapeIcon />} label={wine.grape} />}
          </div>
        )}

        <div style={{ height: "1px", backgroundColor: "rgba(123,28,52,0.07)", margin: "0.5rem 0" }} />

        {/* Scores row */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="flex items-center gap-2">
            <VivinoLogo />
            {vivinoStatus === "loading" ? <VivinoSkeleton /> :
              vivinoRating?.rating != null ? (
                <VivinoRatingBadge rating={vivinoRating.rating} ratingsCount={vivinoRating.ratingsCount} isEstimated={vivinoRating.isEstimated} />
              ) : <NotRated />}
          </div>
          <div style={{ width: "1px", height: "20px", backgroundColor: "rgba(123,28,52,0.1)" }} />
          {aiStatus === "loading" ? <AIScoreSkeleton /> :
            aiAnalysis?.consensusScore != null ? <AIScoreBadge score={aiAnalysis.consensusScore} /> : null}
        </div>

        {/* Critic + Community scores row */}
        {(criticStatus === "loading" || criticScore?.criticScore != null || cellarStatus === "loading" || cellarScore?.communityScore != null) && (
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {criticStatus === "loading" ? (
              <Shimmer width={88} height={13} radius={4} delay="0.1s" />
            ) : criticScore?.criticScore != null ? (
              <div className="flex items-center gap-1">
                <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "#c9a84c", fontFamily: "'Inter', sans-serif", letterSpacing: "0.05em" }}>
                  🏆 CRITIC
                </span>
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.05rem", fontWeight: 700, color: "#7b1c34", lineHeight: 1 }}>
                  {criticScore.criticScore}
                </span>
                <span style={{ fontSize: "0.58rem", color: "rgba(123,28,52,0.4)", fontFamily: "'Inter', sans-serif" }}>/100</span>
              </div>
            ) : null}
            {cellarStatus === "loading" ? (
              <Shimmer width={100} height={13} radius={4} delay="0.2s" />
            ) : cellarScore?.communityScore != null ? (
              <div className="flex items-center gap-1">
                <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "#5a7a5a", fontFamily: "'Inter', sans-serif", letterSpacing: "0.05em" }}>
                  👥 COMMUNITY
                </span>
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.05rem", fontWeight: 700, color: "#7b1c34", lineHeight: 1 }}>
                  {cellarScore.communityScore}
                </span>
                <span style={{ fontSize: "0.58rem", color: "rgba(123,28,52,0.4)", fontFamily: "'Inter', sans-serif" }}>/100</span>
                {cellarScore.reviewCount != null && (
                  <span style={{ fontSize: "0.58rem", color: "rgba(123,28,52,0.35)", fontFamily: "'Inter', sans-serif" }}>
                    ({cellarScore.reviewCount.toLocaleString()} reviews)
                  </span>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Value badge + markup badge + notes toggle */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 flex-wrap">
            {aiStatus === "loading" ? (
              <Shimmer width={80} height={22} radius={6} delay="0.1s" />
            ) : aiAnalysis?.valueLabel ? (
              <ValueBadge label={aiAnalysis.valueLabel} />
            ) : null}
            {retailStatus === "done" && markupBadge === "high" && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md"
                style={{ backgroundColor: "rgba(185,28,28,0.08)", border: "1px solid rgba(185,28,28,0.22)" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#b91c1c", fontFamily: "'Inter', sans-serif" }}>⬆ High Markup</span>
              </div>
            )}
            {retailStatus === "done" && markupBadge === "deal" && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md"
                style={{ backgroundColor: "rgba(34,139,34,0.08)", border: "1px solid rgba(34,139,34,0.22)" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#1a7a1a", fontFamily: "'Inter', sans-serif" }}>✓ Great Deal</span>
              </div>
            )}
          </div>
          {hasNotes && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowNotes((p) => !p); }}
              style={{
                fontSize: "0.68rem", fontFamily: "'Inter', sans-serif",
                color: showNotes ? "#7b1c34" : "#c9a84c",
                background: "none", border: "none", cursor: "pointer",
                padding: "2px 0", letterSpacing: "0.02em", fontWeight: 500,
                display: "flex", alignItems: "center", gap: "3px",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 4h16v2H2zm0 5h12v2H2zm0 5h9v2H2z" />
              </svg>
              {showNotes ? "Hide notes" : "Tasting notes"}
            </button>
          )}
        </div>

        {/* Retail price (no menu price scenario) + Buy Online row */}
        <div className="flex items-center justify-between mt-2">
          <div>
            {wine.menuPrice == null && retailStatus === "loading" && (
              <Shimmer width={100} height={14} radius={4} />
            )}
            {wine.menuPrice == null && retailStatus === "done" && avgRetail != null && (
              <span style={{ fontSize: "0.78rem", color: "rgba(123,28,52,0.55)", fontFamily: "'Inter', sans-serif" }}>
                Avg. Price: <strong style={{ color: "#7b1c34" }}>${avgRetail}</strong>
              </span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowBuyOnline(true); }}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "5px 10px", borderRadius: "8px",
              border: "1.5px solid #c9a84c", background: "transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(201,168,76,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#c9a84c", fontFamily: "'Inter', sans-serif", letterSpacing: "0.03em" }}>
              Buy Online
            </span>
          </button>
        </div>

        {/* Tasting notes */}
        {showNotes && hasNotes && (
          <div style={{
            marginTop: "0.75rem", padding: "0.75rem 1rem", borderRadius: "10px",
            backgroundColor: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)",
          }}>
            <p style={{
              color: "rgba(60,15,25,0.75)",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "1rem", lineHeight: 1.6, fontStyle: "italic", margin: 0,
            }}>
              {displayedNotes}
            </p>
          </div>
        )}

        {/* Critic deep links */}
        <CriticLinks name={wine.name} vintage={wine.vintage} />
      </div>

      {showBuyOnline && (
        <BuyOnlineDrawer
          name={wine.name}
          vintage={wine.vintage}
          onClose={() => setShowBuyOnline(false)}
        />
      )}
    </div>
  );
}

// ─── Score badges ─────────────────────────────────────────────────────────────

function AIScoreBadge({ score }: { score: number }) {
  const color = score >= 95 ? "#b8860b" : score >= 90 ? "#c9a84c" : score >= 85 ? "#a08030" : "rgba(123,28,52,0.45)";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md"
        style={{ backgroundColor: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.35)" }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="#c9a84c">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
        </svg>
        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#c9a84c", fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em" }}>
          AI EST.
        </span>
      </div>
      <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.25rem", fontWeight: 700, color, lineHeight: 1 }}>
        {score}
      </span>
      <span style={{ fontSize: "0.65rem", color: "rgba(123,28,52,0.4)", fontFamily: "'Inter', sans-serif" }}>/100</span>
    </div>
  );
}

function AIScoreSkeleton() {
  return (
    <div className="flex items-center gap-1.5">
      <Shimmer width={52} height={20} radius={6} />
      <Shimmer width={28} height={18} delay="0.15s" />
    </div>
  );
}

function ValueBadge({ label }: { label: "Great Value" | "Fair Price" | "Overpriced" }) {
  const styles = {
    "Great Value": { bg: "rgba(34,139,34,0.08)", border: "rgba(34,139,34,0.25)", text: "#1a7a1a", dot: "#228B22" },
    "Fair Price": { bg: "rgba(123,28,52,0.06)", border: "rgba(123,28,52,0.15)", text: "rgba(123,28,52,0.55)", dot: "rgba(123,28,52,0.4)" },
    "Overpriced": { bg: "rgba(185,28,28,0.07)", border: "rgba(185,28,28,0.2)", text: "#b91c1c", dot: "#b91c1c" },
  };
  const s = styles[label];
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: s.dot, display: "inline-block" }} />
      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: s.text, fontFamily: "'Inter', sans-serif" }}>{label}</span>
    </div>
  );
}

// ─── Vivino ───────────────────────────────────────────────────────────────────

function VivinoLogo() {
  return (
    <div className="flex items-center gap-1 shrink-0"
      style={{ backgroundColor: "#AC1539", borderRadius: "4px", padding: "2px 6px" }}>
      <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="4" r="3.5" fill="white" opacity="0.9" />
        <circle cx="4.5" cy="10" r="3.5" fill="white" opacity="0.9" />
        <circle cx="15.5" cy="10" r="3.5" fill="white" opacity="0.9" />
        <circle cx="10" cy="16" r="3.5" fill="white" opacity="0.9" />
      </svg>
      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em", lineHeight: 1 }}>
        VIVINO
      </span>
    </div>
  );
}

function VivinoRatingBadge({ rating, ratingsCount, isEstimated }: { rating: number; ratingsCount: number | null; isEstimated?: boolean }) {
  const stars = Math.round(rating * 2) / 2;
  const fullStars = Math.floor(stars);
  const hasHalf = stars - fullStars >= 0.5;
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.25rem", fontWeight: 700, color: "#7b1c34", lineHeight: 1 }}>
        {rating.toFixed(1)}
      </span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= fullStars;
          const half = !filled && n === fullStars + 1 && hasHalf;
          return (
            <svg key={n} width="11" height="11" viewBox="0 0 24 24">
              {half ? (
                <>
                  <defs>
                    <linearGradient id={`h${n}`} x1="0" x2="1" y1="0" y2="0">
                      <stop offset="50%" stopColor="#c9a84c" /><stop offset="50%" stopColor="#e5d8b8" />
                    </linearGradient>
                  </defs>
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                    fill={`url(#h${n})`} stroke="#c9a84c" strokeWidth="1" strokeLinejoin="round" />
                </>
              ) : (
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                  fill={filled ? "#c9a84c" : "#e5d8b8"} stroke="#c9a84c" strokeWidth="1" strokeLinejoin="round" />
              )}
            </svg>
          );
        })}
      </div>
      {isEstimated && (
        <span style={{ fontSize: "0.62rem", color: "rgba(123,28,52,0.45)", fontFamily: "'Inter', sans-serif", fontStyle: "italic", letterSpacing: "0.03em" }}>
          EST.
        </span>
      )}
      {!isEstimated && ratingsCount != null && (
        <span style={{ fontSize: "0.7rem", color: "rgba(123,28,52,0.45)", fontFamily: "'Inter', sans-serif" }}>
          {ratingsCount >= 1000 ? `${(ratingsCount / 1000).toFixed(1)}k` : ratingsCount} ratings
        </span>
      )}
    </div>
  );
}

function VivinoSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Shimmer width={32} height={18} />
      <Shimmer width={72} height={10} delay="0.2s" />
    </div>
  );
}

function NotRated() {
  return <span style={{ fontSize: "0.85rem", color: "rgba(123,28,52,0.3)", fontFamily: "'Inter', sans-serif" }}>—</span>;
}

// ─── Shimmer ──────────────────────────────────────────────────────────────────

function Shimmer({ width, height, delay = "0s", radius = 4 }: { width: number | string; height: number; delay?: string; radius?: number }) {
  return (
    <>
      <div style={{
        width, height, borderRadius: radius, flexShrink: 0,
        background: "linear-gradient(90deg, rgba(123,28,52,0.08) 25%, rgba(201,168,76,0.12) 50%, rgba(123,28,52,0.08) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
        animationDelay: delay,
      }} />
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </>
  );
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

function Tag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
      style={{ backgroundColor: "rgba(123,28,52,0.06)", border: "1px solid rgba(123,28,52,0.08)" }}>
      <span style={{ color: "#c9a84c", display: "flex", alignItems: "center" }}>{icon}</span>
      <span style={{ fontSize: "0.75rem", color: "rgba(123,28,52,0.7)", fontFamily: "'Inter', sans-serif" }}>{label}</span>
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function GrapeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 5V2l-5.89 5.89" />
      <circle cx="16.6" cy="15.89" r="3" /><circle cx="8.11" cy="7.4" r="3" />
      <circle cx="12.35" cy="11.65" r="3" /><circle cx="13.91" cy="5.85" r="3" />
      <circle cx="18.15" cy="10.09" r="3" /><circle cx="6.56" cy="13.2" r="3" />
      <circle cx="10.8" cy="17.44" r="3" /><circle cx="5" cy="19" r="3" />
    </svg>
  );
}

// ─── Critic deep links ────────────────────────────────────────────────────────

function CriticLinks({ name, vintage }: { name: string; vintage: number | null }) {
  const query = encodeURIComponent(vintage ? `${name} ${vintage}` : name);
  const critics = [
    { label: "Google", url: `https://www.google.com/search?q=${query}+wine+rating`, abbr: "G" },
    { label: "Wine Spectator", url: `https://www.winespectator.com/search?t=${query}`, abbr: "WS" },
    { label: "Wine Enthusiast", url: `https://www.winemag.com/?s=${query}`, abbr: "WE" },
    { label: "Robert Parker", url: `https://www.robertparker.com/search?query=${query}`, abbr: "RP" },
  ];
  return (
    <div style={{ marginTop: "0.875rem" }}>
      <p style={{
        fontSize: "0.63rem", fontFamily: "'Inter', sans-serif",
        color: "rgba(123,28,52,0.38)", letterSpacing: "0.07em",
        textTransform: "uppercase", marginBottom: "0.5rem", fontWeight: 600,
      }}>
        View Critic Ratings
      </p>
      <div className="flex gap-2 flex-wrap">
        {critics.map(({ label, url, abbr }) => (
          <a key={abbr} href={url} target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "5px 10px", borderRadius: "8px",
              border: "1px solid rgba(123,28,52,0.18)",
              backgroundColor: "rgba(123,28,52,0.04)",
              textDecoration: "none", transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(123,28,52,0.1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(123,28,52,0.04)"; }}
          >
            <span style={{
              width: "18px", height: "18px", borderRadius: "4px",
              backgroundColor: "#7b1c34", color: "#faf7f2",
              fontSize: "0.55rem", fontWeight: 700, fontFamily: "'Inter', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {abbr}
            </span>
            <span style={{ fontSize: "0.72rem", fontFamily: "'Inter', sans-serif", color: "#7b1c34", fontWeight: 500, whiteSpace: "nowrap" }}>
              {label}
            </span>
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#7b1c34" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <path d="M7 1h4v4M11 1L5 7M3 3H1v8h8V9" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Empty / Filter states ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 opacity-30">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7b1c34" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.25rem", fontWeight: 500, color: "#7b1c34", opacity: 0.6 }}>
        No wines detected
      </p>
      <p style={{ fontSize: "0.8rem", color: "rgba(123,28,52,0.4)", fontFamily: "'Inter', sans-serif", marginTop: "0.5rem" }}>
        Try a clearer photo of the wine list
      </p>
    </div>
  );
}

function FilterEmptyState({ filter, onClear }: { filter: FilterType; onClear: () => void }) {
  const labels: Record<FilterType, string> = {
    "all": "All", "90plus": "90+ Points", "best-value": "Best Value", "top-picks": "Top Picks",
  };
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.15rem", color: "#7b1c34", opacity: 0.55, marginBottom: "0.75rem" }}>
        No wines match "{labels[filter]}"
      </p>
      <button onClick={onClear} style={{
        padding: "6px 16px", borderRadius: "20px",
        backgroundColor: "#7b1c34", color: "#faf7f2",
        fontSize: "0.75rem", fontFamily: "'Inter', sans-serif",
        border: "none", cursor: "pointer", fontWeight: 600,
      }}>
        Show all wines
      </button>
    </div>
  );
}
