/**
 * Shared placeholder images for medicines that don't have a real photo yet
 * (mainly the ~51,000 MediVision Gold imports, which never ship product
 * photography).
 *
 * Priority order when resolving what image to show:
 *  1. Real `imageUrl` stored on the Firestore document (admin upload).
 *  2. AI-generated category hero image (one per category, served as a static
 *     asset from /category-images/*.png — generated from `public/category-images/`).
 *  3. Inline SVG emoji placeholder (instant, zero network requests, used for
 *     categories that don't yet have a generated image).
 *  4. Generic medicine SVG fallback.
 *
 * Medicines that get a real `imageUrl` simply use that URL instead — the
 * placeholder chain is only reached when `imageUrl` is empty or missing.
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

/** Generic fallback used when no real image or category match is found. */
export const DEFAULT_MEDICINE_IMAGE = buildPlaceholderSvg("💊", "#0d9488", "#14b8a6");

/**
 * Category image mapping.
 *
 * `image` is either:
 *   - A path to an AI-generated PNG in /public/category-images/ (served as
 *     a static asset at /category-images/<name>.png), or
 *   - An inline SVG data URI for categories not yet covered by AI images.
 *
 * Keys are matched against a medicine's `categoryName` using case-insensitive
 * substring matching so slightly different MediVision labels (e.g.
 * "Baby Care Products" → matches "baby") still map correctly.
 */
const CATEGORY_PLACEHOLDERS: Array<{ keywords: string[]; image: string }> = [
  {
    keywords: ["baby", "infant", "neonatal"],
    image: "/category-images/baby-care.png",
  },
  {
    keywords: ["skin care", "skincare", "face wash", "moistur", "sunscreen", "complexion", "fairness", "acne", "derma"],
    image: "/category-images/skin-care.png",
  },
  {
    keywords: ["hair care", "haircare", "shampoo", "conditioner", "hair oil", "hair serum"],
    image: "/category-images/hair-care.png",
  },
  {
    keywords: ["oral care", "dental", "toothpaste", "mouthwash", "toothbrush"],
    image: "/category-images/oral-care.png",
  },
  {
    keywords: ["first aid", "bandage", "antiseptic", "wound", "dressing", "cotton", "gauze"],
    image: "/category-images/first-aid.png",
  },
  {
    keywords: ["diabet", "glucose", "glucometer", "insulin", "blood sugar"],
    image: "/category-images/diabetes-care.png",
  },
  {
    keywords: ["personal care", "toiletries", "hygiene", "soap", "deodorant", "body wash"],
    image: "/category-images/personal-care.png",
  },
  {
    keywords: ["supplement", "nutraceutical", "protein", "vitamin", "mineral", "omega", "probiotic"],
    image: "/category-images/nutrition.png",
  },
  {
    keywords: ["beverage", "ors", "rehydration", "electrolyte", "energy drink", "health drink"],
    image: "/category-images/beverages.png",
  },
  {
    keywords: ["food", "nutrition", "grocery", "cereal", "honey", "oat", "biscuit", "bread", "peanut"],
    image: "/category-images/food-nutrition.png",
  },
  {
    keywords: ["ayurved", "herbal", "homeopath", "chyawan", "unani", "siddha"],
    image: buildPlaceholderSvg("🌿", "#059669", "#34d399"),
  },
  {
    keywords: ["device", "equipment", "instrument", "thermometer", "bp monitor", "nebulizer", "oximeter", "medical device"],
    image: buildPlaceholderSvg("🩺", "#2563eb", "#60a5fa"),
  },
  {
    keywords: ["women", "female", "sanitary", "feminine", "gynae", "maternity", "menstrual"],
    image: buildPlaceholderSvg("🌸", "#ec4899", "#f9a8d4"),
  },
  {
    keywords: ["men", "shav", "beard", "masculin"],
    image: buildPlaceholderSvg("🧔", "#1d4ed8", "#93c5fd"),
  },
  {
    keywords: ["pain relief", "analgesic", "muscle", "anti-inflammatory", "nsaid", "pain"],
    image: buildPlaceholderSvg("🩹", "#dc2626", "#f87171"),
  },
  {
    keywords: ["surgical", "gloves", "mask", "sanitizer", "ppe", "sterile"],
    image: buildPlaceholderSvg("🧤", "#0891b2", "#67e8f9"),
  },
  {
    keywords: ["eye", "ear", "nasal", "ent", "ophthalm", "aural"],
    image: buildPlaceholderSvg("👁", "#7c3aed", "#c4b5fd"),
  },
  {
    keywords: ["cosmetic", "beauty", "makeup", "lipstick", "foundation"],
    image: buildPlaceholderSvg("💄", "#f43f5e", "#fb7185"),
  },
  {
    keywords: ["antibiotic", "antifungal", "antiviral", "antimicrobial", "antiparasit"],
    image: buildPlaceholderSvg("💉", "#dc2626", "#f87171"),
  },
  {
    keywords: ["cardiac", "heart", "cardio", "hypertension", "antihypertensive"],
    image: buildPlaceholderSvg("❤️", "#ef4444", "#fca5a5"),
  },
  {
    keywords: ["respiratory", "asthma", "inhaler", "bronch", "cough", "lung"],
    image: buildPlaceholderSvg("🫁", "#0284c7", "#7dd3fc"),
  },
  {
    keywords: ["gastro", "digestive", "antacid", "constipation", "laxative", "stomach", "liver"],
    image: buildPlaceholderSvg("🫁", "#16a34a", "#86efac"),
  },
  {
    keywords: ["neuro", "brain", "nerve", "sedative", "sleep", "anxiety", "psycho"],
    image: buildPlaceholderSvg("🧠", "#7c3aed", "#a78bfa"),
  },
  {
    keywords: ["thyroid", "hormone", "endocrine"],
    image: buildPlaceholderSvg("⚗️", "#0891b2", "#22d3ee"),
  },
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
