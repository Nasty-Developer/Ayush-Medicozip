/**
 * MedicineCard — shared presentational components for medicine grids.
 *
 * Exported:
 *   MedicineCard       — animated card for a single medicine (with Add to Cart)
 *   MedicineSkeleton   — placeholder used while medicines are loading
 *   StockBadge         — coloured pill showing in_stock / out_of_stock / coming_soon
 *   getStockStatus     — normalises a medicine document into a StockStatus value
 *
 * Used by:
 *   CategoriesPage     (Browse Medicines unified page)
 *   CategoryDetailPage (legacy /category/:slug route, kept for direct links)
 *
 * Keeping these components here means a UI change propagates everywhere
 * automatically — no need to edit multiple page files.
 */

import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PackageCheck, PackageX, Clock, ShoppingCart, Plus, Minus, Eye } from "lucide-react";
import type { CategoryMedicine, StockStatus } from "@/hooks/useMedicinesByCategory";
import { useCart } from "@/context/CartContext";

/** Resolve max-stock from either Firestore field name convention. */
function resolveMaxStock(item: CategoryMedicine): number | undefined {
  return item.stockQty ?? item.stockQuantity;
}

export type { CategoryMedicine, StockStatus };

// ─── Stock status helper ──────────────────────────────────────────────────────
// Note: exported as a named function but kept here so MedicineCard can use it.
// Vite Fast Refresh allows non-component exports when the file also exports
// named components (this causes a full-page reload instead of hot swap in dev,
// which is acceptable).

export function getStockStatus(item: CategoryMedicine): StockStatus {
  if (item.stockStatus) return item.stockStatus;
  return item.available === false ? "out_of_stock" : "in_stock";
}

// ─── StockBadge ───────────────────────────────────────────────────────────────

export function StockBadge({ status }: { status: StockStatus }) {
  const map = {
    in_stock:     { label: "In Stock",     icon: <PackageCheck size={9} />, cls: "bg-secondary/90 text-white" },
    out_of_stock: { label: "Out of Stock", icon: <PackageX     size={9} />, cls: "bg-muted/90 text-muted-foreground" },
    coming_soon:  { label: "Coming Soon",  icon: <Clock        size={9} />, cls: "bg-amber-500/90 text-white" },
  };
  const { label, icon, cls } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  text-[10px] font-semibold backdrop-blur-sm ${cls}`}
    >
      {icon} {label}
    </span>
  );
}

// ─── MedicineSkeleton ─────────────────────────────────────────────────────────

export function MedicineSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="h-40 bg-muted" />
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

// ─── MedicineCard ─────────────────────────────────────────────────────────────

interface MedicineCardProps {
  item: CategoryMedicine;
  /** Index within the current grid — drives staggered entrance delay. */
  index: number;
}

export function MedicineCard({ item, index }: MedicineCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const { addItem, items, updateQuantity, removeItem } = useCart();
  const status = getStockStatus(item);

  const cartItem = items.find((i) => i.medicineId === item.id);
  const inCart = !!cartItem;
  const canAdd = status === "in_stock" && !!item.sellingPrice;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canAdd) return;
    addItem({
      medicineId: item.id,
      medicineName: item.name,
      categoryName: item.categoryName,
      brandName: item.brand,
      unitPrice: item.sellingPrice!,
      prescriptionRequired: item.prescriptionRequired ?? false,
      imageUrl: item.imageUrl,
      maxStock: resolveMaxStock(item),
    });
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cartItem) return;
    if (cartItem.quantity <= 1) {
      removeItem(item.id);
    } else {
      updateQuantity(item.id, cartItem.quantity - 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cartItem) return;
    const max = resolveMaxStock(item);
    if (max && cartItem.quantity >= max) return;
    updateQuantity(item.id, cartItem.quantity + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.32) }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="group bg-card border border-border rounded-2xl overflow-hidden shadow-sm
                 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/25
                 transition-all duration-300 flex flex-col"
    >
      {/* Image / placeholder */}
      <div className="relative h-40 bg-gradient-to-br from-primary/5 to-secondary/5 overflow-hidden flex-shrink-0">
        {item.imageUrl && !imgErr ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary
                            flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">{item.name.charAt(0)}</span>
            </div>
          </div>
        )}
        <div className="absolute top-2.5 right-2.5">
          <StockBadge status={status} />
        </div>
        {item.prescriptionRequired && (
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full
                             text-[9px] font-bold bg-amber-500/90 text-white backdrop-blur-sm">
              Rx
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col flex-1">
        {item.brand && (
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">
            {item.brand}
          </p>
        )}
        <h3
          className="text-sm font-bold text-foreground mb-1 leading-tight line-clamp-2"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {item.name}
        </h3>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        {item.categoryName && (
          <p className="text-[10px] text-muted-foreground/60 mt-1 truncate">
            {item.categoryName}
          </p>
        )}

        {/* Price row */}
        {item.sellingPrice ? (
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-base font-bold text-foreground">₹{item.sellingPrice}</span>
            {item.mrp && Number(item.mrp) > Number(item.sellingPrice) && (
              <span className="text-xs text-muted-foreground line-through">₹{item.mrp}</span>
            )}
            {item.discount ? (
              <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full">
                {item.discount}% OFF
              </span>
            ) : null}
          </div>
        ) : null}

        {/* ── View Details link ── */}
        <Link
          href={`/medicine/${item.id}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 w-full flex items-center justify-center gap-1.5 h-8 rounded-xl
                     text-xs font-semibold text-primary border border-primary/30
                     hover:bg-primary/5 hover:border-primary/60 transition-all duration-200"
        >
          <Eye size={12} /> View Details
        </Link>

        {/* ── Add to Cart / Quantity controls ── */}
        <div className="mt-2 pt-0">
          <AnimatePresence mode="wait" initial={false}>
            {inCart ? (
              /* Inline quantity stepper */
              <motion.div
                key="qty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between rounded-xl border border-primary/40
                           bg-primary/5 overflow-hidden"
              >
                <button
                  onClick={handleDecrement}
                  className="flex-1 flex items-center justify-center h-9
                             hover:bg-primary/10 transition-colors text-primary"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-bold text-primary min-w-[32px] text-center">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  disabled={!!((resolveMaxStock(item) ?? 0) > 0 && cartItem.quantity >= resolveMaxStock(item)!)}
                  className="flex-1 flex items-center justify-center h-9
                             hover:bg-primary/10 transition-colors text-primary
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </motion.div>
            ) : canAdd ? (
              /* Add to Cart button */
              <motion.button
                key="add"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-xl
                           text-sm font-semibold bg-primary text-white
                           hover:bg-primary/90 active:scale-[0.98] transition-all duration-200
                           shadow-sm shadow-primary/20"
              >
                <ShoppingCart size={14} /> Add to Cart
              </motion.button>
            ) : (
              /* Unavailable */
              <motion.div
                key="unavail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full flex items-center justify-center h-9 rounded-xl
                           bg-muted/50 text-muted-foreground text-sm font-medium cursor-not-allowed"
              >
                {status === "out_of_stock" ? "Out of Stock" : "Unavailable"}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
