/**
 * CategoryDetailPage — Public route at /category/:slug
 *
 * Shows the category hero (icon, name, description), a breadcrumb, a
 * category-scoped search bar, a sort control, and every medicine whose
 * Firestore `categoryName` matches this category's name.
 *
 * Medicines are 100% dynamic — no hardcoded lists. Once MediVision Gold
 * sync starts writing to the `medicines` collection with a matching
 * `categoryName`, medicines appear here automatically in real time.
 * No redesign or code changes will be needed at that point.
 *
 * Shared components (MedicineCard, StockBadge, MedicineSkeleton) live in
 * src/components/medicines/MedicineCard.tsx so changes propagate everywhere.
 */

import { useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronRight, Home, Package, Loader2, Search, X,
  SlidersHorizontal, PackageSearch,
} from "lucide-react";
import { useCategories }          from "@/hooks/useCategories";
import { useMedicinesByCategory } from "@/hooks/useMedicinesByCategory";
import { getCategoryColors }      from "@/lib/categoryColors";
import { MedicineCard, MedicineSkeleton, stockPriority } from "@/components/medicines/MedicineCard";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type SortOption = "default" | "name" | "price-low" | "price-high";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CategoryDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug   = params.slug ?? "";

  // Load all categories (including disabled) so we can find by slug even if
  // the admin temporarily disables it — we'll still show the page.
  const { categories, loading: categoriesLoading } = useCategories(false);

  const [search,     setSearch]     = useState("");
  const [sort,       setSort]       = useState<SortOption>("default");
  const [filterOpen, setFilterOpen] = useState(false);

  // Match by slug field, falling back to document ID for older documents
  const category = categories.find((c) => (c.slug ?? c.id) === slug);
  const colors   = getCategoryColors(category?.color ?? "primary");

  const { medicines, loading: medicinesLoading } = useMedicinesByCategory(category?.name ?? "");

  const visibleMedicines = useMemo(() => {
    let list = medicines;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.brand ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      const pa = stockPriority(a);
      const pb = stockPriority(b);
      if (pa !== pb) return pa - pb;
      if (sort === "name")       return a.name.localeCompare(b.name);
      if (sort === "price-low")  return (a.sellingPrice ?? Infinity) - (b.sellingPrice ?? Infinity);
      if (sort === "price-high") return (b.sellingPrice ?? -Infinity) - (a.sellingPrice ?? -Infinity);
      return (a.order ?? 0) - (b.order ?? 0);
    });
    return sorted;
  }, [medicines, search, sort]);

  const loading = categoriesLoading;

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
              <ArrowLeft size={14} /> Browse Medicines
            </a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 lg:pt-32 lg:pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Breadcrumb ────────────────────────────────────────────── */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Home size={13} /> Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight size={14} />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/categories" className="hover:text-primary transition-colors">
                  Browse Medicines
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight size={14} />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-foreground">{category.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* ── Back link ─────────────────────────────────────────────── */}
        <Link href="/categories">
          <a className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
                        hover:text-primary mb-6 transition-colors group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Browse Medicines
          </a>
        </Link>

        {/* ── Category hero ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`rounded-3xl bg-gradient-to-br ${colors.light}
                      border border-border p-10 lg:p-14 mb-10 text-center`}
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
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {category.description || `Explore our full range of ${category.name.toLowerCase()} — genuine, trusted, and always available.`}
          </p>

          {!medicinesLoading && medicines.length > 0 && (
            <p className="mt-4 text-sm font-semibold text-primary">
              {medicines.length} medicine{medicines.length === 1 ? "" : "s"} in this category
            </p>
          )}
        </motion.div>

        {/* ── Search + filter bar ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search in ${category.name}...`}
              className="w-full pl-11 pr-10 py-3 rounded-xl border border-border bg-card
                         text-sm placeholder:text-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                         transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                         border border-border bg-card text-sm font-semibold text-foreground
                         hover:border-primary/40 hover:text-primary transition-colors w-full sm:w-auto"
            >
              <SlidersHorizontal size={15} />
              {sort === "default"
                ? "Sort & Filter"
                : sort === "name"
                ? "Name (A–Z)"
                : sort === "price-low"
                ? "Price: Low to High"
                : "Price: High to Low"}
            </button>

            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-10 overflow-hidden"
                >
                  {([
                    ["default",    "Recommended"],
                    ["name",       "Name (A–Z)"],
                    ["price-low",  "Price: Low to High"],
                    ["price-high", "Price: High to Low"],
                  ] as [SortOption, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => { setSort(value); setFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors
                                   ${sort === value ? "text-primary font-semibold" : "text-foreground"}`}
                    >
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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

          {medicinesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => <MedicineSkeleton key={i} />)}
            </div>
          ) : medicines.length === 0 ? (
            /* Empty state — no medicines synced into this category yet */
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
                  No medicines available in this category yet.
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Medicines will appear here automatically once they're added or
                  synced via MediVision Gold. No page reload needed.
                </p>
              </div>
            </div>
          ) : visibleMedicines.length === 0 ? (
            /* Search matched nothing within this category */
            <div className="flex flex-col items-center gap-3 py-16 px-6 text-center border border-dashed border-border rounded-2xl bg-muted/10">
              <PackageSearch size={32} className="text-muted-foreground/40" />
              <p className="text-muted-foreground">No medicines match "{search}".</p>
              <button
                onClick={() => setSearch("")}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {visibleMedicines.map((item, i) => (
                <MedicineCard key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
