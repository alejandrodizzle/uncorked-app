import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// CRITICAL: import the package eagerly so its registerPlugin('Purchases', ...)
// call runs during module evaluation. Without this, the JS-side Capacitor
// proxy on window.Capacitor.Plugins.Purchases is a stub that responds with
// "Purchases must be configured" to every call — even after configure().
// Reaching for window.Capacitor.Plugins.Purchases directly was a v7/v8
// pattern; v9 requires the imported namespace.
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";

// ── Capacitor diagnostics — visible in Xcode console + Sentry ────────────────
console.log("Is native platform:", (window as any).Capacitor?.isNativePlatform?.());
console.log("Platform:", (window as any).Capacitor?.getPlatform?.());
console.log("RC plugin available:", !!(window as any).Capacitor?.Plugins?.Purchases);

// ── Status bar + splash (non-blocking, fire-and-forget) ──────────────────────
async function initChrome() {
  if (typeof window === "undefined") return;
  if (!(window as any).Capacitor?.isNativePlatform?.()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#7b1c34" });
  } catch { /* unavailable */ }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 500 });
  } catch { /* unavailable */ }
}

// ── RevenueCat — must be configured BEFORE React renders the paywall ─────────
async function initRC() {
  if (typeof window === "undefined") return;
  const Capacitor = (window as any).Capacitor;
  if (!Capacitor?.isNativePlatform?.()) return;
  if (Capacitor.getPlatform?.() !== "ios") return;

  const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY as string;
  console.log("Configuring RC with key:", apiKey?.substring(0, 10));

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({ apiKey });
    console.log("RC configure() resolved (via direct import)");

    // Native SDK initializes asynchronously — give it a moment before probing.
    await new Promise(r => setTimeout(r, 3000));

    // Verify with a real round-trip. ONLY mark configured on success so the
    // paywall probe doesn't get a false-positive short-circuit.
    try {
      const info = await Purchases.getCustomerInfo();
      console.log("RC verified, customer:", (info as any)?.customerInfo?.originalAppUserId ?? "(anon)");
      (window as any).__rcConfigured = true;
    } catch (probeErr) {
      console.error("RC configure succeeded but getCustomerInfo failed:", probeErr);
      // Do NOT set __rcConfigured — paywall probe will drive the wait.
    }
  } catch (err) {
    console.error("RC init failed:", err);
  }
}

// ── Render after RC init ─────────────────────────────────────────────────────
// We deliberately await initRC so the paywall never opens while the native
// SDK is still warming up. initChrome runs in parallel.
Promise.all([initRC(), initChrome()]).finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
