/**
 * Categories — Homepage section
 *
 * Reads entirely from Firestore via useCategories. No hardcoded data.
 * Any category published in the Admin Panel appears here immediately.
 *
 * Behaviour:
 *   • Shows a skeleton grid while loading.
 *   • Returns null if no published categories exist (section disappears cleanly).
 *   • Clicking a card navigates to /category/:slug.
 *   • Sorted by the `order` field set via admin drag-and-drop.
 */

import { useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryColors } from "@/lib/categoryColors";

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function SkeletonGrid() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="h-6 w-36 rounded-full bg-muted animate-pulse mx-auto mb-4" />
          <div className="h-10 w-72 rounded-xl bg-muted animate-pulse mx-auto mb-3" />
          <div className="h-4 w-96 rounded-lg bg-muted animate-pulse mx-auto" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-muted border border-border h-36 animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function Categories() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { categories, loading } = useCategories(true); // published only

  if (loading)              return <SkeletonGrid />;
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
            Browse our comprehensive range of healthcare products organised for easy discovery.
          </p>
        </motion.div>

        {/* Grid — adapts to however many categories exist */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {categories.map((cat, i) => {
            const colors = getCategoryColors(cat.color, i);
            const href   = `/category/${cat.slug ?? cat.id}`;

            return (
              <Link key={cat.id} href={href} className="block">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  whileHover={{ y: -8, scale: 1.03 }}
                  className={`group relative rounded-2xl bg-gradient-to-br ${colors.light}
                              border border-border p-6
                              shadow-sm hover:shadow-xl hover:shadow-black/10
                              transition-all duration-300 cursor-pointer overflow-hidden
                              text-center h-full`}
                >
                  {/* Hover colour wash */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${colors.gradient}
                                opacity-0 group-hover:opacity-[0.08] rounded-2xl
                                transition-opacity duration-300`}
                  />

                  <div className="relative">
                    {/* Icon */}
                    <motion.div
                      whileHover={{ rotate: 10 }}
                      className={`inline-flex items-center justify-center p-4 rounded-2xl
                                  bg-gradient-to-br ${colors.gradient}
                                  shadow-lg mb-4 group-hover:shadow-xl
                                  transition-shadow duration-300`}
                    >
                      <span className="text-2xl leading-none" role="img" aria-label={cat.name}>
                        {cat.icon || "💊"}
                      </span>
                    </motion.div>

                    <h3
                      className="font-bold text-foreground mb-1 text-sm sm:text-base leading-tight
                                 group-hover:text-primary transition-colors duration-200"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    )}
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* View All button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex justify-center mt-10"
        >
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200 text-sm"
          >
            View All Categories
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
