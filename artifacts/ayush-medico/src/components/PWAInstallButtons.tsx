/**
 * PWAInstallButtons
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a single "Install App" button that appears only when the browser
 * has fired a deferred BeforeInstallPrompt event.
 *
 * • Returns null (no DOM, no spacing) when the app is neither installable
 *   nor already installed — so Hero layout is not affected.
 * • Shows an "App Installed" badge when running as an installed PWA.
 * • Uses opacity-only pulse animation (no CSS scale / transform) to avoid
 *   GPU compositor glitches on Android Chrome.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownToLine, CheckCircle2 } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export default function PWAInstallButtons() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [installing, setInstalling]       = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  const handleInstall = useCallback(async () => {
    if (installing || justInstalled) return;
    setInstalling(true);
    const accepted = await install();
    setInstalling(false);
    if (accepted) setJustInstalled(true);
  }, [install, installing, justInstalled]);

  // ── Already running as an installed PWA ──────────────────────────────────
  if (isInstalled) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full
                   bg-green-500/10 text-green-600 dark:text-green-400
                   text-sm font-medium border border-green-500/20"
      >
        <CheckCircle2 size={15} />
        App Installed
      </motion.div>
    );
  }

  // ── Not installable yet — render nothing so Hero has no empty gap ─────────
  if (!isInstallable) return null;

  // ── Install prompt available ──────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        key="install-row"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="mt-4"
      >
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing || justInstalled}
          data-testid="btn-install-app"
          style={{ WebkitTapHighlightColor: "transparent" }}
          className="relative flex items-center gap-2
                     px-6 py-3 rounded-xl font-semibold text-sm
                     bg-gradient-to-r from-primary to-secondary text-white
                     shadow-lg shadow-primary/30
                     hover:shadow-primary/45 hover:-translate-y-0.5
                     active:scale-[0.97]
                     transition-all duration-200
                     disabled:opacity-70 disabled:cursor-not-allowed"
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

          {/*
           * Pulse indicator — opacity-ONLY animation.
           * No CSS transform / scale, so no GPU compositor conflict
           * that would cause green scanlines on Android Chrome.
           */}
          {!installing && !justInstalled && (
            <motion.span
              className="inline-block w-2 h-2 rounded-full bg-white/90 ml-1 flex-shrink-0"
              animate={{ opacity: [1, 0.15, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
          )}
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
