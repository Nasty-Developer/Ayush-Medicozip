/**
 * PWAInstallButtons
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown only when the browser fires a deferred BeforeInstallPrompt event.
 * Returns null (no DOM, no spacing) when neither installable nor installed.
 *
 * Button spec — matches the WhatsApp CTA in Hero exactly:
 *   • w-full sm:w-auto   same width behaviour
 *   • px-6 py-3          same padding
 *   • rounded-xl         same border radius
 *   • gap-2 + mt-3       same internal/external spacing as gap-3 above
 *
 * Animations (all GPU-safe — no CSS scale>1 inside fixed/transformed layers):
 *   • Material contact ripple   scale 0→1 inside overflow-hidden button
 *   • Hover: lift 2 px + brightness +7 %  (CSS transition, no JS loop)
 *   • Tap:   scale 0.97 + brightness -5 %
 *   • Glow pulse every ~7 s     opacity-only white overlay on the button face
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

  const spawnRipple = useCallback((clientX: number, clientY: number) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.4;
    const id   = Date.now() + Math.random();
    setRipples((p) => [...p, { id, x: clientX - rect.left, y: clientY - rect.top, size }]);
    setTimeout(() => setRipples((p) => p.filter((r) => r.id !== id)), 600);
  }, []);

  const onMouseDown  = useCallback((e: React.MouseEvent<HTMLButtonElement>)  => spawnRipple(e.clientX, e.clientY),            [spawnRipple]);
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLButtonElement>)  => { if (e.touches[0]) spawnRipple(e.touches[0].clientX, e.touches[0].clientY); }, [spawnRipple]);

  /* ── Already running as installed PWA ─────────────────────────────────── */
  if (isInstalled) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full
                   bg-green-500/10 text-green-600 dark:text-green-400
                   text-sm font-medium border border-green-500/20"
      >
        <CheckCircle2 size={15} />
        App Installed
      </motion.div>
    );
  }

  /* ── Not installable — no DOM, no gap ─────────────────────────────────── */
  if (!isInstallable) return null;

  /* ── Install prompt ready ─────────────────────────────────────────────── */
  return (
    <AnimatePresence>
      <motion.div
        key="install-cta"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        /*
         * mt-3 = 12 px — same as the gap-3 separating Call Now / Get
         * Directions / WhatsApp, so Install App sits with consistent rhythm.
         */
        className="mt-3"
      >
        {/*
         * Plain <button> (not motion.button) so Framer Motion JS animations
         * inside never compete with the ripple CSS animation on the same
         * compositor layer. Hover + active states are pure CSS (one rAF per
         * transition, no JS overhead).
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
            /* Blue → teal → emerald — exact brand gradient */
            background: "linear-gradient(135deg, #1b6ca8 0%, #0b8a7c 52%, #059c5a 100%)",
          }}
          className="
            relative overflow-hidden
            w-full sm:w-auto
            flex items-center justify-center gap-2
            px-6 py-3
            rounded-xl
            text-white select-none
            shadow-[0_4px_18px_rgba(5,156,90,0.34),_0_2px_8px_rgba(27,108,168,0.20),_inset_0_1px_0_rgba(255,255,255,0.16)]
            hover:-translate-y-[2px] hover:brightness-[1.07]
            hover:shadow-[0_7px_24px_rgba(5,156,90,0.44),_0_3px_10px_rgba(27,108,168,0.26),_inset_0_1px_0_rgba(255,255,255,0.20)]
            active:scale-[0.97] active:brightness-95 active:translate-y-0
            transition-all duration-[260ms] ease-out
            disabled:opacity-60 disabled:cursor-not-allowed
            disabled:hover:translate-y-0 disabled:hover:brightness-100
          "
        >
          {/* ── Glow pulse ────────────────────────────────────────────────
               Opacity-only animation on a white overlay — no transform,
               no scale, no GPU compositor conflict.
               Fires once every ~7 s to draw attention without distracting.
          ──────────────────────────────────────────────────────────────── */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-xl pointer-events-none bg-white"
            animate={{ opacity: [0, 0.13, 0] }}
            transition={{
              duration: 1.1,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 6.2,
              delay: 3,           // wait for entrance animation to finish
            }}
          />

          {/* ── Material contact ripple ───────────────────────────────── */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
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

          {/* ── Label ─────────────────────────────────────────────────── */}
          <span className="relative z-10 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0 leading-snug">
            {justInstalled ? (
              <>
                <CheckCircle2 size={17} strokeWidth={2.3} />
                <span
                  className="font-bold text-[13.5px]"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  Installed!
                </span>
              </>
            ) : (
              <>
                {/* Phone emoji — renders natively on Android without icon font */}
                <span
                  className="text-[15px] leading-none"
                  role="img"
                  aria-label="mobile phone"
                >
                  📱
                </span>

                {/* "Install App" — primary weight, full brightness */}
                <span
                  className={`font-bold text-[13.5px] ${installing ? "opacity-80" : ""}`}
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {installing ? "Installing…" : "Install App"}
                </span>

                {/* "in 5 Seconds" — secondary weight, reduced opacity for hierarchy */}
                {!installing && (
                  <span
                    className="font-medium text-[11.5px] opacity-[0.78]"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    in 5 Seconds
                  </span>
                )}
              </>
            )}
          </span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
