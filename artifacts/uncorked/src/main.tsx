import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

async function initCapacitor() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (!w.Capacitor?.isNativePlatform?.()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#7b1c34" });
  } catch { /* not available on this platform */ }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 500 });
  } catch { /* not available on this platform */ }
}

initCapacitor().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
