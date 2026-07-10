/**
 * MedicineCard — shared presentational components for medicine grids.
 *
 * Exported:
 *   MedicineCard       — animated card for a single medicine
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
import { motion } from "framer-motion";
import { PackageCheck, PackageX, Clock } from "lucide-react";
import type { CategoryMedicine, StockStatus } from "@/hooks/useMedicinesByCategory";

export type { CategoryMedicine, StockStatus };

// ─── Stock status helper ──────────────────────────────────────────────────────

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
  const status = getStockStatus(item);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.32) }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="group bg-card border border-border rounded-2xl overflow-hidden shadow-sm
                 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/25
                 transition-all duration-300"
    >
      {/* Image / placeholder */}
      <div className="relative h-40 bg-gradient-to-br from-primary/5 to-secondary/5 overflow-hidden">
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
      </div>

      {/* Details */}
      <div className="p-4">
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
      </div>
    </motion.div>
  );
}
