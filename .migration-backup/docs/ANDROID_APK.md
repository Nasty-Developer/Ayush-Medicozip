# Building the Ayush Medico Android APK

This guide explains how to package the Ayush Medico PWA into a native Android APK
using **Capacitor** — a zero-runtime bridge that wraps web apps into native containers.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | https://nodejs.org |
| pnpm | ≥ 9 | `npm i -g pnpm` |
| Android Studio | Latest | https://developer.android.com/studio |
| Java JDK | 17 | Bundled with Android Studio |

---

## Step 1 — Install Capacitor

```bash
# From the repo root
pnpm add -D @capacitor/cli @capacitor/core @capacitor/android -w
# or per-workspace if you prefer:
pnpm --filter @workspace/ayush-medico add -D @capacitor/cli @capacitor/core @capacitor/android
```

---

## Step 2 — Build the web app

```bash
pnpm --filter @workspace/ayush-medico run build
# Output: artifacts/ayush-medico/dist/public/
```

---

## Step 3 — Initialise Capacitor (first time only)

The `capacitor.config.json` in the repo root is already configured. Run:

```bash
npx cap init
# App name:  Ayush Medico
# App ID:    com.ayushmedico.app
# Web dir:   artifacts/ayush-medico/dist/public
```

---

## Step 4 — Add the Android platform

```bash
npx cap add android
```

This creates an `android/` folder with a full Gradle project.

---

## Step 5 — Sync web assets

Run this after every `pnpm build`:

```bash
npx cap sync android
```

---

## Step 6 — Open in Android Studio

```bash
npx cap open android
```

Then in Android Studio:

1. **Build → Generate Signed Bundle / APK**
2. Choose **APK**
3. Create or select a keystore
4. Choose **release** build variant
5. Click **Finish** — APK saved to `android/app/release/`

---

## Step 7 — Optional: Capacitor plugins

Install native plugins as needed:

```bash
# Push notifications
pnpm add @capacitor/push-notifications

# Splash screen
pnpm add @capacitor/splash-screen

# Status bar
pnpm add @capacitor/status-bar
```

Then `npx cap sync android` after each install.

---

## Configuration reference

`capacitor.config.json` (repo root):

| Key | Value | Notes |
|-----|-------|-------|
| `appId` | `com.ayushmedico.app` | Reverse-domain ID (must be unique on Play Store) |
| `appName` | `Ayush Medico` | Shown on home screen |
| `webDir` | `artifacts/ayush-medico/dist/public` | Vite build output |
| `android.backgroundColor` | `#1e6ca4` | Matches brand & splash |
| `plugins.SplashScreen.launchShowDuration` | `2000` | 2 s native splash |

---

## Alternative: TWA (Trusted Web Activity)

If you deploy to a public domain, you can skip Capacitor and instead publish a
**Trusted Web Activity** directly on the Play Store — it renders the live site in a
chrome-less browser shell with full PWA capabilities.

See: https://developer.chrome.com/docs/android/trusted-web-activity
