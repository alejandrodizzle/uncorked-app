import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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

  const Purchases = Capacitor.Plugins?.Purchases;
  if (!Purchases) {
    console.error("RC plugin missing from Capacitor.Plugins — Podfile pod not linked?");
    return;
  }

  const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY as string;
  console.log("Configuring RC with key:", apiKey?.substring(0, 10));

  try {
    await Purchases.configure({ apiKey });
    console.log("RC configure() resolved");
    // Give native SDK extra time to fully initialize before any caller probes it
    await new Promise(r => setTimeout(r, 2000));
    (window as any).__rcConfigured = true;
    console.log("RC fully ready");
  } catch (err) {
    console.error("RC configure failed:", err);
  }
}

// ── Render after RC init ─────────────────────────────────────────────────────
// We deliberately await initRC so the paywall never opens while the native
// SDK is still warming up. initChrome runs in parallel since it doesn't block
// purchase flow correctness.
Promise.all([initRC(), initChrome()]).finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
