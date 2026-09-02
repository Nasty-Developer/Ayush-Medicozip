/**
 * useMedicineCounts
 *
 * Returns a map of { [categoryName]: count } for the medicine catalogue.
 * Data comes from GET /api/categories which includes the count field.
 * Replaces the previous Firestore getCountFromServer implementation.
 */

import { useCategories } from "./useCategories";

export function useMedicineCounts(): Record<string, number> {
  const { categories } = useCategories(true);
  return Object.fromEntries(
    categories
      .filter((c) => typeof c.count === "number")
      .map((c) => [c.name, c.count!])
  );
}
