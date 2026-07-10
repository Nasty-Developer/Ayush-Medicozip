/**
 * useCategories
 * Real-time Firestore listener for the `categories` collection.
 * Every consumer gets the same live data — any admin change propagates
 * instantly everywhere without a page refresh.
 *
 * WHY no Firestore orderBy():
 * Firestore silently excludes documents that are missing the queried field.
 * Categories created without an `order` value (e.g. directly in Firebase
 * Console, or by older code) would never appear. We fetch all docs and sort
 * client-side instead, defaulting missing values to 0.
 */

import { useEffect, useState } from "react";
import { subscribeToCollection } from "@/lib/firestoreHelpers";

export type Category = {
  id: string;
  name: string;
  icon: string;       // emoji or any string icon identifier
  description: string;
  color: string;      // "primary" | "secondary" | "accent" | "purple" | …
  order?: number;     // optional — docs without this field sort to the front
  enabled: boolean;   // true = published / visible on the public website
  slug?: string;
};

/**
 * @param onlyEnabled  When true, only returns categories with enabled=true.
 *                     Use this for the public homepage, nav, and filters.
 */
export function useCategories(onlyEnabled = false) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsub = subscribeToCollection(
      "categories",
      [], // No Firestore-side ordering — see note above
      (docs) => {
        const all = (docs as unknown as Category[])
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setCategories(onlyEnabled ? all.filter((c) => c.enabled) : all);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Firestore returned an error (e.g. permission denied, offline).
        // Surface it so callers can show a meaningful state instead of
        // silently showing an empty list.
        console.warn("[useCategories] Firestore error:", err.message);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  // onlyEnabled is intentionally excluded: it's a stable literal at every
  // call-site (true or false), so the closure captures the correct value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { categories, loading, error };
}
