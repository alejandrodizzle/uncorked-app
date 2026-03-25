import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aarenas.uncorked",
  appName: "Uncorked",
  webDir: "dist/public",

  server: {
    url: "https://wine-scan-ai.replit.app",
    cleartext: false,
  },

  plugins: {
    Camera: {
      permissions: ["camera", "photos"],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: "#7b1c34",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "Light",
      backgroundColor: "#7b1c34",
      overlaysWebView: false,
    },
  },

  ios: {
    contentInset: "automatic",
    backgroundColor: "#7b1c34",
    preferredContentMode: "mobile",
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
