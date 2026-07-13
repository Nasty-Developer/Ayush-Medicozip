/**
 * PromoBanner — auto-sliding promotional banner strip.
 * Unique Ayush Medico design (not copied from any platform).
 * Pure CSS/Framer Motion — no external assets.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";

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
  textLight: string;
  accentDot: string;
};

const promos: Promo[] = [
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
    textLight: "rgba(219,234,254,0.85)",
    accentDot: "bg-blue-300",
  },
  {
    id: 2,
    tag: "Diabetes Care",
    title: "Complete diabetes management",
    subtitle: "Test strips, insulin, oral hypoglycaemics & more",
    cta: "Explore",
    href: "/categories",
    emoji: "🩺",
    from: "#10B981",
    to: "#047857",
    textLight: "rgba(209,250,229,0.85)",
    accentDot: "bg-emerald-300",
  },
  {
    id: 3,
    tag: "Baby Care",
    title: "Gentle care for your little ones",
    subtitle: "Baby nutrition, hygiene & healthcare essentials",
    cta: "Browse",
    href: "/categories",
    emoji: "👶",
    from: "#EC4899",
    to: "#BE185D",
    textLight: "rgba(252,231,243,0.85)",
    accentDot: "bg-pink-300",
  },
  {
    id: 4,
    tag: "Daily Wellness",
    title: "Vitamins & supplements",
    subtitle: "Boost immunity with genuine healthcare supplements",
    cta: "Discover",
    href: "/categories",
    emoji: "💊",
    from: "#8B5CF6",
    to: "#5B21B6",
    textLight: "rgba(237,233,254,0.85)",
    accentDot: "bg-violet-300",
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
    textLight: "rgba(255,237,213,0.85)",
    accentDot: "bg-orange-300",
  },
];

export default function PromoBanner() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = (next: number, dir: number) => {
    setDirection(dir);
    setCurrent((next + promos.length) % promos.length);
  };

  const resetInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => go(current + 1, 1), 4000);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrent(prev => {
        setDirection(1);
        return (prev + 1) % promos.length;
      });
    }, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const p = promos[current];

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden shadow-xl" style={{ minHeight: 160 }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={p.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -80 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center"
            style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute -right-8 -top-8 w-64 h-64 rounded-full opacity-10"
                style={{ background: "white" }}
              />
              <div
                className="absolute right-16 bottom-0 w-40 h-40 rounded-full opacity-10"
                style={{ background: "white" }}
              />
              {/* Dot pattern */}
              <div className="absolute left-0 inset-y-0 w-24 opacity-10"
                style={{
                  backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                  backgroundSize: "14px 14px",
                }}
              />
            </div>

            {/* Content */}
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between w-full px-6 sm:px-10 py-6 sm:py-8 gap-6">
              <div className="flex items-center gap-5">
                <div
                  className="text-5xl sm:text-6xl select-none"
                  role="img"
                  aria-label={p.tag}
                >
                  {p.emoji}
                </div>
                <div>
                  <div
                    className="text-xs font-bold uppercase tracking-widest mb-1.5 px-2.5 py-0.5 rounded-full inline-block"
                    style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
                  >
                    {p.tag}
                  </div>
                  <h3
                    className="text-xl sm:text-2xl font-bold text-white leading-tight mb-1"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    {p.title}
                  </h3>
                  <p className="text-sm" style={{ color: p.textLight }}>
                    {p.subtitle}
                  </p>
                </div>
              </div>

              <Link
                href={p.href}
                className="flex-shrink-0 px-6 py-2.5 bg-white font-semibold rounded-xl text-sm shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
                style={{ color: p.from }}
              >
                {p.cta} →
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        <button
          onClick={() => { go(current - 1, -1); resetInterval(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition-all duration-200"
          aria-label="Previous"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => { go(current + 1, 1); resetInterval(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition-all duration-200"
          aria-label="Next"
        >
          <ChevronRight size={16} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {promos.map((_, i) => (
            <button
              key={i}
              onClick={() => { go(i, i > current ? 1 : -1); resetInterval(); }}
              className={`rounded-full transition-all duration-300 ${
                i === current ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
