/**
 * ExploreCollections — Homepage section
 *
 * Three premium gradient cards linking to the three product collections:
 *   1. Medicines (pharmacy — /categories)
 *   2. Veterinary Medicines (/vet-medicines)
 *   3. General Products (/general-products)
 *
 * Appears below the NewArrivals section on the homepage.
 */

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

const COLLECTIONS = [
  {
    emoji:       "💊",
    badge:       "Pharmacy",
    title:       "Medicines",
    description: "5,000+ prescription, OTC and branded medicines across all therapeutic categories. Licensed pharmacy, genuine stock.",
    cta:         "Explore Medicines",
    href:        "/categories",
    from:        "#0ea5e9",
    to:          "#0369a1",
    shadow:      "shadow-blue-500/30",
    ring:        "hover:ring-blue-400/40",
    tag:         "bg-white/20 text-white",
    items:       ["Prescription Rx", "OTC Medicines", "Vitamins & Supplements", "Generic Medicines"],
  },
  {
    emoji:       "🐾",
    badge:       "Veterinary",
    title:       "Vet Medicines",
    description: "Genuine veterinary medicines and care products for dogs, cats, cattle, birds, and all livestock.",
    cta:         "Explore Vet Medicines",
    href:        "/vet-medicines",
    from:        "#10b981",
    to:          "#047857",
    shadow:      "shadow-emerald-500/30",
    ring:        "hover:ring-emerald-400/40",
    tag:         "bg-white/20 text-white",
    items:       ["Dogs & Cats", "Cattle & Livestock", "Birds & Poultry", "Dewormers & Vaccines"],
  },
  {
    emoji:       "🛒",
    badge:       "Daily Essentials",
    title:       "General Products",
    description: "Health essentials, nutrition, personal care, medical devices and daily wellness products under one roof.",
    cta:         "Explore General Products",
    href:        "/general-products",
    from:        "#8b5cf6",
    to:          "#5b21b6",
    shadow:      "shadow-violet-500/30",
    ring:        "hover:ring-violet-400/40",
    tag:         "bg-white/20 text-white",
    items:       ["Diapers & Baby Care", "Protein & Nutrition", "Medical Devices", "Personal Care"],
  },
] as const;

export default function ExploreCollections() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
          🏪 Our Collections
        </div>
        <h2
          className="text-3xl sm:text-4xl font-bold text-foreground mb-3"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Three collections,{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            one pharmacy
          </span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          From prescription medicines to pet care and daily essentials — everything available at Ayush Medico.
        </p>
      </motion.div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLLECTIONS.map((col, i) => (
          <motion.div
            key={col.href}
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.12 }}
          >
            <Link
              href={col.href}
              className={`
                group relative flex flex-col overflow-hidden rounded-2xl
                shadow-xl ${col.shadow} hover:shadow-2xl
                ring-2 ring-transparent ${col.ring}
                transition-all duration-300 hover:-translate-y-1 cursor-pointer
                h-full min-h-[340px]
              `}
              style={{ background: `linear-gradient(145deg, ${col.from} 0%, ${col.to} 100%)` }}
            >
                {/* Background decoration */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
                  <div
                    className="absolute -right-12 -top-12 w-56 h-56 rounded-full opacity-20"
                    style={{ background: "rgba(255,255,255,0.25)" }}
                  />
                  <div
                    className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full opacity-15"
                    style={{ background: "rgba(255,255,255,0.20)" }}
                  />
                  {/* Dot grid */}
                  <div
                    className="absolute right-0 inset-y-0 w-24"
                    style={{
                      backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.20) 1px, transparent 1px)",
                      backgroundSize:  "14px 14px",
                    }}
                  />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col flex-1 p-7">
                  {/* Badge */}
                  <span
                    className={`self-start text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-5 ${col.tag}`}
                    style={{ background: "rgba(255,255,255,0.18)" }}
                  >
                    {col.badge}
                  </span>

                  {/* Emoji */}
                  <div className="text-5xl leading-none mb-4" role="img" aria-label={col.title}>
                    {col.emoji}
                  </div>

                  {/* Title */}
                  <h3
                    className="text-2xl font-bold text-white mb-2"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    {col.title}
                  </h3>

                  {/* Description */}
                  <p className="text-white/80 text-sm leading-relaxed mb-5">
                    {col.description}
                  </p>

                  {/* Item tags */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {col.items.map((item) => (
                      <span
                        key={item}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full text-white/90"
                        style={{ background: "rgba(255,255,255,0.15)" }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="mt-auto">
                    <span
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                                 bg-white font-semibold text-sm shadow-md
                                 group-hover:shadow-lg group-hover:gap-3
                                 transition-all duration-200"
                      style={{ color: col.from }}
                    >
                      {col.cta}
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
