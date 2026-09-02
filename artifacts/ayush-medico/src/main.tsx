import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Service Worker registration ────────────────────────────────────────────
// Only register the PWA worker in production. Caching Vite's development
// modules can mix dependency versions across restarts and break React hooks.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker
        .register("/sw.js")
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

createRoot(document.getElementById("root")!).render(<App />);
