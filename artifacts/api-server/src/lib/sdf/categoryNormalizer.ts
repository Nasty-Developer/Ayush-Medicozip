/**
 * categoryNormalizer.ts
 *
 * Maps raw MediVision Gold SDF category names (ALL CAPS clinical labels from
 * PRODUCT.SDF field 105-135) + optional product/company name signals to clean,
 * consumer-friendly category names used throughout the Ayush Medico catalogue.
 *
 * Called during SDF import — every medicine's categoryName is normalised before
 * being stored in PostgreSQL.
 */

// ── Consumer category names (single source of truth) ─────────────────────────

export const CATEGORY_NAMES = {
  GENERAL:       "General Medicines",
  ORAL_CARE:     "Oral Care",
  SKIN_CARE:     "Skin Care",
  HAIR_CARE:     "Hair Care",
  BABY_CARE:     "Baby Care",
  FOOD_NUTRITION:"Food & Nutrition",
  PROTEIN:       "Protein Powder",
  HEALTH_DRINKS: "Health Drinks",
  MEDICAL_DEVICES:"Medical Devices",
  AYURVEDIC:     "Ayurvedic",
  PERSONAL_CARE: "Personal Care",
  WOMENS_CARE:   "Women's Care",
  DIABETES_CARE: "Diabetes Care",
  FIRST_AID:     "First Aid",
  SUPPLEMENTS:   "Supplements",
  COSMETICS:     "Cosmetics",
  EYE_EAR_NASAL: "Eye/Ear/Nasal Care",
  CARDIAC_CARE:  "Cardiac Care",
  RESPIRATORY:   "Respiratory Care",
  GASTRO_CARE:   "Gastro Care",
  PAIN_RELIEF:   "Pain Relief",
} as const;

type ConsumerCategory = typeof CATEGORY_NAMES[keyof typeof CATEGORY_NAMES];

// ── Category-name → consumer bucket (raw SDF category → clean name) ───────────

const CATEGORY_MAP: Array<{ keywords: string[]; target: ConsumerCategory }> = [
  // Oral Care
  { keywords: ["oral care","dental","toothpaste","mouthwash","toothbrush","oral hygiene","dentifrice"], target: CATEGORY_NAMES.ORAL_CARE },
  // Skin Care
  { keywords: ["skin care","skincare","dermatology","derma","moisturizer","sunscreen","fairness","face wash","complexion","acne","eczema","psoriasis","topical steroid","antifungal cream"], target: CATEGORY_NAMES.SKIN_CARE },
  // Hair Care
  { keywords: ["hair care","haircare","shampoo","conditioner","hair oil","hair serum","dandruff","alopecia","scalp"], target: CATEGORY_NAMES.HAIR_CARE },
  // Baby Care
  { keywords: ["baby care","baby product","infant","neonatal","paediatric","pediatric","baby powder","baby oil","baby lotion","baby food","child care"], target: CATEGORY_NAMES.BABY_CARE },
  // Protein Powder
  { keywords: ["protein","whey","casein","mass gainer","protinex","ensure","pediasure","complan","health food supplement"], target: CATEGORY_NAMES.PROTEIN },
  // Health Drinks
  { keywords: ["health drink","ors","oral rehydration","electrolyte","energy drink","glucose powder","dextrose","sports drink","glucon","rehydration"], target: CATEGORY_NAMES.HEALTH_DRINKS },
  // Food & Nutrition
  { keywords: ["food product","food supplement","nutrition","honey","cereal","oat","biscuit","bread","peanut butter","nutrition bar","health bar","soup mix","flour","oil","ghee","sugar free","diabetic food"], target: CATEGORY_NAMES.FOOD_NUTRITION },
  // Supplements
  { keywords: ["vitamin","mineral supplement","calcium","multivitamin","omega","probiotic","prebiotic","nutraceutical","dietary supplement","zinc","iron supplement","folic acid","coenzyme"], target: CATEGORY_NAMES.SUPPLEMENTS },
  // Medical Devices
  { keywords: ["medical device","equipment","glucometer","bp monitor","blood pressure monitor","thermometer","nebulizer","oximeter","pulse oximeter","weighing scale","lancet","surgical instrument","stethoscope","heating pad","hot water bag","ice pack"], target: CATEGORY_NAMES.MEDICAL_DEVICES },
  // Ayurvedic
  { keywords: ["ayurvedic","herbal","homeopathic","homeopath","unani","siddha","chyawanprash","ashwagandha","triphala","brahmi","patanjali","dabur herb","baidyanath","zandu","himalaya herb","natural medicine","ayush"], target: CATEGORY_NAMES.AYURVEDIC },
  // Women's Care
  { keywords: ["women","female","sanitary","feminine","menstrual","gynae","gynaecology","obstetric","maternity","pregnancy","lactation","contraceptive","oral contraceptive","pcod","pcos","menopause"], target: CATEGORY_NAMES.WOMENS_CARE },
  // Diabetes Care
  { keywords: ["diabetes","diabetic","antidiabetic","insulin","metformin","blood sugar","hyperglycemia","glucophage","glycemic"], target: CATEGORY_NAMES.DIABETES_CARE },
  // First Aid
  { keywords: ["first aid","bandage","antiseptic","wound","dressing","cotton","gauze","adhesive plaster","band aid","iodine","hydrogen peroxide","suture","wound care"], target: CATEGORY_NAMES.FIRST_AID },
  // Cosmetics & Beauty
  { keywords: ["cosmetic","beauty","makeup","lipstick","foundation","kajal","eyeliner","mascara","nail polish","compact","blush","concealer","bb cream"], target: CATEGORY_NAMES.COSMETICS },
  // Personal Care
  { keywords: ["personal care","soap","body wash","deodorant","antiperspirant","toilet","toiletries","hygiene","cologne","perfume","face scrub","body scrub","loofah","tissue","wet wipe","sanitary wipe","hand sanitizer","liquid hand wash"], target: CATEGORY_NAMES.PERSONAL_CARE },
  // Eye/Ear/Nasal
  { keywords: ["eye","ear","nasal","ophthalmic","ophthalmology","ent","aural","otic","rhinitis","decongestant nasal","eye drop","ear drop","nasal spray","sinusitis","conjunctivitis"], target: CATEGORY_NAMES.EYE_EAR_NASAL },
  // Cardiac
  { keywords: ["cardiac","cardiology","heart","antihypertensive","hypertension","anti-hypertensive","beta blocker","calcium channel","ace inhibitor","arb","statins","cholesterol","lipid","digoxin","diuretic cardiac","atrial","ventricular"], target: CATEGORY_NAMES.CARDIAC_CARE },
  // Respiratory
  { keywords: ["respiratory","pulmonology","asthma","inhaler","bronchodilator","bronchitis","cough","expectorant","antitussive","mucol","lung","copd","anti-asthmatic","nebulization"], target: CATEGORY_NAMES.RESPIRATORY },
  // Gastro Care
  { keywords: ["gastro","gastrointestinal","digestive","antacid","ppi","proton pump","laxative","constipation","diarrhoea","antiemetic","antiemetic","liver","hepatic","antispasmodic","antidiarrheal","gut","ibs","gastritis","ulcer","probiotic digestive"], target: CATEGORY_NAMES.GASTRO_CARE },
  // Pain Relief
  { keywords: ["analgesic","nsaid","anti-inflammatory","pain relief","pain management","musculoskeletal","muscle relaxant","antipyretic","paracetamol","ibuprofen","diclofenac","nimesulide","topical analgesic","pain gel"], target: CATEGORY_NAMES.PAIN_RELIEF },
];

// ── Product/company name override rules ───────────────────────────────────────
// Applied when the SDF category is vague (e.g. "GENERAL","MISC","OTHERS") or blank.

const PRODUCT_OVERRIDES: Array<{ patterns: RegExp[]; target: ConsumerCategory }> = [
  // Oral Care by brand/product name
  { patterns: [/\bCOLGATE\b/i, /\bORAL.?B\b/i, /\bCLOSEUP\b/i, /\bSENSODYNE\b/i, /\bPEPSODENT\b/i, /\bLISTERINE\b/i, /\bDENTAL\b/i, /\bTOOTHPASTE\b/i, /\bMOUTHWASH\b/i, /\bTOOTH\s*GEL\b/i], target: CATEGORY_NAMES.ORAL_CARE },
  // Baby Care by brand/product name
  { patterns: [/\bJOHNSON\b/i, /\bHUGGIES\b/i, /\bPAMPERS\b/i, /\bBORN\s*BABY\b/i, /\bBIOTEQUE\s*BABY\b/i, /\bBABY\b/i, /\bINFANT\b/i], target: CATEGORY_NAMES.BABY_CARE },
  // Skin Care by brand/product name
  { patterns: [/\bCETAPHIL\b/i, /\bNIVEA\b/i, /\bLACTO\s*CALAMINE\b/i, /\bOLAY\b/i, /\bLORÉAL\b/i, /\bLOREAL\b/i, /\bNEUTROGENA\b/i, /\bPONDS\b/i, /\bFAIR\s*&\s*LOVELY\b/i, /\bGLOW\s*&\s*LOVELY\b/i, /\bVAZELINE\b/i, /\bVASELINE\b/i], target: CATEGORY_NAMES.SKIN_CARE },
  // Hair Care by brand/product name
  { patterns: [/\bHEAD\s*&\s*SHOULDERS\b/i, /\bPANTENE\b/i, /\bDOVE\s*SHAMPOO\b/i, /\bGARNIER\s*HAIR\b/i, /\bKERASTASE\b/i, /\bCHINT\b/i, /\bHAIR\s*OIL\b/i, /\bSHAMPOO\b/i, /\bKESHI?\b/i], target: CATEGORY_NAMES.HAIR_CARE },
  // Food & Nutrition by brand/product name
  { patterns: [/\bHONEY\b/i, /\bDABUR\s*HONEY\b/i, /\bPATANJALI\s*HONEY\b/i, /\bHORL?ICKS\b/i, /\bBOURNVITA\b/i, /\bMALTOVA\b/i, /\bOVALTINE\b/i, /\bBOOST\s*DRINK\b/i, /\bMILO\b/i, /\bQUICKER\s*OATS\b/i, /\bQUAKER\b/i, /\bCORNFLAKES\b/i], target: CATEGORY_NAMES.FOOD_NUTRITION },
  // Protein by brand/product name
  { patterns: [/\bPROTINEX\b/i, /\bENSURE\b/i, /\bPEDIASURE\b/i, /\bCOMP?LAN\b/i, /\bMUSCLEBLAZE\b/i, /\bGAINS\s*BLAZE\b/i, /\bGNC\s*PRO\b/i, /\bWHEY\b/i, /\bPROTEIN\s*POWDER\b/i, /\bPROTEIN\s*SHAKE\b/i], target: CATEGORY_NAMES.PROTEIN },
  // Health Drinks
  { patterns: [/\bGLUCON[\s-]?D\b/i, /\bELECTRAL\b/i, /\bORS\b/i, /\bJEEV?ANI\b/i, /\bWELLADE\b/i, /\bENERGY\s*DRINK\b/i, /\bSPORTS\s*DRINK\b/i, /\bREHYDRATION\b/i], target: CATEGORY_NAMES.HEALTH_DRINKS },
  // Medical Devices
  { patterns: [/\bGLUCOMETER\b/i, /\bBP\s*MONITOR\b/i, /\bBLOOD\s*PRESSURE\s*MONITOR\b/i, /\bTHERMOMETER\b/i, /\bNEBULIZER\b/i, /\bPULSE\s*OXI\b/i, /\bSPO2\b/i, /\bDIGITAL\s*SCALE\b/i, /\bWEIGHING\s*MACHINE\b/i, /\bHOT\s*WATER\s*BAG\b/i, /\bICE\s*BAG\b/i], target: CATEGORY_NAMES.MEDICAL_DEVICES },
  // Ayurvedic by brand
  { patterns: [/\bPATANJALI\b/i, /\bDABUR\b/i, /\bZANDU\b/i, /\bBAIDYANATH\b/i, /\bHIMALAYA\b/i, /\bKERALA\s*AYURVED\b/i, /\bVASU\s*AYURVED\b/i, /\bCHYAWANPRASH\b/i, /\bASHWAGANDHA\b/i, /\bTULSI\b/i, /\bTRIPHALA\b/i, /\bARYAVAIDYASHALA\b/i, /\bSESH?ASAYI\b/i], target: CATEGORY_NAMES.AYURVEDIC },
  // Personal Care by brand/product
  { patterns: [/\bSOAP\b/i, /\bBODY\s*WASH\b/i, /\bDETTOL\b/i, /\bLIFEBUOY\b/i, /\bDOVE\b/i, /\bPEARS\b/i, /\bLUX\b/i, /\bSAVLON\b/i, /\bDEODORANT\b/i, /\bBODY\s*SPRAY\b/i, /\bSANITIZER\b/i], target: CATEGORY_NAMES.PERSONAL_CARE },
  // Cosmetics
  { patterns: [/\bLIPSTICK\b/i, /\bFOUNDATION\b/i, /\bKAJAL\b/i, /\bEYELINER\b/i, /\bCOMPACT\b/i, /\bMAYBELLINE\b/i, /\bREVLON\b/i, /\bLAKME\b/i, /\bNYKAA\b/i, /\bFLORMAR\b/i, /\bMAKEUP\b/i], target: CATEGORY_NAMES.COSMETICS },
  // Diabetes Care
  { patterns: [/\bGLUCOMETER\b/i, /\bDIABETIC\b/i, /\bINSULIN\b/i, /\bLANCET\b/i, /\bTEST\s*STRIP\b/i, /\bBLOOD\s*SUGAR\b/i], target: CATEGORY_NAMES.DIABETES_CARE },
  // Women's Care
  { patterns: [/\bSTAYFREE\b/i, /\bWHISPER\b/i, /\bSOFTEX\b/i, /\bLIBESSE\b/i, /\bSANITARY\b/i, /\bMENSTRUAL\b/i, /\bFEMININE\b/i, /\bFEMININE\s*HYGIENE\b/i, /\bGYNAE\b/i, /\bORAL\s*CONTRA\b/i], target: CATEGORY_NAMES.WOMENS_CARE },
];

// ── Normalisation function ────────────────────────────────────────────────────

/**
 * normalizeCategory
 *
 * Given the raw SDF category name, product name, and company name, return
 * the consumer-friendly category name for the Ayush Medico catalogue.
 *
 * Resolution order:
 *  1. Direct match from raw category name → CATEGORY_MAP
 *  2. Product + company name pattern → PRODUCT_OVERRIDES (when category is
 *     blank, "GENERAL", "MISC", "OTHERS", or an unmapped clinical label)
 *  3. Falls back to "General Medicines" (never leaves a medicine uncategorized)
 */
export function normalizeCategory(
  rawCategory: string,
  productName = "",
  companyName = "",
): string {
  const catLower = rawCategory.trim().toLowerCase();

  // 1. Try category name match
  for (const entry of CATEGORY_MAP) {
    if (entry.keywords.some((kw) => catLower.includes(kw))) {
      return entry.target;
    }
  }

  // 2. Try product / company name signal
  const nameLower = `${productName} ${companyName}`.toLowerCase();
  for (const entry of PRODUCT_OVERRIDES) {
    if (entry.patterns.some((re) => re.test(nameLower))) {
      return entry.target;
    }
  }

  // 3. Default — already a clinical drug, fits "General Medicines"
  return CATEGORY_NAMES.GENERAL;
}

/**
 * Returns the canonical category display name for a given slug or raw name.
 * Used in the API to look up a category by partial name when slugs differ.
 */
export function allCategoryNames(): string[] {
  return Object.values(CATEGORY_NAMES);
}
