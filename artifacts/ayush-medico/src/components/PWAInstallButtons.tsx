/**
 * PWAInstallButtons — premium mobile-first CTA
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown only when the browser fires a deferred BeforeInstallPrompt.
 * Returns null when neither installable nor installed → no empty gap in Hero.
 *
 * Design:
 *   • Blue → teal → emerald gradient button  (Blinkit / Zepto / Material 3)
 *   • Inset top-edge highlight for depth
 *   • Material-style ripple on tap (scale 0→1, opacity 0.35→0)
 *   • "FREE ⚡ FAST" glassmorphism badge with attention pulse every ~5 s
 *   • Hover lifts + brightens; tap scales down slightly
 *   • All animations are safe: no CSS scale>1 inside fixed/transformed layers
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export default function PWAInstallButtons() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [installing, setInstalling]       = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [ripples, setRipples]             = useState<Ripple[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleInstall = useCallback(async () => {
    if (installing || justInstalled) return;
    setInstalling(true);
    const accepted = await install();
    setInstalling(false);
    if (accepted) setJustInstalled(true);
  }, [install, installing, justInstalled]);

  /** Spawn a Material-style ripple from the pointer contact point. */
  const spawnRipple = useCallback((clientX: number, clientY: number) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.4;
    const id   = Date.now() + Math.random();
    setRipples((p) => [...p, { id, x: clientX - rect.left, y: clientY - rect.top, size }]);
    setTimeout(() => setRipples((p) => p.filter((r) => r.id !== id)), 600);
  }, []);

  const onMouseDown  = useCallback((e: React.MouseEvent<HTMLButtonElement>)  => spawnRipple(e.clientX, e.clientY),             [spawnRipple]);
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLButtonElement>)  => { if (e.touches[0]) spawnRipple(e.touches[0].clientX, e.touches[0].clientY); }, [spawnRipple]);

  /* ── Already running as installed PWA ─────────────────────────────────── */
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

  /* ── Not installable — zero DOM ───────────────────────────────────────── */
  if (!isInstallable) return null;

  /* ── Install prompt is ready ──────────────────────────────────────────── */
  return (
    <AnimatePresence>
      <motion.div
        key="install-row"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mt-4"
      >
        {/*
         * The button is intentionally NOT a motion.button so that Framer
         * Motion JS animations never compete with the ripple CSS animation
         * on the same element. Hover / active states are pure CSS (fast,
         * GPU-composited on their own — no JS loop needed).
         */}
        <button
          ref={btnRef}
          type="button"
          onClick={handleInstall}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          disabled={installing || justInstalled}
          data-testid="btn-install-app"
          style={{
            WebkitTapHighlightColor: "transparent",
            /* Blue → teal → emerald — matches brand palette */
            background: "linear-gradient(135deg, #1b6ca8 0%, #0b8a7c 52%, #059c5a 100%)",
          }}
          className="
            group
            relative overflow-hidden
            inline-flex items-center justify-between gap-3
            pl-5 pr-2.5 py-[11px]
            rounded-[18px]
            font-semibold text-[13.5px] text-white select-none
            /* Resting shadow: blue glow + emerald glow + inset top highlight */
            shadow-[0_4px_20px_rgba(5,156,90,0.36),_0_2px_8px_rgba(27,108,168,0.22),_inset_0_1px_0_rgba(255,255,255,0.18)]
            /* Hover: lifts, brighter shadow */
            hover:-translate-y-[3px] hover:brightness-[1.08]
            hover:shadow-[0_8px_28px_rgba(5,156,90,0.48),_0_4px_14px_rgba(27,108,168,0.28),_inset_0_1px_0_rgba(255,255,255,0.22)]
            /* Tap: presses down */
            active:scale-[0.965] active:brightness-95 active:translate-y-0
            /* Smooth all transitions */
            transition-all duration-[260ms] ease-out
            disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100
          "
        >
          {/* ── Ripple container ────────────────────────────────────────── */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-[18px] overflow-hidden pointer-events-none"
          >
            {ripples.map((r) => (
              <span
                key={r.id}
                className="absolute rounded-full bg-white/30 pwa-btn-ripple"
                style={{
                  width:  r.size,
                  height: r.size,
                  left:   r.x - r.size / 2,
                  top:    r.y - r.size / 2,
                }}
              />
            ))}
          </span>

          {/* ── Left: download icon + label ─────────────────────────────── */}
          <span className="relative z-10 flex items-center gap-[7px] whitespace-nowrap">
            {justInstalled ? (
              <>
                <CheckCircle2 size={17} strokeWidth={2.3} />
                <span style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "0.01em" }}>
                  Installed!
                </span>
              </>
            ) : (
              <>
                {/* Emoji down-arrow as specified — renders consistently on Android */}
                <span
                  className={`text-[16px] leading-none transition-transform duration-200 ${installing ? "animate-bounce" : ""}`}
                  role="img"
                  aria-label="Download"
                >
                  ⬇️
                </span>
                <span style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "0.01em" }}>
                  {installing ? "Installing…" : "Install App"}
                </span>
              </>
            )}
          </span>

          {/* ── Right: FREE ⚡ FAST badge ───────────────────────────────── */}
          {!justInstalled && !installing && (
            <motion.span
              aria-label="Free and fast"
              className="
                relative z-10 flex-shrink-0
                inline-flex items-center justify-center
                gap-0.5 px-[9px] py-[4.5px]
                rounded-full
                border border-white/30
                text-[9px] font-extrabold uppercase tracking-[0.07em] text-white
                shadow-[0_1px_8px_rgba(0,0,0,0.20),_0_0_0_1px_rgba(255,255,255,0.06)]
              "
              style={{
                /*
                 * Gradient: green → emerald creates visual depth against the
                 * blue→teal button gradient — badge reads as a distinct chip.
                 * bg-white/18 base makes it look like frosted glass.
                 */
                background: "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.10) 100%)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                textShadow: "0 1px 3px rgba(0,0,0,0.25)",
              }}
              /*
               * Subtle attention pulse every ~5 s.
               * Opacity + mild scale (≤1.08) on a tiny non-fixed element:
               * safe — no GPU compositor layer conflict risk.
               */
              animate={{ opacity: [1, 0.62, 1], scale: [1, 1.08, 1] }}
              transition={{
                duration: 0.7,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 4.6,
              }}
            >
              FREE&nbsp;⚡&nbsp;FAST
            </motion.span>
          )}
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
