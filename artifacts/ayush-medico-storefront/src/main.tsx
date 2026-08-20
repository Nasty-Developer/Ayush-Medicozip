import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * A previous dev session can leave the PWA service worker controlling the
 * preview origin. Its cached module graph can mix React runtime versions
 * after a workflow restart, which results in an invalid-hook-call crash
 * before the app can render. Clear that dev-only state before mounting.
 */
async function clearDevServiceWorkerState() {
  if (!import.meta.env.DEV || !("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }
}

// ── Service Worker registration ────────────────────────────────────────────
// Registers sw.js for PWA caching, offline support, and installability.
// Dev previews intentionally stay unregisterable so Vite never receives a
// stale module graph from the PWA cache.
if ("serviceWorker" in navigator && !import.meta.env.DEV) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[PWA] Service Worker registered:", registration.scope);

        // Trigger update check on every page load
        registration.update().catch(() => {});
      })
      .catch((error) => {
        console.error("[PWA] Service Worker registration failed:", error);
      });
  });
}

clearDevServiceWorkerState()
  .catch(() => {
    // A blocked cache API must not prevent the storefront from rendering.
  })
  .finally(() => {
    createRoot(document.getElementById("root")!).render(<App />);
  });
