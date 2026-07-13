import { motion } from "framer-motion";
import { ShieldCheck, CreditCard, FileCheck, Zap, Award } from "lucide-react";

const badges = [
  {
    icon: ShieldCheck,
    label: "Licensed Pharmacy",
    sub: "Govt. registered & certified",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    icon: CreditCard,
    label: "Secure Payments",
    sub: "UPI, COD & cards accepted",
    color: "text-secondary",
    bg: "bg-secondary/10",
    border: "border-secondary/20",
  },
  {
    icon: FileCheck,
    label: "Prescription Verified",
    sub: "Certified pharmacist review",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    icon: Zap,
    label: "Same Day Delivery",
    sub: "Order by 6 PM",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: Award,
    label: "100% Genuine",
    sub: "Direct from distributors",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
];

export default function TrustBadges() {
  return (
    <section className="py-6 bg-card border-y border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {badges.map((b, i) => (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${b.border} ${b.bg} flex-shrink-0`}
            >
              <b.icon size={16} className={b.color} />
              <div>
                <p className="text-xs font-semibold text-foreground leading-tight">{b.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{b.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
