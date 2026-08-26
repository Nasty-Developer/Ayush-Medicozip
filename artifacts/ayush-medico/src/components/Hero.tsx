/**
 * Hero — full-viewport premium healthcare banner.
 *
 * Visual target: Apollo Pharmacy / Tata 1mg quality.
 *   • Full-bleed pharmacy photo fills the right two-thirds.
 *   • Left panel uses a deep, rich gradient overlay that creates a strong,
 *     clearly readable text zone — not just a subtle fade.
 *   • Floating glassmorphism stat cards anchor depth on the right.
 *   • Bold, large-scale Poppins headline with a gradient accent word.
 *   • Two CTA buttons only — Call Now + Get Directions.
 *   • Trust micro-row: one concise line with the four key proofs.
 *   • Full responsive: stacks gracefully on mobile.
 */
import { motion } from "framer-motion";
import {
  Phone, MapPin, Star, Search, ArrowRight,
  ShieldCheck, Award, BadgeCheck, Zap,
} from "lucide-react";
import { Link } from "wouter";
import { useAnnouncement } from "@/context/AnnouncementContext";
import heroBgWebp from "@/assets/hero-bg.webp";
import heroBgJpg from "@/assets/hero-bg.jpg";

function fadeUp(delay = 0, duration = 0.55) {
  return {
    initial:    { opacity: 0, y: 20 },
    animate:    { opacity: 1, y: 0 },
    transition: { duration, delay, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  };
}

export default function Hero() {
  const { enabled: announcementEnabled } = useAnnouncement();
  const topPad = announcementEnabled ? "pt-28 lg:pt-36" : "pt-20 lg:pt-24";

  return (
    <section
      id="home"
      className={`relative min-h-[100svh] flex items-center ${topPad} pb-16 overflow-hidden`}
    >
      {/* ── Background photo — full bleed ───────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden">
        <picture>
          <source srcSet={heroBgWebp} type="image/webp" />
          <img
            src={heroBgJpg}
            alt=""
            role="presentation"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-[68%_38%] sm:object-[70%_35%] lg:object-[62%_38%]"
          />
        </picture>

        {/* ── Layered overlays — clean, premium, Apple-inspired ── */}

        {/* Primary text-zone gradient: crisp left-to-transparent, minimal spread */}
        <div className="absolute inset-0 bg-gradient-to-r
          from-slate-950/92
          via-slate-900/65
          lg:via-slate-900/40
          to-transparent" />

        {/* Subtle brand accent — very light, doesn't muddy the photo */}
        <div className="absolute inset-0 bg-gradient-to-br
          from-primary/10
          via-transparent
          to-transparent" />

        {/* Top vignette — grounds the header bar */}
        <div className="absolute inset-0 bg-gradient-to-b
          from-black/25
          via-transparent
          to-black/10" />
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:items-center" style={{ gridTemplateColumns: "52% 48%" }}>

          {/* ── LEFT: text content ───────────────────────────────────────── */}
          <LeftContent />

          {/* ── RIGHT: floating stat cards (desktop only) ───────────────── */}
          <div className="hidden lg:block">
            <RightVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Left Content
───────────────────────────────────────────────────────────────────────────── */
function LeftContent() {
  return (
    <div className="flex flex-col max-w-xl">

      {/* Pill badge */}
      <motion.div
        {...fadeUp(0)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                   bg-white/10 backdrop-blur-sm text-white text-sm font-semibold
                   border border-white/20 mb-6 w-fit shadow-sm"
      >
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Trusted Pharmacy · Kurla West
      </motion.div>

      {/* Headline */}
      <motion.h1
        {...fadeUp(0.1, 0.6)}
        className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] font-black
                   leading-[1.12] text-white mb-5"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        Your Trusted{" "}
        <span className="relative">
          <span className="bg-gradient-to-r from-primary via-teal-300 to-secondary
                           bg-clip-text text-transparent">
            Medical Store
          </span>
          {/* Underline accent */}
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="absolute -bottom-1 left-0 right-0 h-0.5 origin-left
                       bg-gradient-to-r from-primary to-secondary rounded-full"
          />
        </span>{" "}
        in Kurla West
      </motion.h1>

      {/* Subheading */}
      <motion.p
        {...fadeUp(0.18, 0.5)}
        className="text-base sm:text-lg text-white/80 leading-relaxed mb-7 max-w-md"
      >
        Genuine medicines, expert pharmacists, same-day delivery — serving
        50,000+ families across Kurla West for over a decade.
      </motion.p>

      {/* CTA buttons */}
      <motion.div {...fadeUp(0.26)} className="flex flex-wrap gap-3 mb-6">
        <a
          href="tel:+919833273838"
          data-testid="hero-call-btn"
          className="flex flex-1 sm:flex-none items-center justify-center gap-2.5
                     px-6 sm:px-7 py-3.5 bg-primary text-white font-bold rounded-xl
                     shadow-xl shadow-primary/40 hover:bg-primary/90
                     hover:shadow-primary/60 hover:-translate-y-0.5
                     transition-all duration-200 whitespace-nowrap text-sm sm:text-base"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Phone size={18} strokeWidth={2.5} />
          Call Now
        </a>
        <a
          href="https://maps.google.com/?q=Shop+No+67,+Halav+Pool+Rd,+Makad+Wala+Chawl,+Kurla+West,+Mumbai"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="hero-directions-btn"
          className="flex flex-1 sm:flex-none items-center justify-center gap-2.5
                     px-6 sm:px-7 py-3.5 bg-white/15 backdrop-blur-sm text-white
                     font-bold rounded-xl border border-white/30
                     hover:bg-white/25 hover:border-white/50 hover:-translate-y-0.5
                     transition-all duration-200 whitespace-nowrap text-sm sm:text-base"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <MapPin size={18} strokeWidth={2.5} />
          Get Directions
        </a>
      </motion.div>

      {/* Search bar */}
      <motion.div {...fadeUp(0.33)} className="mb-8">
        <Link
          href="/categories"
          data-testid="hero-search-catalog-link"
          className="flex items-center gap-3 w-full max-w-md px-5 py-4 rounded-2xl
                     bg-white/10 backdrop-blur-md border border-white/20
                     text-sm text-white/70 shadow-lg
                     hover:bg-white/20 hover:border-white/35 hover:text-white
                     transition-all duration-200 group"
        >
          <Search size={18} className="text-primary flex-shrink-0
                                       group-hover:scale-110 transition-transform" aria-hidden />
          <span className="flex-1">Search medicines, e.g. Paracetamol, Vitamin D3…</span>
          <span className="hidden sm:flex items-center gap-1 text-xs text-primary/90 font-medium">
            Search <ArrowRight size={12} />
          </span>
        </Link>
      </motion.div>

      {/* Trust micro-row */}
      <motion.div
        {...fadeUp(0.4)}
        className="flex flex-wrap items-center gap-x-5 gap-y-2.5
                   pt-6 border-t border-white/15"
      >
        {[
          { icon: ShieldCheck, label: "Licensed Pharmacy",  color: "text-primary" },
          { icon: Award,       label: "100% Genuine",       color: "text-emerald-400" },
          { icon: Zap,         label: "Same Day Delivery",  color: "text-amber-400" },
          { icon: BadgeCheck,  label: "10+ Years Trusted",  color: "text-secondary" },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon size={13} className={`${color} flex-shrink-0`} />
            <span className="text-xs text-white/70 font-medium">{label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Right Visual — floating stat cards (desktop only)
───────────────────────────────────────────────────────────────────────────── */
function RightVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.2 }}
      className="relative h-full min-h-[540px] pointer-events-none"
    >
      {/* Customer Rating — top right */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-12 right-4 bg-white/10 backdrop-blur-xl border border-white/20
                   rounded-2xl px-5 py-4 shadow-2xl pointer-events-auto"
      >
        <p className="text-[11px] text-white/60 font-medium mb-1">Customer Rating</p>
        <div className="flex items-center gap-1 mb-1">
          {[1,2,3,4,5].map(n => (
            <Star key={n} size={14} className="text-yellow-400 fill-yellow-400" />
          ))}
        </div>
        <p className="text-lg font-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
          4.9 / 5.0
        </p>
        <p className="text-[10px] text-white/50 mt-0.5">Based on 2,000+ reviews</p>
      </motion.div>

      {/* Medicines Available — mid left */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute top-1/2 -translate-y-1/2 left-0 bg-white/10 backdrop-blur-xl
                   border border-white/20 rounded-2xl px-5 py-4 shadow-2xl pointer-events-auto"
      >
        <p className="text-[11px] text-white/60 font-medium mb-1">Medicines Available</p>
        <p className="text-3xl font-black text-primary" style={{ fontFamily: "'Poppins', sans-serif" }}>
          5,000+
        </p>
        <p className="text-[10px] text-white/50 mt-0.5">Across all categories</p>
      </motion.div>

      {/* Same Day Delivery — bottom right */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="absolute bottom-16 right-6 w-40 bg-gradient-to-br from-primary/80 to-secondary/70
                   backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-4 shadow-2xl
                   shadow-primary/30 pointer-events-auto"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-xl
                        bg-white/20 backdrop-blur-sm mb-3 mx-auto">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="7" y="2" width="8" height="18" rx="2.5" fill="white" />
            <rect x="2" y="7" width="18" height="8" rx="2.5" fill="white" />
          </svg>
        </div>
        <p className="text-xs text-center font-bold text-white leading-tight"
           style={{ fontFamily: "'Poppins', sans-serif" }}>
          Same Day Delivery
        </p>
        <p className="text-[9px] text-center text-white/70 mt-0.5">Order before 6 PM</p>
      </motion.div>

      {/* 50K+ Customers — bottom left */}
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        className="absolute bottom-8 left-8 bg-white/10 backdrop-blur-xl border border-white/20
                   rounded-2xl px-4 py-3 shadow-xl pointer-events-auto"
      >
        <p className="text-[10px] text-white/60 font-medium mb-0.5">Happy Customers</p>
        <p className="text-2xl font-black text-secondary" style={{ fontFamily: "'Poppins', sans-serif" }}>
          50K+
        </p>
      </motion.div>
    </motion.div>
  );
}
