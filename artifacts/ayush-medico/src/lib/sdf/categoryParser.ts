/**
 * CATEGORY.SDF Parser
 *
 * Simple format (16 categories):
 *   "Allopathic                             1 "
 *   name left-justified, ID right-justified at end.
 */

import type { SdfCategory } from "./types";

export function parseCategoryFile(lines: string[]): SdfCategory[] {
  const categories: SdfCategory[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    // Split on whitespace — last token is the ID, rest is name
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const categoryId = parseInt(parts[parts.length - 1], 10);
    if (isNaN(categoryId)) continue;
    const name = parts.slice(0, -1).join(" ").trim();
    if (name) categories.push({ categoryId, name });
  }
  return categories;
}
