import { motion } from "framer-motion";
import {
  Phone, MapPin, Star, Search, ArrowRight, ShieldCheck, Award,
  BadgeCheck, Zap, HeartPulse, Clock3, ClipboardCheck, Truck,
} from "lucide-react";
import { Link } from "wouter";
import { useAnnouncement } from "@/context/AnnouncementContext";

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
      className={`relative flex items-center ${topPad} pb-12 sm:pb-16 lg:pb-20 overflow-hidden bg-[hsl(var(--background))]`}
    >
      <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
      <div className="hero-orbit hero-orbit-two" aria-hidden="true" />

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[minmax(0,1.03fr)_minmax(420px,.97fr)] gap-10 lg:gap-14 xl:gap-20 items-center">
          <LeftContent />
          <RightVisual />
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
    <div className="flex flex-col max-w-2xl">
      <motion.div
        {...fadeUp(0)}
        className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full
                   bg-primary/10 text-primary text-xs sm:text-sm font-bold
                   border border-primary/15 mb-6 w-fit shadow-sm"
      >
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-secondary opacity-60 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-secondary" />
        </span>
        Trusted Pharmacy · Kurla West
      </motion.div>

      <motion.h1
        {...fadeUp(0.1, 0.6)}
        className="text-[2.7rem] sm:text-5xl lg:text-[4rem] xl:text-[4.55rem] font-black
                   leading-[1.04] tracking-[-0.045em] text-foreground mb-5"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        Your trusted{" "}
        <span className="hero-heading-accent">medical store</span>
        <br className="hidden sm:block" /> in Kurla West
      </motion.h1>

      <motion.p
        {...fadeUp(0.18, 0.5)}
        className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-7 max-w-xl"
      >
        Genuine medicines, expert pharmacists, same-day delivery — serving
        50,000+ families across Kurla West for over a decade.
      </motion.p>

      <motion.div {...fadeUp(0.26)} className="flex flex-wrap gap-3 mb-6">
        <a
          href="tel:+919833273838"
          data-testid="hero-call-btn"
           className="hero-primary-button flex flex-1 sm:flex-none items-center justify-center gap-2.5
                      px-6 sm:px-7 py-3.5 text-white font-bold rounded-xl
                      shadow-lg shadow-primary/20 hover:-translate-y-0.5
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
                      px-6 sm:px-7 py-3.5 bg-card text-primary
                      font-bold rounded-xl border border-primary/20 shadow-sm
                      hover:bg-primary/5 hover:border-primary/35 hover:-translate-y-0.5
                     transition-all duration-200 whitespace-nowrap text-sm sm:text-base"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <MapPin size={18} strokeWidth={2.5} />
          Get Directions
        </a>
      </motion.div>

      <motion.div {...fadeUp(0.33)} className="mb-8">
        <Link
          href="/categories"
          data-testid="hero-search-catalog-link"
           className="flex items-center gap-3 w-full max-w-xl px-5 py-4 rounded-2xl
                      bg-card border border-border text-sm text-muted-foreground shadow-sm
                      hover:bg-primary/[0.03] hover:border-primary/30 hover:text-foreground
                     transition-all duration-200 group"
        >
          <Search size={18} className="text-primary flex-shrink-0
                                       group-hover:scale-110 transition-transform" aria-hidden />
          <span className="flex-1">Search medicines, e.g. Paracetamol, Vitamin D3…</span>
           <span className="hidden sm:flex items-center gap-1 text-xs text-primary font-bold">
            Search <ArrowRight size={12} />
          </span>
        </Link>
      </motion.div>

      <motion.div
        {...fadeUp(0.4)}
        className="flex flex-wrap items-center gap-x-5 gap-y-2.5
                   pt-6 border-t border-border"
      >
        {[
          { icon: ShieldCheck, label: "Licensed Pharmacy",  color: "text-primary" },
          { icon: Award,       label: "100% Genuine",       color: "text-emerald-400" },
          { icon: Zap,         label: "Same Day Delivery",  color: "text-amber-400" },
          { icon: BadgeCheck,  label: "10+ Years Trusted",  color: "text-secondary" },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon size={13} className={`${color} flex-shrink-0`} />
            <span className="text-xs text-muted-foreground font-semibold">{label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function RightVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="relative min-h-[430px] sm:min-h-[500px] lg:min-h-[555px] pointer-events-none"
    >
      <div className="absolute inset-x-5 sm:inset-x-10 lg:inset-x-2 top-8 bottom-4 rounded-[2rem] bg-gradient-to-br from-[#dff6f1] via-[#eef9f7] to-[#dbeefa] border border-white/80 shadow-[0_24px_70px_-28px_rgba(18,101,117,.38)] overflow-hidden">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full border-[18px] border-white/55" />
        <div className="absolute -left-24 bottom-8 w-64 h-64 rounded-full border-[26px] border-primary/5" />
        <div className="relative h-full p-5 sm:p-8 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-sm">
                <HeartPulse size={19} strokeWidth={2.3} />
              </div>
              <span className="text-xs font-bold tracking-[.12em] uppercase">Ayush care desk</span>
            </div>
            <span className="text-[10px] font-bold text-secondary bg-white/75 border border-white px-2.5 py-1.5 rounded-full">Open today</span>
          </div>

          <div className="mt-10 sm:mt-14 max-w-[260px]">
            <p className="text-xs font-bold tracking-[.14em] text-primary/65 uppercase mb-2">Your health, handled</p>
            <p className="text-2xl sm:text-3xl font-black tracking-[-.04em] text-foreground leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
              The essentials, without the wait.
            </p>
          </div>

          <div className="relative flex-1 min-h-[170px]">
            <div className="absolute left-[16%] sm:left-[22%] top-8 w-36 h-48 sm:w-44 sm:h-56 rounded-[1.35rem] bg-card border border-white shadow-[0_18px_35px_-20px_rgba(13,85,102,.7)] rotate-[-8deg] p-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-8"><ShieldCheck size={20} /></div>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Genuine</p>
              <p className="mt-1 text-sm font-black leading-tight text-foreground">Daily care<br />you can trust</p>
              <div className="absolute bottom-4 left-4 right-4 h-1.5 rounded-full bg-gradient-to-r from-primary via-secondary to-accent" />
            </div>
            <div className="absolute right-[9%] sm:right-[15%] top-20 w-32 h-44 sm:w-40 sm:h-52 rounded-[1.35rem] bg-primary text-white shadow-[0_18px_35px_-15px_rgba(13,85,102,.8)] rotate-[9deg] p-4">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-8"><ClipboardCheck size={20} /></div>
              <p className="text-[10px] font-bold text-white/70 tracking-wider uppercase">At your door</p>
              <p className="mt-1 text-sm font-black leading-tight">Same-day<br />delivery</p>
              <Truck size={23} className="absolute bottom-4 right-4 text-accent" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-primary/10 pt-4">
            {[
              { value: "5,000+", label: "medicines" },
              { value: "4.9/5", label: "customer rating" },
              { value: "10+ yrs", label: "in Kurla West" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-sm sm:text-base font-black text-foreground">{item.value}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating proof cards add depth without obscuring the message. */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 right-0 sm:right-2 bg-card border border-border
                   rounded-2xl px-4 py-3 shadow-xl shadow-primary/10 pointer-events-auto"
      >
        <p className="text-[11px] text-muted-foreground font-semibold mb-1">Customer rating</p>
        <div className="flex items-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={12} className="text-accent fill-accent" />
          ))}
        </div>
        <p className="text-lg font-black text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
          4.9 / 5.0
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Based on 2,000+ reviews</p>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute top-[52%] -translate-y-1/2 left-0 bg-card border border-border
                   rounded-2xl px-4 py-3 shadow-xl shadow-primary/10 pointer-events-auto"
      >
        <div className="flex items-center gap-2 mb-1"><Clock3 size={13} className="text-secondary" /><p className="text-[11px] text-muted-foreground font-semibold">Pharmacist support</p></div>
        <p className="text-sm font-black text-foreground">Here when you need us</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Call before 6 PM for same-day delivery</p>
      </motion.div>
    </motion.div>
  );
}
