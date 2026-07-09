/**
 * Static medicine name catalog — used ONLY as an offline fallback
 * when the OpenFDA API is unavailable. Categories are intentionally
 * omitted; all real category data comes from Firestore.
 */
export interface MedicineItem {
  name: string;
}

export const medicineCatalog: MedicineItem[] = [
  { name: "Paracetamol 500mg" },
  { name: "Dolo 650" },
  { name: "Crocin Advance" },
  { name: "Combiflam" },
  { name: "Azithromycin 500mg" },
  { name: "Amoxicillin 500mg" },
  { name: "Cetirizine 10mg" },
  { name: "Levocetirizine" },
  { name: "Pantoprazole 40mg" },
  { name: "Omeprazole 20mg" },
  { name: "Metformin 500mg" },
  { name: "Glimepiride 2mg" },
  { name: "Insulin Glargine" },
  { name: "Accu-Chek Test Strips" },
  { name: "Vitamin D3 60K" },
  { name: "Shelcal 500" },
  { name: "Becosules Capsules" },
  { name: "Zincovit Tablets" },
  { name: "Whey Protein Powder" },
  { name: "Ensure Nutrition Powder" },
  { name: "Pediasure" },
  { name: "Cerelac Baby Food" },
  { name: "Johnson's Baby Powder" },
  { name: "Huggies Diapers" },
  { name: "ORS Powder" },
  { name: "Betadine Antiseptic" },
  { name: "Cotton & Bandage Kit" },
  { name: "Digital Thermometer" },
  { name: "BP Monitor (Omron)" },
  { name: "Nebulizer Machine" },
  { name: "Pulse Oximeter" },
  { name: "Volini Spray" },
  { name: "Moov Pain Relief Cream" },
  { name: "Dettol Antiseptic Liquid" },
  { name: "Hand Sanitizer" },
  { name: "N95 Face Mask" },
  { name: "Ashwagandha Tablets" },
  { name: "Chyawanprash" },
  { name: "Multivitamin Gummies" },
  { name: "Cough Syrup (Benadryl)" },
  { name: "Digene Gel" },
];
