/**
 * CategoriesPage — Public route at /categories
 *
 * Displays every published category as a clickable card.
 * Reads from Firestore in real-time via useCategories(true), so any category
 * created or published in the Admin Panel appears here immediately —
 * no code changes, no page refresh.
 *
 * Clicking a card navigates to /category/:slug.
 */

import { useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { Tag, Loader2, AlertCircle } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryColors } from "@/lib/categoryColors";

export default function CategoriesPage() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { categories, loading, error } = useCategories(true); // published only

  return (
    <section ref={ref} className="pt-32 pb-24 lg:pt-36 lg:pb-32 min-h-[70vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Page heading ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold border border-secondary/20 mb-4">
            <Tag size={13} /> Medicine Categories
          </div>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Browse by{" "}
            <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              Category
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Select a category to explore our range of medicines and healthcare products.
          </p>
        </motion.div>

        {/* ── Loading ───────────────────────────────────────────────── */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {/* ── Firestore error ───────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <AlertCircle size={32} className="text-destructive/50" />
            <p className="text-muted-foreground">
              Could not load categories. Please check your connection and try again.
            </p>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!loading && !error && categories.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Tag size={40} className="text-muted-foreground/25" />
            <p className="text-muted-foreground">No categories published yet.</p>
            <p className="text-sm text-muted-foreground/60">
              Add and publish categories from the Admin Panel.
            </p>
          </div>
        )}

        {/* ── Category grid ─────────────────────────────────────────── */}
        {!loading && !error && categories.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {categories.map((cat, i) => {
              const colors = getCategoryColors(cat.color, i);
              const href   = `/category/${cat.slug ?? cat.id}`;

              return (
                <Link key={cat.id} href={href} className="block">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.35, delay: i * 0.04 }}
                    whileHover={{ y: -7, scale: 1.03 }}
                    className={`group relative flex flex-col items-center text-center
                                rounded-2xl bg-gradient-to-br ${colors.light}
                                border border-border p-6
                                shadow-sm hover:shadow-xl hover:shadow-black/10
                                transition-all duration-300 cursor-pointer overflow-hidden h-full`}
                  >
                    {/* Hover colour wash */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${colors.gradient}
                                  opacity-0 group-hover:opacity-[0.07] rounded-2xl
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

                      {/* Name */}
                      <h2
                        className="font-bold text-foreground mb-1 text-sm sm:text-base leading-tight
                                   group-hover:text-primary transition-colors duration-200"
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                      >
                        {cat.name}
                      </h2>

                      {/* Optional description */}
                      {cat.description && (
                        <p className="text-xs text-muted-foreground leading-snug">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}
