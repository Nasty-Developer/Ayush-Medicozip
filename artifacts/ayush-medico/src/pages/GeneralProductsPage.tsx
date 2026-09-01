/**
 * GeneralProductsPage — Public
 * Browsing page for general healthcare products at /general-products
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ShoppingBag, Search, X, Package,
  Loader2, ChevronDown, ShoppingCart, Plus, Minus, PackageSearch,
} from "lucide-react";
import { useAnnouncement } from "@/context/AnnouncementContext";
import { useDebounce } from "@/hooks/useDebounce";
import { Link } from "wouter";
import { useCart } from "@/context/CartContext";
import { useRequestMedicine } from "@/context/RequestMedicineContext";

/* ── Types ───────────────────────────────────────────────────────────────── */
type GeneralProduct = {
  id: number;
  name: string;
  brand: string | null;
  description: string | null;
  subCategory: string | null;
  packing: string | null;
  mrp: string | null;
  sellingPrice: string | null;
  discount: string | null;
  stockStatus: "in_stock" | "out_of_stock";
  imageUrl: string | null;
  featured: boolean;
  categoryName: string | null;
};

type Category = { id: number; name: string; icon: string; count: number };

const SUB_CATEGORIES = [
  "Chocolates","Energy Drinks","Biscuits","Adult Diapers","Baby Diapers",
  "Baby Care","Personal Care","Hygiene","First Aid","Medical Devices",
  "Protein & Nutrition","Vitamins","Health Drinks","Sanitizers","Masks",
  "Thermometers","Glucometers","Nebulizers","Orthopedic Supports",
  "Ayurvedic Products","Daily Essentials",
];

/* ── Product card ────────────────────────────────────────────────────────── */
function GeneralProductCard({ item, index }: { item: GeneralProduct; index: number }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const inStock = item.stockStatus === "in_stock";
  const [imageFailed, setImageFailed] = useState(false);
  const { addItem, items, updateQuantity, removeItem } = useCart();
  const { triggerRequest } = useRequestMedicine();
  const cartId = `general-${item.id}`;
  const cartItem = items.find((cartItem) => cartItem.medicineId === cartId);
  const sellingPrice = item.sellingPrice ? Number(item.sellingPrice) : 0;
  const canAdd = inStock && Number.isFinite(sellingPrice) && sellingPrice > 0;
  const discountPct = item.mrp && item.sellingPrice && parseFloat(item.mrp) > parseFloat(item.sellingPrice)
    ? Math.round((1 - parseFloat(item.sellingPrice) / parseFloat(item.mrp)) * 100)
    : 0;

  const requestProduct = () => {
    triggerRequest(item.name, item.brand ?? undefined, item.subCategory ?? item.categoryName ?? undefined);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-violet-300/40 dark:hover:border-violet-700/40 transition-all duration-200 flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 overflow-hidden">
        {item.imageUrl && !imageFailed ? (
          <img src={item.imageUrl} alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageFailed(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={40} className="text-violet-300 dark:text-violet-700" />
          </div>
        )}

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground bg-card/90 px-2.5 py-1 rounded-full border border-border">Out of Stock</span>
          </div>
        )}

        {/* Discount badge */}
        {discountPct > 0 && inStock && (
          <span className="absolute top-2 left-2 text-[9px] font-bold text-white bg-rose-500 px-2 py-0.5 rounded-full">
            {discountPct}% OFF
          </span>
        )}

        {/* Sub-category badge */}
        {item.subCategory && (
          <span className="absolute bottom-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/90 dark:bg-card/90 text-foreground border border-border">
            {item.subCategory}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[10px] text-muted-foreground mb-0.5 truncate">
          {item.brand ?? item.categoryName ?? "General"}
        </p>
        <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2 mb-auto">{item.name}</h3>
        {item.packing && <p className="text-[10px] text-muted-foreground mt-1">{item.packing}</p>}

        {/* Price row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div>
            {item.sellingPrice ? (
              <>
                <p className="text-base font-bold text-foreground">₹{sellingPrice.toFixed(2)}</p>
                {item.mrp && parseFloat(item.mrp) > parseFloat(item.sellingPrice) && (
                  <p className="text-[10px] text-muted-foreground line-through">₹{parseFloat(item.mrp).toFixed(2)}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground font-medium">Enquire</p>
            )}
          </div>
          {cartItem ? (
            <div className="flex items-center gap-1 rounded-xl border border-violet-300 dark:border-violet-700 overflow-hidden">
              <button
                onClick={() => cartItem.quantity <= 1 ? removeItem(cartId) : updateQuantity(cartId, cartItem.quantity - 1)}
                className="w-7 h-7 flex items-center justify-center text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                aria-label={`Decrease ${item.name} quantity`}
              >
                <Minus size={12} />
              </button>
              <span className="text-xs font-bold text-violet-700 min-w-5 text-center">{cartItem.quantity}</span>
              <button
                onClick={() => updateQuantity(cartId, cartItem.quantity + 1)}
                className="w-7 h-7 flex items-center justify-center text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                aria-label={`Increase ${item.name} quantity`}
              >
                <Plus size={12} />
              </button>
            </div>
          ) : canAdd ? (
            <button
              onClick={() => addItem({
                medicineId: cartId,
                medicineName: item.name,
                categoryName: item.categoryName ?? item.subCategory ?? "General Products",
                brandName: item.brand ?? undefined,
                unitPrice: sellingPrice,
                prescriptionRequired: false,
                imageUrl: item.imageUrl ?? undefined,
              })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
              style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" }}
            >
              <ShoppingCart size={11} /> Add to cart
            </button>
          ) : !inStock ? (
            <button
              onClick={requestProduct}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold hover:bg-amber-100 active:scale-95 transition-all"
            >
              <PackageSearch size={11} /> Request
            </button>
          ) : (
            <button
              onClick={requestProduct}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold hover:bg-amber-100 active:scale-95 transition-all"
            >
              <PackageSearch size={11} /> Request
            </button>
          )}
        </div>
        {!inStock && (
          <button onClick={requestProduct} className="mt-2 text-[10px] text-muted-foreground hover:text-violet-700 hover:underline text-left">
            Ask us to source this product
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function GeneralProductsPage() {
  const headerRef = useRef(null);
  const inView    = useInView(headerRef, { once: true, margin: "-80px" });
  const { enabled: announcementEnabled } = useAnnouncement();

  const [products,    setProducts]    = useState<GeneralProduct[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const PAGE_SIZE = 24;

  const [search,      setSearch]      = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [subCategory, setSubCategory] = useState("All");

  const debouncedSearch = useDebounce(search, 300);

  // Fetch categories
  useEffect(() => {
    fetch("/api/general-products/categories")
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
    if (subCategory !== "All") params.set("subCategory", subCategory);

    fetch(`/api/general-products?${params}`)
      .then((r) => r.json())
      .then((d: { data: GeneralProduct[]; total: number }) => {
        setProducts(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedSearch, selectedCat, subCategory]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const params = new URLSearchParams({ page: String(nextPage), limit: String(PAGE_SIZE) });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (selectedCat !== "all") params.set("categoryId", selectedCat);
    if (subCategory !== "All") params.set("subCategory", subCategory);

    try {
      const res  = await fetch(`/api/general-products?${params}`);
      const data = await res.json() as { data: GeneralProduct[]; total: number };
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
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="absolute right-8 -bottom-10 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: "rgba(255,255,255,0.18)", color: "white" }}>
              <ShoppingBag size={12} /> General Products
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Health & Daily Essentials
            </h1>
            <p className="text-white/80 text-lg max-w-xl">
              Chocolates, diapers, medical devices, protein shakes, personal care and more — all under one roof.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {["Baby Care", "Medical Devices", "Vitamins", "Personal Care", "Daily Essentials"].map((t) => (
                <span key={t} className="text-[11px] font-medium px-3 py-1 rounded-full text-white/90" style={{ background: "rgba(255,255,255,0.15)" }}>{t}</span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Sticky filters */}
        <div className={`sticky z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8
                         bg-background/95 backdrop-blur-sm border-b border-border/50 py-3 mb-8
                         ${announcementEnabled ? "top-[104px] md:top-[120px]" : "top-16 md:top-20"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search general products…"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 transition-all" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>
              )}
            </div>
            <div className="relative">
              <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)}
                className="pl-3 pr-8 py-2.5 rounded-xl border border-border bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400/40 transition-all appearance-none">
                <option value="All">All Types</option>
                {SUB_CATEGORIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Category pills */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              <button onClick={() => setSelectedCat("all")}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedCat === "all"
                    ? "text-white shadow-md"
                    : "bg-card border border-border text-foreground hover:border-violet-400/40"
                }`}
                style={selectedCat === "all" ? { background: "linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)" } : {}}>
                <Package size={13} /> All
              </button>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setSelectedCat(String(cat.id))}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                    selectedCat === String(cat.id)
                      ? "text-white shadow-md"
                      : "bg-card border border-border text-foreground hover:border-violet-400/40"
                  }`}
                  style={selectedCat === String(cat.id) ? { background: "linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)" } : {}}>
                  <span role="img" aria-hidden>{cat.icon || "🛒"}</span>
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
            {debouncedSearch ? `${products.length} result${products.length !== 1 ? "s" : ""} for "${debouncedSearch}"` : `${total} product${total !== 1 ? "s" : ""}`}
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
              <div className="p-5 rounded-2xl" style={{ background: "rgba(139,92,246,0.1)" }}>
                <ShoppingBag size={40} style={{ color: "#8b5cf6", opacity: 0.5 }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {debouncedSearch ? "No matches found" : "Products coming soon"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {debouncedSearch
                    ? `No products match "${debouncedSearch}". Try a different search.`
                    : "We're adding general products to this collection. Contact us to enquire."}
                </p>
              </div>
              {debouncedSearch ? (
                <button onClick={() => setSearch("")} className="text-sm font-semibold hover:underline" style={{ color: "#8b5cf6" }}>Clear search</button>
              ) : (
                <Link href="/contact">
                  <a className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all"
                    style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)" }}>
                    Contact Us
                  </a>
                </Link>
              )}
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((item, i) => <GeneralProductCard key={item.id} item={item} index={i} />)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Load more */}
        {!loading && hasMore && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-10 flex flex-col items-center gap-3">
            <button onClick={loadMore} disabled={loadingMore}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60 shadow-sm transition-all"
              style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)" }}>
              {loadingMore ? <Loader2 size={15} className="animate-spin" /> : <ShoppingBag size={15} />}
              {loadingMore ? "Loading…" : "Load more products"}
            </button>
            <p className="text-xs text-muted-foreground">{products.length} of {total} loaded</p>
          </motion.div>
        )}

        {!loading && !hasMore && products.length > 0 && (
          <p className="mt-10 text-center text-xs text-muted-foreground">All {products.length} products loaded.</p>
        )}
      </div>
    </section>
  );
}
