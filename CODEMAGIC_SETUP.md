# Connecting Codemagic to Apple Developer for Uncorked

This guide walks you through connecting Codemagic to your Apple Developer account
so the `ios-app-store` workflow can build, sign, and submit Uncorked to TestFlight
automatically on every push to `main`.

---

## Prerequisites

Before you begin, make sure you have:

- An active **Apple Developer Program** membership ($99/year)
  at [developer.apple.com](https://developer.apple.com)
- Admin access to your **Codemagic** account at [codemagic.io](https://codemagic.io)
- The **Uncorked** GitHub repo connected to Codemagic (Step 1 below)
- Your **Apple Team ID** — a 10-character string like `A1B2C3D4E5`.
  Find it at developer.apple.com → Account → Membership Details.

---

## Step 1 — Connect the GitHub Repository to Codemagic

1. Sign in to [codemagic.io](https://codemagic.io) and click **Add application**.
2. Choose **GitHub** as your source.
3. Search for `alejandrodizzle/uncorked-app` and click **Select**.
4. When asked for the build configuration, choose **Codemagic YAML** and click
   **Finish**. Codemagic reads `codemagic.yaml` from the repo root automatically.

---

## Step 2 — Create an App Store Connect API Key

This key lets Codemagic sign your app and upload builds to TestFlight without
requiring your Apple ID password.

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com).
2. In the top-right menu, click your name → **Users and Access**.
3. Select the **Integrations** tab, then **App Store Connect API**.
4. Click the **+** button to create a new key.
   - Name: `Codemagic Uncorked`
   - Access: **App Manager**
5. Click **Generate**. Apple shows the key **once** — download the `.p8` file now.
   You will also see:
   - **Key ID** (e.g. `ABC123DEF4`) — copy this
   - **Issuer ID** (UUID format) — copy this

---

## Step 3 — Add the API Key to Codemagic Teams

1. In Codemagic, go to **Teams** (top nav) → select your team → **Integrations**.
2. Under **App Store Connect**, click **Add API key**.
3. Fill in:
   - **Name**: `uncorked-asc`  ← must match `integrations.app_store_connect` in `codemagic.yaml`
   - **Key ID**: paste the Key ID from Step 2
   - **Issuer ID**: paste the Issuer ID from Step 2
   - **API key**: upload or paste the contents of the `.p8` file
4. Click **Save**.

---

## Step 4 — Register the App ID in App Store Connect

If you haven't done this yet:

1. Go to [developer.apple.com](https://developer.apple.com) → **Certificates,
   Identifiers & Profiles** → **Identifiers**.
2. Click **+**, choose **App IDs**, then **App**.
3. Set:
   - Description: `Uncorked`
   - Bundle ID: `com.uncorked.app` (Explicit)
4. Under Capabilities, enable **In-App Purchase** (for Stripe web payments, not
   required, but enable if you add native IAP later).
5. Click **Continue** → **Register**.

---

## Step 5 — Create the App in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps**.
2. Click **+** → **New App**.
3. Fill in:
   - Platform: **iOS**
   - Name: **Uncorked**
   - Primary Language: English (U.S.)
   - Bundle ID: `com.uncorked.app`
   - SKU: `uncorked-001` (any unique string)
4. Click **Create**.

---

## Step 6 — Set Environment Variables in Codemagic

1. In Codemagic, open the **uncorked-app** application.
2. Go to **Environment variables**.
3. Add the following variables. Mark any variable that contains a secret value as
   **Secure** (the padlock icon) — Codemagic will hide it from logs.

| Variable name | Value | Secure? |
|---|---|---|
| `APPLE_TEAM_ID` | Your 10-char Team ID (e.g. `A1B2C3D4E5`) | No |
| `MARKETING_VERSION` | `1.0.0` | No |
| `CM_SUBMITTER_EMAIL` | Your email address for build notifications | No |
| `APP_STORE_CONNECT_KEY_ID` | Key ID from Step 2 | Yes |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID from Step 2 | Yes |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Full contents of the `.p8` file | Yes |
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `STRIPE_SECRET_KEY` | Your Stripe secret key (`sk_live_...`) | Yes |
| `STRIPE_WEBHOOK_SECRET` | Your Stripe webhook signing secret | Yes |

> **Tip:** The `BUILD_NUMBER` variable is set automatically by Codemagic and
> increments on every build — you never need to touch it.

---

## Step 7 — Trigger Your First Build

1. Push any change to the `main` branch of `alejandrodizzle/uncorked-app`,
   **or** go to Codemagic → the app → click **Start new build** → choose
   the **Uncorked — iOS App Store** workflow.
2. Codemagic will:
   - Spin up a Mac M2 runner
   - Install Node + pnpm, build the React app
   - Run `cap sync ios` to copy the web bundle into the native project
   - Install CocoaPods
   - Sign the app using your API key (no manual certificate management needed)
   - Archive and export an `.ipa`
   - Upload to TestFlight automatically

---

## Step 8 — Accept the TestFlight Agreement (first time only)

Apple requires you to accept the **TestFlight Beta Testing Agreement** before
builds can appear in TestFlight:

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com).
2. A banner will appear at the top of the page prompting you to accept the
   agreement. Click it and follow the steps.
3. Your build will then be available under **TestFlight** → **iOS Builds**
   within ~15 minutes of the Codemagic build finishing.

---

## Step 9 — Add Internal Testers in TestFlight

1. In App Store Connect → **TestFlight** → **Internal Testing**, click **+**.
2. Add your own Apple ID (and any team members who have roles in your account).
3. They'll receive an email with a TestFlight link.

To add external testers (up to 10,000 people):
- Create an **External Testing** group under TestFlight.
- Apple requires a brief review of the first external build (~1–2 days).

---

## Step 10 — Submit for App Store Review

When you're ready to go live:

1. Open `codemagic.yaml` and change:
   ```yaml
   submit_to_app_store: false
   ```
   to:
   ```yaml
   submit_to_app_store: true
   ```
2. Fill in your App Store listing in App Store Connect:
   - Screenshots (6.7" iPhone 15 Pro Max required + 5.5" iPhone 8 Plus)
   - App description, keywords, support URL, privacy policy URL
   - Age rating questionnaire
3. Push to `main`. Codemagic builds and submits automatically.
4. Apple's review usually takes 1–3 business days.

---

## Bumping the App Version

| What to change | How |
|---|---|
| **Marketing version** (e.g. 1.0.0 → 1.1.0) | Update `MARKETING_VERSION` in Codemagic env vars |
| **Build number** | Automatic — Codemagic increments `$BUILD_NUMBER` every build |

---

## Workflow Reference

| Workflow | Trigger | Purpose |
|---|---|---|
| `ios-app-store` | Push to `main` | Signed `.ipa` → TestFlight |
| `ios-ad-hoc` | Manual | Ad Hoc `.ipa` for QA device testing |

---

## Troubleshooting

**"No profiles for bundle ID" signing error**
Make sure the App ID `com.uncorked.app` is registered in your Apple Developer
account (Step 4) and the API key has **App Manager** access (Step 2).

**"Provisioning profile doesn't include entitlements"**
Remove any capability in Xcode that isn't enabled in your App ID. Run
`cap sync ios` after any Capacitor config change.

**Build succeeds but app doesn't appear in TestFlight**
Accept the TestFlight Beta Testing Agreement in App Store Connect (Step 8).
Processing can take 5–20 minutes after upload.

**CocoaPods install fails**
The `pod install --repo-update` step fetches the latest specs. If it times out,
try pinning the CocoaPods version in `codemagic.yaml`:
```yaml
environment:
  cocoapods: 1.15.2
```

**`agvtool` not found**
`agvtool` requires the project to use `CURRENT_PROJECT_VERSION`. Ensure
`cap add ios` has been run at least once so the `.xcodeproj` exists.
If it's still missing, add this to the build script:
```bash
xcrun agvtool new-version -all "$BUILD_NUMBER"
```

---

*Last updated: 2026-03-20*
