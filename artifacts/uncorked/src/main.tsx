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
      const rcPkg = "@revenuecat/purchases" + "-capacitor";
      const { Purchases, LOG_LEVEL } = await import(/* @vite-ignore */ rcPkg);
      const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY as string;
      // Sandbox-friendly diagnostic — logs only the first 10 chars (safe to surface)
      console.log("RC API Key prefix:", apiKey?.substring(0, 10));
      console.log("RC configured for sandbox testing");
      if (apiKey) {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        await Purchases.configure({ apiKey });

        // Verify configure() actually wired the native SDK. Capacitor bridge
        // resolves before native init completes, so probe getCustomerInfo()
        // up to 5x at 1s intervals before declaring success.
        const PurchasesPlugin = (window as any).Capacitor?.Plugins?.Purchases;
        let verified = false;
        for (let i = 0; i < 5; i++) {
          try {
            await PurchasesPlugin.getCustomerInfo();
            verified = true;
            (window as any).__rcConfigured = true;
            console.log(`RevenueCat configured and verified successfully (attempt ${i + 1})`);
            break;
          } catch (e: any) {
            const m: string = e?.message ?? "";
            if (m.toLowerCase().includes("configured") || m.toLowerCase().includes("purchases must be")) {
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
            // Any other error means the SDK IS up — just a different issue (e.g. network)
            verified = true;
            (window as any).__rcConfigured = true;
            console.log(`RevenueCat configured (non-config error on probe, treated as ready): ${m}`);
            break;
          }
        }
        if (!verified) console.error("RevenueCat failed to verify configuration after 5 attempts");
      }
    } catch (e) {
      console.warn("RevenueCat initialization failed:", e);
      /* RevenueCat not available — app continues without IAP */
    }
  }
}

initCapacitor().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
