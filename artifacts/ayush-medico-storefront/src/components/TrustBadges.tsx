import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ShieldCheck, CreditCard, FileCheck, Zap, Award, Clock, BadgeCheck } from "lucide-react";

const stats = [
  { value: "10+",   label: "Years of Trust",     icon: Clock,      color: "from-white/20 to-white/10" },
  { value: "50K+",  label: "Happy Customers",    icon: BadgeCheck, color: "from-white/20 to-white/10" },
  { value: "5000+", label: "Medicines",          icon: Award,      color: "from-white/20 to-white/10" },
  { value: "4.9★",  label: "Customer Rating",   icon: ShieldCheck, color: "from-white/20 to-white/10" },
  { value: "100%",  label: "Genuine Products",  icon: FileCheck,   color: "from-white/20 to-white/10" },
];

const badges = [
  { icon: ShieldCheck, label: "Licensed Pharmacy",     sub: "Govt. registered & certified",  color: "text-primary",         bg: "bg-primary/8",         border: "border-primary/20"      },
  { icon: CreditCard,  label: "Secure Payments",       sub: "UPI · COD · Cards",             color: "text-secondary",        bg: "bg-secondary/8",       border: "border-secondary/20"    },
  { icon: FileCheck,   label: "Prescription Verified", sub: "Certified pharmacist review",   color: "text-violet-500",       bg: "bg-violet-500/8",      border: "border-violet-500/20"   },
  { icon: Zap,         label: "Same Day Delivery",     sub: "Order by 6 PM",                 color: "text-amber-500",        bg: "bg-amber-500/8",       border: "border-amber-500/20"    },
  { icon: Award,       label: "100% Genuine",          sub: "Direct from distributors",      color: "text-emerald-500",      bg: "bg-emerald-500/8",     border: "border-emerald-500/20"  },
];

export default function TrustBadges() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px" });

  return (
    <section ref={ref} className="relative overflow-hidden">

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-secondary py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile: 2-col grid  |  Desktop: 5-col row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ y: 16 }}
                animate={inView ? { y: 0 } : {}}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-2.5">
                  <s.icon size={20} className="text-white" />
                </div>
                <p
                  className="text-2xl sm:text-3xl font-black text-white leading-none mb-0.5"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {s.value}
                </p>
                <p className="text-xs text-white/70 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Trust badges strip — horizontal scroll on mobile ─────────────── */}
      <div className="bg-card border-b border-border py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Scrollable row on mobile, centered wrap on lg+ */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 lg:flex-wrap lg:justify-center lg:overflow-x-visible"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {badges.map((b, i) => (
              <motion.div
                key={b.label}
                initial={{ y: 8 }}
                animate={inView ? { y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.25 + i * 0.06 }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${b.border} ${b.bg} flex-shrink-0`}
              >
                <b.icon size={14} className={`${b.color} flex-shrink-0`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight whitespace-nowrap">{b.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight whitespace-nowrap">{b.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
