import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aarenas.uncorked",
  appName: "Pocket Somm",
  webDir: "dist/public",

  // No server.url — iOS loads from bundled dist/public assets.
  // Android re-injects server.url via Codemagic CI after npx cap sync android.
  server: {
    androidScheme: "https",
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
