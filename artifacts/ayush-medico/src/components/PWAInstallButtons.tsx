/**
 * PWAInstallButtons
 * ─────────────────────────────────────────────────────────────────────────────
 * Two hero-section buttons that match the Call / Directions / WhatsApp row:
 *   • Same height    — py-3 + font-semibold line-height ≈ 48 px
 *   • Same radius    — rounded-xl
 *   • Same spacing   — gap-3 inside flex-wrap
 *
 * Button 1: "Install App"
 *   Appears only when the browser fires a deferred BeforeInstallPrompt.
 *   Styled like "Call Now" — gradient filled.
 *
 * Button 2: "Get Android App"
 *   Always visible (except when already installed as PWA).
 *   Styled like "WhatsApp" — outlined card.
 *   • APK exists  → direct .apk download
 *   • APK absent  → shows a tooltip with manual browser-install steps
 *
 * To activate the APK download, place the signed file at:
 *   artifacts/ayush-medico/public/ayush-medico.apk
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownToLine, Smartphone, X, CheckCircle2, Package } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

async function checkApkAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/ayush-medico.apk", { method: "HEAD" });
    const ct = res.headers.get("content-type") ?? "";
    return res.ok && !ct.startsWith("text/html");
  } catch {
    return false;
  }
}

export default function PWAInstallButtons() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [installing, setInstalling]       = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [apkAvailable, setApkAvailable]   = useState<boolean | null>(null);
  const [showTooltip, setShowTooltip]     = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => { checkApkAvailable().then(setApkAvailable); }, []);

  useEffect(() => {
    if (!showTooltip) return;
    const close = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node))
        setShowTooltip(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showTooltip]);

  const handleInstall = useCallback(async () => {
    if (installing || justInstalled) return;
    setInstalling(true);
    const accepted = await install();
    setInstalling(false);
    if (accepted) setJustInstalled(true);
  }, [install, installing, justInstalled]);

  const handleApk = () => {
    if (apkAvailable) {
      const a = document.createElement("a");
      a.href     = "/ayush-medico.apk";
      a.download = "AyushMedico.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      setShowTooltip((v) => !v);
    }
  };

  // Running as installed PWA — show installed badge
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

      {/* ── Install App — gradient filled, matches "Call Now" style ── */}
      <AnimatePresence>
        {isInstallable && (
          <motion.button
            key="install-btn"
            type="button"
            onClick={handleInstall}
            disabled={installing || justInstalled}
            initial={{ opacity: 0, scale: 0.85, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -8 }}
            transition={{ duration: 0.22 }}
            data-testid="btn-install-app"
            style={{ WebkitTapHighlightColor: "transparent" }}
            className="
              relative flex items-center gap-2
              px-6 py-3 rounded-xl font-semibold text-sm
              bg-gradient-to-r from-primary to-secondary text-white
              shadow-lg shadow-primary/30
              hover:shadow-primary/45 hover:-translate-y-0.5
              active:scale-95
              transition-all duration-200
              disabled:opacity-70 disabled:cursor-not-allowed
            "
          >
            {justInstalled ? (
              <>
                <CheckCircle2 size={17} strokeWidth={2.2} />
                Installed!
              </>
            ) : (
              <>
                <ArrowDownToLine
                  size={17}
                  strokeWidth={2.2}
                  className={installing ? "animate-bounce" : ""}
                />
                Install App
              </>
            )}

            {/* Live pulse indicator */}
            {!installing && !justInstalled && (
              <span className="relative flex h-2 w-2 ml-0.5" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Get Android App — outlined card, matches "WhatsApp" style ── */}
      <div className="relative" ref={tooltipRef}>
        <motion.button
          type="button"
          onClick={handleApk}
          data-testid="btn-download-apk"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          style={{ WebkitTapHighlightColor: "transparent" }}
          title={apkAvailable ? "Download Android App (.apk)" : "Android App — coming soon"}
          className="
            flex items-center gap-2
            px-6 py-3 rounded-xl font-semibold text-sm
            bg-card text-foreground
            border border-border
            hover:border-primary/30 hover:bg-primary/5
            transition-all duration-200
          "
        >
          {/* Android robot icon */}
          <svg
            width="17" height="17"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="opacity-80"
          >
            {/* Head */}
            <ellipse cx="12" cy="8.5" rx="5" ry="4.5" opacity=".9" />
            {/* Eyes */}
            <circle cx="10" cy="8" r="1" fill="white" />
            <circle cx="14" cy="8" r="1" fill="white" />
            {/* Antennae */}
            <line x1="9"  y1="4.5" x2="7"  y2="2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="15" y1="4.5" x2="17" y2="2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            {/* Body */}
            <rect x="7" y="12" width="10" height="8" rx="1.5" opacity=".85" />
            {/* Side arms */}
            <rect x="3.5" y="12" width="2.5" height="6" rx="1.25" opacity=".7" />
            <rect x="18"  y="12" width="2.5" height="6" rx="1.25" opacity=".7" />
            {/* Legs */}
            <rect x="8.5" y="19.5" width="2.5" height="3" rx="1.25" opacity=".7" />
            <rect x="13"  y="19.5" width="2.5" height="3" rx="1.25" opacity=".7" />
          </svg>

          Android App
          <span className="text-[10px] font-normal opacity-50 -ml-1">.apk</span>
        </motion.button>

        {/* Coming-soon tooltip — shown when APK not yet uploaded */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              key="apk-tooltip"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="
                absolute bottom-full left-0 mb-3 w-72 z-50
                rounded-2xl bg-popover border border-border
                shadow-xl shadow-black/10 p-4
              "
            >
              <button
                type="button"
                onClick={() => setShowTooltip(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>

              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package size={15} className="text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  Android App — Coming Soon
                </p>
              </div>

              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                The APK is being prepared. Until then, install this app directly
                from your browser in seconds:
              </p>

              <ol className="space-y-2 text-xs text-muted-foreground list-none">
                {[
                  <>Open in <strong className="text-foreground">Chrome</strong> on Android</>,
                  <>Tap the <strong className="text-foreground">⋮ menu</strong> (top right)</>,
                  <>Tap <strong className="text-foreground">"Add to Home screen"</strong></>,
                ].map((step, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-px">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              {/* Arrow */}
              <div className="absolute -bottom-2 left-7 w-4 h-4 rotate-45 bg-popover border-r border-b border-border" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* How-to-install chip — tiny, visible only when prompt unavailable */}
      {!isInstallable && (
        <motion.button
          type="button"
          onClick={() => setShowTooltip((v) => !v)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ WebkitTapHighlightColor: "transparent" }}
          className="
            flex items-center gap-1.5
            px-3 py-1.5 rounded-lg
            text-xs font-medium text-muted-foreground
            border border-border
            hover:border-primary/30 hover:text-primary
            transition-colors duration-200
          "
        >
          <Smartphone size={12} />
          How to install
        </motion.button>
      )}
    </div>
  );
}
