/**
 * medicineImage.ts
 *
 * Shared image resolution for medicines that don't have a real product photo.
 *
 * Priority order when resolving what image to show for a medicine:
 *  1. Real `imageUrl` stored on the medicine record (admin-uploaded, Cloudinary URL).
 *  2. Category `imageUrl` stored in the categories table (admin-uploaded per category).
 *  3. Static AI-generated PNG from /category-images/ — matched by category name.
 *  4. Inline SVG emoji placeholder — zero network, instant, for unrecognised categories.
 *  5. Generic medicine capsule SVG fallback.
 *
 * Admin-managed flags (featured, special, newArrival) can have their own imageUrl
 * — those still flow through priority 1.
 */

// ── Static category image mapping ────────────────────────────────────────────
// Maps keyword patterns against the category name to pick a pre-generated PNG.
// Order matters — first match wins.

const CATEGORY_IMAGES: Array<{ keywords: string[]; image: string }> = [
  { keywords: ["baby", "infant", "neonatal", "paediatric", "pediatric"],       image: "/category-images/baby-care.png"       },
  { keywords: ["oral care", "dental", "toothpaste", "mouthwash", "toothbrush"], image: "/category-images/oral-care.png"       },
  { keywords: ["skin care", "skincare", "derma", "moistur", "sunscreen", "fairness", "acne", "complexion"], image: "/category-images/skin-care.png" },
  { keywords: ["hair care", "haircare", "shampoo", "conditioner", "hair oil", "scalp"],                     image: "/category-images/hair-care.png" },
  { keywords: ["first aid", "bandage", "antiseptic", "wound", "dressing", "gauze"],                         image: "/category-images/first-aid.png" },
  { keywords: ["diabet", "glucomet", "insulin", "blood sugar"],                image: "/category-images/diabetes-care.png"   },
  { keywords: ["personal care", "soap", "deodorant", "body wash", "hygiene", "sanitizer"], image: "/category-images/personal-care.png" },
  { keywords: ["supplement", "vitamin", "mineral", "calcium", "omega", "probiotic", "nutraceutical"], image: "/category-images/nutrition.png" },
  { keywords: ["ors", "rehydration", "electrolyte", "health drink", "sports drink", "energy drink", "glucon"], image: "/category-images/beverages.png" },
  { keywords: ["food", "nutrition", "honey", "cereal", "oat", "biscuit", "horlicks", "bournvita"],          image: "/category-images/food-nutrition.png" },
  { keywords: ["protein", "whey", "casein", "protinex", "ensure", "pediasure", "mass gainer"],              image: "/category-images/protein-powder.png" },
  { keywords: ["ayurved", "herbal", "homeopath", "unani", "siddha", "chyawan", "patanjali", "dabur"],       image: "/category-images/ayurvedic.png"       },
  { keywords: ["medical device", "equipment", "thermometer", "bp monitor", "nebulizer", "oximeter", "glucometer", "weighing"], image: "/category-images/medical-devices.png" },
  { keywords: ["women", "female", "sanitary", "feminine", "gynae", "menstrual", "maternity", "obstetric"],  image: "/category-images/women-care.png"      },
  { keywords: ["cosmetic", "beauty", "makeup", "lipstick", "foundation", "kajal", "mascara"],               image: "/category-images/cosmetics.png"       },
  { keywords: ["eye", "ear", "nasal", "ophthalm", "aural", "otic", "ent", "rhinitis", "sinusitis"],        image: "/category-images/eye-ear-nasal.png"   },
  { keywords: ["cardiac", "heart", "cardio", "antihypertensive", "hypertension", "cholesterol", "statin"],  image: "/category-images/cardiac-care.png"    },
  { keywords: ["respiratory", "asthma", "inhaler", "bronch", "cough", "copd", "lung"],                     image: "/category-images/respiratory.png"     },
  { keywords: ["gastro", "digestive", "antacid", "laxative", "constipation", "diarrhoea", "liver", "ulcer", "ibs"], image: "/category-images/gastro-care.png" },
  { keywords: ["pain relief", "analgesic", "nsaid", "anti-inflammatory", "muscle relaxant", "antipyretic"],  image: "/category-images/pain-relief.png"    },
  // Surgical / medical consumables
  { keywords: ["surgical", "surgicals", "gloves", "mask", "ppe", "sterile", "suture", "cannula"], image: "/category-images/first-aid.png" },
  // Homeopathic / Unani
  { keywords: ["homeopathic", "homeopath", "unani", "unani medicine"], image: "/category-images/ayurvedic.png" },
  // IV fluids / infusion
  { keywords: ["iv fluid", "intravenous", "infusion", "saline", "dextrose fluid"], image: "/category-images/general-medicines.png" },
  // General medicines / clinical catch-all (also handles raw SDF names)
  { keywords: ["allopathic", "allopathy", "general medicines", "general", "generics", "antibiotic", "anti-infective", "antifungal", "antiviral", "antimicrobial", "antihistamine", "banned drug", "nrx", "tuberculosis", "veternery", "veterinary"], image: "/category-images/general-medicines.png" },
];

// ── SVG emoji fallback builder ─────────────────────────────────────────────────

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

/** Generic capsule fallback — used when no category match is found at all. */
export const DEFAULT_MEDICINE_IMAGE = buildPlaceholderSvg("💊", "#0d9488", "#14b8a6");

// ── Public API ────────────────────────────────────────────────────────────────

/** True when a medicine record has no real uploaded photo. */
export function needsPlaceholderImage(imageUrl?: string | null): boolean {
  return !imageUrl || imageUrl.trim().length === 0;
}

/**
 * Pick a static category PNG (or SVG fallback) by matching the category name
 * against keyword patterns.  Used as priority 3 when neither the medicine nor
 * the category has an admin-uploaded image.
 */
export function resolveCategoryPlaceholder(categoryName?: string | null): string {
  if (!categoryName) return DEFAULT_MEDICINE_IMAGE;
  const norm = categoryName.toLowerCase();
  for (const entry of CATEGORY_IMAGES) {
    if (entry.keywords.some((kw) => norm.includes(kw))) return entry.image;
  }
  return DEFAULT_MEDICINE_IMAGE;
}

/**
 * resolveMedicineImage
 *
 * Resolve the image URL to display for a medicine card/detail page.
 *
 * @param imageUrl         Medicine-level imageUrl (admin-uploaded per product)
 * @param categoryImageUrl Category-level imageUrl (admin-uploaded per category)
 * @param categoryName     Category display name — used for keyword-based PNG fallback
 */
export function resolveMedicineImage(
  imageUrl?: string | null,
  categoryImageUrl?: string | null,
  categoryName?: string | null,
): string {
  // 1. Medicine-level real photo
  if (imageUrl && imageUrl.trim().length > 0) return imageUrl;
  // 2. Admin-set category image (from DB)
  if (categoryImageUrl && categoryImageUrl.trim().length > 0) return categoryImageUrl;
  // 3. Keyword-matched static PNG or SVG fallback
  return resolveCategoryPlaceholder(categoryName);
}
