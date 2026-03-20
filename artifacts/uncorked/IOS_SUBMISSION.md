# Uncorked — iOS App Store Submission Guide

## What's Already Set Up (in this repo)

| ✓ | Item |
|---|------|
| ✓ | Capacitor 7 installed (`@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`) |
| ✓ | `capacitor.config.ts` — App ID `com.uncorked.app`, live server URL configured |
| ✓ | `assets/icon.png` — 1024×1024 branded app icon (burgundy + wine glass) |
| ✓ | `assets/splash.png` — 2732×2732 branded splash screen |
| ✓ | Camera + photo library permission strings ready |
| ✓ | `ios-config/setup-ios.sh` — one-command Mac setup script |

---

## Prerequisites (on your Mac)

- **macOS 13 Ventura or later**
- **Xcode 15 or later** — [Download from Mac App Store](https://apps.apple.com/app/xcode/id497799835)
- **CocoaPods**: `sudo gem install cocoapods`
- **Node.js 18+** and **pnpm**: `npm install -g pnpm`
- **Apple Developer account** ($99/year) — [developer.apple.com](https://developer.apple.com)

---

## Quickstart — One Command Setup

```bash
# 1. Clone and enter the project
git clone <your-repo-url>
cd <repo>/artifacts/uncorked

# 2. Run the setup script (does everything below automatically)
chmod +x ios-config/setup-ios.sh
./ios-config/setup-ios.sh

# 3. Open in Xcode
npx cap open ios
```

That's it. Then skip to **Step 7 — Configure Signing**.

---

## Step-by-Step (Manual)

### Step 1 — Install dependencies

```bash
cd artifacts/uncorked
pnpm install
```

---

### Step 2 — Build the web app

The app points to the live deployed URL (`https://wine-scan-ai.replit.app`) so no
`VITE_API_URL` override is needed — the native app just loads the live site.

```bash
pnpm build
```

---

### Step 3 — Add the iOS platform

Run **once** to generate the Xcode project:

```bash
npx cap add ios
```

This creates `ios/App/App.xcworkspace` — the Xcode project.

---

### Step 4 — Generate all app icon sizes

```bash
npx @capacitor/assets generate --ios
```

This reads `assets/icon.png` (1024×1024) and `assets/splash.png` (2732×2732) and
writes every required iOS size into the Xcode project automatically.

> Required source files are already created with the Uncorked branding:
> - `assets/icon.png` — burgundy background, white wine glass, "Uncorked" serif text
> - `assets/splash.png` — full-screen burgundy with centered logo

---

### Step 5 — Add camera & photo permissions to Info.plist

Open `ios/App/App/Info.plist` in a text editor and add these keys inside the top `<dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>Uncorked needs camera access to scan wine labels and menus.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Uncorked needs photo access to scan wine lists from your camera roll.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Uncorked would like to save wine list scans to your photo library.</string>
```

> The setup script (`ios-config/setup-ios.sh`) adds these automatically.

---

### Step 6 — Sync and install pods

```bash
npx cap sync ios
cd ios/App && pod install && cd ../..
```

---

### Step 7 — Open in Xcode

```bash
npx cap open ios
# or open: ios/App/App.xcworkspace  (always use .xcworkspace, NOT .xcodeproj)
```

---

### Step 8 — Configure signing in Xcode

1. In the **left sidebar**, click on **App** (the top-level project)
2. Select the **App** target
3. Go to **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Set **Team** to your Apple Developer account
6. Bundle Identifier should already show `com.uncorked.app`

---

### Step 9 — Test on a real device

1. Connect your iPhone via USB cable
2. In the Xcode toolbar, select your iPhone from the device dropdown
3. Press **▶ Run** (or `Cmd+R`)
4. First time: on your iPhone go to **Settings → General → VPN & Device Management → Trust**

> The app will load `https://wine-scan-ai.replit.app` live — no offline build needed.

---

### Step 10 — Archive for App Store

1. In Xcode toolbar, change the scheme from your device to **Any iOS Device (arm64)**
2. Go to **Product → Archive** and wait for the build
3. **Organizer** opens automatically when done
4. Click **Distribute App → App Store Connect → Upload**
5. Follow the wizard — Xcode handles all code signing automatically

---

### Step 11 — App Store Connect listing

Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) and create a new app:

| Field | Value |
|-------|-------|
| Platform | iOS |
| App Name | Uncorked |
| Subtitle | Know every wine rating instantly |
| Bundle ID | com.uncorked.app |
| Category | Food & Drink |
| Age Rating | 4+ (set Alcohol/Tobacco/Drug References to Infrequent/Mild) |
| Price | Free |

**Required screenshots**: at least 3 screenshots at 6.9" size (1320×2868 px)
or 6.5" size (1284×2778 px). Record from a real iPhone or use the Xcode Simulator.

---

## App Icon Reference

All sizes are auto-generated from `assets/icon.png` by `@capacitor/assets`.
Pre-exported individual sizes are also in `assets/` for reference:

| File | Size | Usage |
|------|------|-------|
| `assets/icon.png` | 1024×1024 | Source file + App Store |
| `assets/icon-180.png` | 180×180 | iPhone @3x home screen |
| `assets/icon-120.png` | 120×120 | iPhone @2x home screen |
| `assets/icon-167.png` | 167×167 | iPad Pro @2x |
| `assets/icon-152.png` | 152×152 | iPad @2x |
| `assets/icon-76.png` | 76×76 | iPad @1x |

---

## Updating the App After Code Changes

The app loads live from `https://wine-scan-ai.replit.app`, so **most updates require
no re-submission** — just redeploy on Replit and the app picks up changes instantly.

For native changes (new permissions, Capacitor plugins, config changes):

```bash
cd artifacts/uncorked
pnpm build
npx cap sync ios
# Open Xcode, bump CFBundleShortVersionString, archive, and upload
npx cap open ios
```

---

## Troubleshooting

**Blank white screen**: Check that `capacitor.config.ts` has `server.url` set and the
Replit app is deployed and running.

**"No provisioning profile"**: Signing & Capabilities → select your Team → Xcode
auto-provisions.

**Camera permission crash**: Ensure the three `NS*UsageDescription` keys are in
`Info.plist` — the app will crash on iOS 14+ without them.

**CocoaPods errors**: `cd ios/App && pod deintegrate && pod install`

**"App ID is not available"**: Someone else registered `com.uncorked.app` — change
it to something unique like `com.yourname.uncorked` in both
`capacitor.config.ts` and Xcode's Signing & Capabilities.

---

## Important Note on In-App Payments

Stripe subscriptions work for the **web version** (browser / PWA).

For the **App Store version**, Apple requires all in-app purchases to use
**StoreKit (Apple's payment system)**. If Apple rejects the app for using Stripe,
the solution is to integrate RevenueCat for native in-app subscriptions.
The web Stripe paywall can remain for web users.
