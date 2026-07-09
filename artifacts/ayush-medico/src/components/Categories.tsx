/**
 * Categories — public homepage section
 * Reads entirely from Firestore via the useCategories hook.
 * No hardcoded data. Zero maintenance required after the admin sets up categories.
 *
 * Behaviour:
 *   • Shows a skeleton grid while loading.
 *   • Returns null if no published categories exist (section disappears cleanly).
 *   • Emoji icon from the `icon` field; falls back to 💊.
 *   • Color from the `color` field mapped to Tailwind gradient pairs.
 *   • Sorted by the `order` field set via admin drag-and-drop.
 */

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useCategories } from "@/hooks/useCategories";

/* ── Color palette ────────────────────────────────────────────────────────── */
const COLOR: Record<string, { gradient: string; light: string }> = {
  primary:   { gradient: "from-blue-500 to-blue-700",      light: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-900/20" },
  secondary: { gradient: "from-green-500 to-emerald-700",  light: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-900/20" },
  accent:    { gradient: "from-cyan-500 to-sky-700",       light: "from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-900/20" },
  purple:    { gradient: "from-purple-500 to-violet-700",  light: "from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-900/20" },
  orange:    { gradient: "from-orange-500 to-amber-600",   light: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-900/20" },
  pink:      { gradient: "from-pink-500 to-rose-600",      light: "from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-900/20" },
  red:       { gradient: "from-red-500 to-rose-700",       light: "from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-900/20" },
  yellow:    { gradient: "from-yellow-500 to-orange-600",  light: "from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-900/20" },
};
const FALLBACK_CYCLE = ["primary","secondary","accent","purple","orange","pink","red","yellow"];

function getColors(color: string, index: number) {
  return COLOR[color] ?? COLOR[FALLBACK_CYCLE[index % FALLBACK_CYCLE.length]];
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function SkeletonGrid() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="h-6 w-36 rounded-full bg-muted/60 animate-pulse mx-auto mb-4" />
          <div className="h-10 w-72 rounded-xl bg-muted/60 animate-pulse mx-auto mb-3" />
          <div className="h-4 w-96 rounded-lg bg-muted/40 animate-pulse mx-auto" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-muted/40 border border-border h-36 animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function Categories() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { categories, loading } = useCategories(true); // only published

  if (loading) return <SkeletonGrid />;
  if (categories.length === 0) return null;

  return (
    <section id="categories" ref={ref} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold border border-secondary/20 mb-4">
            Product Categories
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Shop by{" "}
            <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              Category
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Browse our comprehensive range of healthcare products organized for easy discovery.
          </p>
        </motion.div>

        {/* Grid — adapts to however many categories exist */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {categories.map((cat, i) => {
            const colors = getColors(cat.color, i);
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -8, scale: 1.03 }}
                className={`group relative rounded-2xl bg-gradient-to-br ${colors.light} border border-border p-6 shadow-sm hover:shadow-xl hover:shadow-black/10 transition-all duration-300 cursor-pointer overflow-hidden text-center`}
              >
                {/* Hover overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300 rounded-2xl`}
                />

                <div className="relative">
                  {/* Emoji icon */}
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    className={`inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br ${colors.gradient} shadow-lg mb-4 group-hover:shadow-xl transition-shadow duration-300`}
                  >
                    <span className="text-2xl leading-none" role="img" aria-label={cat.name}>
                      {cat.icon || "💊"}
                    </span>
                  </motion.div>

                  <h3
                    className="font-bold text-foreground mb-1 text-sm sm:text-base leading-tight"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
