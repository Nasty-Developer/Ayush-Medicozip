import { motion } from "framer-motion";
import { Phone, MapPin, MessageCircle, Star, Search, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import PWAInstallButtons from "@/components/PWAInstallButtons";
import { useAnnouncement } from "@/context/AnnouncementContext";
import heroBgWebp from "@/assets/hero-bg.webp";
import heroBgJpg from "@/assets/hero-bg.jpg";

/* Slide-up helper — starts VISIBLE so hero is never blank before animation. */
function fadeUp(delay = 0, duration = 0.5) {
  return {
    initial:    { y: 16 },
    animate:    { y: 0 },
    transition: { duration, delay, ease: "easeOut" },
  };
}

export default function Hero() {
  const { enabled: announcementEnabled } = useAnnouncement();
  const topPad = announcementEnabled ? "pt-24 lg:pt-36" : "pt-20";

  return (
    <section
      id="home"
      className={`relative min-h-[100svh] flex items-center ${topPad} pb-12 overflow-hidden`}
    >
      {/* ── Background photo ─────────────────────────────────────────────────
          A single natural photograph (no manual blur/feather compositing) —
          shallow depth-of-field already built into the shot, with the
          pharmacist sharp on the right and a naturally soft, quiet hallway
          on the left where the text sits. True full-bleed cover background:
          fills the entire hero at every breakpoint, no crop seams. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <picture>
          <source srcSet={heroBgWebp} type="image/webp" />
          <img
            src={heroBgJpg}
            alt=""
            role="presentation"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-[68%_38%] sm:object-[70%_35%] lg:object-[center_38%]"
          />
        </picture>

        {/* Left → right gradient: solid for text legibility on the left,
            smoothly dissolving to fully transparent so the pharmacy scene
            reads as one continuous, natural background. */}
        <div className="absolute inset-0 bg-gradient-to-r
          from-background
          from-10%
          via-background/90
          via-30%
          sm:via-background/75
          lg:via-background/55
          to-transparent
          to-85%" />

        {/* Soft top/bottom blend so the photo never feels like a hard-edged box */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/30" />

        {/* Subtle brand tint — very light so it doesn't muddy the photo */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-secondary/4 mix-blend-multiply opacity-20" />
      </div>

      {/* Ambient glow — top-right only to frame the photo */}
      <div className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full bg-gradient-to-bl from-primary/8 to-transparent blur-3xl pointer-events-none" />

      {/* ── Main content grid ─────────────────────────────────────────────── */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div
          className="grid lg:gap-0 items-center"
          style={{ gridTemplateColumns: "1fr" }}
        >
          {/* On desktop we use a CSS custom property for the 45/55 split.
              On mobile it's a single-column stack. */}
          <div
            className="hidden lg:grid lg:items-center lg:gap-0"
            style={{ gridTemplateColumns: "45% 55%" }}
          >
            {/* ── Left column — 45% ─────────────────────────────── */}
            <LeftContent />

            {/* ── Right column — 55% (photo shows through) ──────── */}
            <RightVisual />
          </div>

          {/* Mobile: single column */}
          <div className="lg:hidden">
            <LeftContent />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Left column ─────────────────────────────────────────────────────────── */
function LeftContent() {
  return (
    <div className="flex flex-col">
      {/* Pill badge */}
      <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-5 w-fit">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Trusted Pharmacy · Kurla West
      </motion.div>

      {/* Headline — wide enough to wrap at 2 lines on desktop */}
      <motion.h1
        {...fadeUp(0.08, 0.55)}
        className="text-4xl sm:text-5xl lg:text-[3.4rem] xl:text-[3.8rem] font-bold leading-[1.15] text-foreground mb-4"
        style={{ fontFamily: "'Poppins', sans-serif", maxWidth: "none" }}
      >
        Your Trusted{" "}
        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Medical Store
        </span>{" "}
        in Kurla West
      </motion.h1>

      {/* Sub-heading — tighter gap to heading */}
      <motion.p {...fadeUp(0.14, 0.5)} className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-5 max-w-lg">
        Fast medicine availability, genuine medicines, healthcare essentials — trusted by 50,000+ families in Kurla West.
      </motion.p>

      {/* CTA buttons — close to heading */}
      <motion.div {...fadeUp(0.2)} className="flex flex-wrap gap-3 mb-5">
        <a
          href="tel:+919833273838"
          data-testid="hero-call-btn"
          className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 sm:px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Phone size={18} />
          Call Now
        </a>
        <a
          href="https://maps.google.com/?q=Shop+No+67,+Halav+Pool+Rd,+Makad+Wala+Chawl,+Kurla+West,+Mumbai"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="hero-directions-btn"
          className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 sm:px-6 py-3 bg-secondary text-white font-semibold rounded-xl shadow-lg shadow-secondary/30 hover:bg-secondary/90 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <MapPin size={18} />
          Get Directions
        </a>
        <a
          href="https://wa.me/919833273838"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="hero-whatsapp-btn"
          className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 bg-card/80 backdrop-blur-sm text-foreground font-semibold rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 hover:-translate-y-0.5 transition-all duration-200"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <MessageCircle size={18} className="text-[#25D366]" />
          WhatsApp
        </a>
      </motion.div>

      <PWAInstallButtons />

      {/* Search bar — close to buttons */}
      <motion.div {...fadeUp(0.26)} className="mt-4 space-y-3">
        <Link
          href="/categories"
          data-testid="hero-search-catalog-link"
          className="flex items-center gap-3 w-full max-w-lg px-5 py-4 rounded-2xl border-2 border-border bg-card/90 backdrop-blur-sm text-sm text-muted-foreground shadow-md hover:border-primary/50 hover:text-foreground hover:shadow-primary/10 transition-all duration-200 group"
        >
          <Search size={20} className="text-primary flex-shrink-0 group-hover:scale-110 transition-transform" aria-hidden />
          <span className="flex-1">Search medicines, e.g. Paracetamol, Vitamin D3…</span>
          <span className="hidden sm:flex items-center gap-1 text-xs text-primary font-medium">
            Search <ArrowRight size={12} />
          </span>
        </Link>

        <Link
          href="/categories"
          data-testid="hero-explore-btn"
          className="flex w-full max-w-lg items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all duration-200 text-sm"
        >
          Explore All Medicines
          <ArrowRight size={16} />
        </Link>
      </motion.div>

      {/* Trust micro-row — replaces heavy stats row */}
      <motion.div {...fadeUp(0.34)} className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-7 pt-6 border-t border-border/60">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Licensed Pharmacy</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[1,2,3,4,5].map(n => <Star key={n} size={12} className="text-yellow-400 fill-yellow-400" />)}
          <span className="text-xs text-muted-foreground font-medium ml-1">4.9 / 5.0</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-primary">5,000+</span>
          <span className="text-xs text-muted-foreground">Medicines</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-secondary">50K+</span>
          <span className="text-xs text-muted-foreground">Customers</span>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Right visual column — two floating badges only ─────────────────────── */
function RightVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.1 }}
      className="relative h-full min-h-[520px] pointer-events-none"
    >
      {/* ── Customer Rating badge — top right ─────── */}
      <motion.div
        animate={{ y: [0, -9, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-10 right-6 bg-card/85 backdrop-blur-md border border-border rounded-2xl px-4 py-3 shadow-xl shadow-primary/5 pointer-events-auto"
      >
        <p className="text-[11px] text-muted-foreground font-medium">Customer Rating</p>
        <div className="flex items-center gap-1 mt-1">
          {[1,2,3,4,5].map(n => <Star key={n} size={13} className="text-yellow-400 fill-yellow-400" />)}
        </div>
        <p className="text-base font-bold text-foreground mt-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
          4.9 / 5.0
        </p>
      </motion.div>

      {/* ── 5000+ Medicines badge — bottom left ───── */}
      <motion.div
        animate={{ y: [0, 9, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className="absolute bottom-20 left-4 bg-card/85 backdrop-blur-md border border-border rounded-2xl px-4 py-3 shadow-xl shadow-secondary/5 pointer-events-auto"
      >
        <p className="text-[11px] text-muted-foreground font-medium">Medicines Available</p>
        <p
          className="text-2xl font-black text-primary mt-1"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          5,000+
        </p>
      </motion.div>

      {/* ── Small glassmorphism accent card — bottom right, partially under the doctor ── */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="absolute bottom-8 right-0 w-36 bg-gradient-to-br from-white/20 via-white/10 to-primary/10 dark:from-background/30 dark:via-background/15 dark:to-primary/10 border border-white/30 dark:border-border backdrop-blur-md rounded-2xl px-4 py-4 shadow-xl shadow-primary/10"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary mb-3 mx-auto shadow-lg shadow-primary/30">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="7" y="2" width="6" height="16" rx="2" fill="white" />
            <rect x="2" y="7" width="16" height="6" rx="2" fill="white" />
          </svg>
        </div>
        <p className="text-[11px] text-center font-semibold text-foreground leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Same Day Delivery
        </p>
        <p className="text-[9px] text-center text-muted-foreground mt-0.5">Order before 6 PM</p>
      </motion.div>
    </motion.div>
  );
}
