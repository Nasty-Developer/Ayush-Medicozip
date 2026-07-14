import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Award, PackageCheck, PackageX, Clock, ShieldCheck, ShoppingCart, Plus, Minus, PackageSearch } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRequestMedicine } from "@/context/RequestMedicineContext";
import { resolveMedicineImage } from "@/lib/medicineImage";

type StockStatus = "in_stock" | "out_of_stock" | "coming_soon";

type Medicine = {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  imageUrl?: string;
  categoryName?: string;
  stockStatus?: StockStatus;
  available?: boolean;
  sellingPrice?: number;
  mrp?: number;
  discount?: number;
  showInSpecialMedicines?: boolean;
  order?: number;
  prescriptionRequired?: boolean;
  stockQuantity?: number;
  stockQty?: number;
};

function getStockStatus(item: Medicine): StockStatus {
  if (item.stockStatus) return item.stockStatus;
  return item.available === false ? "out_of_stock" : "in_stock";
}

function stockPriority(item: Medicine): number {
  switch (getStockStatus(item)) {
    case "in_stock":     return 0;
    case "out_of_stock": return 2;
    default:             return 1;
  }
}

function StockBadge({ status }: { status: StockStatus }) {
  const map = {
    in_stock: { label: "Available", icon: <PackageCheck size={9} />, cls: "bg-secondary/90 text-white" },
    out_of_stock: { label: "Out of Stock", icon: <PackageX size={9} />, cls: "bg-muted/90 text-muted-foreground" },
    coming_soon: { label: "Coming Soon", icon: <Clock size={9} />, cls: "bg-amber-500/90 text-white" },
  };
  const { label, icon, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm ${cls}`}>
      {icon} {label}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="h-44 bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-5 bg-muted rounded w-1/3 mt-2" />
        <div className="h-9 bg-muted rounded-xl mt-3" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col sm:flex-row items-center gap-6 py-10 px-6 rounded-2xl bg-gradient-to-r from-secondary/5 to-primary/5 border border-secondary/10">
      <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary to-emerald-600 flex items-center justify-center shadow-lg shadow-secondary/25">
        <Award size={32} className="text-white" />
      </div>
      <div className="text-center sm:text-left">
        <h3 className="text-base font-bold text-foreground mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Discover medicines available at Ayush Medico
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Genuine medicines direct from authorised distributors — diabetes care, cardiac, vitamins, baby care and much more.
        </p>
        <a
          href="/categories"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-secondary to-emerald-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-secondary/25 hover:-translate-y-0.5 transition-all duration-200"
        >
          Browse All Categories
          <PackageSearch size={15} />
        </a>
      </div>
    </div>
  );
}

function ExclusiveCard({ item, index }: { item: Medicine; index: number }) {
  const [imgErr, setImgErr] = useState(false);
  const { addItem, items, updateQuantity, removeItem } = useCart();
  const status = getStockStatus(item);

  const cartItem = items.find((i) => i.medicineId === item.id);
  const inCart = !!cartItem;
  const canAdd = status === "in_stock" && !!item.sellingPrice;
  const { triggerRequest } = useRequestMedicine();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canAdd) return;
    addItem({
      medicineId: item.id,
      medicineName: item.name,
      brandName: item.brand,
      unitPrice: item.sellingPrice!,
      prescriptionRequired: item.prescriptionRequired ?? false,
      imageUrl: item.imageUrl,
      maxStock: item.stockQty ?? item.stockQuantity,
    });
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cartItem) return;
    if (cartItem.quantity <= 1) removeItem(item.id);
    else updateQuantity(item.id, cartItem.quantity - 1);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cartItem) return;
    const max = item.stockQty ?? item.stockQuantity;
    if (max && cartItem.quantity >= max) return;
    updateQuantity(item.id, cartItem.quantity + 1);
  };

  return (
    <motion.div
      initial={{ y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.07, 0.42) }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-secondary/15 hover:border-secondary/30 transition-all duration-300 flex flex-col"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />

      {/* Image */}
      <div className="relative h-44 bg-gradient-to-br from-secondary/8 to-primary/8 overflow-hidden flex-shrink-0">
        <img
          src={imgErr
            ? resolveMedicineImage(null, item.categoryName)
            : resolveMedicineImage(item.imageUrl, item.categoryName)}
          alt={item.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setImgErr(true)}
        />
        {/* EXCLUSIVE badge + optional Rx */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold shadow-md">
            <Award size={9} /> EXCLUSIVE
          </span>
          {item.prescriptionRequired && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/90 text-white backdrop-blur-sm">
              Rx
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <StockBadge status={status} />
        </div>
      </div>

      {/* Details */}
      <div className="relative p-4 flex flex-col flex-1">
        {item.brand && <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">{item.brand}</p>}
        <h3 className="text-sm font-bold text-foreground mb-1.5 leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {item.name}
        </h3>
        {item.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>}
        {item.sellingPrice ? (
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-base font-bold text-foreground">₹{item.sellingPrice}</span>
            {item.mrp && Number(item.mrp) > Number(item.sellingPrice) && (
              <span className="text-xs text-muted-foreground line-through">₹{item.mrp}</span>
            )}
            {item.discount ? (
              <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full">{item.discount}% OFF</span>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-secondary mt-2.5">
          <ShieldCheck size={11} /> Only at Ayush Medico
        </div>

        {/* ── Add to Cart / Qty stepper — reuses CartContext.addItem ── */}
        <div className="mt-auto pt-3">
          <AnimatePresence mode="wait" initial={false}>
            {inCart ? (
              <motion.div
                key="qty"
                initial={{ scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between rounded-xl border border-secondary/40 bg-secondary/5 overflow-hidden"
              >
                <button onClick={handleDecrement}
                  className="flex-1 flex items-center justify-center h-9 hover:bg-secondary/10 transition-colors text-secondary"
                  aria-label="Decrease quantity">
                  <Minus size={14} />
                </button>
                <span className="text-sm font-bold text-secondary min-w-[32px] text-center">{cartItem.quantity}</span>
                <button onClick={handleIncrement}
                  disabled={!!((item.stockQty ?? item.stockQuantity) && cartItem.quantity >= (item.stockQty ?? item.stockQuantity)!)}
                  className="flex-1 flex items-center justify-center h-9 hover:bg-secondary/10 transition-colors text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Increase quantity">
                  <Plus size={14} />
                </button>
              </motion.div>
            ) : canAdd ? (
              <motion.button
                key="add"
                initial={{ scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-semibold bg-gradient-to-r from-secondary to-primary text-white hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-sm shadow-secondary/20"
              >
                <ShoppingCart size={14} /> Add to Cart
              </motion.button>
            ) : (
              <motion.button
                key="request"
                initial={{}}
                animate={{ opacity: 1 }}
                onClick={(e) => { e.stopPropagation(); triggerRequest(item.name, item.brand, item.categoryName); }}
                className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold border border-dashed border-muted-foreground/40 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200"
              >
                <PackageSearch size={13} /> Request this Medicine
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

const DEFAULTS = {
  title: "Special Medicines – Only Available Here",
  description: "Hard-to-find medicines and exclusive healthcare products stocked specially for you at Ayush Medico.",
};

export default function SpecialMedicines() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  const [items, setItems] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionEnabled, setSectionEnabled] = useState(true);
  const [title, setTitle] = useState(DEFAULTS.title);
  const [description, setDescription] = useState(DEFAULTS.description);

  useEffect(() => {
    // Fetch special medicines from the PostgreSQL API
    let cancelled = false;
    fetch("/api/medicines/special?limit=20")
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((json: { data: Medicine[] }) => {
        if (cancelled) return;
        const sorted = [...json.data].sort((a, b) => {
          const pa = stockPriority(a);
          const pb = stockPriority(b);
          if (pa !== pb) return pa - pb;
          return (a.order ?? 0) - (b.order ?? 0);
        });
        setItems(sorted);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });

    // Admin-configurable title/description/enabled from the PostgreSQL-backed API
    fetch("/api/settings/homepage")
      .then((r) => r.ok ? r.json() : null)
      .then((doc: Record<string, unknown> | null) => {
        if (!doc || cancelled) return;
        if (doc.specialMedicinesEnabled === false) setSectionEnabled(false);
        else setSectionEnabled(true);
        if (doc.specialMedicinesTitle) setTitle(doc.specialMedicinesTitle as string);
        if (doc.specialMedicinesDescription) setDescription(doc.specialMedicinesDescription as string);
      })
      .catch(() => {/* use defaults */});

    return () => { cancelled = true; };
  }, []);

  if (!loading && !sectionEnabled) return null;

  return (
    <section id="special-medicines" ref={ref} className="py-20 lg:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ y: 30 }}
          animate={inView ? { y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold border border-secondary/20 mb-4">
            <Award size={14} /> Exclusively Ours
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {title}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">{description}</p>
        </motion.div>

        <div className={`grid gap-5 ${
          loading || items.length >= 4
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : items.length === 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : items.length === 2
            ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
            : items.length === 1
            ? "grid-cols-1 max-w-sm mx-auto"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }`}>
          {loading
            ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
            : items.length === 0
            ? <EmptyState />
            : items.map((item, i) => <ExclusiveCard key={item.id} item={item} index={i} />)}
        </div>
      </div>
    </section>
  );
}
