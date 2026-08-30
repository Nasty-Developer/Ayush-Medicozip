---
name: Replit Vite preview HMR
description: Environment-specific behavior of Vite's HMR websocket behind the Replit preview proxy.
---

The Replit proxied preview can render the app normally while logging a Vite HMR websocket handshake failure because the browser-facing preview origin/port differs from the Vite dev server. Disabling HMR in the Vite server configuration caused a React plugin preamble error and a blank preview, so the stable choice is to keep the standard HMR configuration and treat this message as a preview-proxy limitation unless a proxy-compatible HMR setup is proven.

**Why:** A preview-only websocket workaround was tested and made the application blank rather than improving runtime reliability.

**How to apply:** If this app's preview shows the same HMR handshake warning, verify that the page renders and React has no runtime error before changing Vite HMR settings.