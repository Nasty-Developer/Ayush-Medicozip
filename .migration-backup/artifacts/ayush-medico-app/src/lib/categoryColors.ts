/**
 * Shared category color palette.
 * Used by:  Categories.tsx (homepage section)
 *           CategoriesPage.tsx (public /categories route)
 *           CategoryDetailPage.tsx (public /category/:slug route)
 *
 * Keeping the palette in one place means a single edit propagates everywhere.
 */

export const CATEGORY_COLOR: Record<string, { gradient: string; light: string }> = {
  primary:   { gradient: "from-blue-500 to-blue-700",      light: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-900/20" },
  secondary: { gradient: "from-green-500 to-emerald-700",  light: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-900/20" },
  accent:    { gradient: "from-cyan-500 to-sky-700",       light: "from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-900/20" },
  purple:    { gradient: "from-purple-500 to-violet-700",  light: "from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-900/20" },
  orange:    { gradient: "from-orange-500 to-amber-600",   light: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-900/20" },
  pink:      { gradient: "from-pink-500 to-rose-600",      light: "from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-900/20" },
  red:       { gradient: "from-red-500 to-rose-700",       light: "from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-900/20" },
  yellow:    { gradient: "from-yellow-500 to-orange-600",  light: "from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-900/20" },
};

const FALLBACK_CYCLE = ["primary","secondary","accent","purple","orange","pink","red","yellow"];

export function getCategoryColors(color: string, index = 0) {
  return CATEGORY_COLOR[color] ?? CATEGORY_COLOR[FALLBACK_CYCLE[index % FALLBACK_CYCLE.length]];
}
