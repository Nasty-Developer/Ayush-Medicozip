/**
 * VetMedicinesPage — Public
 * Browsing page for veterinary medicines at /vet-medicines
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  PawPrint, Search, X, Package, PackageSearch,
  Loader2, ChevronDown, ShoppingCart, Phone,
} from "lucide-react";
import { useAnnouncement } from "@/context/AnnouncementContext";
import { useDebounce } from "@/hooks/useDebounce";
import { Link } from "wouter";

/* ── Types ───────────────────────────────────────────────────────────────── */
type VetMedicine = {
  id: number;
  name: string;
  genericName: string | null;
  brand: string | null;
  animalType: string | null;
  prescriptionRequired: boolean;
  packing: string | null;
  mrp: string | null;
  sellingPrice: string | null;
  discount: string | null;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  imageUrl: string | null;
  featured: boolean;
  categoryName: string | null;
};

type Category = {
  id: number;
  name: string;
  icon: string;
  slug: string;
  count: number;
};

const ANIMAL_TYPES = ["All", "Dog", "Cat", "Cow", "Buffalo", "Bird", "Goat", "Horse", "Fish", "Rabbit", "Pig", "Sheep", "Poultry", "Other"];

/* ── Product card ────────────────────────────────────────────────────────── */
function VetMedicineCard({ item, index }: { item: VetMedicine; index: number }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const inStock = item.stockStatus === "in_stock";
  const lowStock = item.stockStatus === "low_stock";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-secondary/30 transition-all duration-200 flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 overflow-hidden">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PawPrint size={40} className="text-secondary/30" />
          </div>
        )}

        {/* Stock badge */}
        {!inStock && (
          <span className={`absolute top-2 left-2 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
            lowStock ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
          }`}>
            {lowStock ? "Low Stock" : "Out of Stock"}
          </span>
        )}

        {/* Animal type badge */}
        {item.animalType && (
          <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/90 dark:bg-card/90 text-foreground border border-border">
            🐾 {item.animalType}
          </span>
        )}

        {/* Rx badge */}
        {item.prescriptionRequired && (
          <span className="absolute bottom-2 left-2 text-[9px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
            Rx Required
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[10px] text-muted-foreground mb-0.5">
          {item.brand ?? item.categoryName ?? "Veterinary Medicine"}
        </p>
        <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2 mb-auto">
          {item.name}
        </h3>
        {item.packing && (
          <p className="text-[10px] text-muted-foreground mt-1">{item.packing}</p>
        )}

        {/* Price row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div>
            {item.sellingPrice ? (
              <>
                <p className="text-base font-bold text-foreground">₹{parseFloat(item.sellingPrice).toFixed(0)}</p>
                {item.mrp && parseFloat(item.mrp) > parseFloat(item.sellingPrice) && (
                  <p className="text-[10px] text-muted-foreground line-through">₹{parseFloat(item.mrp).toFixed(0)}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground font-medium">Price on enquiry</p>
            )}
          </div>

          {inStock ? (
            <a
              href="tel:+919833273838"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-secondary text-white text-xs font-semibold hover:bg-secondary/90 active:scale-95 transition-all"
            >
              <Phone size={11} /> Order
            </a>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function VetMedicinesPage() {
  const headerRef = useRef(null);
  const inView    = useInView(headerRef, { once: true, margin: "-80px" });
  const { enabled: announcementEnabled } = useAnnouncement();

  const [products,    setProducts]    = useState<VetMedicine[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const PAGE_SIZE = 24;

  const [search,      setSearch]      = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [animalType,  setAnimalType]  = useState("All");

  const debouncedSearch = useDebounce(search, 300);

  // Fetch categories
  useEffect(() => {
    fetch("/api/vet-medicines/categories")
      .then((r) => r.json())
      .then((d: { data: Category[] }) => setCategories(d.data ?? []))
      .catch(() => {});
  }, []);

  // Fetch products (reset on filter change)
  useEffect(() => {
    setPage(1);
    setProducts([]);
    setLoading(true);

    const params = new URLSearchParams({ page: "1", limit: String(PAGE_SIZE) });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (selectedCat !== "all") params.set("categoryId", selectedCat);
    if (animalType !== "All") params.set("animalType", animalType);

    fetch(`/api/vet-medicines?${params}`)
      .then((r) => r.json())
      .then((d: { data: VetMedicine[]; total: number }) => {
        setProducts(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedSearch, selectedCat, animalType]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const params = new URLSearchParams({ page: String(nextPage), limit: String(PAGE_SIZE) });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (selectedCat !== "all") params.set("categoryId", selectedCat);
    if (animalType !== "All") params.set("animalType", animalType);

    try {
      const res  = await fetch(`/api/vet-medicines?${params}`);
      const data = await res.json() as { data: VetMedicine[]; total: number };
      setProducts((prev) => [...prev, ...(data.data ?? [])]);
      setTotal(data.total ?? 0);
      setPage(nextPage);
    } catch { } finally { setLoadingMore(false); }
  };

  const hasMore = products.length < total;

  return (
    <section className="pt-28 pb-24 lg:pt-32 lg:pb-32 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl mb-10 p-8 lg:p-12"
          style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)" }}
        >
          {/* Decoration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="absolute right-8 -bottom-10 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: "rgba(255,255,255,0.18)", color: "white" }}>
              <PawPrint size={12} /> Veterinary Medicines
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Care for your animals
            </h1>
            <p className="text-white/80 text-lg max-w-xl">
              Genuine veterinary medicines for pets and livestock — dogs, cats, cattle, birds and more.
            </p>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg active:scale-95 transition-all"
              style={{ color: "#047857" }}
            >
              <Phone size={14} /> Contact for vet advice
            </Link>
          </div>
        </motion.div>

        {/* Animal type pills + search */}
        <div className={`sticky z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8
                         bg-background/95 backdrop-blur-sm border-b border-border/50 py-3 mb-8
                         ${announcementEnabled ? "top-[104px] md:top-[120px]" : "top-16 md:top-20"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vet medicines…"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Animal type dropdown */}
            <div className="relative">
              <select value={animalType} onChange={(e) => setAnimalType(e.target.value)}
                className="pl-3 pr-8 py-2.5 rounded-xl border border-border bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all appearance-none">
                {ANIMAL_TYPES.map((a) => <option key={a} value={a}>{a === "All" ? "🐾 All Animals" : a}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Category pills */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              <button onClick={() => setSelectedCat("all")}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedCat === "all" ? "bg-secondary text-white shadow-md" : "bg-card border border-border text-foreground hover:border-secondary/40 hover:text-secondary"
                }`}>
                <Package size={13} /> All
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${selectedCat === "all" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {total}
                </span>
              </button>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setSelectedCat(String(cat.id))}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                    selectedCat === String(cat.id) ? "bg-secondary text-white shadow-md" : "bg-card border border-border text-foreground hover:border-secondary/40 hover:text-secondary"
                  }`}>
                  <span role="img" aria-hidden>{cat.icon || "🐾"}</span>
                  {cat.name}
                  {cat.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${selectedCat === String(cat.id) ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                      {cat.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-xs text-muted-foreground mb-5">
            {debouncedSearch ? `${products.length} result${products.length !== 1 ? "s" : ""} for "${debouncedSearch}"` : `${total} vet medicine${total !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
                  <div className="aspect-square bg-muted" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : products.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-24 text-center">
              <div className="p-5 rounded-2xl bg-secondary/10">
                <PawPrint size={40} className="text-secondary/40" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {debouncedSearch ? "No matches found" : "Vet medicines coming soon"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {debouncedSearch
                    ? `No vet medicines match "${debouncedSearch}". Try a different term.`
                    : "We're adding vet medicines to this collection. Contact us to enquire."}
                </p>
              </div>
              {debouncedSearch ? (
                <button onClick={() => setSearch("")} className="text-sm font-semibold text-secondary hover:underline">Clear search</button>
              ) : (
                <Link href="/contact">
                  <a className="px-5 py-2 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-all">Contact Us</a>
                </Link>
              )}
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((item, i) => <VetMedicineCard key={item.id} item={item} index={i} />)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Load more */}
        {!loading && hasMore && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-10 flex flex-col items-center gap-3">
            <button onClick={loadMore} disabled={loadingMore}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-secondary text-white font-semibold text-sm hover:bg-secondary/90 disabled:opacity-60 shadow-sm transition-all">
              {loadingMore ? <Loader2 size={15} className="animate-spin" /> : <PawPrint size={15} />}
              {loadingMore ? "Loading…" : "Load more vet medicines"}
            </button>
            <p className="text-xs text-muted-foreground">{products.length} of {total} loaded</p>
          </motion.div>
        )}

        {!loading && !hasMore && products.length > 0 && (
          <p className="mt-10 text-center text-xs text-muted-foreground">All {products.length} vet medicines loaded.</p>
        )}
      </div>
    </section>
  );
}
