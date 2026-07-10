/**
 * CategoryDetailPage — Public route at /category/:slug
 *
 * Shows the category hero (icon, name, description).
 * Medicine listing is intentionally empty for now — medicines will appear
 * automatically once MediVision Gold sync is implemented. No code changes
 * will be needed at that point; just populate the Firestore medicines
 * collection with a `categoryName` field matching this category's name.
 */

import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Loader2 } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryColors } from "@/lib/categoryColors";

export default function CategoryDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug   = params.slug ?? "";

  // Load all categories (including disabled) so we can find by slug even if
  // the admin temporarily disables it — we'll still show the page.
  const { categories, loading } = useCategories(false);

  // Match by slug field, falling back to document ID for older documents
  const category = categories.find((c) => (c.slug ?? c.id) === slug);
  const colors   = getCategoryColors(category?.color ?? "primary");

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex justify-center py-48">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  /* ── Not found ── */
  if (!category) {
    return (
      <div className="pt-32 pb-20 min-h-[60vh] flex items-center justify-center">
        <div className="max-w-sm mx-auto px-4 text-center">
          <p className="text-6xl mb-6">🔍</p>
          <h1
            className="text-2xl font-bold text-foreground mb-3"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Category not found
          </h1>
          <p className="text-muted-foreground mb-8">
            This category doesn't exist or may have been removed.
          </p>
          <Link href="/categories">
            <a className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white
                          rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
              <ArrowLeft size={14} /> Back to Categories
            </a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 lg:pt-32 lg:pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Back link ─────────────────────────────────────────────── */}
        <Link href="/categories">
          <a className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
                        hover:text-primary mb-10 transition-colors group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            All Categories
          </a>
        </Link>

        {/* ── Category hero ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`rounded-3xl bg-gradient-to-br ${colors.light}
                      border border-border p-10 lg:p-14 mb-12 text-center`}
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`inline-flex items-center justify-center p-5 rounded-3xl
                        bg-gradient-to-br ${colors.gradient} shadow-2xl mb-6`}
          >
            <span className="text-5xl leading-none" role="img" aria-label={category.name}>
              {category.icon || "💊"}
            </span>
          </motion.div>

          {/* Name */}
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {category.name}
          </h1>

          {/* Description */}
          {category.description && (
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {category.description}
            </p>
          )}
        </motion.div>

        {/* ── Medicines section ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <h2
            className="text-xl font-bold text-foreground mb-6"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Medicines in this category
          </h2>

          {/* Empty state — MediVision Gold integration pending */}
          <div
            className="flex flex-col items-center gap-4 py-20 px-6
                       border-2 border-dashed border-border rounded-2xl
                       bg-muted/20 text-center"
          >
            <div className="p-4 rounded-2xl bg-muted/50">
              <Package size={36} className="text-muted-foreground/40" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                Medicines coming soon
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Medicines in this category will appear here automatically once
                MediVision Gold sync is configured. No code changes will be required.
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
