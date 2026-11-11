/**
 * PromoBanner — auto-sliding promotional carousel.
 *
 * Presentation redesign only. The slide data, auto-play interval, swipe
 * handling, keyboard/ARIA labels, CTA destinations and manual navigation all
 * behave exactly as before.
 *
 * Visual language: premium healthcare commerce — a consistent blue → teal
 * palette, generous type, a glass product medallion and a white CTA, rather
 * than the earlier multi-colour blocks.
 */

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Link } from "wouter";

// ─── Data ────────────────────────────────────────────────────────────────────

type Promo = {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  emoji: string;
  from: string;
  to: string;
  /** Colour for the subtitle text */
  light: string;
};

const PROMOS: Promo[] = [
  {
    id: 1,
    tag: "Monsoon Essentials",
    title: "Stay healthy this monsoon",
    subtitle: "Stock up on fever, cold & immunity medicines",
    cta: "Shop Now",
    href: "/categories",
    emoji: "🌧️",
    from: "#0C4A8A",
    to: "#2E8BC0",
    light: "rgba(219,234,254,0.92)",
  },
  {
    id: 2,
    tag: "Diabetes Care",
    title: "Complete diabetes management",
    subtitle: "Test strips, insulin, oral medicines & more",
    cta: "Explore",
    href: "/categories",
    emoji: "🩺",
    from: "#0F766E",
    to: "#14B8A6",
    light: "rgba(204,251,241,0.92)",
  },
  {
    id: 3,
    tag: "Baby Care",
    title: "Gentle care for little ones",
    subtitle: "Baby nutrition, hygiene & health essentials",
    cta: "Browse",
    href: "/categories",
    emoji: "👶",
    from: "#1E6CA4",
    to: "#38BDF8",
    light: "rgba(224,242,254,0.92)",
  },
  {
    id: 4,
    tag: "Daily Wellness",
    title: "Vitamins & supplements",
    subtitle: "Genuine supplements from licensed distributors",
    cta: "Discover",
    href: "/categories",
    emoji: "💊",
    from: "#1E40AF",
    to: "#3B82F6",
    light: "rgba(219,234,254,0.92)",
  },
  {
    id: 5,
    tag: "First Aid",
    title: "Be prepared for emergencies",
    subtitle: "Bandages, antiseptics, ORS & first aid kits",
    cta: "Shop",
    href: "/categories",
    emoji: "🩹",
    from: "#0D9488",
    to: "#22D3EE",
    light: "rgba(207,250,254,0.92)",
  },
];

const AUTO_INTERVAL = 4000;

// ─── Slide variants ───────────────────────────────────────────────────────────

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 56 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -56 }),
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PromoBanner() {
  const [current, setCurrent]     = useState(0);
  const [direction, setDirection] = useState(1);
  const timer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchX  = useRef<number | null>(null);

  // ── Advance ──
  const go = (next: number, dir: number) => {
    setDirection(dir);
    setCurrent(((next % PROMOS.length) + PROMOS.length) % PROMOS.length);
  };

  // ── Auto-play ──
  const startTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCurrent(prev => {
        setDirection(1);
        return (prev + 1) % PROMOS.length;
      });
    }, AUTO_INTERVAL);
  };

  useEffect(() => {
    startTimer();
    return () => { if (timer.current) clearInterval(timer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nav = (next: number, dir: number) => {
    go(next, dir);
    startTimer();
  };

  // ── Touch swipe ──
  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    if (Math.abs(dx) > 40) nav(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const p = PROMOS[current]!;

  return (
    <section
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      aria-label="Promotional banners"
    >
      <div
        className="group/banner relative overflow-hidden rounded-[26px] shadow-[0_18px_45px_-24px_rgba(12,74,138,0.55)] ring-1 ring-black/5 sm:rounded-[30px]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ contain: "layout paint" }}
      >
        {/* Reserved height: content area + indicator strip */}
        <div className="h-[214px] sm:h-[252px] lg:h-[296px]" aria-hidden="true" />

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={p.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
            style={{ background: `linear-gradient(115deg, ${p.from} 0%, ${p.to} 100%)` }}
          >
            {/* Decorative depth — soft light, no grids or mesh patterns */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/8 blur-3xl" />
              <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-black/12 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex items-center gap-3 px-5 pb-8 sm:gap-8 sm:px-10 sm:pb-9 lg:px-14">
              <div className="min-w-0 flex-1">
                <span className="inline-flex max-w-full items-center truncate rounded-full bg-white/18 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-white ring-1 ring-white/25 backdrop-blur-sm sm:text-[10.5px]">
                  {p.tag}
                </span>

                <h3
                  className="mt-2 line-clamp-2 text-[21px] font-bold leading-[1.15] tracking-[-0.02em] text-white sm:mt-2.5 sm:text-[30px] lg:text-[36px]"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {p.title}
                </h3>

                <p
                  className="mt-1.5 line-clamp-2 text-[11.5px] font-medium leading-snug sm:mt-2 sm:text-sm lg:text-[15px]"
                  style={{ color: p.light }}
                >
                  {p.subtitle}
                </p>

                <Link
                  href={p.href}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-[12px] font-bold text-slate-900 shadow-[0_6px_18px_-6px_rgba(2,6,23,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] sm:mt-4 sm:px-5 sm:py-2.5 sm:text-[13.5px]"
                >
                  {p.cta}
                  <ArrowRight size={14} className="transition-transform duration-200 group-hover/banner:translate-x-0.5" />
                </Link>
              </div>

              {/* Product medallion — decorative anchor for the offer */}
              <div className="relative hidden flex-shrink-0 items-center justify-center sm:flex" aria-hidden>
                <div className="absolute h-36 w-36 rounded-full border border-white/25 lg:h-44 lg:w-44" />
                <div className="absolute h-28 w-28 rounded-full border border-white/15 lg:h-36 lg:w-36" />
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 text-4xl shadow-inner backdrop-blur-md ring-1 ring-white/30 lg:h-32 lg:w-32 lg:text-5xl">
                  <span role="img" aria-label={p.tag}>{p.emoji}</span>
                </div>
              </div>
            </div>

            {/* Mobile emoji watermark keeps the offer visually anchored */}
            <div
              className="pointer-events-none absolute -bottom-3 right-2 text-[86px] leading-none opacity-20 sm:hidden"
              aria-hidden
            >
              {p.emoji}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        {(["left", "right"] as const).map((side) => (
          <button
            key={side}
            onClick={() => nav(current + (side === "right" ? 1 : -1), side === "right" ? 1 : -1)}
            className={`absolute top-[calc(50%-14px)] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-800 shadow-md backdrop-blur transition-all duration-200 hover:bg-white hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-9 sm:w-9 lg:opacity-0 lg:group-hover/banner:opacity-100 ${
              side === "right" ? "right-2.5 sm:right-4" : "left-2.5 sm:left-4"
            }`}
            aria-label={side === "left" ? "Previous offer" : "Next offer"}
          >
            {side === "left" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        ))}

        {/* Slide indicators */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 flex h-7 items-center justify-center gap-1.5"
          role="tablist"
          aria-label="Slide indicators"
        >
          {PROMOS.map((promo, i) => (
            <button
              key={promo.id}
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}: ${promo.tag}`}
              onClick={() => nav(i, i > current ? 1 : -1)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "h-1.5 w-6 bg-white shadow-sm"
                  : "h-1.5 w-1.5 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
