import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { useAnnouncement } from "@/context/AnnouncementContext";
import heroBgWebp from "@/assets/hero-bg.webp";
import heroBgJpg from "@/assets/hero-bg.jpg";

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  };
}

/**
 * Bright, product-first pharmacy introduction. The image and trust details
 * carry the visual weight without putting copy over a dark photo overlay.
 */
export default function Hero() {
  const { enabled: announcementEnabled } = useAnnouncement();
  const topPad = announcementEnabled ? "pt-28 lg:pt-36" : "pt-20 lg:pt-28";

  return (
    <section id="home" className={`bg-[#f7fbfa] ${topPad} pb-12 sm:pb-16 lg:pb-20`}>
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.94fr_1.06fr] lg:gap-14 lg:px-8">
        <div className="max-w-xl">
          <motion.div
            {...fadeUp(0)}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-sm"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Trusted pharmacy · Kurla West
          </motion.div>

          <motion.h1
            {...fadeUp(0.08)}
            className="mb-5 max-w-lg text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[3.25rem]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Care you can trust,{" "}
            <span className="text-primary">right when you need it.</span>
          </motion.h1>

          <motion.p {...fadeUp(0.16)} className="mb-7 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
            Genuine medicines, helpful pharmacists, and dependable same-day delivery for families across Kurla West.
          </motion.p>

          <motion.div {...fadeUp(0.24)} className="mb-5 flex flex-wrap gap-3">
            <a
              href="tel:+919833273838"
              data-testid="hero-call-btn"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 sm:px-6"
            >
              <Phone size={17} strokeWidth={2.5} />
              Call Now
            </a>
            <a
              href="https://maps.google.com/?q=Shop+No+67,+Halav+Pool+Rd,+Makad+Wala+Chawl,+Kurla+West,+Mumbai"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="hero-directions-btn"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary sm:px-6"
            >
              <MapPin size={17} />
              Get Directions
            </a>
          </motion.div>

          <motion.div {...fadeUp(0.3)}>
            <Link
              href="/categories"
              data-testid="hero-search-catalog-link"
              className="group flex max-w-lg items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-500 shadow-sm transition-all hover:border-primary/30 hover:text-slate-700"
            >
              <Search size={18} className="shrink-0 text-primary" aria-hidden />
              <span className="flex-1">Search medicines, e.g. Paracetamol, Vitamin D3…</span>
              <ArrowRight size={16} className="shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <motion.div {...fadeUp(0.38)} className="mt-7 grid max-w-xl grid-cols-2 gap-x-5 gap-y-3 border-t border-slate-200 pt-5 sm:grid-cols-4">
            {[
              { icon: ShieldCheck, label: "Licensed pharmacy" },
              { icon: Award, label: "100% genuine" },
              { icon: Zap, label: "Same-day delivery" },
              { icon: BadgeCheck, label: "10+ years trusted" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <Icon size={15} className="shrink-0 text-emerald-600" />
                <span>{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.12 }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-2 shadow-xl shadow-slate-200/70">
            <picture>
              <source srcSet={heroBgWebp} type="image/webp" />
              <img
                src={heroBgJpg}
                alt="Ayush Medico pharmacy shelves"
                fetchPriority="high"
                decoding="async"
                className="aspect-[1.15] w-full rounded-[1.5rem] object-cover object-[62%_38%] sm:aspect-[1.3]"
              />
            </picture>
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:left-8 sm:right-8">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Customer rating</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="flex gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} fill="currentColor" />)}
                  </div>
                  <span className="text-sm font-bold text-slate-800">4.9 / 5</span>
                </div>
              </div>
              <div className="hidden border-l border-slate-200 pl-4 sm:block">
                <p className="text-[11px] font-medium text-slate-500">Serving locally</p>
                <p className="mt-1 text-sm font-bold text-primary">50K+ families</p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-lg shadow-emerald-900/10 sm:-left-5">
            <p className="text-[11px] font-medium text-slate-500">Ready when you are</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800">5,000+ medicines</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}