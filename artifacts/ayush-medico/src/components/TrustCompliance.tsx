import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  ShieldCheck, BadgeCheck, UserCheck, FileCheck, Lock, Zap,
  FileText, MapPin, User, Scale,
} from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Link } from "wouter";

/* ── Trust card definitions ────────────────────────────────────────────────── */
const trustCards = [
  {
    icon: ShieldCheck,
    label: "Licensed Pharmacy",
    sub: "Registered under the Drugs & Cosmetics Act, 1940 · FDA Mumbai-Zone4",
    color: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/20",
    glow: "shadow-primary/10",
  },
  {
    icon: BadgeCheck,
    label: "Genuine Medicines",
    sub: "100% authentic, sourced from CDSCO-approved verified distributors",
    color: "text-emerald-600",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/10",
  },
  {
    icon: UserCheck,
    label: "Registered Pharmacist",
    sub: "All dispensing supervised by Khan Aqsa Tasadduk Hussain (D.Pharm, Reg. 492012)",
    color: "text-violet-600",
    bg: "bg-violet-500/8",
    border: "border-violet-500/20",
    glow: "shadow-violet-500/10",
  },
  {
    icon: FileCheck,
    label: "Prescription Verified",
    sub: "Every Rx reviewed by our certified pharmacist before dispatch",
    color: "text-secondary",
    bg: "bg-secondary/8",
    border: "border-secondary/20",
    glow: "shadow-secondary/10",
  },
  {
    icon: Lock,
    label: "Secure Payments",
    sub: "UPI, cards & cash-on-delivery — fully encrypted checkout",
    color: "text-amber-600",
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
    glow: "shadow-amber-500/10",
  },
  {
    icon: Zap,
    label: "Same Day Delivery",
    sub: "Order before 6 PM — delivered to your door today",
    color: "text-rose-500",
    bg: "bg-rose-500/8",
    border: "border-rose-500/20",
    glow: "shadow-rose-500/10",
  },
];

/* ── Main component ────────────────────────────────────────────────────────── */
export default function TrustCompliance() {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: "-60px" });
  const { settings, loading } = useStoreSettings();

  /* Only show items that have actual values — never show placeholders publicly */
  const allLegalItems = [
    {
      icon: FileText,
      label: "Drug Licence (Form 20)",
      value: "MH-MZ4-518856 · Valid to 02/05/2028",
    },
    {
      icon: FileText,
      label: "Drug Licence (Form 21)",
      value: "MH-MZ4-518857 · Valid to 02/05/2028",
    },
    {
      icon: UserCheck,
      label: "Registered Pharmacist",
      value: settings.registeredPharmacist,
    },
    {
      icon: MapPin,
      label: "Business Address",
      value: settings.address,
    },
    ...(settings.gstNumber ? [{
      icon: FileText,
      label: "GST Number (GSTIN)",
      value: settings.gstNumber,
    }] : []),
    ...(settings.shopEstablishmentReg ? [{
      icon: FileCheck,
      label: "Shop & Establishment Reg.",
      value: settings.shopEstablishmentReg,
    }] : []),
  ];

  const visibleItems = loading ? allLegalItems : allLegalItems.filter(item => item.value);

  return (
    <section
      id="trust-compliance"
      ref={sectionRef}
      className="py-20 lg:py-28 bg-gradient-to-b from-muted/30 via-background to-muted/20 relative overflow-hidden"
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-primary/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-secondary/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section header ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.55 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-5">
            <ShieldCheck size={15} />
            Trust &amp; Compliance
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Your Safety is Our{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Top Priority
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Ayush Medico &amp; General Stores operates under strict compliance with Indian pharmacy regulations, ensuring every product and service meets the highest standards of safety and authenticity.
          </p>
        </motion.div>

        {/* ── Trust cards grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {trustCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ y: 24, opacity: 0 }}
              animate={inView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.05 + i * 0.07 }}
              className={`group relative bg-card border ${card.border} rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden`}
            >
              <div className={`absolute inset-0 ${card.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />
              <div className="relative">
                <div className={`inline-flex p-3 rounded-xl ${card.bg} ${card.border} border mb-4`}>
                  <card.icon size={22} className={card.color} />
                </div>
                <h3
                  className="text-base font-bold text-foreground mb-1.5"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {card.label}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.sub}</p>
                <div className={`absolute top-0 right-0 w-7 h-7 rounded-full ${card.bg} ${card.border} border flex items-center justify-center`}>
                  <BadgeCheck size={14} className={card.color} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Legal Information ──────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-16 items-start mb-16">

          {/* Left — About Us compliance blurb */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold border border-secondary/20 mb-5">
              <Scale size={13} />
              About Us — Compliance
            </div>
            <h3
              className="text-2xl font-bold text-foreground mb-4 leading-tight"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Operating Under Indian Pharmacy Regulations
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
              Ayush Medico &amp; General Stores is a licensed retail pharmacy operating in full compliance with the <strong className="text-foreground">Pharmacy Act, 1948</strong>, the <strong className="text-foreground">Drugs and Cosmetics Act, 1940</strong>, and applicable Maharashtra state regulations.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6 text-sm">
              Drug licences issued by the Food &amp; Drugs Administration, Mumbai-Zone4 (Licence Nos. MH-MZ4-518856 &amp; MH-MZ4-518857). All prescription medicines are dispensed exclusively under the supervision of our registered pharmacist, <strong className="text-foreground">Khan Aqsa Tasadduk Hussain</strong> (D.Pharm, Reg. No. 492012, MSPC).
            </p>

            <div className="space-y-3">
              {[
                "Drug licences granted by FDA Mumbai-Zone4 (MH-MZ4-518856 &amp; MH-MZ4-518857)",
                "Dispensing supervised by a qualified registered pharmacist (Reg. 492012)",
                "100% genuine products from CDSCO-approved distributors",
                "Full statutory records maintained as required by law",
              ].map((point, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                  </div>
                  <p
                    className="text-sm text-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: point }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={14} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">Verified Retail Pharmacy · FDA Mumbai-Zone4</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Proprietor: Govind Ram Chitara · Kurla West, Mumbai – 400070
              </p>
            </div>
          </motion.div>

          {/* Right — Legal information cards */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.55, delay: 0.28 }}
            className="lg:col-span-3"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 mb-5">
              <FileText size={13} />
              Legal Information
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Our statutory registration and compliance details — publicly displayed for customer assurance.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {visibleItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ y: 16, opacity: 0 }}
                  animate={inView ? { y: 0, opacity: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
                  className="rounded-2xl p-5 border bg-card border-border shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <item.icon size={13} className="text-primary" />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </p>
                  </div>
                  {loading ? (
                    <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                  ) : (
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                  )}
                </motion.div>
              ))}

              {/* Legal pages quick-links card */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={inView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.3 + visibleItems.length * 0.06 }}
                className="rounded-2xl p-5 bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 sm:col-span-2"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Scale size={14} className="text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legal Policies</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Privacy Policy", href: "/privacy-policy" },
                    { label: "Terms & Conditions", href: "/terms-conditions" },
                    { label: "Refund Policy", href: "/refund-policy" },
                    { label: "Shipping Policy", href: "/shipping-policy" },
                    { label: "Prescription Policy", href: "/prescription-policy" },
                    { label: "Disclaimer", href: "/disclaimer" },
                  ].map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* ── Regulatory note ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="flex items-start gap-4 p-5 rounded-2xl bg-muted/40 border border-border"
        >
          <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
            <User size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Responsible Dispensing Commitment</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We do not dispense Schedule H, H1, or X drugs without a valid prescription. Our pharmacy records are maintained in accordance with Rule 65 of the Drugs and Cosmetics Rules, 1945. Drug licences granted by Ashok Tukaram Rathod, Assistant Commissioner, Food &amp; Drugs Administration, Mumbai-Zone4 (FDA File No. 244432).
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
