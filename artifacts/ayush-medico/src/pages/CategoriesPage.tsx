/**
 * CategoriesPage — Public route at /categories
 *
 * Performance improvements:
 *  - Search is debounced (300ms) — no filtering on every keystroke.
 *  - Category pill view uses paginated useMedicinesByCategory with
 *    a "Load More" button instead of streaming all medicines at once.
 *  - "All Medicines" view already uses cursor-based pagination (unchanged).
 *  - useMedicineCounts now uses getCountFromServer() instead of streaming
 *    the entire medicines collection (done in hook, not here).
 */

import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Tag, Loader2, Search, X, SlidersHorizontal,
  Package, PackageSearch, Layers, ChevronDown,
} from "lucide-react";
import { useCategories }          from "@/hooks/useCategories";
import { useMedicinesByCategory } from "@/hooks/useMedicinesByCategory";
import { useAllMedicines }        from "@/hooks/useAllMedicines";
import { useMedicineCounts }      from "@/hooks/useMedicineCounts";
import { useDebounce }            from "@/hooks/useDebounce";
import { getCategoryColors }      from "@/lib/categoryColors";
import { MedicineCard, MedicineSkeleton, stockPriority } from "@/components/medicines/MedicineCard";
import type { CategoryMedicine }  from "@/hooks/useMedicinesByCategory";

type SortOption = "default" | "name" | "price-low" | "price-high";

// ─── Category pill ────────────────────────────────────────────────────────────

interface PillProps {
  selected: boolean;
  onClick: () => void;
  gradient?: string;
  children: React.ReactNode;
}

function CategoryPill({ selected, onClick, gradient, children }: PillProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full
        text-sm font-semibold whitespace-nowrap transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        ${selected
          ? gradient
            ? `bg-gradient-to-r ${gradient} text-white shadow-md`
            : "bg-primary text-white shadow-md"
          : "bg-card border border-border text-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5"
        }
      `}
    >
      {children}
    </button>
  );
}

// ─── Sort dropdown ────────────────────────────────────────────────────────────

const SORT_LABELS: Record<SortOption, string> = {
  default:      "Recommended",
  name:         "Name (A–Z)",
  "price-low":  "Price: Low → High",
  "price-high": "Price: High → Low",
};

function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-border
                   bg-card text-sm font-semibold text-foreground
                   hover:border-primary/40 hover:text-primary transition-colors w-full sm:w-auto"
      >
        <SlidersHorizontal size={14} />
        <span className="hidden xs:inline">{SORT_LABELS[value]}</span>
        <span className="xs:hidden">Sort</span>
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden"
          >
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => { onChange(val); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors
                             ${value === val ? "text-primary font-semibold" : "text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Medicines grid ───────────────────────────────────────────────────────────

function MedicinesGrid({
  medicines, initialLoading, skeletonCount = 8,
}: { medicines: CategoryMedicine[]; initialLoading: boolean; skeletonCount?: number }) {
  if (initialLoading) {
    return (
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: skeletonCount }).map((_, i) => <MedicineSkeleton key={i} />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {medicines.map((item, i) => <MedicineCard key={item.id} item={item} index={i} />)}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const headerRef = useRef(null);
  const inView    = useInView(headerRef, { once: true, margin: "-80px" });

  // ── Data ──────────────────────────────────────────────────────────────────
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories(true);

  const {
    medicines: allMedicines,
    initialLoading: allInitialLoading,
    loadingMore: allLoadingMore,
    hasMore: allHasMore,
    loadMore: allLoadMore,
    totalLoaded,
  } = useAllMedicines();

  const [selectedCatName, setSelectedCatName] = useState<"all" | string>("all");

  const medicineCounts = useMedicineCounts();

  const catQueryName = selectedCatName === "all" ? "" : selectedCatName;
  const {
    medicines: catMedicines,
    loading: catLoading,
    loadingMore: catLoadingMore,
    hasMore: catHasMore,
    loadMore: catLoadMore,
  } = useMedicinesByCategory(catQueryName);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [sort,   setSort]   = useState<SortOption>("default");

  // Debounce search — avoid filtering on every keystroke
  const debouncedSearch = useDebounce(search, 300);

  const selectedCategory = categories.find((c) => c.name === selectedCatName);

  const activeMedicines   = selectedCatName === "all" ? allMedicines : catMedicines;
  const activeInitLoading = selectedCatName === "all" ? allInitialLoading : catLoading;
  const activeLoadingMore = selectedCatName === "all" ? allLoadingMore : catLoadingMore;
  const activeHasMore     = selectedCatName === "all" ? allHasMore : catHasMore;
  const activeLoadMore    = selectedCatName === "all" ? allLoadMore : catLoadMore;

  const visibleMedicines = useMemo(() => {
    let list = activeMedicines;
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.brand ?? "").toLowerCase().includes(q) ||
          (m.categoryName ?? "").toLowerCase().includes(q),
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
  }, [activeMedicines, debouncedSearch, sort]);

  const selectedColors = selectedCategory ? getCategoryColors(selectedCategory.color) : null;

  return (
    <section className="pt-28 pb-24 lg:pt-32 lg:pb-32 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Page heading ─────────────────────────────────────────────── */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                          bg-secondary/10 text-secondary text-sm font-semibold
                          border border-secondary/20 mb-4">
            <Layers size={13} /> Browse Medicines
          </div>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Find the right{" "}
            <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              medicine
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Browse our full catalogue or select a category below.
          </p>
        </motion.div>

        {/* ── Sticky category pills ─────────────────────────────────────── */}
        <div className="sticky top-[72px] z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8
                        bg-background/95 backdrop-blur-sm border-b border-border/50 py-3 mb-8">
          <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
            <CategoryPill
              selected={selectedCatName === "all"}
              onClick={() => { setSelectedCatName("all"); setSearch(""); }}
            >
              <Package size={13} />
              All Medicines
              {!allInitialLoading && totalLoaded > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                                  ${selectedCatName === "all" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {allHasMore ? `${totalLoaded}+` : totalLoaded}
                </span>
              )}
            </CategoryPill>

            {!categoriesLoading && categories.map((cat, i) => {
              const colors = getCategoryColors(cat.color, i);
              const isSel  = selectedCatName === cat.name;
              return (
                <CategoryPill
                  key={cat.id}
                  selected={isSel}
                  gradient={isSel ? colors.gradient : undefined}
                  onClick={() => { setSelectedCatName(cat.name); setSearch(""); }}
                >
                  <span role="img" aria-hidden="true" className="text-sm leading-none">
                    {cat.icon || "💊"}
                  </span>
                  {cat.name}
                  {medicineCounts[cat.name] !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                                      ${isSel ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                      {medicineCounts[cat.name]}
                    </span>
                  )}
                </CategoryPill>
              );
            })}

            {categoriesLoading && [1, 2, 3, 4].map((n) => (
              <div key={n} className="flex-shrink-0 h-9 w-28 rounded-full bg-muted animate-pulse" />
            ))}
          </div>
        </div>

        {/* ── Firestore error ───────────────────────────────────────────── */}
        {!categoriesLoading && categoriesError && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20
                          text-sm text-destructive flex items-center gap-2">
            <Package size={14} />
            Could not load categories — showing All Medicines. Check your connection.
          </div>
        )}

        {/* ── Selected category info strip ──────────────────────────────── */}
        <AnimatePresence mode="wait">
          {selectedCatName !== "all" && selectedCategory && (
            <motion.div
              key={selectedCatName}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className={`rounded-2xl bg-gradient-to-br ${getCategoryColors(selectedCategory.color).light}
                          border border-border p-6 mb-8 flex items-center gap-5`}
            >
              <div className={`flex-shrink-0 inline-flex items-center justify-center p-3.5 rounded-2xl
                               bg-gradient-to-br ${getCategoryColors(selectedCategory.color).gradient}
                               shadow-lg`}>
                <span className="text-3xl leading-none" role="img" aria-label={selectedCategory.name}>
                  {selectedCategory.icon || "💊"}
                </span>
              </div>
              <div className="min-w-0">
                <h2
                  className="text-xl font-bold text-foreground"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {selectedCategory.name}
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {selectedCategory.description ||
                    `Showing ${selectedCategory.name.toLowerCase()} medicines.`}
                </p>
              </div>
              <Link
                href={`/category/${selectedCategory.slug ?? selectedCategory.id}`}
                className="ml-auto flex-shrink-0 text-xs font-semibold text-primary hover:underline hidden sm:block"
              >
                Full page →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Search + sort bar ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                selectedCatName === "all"
                  ? "Search all medicines…"
                  : `Search in ${selectedCatName}…`
              }
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
          <SortDropdown value={sort} onChange={setSort} />
        </div>

        {/* ── Results count ─────────────────────────────────────────────── */}
        {!activeInitLoading && (
          <p className="text-xs text-muted-foreground mb-5">
            {debouncedSearch
              ? `${visibleMedicines.length} result${visibleMedicines.length === 1 ? "" : "s"} for "${debouncedSearch}"`
              : selectedCatName === "all"
              ? `Showing ${totalLoaded}${allHasMore ? "+" : ""} medicines`
              : `${activeMedicines.length}${activeHasMore ? "+" : ""} medicine${activeMedicines.length === 1 ? "" : "s"} in this category`}
          </p>
        )}

        {/* ── Medicine grid ──────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeInitLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <MedicinesGrid medicines={[]} initialLoading skeletonCount={8} />
            </motion.div>
          ) : visibleMedicines.length === 0 && debouncedSearch ? (
            <motion.div
              key="no-search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-20 px-6 text-center border border-dashed border-border rounded-2xl bg-muted/10"
            >
              <PackageSearch size={32} className="text-muted-foreground/40" />
              <p className="text-muted-foreground">
                No medicines match <span className="font-semibold">"{debouncedSearch}"</span>.
              </p>
              <button onClick={() => setSearch("")} className="text-sm font-semibold text-primary hover:underline">
                Clear search
              </button>
            </motion.div>
          ) : visibleMedicines.length === 0 ? (
            <motion.div
              key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-20 px-6 border-2 border-dashed border-border rounded-2xl bg-muted/20 text-center"
            >
              <div className="p-4 rounded-2xl bg-muted/50">
                <Package size={36} className="text-muted-foreground/40" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">No medicines here yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Medicines appear automatically once added or synced via MediVision Gold. No reload needed.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`grid-${selectedCatName}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            >
              <MedicinesGrid medicines={visibleMedicines} initialLoading={false} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Load More ─────────────────────────────────────────────────── */}
        {!activeInitLoading && !debouncedSearch && activeHasMore && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="mt-10 flex flex-col items-center gap-3"
          >
            <button
              onClick={activeLoadMore}
              disabled={activeLoadingMore}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl
                         bg-primary text-white font-semibold text-sm
                         hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed
                         shadow-sm shadow-primary/30 transition-all duration-200"
            >
              {activeLoadingMore ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />}
              {activeLoadingMore ? "Loading…" : "Load more medicines"}
            </button>
            <p className="text-xs text-muted-foreground">
              {activeMedicines.length} loaded — more available
            </p>
          </motion.div>
        )}

        {/* ── All loaded indicator ───────────────────────────────────────── */}
        {!activeInitLoading && !debouncedSearch && !activeHasMore && activeMedicines.length > 0 && (
          <p className="mt-10 text-center text-xs text-muted-foreground">
            All {activeMedicines.length} medicines loaded.
          </p>
        )}

        {/* ── Category grid teaser ───────────────────────────────────────── */}
        {selectedCatName === "all" && !categoriesLoading && categories.length > 0 && !debouncedSearch && (
          <div className="mt-16 pt-12 border-t border-border">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xl font-bold text-foreground"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Or browse by category
              </h2>
              <span className="text-xs text-muted-foreground">{categories.length} categories</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {categories.map((cat, i) => {
                const colors = getCategoryColors(cat.color, i);
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCatName(cat.name); setSearch(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`group flex flex-col items-center gap-2 p-4 rounded-xl
                                border border-border bg-gradient-to-br ${colors.light}
                                hover:border-primary/30 hover:shadow-md transition-all duration-200 text-center`}
                  >
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl
                                     bg-gradient-to-br ${colors.gradient} shadow-sm group-hover:shadow-md transition-shadow`}>
                      <span className="text-lg leading-none" role="img" aria-label={cat.name}>
                        {cat.icon || "💊"}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                      {cat.name}
                    </span>
                    {medicineCounts[cat.name] !== undefined && (
                      <span className="text-[10px] text-muted-foreground">
                        {medicineCounts[cat.name]} medicine{medicineCounts[cat.name] !== 1 ? "s" : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
