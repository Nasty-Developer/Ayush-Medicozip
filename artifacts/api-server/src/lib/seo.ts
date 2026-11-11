/**
 * seo.ts — per-route document head for the single-page storefront.
 *
 * The storefront is one Vite bundle served for every path, so without help every
 * URL shipped the same <title>, description and canonical. That makes a search
 * engine pick one page and ignore the rest, and it gives category and medicine
 * pages no way to rank for what they actually sell.
 *
 * This module rewrites the head of index.html per request: title, description,
 * canonical, robots, Open Graph and Twitter tags, hreflang, plus the JSON-LD
 * that matches the page (Product on a medicine, CollectionPage on a category,
 * BreadcrumbList everywhere).
 */

import { pool } from "@workspace/db";
import { logger } from "./logger.js";

export const SITE_URL = "https://ayushmedico.com";
const SITE_NAME = "Ayush Medico";
const BRAND_SUFFIX = "Ayush Medico";
const PHONE = "+91 98332 73838";
const LOCALITY = "Kurla West, Mumbai";

export type SeoMeta = {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  jsonLd?: Record<string, unknown>[];
  keywords?: string;
  ogImage?: string;
  verification?: string;
};

type StaticEntry = {
  title: string;
  description: string;
  changeFrequency?: string;
  priority?: number;
  index?: boolean;
};

/** keyword-focused copy for the routes people actually search for */
export const STATIC_ROUTES: Record<string, StaticEntry> = {
  "/": {
    title: "Ayush Medico – Online Medicine Delivery in Kurla West",
    description:
      "Order medicines online with home delivery in Kurla, Ghatkopar, Sion and Chembur from our licensed Kurla West pharmacy. 50,000+ genuine medicines.",
    priority: 1,
  },
  "/categories": {
    title: "Buy Medicines Online by Category | Ayush Medico Kurla, Mumbai",
    description:
      "Browse prescription medicines, OTC drugs, Ayurvedic products, baby care, supplements and health devices. Genuine stock, delivered around Kurla West.",
    priority: 0.9,
  },
  "/delivery": {
    title: "Medicine Home Delivery in Kurla & Ghatkopar | Ayush Medico",
    description:
      "Same-day medicine delivery across Kurla West, Kurla East, Ghatkopar, Sion and Chembur. Send your prescription and our pharmacist arranges the order.",
    priority: 0.9,
  },
  "/request-medicine": {
    title: "Request a Medicine We Don’t List | Ayush Medico",
    description:
      "Looking for a medicine we do not stock? Send the name, strength and quantity and our Kurla West pharmacy team replies with availability and price.",
    priority: 0.8,
  },
  "/services": {
    title: "Pharmacy Services – Refills & Health Checks | Ayush Medico",
    description:
      "Prescription refills, stock checks, BP and sugar monitoring, home delivery and device support from a licensed pharmacy in Kurla West, Mumbai.",
    priority: 0.7,
  },
  "/about": {
    title: "About Ayush Medico – Licensed Pharmacy in Kurla West, Mumbai",
    description:
      "Ayush Medico & General Stores is a licensed retail pharmacy in Kurla West, Mumbai (FDA licences MH-MZ4-518856 and MH-MZ4-518857) serving families and clinics.",
    priority: 0.6,
  },
  "/contact": {
    title: "Contact Ayush Medico – Pharmacy Near Kurla Station, Mumbai",
    description: `Call ${PHONE} or message us on WhatsApp to check medicine availability, order medicines or ask about home delivery in ${LOCALITY}. Open 7 days, 8 AM to 10 PM.`,
    priority: 0.7,
  },
  "/faq": {
    title: "Medicine Delivery FAQ – Orders & Timings | Ayush Medico",
    description:
      "Visit or call Ayush Medico on Halav Pool Road, Kurla West, Mumbai. Phone, WhatsApp, directions, opening hours and prescription upload all in one place.",
    priority: 0.6,
  },
  "/compliance": {
    title: "Drug Licences & Compliance – Ayush Medico Pharmacy Mumbai",
    description:
      "Ayush Medico is a licensed retail and wholesale chemist in Mumbai. View our FDA drug licences, registered pharmacist details and dispensing policy.",
    priority: 0.4,
  },
  "/vet-medicines": {
    title: "Veterinary Medicines Online in Mumbai | Ayush Medico",
    description:
      "Veterinary medicines, deworming, supplements and pet care products for clinics, shelters and pet parents, with delivery across Mumbai.",
    priority: 0.5,
  },
  "/general-products": {
    title: "Healthcare & General Products Online | Ayush Medico Mumbai",
    description:
      "Everyday health essentials, hygiene, mother and baby care, first aid and wellness products available from Ayush Medico with home delivery in Mumbai.",
    priority: 0.5,
  },
  "/inquiry": {
    title: "Send an Inquiry – Ayush Medico Pharmacy Kurla, Mumbai",
    description:
      "Ask a question about a medicine, an order or home delivery and the Ayush Medico pharmacy team will get back to you the same day.",
    index: false,
  },
  "/privacy-policy": {
    title: "Privacy Policy | Ayush Medico",
    description:
      "How Ayush Medico collects, uses and protects customer data for online medicine orders and prescriptions.",
    priority: 0.2,
  },
  "/terms-conditions": {
    title: "Terms & Conditions | Ayush Medico",
    description: "Terms of use for the Ayush Medico online pharmacy and delivery service.",
    priority: 0.2,
  },
  "/refund-policy": {
    title: "Refund & Return Policy | Ayush Medico",
    description:
      "Refund and return rules for medicines and healthcare products ordered from Ayush Medico.",
    priority: 0.2,
  },
  "/shipping-policy": {
    title: "Shipping & Delivery Policy | Ayush Medico",
    description:
      "How and when Ayush Medico delivers medicine orders across Kurla, Ghatkopar, Chembur and the rest of Mumbai.",
    priority: 0.2,
  },
  "/prescription-policy": {
    title: "Prescription Policy | Ayush Medico",
    description:
      "Prescription requirements for scheduled medicines dispensed by Ayush Medico, and how to upload a valid prescription.",
    priority: 0.2,
  },
  "/disclaimer": {
    title: "Disclaimer | Ayush Medico",
    description:
      "Medical disclaimer for content and product information published by Ayush Medico.",
    priority: 0.2,
  },
};

/** Local landing pages — one per real search intent around Kurla West. */
export const LOCAL_ROUTES: Record<string, { title: string; description: string }> = {
  "/pharmacy-kurla-west": {
    title: "Pharmacy in Kurla West, Mumbai – Ayush Medico",
    description:
      "Licensed pharmacy on Halav Pool Road, Kurla West. Prescription medicines, OTC remedies, devices and baby care. Open 8 AM to 10 PM, seven days.",
  },
  "/medical-store-kurla-west": {
    title: "Medical Store in Kurla West | Ayush Medico",
    description:
      "Medical store in Kurla West for monthly prescriptions, diabetes and BP medicines, surgical supplies and clinic orders. Open seven days, 8 AM to 10 PM.",
  },
  "/medicine-delivery-kurla-west": {
    title: "Medicine Delivery in Kurla West – 4 km Radius | Ayush Medico",
    description:
      "Medicine delivery within about 4 km of Kurla West: Kurla East, Sion, Kalina, Vidyavihar, Saki Naka and Ghatkopar. Send your prescription on WhatsApp.",
  },
  "/chemist-kurla-west": {
    title: "Chemist Shop Near Kurla Station, Kurla West | Ayush Medico",
    description:
      "Chemist near Kurla station west, open until 10 PM daily. Call ahead to check stock, send prescriptions on WhatsApp, or collect on Halav Pool Road.",
  },
  "/medicine-availability": {
    title: "Check Medicine Availability Before You Travel | Ayush Medico",
    description:
      "Send the medicine name, strength and quantity and Ayush Medico confirms stock, price and delivery before you leave home. Licensed pharmacy in Kurla West,.",
  },
};

/** Guides published under /blog. */
export const BLOG_ROUTES: Record<string, { title: string; description: string; published: string; minutes: number }> = {
  "how-to-choose-a-reliable-pharmacy-in-kurla-west": {
    title: "How to Choose a Reliable Pharmacy in Kurla West | Ayush Medico",
    description:
      "Licences, batch numbers, bills and cold-chain handling: the checks that separate a dependable Mumbai chemist from a risky one.",
    published: "2026-11-11",
    minutes: 5,
  },
  "understanding-medicine-availability": {
    title: "Why a Medicine Is Unavailable – and What to Do | Ayush Medico",
    description:
      "Stock-outs, distributor gaps, discontinued brands and recalls all look the same at the counter. How medicine availability actually works in Mumbai.",
    published: "2026-11-11",
    minutes: 4,
  },
  "how-to-store-medicines-safely-at-home": {
    title: "How to Store Medicines Safely at Home in Mumbai | Ayush Medico",
    description:
      "Mumbai heat and humidity damage medicines faster than most people expect. Where to keep them, what belongs in the fridge, and when to discard a strip.",
    published: "2026-11-11",
    minutes: 4,
  },
  "prescription-rules-at-a-pharmacy": {
    title: "Why Pharmacies Ask for a Prescription | Ayush Medico",
    description:
      "What makes a prescription valid, why a pharmacist may refuse to dispense, and what to do when the original is lost.",
    published: "2026-11-11",
    minutes: 4,
  },
  "how-to-contact-ayush-medico": {
    title: "How to Contact Ayush Medico for a Medicine Enquiry",
    description:
      "Call, WhatsApp or walk in: what to send for a fast, accurate answer about stock, price and 4 km delivery in Kurla West.",
    published: "2026-11-11",
    minutes: 3,
  },
};

/** app screens that must never appear in search results */
export const NOINDEX_PREFIXES = [
  "/cart",
  "/checkout",
  "/orders",
  "/order",
  "/order-confirmation",
  "/payment",
  "/track",
  "/admin",
  "/inquiry",
];

function absolute(pathname: string): string {
  if (pathname === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${pathname.replace(/\/+$/, "")}`;
}

function titleWith(pathname: string, title: string, includeSite: boolean): string {
  if (!includeSite) return title;
  // Keep titles under ~62 characters so Google does not truncate them.
  const tail = ` | ${BRAND_SUFFIX}`;
  if (title.length + tail.length <= 62) return `${title}${tail}`;
  return title.length <= 62 ? title : `${title.slice(0, 59).trimEnd()}…`;
}

function breadcrumb(pathname: string, label: string): Record<string, unknown> {
  const items: Record<string, unknown>[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
  ];
  if (pathname !== "/") {
    const segments = pathname.split("/").filter(Boolean);
    let acc = "";
    segments.forEach((segment, index) => {
      acc += `/${segment}`;
      items.push({
        "@type": "ListItem",
        position: index + 2,
        name: index === segments.length - 1 ? label : humaniseSegment(segment),
        item: absolute(acc),
      });
    });
  }
  return { "@type": "BreadcrumbList", "@id": `${absolute(pathname)}#breadcrumb`, itemListElement: items };
}

function humaniseSegment(segment: string): string {
  const fromTable = STATIC_ROUTES[`/${segment}`];
  if (fromTable) return fromTable.title.split("|")[0]!.trim();
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function clamp(text: string, max = 158): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function isIndexable(pathname: string): boolean {
  if (NOINDEX_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }
  return true;
}

type CategoryRow = { name: string; slug: string; description: string | null };
type MedicineRow = {
  id: number;
  name: string;
  genericName: string | null;
  sellingPrice: string | null;
  mrp: string | null;
  imageUrl: string | null;
  stockStatus: string;
  stockQty: number;
  companyName: string | null;
  categoryName: string | null;
};

async function loadCategory(slug: string): Promise<CategoryRow | null> {
  try {
    const { rows } = await pool.query<CategoryRow>(
      "SELECT name, slug, description FROM categories WHERE slug = $1 LIMIT 1",
      [slug],
    );
    return rows[0] ?? null;
  } catch (err) {
    logger.warn({ err, slug }, "SEO: category lookup failed");
    return null;
  }
}

async function loadMedicine(id: number): Promise<MedicineRow | null> {
  if (!Number.isFinite(id)) return null;
  try {
    const { rows } = await pool.query<MedicineRow>(
      `SELECT m.id, m.name, m.generic_name AS "genericName", m.selling_price AS "sellingPrice",
              m.mrp, m.image_url AS "imageUrl", m.stock_status AS "stockStatus", m.stock_qty AS "stockQty",
              c.name AS "companyName", cat.name AS "categoryName"
         FROM medicines m
         LEFT JOIN companies c ON c.id = m.company_id
         LEFT JOIN categories cat ON cat.id = m.category_id
        WHERE m.id = $1 AND (m.status IS NULL OR m.status <> 'deleted')
        LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  } catch (err) {
    logger.warn({ err, id }, "SEO: medicine lookup failed");
    return null;
  }
}

function availabilityOf(stockStatus: string, stockQty: number): string {
  if (stockStatus === "in_stock" && stockQty > 0) return "https://schema.org/InStock";
  if (stockStatus === "low_stock" && stockQty > 0) return "https://schema.org/LimitedAvailability";
  return "https://schema.org/OutOfStock";
}

/**
 * Build the head for one storefront path. Unknown paths fall back to a generic
 * but still useful set of tags, and app screens are marked noindex.
 */
async function buildBaseSeo(pathname: string): Promise<SeoMeta> {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  const canonical = absolute(path);

  if (!isIndexable(path)) {
    return {
      title: titleWith(path, `Ayush Medico`, false),
      description: "Ayush Medico online pharmacy, Kurla West, Mumbai.",
      canonical,
      robots: "noindex, nofollow",
      jsonLd: [breadcrumb(path, "Ayush Medico")],
    };
  }

  const staticEntry = STATIC_ROUTES[path];
  if (staticEntry) {
    return {
      title: titleWith(path, staticEntry.title, false),
      description: clamp(staticEntry.description),
      canonical,
      robots: "index, follow, max-image-preview:large, max-snippet:-1",
      jsonLd: [breadcrumb(path, "Home"), webPage(path, staticEntry.title, staticEntry.description)],
    };
  }

  const localEntry = LOCAL_ROUTES[path];
  if (localEntry) {
    return {
      title: titleWith(path, localEntry.title, false),
      description: clamp(localEntry.description),
      canonical,
      robots: "index, follow, max-image-preview:large, max-snippet:-1",
      jsonLd: [
        breadcrumb(path, localEntry.title.split("–")[0]!.trim()),
        webPage(path, localEntry.title, localEntry.description),
        localService(path, localEntry.title),
      ],
    };
  }

  if (path === "/blog") {
    const title = titleWith(path, "Pharmacy Guides for Kurla West, Mumbai", false);
    const description = clamp(
      "Practical guides from the Ayush Medico counter team: choosing a dependable chemist, checking medicine availability, storing medicines safely and understanding prescriptions.",
    );
    return {
      title,
      description,
      canonical,
      robots: "index, follow, max-image-preview:large",
      jsonLd: [
        breadcrumb(path, "Pharmacy guides"),
        {
          "@type": "Blog",
          "@id": `${canonical}#blog`,
          name: "Ayush Medico pharmacy guides",
          url: canonical,
          inLanguage: "en-IN",
          publisher: { "@id": `${SITE_URL}/#organization` },
          blogPost: Object.entries(BLOG_ROUTES).map(([slug, post]) => ({
            "@type": "BlogPosting",
            headline: post.title,
            url: `${SITE_URL}/blog/${slug}`,
            datePublished: post.published,
          })),
        },
      ],
    };
  }

  const blogMatch = path.match(/^\/blog\/([a-z0-9-]+)$/);
  if (blogMatch) {
    const post = BLOG_ROUTES[blogMatch[1]!];
    if (post) {
      return {
        title: titleWith(path, post.title, false),
        description: clamp(post.description),
        canonical,
        robots: "index, follow, max-image-preview:large, max-snippet:-1",
        jsonLd: [
          breadcrumb(path, post.title.split("|")[0]!.trim()),
          {
            "@type": "BlogPosting",
            "@id": `${canonical}#article`,
            headline: post.title,
            description: post.description,
            url: canonical,
            mainEntityOfPage: canonical,
            datePublished: post.published,
            dateModified: post.published,
            inLanguage: "en-IN",
            author: { "@id": `${SITE_URL}/#organization` },
            publisher: { "@id": `${SITE_URL}/#organization` },
            about: { "@id": `${SITE_URL}/#pharmacy` },
          },
        ],
      };
    }
  }

  const medicineMatch = path.match(/^\/medicine\/(\d+)$/);
  if (medicineMatch) {
    const medicine = await loadMedicine(Number(medicineMatch[1]));
    if (medicine) {
      const price = medicine.sellingPrice ?? medicine.mrp;
      const priceText = price ? `₹${Number(price).toFixed(2)}` : "best price";
      const company = medicine.companyName ? `${medicine.companyName} ` : "";
      const title = titleWith(path, `${medicine.name}${company ? ` (${medicine.companyName})` : ""} Price & Online Delivery`, false);
      const description = clamp(
        `Buy ${medicine.name}${medicine.genericName ? ` (${medicine.genericName})` : ""} online at ₹${priceText} from Ayush Medico, a licensed pharmacy in Kurla West, Mumbai. ${medicine.categoryName ? `${medicine.categoryName} · ` : ""}${stockLabel(medicine.stockStatus, medicine.stockQty)} · home delivery in Kurla, Ghatkopar and Chembur.`,
      );
      const jsonLd: Record<string, unknown>[] = [
        breadcrumb(path, medicine.name),
        {
          "@type": "Product",
          "@id": `${canonical}#product`,
          name: medicine.name,
          ...(medicine.genericName ? { description: medicine.genericName } : {}),
          ...(medicine.companyName ? { brand: { "@type": "Brand", name: medicine.companyName } } : {}),
          ...(medicine.categoryName ? { category: medicine.categoryName } : {}),
          ...(medicine.imageUrl ? { image: [medicine.imageUrl] } : {}),
          sku: String(medicine.id),
          offers: {
            "@type": "Offer",
            url: canonical,
            priceCurrency: "INR",
            ...(price ? { price: Number(price).toFixed(2) } : {}),
            availability: availabilityOf(medicine.stockStatus, medicine.stockQty),
            seller: { "@id": `${SITE_URL}/#pharmacy` },
          },
        },
      ];
      return {
        title,
        description,
        canonical,
        robots: "index, follow, max-image-preview:large, max-snippet:-1",
        jsonLd,
      };
    }
  }

  const categoryMatch = path.match(/^\/category\/([a-z0-9-]+)$/);
  if (categoryMatch) {
    const category = await loadCategory(categoryMatch[1]!);
    if (category) {
      const title = titleWith(path, `${category.name} Online in Kurla, Mumbai – Buy & Get Delivery`, false);
      const description = clamp(
        `Buy ${category.name.toLowerCase()} online from Ayush Medico, a licensed pharmacy in ${LOCALITY}. ${category.description?.trim() ? `${category.description.trim()} ` : ""}Genuine products, pharmacist-checked orders and home delivery across Mumbai.`,
      );
      return {
        title,
        description,
        canonical,
        robots: "index, follow, max-image-preview:large, max-snippet:-1",
        jsonLd: [
          breadcrumb(path, category.name),
          {
            "@type": "CollectionPage",
            "@id": `${canonical}#collection`,
            name: `${category.name} – Ayush Medico`,
            description,
            url: canonical,
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@id": `${SITE_URL}/#pharmacy` },
          },
        ],
      };
    }
  }

  if (path.startsWith("/general-products/")) {
    const label = "General Product";
    return {
      title: titleWith(path, `${label} – Price & Delivery in Mumbai`, false),
      description: clamp(
        `Buy ${label.toLowerCase()} online from Ayush Medico with home delivery in Kurla, Ghatkopar and Chembur.`,
      ),
      canonical,
      robots: "index, follow, max-image-preview:large",
      jsonLd: [breadcrumb(path, label)],
    };
  }

  if (path.startsWith("/vet-medicines/")) {
    return {
      title: titleWith(path, `Veterinary Medicine – Buy Online in Mumbai`, false),
      description: clamp(
        "Veterinary medicine and pet care supplies from Ayush Medico, delivered across Mumbai.",
      ),
      canonical,
      robots: "index, follow, max-image-preview:large",
      jsonLd: [breadcrumb(path, "Veterinary Medicine")],
    };
  }

  return {
    title: titleWith(path, `${SITE_NAME} – Online Pharmacy & Medical Store in ${LOCALITY}`, false),
    description: clamp(
      `Ayush Medico is a licensed pharmacy in ${LOCALITY} with 50,000+ medicines, OTC products and healthcare essentials. Order online, call ${PHONE} or message us on WhatsApp.`,
    ),
    canonical,
    robots: "index, follow, max-image-preview:large",
    jsonLd: [breadcrumb(path, "Home")],
  };
}

function stockLabel(status: string, qty: number): string {
  if (status === "in_stock" && qty > 0) return "In stock";
  if (status === "low_stock" && qty > 0) return "Low stock";
  return "Currently out of stock, request availability";
}

/** Ties a local landing page to the pharmacy entity without inventing new facts. */
function localService(path: string, name: string): Record<string, unknown> {
  return {
    "@type": "Service",
    "@id": `${absolute(path)}#service`,
    name,
    serviceType: "Pharmacy and medicine delivery",
    url: absolute(path),
    provider: { "@id": `${SITE_URL}/#pharmacy` },
    areaServed: { "@type": "Place", name: "Kurla West, Mumbai" },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: absolute(path),
      servicePhone: { "@type": "ContactPoint", telephone: "+919833273838", contactType: "customer service" },
    },
  };
}

function webPage(path: string, name: string, description: string): Record<string, unknown> {
  return {
    "@type": "WebPage",
    "@id": `${absolute(path)}#webpage`,
    url: absolute(path),
    name,
    description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#pharmacy` },
    inLanguage: "en-IN",
  };
}

/* ── Admin overrides ───────────────────────────────────────────────────────── */

export type SeoOverride = {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  robots?: string;
  ogImage?: string;
  focusKeyword?: string;
};

type OverrideStore = {
  pages: Record<string, SeoOverride>;
  verification?: string;
};

let overrideCache: { value: OverrideStore; loadedAt: number } | null = null;
const OVERRIDE_TTL_MS = 60_000;

/** Admin edits live in the settings table as a single JSON value. */
export async function loadOverrides(force = false): Promise<OverrideStore> {
  if (!force && overrideCache && Date.now() - overrideCache.loadedAt < OVERRIDE_TTL_MS) {
    return overrideCache.value;
  }
  try {
    // settings.value is jsonb, so the driver may hand back an object rather
    // than a JSON string. Both shapes have to be accepted.
    const { rows } = await pool.query<{ value: unknown }>(
      "SELECT value FROM settings WHERE key = 'seo:overrides' LIMIT 1",
    );
    const raw = rows[0]?.value;
    const parsed = (
      typeof raw === "string" ? JSON.parse(raw) : (raw as OverrideStore | undefined)
    ) ?? { pages: {} };
    const value: OverrideStore = {
      pages: parsed.pages && typeof parsed.pages === "object" ? parsed.pages : {},
      verification: parsed.verification || process.env["GOOGLE_SITE_VERIFICATION"] || undefined,
    };
    overrideCache = { value, loadedAt: Date.now() };
    return value;
  } catch (err) {
    logger.warn({ err }, "SEO: override lookup failed");
    const fallback: OverrideStore = {
      pages: {},
      verification: process.env["GOOGLE_SITE_VERIFICATION"] || undefined,
    };
    overrideCache = { value: fallback, loadedAt: Date.now() };
    return fallback;
  }
}

export function invalidateOverrides(): void {
  overrideCache = null;
}

function applyOverride(meta: SeoMeta, override: SeoOverride | undefined): SeoMeta {
  if (!override) return meta;
  return {
    ...meta,
    title: override.title?.trim() || meta.title,
    description: override.description?.trim() || meta.description,
    canonical: override.canonical?.trim() || meta.canonical,
    robots: override.robots?.trim() || meta.robots,
    keywords: override.keywords?.trim() || meta.keywords,
    ogImage: override.ogImage?.trim() || meta.ogImage,
  };
}

/**
 * Public entry point: base metadata for the route, then any override an admin
 * saved in the SEO panel, then verification tokens for Search Console.
 */
export async function buildSeo(pathname: string): Promise<SeoMeta> {
  const base = await buildBaseSeo(pathname);
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  let store: OverrideStore = { pages: {} };
  try {
    store = await loadOverrides();
  } catch {
    /* metadata must still render if the settings table is unavailable */
  }
  const merged = applyOverride(base, store.pages[path]);
  return { ...merged, verification: store.verification };
}

/* ── HTML injection ─────────────────────────────────────────────────────────── */

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function replaceTag(html: string, pattern: RegExp, replacement: string): string {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

/**
 * Rewrite the head of the built index.html for one request. Only known tags are
 * touched, so the icons, manifest and font preloads stay exactly as built.
 */
export function applySeo(html: string, meta: SeoMeta): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const canonical = escapeHtml(meta.canonical);

  let out = html;
  out = replaceTag(out, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  out = replaceTag(
    out,
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="description" content="${description}" />`,
  );
  out = replaceTag(
    out,
    /<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`,
  );
  out = replaceTag(
    out,
    /<meta\s+name="robots"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="robots" content="${meta.robots}" />`,
  );
  out = replaceTag(
    out,
    /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`,
  );
  out = replaceTag(
    out,
    /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`,
  );
  out = replaceTag(
    out,
    /<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:url" content="${canonical}" />`,
  );
  out = replaceTag(
    out,
    /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  out = replaceTag(
    out,
    /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="twitter:description" content="${description}" />`,
  );

  if (meta.keywords) {
    out = replaceTag(
      out,
      /<meta\s+name="keywords"\s+content="[\s\S]*?"\s*\/?>/,
      `<meta name="keywords" content="${escapeHtml(meta.keywords)}" />`,
    );
  }
  if (meta.ogImage) {
    out = replaceTag(
      out,
      /<meta\s+property="og:image"\s+content="[\s\S]*?"\s*\/?>/,
      `<meta property="og:image" content="${escapeHtml(meta.ogImage)}" />`,
    );
    out = replaceTag(
      out,
      /<meta\s+name="twitter:image"\s+content="[\s\S]*?"\s*\/?>/,
      `<meta name="twitter:image" content="${escapeHtml(meta.ogImage)}" />`,
    );
  }
  if (meta.verification && !out.includes('name="google-site-verification"')) {
    out = out.replace(
      "</head>",
      `  <meta name="google-site-verification" content="${escapeHtml(meta.verification)}" />\n  </head>`,
    );
  }

  const hreflang =
    `<link rel="alternate" hreflang="en-IN" href="${canonical}" />\n` +
    `    <link rel="alternate" hreflang="x-default" href="${canonical}" />`;
  if (!out.includes('hreflang="en-IN"')) {
    out = out.replace("</head>", `  ${hreflang}\n  </head>`);
  }

  if (meta.jsonLd?.length) {
    const graph = { "@context": "https://schema.org", "@graph": meta.jsonLd };
    const script = `<script type="application/ld+json">${JSON.stringify(graph)}</script>`;
    out = out.replace("</head>", `  ${script}\n  </head>`);
  }

  return out;
}
