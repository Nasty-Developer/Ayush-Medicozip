import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ShieldCheck, CreditCard, FileCheck, Zap, Award, Clock, BadgeCheck } from "lucide-react";

const stats = [
  { value: "10+", label: "Years of Trust", icon: Clock, color: "from-primary to-blue-600" },
  { value: "50K+", label: "Happy Customers", icon: BadgeCheck, color: "from-secondary to-emerald-600" },
  { value: "5000+", label: "Medicines", icon: Award, color: "from-violet-500 to-purple-600" },
  { value: "4.9★", label: "Customer Rating", icon: ShieldCheck, color: "from-amber-500 to-orange-500" },
  { value: "100%", label: "Genuine Products", icon: FileCheck, color: "from-pink-500 to-rose-600" },
];

const badges = [
  { icon: ShieldCheck, label: "Licensed Pharmacy", sub: "Govt. registered & certified", color: "text-primary", bg: "bg-primary/8", border: "border-primary/20" },
  { icon: CreditCard, label: "Secure Payments", sub: "UPI · COD · Cards", color: "text-secondary", bg: "bg-secondary/8", border: "border-secondary/20" },
  { icon: FileCheck, label: "Prescription Verified", sub: "Certified pharmacist review", color: "text-violet-500", bg: "bg-violet-500/8", border: "border-violet-500/20" },
  { icon: Zap, label: "Same Day Delivery", sub: "Order by 6 PM", color: "text-amber-500", bg: "bg-amber-500/8", border: "border-amber-500/20" },
  { icon: Award, label: "100% Genuine", sub: "Direct from distributors", color: "text-emerald-500", bg: "bg-emerald-500/8", border: "border-emerald-500/20" },
];

export default function TrustBadges() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Stats strip */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-secondary py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-0 lg:divide-x lg:divide-white/20">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex flex-col items-center text-center lg:px-6"
              >
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-3">
                  <s.icon size={20} className="text-white" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white leading-none mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {s.value}
                </p>
                <p className="text-xs text-white/70 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust badges strip */}
      <div className="bg-card border-b border-border py-4 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {badges.map((b, i) => (
              <motion.div
                key={b.label}
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${b.border} ${b.bg} flex-shrink-0 hover:scale-[1.03] transition-transform duration-200`}
              >
                <b.icon size={15} className={b.color} />
                <div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{b.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{b.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
