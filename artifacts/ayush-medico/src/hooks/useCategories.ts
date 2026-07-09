/**
 * useCategories
 * Real-time Firestore listener for the `categories` collection.
 * Every component that calls this hook shares the same live data —
 * when the admin creates/edits/deletes a category it propagates
 * everywhere instantly without a page refresh.
 *
 * NOTE: We intentionally do NOT use Firestore's orderBy() constraint here.
 * Firestore silently excludes any document that is missing the queried field,
 * so categories created without an `order` value (e.g. directly in the
 * Firebase Console, or by older code) would never appear in dropdowns or
 * on the homepage. Instead we fetch all documents and sort client-side,
 * defaulting missing `order` values to 0.
 */

import { useEffect, useState } from "react";
import { subscribeToCollection } from "@/lib/firestoreHelpers";

export type Category = {
  id: string;
  name: string;
  icon: string;           // emoji, or any string icon identifier
  description: string;
  color: string;          // "primary" | "secondary" | "accent" | "purple" | "orange" | "pink" | "red" | "yellow"
  order?: number;         // optional — docs without this field are sorted to the front
  enabled: boolean;       // published / visible on website
  slug?: string;
};

/**
 * @param onlyEnabled - when true, only returns categories with enabled=true
 *                      (use this on the public homepage and nav)
 */
export function useCategories(onlyEnabled = false) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToCollection(
      "categories",
      [], // No Firestore-side ordering — see note above
      (docs) => {
        // Sort client-side; docs without order field default to 0
        const all = (docs as unknown as Category[])
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setCategories(onlyEnabled ? all.filter((c) => c.enabled) : all);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // onlyEnabled is read once at mount; stable for component lifetime

  return { categories, loading };
}
