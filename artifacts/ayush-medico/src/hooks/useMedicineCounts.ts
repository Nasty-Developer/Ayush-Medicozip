/**
 * useMedicineCounts
 * Subscribes to the `medicines` Firestore collection in real-time and returns
 * a map of  { [categoryName]: count }  so the nav dropdown can display
 * how many medicines belong to each category.
 *
 * Uses the same subscribeToCollection helper as every other hook — no new
 * Firestore access pattern introduced.  Because the Header is always mounted
 * the subscription is always live, so counts update the moment an admin
 * adds / moves / removes a medicine.
 */

import { useEffect, useState } from "react";
import { subscribeToCollection } from "@/lib/firestoreHelpers";

export function useMedicineCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsub = subscribeToCollection(
      "medicines",
      [],
      (docs) => {
        const map: Record<string, number> = {};
        for (const doc of docs) {
          // Medicine documents store the category as `categoryName` (string)
          const cn = (doc["categoryName"] as string | undefined)?.trim();
          if (cn) map[cn] = (map[cn] ?? 0) + 1;
        }
        setCounts(map);
      },
      // Silently ignore errors (counts are a nice-to-have, not critical)
      () => {}
    );
    return unsub;
  }, []);

  return counts;
}
