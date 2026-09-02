---
name: Firebase Render deployment
description: Production Firebase authentication depends on build-time frontend variables and hostname authorization outside the repository.
---

Firebase customer authentication cannot be fully validated from source alone: Vite embeds the `VITE_FIREBASE_*` values during the frontend build, Firebase Authentication separately checks the deployed hostname against Authorized Domains, and Firebase popup auth needs opener communication.

**Why:** A correct auth implementation can still fail on Render when variables are added after the build, the wrong Firebase project is injected, the Render hostname is not authorized, or the serving response sends strict `Cross-Origin-Opener-Policy: same-origin`, which can make Firebase report `auth/popup-closed-by-user` after successful consent.

**How to apply:** Before diagnosing production auth as a code regression, verify the Render build environment, rebuild after changes, confirm the exact production hostname in Firebase Authorized Domains, serve the storefront with `Cross-Origin-Opener-Policy: same-origin-allow-popups`, and test both email and Google sign-in in a fresh browser session.