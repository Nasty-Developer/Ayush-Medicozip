/**
 * Categories — Homepage section
 *
 * Premium PharmEasy-inspired category grid, unique Ayush Medico design.
 * • Large rounded cards with gradient accent top-bar
 * • Live medicine count from API
 * • Smooth hover lift + shadow animations
 * • Horizontal scroll on mobile, grid on desktop
 * • "View All Categories" CTA button
 */

import { useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryColors } from "@/lib/categoryColors";

/* ── Color stripe map ─────────────────────────────────────────────────────── */
const STRIPE: Record<string, { from: string; to: string; text: string; pill: string }> = {
  primary:   { from: "#3B82F6", to: "#1D4ED8", text: "#DBEAFE", pill: "bg-blue-100/80 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  secondary: { from: "#10B981", to: "#047857", text: "#D1FAE5", pill: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  accent:    { from: "#06B6D4", to: "#0369A1", text: "#CFFAFE", pill: "bg-cyan-100/80 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
  purple:    { from: "#8B5CF6", to: "#5B21B6", text: "#EDE9FE", pill: "bg-violet-100/80 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  orange:    { from: "#F97316", to: "#B45309", text: "#FEF3C7", pill: "bg-amber-100/80 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  pink:      { from: "#EC4899", to: "#BE185D", text: "#FCE7F3", pill: "bg-pink-100/80 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300" },
  red:       { from: "#EF4444", to: "#B91C1C", text: "#FEE2E2", pill: "bg-red-100/80 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  yellow:    { from: "#F59E0B", to: "#D97706", text: "#FEF9C3", pill: "bg-yellow-100/80 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
};
const STRIPE_CYCLE = ["primary","secondary","accent","purple","orange","pink","red","yellow"];
function getStripe(color: string, index: number) {
  return STRIPE[color] ?? STRIPE[STRIPE_CYCLE[index % STRIPE_CYCLE.length]];
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-44 sm:w-48 rounded-3xl bg-card border border-border overflow-hidden animate-pulse">
      <div className="h-2 bg-muted-foreground/20" />
      <div className="p-5">
        <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4" />
        <div className="h-4 w-3/4 bg-muted rounded-lg mx-auto mb-2" />
        <div className="h-3 w-1/2 bg-muted rounded-lg mx-auto" />
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="h-6 w-36 rounded-full bg-muted animate-pulse mx-auto mb-4" />
          <div className="h-10 w-72 rounded-xl bg-muted animate-pulse mx-auto mb-3" />
          <div className="h-4 w-80 rounded-lg bg-muted animate-pulse mx-auto" />
        </div>
        <div className="flex gap-4 overflow-hidden pb-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </section>
  );
}

/* ── Category Card ────────────────────────────────────────────────────────── */
function CategoryCard({ cat, index, inView }: { cat: ReturnType<typeof useCategories>["categories"][0]; index: number; inView: boolean }) {
  const colors = getCategoryColors(cat.color, index);
  const stripe = getStripe(cat.color, index);
  const href   = `/category/${cat.slug ?? cat.id}`;
  const count  = (cat as any).count as number | undefined;

  return (
    <Link href={href} className="flex-shrink-0 w-40 sm:w-44 lg:w-auto block">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.45, delay: index * 0.05 }}
        whileHover={{ y: -6, scale: 1.03 }}
        className="group relative bg-card dark:bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/8 transition-all duration-300 cursor-pointer h-full"
      >
        {/* Gradient accent stripe */}
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${stripe.from}, ${stripe.to})` }}
        />

        {/* Card body */}
        <div className="px-4 pt-5 pb-5 flex flex-col items-center text-center gap-3">

          {/* Icon bubble */}
          <motion.div
            whileHover={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 0.5 }}
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-md overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${stripe.from}22, ${stripe.to}33)` }}
          >
            {/* Soft radial glow behind emoji */}
            <div
              className="absolute inset-0 opacity-30 blur-sm"
              style={{ background: `radial-gradient(circle, ${stripe.from}, transparent 70%)` }}
            />
            <span className="relative text-3xl leading-none" role="img" aria-label={cat.name}>
              {cat.icon || "💊"}
            </span>
          </motion.div>

          {/* Name */}
          <h3
            className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors duration-200"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {cat.name}
          </h3>

          {/* Medicine count pill */}
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${stripe.pill}`}>
            {typeof count === "number" && count > 0
              ? `${count.toLocaleString()} medicine${count === 1 ? "" : "s"}`
              : "View products"}
          </div>

          {/* Arrow — slides in on hover */}
          <div className="flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-200"
            style={{ color: stripe.from }}
          >
            Shop now <ChevronRight size={12} />
          </div>
        </div>

        {/* Bottom gradient overlay on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 pointer-events-none rounded-3xl"
          style={{ background: `linear-gradient(135deg, ${stripe.from}, ${stripe.to})` }}
        />
      </motion.div>
    </Link>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function Categories() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { categories, loading } = useCategories(true);

  if (loading)                 return <SkeletonGrid />;
  if (categories.length === 0) return null;

  return (
    <section id="categories" ref={ref} className="py-16 lg:py-24 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold border border-secondary/20 mb-3">
              Browse by Category
            </div>
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Shop by{" "}
              <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                Category
              </span>
            </h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              {categories.length} categories · {(categories as any[]).reduce((s, c) => s + ((c.count as number) || 0), 0).toLocaleString()} medicines available
            </p>
          </div>

          <Link
            href="/categories"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0"
          >
            View All
            <ArrowRight size={15} />
          </Link>
        </motion.div>

        {/* Cards — horizontal scroll on mobile, wrapping grid on desktop */}
        <div className="relative">
          {/* Mobile horizontal scroll */}
          <div className="flex lg:hidden gap-3.5 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {categories.map((cat, i) => (
              <div key={cat.id} className="snap-start">
                <CategoryCard cat={cat} index={i} inView={inView} />
              </div>
            ))}
          </div>

          {/* Desktop grid */}
          <div className="hidden lg:grid grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
            {categories.map((cat, i) => (
              <CategoryCard key={cat.id} cat={cat} index={i} inView={inView} />
            ))}
          </div>
        </div>

        {/* View All button — mobile only (desktop has it inline with heading) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex justify-center mt-8 sm:hidden"
        >
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200 text-sm"
          >
            View All Categories
            <ArrowRight size={15} />
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
