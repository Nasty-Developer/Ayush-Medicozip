# Android APK — Placement Instructions

To activate the "Download Android App (.apk)" button in the Hero section,
place your signed APK file here:

```
artifacts/ayush-medico/public/ayush-medico.apk
```

## What happens automatically

- The button in the Hero checks for `/ayush-medico.apk` via a HEAD request on page load.
- If the file **exists**: clicking "Download Android App" triggers an immediate download.
- If the file **does not exist**: clicking the button shows a "Coming Soon" tooltip with
  manual PWA install instructions instead.

No code changes are needed — just drop the APK file in place.

## Build the APK

You can build a signed APK from this PWA using any of these tools:
- [PWABuilder](https://www.pwabuilder.com/) — paste your site URL, click Build → Android
- [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) — CLI tool by Google
- Android Studio with a TWA (Trusted Web Activity) project

## Filename convention

The file must be named exactly `ayush-medico.apk` (lowercase, hyphenated).
The download will be saved as `AyushMedico.apk` on the user's device.
