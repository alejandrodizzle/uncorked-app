import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

async function initCapacitor() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } };
  if (!w.Capacitor?.isNativePlatform?.()) return;

  // ── Status bar ───────────────────────────────────────────────────────────────
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#7b1c34" });
  } catch { /* not available on this platform */ }

  // ── Splash screen ────────────────────────────────────────────────────────────
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 500 });
  } catch { /* not available on this platform */ }

  // ── RevenueCat — iOS only ────────────────────────────────────────────────────
  if (w.Capacitor?.getPlatform?.() === "ios") {
    try {
      const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
      const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY as string;
      if (apiKey) {
        await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
        await Purchases.configure({ apiKey });
      }
    } catch { /* RevenueCat not available */ }
  }
}

initCapacitor().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
