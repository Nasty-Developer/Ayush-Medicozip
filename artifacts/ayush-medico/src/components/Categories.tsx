/**
 * Categories — Homepage section
 *
 * Premium pharmacy category grid.
 * • Large, roomy cards with a consistent blue → teal identity
 * • Real medicine counts straight from the API (never hardcoded)
 * • Admin-uploaded image first, keyword-matched artwork second, emoji last
 * • Two-column touch grid on mobile, responsive grid on desktop
 * • Every card still links to /category/<slug>
 */

import { useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { resolveCategoryPlaceholder } from "@/lib/medicineImage";

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-card animate-pulse">
      <div className="aspect-[4/3] bg-muted" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded-lg bg-muted" />
        <div className="h-3 w-1/2 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <section className="py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 space-y-3">
          <div className="h-6 w-32 rounded-full bg-muted animate-pulse" />
          <div className="h-10 w-64 rounded-xl bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </section>
  );
}

/* ── Category Card ────────────────────────────────────────────────────────── */
function CategoryCard({
  cat,
  index,
  inView,
}: {
  cat: ReturnType<typeof useCategories>["categories"][0];
  index: number;
  inView: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);
  const href  = `/category/${cat.slug ?? cat.id}`;
  const count = (cat as { count?: number }).count;

  // Admin-uploaded image → keyword-matched artwork → emoji only if both fail
  const imgSrc = cat.imageUrl && !imgErr ? cat.imageUrl : resolveCategoryPlaceholder(cat.name);
  const showEmojiFallback = Boolean(cat.imageUrl) && imgErr;

  return (
    <Link href={href} className="group block min-w-0 focus-visible:outline-none">
      <motion.article
        initial={{ opacity: 0, y: 18 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
        className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/25 hover:shadow-[0_18px_40px_-18px_rgba(30,108,164,0.45)] group-focus-visible:ring-2 group-focus-visible:ring-primary/40"
      >
        {/* Media */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-sky-50 via-white to-teal-50 dark:from-sky-950/30 dark:via-card dark:to-teal-950/20">
          {/* soft concentric wash */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 blur-2xl dark:bg-white/5"
          />

          {showEmojiFallback ? (
            <div className="flex h-full w-full items-center justify-center">
              <span role="img" aria-label={cat.name} className="text-5xl leading-none sm:text-6xl">
                {cat.icon || "💊"}
              </span>
            </div>
          ) : (
            <img
              src={imgSrc}
              alt={`${cat.name} medicines at Ayush Medico, Kurla West`}
              loading="lazy"
              decoding="async"
              onError={() => setImgErr(true)}
              className="absolute inset-0 m-auto h-[74%] w-[74%] object-contain drop-shadow-[0_10px_18px_rgba(15,23,42,0.14)] transition-transform duration-500 ease-out group-hover:scale-[1.07]"
            />
          )}

          {/* emoji seal */}
          {!showEmojiFallback && (
            <span
              aria-hidden
              className="absolute left-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/85 text-base shadow-sm ring-1 ring-black/5 backdrop-blur-sm dark:bg-card/85"
            >
              {cat.icon || "💊"}
            </span>
          )}

          {/* count badge */}
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-primary shadow-sm ring-1 ring-primary/10 backdrop-blur-sm dark:bg-card/90">
            {typeof count === "number" && count > 0
              ? `${count.toLocaleString()} medicines`
              : "Browse all"}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 items-start justify-between gap-2 p-4 pt-3.5">
          <div className="min-w-0">
            <h3
              className="line-clamp-2 text-sm font-bold leading-snug tracking-[-0.01em] text-foreground transition-colors duration-200 group-hover:text-primary sm:text-[15px]"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              {cat.name}
            </h3>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">
              {typeof count === "number" && count > 0 ? "In stock · delivery in 4 km" : "Explore the range"}
            </p>
          </div>
          <span
            aria-hidden
            className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/8 text-primary opacity-0 transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:opacity-100"
          >
            <ArrowUpRight size={14} />
          </span>
        </div>

        {/* bottom accent */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[3px] scale-x-0 bg-gradient-to-r from-primary via-teal-400 to-secondary transition-transform duration-300 group-hover:scale-x-100"
        />
      </motion.article>
    </Link>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function Categories() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  const { categories, loading } = useCategories(true);

  if (loading)                 return <SkeletonGrid />;
  if (categories.length === 0) return null;

  const totalMedicines = (categories as { count?: number }[]).reduce(
    (sum, category) => sum + (category.count || 0),
    0,
  );

  return (
    <section id="categories" ref={ref} className="relative bg-gradient-to-b from-background via-muted/25 to-background py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-9 flex flex-col gap-5 sm:mb-11 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3.5 py-1.5 text-xs font-semibold text-secondary">
              Browse by Category
            </div>
            <h2
              className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-foreground sm:text-4xl"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Shop by{" "}
              <span className="bg-gradient-to-r from-primary via-teal-500 to-secondary bg-clip-text text-transparent">
                Category
              </span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-[15px]">
              {categories.length} categories · {totalMedicines.toLocaleString()} medicines available in Kurla West
            </p>
          </div>

          <Link
            href="/categories"
            className="hidden flex-shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-primary/35 sm:inline-flex"
          >
            View All
            <ArrowRight size={15} />
          </Link>
        </motion.div>

        {/* Grid — 2 columns on phones so cards stay large without side-scrolling */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {categories.map((cat, i) => (
            <CategoryCard key={cat.id} cat={cat} index={i} inView={inView} />
          ))}
        </div>

        {/* Mobile CTA */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 flex justify-center sm:hidden"
        >
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-primary/40"
          >
            View All Categories
            <ArrowRight size={15} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
