/**
 * useMedicinesByCategory
 * Real-time Firestore listener for medicines belonging to a single category.
 *
 * Medicines link to categories via a plain `categoryName` string field
 * (same convention used by useMedicineCounts and the Admin Medicines page).
 * This means once MediVision Gold sync populates the `medicines` collection
 * with matching `categoryName` values, medicines appear here automatically —
 * no code changes required.
 */

import { useEffect, useState } from "react";
import { subscribeToCollection, where } from "@/lib/firestoreHelpers";

export type StockStatus = "in_stock" | "out_of_stock" | "coming_soon";

export type CategoryMedicine = {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  imageUrl?: string;
  stockStatus?: StockStatus;
  available?: boolean;
  sellingPrice?: number;
  mrp?: number;
  discount?: number;
  categoryName?: string;
  order?: number;
  prescriptionRequired?: boolean;
  /** Max units available (legacy field name used by manually-added medicines) */
  stockQuantity?: number;
  /** Max units available (written by MediVision inventory sync) */
  stockQty?: number;
};

/**
 * @param categoryName  The category's `name` field (not slug/id) — the value
 *                       stored on each medicine document's `categoryName`.
 *                       Pass an empty string to skip subscribing.
 */
export function useMedicinesByCategory(categoryName: string) {
  const [medicines, setMedicines] = useState<CategoryMedicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryName) {
      setMedicines([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToCollection(
      "medicines",
      [where("categoryName", "==", categoryName)],
      (docs) => {
        // Guard against malformed documents (e.g. missing `name`) so a bad
        // Firestore doc can't crash rendering downstream.
        const valid = (docs as unknown as CategoryMedicine[]).filter(
          (m) => typeof m?.name === "string" && m.name.trim().length > 0
        );
        const sorted = valid.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setMedicines(sorted);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsub;
  }, [categoryName]);

  return { medicines, loading };
}
