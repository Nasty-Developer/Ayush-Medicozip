/**
 * MedicineDetailPage — Public route at /medicine/:id
 *
 * Shows full details for a single medicine document fetched from Firestore.
 * Includes image, name, brand, category, pricing, stock status, prescription
 * flag, description, and Add to Cart — all sourced from the same `medicines`
 * Firestore collection that drives the rest of the app.
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, ShoppingCart, Plus, Minus, Tag,
  PackageCheck, PackageX, Clock, ShieldCheck, Package,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCart } from "@/context/CartContext";
import type { CategoryMedicine } from "@/hooks/useMedicinesByCategory";
import { StockBadge, getStockStatus, MedicineSkeleton } from "@/components/medicines/MedicineCard";
import { resolveMedicineImage } from "@/lib/medicineImage";

export default function MedicineDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";

  const [medicine, setMedicine] = useState<CategoryMedicine | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [imgErr,   setImgErr]   = useState(false);

  const { addItem, items, updateQuantity, removeItem } = useCart();

  useEffect(() => {
    if (!id || !db) { setLoading(false); return; }
    setLoading(true);
    getDoc(doc(db, "medicines", id))
      .then((snap) => {
        if (snap.exists()) {
          setMedicine({ id: snap.id, ...snap.data() } as CategoryMedicine);
        }
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-64 rounded-2xl bg-muted animate-pulse mb-6" />
        <MedicineSkeleton />
      </main>
    );
  }

  if (!medicine) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Package size={48} className="mx-auto text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Medicine not found</h1>
        <p className="text-muted-foreground mb-6">
          This medicine may have been removed or is no longer available.
        </p>
        <Link
          href="/categories"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft size={15} /> Browse Medicines
        </Link>
      </main>
    );
  }

  const status   = getStockStatus(medicine);
  const maxStock = medicine.stockQty ?? medicine.stockQuantity;
  const cartItem = items.find((i) => i.medicineId === medicine.id);
  const inCart   = !!cartItem;
  const canAdd   = status === "in_stock" && !!medicine.sellingPrice;

  const handleAdd = () => {
    if (!canAdd) return;
    addItem({
      medicineId: medicine.id,
      medicineName: medicine.name,
      categoryName: medicine.categoryName,
      brandName: medicine.brand,
      unitPrice: medicine.sellingPrice!,
      prescriptionRequired: medicine.prescriptionRequired ?? false,
      imageUrl: medicine.imageUrl,
      maxStock,
    });
  };

  const handleDecrement = () => {
    if (!cartItem) return;
    cartItem.quantity <= 1 ? removeItem(medicine.id) : updateQuantity(medicine.id, cartItem.quantity - 1);
  };

  const handleIncrement = () => {
    if (!cartItem) return;
    if (maxStock && cartItem.quantity >= maxStock) return;
    updateQuantity(medicine.id, cartItem.quantity + 1);
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href={medicine.categoryName ? `/categories` : "/categories"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
                   hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back to Browse
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-card border border-border rounded-2xl overflow-hidden shadow-md"
      >
        {/* Image */}
        <div className="relative h-56 sm:h-72 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
          <img
            src={imgErr
              ? resolveMedicineImage(null, medicine.categoryName)
              : resolveMedicineImage(medicine.imageUrl, medicine.categoryName)}
            alt={medicine.name}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
          <div className="absolute top-3 right-3">
            <StockBadge status={status} />
          </div>
          {medicine.prescriptionRequired && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                               text-[10px] font-bold bg-amber-500/90 text-white">
                <ShieldCheck size={9} /> Prescription Required
              </span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-5 sm:p-7 space-y-4">
          {/* Brand + category */}
          <div className="flex flex-wrap items-center gap-2">
            {medicine.brand && (
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                {medicine.brand}
              </span>
            )}
            {medicine.categoryName && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground
                               bg-muted px-2 py-0.5 rounded-full">
                <Tag size={9} /> {medicine.categoryName}
              </span>
            )}
          </div>

          {/* Name */}
          <h1
            className="text-2xl font-bold text-foreground leading-tight"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {medicine.name}
          </h1>

          {/* Description */}
          {medicine.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {medicine.description}
            </p>
          )}

          {/* Pricing */}
          {medicine.sellingPrice ? (
            <div className="flex items-center gap-3 flex-wrap py-1">
              <span className="text-2xl font-bold text-foreground">₹{medicine.sellingPrice}</span>
              {medicine.mrp && Number(medicine.mrp) > Number(medicine.sellingPrice) && (
                <span className="text-base text-muted-foreground line-through">₹{medicine.mrp}</span>
              )}
              {medicine.discount ? (
                <span className="text-sm font-bold text-secondary bg-secondary/10 px-2 py-1 rounded-full">
                  {medicine.discount}% OFF
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Stock info */}
          {maxStock !== undefined && maxStock > 0 && (
            <p className="text-xs text-muted-foreground">
              {maxStock} unit{maxStock !== 1 ? "s" : ""} in stock
            </p>
          )}

          {/* Add to Cart */}
          <div className="pt-2">
            {inCart ? (
              <div className="flex items-center gap-0 rounded-xl border border-primary/40
                              bg-primary/5 overflow-hidden w-full sm:w-56">
                <button
                  onClick={handleDecrement}
                  className="flex-1 flex items-center justify-center h-11
                             hover:bg-primary/10 transition-colors text-primary"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="text-base font-bold text-primary min-w-[48px] text-center">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  disabled={!!(maxStock && cartItem.quantity >= maxStock)}
                  className="flex-1 flex items-center justify-center h-11
                             hover:bg-primary/10 transition-colors text-primary
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            ) : canAdd ? (
              <button
                onClick={handleAdd}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                           px-8 h-11 rounded-xl text-sm font-semibold bg-primary text-white
                           hover:bg-primary/90 active:scale-[0.98] transition-all duration-200
                           shadow-sm shadow-primary/20"
              >
                <ShoppingCart size={16} /> Add to Cart
              </button>
            ) : (
              <div className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                              px-8 h-11 rounded-xl text-sm font-medium
                              bg-muted/50 text-muted-foreground cursor-not-allowed">
                {status === "out_of_stock" ? (
                  <><PackageX size={15} /> Out of Stock</>
                ) : (
                  <><Clock size={15} /> Coming Soon</>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
