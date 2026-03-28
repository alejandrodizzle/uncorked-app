import { useEffect, useRef, useState } from "react";
import LoadingScreen from "./loading";
import ResultsScreen from "./results";
import SavedScreen from "./saved-screen";
import HistoryScreen from "./history-screen";
import SplashScreen from "./splash";
import WineDetailScreen from "./wine-detail";
import PaywallScreen from "./paywall";
import type { SearchResult } from "../types/search";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { App } from "@capacitor/app";
import { StatusBar } from "@capacitor/status-bar";

// Absolute API URL — works in web, iOS, and Android native builds.
// VITE_API_URL is baked in at build time; falls back to the production host
// so relative-URL failures (HTML-instead-of-JSON) cannot occur on native builds.
const apiUrl = (path: string) =>
  `${import.meta.env.VITE_API_URL || "https://wine-scan-ai.replit.app"}/${path}`;

function getOrCreateUserId(): string {
  let id = localStorage.getItem("uncorked_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("uncorked_user_id", id);
  }
  return id;
}

// ── Platform detection ─────────────────────────────────────────────────────────
// isNativeIOSBuild — true ONLY on native iOS.
//   Used for Apple IAP compliance: Stripe is disabled on iOS, all purchases go
//   through StoreKit / RevenueCat. Returns false on Android and web.
const isNativeIOSBuild = () => {
  try {
    return (window as any).Capacitor?.getPlatform?.() === "ios";
  } catch {
    return false;
  }
};

// isNativeApp — true on any Capacitor native build (iOS or Android).
//   Used for native camera routing (both platforms use @capacitor/camera).
const isNativeApp = () => {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
};
// ──────────────────────────────────────────────────────────────────────────────

export type Wine = {
  name: string;
  vintage: number | null;
  region: string | null;
  grape: string | null;
  menuPrice: number | null;
  tastingNotes: string | null;
};

export type SavedWine = Wine & { savedAt: number };
export type ScanHistory = { id: string; scannedAt: number; wines: Wine[] };

type Tab = "home" | "results" | "saved" | "history";

function loadFromStorage<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [scanning, setScanning] = useState(false);
  const [wines, setWines] = useState<Wine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedWines, setSavedWines] = useState<SavedWine[]>(() =>
    loadFromStorage<SavedWine[]>("uncorked_saved", [])
  );
  const [history, setHistory] = useState<ScanHistory[]>(() =>
    loadFromStorage<ScanHistory[]>("uncorked_history", [])
  );
  const [detailWine, setDetailWine] = useState<SearchResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId] = useState<string>(getOrCreateUserId);
  const [subStatus, setSubStatus] = useState<"loading" | "trial" | "active" | "expired">("loading");
  const [trialDaysLeft, setTrialDaysLeft] = useState(7);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showPaywallWithPromo, setShowPaywallWithPromo] = useState(false);
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  useEffect(() => {
    if (isNativeApp() && !isNativeIOSBuild()) {
      setStatusBarHeight(28);
    }
  }, []);

  useEffect(() => {
    // Handle return from Stripe checkout (?payment=success or ?subscribed=true)
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success" || params.get("subscribed") === "true") {
      setPaymentSuccess(true);
      setSubStatus("active");
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("payment") === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
    }

    async function initUser() {
      // ── iOS App Store: all features free, no paywall ────────────────────────
      // Stripe is disabled for native iOS builds per Apple guidelines.
      // Remove this block to re-enable Stripe on iOS (e.g. when IAP is ready).
      if (isNativeIOSBuild()) {
        setSubStatus("active");
        return;
      }
      // ── [STRIPE PAYWALL — web only, starts here] ────────────────────────────

      // ── Step 1: promo code — instant, no network ────────────────────────────
      if (localStorage.getItem("uncorked_promo_access") === "lifetime") {
        setSubStatus("active");
        fetch(apiUrl("api/stripe/user"), { method: "POST", headers: { "x-user-id": userId } }).catch(() => {});
        return;
      }

      // ── Step 2: compute trial status from localStorage IMMEDIATELY ──────────
      // Runs synchronously before any await — banner renders on first paint.
      if (!localStorage.getItem("trialStart") && !localStorage.getItem("subscribed")) {
        localStorage.setItem("trialStart", Date.now().toString());
      }

      const trialStart = localStorage.getItem("trialStart");
      const isSubscribed = !!localStorage.getItem("subscribed");

      let localDaysLeft = 0;
      if (trialStart && !isSubscribed) {
        const daysElapsed = Math.floor((Date.now() - parseInt(trialStart)) / (1000 * 60 * 60 * 24));
        localDaysLeft = Math.max(0, 7 - daysElapsed);
      }

      // Show banner immediately — before any await
      if (isSubscribed) {
        setSubStatus("active");
      } else {
        setSubStatus(localDaysLeft > 0 ? "trial" : "expired");
        setTrialDaysLeft(localDaysLeft);
      }

      // ── Step 3: register user on server then get authoritative status ───────
      try {
        await fetch(apiUrl("api/stripe/user"), {
          method: "POST",
          headers: { "x-user-id": userId },
        });

        const res = await fetch(apiUrl("api/stripe/subscription"), {
          headers: { "x-user-id": userId },
        });
        const data = await res.json();

        if (data.status === "active" || data.status === "trialing") {
          setSubStatus("active");
        } else if (data.status === "trial") {
          setSubStatus("trial");
          setTrialDaysLeft(data.trialDaysLeft ?? localDaysLeft);
        } else if (data.status === "expired") {
          setSubStatus("expired");
          setTrialDaysLeft(0);
        }
        // Any other server status: keep the locally-computed values already shown
      } catch {
        // Network unavailable — local calculation already displayed, leave it
      }
    }

    initUser();
  }, [userId]);

  // ── Android back gesture + popstate (combined) ──────────────────────────────
  useEffect(() => {
    window.history.pushState({ tab: "home" }, "");

    const onPop = (e: PopStateEvent) => {
      setActiveTab(e.state?.tab || "home");
    };
    window.addEventListener("popstate", onPop);

    const handler = App.addListener("backButton", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    return () => {
      window.removeEventListener("popstate", onPop);
      handler.then((h) => h.remove());
    };
  }, []);

  // ── Screen navigation with history push ────────────────────────────────────
  // Pushes a browser history entry on every tab transition so Android's back
  // gesture has real entries to pop through. The popstate listener above reads
  // the state and restores the correct tab/screen.
  const navigateTo = (tab: Tab) => {
    window.history.pushState({ tab }, "");
    setActiveTab(tab);
  };

  const goHome = () => navigateTo("home");

  const handleSaveToggle = (wine: Wine) => {
    setSavedWines((prev) => {
      const key = `${wine.name}||${wine.vintage}`;
      const exists = prev.some((w) => `${w.name}||${w.vintage}` === key);
      const next = exists
        ? prev.filter((w) => `${w.name}||${w.vintage}` !== key)
        : [...prev, { ...wine, savedAt: Date.now() }];
      localStorage.setItem("uncorked_saved", JSON.stringify(next));
      return next;
    });
  };

  // ── Shared scan executor ────────────────────────────────────────────────────
  // Accepts a FormData already containing the "image" field and posts to /api/scan.
  // Used by both the native-iOS base64 path and the web file-input path.
  const executeScan = async (formData: FormData) => {
    setWines([]);
    setError(null);
    setScanning(true);
    navigateTo("home");
    try {
      const res = await fetch(apiUrl("api/scan"), { method: "POST", body: formData, cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error ?? "Scan failed");
      }
      const data = await res.json();
      const scannedWines: Wine[] = data.wines ?? [];
      setWines(scannedWines);
      setScanning(false);
      navigateTo("results");
      const entry: ScanHistory = { id: Date.now().toString(), scannedAt: Date.now(), wines: scannedWines };
      const newHistory = [entry, ...history].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem("uncorked_history", JSON.stringify(newHistory));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setScanning(false);
    }
  };

  // ── Native iOS path (Capacitor) ─────────────────────────────────────────────
  // Uses @capacitor/camera with CameraResultType.Base64 so we never receive a
  // ph:// or blob: URL — those cause the "string did not match expected pattern"
  // WebKit crash when passed to fetch() or FormData on iOS.
  const handleNativeScan = async (source: CameraSource) => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source,
        quality: 90,
        presentationStyle: 'fullscreen',
      });

      if (!photo.base64String) return;

      // Decode base64 → Blob directly. Never calling URL.createObjectURL(),
      // so no blob: URL is created — safe for WebKit.
      const raw = atob(photo.base64String);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("image", blob, "photo.jpg");
      await executeScan(formData);
    } catch (err: any) {
      // User cancelled the picker — swallow silently
      const msg: string = err?.message ?? "";
      if (
        msg.toLowerCase().includes("cancel") ||
        msg.toLowerCase().includes("dismiss") ||
        msg.toLowerCase().includes("no image")
      ) return;
      setError("Could not access camera. Please check permissions and try again.");
    }
  };

  // ── Entry point for the scan button ────────────────────────────────────────
  const handleScanAttempt = () => {
    // Paywall gate — all platforms
    if (subStatus === "expired") {
      setShowPaywallModal(true);
      return;
    }

    if (isNativeApp()) {
      // iOS and Android: use native camera (Capacitor base64 path).
      // Avoids ph:// / blob: URLs that crash WebKit on iOS.
      handleNativeScan(CameraSource.Prompt);
      return;
    }

    // Web fallback: standard file input
    fileInputRef.current?.click();
  };

  // ── Web file-input handler (web only — native platforms use handleNativeScan) ─
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (subStatus === "expired") {
      setShowPaywallModal(true);
      return;
    }
    const formData = new FormData();
    formData.append("image", file);
    await executeScan(formData);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;

  // Wine Detail Screen — full-screen overlay, no bottom nav
  if (detailWine) {
    return (
      <WineDetailScreen
        wine={detailWine}
        savedWines={savedWines}
        onSaveToggle={handleSaveToggle}
        onHome={() => { setDetailWine(null); goHome(); }}
      />
    );
  }

  const hasBanner = subStatus === "trial" || subStatus === "expired";
  const bannerHeight = hasBanner ? 44 : 0;

  return (
    <div style={{
      maxWidth: "430px", margin: "0 auto",
      minHeight: "100svh", backgroundColor: "#faf7f2",
      position: "relative",
    }}>

      {/* Trial / Expired banner */}
      {subStatus === "trial" && (
        <div style={{
          position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: "430px",
          backgroundColor: "#c9a84c",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
          height: `${bannerHeight}px`,
          marginTop: `${statusBarHeight}px`,
          zIndex: 200, boxSizing: "border-box",
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: "0.78rem",
            fontWeight: 600, color: "#fff", letterSpacing: "0.01em",
          }}>
            🍷 {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left in your free trial
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => { setShowPaywallWithPromo(true); setShowPaywallModal(true); }}
              style={{
                background: "none", border: "none",
                fontFamily: "'Inter', sans-serif", fontSize: "0.65rem",
                color: "rgba(255,255,255,0.75)", cursor: "pointer",
                textDecoration: "underline", textDecorationStyle: "dotted",
                padding: "2px", letterSpacing: "0.01em",
              }}
            >
              Have a code?
            </button>
            <button
              onClick={() => setShowPaywallModal(true)}
              style={{
                background: "rgba(255,255,255,0.22)", border: "none", borderRadius: "20px",
                fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", fontWeight: 700,
                color: "#fff", padding: "4px 12px", cursor: "pointer", letterSpacing: "0.03em",
              }}
            >
              Upgrade
            </button>
          </div>
        </div>
      )}

      {subStatus === "expired" && (
        <div style={{
          position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: "430px",
          backgroundColor: "#7b1c34",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
          height: `${bannerHeight}px`,
          marginTop: `${statusBarHeight}px`,
          zIndex: 200, boxSizing: "border-box",
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: "0.78rem",
            fontWeight: 600, color: "rgba(250,247,242,0.9)", letterSpacing: "0.01em",
          }}>
            Your free trial has ended
          </span>
          <button
            onClick={() => setShowPaywallModal(true)}
            style={{
              background: "rgba(250,247,242,0.2)", border: "none", borderRadius: "20px",
              fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", fontWeight: 700,
              color: "#faf7f2", padding: "4px 12px", cursor: "pointer", letterSpacing: "0.03em",
            }}
          >
            Subscribe
          </button>
        </div>
      )}

      {/* Payment success toast */}
      {paymentSuccess && (
        <div style={{
          position: "fixed", top: `calc(${bannerHeight}px + 12px)`,
          left: "50%", transform: "translateX(-50%)",
          backgroundColor: "#2d6a4f", color: "#fff",
          padding: "10px 20px", borderRadius: "24px",
          fontFamily: "'Inter', sans-serif", fontSize: "0.85rem",
          fontWeight: 600, zIndex: 201, whiteSpace: "nowrap",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          display: "flex", alignItems: "center", gap: "8px",
          animation: "fadeInDown 0.3s ease",
        }}>
          <span>✓</span> Subscription activated! Welcome to Premium.
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div style={{ paddingBottom: "72px", paddingTop: `${bannerHeight}px` }}>
        {activeTab === "home" && scanning && <LoadingScreen />}
        {activeTab === "home" && !scanning && (
          <HomeTab
            error={error}
            onScanClick={handleScanAttempt}
            onSelectWine={(wine) => {
              window.history.pushState({ screen: "detail" }, "");
              setDetailWine(wine);
            }}
          />
        )}
        {activeTab === "results" && (
          <ResultsScreen
            wines={wines}
            savedWines={savedWines}
            onSaveToggle={handleSaveToggle}
            onHome={goHome}
          />
        )}
        {activeTab === "saved" && (
          <SavedScreen
            savedWines={savedWines}
            onRemove={handleSaveToggle}
            onHome={goHome}
            onWineSelect={(wine) => {
              window.history.pushState({ screen: "detail" }, "");
              setDetailWine(wine);
            }}
          />
        )}
        {activeTab === "history" && (
          <HistoryScreen
            history={history}
            onViewScan={(w) => { setWines(w); navigateTo("results"); }}
            onHome={goHome}
          />
        )}
      </div>

      {activeTab === "home" && !scanning && (
        <div style={{
          textAlign: "center",
          padding: "0.5rem",
          fontSize: "0.75rem",
          color: "#7b1c34",
          opacity: 0.5,
          letterSpacing: "0.05em",
        }}>
          v1.0.1
        </div>
      )}

      <BottomNav
        activeTab={activeTab}
        onTabChange={navigateTo}
        hasResults={wines.length > 0}
        savedCount={savedWines.length}
        onScanClick={handleScanAttempt}
      />

      {/* Paywall modal overlay — PaywallScreen handles iOS vs web UI internally */}
      {showPaywallModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowPaywallModal(false); setShowPaywallWithPromo(false); } }}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            backgroundColor: "rgba(0,0,0,0.55)",
            overflowY: "auto", WebkitOverflowScrolling: "touch" as any,
            display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, minHeight: "100%" }}>
            <PaywallScreen
              userId={userId}
              trialDaysLeft={subStatus === "trial" ? trialDaysLeft : 0}
              onSubscribed={() => { setSubStatus("active"); setShowPaywallModal(false); setShowPaywallWithPromo(false); }}
              onDismiss={() => { setShowPaywallModal(false); setShowPaywallWithPromo(false); }}
              autoShowPromo={showPaywallWithPromo}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────

function HomeTab({
  error,
  onScanClick,
  onSelectWine,
}: {
  error: string | null;
  onScanClick: () => void;
  onSelectWine: (w: SearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "done">("idle");
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      setShowDropdown(false);
      setSearchStatus("idle");
      return;
    }
    setSearchStatus("loading");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl("api/search"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim() }),
        });
        const data = await res.json() as { results: SearchResult[] };
        setResults(data.results ?? []);
        setShowDropdown((data.results ?? []).length > 0);
      } catch { setResults([]); setShowDropdown(false); }
      setSearchStatus("done");
    }, 420);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="w-full flex items-center justify-center" style={{ minHeight: "100svh" }}>
      <div className="w-full flex flex-col items-center justify-between px-6 py-12" style={{ minHeight: "100svh" }}>
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="mb-6">
            <WineGlassIcon />
          </div>

          <h1 className="text-center leading-none tracking-wide mb-3" style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(3rem, 12vw, 3.75rem)",
            fontWeight: 600, color: "#7b1c34", letterSpacing: "0.04em",
          }}>
            Uncorked
          </h1>

          <div style={{ width: "60px", height: "1px", backgroundColor: "#c9a84c", marginBottom: "1.5rem" }} />

          <p className="text-center leading-relaxed mb-8" style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(1.1rem, 4.5vw, 1.25rem)",
            fontWeight: 400, fontStyle: "italic", color: "#7b1c34", opacity: 0.75, maxWidth: "300px",
          }}>
            Scan any wine list. Know every rating. Instantly.
          </p>

          {error && (
            <div className="w-full mb-5 px-4 py-3 rounded-xl text-center" style={{
              backgroundColor: "rgba(123,28,52,0.08)", border: "1px solid rgba(123,28,52,0.2)",
            }}>
              <p style={{ fontSize: "0.875rem", color: "#7b1c34", fontFamily: "'Inter', sans-serif" }}>
                {error}
              </p>
            </div>
          )}

          {/* Scan button */}
          <button
            onClick={onScanClick}
            className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl transition-all duration-200 active:scale-95"
            style={{
              backgroundColor: "#7b1c34", padding: "1.75rem 1.5rem",
              boxShadow: "0 8px 32px rgba(123,28,52,0.28), 0 2px 8px rgba(123,28,52,0.16)",
              border: "none", cursor: "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#6a1829"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#7b1c34"; }}
          >
            <CameraIcon />
            <span style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "1.375rem", fontWeight: 600, color: "#faf7f2", letterSpacing: "0.04em",
            }}>
              Scan Wine List
            </span>
            <span style={{
              fontSize: "0.8rem", color: "rgba(250,247,242,0.65)",
              fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em",
            }}>
              Take a photo or upload an image
            </span>
            <div style={{ width: "40px", height: "2px", backgroundColor: "#c9a84c", borderRadius: "1px", marginTop: "0.25rem" }} />
          </button>

          {/* Divider */}
          <div className="flex items-center w-full gap-3 mt-6 mb-5">
            <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(123,28,52,0.12)" }} />
            <span style={{
              fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em",
              fontFamily: "'Inter', sans-serif", color: "rgba(123,28,52,0.35)",
              textTransform: "uppercase",
            }}>
              or search manually
            </span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(123,28,52,0.12)" }} />
          </div>

          {/* Search bar + dropdown */}
          <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              backgroundColor: "#fff", borderRadius: "14px",
              border: "1.5px solid",
              borderColor: query.length >= 3 ? "rgba(123,28,52,0.3)" : "rgba(123,28,52,0.14)",
              boxShadow: "0 2px 12px rgba(123,28,52,0.07)",
              padding: "0 14px",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}>
              {searchStatus === "loading" ? (
                <div style={{ flexShrink: 0, animation: "spin 0.9s linear infinite" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(123,28,52,0.45)" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </div>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(123,28,52,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
                placeholder="Type a wine name, chateau or producer..."
                style={{
                  flex: 1, padding: "0.875rem 0",
                  border: "none", outline: "none", background: "transparent",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.85rem",
                  color: "#3c0f19",
                }}
              />
              {query.length > 0 && (
                <button
                  onClick={() => { setQuery(""); setResults([]); setShowDropdown(false); setSearchStatus("idle"); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0, display: "flex" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(123,28,52,0.35)" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && results.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
                backgroundColor: "#fff", borderRadius: "14px",
                border: "1px solid rgba(123,28,52,0.12)",
                boxShadow: "0 8px 32px rgba(123,28,52,0.14)",
                zIndex: 50, overflow: "hidden",
                animation: "fadeInDown 0.18s ease",
              }}>
                {results.map((wine, i) => (
                  <button
                    key={`${wine.name}||${wine.vintage}||${i}`}
                    onClick={() => { setShowDropdown(false); onSelectWine(wine); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center",
                      gap: "12px", padding: "12px 16px",
                      background: "none", border: "none", cursor: "pointer",
                      textAlign: "left",
                      borderBottom: i < results.length - 1 ? "1px solid rgba(123,28,52,0.06)" : "none",
                      transition: "background-color 0.1s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(123,28,52,0.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                  >
                    <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>🍷</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: "1rem", fontWeight: 600, color: "#3c0f19",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {wine.name}
                        {wine.vintage && (
                          <span style={{ fontWeight: 400, color: "rgba(123,28,52,0.5)", fontSize: "0.9rem" }}>
                            {" "}{wine.vintage}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: "0.72rem", color: "rgba(123,28,52,0.45)",
                        fontFamily: "'Inter', sans-serif", marginTop: "1px",
                        display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap",
                      }}>
                        {wine.region && <span>{wine.region}</span>}
                        {wine.region && wine.vivinoRating && <span>·</span>}
                        {wine.vivinoRating && (
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ color: "#AC1539", fontWeight: 600 }}>★</span>
                            {wine.vivinoRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(123,28,52,0.25)" strokeWidth="2" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {searchStatus === "done" && results.length === 0 && query.trim().length >= 3 && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
                backgroundColor: "#fff", borderRadius: "14px",
                border: "1px solid rgba(123,28,52,0.1)",
                boxShadow: "0 8px 24px rgba(123,28,52,0.08)",
                zIndex: 50, padding: "1rem",
                textAlign: "center",
                animation: "fadeInDown 0.18s ease",
              }}>
                <p style={{
                  fontSize: "0.82rem", color: "rgba(123,28,52,0.45)",
                  fontFamily: "'Inter', sans-serif", fontStyle: "italic",
                }}>
                  No wines found for "{query.trim()}"
                </p>
              </div>
            )}
          </div>
        </div>

        <p style={{
          fontSize: "0.7rem", color: "rgba(123,28,52,0.35)",
          fontFamily: "'Inter', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "3rem",
        }}>
          Powered by AI
        </p>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Bottom Navigation ─────────────────────────────────────────────────────────

function BottomNav({
  activeTab, onTabChange, hasResults, savedCount, onScanClick,
}: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  hasResults: boolean;
  savedCount: number;
  onScanClick: () => void;
}) {
  const tabs: Array<{
    id: string; label: string; icon: JSX.Element;
    onClick?: () => void; disabled?: boolean; badge?: number | null; navTab?: Tab;
  }> = [
    { id: "scan",     label: "Scan",    icon: <CameraTabIcon />, onClick: onScanClick },
    { id: "results",  label: "Results", icon: <ListIcon />,      disabled: !hasResults },
    { id: "saved",    label: "Saved",   icon: <BookmarkIcon />,  badge: savedCount > 0 ? savedCount : null },
    { id: "history",  label: "History", icon: <ClockIcon /> },
  ];

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "430px",
        backgroundColor: "#fff",
        borderTop: "1px solid rgba(123,28,52,0.1)",
        boxShadow: "0 -4px 20px rgba(123,28,52,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 999,
      }}
    >
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          // "scan" is an action button (never highlighted); all others highlight when active.
          const isActive = tab.id !== "scan" && activeTab === tab.id;
          const isDisabled = tab.disabled;
          const handleClick = () => {
            if (isDisabled) return;
            if (tab.onClick) { tab.onClick(); return; }
            onTabChange(tab.id as Tab);
          };

          return (
            <button
              key={tab.id}
              onClick={handleClick}
              disabled={isDisabled}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "3px", padding: "10px 4px 10px",
                background: "none", border: "none", cursor: isDisabled ? "default" : "pointer",
                position: "relative",
                transition: "opacity 0.15s",
                opacity: isDisabled ? 0.3 : 1,
              }}
            >
              {isActive && (
                <div style={{
                  position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                  width: "32px", height: "2px", borderRadius: "0 0 2px 2px",
                  backgroundColor: "#7b1c34",
                }} />
              )}
              <span style={{ color: isActive ? "#7b1c34" : "rgba(123,28,52,0.38)", transition: "color 0.15s", position: "relative" }}>
                {tab.icon}
                {tab.badge != null && (
                  <span style={{
                    position: "absolute", top: "-4px", right: "-6px",
                    backgroundColor: "#c9a84c", color: "#fff",
                    fontSize: "0.5rem", fontWeight: 700,
                    width: "14px", height: "14px", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </span>
              <span style={{
                fontSize: "0.6rem", fontWeight: 600,
                fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em",
                color: isActive ? "#7b1c34" : "rgba(123,28,52,0.38)",
                transition: "color 0.15s",
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function WineGlassIcon() {
  return (
    <svg width="52" height="72" viewBox="0 0 52 72" fill="none">
      <path d="M8 4 C8 4 4 18 4 26 C4 39 14 48 26 48 C38 48 48 39 48 26 C48 18 44 4 44 4 Z"
        stroke="#7b1c34" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M10 30 C10 30 8 28 8 26 C8 24 9 22 9 22 C14 22 38 22 43 22 C43 22 44 24 44 26 C44 28 42 30 42 30 C38 40 14 40 10 30 Z"
        fill="#7b1c34" opacity="0.18" />
      <line x1="26" y1="48" x2="26" y2="64" stroke="#7b1c34" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="14" y1="64" x2="38" y2="64" stroke="#7b1c34" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 14 C18 14 16 20 16 24" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="4" y="11" width="32" height="23" rx="3" stroke="#faf7f2" strokeWidth="2" fill="none" />
      <path d="M14 11 L16 7 H24 L26 11" stroke="#faf7f2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="20" cy="22" r="6" stroke="#faf7f2" strokeWidth="2" fill="none" />
      <circle cx="20" cy="22" r="3" fill="#c9a84c" opacity="0.85" />
      <circle cx="32" cy="15" r="1.5" fill="#faf7f2" opacity="0.7" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

function CameraTabIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
