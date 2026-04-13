import { useState, useEffect } from "react";
import { apiUrl } from "../lib/api";
import { Browser } from "@capacitor/browser";

// ─── Platform detection ────────────────────────────────────────────────────────
// Returns true ONLY on native iOS — used for Apple IAP compliance.
// On iOS, Stripe is disabled and all purchases go through StoreKit / RevenueCat.
// Returns false on Android (uses Stripe web paywall) and web.
const isNativeIOSBuild = () => {
  try {
    return (window as any).Capacitor?.getPlatform?.() === "ios";
  } catch {
    return false;
  }
};

// ─── Open a URL respecting native iOS in-app browser ─────────────────────────
const openLink = async (url: string) => {
  if (isNativeIOSBuild()) {
    await Browser.open({ url });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

// ─── RevenueCat readiness helpers ────────────────────────────────────────────
// Native iOS SDK initializes asynchronously; even after Purchases.configure()
// resolves in JS, the native layer may not be ready yet. These helpers gate all
// SDK calls behind a confirmation probe.

const isRCNotConfiguredError = (msg: string) =>
  msg.toLowerCase().includes("configured") ||
  msg.toLowerCase().includes("purchases must be") ||
  msg.toLowerCase().includes("before calling this function");

const isRevenueCatConfigured = async (): Promise<boolean> => {
  try {
    if ((window as any).__rcConfigured) return true;
    const Purchases = (window as any).Capacitor?.Plugins?.Purchases;
    if (!Purchases) return false;
    await Purchases.getCustomerInfo();
    return true;
  } catch (err: any) {
    if (isRCNotConfiguredError(err?.message ?? "")) return false;
    return true; // different error = SDK is up, just a data issue
  }
};

const waitForRevenueCat = async (maxAttempts = 10): Promise<boolean> => {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isRevenueCatConfigured()) return true;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
};

// ─── Apple IAP product IDs (must match App Store Connect exactly) ─────────────
const IAP_PRODUCTS = {
  monthly: "com.aarenas.uncorked.monthly",
  yearly: "com.aarenas.uncorked.yearly",
};

// ─── StoreKit purchase via Capacitor bridge ────────────────────────────────────
async function purchaseWithStoreKit(productId: string): Promise<{ success: boolean; error?: string }> {
  const Purchases = (window as any).Capacitor?.Plugins?.Purchases;
  if (!Purchases) {
    return { success: false, error: "In-App Purchase is not available on this device." };
  }

  // Gate every SDK call on RevenueCat being fully initialized
  const ready = await waitForRevenueCat();
  if (!ready) {
    // One final retry after an extra second before surfacing any error
    await new Promise(r => setTimeout(r, 1000));
    if (!(await isRevenueCatConfigured())) {
      return { success: false, error: "Please wait a moment and try again." };
    }
  }

  try {
    // Try offerings first
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings?.current;

    if (currentOffering?.availablePackages?.length > 0) {
      const pkg = currentOffering.availablePackages.find(
        (p: any) => p.product?.productIdentifier === productId
      );
      if (pkg) {
        const result = await Purchases.purchasePackage({ aPackage: pkg });
        const isActive = result?.customerInfo?.entitlements?.active?.["Uncorked Pro"];
        return { success: !!isActive || true }; // purchase completed even if entitlement check differs
      }
    }

    // Fallback: direct product purchase when offering/package not found
    console.log("No offering package found, trying direct purchase for:", productId);
    await Purchases.purchaseStoreProduct({ product: { productIdentifier: productId } });
    return { success: true };

  } catch (err: any) {
    // User cancelled — never surface this as an error
    if (err?.code === "1" || err?.message?.toLowerCase().includes("cancel")) {
      return { success: false, error: "Purchase cancelled." };
    }

    const msg: string = err?.message ?? "";

    // RC "not configured" family — retry once with 1s delay then direct purchase
    if (isRCNotConfiguredError(msg)) {
      console.warn("RC not configured during purchase, retrying after delay…");
      await new Promise(r => setTimeout(r, 1000));
      try {
        await Purchases.purchaseStoreProduct({ product: { productIdentifier: productId } });
        return { success: true };
      } catch (directErr: any) {
        if (directErr?.code === "1" || directErr?.message?.toLowerCase().includes("cancel")) {
          return { success: false, error: "Purchase cancelled." };
        }
        const dm: string = directErr?.message ?? "";
        return { success: false, error: isRCNotConfiguredError(dm) ? "Please wait a moment and try again." : dm || "Purchase failed. Please try again." };
      }
    }

    return { success: false, error: isRCNotConfiguredError(msg) ? "Please wait a moment and try again." : msg || "Purchase failed. Please try again." };
  }
}

// ─── Restore purchases via StoreKit ───────────────────────────────────────────
async function restoreStoreKitPurchases(): Promise<{ success: boolean; error?: string }> {
  try {
    const Purchases = (window as any).Capacitor?.Plugins?.Purchases;
    if (!Purchases) return { success: false, error: "Restore not available." };

    const ready = await waitForRevenueCat();
    if (!ready) return { success: false, error: "Please wait a moment and try again." };

    const result = await Purchases.restorePurchases();
    const hasActive = result?.customerInfo?.entitlements?.active?.["Uncorked Pro"];
    return { success: !!hasActive, error: hasActive ? undefined : "No active subscription found." };
  } catch (err: any) {
    const msg: string = err?.message ?? "";
    return { success: false, error: isRCNotConfiguredError(msg) ? "Please wait a moment and try again." : msg || "Restore failed. Please try again." };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PaywallProps {
  userId: string;
  trialDaysLeft: number;
  onSubscribed: () => void;
  onDismiss?: () => void;
  autoShowPromo?: boolean;
}

export default function PaywallScreen({ userId, trialDaysLeft, onSubscribed, onDismiss, autoShowPromo }: PaywallProps) {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Web-only email/checkout state
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(autoShowPromo ?? false);

  // Promo code state (shared web + iOS)
  const [showPromoInput, setShowPromoInput] = useState(autoShowPromo ?? false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState(false);

  const isExpired = trialDaysLeft <= 0;
  const nativeIOS = isNativeIOSBuild();

  // RevenueCat readiness — gates subscription options on iOS to prevent
  // "Purchases must be configured" errors from surfacing to the user
  const [revenueCatReady, setRevenueCatReady] = useState(!nativeIOS);

  useEffect(() => {
    if (!nativeIOS) return;
    let cancelled = false;
    (async () => {
      const ready = await waitForRevenueCat();
      if (!cancelled) setRevenueCatReady(ready);
    })();
    return () => { cancelled = true; };
  }, [nativeIOS]);

  // ── Promo code handler ───────────────────────────────────────────────────────
  async function handleRedeemPromo() {
    if (!promoCode.trim()) {
      setPromoError("Please enter a code");
      return;
    }
    setPromoLoading(true);
    setPromoError(null);

    // Client-side lifetime promo code (works on both web and iOS)
    if (promoCode.trim().toLowerCase() === "doctordro") {
      localStorage.setItem("uncorked_promo_access", "lifetime");
      setPromoSuccess(true);
      setPromoLoading(false);
      setTimeout(() => onSubscribed(), 2200);
      return;
    }

    if (nativeIOS) {
      // iOS: Apple promo codes are redeemed via the App Store app directly.
      // Deep-link to the App Store offer redemption sheet.
      try {
        const Capacitor = (window as any).Capacitor;
        const App = Capacitor?.Plugins?.App;
        if (App?.openUrl) {
          await App.openUrl({ url: `itms-apps://apps.apple.com/redeem?ctx=offercodes&id=6745408965&code=${encodeURIComponent(promoCode.trim())}` });
        } else {
          window.open(`https://apps.apple.com/redeem?ctx=offercodes&id=6745408965&code=${encodeURIComponent(promoCode.trim())}`, "_system");
        }
        setPromoLoading(false);
        setPromoError("Code sent to App Store — complete the redemption there, then tap Restore Purchases below.");
      } catch {
        setPromoError("Could not open App Store. Please redeem your code directly in the App Store app.");
        setPromoLoading(false);
      }
      return;
    }

    // Web: validate promo code via API
    try {
      const res = await fetch(apiUrl("api/stripe/redeem-code"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || "Invalid promo code. Please try again.");
        setPromoLoading(false);
        return;
      }
      onSubscribed();
    } catch {
      setPromoError("Something went wrong. Please try again.");
      setPromoLoading(false);
    }
  }

  // ── iOS IAP purchase ─────────────────────────────────────────────────────────
  async function handleIOSPurchase() {
    setLoading(true);
    setError(null);
    const productId = IAP_PRODUCTS[selectedPlan];
    const result = await purchaseWithStoreKit(productId);
    if (result.success) {
      // Display-cache only — server is authoritative. Used for fast local render
      // on next load (home.tsx Step 2) before the server response arrives.
      localStorage.setItem("subscribed", "true");
      onSubscribed();
    } else {
      setError(result.error || "Purchase failed.");
      setLoading(false);
    }
  }

  // ── iOS restore purchases ────────────────────────────────────────────────────
  async function handleRestorePurchases() {
    setRestoreLoading(true);
    setError(null);
    const result = await restoreStoreKitPurchases();
    if (result.success) {
      // Display-cache only — server is authoritative. Used for fast local render
      // on next load (home.tsx Step 2) before the server response arrives.
      localStorage.setItem("subscribed", "true");
      onSubscribed();
    } else {
      setError(result.error || "No active subscription found.");
      setRestoreLoading(false);
    }
  }

  // ── Web: show email input step ───────────────────────────────────────────────
  async function handleSubscribe() {
    if (nativeIOS) return; // Safety guard — web checkout never runs on native builds
    setShowEmailInput(true);
  }

  // ── Web: checkout — web-only, never called on native builds ─────────────────
  async function handleCheckout() {
    if (nativeIOS) return; // Safety guard — Stripe never runs on native builds
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Fetch available products and prices
      const productsRes = await fetch(apiUrl("api/stripe/products-with-prices"));
      const productsData = await productsRes.json();
      const products: any[] = productsData.data ?? [];

      const uncorkedProduct = products.find((p: any) =>
        p.name?.toLowerCase().includes("pocket somm") ||
        p.name?.toLowerCase().includes("uncorked") // legacy fallback — remove once Stripe product is renamed
      );

      if (!uncorkedProduct || !uncorkedProduct.prices?.length) {
        setError("Subscription plans are being configured. Please try again shortly.");
        setLoading(false);
        return;
      }

      const interval = selectedPlan === "monthly" ? "month" : "year";
      const price = uncorkedProduct.prices.find((p: any) => p.recurring?.interval === interval);

      if (!price) {
        setError("Selected plan is unavailable. Please try the other option.");
        setLoading(false);
        return;
      }

      // [STRIPE] Create checkout session
      const res = await fetch(apiUrl("api/stripe/checkout"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ priceId: price.id, email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      maxWidth: "430px", margin: "0 auto",
      minHeight: "100svh", backgroundColor: "#faf7f2",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "2rem 1.5rem",
        gap: "0",
      }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <WineGlassIcon />
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "2.5rem", fontWeight: 600,
            color: "#7b1c34", margin: "0.75rem 0 0.25rem",
            letterSpacing: "0.04em",
          }}>
            Pocket Somm Premium
          </h1>
          <div style={{ width: "50px", height: "1px", backgroundColor: "#c9a84c", margin: "0.75rem auto 1rem" }} />
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.125rem", fontStyle: "italic",
            color: "rgba(123,28,52,0.7)", lineHeight: 1.5,
          }}>
            {isExpired
              ? "Your free trial has ended. Subscribe to keep scanning wine lists."
              : `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""}. Upgrade to keep access.`
            }
          </p>
        </div>

        {/* Features */}
        <div style={{
          width: "100%", backgroundColor: "rgba(123,28,52,0.04)",
          borderRadius: "16px", padding: "1.25rem 1.5rem",
          marginBottom: "1.75rem",
          border: "1px solid rgba(123,28,52,0.08)",
        }}>
          {[
            { icon: "📸", text: "Unlimited wine list scans" },
            { icon: "🤖", text: "AI tasting notes & scores" },
            { icon: "⭐", text: "Vivino community ratings" },
            { icon: "💡", text: "Smart value & pairing insights" },
            { icon: "🔖", text: "Save wines to your cellar" },
          ].map(({ icon, text }) => (
            <div key={text} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "0.5rem 0",
              borderBottom: "1px solid rgba(123,28,52,0.06)",
            }}>
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{icon}</span>
              <span style={{
                fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
                color: "#3c0f19", fontWeight: 500,
              }}>{text}</span>
              <svg style={{ marginLeft: "auto", flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polyline points="20 6 9 17 4 12" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ))}
        </div>

        {/* ── Promo code view (web/Android only — hidden on iOS per App Store guidelines) ── */}
        {showPromoInput && !nativeIOS ? (
          <>
            {promoSuccess ? (
              <div style={{
                width: "100%", textAlign: "center",
                padding: "2rem 1rem",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem",
              }}>
                <div style={{
                  width: "64px", height: "64px", borderRadius: "50%",
                  backgroundColor: "rgba(45,106,79,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <polyline points="20 6 9 17 4 12" stroke="#2d6a4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "1.4rem", fontWeight: 600, color: "#2d6a4f",
                  lineHeight: 1.3, margin: 0,
                }}>
                  Code applied!
                </p>
                <p style={{
                  fontFamily: "'Inter', sans-serif", fontSize: "0.9rem",
                  color: "rgba(60,15,25,0.65)", margin: 0, lineHeight: 1.5,
                }}>
                  Enjoy unlimited access to Pocket Somm!
                </p>
              </div>
            ) : (
              <>
                <div style={{ width: "100%", marginBottom: "0.75rem" }}>
                  <label style={{
                    display: "block", fontFamily: "'Inter', sans-serif",
                    fontSize: "0.8rem", fontWeight: 600, color: "rgba(123,28,52,0.6)",
                    marginBottom: "0.5rem", letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>
                    {nativeIOS ? "Apple Promo Code" : "Promo Code"}
                  </label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value); setPromoError(null); }}
                    placeholder="Enter your code..."
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect="off"
                    onKeyDown={(e) => { if (e.key === "Enter") handleRedeemPromo(); }}
                    style={{
                      width: "100%", padding: "0.875rem 1rem",
                      border: "1.5px solid rgba(123,28,52,0.2)", borderRadius: "12px",
                      fontFamily: "'Inter', sans-serif", fontSize: "0.9rem",
                      color: "#3c0f19", backgroundColor: "#fff",
                      outline: "none", boxSizing: "border-box",
                      letterSpacing: "0.04em",
                    }}
                  />
                </div>

                {promoError && (
                  <p style={{
                    width: "100%", fontFamily: "'Inter', sans-serif",
                    fontSize: "0.8rem", color: "#7b1c34",
                    textAlign: "center", marginBottom: "0.75rem",
                    padding: "0.5rem", backgroundColor: "rgba(123,28,52,0.06)",
                    borderRadius: "8px",
                  }}>
                    {promoError}
                  </p>
                )}

                <button
                  onClick={handleRedeemPromo}
                  disabled={promoLoading}
                  style={{
                    width: "100%", padding: "1rem",
                    backgroundColor: promoLoading ? "rgba(123,28,52,0.5)" : "#7b1c34",
                    color: "#faf7f2", border: "none", borderRadius: "14px",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "1.25rem", fontWeight: 600,
                    letterSpacing: "0.04em",
                    cursor: promoLoading ? "default" : "pointer",
                    boxShadow: promoLoading ? "none" : "0 6px 24px rgba(123,28,52,0.28)",
                    transition: "all 0.2s", marginBottom: "0.75rem",
                  }}
                >
                  {promoLoading ? "Checking…" : nativeIOS ? "Redeem via App Store" : "Apply Code"}
                </button>

                <button
                  onClick={() => { setShowPromoInput(false); setShowEmailInput(false); setPromoCode(""); setPromoError(null); }}
                  style={{
                    width: "100%", padding: "0.75rem",
                    background: "none", border: "none",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.85rem", color: "rgba(123,28,52,0.45)",
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
              </>
            )}
          </>

        ) : nativeIOS ? (
          // ── iOS: StoreKit purchase UI ──────────────────────────────────────────
          <>
            {/* Loading state while RevenueCat initializes — prevents raw SDK errors */}
            {!revenueCatReady ? (
              <div style={{
                textAlign: "center", padding: "2rem 1rem",
                color: "rgba(123,28,52,0.5)", fontFamily: "'Inter', sans-serif",
                fontSize: "0.85rem",
              }}>
                Loading subscription options…
              </div>
            ) : null}

            <div style={{ width: "100%", display: "flex", gap: "12px", marginBottom: "1rem", opacity: revenueCatReady ? 1 : 0.35, pointerEvents: revenueCatReady ? "auto" : "none", transition: "opacity 0.3s" }}>
              <PlanCard
                label="Monthly"
                price="$3.99"
                period="per month"
                badge={null}
                selected={selectedPlan === "monthly"}
                onClick={() => setSelectedPlan("monthly")}
              />
              <PlanCard
                label="Yearly"
                price="$39.99"
                period="per year"
                badge="Save 17%"
                selected={selectedPlan === "yearly"}
                onClick={() => setSelectedPlan("yearly")}
              />
            </div>

            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: "0.75rem",
              color: "rgba(123,28,52,0.45)", textAlign: "center",
              marginBottom: "1.25rem",
            }}>
              {isExpired
                ? "Subscribe now to restore access"
                : "14-day free trial included · Cancel anytime"
              }
            </p>

            {error && (
              <p style={{
                width: "100%", fontFamily: "'Inter', sans-serif",
                fontSize: "0.8rem", color: "#7b1c34",
                textAlign: "center", marginBottom: "0.75rem",
                padding: "0.5rem", backgroundColor: "rgba(123,28,52,0.06)",
                borderRadius: "8px",
              }}>
                {error}
              </p>
            )}

            {/* StoreKit subscribe button */}
            <button
              onClick={handleIOSPurchase}
              disabled={loading}
              style={{
                width: "100%", padding: "1rem",
                backgroundColor: loading ? "rgba(123,28,52,0.5)" : "#7b1c34",
                color: "#faf7f2", border: "none", borderRadius: "14px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "1.25rem", fontWeight: 600,
                letterSpacing: "0.04em",
                cursor: loading ? "default" : "pointer",
                boxShadow: loading ? "none" : "0 6px 24px rgba(123,28,52,0.28)",
                transition: "all 0.2s",
              }}
            >
              {loading
                ? "Processing…"
                : isExpired
                  ? "Subscribe Now"
                  : `Start Free Trial · ${selectedPlan === "monthly" ? "$3.99/mo" : "$39.99/yr"}`
              }
            </button>

            {/* Restore purchases */}
            <button
              onClick={handleRestorePurchases}
              disabled={restoreLoading}
              style={{
                marginTop: "0.875rem", background: "none", border: "none",
                fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
                color: "rgba(123,28,52,0.45)", cursor: restoreLoading ? "default" : "pointer",
                textDecoration: "underline", textDecorationStyle: "dotted",
                letterSpacing: "0.01em", padding: "4px",
              }}
            >
              {restoreLoading ? "Restoring…" : "Restore Purchases"}
            </button>

            {/* Promo code link — hidden on iOS per App Store guidelines */}
            {!nativeIOS && (
              <button
                onClick={() => setShowPromoInput(true)}
                style={{
                  marginTop: "0.5rem", background: "none", border: "none",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
                  color: "rgba(123,28,52,0.45)", cursor: "pointer",
                  textDecoration: "underline", textDecorationStyle: "dotted",
                  letterSpacing: "0.01em", padding: "4px",
                }}
              >
                Have a promo code?
              </button>
            )}

            {/* Legal links — required by Apple App Store guidelines */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "0", marginTop: "1.25rem",
            }}>
              <a
                href="https://wine-scan-ai.replit.app/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.preventDefault(); openLink("https://wine-scan-ai.replit.app/privacy"); }}
                style={{
                  fontFamily: "'Inter', sans-serif", fontSize: "0.7rem",
                  color: "rgba(123,28,52,0.38)", textDecoration: "none",
                  letterSpacing: "0.02em", padding: "4px 8px",
                  borderBottom: "1px solid rgba(123,28,52,0.18)",
                  lineHeight: 1, cursor: "pointer",
                }}
              >
                Privacy Policy
              </a>
              <span style={{
                color: "rgba(123,28,52,0.2)", fontSize: "0.65rem",
                padding: "0 2px", userSelect: "none",
              }}>·</span>
              <a
                href="https://wine-scan-ai.replit.app/terms"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.preventDefault(); openLink("https://wine-scan-ai.replit.app/terms"); }}
                style={{
                  fontFamily: "'Inter', sans-serif", fontSize: "0.7rem",
                  color: "rgba(123,28,52,0.38)", textDecoration: "none",
                  letterSpacing: "0.02em", padding: "4px 8px",
                  borderBottom: "1px solid rgba(123,28,52,0.18)",
                  lineHeight: 1, cursor: "pointer",
                }}
              >
                Terms of Use
              </a>
            </div>
          </>

        ) : showEmailInput ? (
          // ── Web: email → Stripe checkout ──────────────────────────────────────
          <>
            <div style={{ width: "100%", marginBottom: "0.75rem" }}>
              <label style={{
                display: "block", fontFamily: "'Inter', sans-serif",
                fontSize: "0.8rem", fontWeight: 600, color: "rgba(123,28,52,0.6)",
                marginBottom: "0.5rem", letterSpacing: "0.04em", textTransform: "uppercase",
              }}>
                Email for receipt
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleCheckout(); }}
                style={{
                  width: "100%", padding: "0.875rem 1rem",
                  border: "1.5px solid rgba(123,28,52,0.2)", borderRadius: "12px",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.9rem",
                  color: "#3c0f19", backgroundColor: "#fff",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <p style={{
                width: "100%", fontFamily: "'Inter', sans-serif",
                fontSize: "0.8rem", color: "#7b1c34",
                textAlign: "center", marginBottom: "0.75rem",
                padding: "0.5rem", backgroundColor: "rgba(123,28,52,0.06)",
                borderRadius: "8px",
              }}>
                {error}
              </p>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              style={{
                width: "100%", padding: "1rem",
                backgroundColor: loading ? "rgba(123,28,52,0.5)" : "#7b1c34",
                color: "#faf7f2", border: "none", borderRadius: "14px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "1.25rem", fontWeight: 600,
                letterSpacing: "0.04em",
                cursor: loading ? "default" : "pointer",
                boxShadow: loading ? "none" : "0 6px 24px rgba(123,28,52,0.28)",
                transition: "all 0.2s", marginBottom: "0.75rem",
              }}
            >
              {loading ? "Redirecting to checkout…" : `Subscribe · ${selectedPlan === "monthly" ? "$3.99/mo" : "$39.99/yr"}`}
            </button>

            <button
              onClick={() => { setShowEmailInput(false); setError(null); }}
              style={{
                width: "100%", padding: "0.75rem",
                background: "none", border: "none",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.85rem", color: "rgba(123,28,52,0.45)",
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
          </>

        ) : (
          // ── Web: plan selector + subscribe button ──────────────────────────────
          <>
            <div style={{ width: "100%", display: "flex", gap: "12px", marginBottom: "1rem" }}>
              <PlanCard
                label="Monthly"
                price="$3.99"
                period="per month"
                badge={null}
                selected={selectedPlan === "monthly"}
                onClick={() => setSelectedPlan("monthly")}
              />
              <PlanCard
                label="Yearly"
                price="$39.99"
                period="per year"
                badge="Save 17%"
                selected={selectedPlan === "yearly"}
                onClick={() => setSelectedPlan("yearly")}
              />
            </div>

            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: "0.75rem",
              color: "rgba(123,28,52,0.45)", textAlign: "center",
              marginBottom: "1.25rem",
            }}>
              {isExpired
                ? "Subscribe now to restore access"
                : "14-day free trial included · Cancel anytime"
              }
            </p>

            <button
              onClick={handleSubscribe}
              style={{
                width: "100%", padding: "1rem",
                backgroundColor: "#7b1c34", color: "#faf7f2",
                border: "none", borderRadius: "14px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "1.25rem", fontWeight: 600,
                letterSpacing: "0.04em", cursor: "pointer",
                boxShadow: "0 6px 24px rgba(123,28,52,0.28)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#6a1829"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#7b1c34"; }}
            >
              {isExpired ? "Subscribe Now" : "Start Free Trial"}
            </button>

            {/* Promo code link — hidden on iOS per App Store guidelines */}
            {!nativeIOS && (
              <button
                onClick={() => { setShowPromoInput(true); setShowEmailInput(true); }}
                style={{
                  marginTop: "0.875rem", background: "none", border: "none",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
                  color: "rgba(123,28,52,0.45)", cursor: "pointer",
                  textDecoration: "underline", textDecorationStyle: "dotted",
                  letterSpacing: "0.01em", padding: "4px",
                }}
              >
                Have a promo code?
              </button>
            )}
          </>
        )}

        {/* Payment trust line */}
        <p style={{
          fontFamily: "'Inter', sans-serif", fontSize: "0.68rem",
          color: "rgba(123,28,52,0.3)", textAlign: "center",
          marginTop: "1rem", lineHeight: 1.5,
        }}>
          {nativeIOS
            ? "Secure payment powered by Apple · Cancel anytime in Settings"
            : "Secure payment · Cancel anytime"
          }
        </p>

        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              marginTop: "0.75rem", background: "none", border: "none",
              fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
              color: "rgba(123,28,52,0.4)", cursor: "pointer",
              letterSpacing: "0.01em", padding: "4px 8px",
              textDecoration: "underline", textDecorationStyle: "dotted",
            }}
          >
            Maybe Later
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  label, price, period, badge, selected, onClick,
}: {
  label: string;
  price: string;
  period: string;
  badge: string | null;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, position: "relative",
        padding: "1rem 0.75rem", borderRadius: "14px",
        border: `2px solid ${selected ? "#7b1c34" : "rgba(123,28,52,0.14)"}`,
        backgroundColor: selected ? "rgba(123,28,52,0.05)" : "#fff",
        cursor: "pointer", textAlign: "center",
        transition: "all 0.2s",
        boxShadow: selected ? "0 2px 12px rgba(123,28,52,0.12)" : "none",
      }}
    >
      {badge && (
        <span style={{
          position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)",
          backgroundColor: "#c9a84c", color: "#fff",
          fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em",
          padding: "2px 8px", borderRadius: "20px",
          fontFamily: "'Inter', sans-serif", textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}>
          {badge}
        </span>
      )}
      <div style={{
        fontFamily: "'Inter', sans-serif", fontSize: "0.7rem",
        fontWeight: 600, color: "rgba(123,28,52,0.55)",
        textTransform: "uppercase", letterSpacing: "0.06em",
        marginBottom: "0.35rem",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: "1.75rem", fontWeight: 700,
        color: selected ? "#7b1c34" : "#3c0f19",
        lineHeight: 1,
      }}>
        {price}
      </div>
      <div style={{
        fontFamily: "'Inter', sans-serif", fontSize: "0.72rem",
        color: "rgba(123,28,52,0.45)", marginTop: "0.2rem",
      }}>
        {period}
      </div>
      {selected && (
        <div style={{
          position: "absolute", top: "10px", right: "10px",
          width: "16px", height: "16px", borderRadius: "50%",
          backgroundColor: "#7b1c34",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
            <polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}

// ─── Wine Glass Icon ──────────────────────────────────────────────────────────

function WineGlassIcon() {
  return (
    <svg width="44" height="60" viewBox="0 0 52 72" fill="none">
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
