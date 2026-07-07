/**
 * LoadingScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * Branded splash shown on first paint.
 *
 * Behaviour:
 *  • If offline when the screen mounts → hides immediately so OfflinePage
 *    can take over (no stuck loading screen for users without internet).
 *  • If online → shows for ~1.8 s then fades out gracefully.
 *
 * Design matches the Header logo: gradient square + white medical cross.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // If the device is already offline on mount, hide immediately so
    // OfflinePage (z-[200]) can show through without being blocked.
    if (!navigator.onLine) {
      setVisible(false);
      return;
    }

    // If connectivity drops *while* the splash is still showing, dismiss it
    // immediately so the offline overlay is never hidden behind the splash.
    const handleOffline = () => setVisible(false);
    window.addEventListener("offline", handleOffline);

    // Normal flow: show for 1.8 s then fade away.
    const timer = setTimeout(() => setVisible(false), 1800);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #1e6ca4 0%, #0e8f8a 100%)",
            paddingTop:    "max(0px, env(safe-area-inset-top))",
            paddingBottom: "max(0px, env(safe-area-inset-bottom))",
          }}
          aria-label="Loading Ayush Medico"
          role="status"
        >
          {/* Decorative background blobs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* App icon — gradient tile with medical cross (matches Header logo) */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative flex items-center justify-center rounded-[22px] shadow-2xl"
              style={{
                width: 96,
                height: 96,
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1.5px solid rgba(255,255,255,0.28)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
              }}
              aria-hidden="true"
            >
              {/* Medical cross — SVG identical to the Header logo */}
              <svg width="48" height="48" viewBox="0 0 22 22" fill="none">
                <rect x="8" y="2" width="6" height="18" rx="2" fill="white" />
                <rect x="2" y="8" width="18" height="6" rx="2" fill="white" />
              </svg>
            </motion.div>

            {/* App name */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }}
              className="mt-5 text-white text-[22px] font-bold tracking-tight"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Ayush Medico
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              transition={{ delay: 0.4, duration: 0.35 }}
              className="mt-1 text-white text-[12.5px] tracking-wide"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Your Trusted Pharmacy
            </motion.p>

            {/* Animated loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-1.5 mt-10"
              aria-hidden="true"
            >
              {[0, 0.25, 0.5].map((delay, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.5)" }}
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay, ease: "easeInOut" }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
