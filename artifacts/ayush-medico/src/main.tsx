import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Service Worker registration ────────────────────────────────────────────
// Registers sw.js for PWA caching, offline support, and installability.
if ("serviceWorker" in navigator) {
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

createRoot(document.getElementById("root")!).render(<App />);
