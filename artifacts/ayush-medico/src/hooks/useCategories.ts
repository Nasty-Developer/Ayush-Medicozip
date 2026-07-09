/**
 * useCategories
 * Real-time Firestore listener for the `categories` collection.
 * Every component that calls this hook shares the same live data —
 * when the admin creates/edits/deletes a category it propagates
 * everywhere instantly without a page refresh.
 */

import { useEffect, useState } from "react";
import { subscribeToCollection, orderBy } from "@/lib/firestoreHelpers";

export type Category = {
  id: string;
  name: string;
  icon: string;           // emoji or custom symbol
  description: string;
  color: string;          // "primary" | "secondary" | "accent" | "purple" | "orange" | "pink"
  order: number;
  enabled: boolean;       // published / visible on website
  slug?: string;
};

/**
 * @param onlyEnabled - when true, only returns categories with enabled=true
 *                      (use this on the public homepage)
 */
export function useCategories(onlyEnabled = false) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToCollection(
      "categories",
      [orderBy("order")],
      (docs) => {
        const all = docs as unknown as Category[];
        setCategories(onlyEnabled ? all.filter((c) => c.enabled) : all);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);           // onlyEnabled is read once at mount; stable for component lifetime

  return { categories, loading };
}
