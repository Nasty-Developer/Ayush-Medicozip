/**
 * Shared placeholder images for medicines that don't have a real photo yet
 * (mainly the ~51,000 MediVision Gold imports, which never ship product
 * photography).
 *
 * These are inline SVG data URIs — not files on disk — so every imported
 * medicine "shares" one of a handful of assets with zero extra network
 * requests and no per-medicine image files to manage.
 *
 * Any medicine that gets a real `imageUrl` (manual admin entry, or an
 * admin uploading a photo for a MediVision medicine) simply uses that URL
 * instead — placeholders are only ever a fallback, chosen automatically
 * by the medicine's `categoryName`.
 */

function buildPlaceholderSvg(emoji: string, colorFrom: string, colorTo: string): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorFrom}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${colorTo}" stop-opacity="0.06"/>
    </linearGradient>
    <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorFrom}"/>
      <stop offset="100%" stop-color="${colorTo}"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#bg)"/>
  <circle cx="100" cy="100" r="46" fill="url(#badge)"/>
  <text x="100" y="118" font-size="50" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
</svg>
`.trim();
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

/** Generic fallback used for the "Medicines" category and anything unmapped. */
export const DEFAULT_MEDICINE_IMAGE = buildPlaceholderSvg("💊", "#0d9488", "#14b8a6");

/**
 * Category-specific placeholders. Keys are matched against a medicine's
 * `categoryName` using case-insensitive substring matching (see
 * `resolveCategoryPlaceholder`), so slightly different MediVision category
 * labels (e.g. "Baby Care Products") still map correctly.
 */
const CATEGORY_PLACEHOLDERS: Array<{ keywords: string[]; image: string }> = [
  { keywords: ["food", "nutrition"], image: buildPlaceholderSvg("🍎", "#16a34a", "#4ade80") },
  { keywords: ["baby"], image: buildPlaceholderSvg("🍼", "#f472b6", "#60a5fa") },
  { keywords: ["personal care", "toiletries", "hygiene"], image: buildPlaceholderSvg("🧴", "#8b5cf6", "#a78bfa") },
  { keywords: ["cosmetic", "beauty"], image: buildPlaceholderSvg("💄", "#f43f5e", "#fb7185") },
  { keywords: ["device", "equipment", "instrument"], image: buildPlaceholderSvg("🩺", "#2563eb", "#60a5fa") },
  { keywords: ["ayurved", "herbal", "homeopath"], image: buildPlaceholderSvg("🌿", "#059669", "#34d399") },
  { keywords: ["diabet"], image: buildPlaceholderSvg("🩸", "#dc2626", "#f87171") },
  { keywords: ["supplement", "nutraceutical", "protein", "vitamin"], image: buildPlaceholderSvg("🧪", "#d97706", "#fbbf24") },
];

/** Pick the best placeholder image for a given category name. */
export function resolveCategoryPlaceholder(categoryName?: string | null): string {
  if (!categoryName) return DEFAULT_MEDICINE_IMAGE;
  const norm = categoryName.toLowerCase();
  for (const entry of CATEGORY_PLACEHOLDERS) {
    if (entry.keywords.some((kw) => norm.includes(kw))) return entry.image;
  }
  return DEFAULT_MEDICINE_IMAGE;
}

/** True when a medicine document has no real uploaded photo. */
export function needsPlaceholderImage(imageUrl?: string | null): boolean {
  return !imageUrl || imageUrl.trim().length === 0;
}

/**
 * Resolve the image to show for a medicine — real photo if present,
 * otherwise a category-appropriate placeholder (falls back to the
 * generic medicine placeholder when the category has no dedicated art
 * or isn't provided).
 */
export function resolveMedicineImage(imageUrl?: string | null, categoryName?: string | null): string {
  return needsPlaceholderImage(imageUrl) ? resolveCategoryPlaceholder(categoryName) : (imageUrl as string);
}
