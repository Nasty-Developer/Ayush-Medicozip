/**
 * PromoBanner — auto-sliding promotional carousel.
 *
 * Mobile-first redesign — fully responsive from 320 px to 1440 px.
 * Key decisions:
 *  • Fixed-height container (height-sizer div) so AnimatePresence absolute
 *    children never clip or overflow.
 *  • Always a single horizontal row — no flex-col stacking that breaks height.
 *  • Arrows hidden on mobile; swipe gestures handle navigation instead.
 *  • Emoji scaled down on small screens; CTA is always visible but compact.
 *  • Dot indicators live in their own reserved bottom strip so they never
 *    overlap the content row.
 */

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    from: "#3B82F6",
    to: "#1D4ED8",
    light: "rgba(219,234,254,0.9)",
  },
  {
    id: 2,
    tag: "Diabetes Care",
    title: "Complete diabetes management",
    subtitle: "Test strips, insulin, oral medicines & more",
    cta: "Explore",
    href: "/categories",
    emoji: "🩺",
    from: "#10B981",
    to: "#047857",
    light: "rgba(209,250,229,0.9)",
  },
  {
    id: 3,
    tag: "Baby Care",
    title: "Gentle care for little ones",
    subtitle: "Baby nutrition, hygiene & health essentials",
    cta: "Browse",
    href: "/categories",
    emoji: "👶",
    from: "#EC4899",
    to: "#BE185D",
    light: "rgba(252,231,243,0.9)",
  },
  {
    id: 4,
    tag: "Daily Wellness",
    title: "Vitamins & supplements",
    subtitle: "Boost immunity with genuine supplements",
    cta: "Discover",
    href: "/categories",
    emoji: "💊",
    from: "#8B5CF6",
    to: "#5B21B6",
    light: "rgba(237,233,254,0.9)",
  },
  {
    id: 5,
    tag: "First Aid",
    title: "Be prepared for emergencies",
    subtitle: "Bandages, antiseptics, ORS & first aid kits",
    cta: "Shop",
    href: "/categories",
    emoji: "🩹",
    from: "#F97316",
    to: "#C2410C",
    light: "rgba(255,237,213,0.9)",
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
      className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto"
      aria-label="Promotional banners"
    >
      {/*
        Height sizer: this div establishes the card's height so that
        the absolutely-positioned AnimatePresence children never clip.
        The content row sits inside the card height; dots get their own
        strip reserved at the bottom via padding-bottom on the content.
      */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-lg"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ contain: "layout paint" }}
      >
        {/* ── Height sizer (content + dots strip) ── */}
        {/*
          Mobile  (< 640 px): 116 px content + 24 px dots strip = 140 px
          sm      (≥ 640 px): 128 px content + 24 px dots strip = 152 px
          lg      (≥1024 px): 140 px content + 24 px dots strip = 164 px
        */}
        <div className="h-[140px] sm:h-[152px] lg:h-[164px]" aria-hidden="true" />

        {/* ── Slide layer ── */}
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={p.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)` }}
          >
            {/* ── Background decoration ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
              {/* Large circle top-right */}
              <div
                className="absolute -right-10 -top-10 w-48 h-48 sm:w-64 sm:h-64 rounded-full"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
              {/* Small circle bottom-right */}
              <div
                className="absolute right-12 -bottom-6 w-28 h-28 sm:w-40 sm:h-40 rounded-full"
                style={{ background: "rgba(255,255,255,0.07)" }}
              />
              {/* Dot-grid strip on the left */}
              <div
                className="absolute left-0 inset-y-0 w-20 sm:w-28"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
                  backgroundSize: "13px 13px",
                }}
              />
            </div>

            {/*
              ── Content row ──
              Always a single horizontal row on every breakpoint.
              pb-6 reserves space so the dots indicator never overlaps.
              Horizontal padding is wider on desktop (sm:px-10) where
              the nav arrows are also visible.
            */}
            <div className="absolute inset-0 flex items-center gap-3 sm:gap-5 px-4 sm:px-10 pb-6">

              {/* Emoji — visually anchors the slide */}
              <div
                className="text-[32px] sm:text-[44px] lg:text-[52px] leading-none select-none flex-shrink-0"
                role="img"
                aria-label={p.tag}
              >
                {p.emoji}
              </div>

              {/* Text block — flex-1 + min-w-0 prevent overflow */}
              <div className="flex-1 min-w-0">
                {/* Category tag pill — truncates on ≤320 px rather than wrapping */}
                <span
                  className="inline-block max-w-full truncate
                             text-[9px] sm:text-[10px] font-bold uppercase
                             tracking-wide sm:tracking-widest
                             px-2 py-0.5 rounded-full mb-1 sm:mb-1.5"
                  style={{ background: "rgba(255,255,255,0.22)", color: "white" }}
                >
                  {p.tag}
                </span>

                {/* Primary headline */}
                <h3
                  className="text-[13px] sm:text-[18px] lg:text-[20px] font-bold text-white
                             leading-snug line-clamp-2 sm:line-clamp-1"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {p.title}
                </h3>

                {/* Supporting subtitle */}
                <p
                  className="text-[10px] sm:text-[12px] lg:text-[13px] mt-0.5 line-clamp-1"
                  style={{ color: p.light }}
                >
                  {p.subtitle}
                </p>
              </div>

              {/*
                CTA button — always visible; compact on mobile, full size sm+.
                flex-shrink-0 prevents it collapsing; whitespace-nowrap keeps
                the text on one line regardless of viewport width.
              */}
              <Link
                href={p.href}
                className="flex-shrink-0 whitespace-nowrap
                           px-3 py-1.5 sm:px-5 sm:py-2.5
                           bg-white font-semibold rounded-xl
                           text-[11px] sm:text-[13px] lg:text-sm
                           shadow-md active:scale-95
                           hover:-translate-y-0.5 hover:shadow-lg
                           transition-all duration-200"
                style={{ color: p.from }}
              >
                {p.cta} →
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/*
          ── Nav arrows ──
          Hidden on mobile (touch swipe handles it there).
          Positioned at vertical midpoint of the content area (not the full card),
          so they sit at (140-24)/2 = 58 px from top, expressed as:
          top-[calc(50%-12px)] to shift up by half the dot strip height.
        */}
        {(["left", "right"] as const).map((side) => (
          <button
            key={side}
            onClick={() =>
              nav(
                current + (side === "right" ? 1 : -1),
                side === "right" ? 1 : -1
              )
            }
            className="hidden sm:flex absolute top-[calc(50%-12px)] -translate-y-1/2 z-10
                       w-8 h-8 rounded-full bg-white/20 hover:bg-white/40
                       text-white items-center justify-center
                       backdrop-blur-sm transition-all duration-200
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            style={side === "left" ? { left: 12 } : { right: 12 }}
            aria-label={side === "left" ? "Previous offer" : "Next offer"}
          >
            {side === "left" ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>
        ))}

        {/*
          ── Dot indicators ──
          Absolute, bottom-aligned, horizontally centred.
          The 24 px dots strip (reserved by pb-6 on the content row above)
          keeps them from ever overlapping text.
        */}
        <div
          className="absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center gap-1.5 z-10"
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
                  ? "w-5 h-[5px] bg-white"
                  : "w-[5px] h-[5px] bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
