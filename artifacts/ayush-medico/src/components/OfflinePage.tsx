/**
 * OfflinePage
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen offline overlay rendered by App.tsx whenever useOnlineStatus()
 * returns false.  It:
 *   1. Immediately shows a branded "No Internet Connection" screen.
 *   2. Listens for the browser `online` event and auto-reloads the page.
 *   3. Provides a manual "Retry" button that reloads if already online.
 *
 * The component is overlaid (position: fixed) so the rest of the React tree
 * stays mounted — state is preserved and the app snaps back instantly once
 * connectivity is restored (no full re-render from scratch).
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [isRetrying, setIsRetrying] = useState(false);

  // Auto-reload when the browser regains connectivity
  useEffect(() => {
    const handleOnline = () => {
      setStatusMsg("Connection restored! Resuming…");
      // Brief delay so the user sees the feedback
      setTimeout(() => window.location.reload(), 600);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      setIsRetrying(true);
      setStatusMsg("Reconnecting…");
      window.location.reload();
    } else {
      setStatusMsg("Still offline. Please check your connection.");
      setTimeout(() => setStatusMsg(""), 3000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="offline-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #1e6ca4 0%, #0e8f8a 100%)",
          paddingTop:    "max(24px, env(safe-area-inset-top))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
          paddingLeft:   "max(24px, env(safe-area-inset-left))",
          paddingRight:  "max(24px, env(safe-area-inset-right))",
        }}
        role="alertdialog"
        aria-label="No internet connection"
      >
        {/* Decorative blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center text-center max-w-[340px] w-full text-white"
        >
          {/* App logo ── medical cross in a frosted tile */}
          <div
            className="w-[84px] h-[84px] rounded-[22px] flex items-center justify-center mb-5"
            style={{
              background: "rgba(255,255,255,0.16)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1.5px solid rgba(255,255,255,0.26)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
            aria-hidden="true"
          >
            {/* CSS medical cross */}
            <div className="relative w-10 h-10">
              <div
                className="absolute rounded-[4px] bg-white"
                style={{ width: 13, height: 40, top: 0, left: "50%", transform: "translateX(-50%)" }}
              />
              <div
                className="absolute rounded-[4px] bg-white"
                style={{ width: 40, height: 13, top: "50%", left: 0, transform: "translateY(-50%)" }}
              />
            </div>
          </div>

          <p className="text-[19px] font-bold tracking-tight mb-8 opacity-95"
             style={{ fontFamily: "'Poppins', sans-serif" }}>
            Ayush Medico
          </p>

          {/* WiFi-off indicator */}
          <motion.div
            animate={{ scale: [1, 1.07, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="w-[68px] h-[68px] rounded-full flex items-center justify-center mb-5"
            style={{ background: "rgba(255,255,255,0.14)" }}
            aria-hidden="true"
          >
            <WifiOff size={30} strokeWidth={1.8} />
          </motion.div>

          <h1
            className="text-[19px] font-bold mb-3 opacity-95"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            No Internet Connection
          </h1>
          <p className="text-[13.5px] leading-relaxed opacity-75 mb-10">
            Please turn on your internet connection to continue using this app.
          </p>

          {/* Retry button */}
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-8 py-[13px] rounded-[14px] font-semibold text-[15px] transition-all duration-150 active:scale-95 disabled:opacity-70"
            style={{
              background: "white",
              color: "#1e6ca4",
              fontFamily: "'Poppins', sans-serif",
              boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <RefreshCw
              size={16}
              strokeWidth={2.2}
              className={isRetrying ? "animate-spin" : ""}
            />
            Retry
          </button>

          {/* Status feedback */}
          <AnimatePresence>
            {statusMsg && (
              <motion.p
                key={statusMsg}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 text-[12px] opacity-70"
                aria-live="polite"
              >
                {statusMsg}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Loading dots */}
          <div className="flex gap-1.5 mt-14" aria-hidden="true">
            {[0, 0.25, 0.5].map((delay, i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.45)" }}
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.5, repeat: Infinity, delay, ease: "easeInOut" }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
