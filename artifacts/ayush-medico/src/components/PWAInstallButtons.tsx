/**
 * PWAInstallButtons
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders two action buttons for the Hero section:
 *
 *   1. "Install App"  — appears when the browser has a deferred install prompt
 *      ready. Triggers the native PWA install dialog. Disappears after install.
 *
 *   2. "Download Android App (.apk)"  — always visible (except when already
 *      installed). Links directly to /ayush-medico.apk.
 *      • If the APK file exists → browser downloads it.
 *      • If not yet uploaded → shows a friendly "coming soon" tooltip.
 *
 * To activate the APK download, place the signed APK at:
 *   artifacts/ayush-medico/public/ayush-medico.apk
 * The button will start working immediately with no code changes needed.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Smartphone, X, CheckCircle2, Package } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

/** Check whether the APK file is actually present on the server. */
async function checkApkAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/ayush-medico.apk", { method: "HEAD" });
    // If the file is there, content-type should be application/... not text/html (404 page)
    const ct = res.headers.get("content-type") ?? "";
    return res.ok && !ct.startsWith("text/html");
  } catch {
    return false;
  }
}

export default function PWAInstallButtons() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [installing, setInstalling]   = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [apkAvailable, setApkAvailable]   = useState<boolean | null>(null); // null = checking
  const [showApkTooltip, setShowApkTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check APK availability once on mount
  useEffect(() => {
    checkApkAvailable().then(setApkAvailable);
  }, []);

  // Close APK tooltip when clicking outside
  useEffect(() => {
    if (!showApkTooltip) return;
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowApkTooltip(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showApkTooltip]);

  const handleInstall = useCallback(async () => {
    if (installing || justInstalled) return;
    setInstalling(true);
    const accepted = await install();
    setInstalling(false);
    if (accepted) setJustInstalled(true);
  }, [install, installing, justInstalled]);

  const handleApkDownload = () => {
    if (apkAvailable) {
      // Trigger direct download
      const a = document.createElement("a");
      a.href = "/ayush-medico.apk";
      a.download = "AyushMedico.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      setShowApkTooltip((v) => !v);
    }
  };

  // Already running as installed PWA — show installed badge
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

      {/* ── "Install App" — only visible when browser has a deferred prompt ── */}
      <AnimatePresence>
        {isInstallable && (
          <motion.button
            key="install-chip"
            type="button"
            onClick={handleInstall}
            disabled={installing || justInstalled}
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            transition={{ duration: 0.25 }}
            data-testid="btn-install-app"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 disabled:opacity-70"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {justInstalled ? (
              <>
                <CheckCircle2 size={15} strokeWidth={2.2} />
                Installed!
              </>
            ) : (
              <>
                <Download size={15} strokeWidth={2.2} className={installing ? "animate-bounce" : ""} />
                Install App
              </>
            )}
            {/* Live pulse dot */}
            {!installing && !justInstalled && (
              <span className="relative flex h-2 w-2 ml-0.5">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── "Download Android App (.apk)" — always visible ── */}
      <div className="relative" ref={tooltipRef}>
        <motion.button
          type="button"
          onClick={handleApkDownload}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          data-testid="btn-download-apk"
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm border-2 border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-colors duration-200"
          style={{ WebkitTapHighlightColor: "transparent" }}
          title="Download Android App (.apk)"
        >
          {/* Android robot icon */}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 18v-8a5 5 0 0 1 10 0v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" opacity=".85"/>
            <line x1="9.5" y1="3.5" x2="7" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="14.5" y1="3.5" x2="17" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="10" cy="11" r="1" fill="white"/>
            <circle cx="14" cy="11" r="1" fill="white"/>
            <rect x="3" y="10" width="2.5" height="5" rx="1.25" fill="currentColor" opacity=".7"/>
            <rect x="18.5" y="10" width="2.5" height="5" rx="1.25" fill="currentColor" opacity=".7"/>
            <rect x="8.5" y="18" width="2.5" height="3.5" rx="1.25" fill="currentColor" opacity=".7"/>
            <rect x="13" y="18" width="2.5" height="3.5" rx="1.25" fill="currentColor" opacity=".7"/>
          </svg>
          Download Android App
          <span className="text-[10px] font-normal opacity-60">.apk</span>
        </motion.button>

        {/* "Coming soon" tooltip — shown when APK is not yet uploaded */}
        <AnimatePresence>
          {showApkTooltip && (
            <motion.div
              key="apk-tooltip"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-0 mb-3 w-72 rounded-2xl bg-popover border border-border shadow-xl shadow-black/10 p-4 z-50"
            >
              <button
                type="button"
                onClick={() => setShowApkTooltip(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package size={14} className="text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Android App — Coming Soon</p>
              </div>

              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                The Android APK is being prepared. In the meantime, you can install this
                app directly from your browser:
              </p>

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

      {/* Manual install chip — visible when prompt not available but not installed */}
      {!isInstallable && (
        <AnimatePresence>
          <motion.button
            key="manual-install"
            type="button"
            onClick={() => {
              // Show install instructions via the APK tooltip for now
              setShowApkTooltip((v) => !v);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:border-primary/30 hover:text-primary transition-colors duration-200"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Smartphone size={12} />
            How to install
          </motion.button>
        </AnimatePresence>
      )}
    </div>
  );
}
