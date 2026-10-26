/**
 * FeaturedMedicines — Homepage section
 *
 * Displays medicines marked as featured=true in the Admin Panel.
 * Calls GET /api/medicines/featured.
 * Section is hidden when there are no featured medicines (returns null).
 */

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Star, PackageCheck, PackageX, Clock, ShieldCheck,
  ShoppingCart, Plus, Minus, PackageSearch, Sparkles,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRequestMedicine } from "@/context/RequestMedicineContext";
import { resolveMedicineImage } from "@/lib/medicineImage";
import { Link } from "wouter";

type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type Medicine = {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  imageUrl?: string;
  categoryName?: string;
  categoryImageUrl?: string;
  stockStatus?: StockStatus;
  available?: boolean;
  sellingPrice?: number;
  mrp?: number;
  discount?: number;
  prescriptionRequired?: boolean;
  stockQty?: number;
  stockQuantity?: number;
};

function getStockStatus(item: Medicine): StockStatus {
  if (item.stockStatus) return item.stockStatus;
  return item.available === false ? "out_of_stock" : "in_stock";
}

function StockBadge({ status }: { status: StockStatus }) {
  const map = {
    in_stock:    { label: "Available",   icon: <PackageCheck size={9} />, cls: "bg-secondary/90 text-white" },
    low_stock:   { label: "Low Stock",  icon: <PackageCheck size={9} />, cls: "bg-amber-500/90 text-white" },
    out_of_stock:{ label: "Out of Stock",icon: <PackageX size={9} />,    cls: "bg-muted/90 text-muted-foreground" },
    coming_soon: { label: "Coming Soon", icon: <Clock size={9} />,       cls: "bg-amber-500/90 text-white" },
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

function FeaturedCard({ item, index }: { item: Medicine; index: number }) {
  const [imgErr, setImgErr] = useState(false);
  const { addItem, items, updateQuantity, removeItem } = useCart();
  const status = getStockStatus(item);

  const cartItem = items.find((i) => i.medicineId === item.id);
  const inCart   = !!cartItem;
  const canAdd   = (status === "in_stock" || status === "low_stock") && !!item.sellingPrice;
  const { triggerRequest } = useRequestMedicine();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canAdd) return;
    addItem({
      medicineId:          item.id,
      medicineName:        item.name,
      categoryName:        item.categoryName,
      categoryImageUrl:    item.categoryImageUrl,
      brandName:           item.brand,
      unitPrice:           item.sellingPrice!,
      prescriptionRequired: item.prescriptionRequired ?? false,
      imageUrl:            item.imageUrl,
      maxStock:            item.stockQty ?? item.stockQuantity,
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
      className="group relative bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/15 hover:border-primary/30 transition-all duration-300 flex flex-col"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />

      {/* Image */}
      <div className="relative h-44 bg-gradient-to-br from-primary/8 to-secondary/8 overflow-hidden flex-shrink-0">
        <img
          src={imgErr
            ? resolveMedicineImage(null, null, item.categoryName)
            : resolveMedicineImage(item.imageUrl, item.categoryImageUrl, item.categoryName)}
          alt={item.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setImgErr(true)}
        />
        {/* FEATURED badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary to-blue-600 text-white text-[10px] font-bold shadow-md">
            <Star size={9} fill="currentColor" /> FEATURED
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
        {item.brand && (
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
            {item.brand}
          </p>
        )}
        <Link
          href={`/medicine/${item.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-bold text-foreground mb-1.5 leading-tight hover:text-primary transition-colors"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {item.name}
        </Link>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        {item.sellingPrice ? (
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-base font-bold text-foreground">₹{item.sellingPrice}</span>
            {item.mrp && Number(item.mrp) > Number(item.sellingPrice) && (
              <span className="text-xs text-muted-foreground line-through">₹{item.mrp}</span>
            )}
            {item.discount ? (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                {item.discount}% OFF
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary mt-2.5">
          <ShieldCheck size={11} /> Only at Ayush Medico
        </div>

        <div className="mt-auto pt-3">
          <AnimatePresence mode="wait" initial={false}>
            {inCart ? (
              <motion.div
                key="qty"
                initial={{ scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/5 overflow-hidden"
              >
                <button
                  onClick={handleDecrement}
                  className="flex-1 flex items-center justify-center h-9 hover:bg-primary/10 transition-colors text-primary"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-bold text-primary min-w-[32px] text-center">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  disabled={!!((item.stockQty ?? item.stockQuantity) && cartItem.quantity >= (item.stockQty ?? item.stockQuantity)!)}
                  className="flex-1 flex items-center justify-center h-9 hover:bg-primary/10 transition-colors text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
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
                className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-sm shadow-primary/20"
              >
                <ShoppingCart size={14} /> Add to Cart
              </motion.button>
            ) : (
              <motion.button
                key="request"
                initial={{}}
                animate={{ opacity: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerRequest(item.name, item.brand, item.categoryName);
                }}
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

export default function FeaturedMedicines() {
  const sectionRef = useRef(null);
  const inView     = useInView(sectionRef, { once: true, margin: "-60px" });

  const { data: resp, isLoading } = useQuery<{ data: Medicine[] }>({
    queryKey: ["featuredMedicines"],
    queryFn: async () => {
      const r = await fetch("/api/medicines/featured?limit=8");
      if (!r.ok) throw new Error("Failed to fetch featured medicines");
      return r.json() as Promise<{ data: Medicine[] }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const data = resp?.data ?? [];

  // Hide section entirely when empty (not loading, no data)
  if (!isLoading && data.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 mb-3">
              <Star size={12} fill="currentColor" /> Curated Picks
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Featured{" "}
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Medicines
              </span>
            </h2>
            <p className="text-muted-foreground mt-2">
              Hand-picked by our pharmacists — genuine, trusted, and ready to order.
            </p>
          </div>
          <a
            href="/categories"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors whitespace-nowrap"
          >
            <Sparkles size={14} /> View all
          </a>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {data!.map((item, i) => (
              <FeaturedCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
