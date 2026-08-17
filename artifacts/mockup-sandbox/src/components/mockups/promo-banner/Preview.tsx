/**
 * Responsive preview of PromoBanner across 320px → 430px widths.
 * Each frame is a constrained-width wrapper that emulates a real device viewport.
 */

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Minimal self-contained copy of PromoBanner ───────────────────────────────
// (No wouter Link — plain anchor instead, to work in isolated sandbox)

type Promo = {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  emoji: string;
  from: string;
  to: string;
  light: string;
};

const PROMOS: Promo[] = [
  { id: 1, tag: "Monsoon Essentials", title: "Stay healthy this monsoon",       subtitle: "Stock up on fever, cold & immunity medicines", cta: "Shop Now", emoji: "🌧️", from: "#3B82F6", to: "#1D4ED8", light: "rgba(219,234,254,0.9)" },
  { id: 2, tag: "Diabetes Care",      title: "Complete diabetes management",    subtitle: "Test strips, insulin, oral medicines & more",   cta: "Explore",  emoji: "🩺", from: "#10B981", to: "#047857", light: "rgba(209,250,229,0.9)" },
  { id: 3, tag: "Baby Care",          title: "Gentle care for little ones",     subtitle: "Baby nutrition, hygiene & health essentials",   cta: "Browse",   emoji: "👶", from: "#EC4899", to: "#BE185D", light: "rgba(252,231,243,0.9)" },
  { id: 4, tag: "Daily Wellness",     title: "Vitamins & supplements",          subtitle: "Boost immunity with genuine supplements",        cta: "Discover", emoji: "💊", from: "#8B5CF6", to: "#5B21B6", light: "rgba(237,233,254,0.9)" },
  { id: 5, tag: "First Aid",          title: "Be prepared for emergencies",     subtitle: "Bandages, antiseptics, ORS & first aid kits",   cta: "Shop",     emoji: "🩹", from: "#F97316", to: "#C2410C", light: "rgba(255,237,213,0.9)" },
];

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 56 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir * -56 }),
};

function BannerSlide({ p, isMobile }: { p: Promo; isMobile: boolean }) {
  return (
    <motion.div
      key={p.id}
      custom={1}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
      className="absolute inset-0"
      style={{ background: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)` }}
    >
      {/* Decorative circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="absolute right-12 -bottom-6 w-28 h-28 rounded-full"  style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="absolute left-0 inset-y-0 w-20" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />
      </div>

      {/* Content row */}
      <div className="absolute inset-0 flex items-center pb-6" style={{ gap: isMobile ? 12 : 20, padding: isMobile ? "0 16px 24px" : "0 40px 24px" }}>
        <div className="select-none leading-none flex-shrink-0" style={{ fontSize: isMobile ? 32 : 44 }}>{p.emoji}</div>

        <div className="flex-1 min-w-0">
          <span className="inline-block font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-1"
            style={{ background: "rgba(255,255,255,0.22)", color: "white", fontSize: isMobile ? 9 : 10 }}>
            {p.tag}
          </span>
          <div className="font-bold text-white leading-snug"
            style={{ fontSize: isMobile ? 13 : 18, fontFamily: "'Poppins', sans-serif", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: isMobile ? 2 : 1, WebkitBoxOrient: "vertical" }}>
            {p.title}
          </div>
          <div className="mt-0.5"
            style={{ color: p.light, fontSize: isMobile ? 10 : 12, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            {p.subtitle}
          </div>
        </div>

        <a href="#" className="flex-shrink-0 whitespace-nowrap bg-white font-semibold rounded-xl shadow-md"
          style={{ color: p.from, fontSize: isMobile ? 11 : 13, padding: isMobile ? "6px 12px" : "10px 20px" }}>
          {p.cta} →
        </a>
      </div>
    </motion.div>
  );
}

function PromoBannerAt({ widthPx, label }: { widthPx: number; label: string }) {
  const [current, setCurrent] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMobile = widthPx < 640;
  const h = isMobile ? 140 : 152;

  useEffect(() => {
    timer.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % PROMOS.length);
    }, 3000 + widthPx); // stagger so all don't flip at once
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [widthPx]);

  const p = PROMOS[current]!;

  return (
    <div style={{ width: widthPx }}>
      {/* Device label */}
      <div className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-mono">{widthPx}px</span>
        <span>{label}</span>
      </div>

      {/* Banner card */}
      <div style={{ width: widthPx, padding: "0 16px" }}>
        <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ height: h }}>
          <AnimatePresence mode="wait" custom={1} initial={false}>
            <BannerSlide key={p.id} p={p} isMobile={isMobile} />
          </AnimatePresence>

          {/* Dots */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 z-10" style={{ height: 24 }}>
            {PROMOS.map((pr, i) => (
              <button key={pr.id} onClick={() => setCurrent(i)}
                className="rounded-full transition-all duration-300"
                style={{ width: i === current ? 20 : 5, height: 5, background: i === current ? "white" : "rgba(255,255,255,0.45)" }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main preview ─────────────────────────────────────────────────────────────

const DEVICES = [
  { w: 320, label: "Narrow Android / iPhone SE" },
  { w: 360, label: "Android standard" },
  { w: 375, label: "iPhone SE / 12 mini" },
  { w: 390, label: "iPhone 14" },
  { w: 414, label: "iPhone Plus / Pro Max" },
  { w: 430, label: "iPhone 15 Pro Max" },
];

export function Preview() {
  return (
    <div className="min-h-screen bg-muted/40 p-8">
      <h1 className="text-xl font-bold text-foreground mb-1">PromoBanner — Mobile Viewport Check</h1>
      <p className="text-sm text-muted-foreground mb-8">Each frame simulates a real device width. Verify: no overflow, text readable, CTA tappable, dots visible.</p>

      <div className="flex flex-wrap gap-10">
        {DEVICES.map(d => (
          <PromoBannerAt key={d.w} widthPx={d.w} label={d.label} />
        ))}
      </div>

      <div className="mt-12 text-xs text-muted-foreground space-y-1">
        <p>✅ Always-horizontal layout — no flex-col stacking</p>
        <p>✅ Fixed height (140px mobile / 152px sm+) — no clipping</p>
        <p>✅ Dots in reserved 24px strip — no content overlap</p>
        <p>✅ Emoji 32px on mobile — appropriately sized</p>
        <p>✅ CTA flex-shrink-0 + whitespace-nowrap — never squeezed</p>
        <p>✅ Text min-w-0 + line-clamp — no overflow</p>
      </div>
    </div>
  );
}

export default Preview;
