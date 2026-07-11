import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Sparkles, PackageCheck, PackageX, Clock, ChevronLeft, ChevronRight, ShoppingCart, Plus, Minus, PackageSearch } from "lucide-react";
import { subscribeToDoc } from "@/lib/firestoreHelpers";
import { isFirebaseConfigured } from "@/lib/firebase";
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
  showInNewArrivals?: boolean;
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
    in_stock: { label: "In Stock", icon: <PackageCheck size={9} />, cls: "bg-secondary/90 text-white" },
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
    <div className="flex-shrink-0 w-56 sm:w-64 bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="h-40 bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-5 bg-muted rounded w-1/3 mt-2" />
        <div className="h-9 bg-muted rounded-xl mt-3" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
        className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5 shadow-inner"
      >
        <Sparkles size={34} className="text-primary/40" />
      </motion.div>
      <h3 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
        New medicines coming soon!
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        We're stocking up on the latest medicines. Check back soon for fresh arrivals.
      </p>
    </div>
  );
}

function ArrivalCard({ item, index }: { item: Medicine; index: number }) {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.4) }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="flex-shrink-0 w-56 sm:w-64 bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:border-primary/25 transition-all duration-300 group flex flex-col"
    >
      {/* Image */}
      <div className="relative h-40 bg-gradient-to-br from-primary/5 to-secondary/5 overflow-hidden flex-shrink-0">
        <img
          src={imgErr
            ? resolveMedicineImage(null, item.categoryName)
            : resolveMedicineImage(item.imageUrl, item.categoryName)}
          alt={item.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setImgErr(true)}
        />
        {/* NEW badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-bold shadow-md">
            <Sparkles size={9} /> NEW
          </span>
          {item.prescriptionRequired && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/90 text-white backdrop-blur-sm">
              Rx
            </span>
          )}
        </div>
        <div className="absolute top-2.5 right-2.5">
          <StockBadge status={status} />
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col flex-1">
        {item.brand && <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">{item.brand}</p>}
        <h3 className="text-sm font-bold text-foreground mb-1 leading-tight line-clamp-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
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

        {/* ── Add to Cart / Qty stepper — reuses CartContext.addItem ── */}
        <div className="mt-auto pt-3">
          <AnimatePresence mode="wait" initial={false}>
            {inCart ? (
              <motion.div
                key="qty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/5 overflow-hidden"
              >
                <button onClick={handleDecrement}
                  className="flex-1 flex items-center justify-center h-9 hover:bg-primary/10 transition-colors text-primary"
                  aria-label="Decrease quantity">
                  <Minus size={14} />
                </button>
                <span className="text-sm font-bold text-primary min-w-[32px] text-center">{cartItem.quantity}</span>
                <button onClick={handleIncrement}
                  disabled={!!((item.stockQty ?? item.stockQuantity) && cartItem.quantity >= (item.stockQty ?? item.stockQuantity)!)}
                  className="flex-1 flex items-center justify-center h-9 hover:bg-primary/10 transition-colors text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Increase quantity">
                  <Plus size={14} />
                </button>
              </motion.div>
            ) : canAdd ? (
              <motion.button
                key="add"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-sm shadow-primary/20"
              >
                <ShoppingCart size={14} /> Add to Cart
              </motion.button>
            ) : (
              <motion.button
                key="request"
                initial={{ opacity: 0 }}
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
  title: "New Medicine Arrivals",
  description: "Fresh stock just landed — be the first to know about our latest medicines and health products.",
};

export default function NewArrivals() {
  const ref = useRef(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [items, setItems] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionEnabled, setSectionEnabled] = useState(true);
  const [title, setTitle] = useState(DEFAULTS.title);
  const [description, setDescription] = useState(DEFAULTS.description);

  useEffect(() => {
    // Fetch new-arrival medicines from the PostgreSQL API
    let cancelled = false;
    fetch("/api/medicines/new-arrivals?limit=20")
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

    // Admin-configurable title/description/enabled still comes from Firestore settings
    let unsubSettings: (() => void) | undefined;
    if (isFirebaseConfigured) {
      unsubSettings = subscribeToDoc("settings", "homepage", (doc) => {
        if (!doc) return;
        if (doc.newArrivalsEnabled === false) setSectionEnabled(false);
        else setSectionEnabled(true);
        if (doc.newArrivalsTitle) setTitle(doc.newArrivalsTitle as string);
        if (doc.newArrivalsDescription) setDescription(doc.newArrivalsDescription as string);
      });
    }

    return () => { cancelled = true; unsubSettings?.(); };
  }, []);

  if (!loading && !sectionEnabled) return null;

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });

  return (
    <section id="new-arrivals" ref={ref} className="py-20 lg:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
              <Sparkles size={14} /> Just Arrived
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {title}
            </h2>
            <p className="text-muted-foreground text-base max-w-xl">{description}</p>
          </div>
          {!loading && items.length > 3 && (
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => scroll("left")}
                className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => scroll("right")}
                className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {items.map((item, i) => (
              <div key={item.id} className="snap-start">
                <ArrivalCard item={item} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
