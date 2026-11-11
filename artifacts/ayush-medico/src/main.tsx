import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Service Worker registration ────────────────────────────────────────────
// Only register the PWA worker in production. Caching Vite's development
// modules can mix dependency versions across restarts and break React hooks.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD) {
        const basePath = import.meta.env.BASE_URL.endsWith("/")
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`;
      navigator.serviceWorker
        .register(`${basePath}sw.js`, { scope: basePath })
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope);
          registration.update().catch(() => {});
        })
        .catch((error) => {
          console.error("[PWA] Service Worker registration failed:", error);
        });
      return;
    }

    // Remove workers/caches left by an earlier development session so the
    // current Vite dependency graph is always loaded from the network.
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .then(() => caches.keys())
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {});
  });
}

declare global {
  interface Window { __hideBootSplash?: () => void }
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
  // Hand over from the static splash to the real app on the next paint, so the
  // first React frame is already on screen (no white flash between the two).
  requestAnimationFrame(() => requestAnimationFrame(() => window.__hideBootSplash?.()));
}
