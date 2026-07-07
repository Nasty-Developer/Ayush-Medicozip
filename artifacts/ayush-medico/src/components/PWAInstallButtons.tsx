/**
 * PWAInstallButtons
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders two CTA elements for the Hero section:
 *
 *   1. "Download Android App"  — always visible. Triggers the install prompt if
 *      the browser supports it, or shows a tooltip with manual instructions.
 *
 *   2. "Install App" chip      — only visible when the browser has a deferred
 *      prompt ready (isInstallable = true). Disappears after install.
 *
 * Both share the same underlying usePWAInstall() hook so they stay in sync.
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Smartphone, X, CheckCircle2 } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export default function PWAInstallButtons() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showTooltip, setShowTooltip] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showTooltip) return;
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showTooltip]);

  const handleDownloadClick = async () => {
    if (isInstalled) return; // Already installed — button shouldn't be clickable

    if (isInstallable) {
      // Browser supports the install prompt — use it directly
      const accepted = await install();
      if (accepted) {
        setJustInstalled(true);
      }
    } else {
      // Fallback: show manual instructions tooltip
      setShowTooltip((v) => !v);
    }
  };

  // Don't render if already installed (running as standalone PWA)
  if (isInstalled) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium border border-green-500/20"
      >
        <CheckCircle2 size={15} />
        App Installed
      </motion.div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">

      {/* ── Primary: Download Android App (always visible) ── */}
      <div className="relative" ref={tooltipRef}>
        <motion.button
          type="button"
          onClick={handleDownloadClick}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          data-testid="btn-download-android-app"
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm border-2 border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-colors duration-200"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {/* Android robot icon (SVG, no external dep) */}
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="currentColor"
            aria-hidden="true"
          >
            {/* Android head */}
            <path d="M7 18v-8a5 5 0 0 1 10 0v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" opacity=".85"/>
            {/* Antenna */}
            <line x1="9.5" y1="3.5" x2="7" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="14.5" y1="3.5" x2="17" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Eyes */}
            <circle cx="10" cy="11" r="1" fill="white"/>
            <circle cx="14" cy="11" r="1" fill="white"/>
            {/* Arms */}
            <rect x="3" y="10" width="2.5" height="5" rx="1.25" fill="currentColor" opacity=".7"/>
            <rect x="18.5" y="10" width="2.5" height="5" rx="1.25" fill="currentColor" opacity=".7"/>
            {/* Legs */}
            <rect x="8.5" y="18" width="2.5" height="3.5" rx="1.25" fill="currentColor" opacity=".7"/>
            <rect x="13" y="18" width="2.5" height="3.5" rx="1.25" fill="currentColor" opacity=".7"/>
          </svg>

          {justInstalled ? "Installing…" : "Download Android App"}

          {isInstallable && (
            <span className="ml-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          )}
        </motion.button>

        {/* Manual install tooltip — shows when browser doesn't support the prompt */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              key="install-tooltip"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-0 mb-3 w-72 rounded-2xl bg-popover border border-border shadow-xl shadow-black/10 p-4 z-50"
            >
              <button
                type="button"
                onClick={() => setShowTooltip(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone size={14} className="text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Install Ayush Medico App</p>
              </div>

              <ol className="space-y-2 text-xs text-muted-foreground list-none">
                <li className="flex gap-2">
                  <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  Open this page in <strong className="text-foreground">Chrome</strong> on Android
                </li>
                <li className="flex gap-2">
                  <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  Tap the <strong className="text-foreground">⋮ menu</strong> (top right)
                </li>
                <li className="flex gap-2">
                  <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  Tap <strong className="text-foreground">"Add to Home screen"</strong>
                </li>
              </ol>

              {/* Tooltip arrow */}
              <div className="absolute -bottom-2 left-6 w-4 h-4 rotate-45 bg-popover border-r border-b border-border" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Secondary: Install App chip (only when the prompt is ready) ── */}
      <AnimatePresence>
        {isInstallable && (
          <motion.button
            key="install-chip"
            type="button"
            onClick={install}
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            transition={{ duration: 0.25 }}
            data-testid="btn-install-app"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Download size={15} strokeWidth={2.2} />
            Install App
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
