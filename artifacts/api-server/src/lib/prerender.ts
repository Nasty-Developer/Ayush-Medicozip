/**
 * prerender.ts — server-rendered page content for the SPA shell.
 *
 * The storefront ships one Vite bundle for every path, so the HTML the server
 * used to send contained nothing but the boot splash: a few words and an empty
 * <div id="root">. Google can execute JavaScript, but a new site with almost no
 * authority gets very little rendering budget, which is why only the homepage
 * ever made it into the index and the local landing pages — the ones written for
 * "medicine delivery in Kurla" — never ranked.
 *
 * This module puts the real words into the served HTML for every indexable route.
 * React's createRoot() replaces the contents of #root on mount, so this is
 * crawlable content only: nothing here changes what a visitor sees.
 */

import { pool } from "@workspace/db";
import { logger } from "./logger.js";
import { PRERENDER_BLOG_POSTS, PRERENDER_LOCAL_PAGES } from "../generated/prerenderContent.js";

const BUSINESS = {
  name: "Ayush Medico & General Stores",
  street: "Shop No 67, Halav Pool Road, Hallow Pul, Makad Wala Chawl",
  locality: "Kurla West",
  city: "Mumbai",
  region: "Maharashtra",
  postalCode: "400070",
  phone: "+91 98332 73838",
  phoneHref: "tel:+919833273838",
  hours: "8:00 AM to 10:00 PM, all seven days",
  radiusKm: 4,
  areas: ["Kurla West", "Kurla East", "Ghatkopar", "Sion", "Chembur"],
};

const escapeHtml = (value: string): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const para = (text: string): string => `<p>${escapeHtml(text)}</p>`;
const paras = (list: string[]): string => list.map(para).join("");
const list = (items: string[]): string =>
  items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
const h2 = (text: string): string => `<h2>${escapeHtml(text)}</h2>`;
const h3 = (text: string): string => `<h3>${escapeHtml(text)}</h3>`;
const anchor = (href: string, label: string): string =>
  `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;

const section = (heading: string, body: string[], bullets?: string[]): string =>
  `<section>${h2(heading)}${paras(body)}${bullets?.length ? list(bullets) : ""}</section>`;

const breadcrumb = (trail: { href?: string; label: string }[]): string =>
  `<nav aria-label="Breadcrumb"><ol>${trail
    .map((crumb) =>
      crumb.href
        ? `<li>${anchor(crumb.href, crumb.label)}</li>`
        : `<li aria-current="page">${escapeHtml(crumb.label)}</li>`,
    )
    .join("")}</ol></nav>`;

const napBlock = (): string =>
  `<section><h2>Visit or call the shop</h2>` +
  para(
    `${BUSINESS.name}, ${BUSINESS.street}, ${BUSINESS.locality}, ${BUSINESS.city} ${BUSINESS.postalCode}.`,
  ) +
  para(`Phone ${BUSINESS.phone}. Open every day, ${BUSINESS.hours}.`) +
  `<p>${anchor(BUSINESS.phoneHref, "Call the pharmacy")} · ${anchor("/contact", "Directions and contact details")} · ${anchor(
    "/medicine-delivery-kurla-west",
    "Order medicine for delivery",
  )}</p></section>`;

const relatedLinks = (paths: string[]): string => {
  const labels = new Map(PRERENDER_LOCAL_PAGES.map((page) => [`/${page.slug}`, page.navLabel]));
  const items = paths
    .filter((path) => labels.has(path))
    .map((path) => `<li>${anchor(path, labels.get(path)!)}</li>`);
  return items.length ? `<section><h2>Related pages</h2><ul>${items.join("")}</ul></section>` : "";
};

/* ── Static pages ───────────────────────────────────────────────────────────── */

function homePage(): string {
  return (
    `<h1>Medicine delivery and pharmacy in Kurla West, Mumbai</h1>` +
    para(
      `${BUSINESS.name} is a licensed retail pharmacy on Halav Pool Road in Kurla West. Order medicines by phone or WhatsApp and we deliver within about ${BUSINESS.radiusKm} km of the shop, covering ${BUSINESS.areas.slice(0, -1).join(", ")} and ${BUSINESS.areas.at(-1)}. Open every day, ${BUSINESS.hours}.`,
    ) +
    section(
      "How to order medicine for delivery",
      [
        "Send the prescription or the medicine list on WhatsApp with your name and the delivery address. A pharmacist checks stock, confirms the price with you, then the order goes out. Nothing is dispensed without a valid prescription for Schedule H and H1 medicines.",
      ],
      [
        `Call or WhatsApp ${BUSINESS.phone}`,
        "Send a photo of the prescription or the strip you already have",
        "Share the full address with a building name or landmark",
        "Pay on delivery by UPI or cash, or pay in the shop",
      ],
    ) +
    section(
      "What the shop stocks",
      [
        "Prescription medicines and everyday over-the-counter remedies sit alongside diabetes care, BP monitors, nebulisers, dressings and surgical items, mother and baby care, Ayurvedic ranges and personal care. If a brand is not on the shelf, tell us the salt name and we will get it from our licensed distributors, usually within a day.",
      ],
    ) +
    section(
      "Areas we deliver to",
      [
        `Delivery is handled from the counter, not a warehouse, so it stays inside about ${BUSINESS.radiusKm} km: ${BUSINESS.areas.join(", ")} and the pockets in between. If you are further out, call and we will tell you honestly whether we can reach you.`,
      ],
    ) +
    relatedLinks([
      "/medicine-delivery-kurla-west",
      "/pharmacy-kurla-west",
      "/chemist-kurla-west",
      "/medical-store-kurla-west",
      "/medicine-availability",
    ]) +
    napBlock()
  );
}

const STATIC_BODIES: Record<string, { h1: string; intro: string; blocks: string[] }> = {
  "/delivery": {
    h1: "Medicine home delivery in Kurla, Ghatkopar, Sion and Chembur",
    intro: `Same-day medicine delivery from our Kurla West counter across roughly ${BUSINESS.radiusKm} km. Send the prescription on WhatsApp, a pharmacist confirms stock and price, then the order goes out between 8 AM and 10 PM, every day.`,
    blocks: [
      section(
        "How a delivery order works",
        [],
        [
          "Message the medicine list or a photo of the prescription",
          "We check stock and reply with the price before dispatch",
          "Share the address with a landmark and a reachable phone number",
          "Pay by UPI or cash on delivery, or settle in the shop",
        ],
      ),
      section("What we will not send by bike", [
        "Cold-chain items and anything that needs a pharmacist's explanation are handed over at the counter instead. If an order needs clarification, the pharmacist calls before dispatch rather than sending a bag with questions in it.",
      ]),
      section("Timings", [
        `Orders are delivered during shop hours, ${BUSINESS.hours}. An order placed late in the evening is more likely to go out the next morning, and we will say so when you message instead of leaving you guessing.`,
      ]),
    ],
  },
  "/services": {
    h1: "Pharmacy services in Kurla West, Mumbai",
    intro:
      "Prescription refills, stock checks, BP and sugar monitoring, home delivery and device support from a licensed pharmacy on Halav Pool Road.",
    blocks: [
      section("Repeat prescriptions and refills", [
        "Monthly medicines for diabetes, blood pressure and thyroid are the most common repeat orders at the counter. Tell us it is a refill and we check what was dispensed before so the strength and pack size stay the same.",
      ]),
      section("Stock checks before you travel", [
        "Call the shop with the medicine name and strength and we will check the shelf. If it is not in stock we tell you when it is expected rather than have you make the trip twice.",
      ]),
      section("Health devices and monitoring", [
        "BP monitors, glucometers, thermometers, nebulisers and pulse oximeters are stocked, and the counter staff will set the device up and show you how to use it before you leave.",
      ]),
    ],
  },
  "/about": {
    h1: "About Ayush Medico, a licensed pharmacy in Kurla West",
    intro: `${BUSINESS.name} is a licensed retail and wholesale chemist at ${BUSINESS.street}, ${BUSINESS.locality}, ${BUSINESS.city} ${BUSINESS.postalCode}.`,
    blocks: [
      section("Licences and registered pharmacist", [
        "The shop operates under FDA drug licences MH-MZ4-518856 (Form 20, retail) and MH-MZ4-518857 (Form 21, wholesale). Prescriptions are dispensed by a registered pharmacist, and the licence details are on display at the counter.",
      ]),
      section("Who we serve", [
        "Families in Kurla West and the surrounding neighbourhoods, along with local clinics that rely on the shop for regular stock. Everyday counter service matters as much as delivery: many customers still prefer to ask a question in person.",
      ]),
    ],
  },
  "/contact": {
    h1: "Contact Ayush Medico, pharmacy near Kurla station",
    intro: `Call or WhatsApp ${BUSINESS.phone}, or visit ${BUSINESS.street}, ${BUSINESS.locality}, ${BUSINESS.city} ${BUSINESS.postalCode}. Open ${BUSINESS.hours}.`,
    blocks: [
      section("Reaching the shop", [
        "The shop is on Halav Pool Road on the west side of Kurla, a short walk from Kurla station. If you are coming specifically for a medicine, call first and we will keep it aside.",
      ]),
      section("Ordering on WhatsApp", [
        "Send your name, the medicine list or a prescription photo, the delivery address with a landmark, and whether you need it today. A complete first message gets a faster confirmation.",
      ]),
    ],
  },
  "/faq": {
    h1: "Medicine delivery and ordering FAQ",
    intro: "The questions customers ask most often at the counter and on WhatsApp.",
    blocks: [
      section("Do you deliver medicine?", [
        `Yes, within about ${BUSINESS.radiusKm} km of the shop: ${BUSINESS.areas.join(", ")} and the streets between them. Delivery runs during shop hours, ${BUSINESS.hours}.`,
      ]),
      section("Can I order without a prescription?", [
        "Over-the-counter products, devices and general items do not need one. Schedule H and H1 medicines are dispensed only against a valid prescription from a registered medical practitioner.",
      ]),
      section("How do I check whether a medicine is in stock?", [
        `Call or WhatsApp ${BUSINESS.phone} with the name and strength. We check the shelf and reply with availability and price before you set out.`,
      ]),
      section("How can I pay?", ["UPI and cash at the counter and on delivery. Ask at the counter for the current options before dispatch."]),
    ],
  },
  "/request-medicine": {
    h1: "Request a medicine that is not listed",
    intro:
      "Not everything on the shelf is on the website. Send the medicine name, strength and quantity and the counter team replies with availability and price, usually the same day.",
    blocks: [
      section("What to send", [], [
        "The brand name or the salt name from the prescription",
        "Strength and pack size (for example 10 mg, strip of 15)",
        "Quantity you need",
        "A photo of the prescription if it is a Schedule H or H1 item",
      ]),
      section("What happens next", [
        "We check stock and our licensed distributors. If it has to be ordered in, we tell you the expected day rather than leave the request open.",
      ]),
    ],
  },
  "/general-products": {
    h1: "Healthcare and general products",
    intro:
      "Everyday health essentials, hygiene, mother and baby care, first aid and wellness products, available from the counter with delivery around Kurla West.",
    blocks: [],
  },
  "/vet-medicines": {
    h1: "Veterinary medicines",
    intro:
      "Veterinary medicines, deworming products, supplements and pet care items for clinics, shelters and pet parents, with delivery across Mumbai where we can reach.",
    blocks: [],
  },
  "/compliance": {
    h1: "Drug licences and dispensing policy",
    intro: `Ayush Medico operates as a licensed retail and wholesale chemist in Mumbai under FDA drug licences MH-MZ4-518856 (Form 20) and MH-MZ4-518857 (Form 21), with a registered pharmacist on the premises.`,
    blocks: [
      section("Dispensing policy", [
        "Schedule H and H1 medicines are dispensed only against a valid prescription that carries the patient's name, the medicine and strength, and the prescriber's signature, registration number and date. Prescriptions that are unclear or appear altered are queried before anything is dispensed.",
      ]),
    ],
  },
};

/* ── Content-driven pages ───────────────────────────────────────────────────── */

function localPageBody(slug: string): string | null {
  const page = PRERENDER_LOCAL_PAGES.find((entry) => entry.slug === slug);
  if (!page) return null;
  return (
    breadcrumb([{ href: "/", label: "Home" }, { label: page.navLabel }]) +
    `<h1>${escapeHtml(page.h1)}</h1>` +
    para(page.intro) +
    page.sections.map((item) => section(item.heading, item.body, item.bullets)).join("") +
    (page.faqs.length
      ? `<section>${h2("Questions people ask")}${page.faqs
          .map((faq) => `${h3(faq.question)}${para(faq.answer)}`)
          .join("")}</section>`
      : "") +
    relatedLinks(page.related) +
    napBlock()
  );
}

function blogIndexBody(): string {
  const items = PRERENDER_BLOG_POSTS.map(
    (post) =>
      `<li>${anchor(`/blog/${post.slug}`, post.h1 || post.title)} — ${escapeHtml(post.excerpt)}</li>`,
  ).join("");
  return (
    breadcrumb([{ href: "/", label: "Home" }, { label: "Pharmacy guides" }]) +
    `<h1>Pharmacy guides for Kurla West, Mumbai</h1>` +
    para(
      "Practical guides from the counter team: choosing a dependable chemist, checking medicine availability, storing medicines safely, understanding a prescription and ordering a refill.",
    ) +
    `<ul>${items}</ul>`
  );
}

function blogPostBody(slug: string): string | null {
  const post = PRERENDER_BLOG_POSTS.find((entry) => entry.slug === slug);
  if (!post) return null;
  return (
    breadcrumb([
      { href: "/", label: "Home" },
      { href: "/blog", label: "Pharmacy guides" },
      { label: post.h1 || post.title },
    ]) +
    `<article><h1>${escapeHtml(post.h1 || post.title)}</h1>` +
    para(post.excerpt) +
    `<p><time datetime="${escapeHtml(post.published)}">${escapeHtml(post.published)}</time>${
      post.readingMinutes ? ` · ${post.readingMinutes} min read` : ""
    }</p>` +
    post.sections.map((item) => section(item.heading, item.body, item.bullets)).join("") +
    `</article>` +
    `<p>${anchor("/medicine-delivery-kurla-west", "Order medicine for delivery in Kurla West")}</p>`
  );
}

/* ── Database-driven pages ──────────────────────────────────────────────────── */

type CategoryRow = { name: string; slug: string; description: string | null };

type MedicineRow = {
  id: number;
  name: string;
  genericName: string | null;
  sellingPrice: string | null;
  mrp: string | null;
  stockStatus: string;
  stockQty: number;
  companyName: string | null;
  categoryName: string | null;
  categorySlug: string | null;
};

const inr = (value: string | null): string => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return `₹${amount.toFixed(2)}`;
};

async function categoryBody(slug: string): Promise<string | null> {
  try {
    const { rows } = await pool.query<CategoryRow>(
      "SELECT name, slug, description FROM categories WHERE slug = $1 LIMIT 1",
      [slug],
    );
    const category = rows[0];
    if (!category) return null;

    const products = await pool.query<MedicineRow>(
      `SELECT m.id, m.name, m.generic_name AS "genericName", m.selling_price AS "sellingPrice",
              m.mrp, m.stock_status AS "stockStatus", m.stock_qty AS "stockQty",
              c.name AS "companyName", cat.name AS "categoryName", cat.slug AS "categorySlug"
         FROM medicines m
         LEFT JOIN companies c ON c.id = m.company_id
         LEFT JOIN categories cat ON cat.id = m.category_id
        WHERE cat.slug = $1 AND (m.status IS NULL OR m.status <> 'deleted')
        ORDER BY m.name ASC
        LIMIT 40`,
      [slug],
    );

    const items = products.rows
      .map((row) => {
        const price = inr(row.sellingPrice);
        const availability = row.stockQty > 0 ? "in stock" : "currently unavailable";
        return `<li>${anchor(`/medicine/${row.id}`, row.name)}${
          row.companyName ? ` by ${escapeHtml(row.companyName)}` : ""
        }${price ? ` — ${escapeHtml(price)}` : ""} (${availability})</li>`;
      })
      .join("");

    return (
      breadcrumb([
        { href: "/", label: "Home" },
        { href: "/categories", label: "Categories" },
        { label: category.name },
      ]) +
      `<h1>${escapeHtml(category.name)} in Kurla West, Mumbai</h1>` +
      (category.description ? para(category.description) : "") +
      para(
        `Order ${category.name.toLowerCase()} from Ayush Medico with same-day delivery around Kurla West, Kurla East, Ghatkopar, Sion and Chembur. Call ${BUSINESS.phone} to check stock before you travel.`,
      ) +
      (items ? `<section>${h2(`${category.name} available at the shop`)}<ul>${items}</ul></section>` : "") +
      `<p>${anchor("/medicine-delivery-kurla-west", "How medicine delivery works")} · ${anchor(
        "/medicine-availability",
        "Check medicine availability",
      )}</p>`
    );
  } catch (err) {
    logger.warn({ err, slug }, "prerender: category body failed");
    return null;
  }
}

async function categoriesIndexBody(): Promise<string> {
  try {
    const { rows } = await pool.query<CategoryRow>(
      "SELECT name, slug, description FROM categories ORDER BY name ASC LIMIT 200",
    );
    const items = rows
      .map((row) => `<li>${anchor(`/category/${row.slug}`, row.name)}</li>`)
      .join("");
    return (
      breadcrumb([{ href: "/", label: "Home" }, { label: "Categories" }]) +
      `<h1>Browse medicines and health products by category</h1>` +
      para(
        "Every category below is stocked at our Kurla West counter, with delivery within about 4 km. Tap a category for the medicines we list.",
      ) +
      (items ? `<ul>${items}</ul>` : "")
    );
  } catch (err) {
    logger.warn({ err }, "prerender: category index failed");
    return "";
  }
}

async function medicineBody(id: number): Promise<string | null> {
  if (!Number.isFinite(id)) return null;
  try {
    const { rows } = await pool.query<MedicineRow>(
      `SELECT m.id, m.name, m.generic_name AS "genericName", m.selling_price AS "sellingPrice",
              m.mrp, m.stock_status AS "stockStatus", m.stock_qty AS "stockQty",
              c.name AS "companyName", cat.name AS "categoryName", cat.slug AS "categorySlug"
         FROM medicines m
         LEFT JOIN companies c ON c.id = m.company_id
         LEFT JOIN categories cat ON cat.id = m.category_id
        WHERE m.id = $1 AND (m.status IS NULL OR m.status <> 'deleted')
        LIMIT 1`,
      [id],
    );
    const medicine = rows[0];
    if (!medicine) return null;

    const price = inr(medicine.sellingPrice);
    const mrp = inr(medicine.mrp);
    const available = medicine.stockQty > 0;

    return (
      breadcrumb([
        { href: "/", label: "Home" },
        ...(medicine.categorySlug && medicine.categoryName
          ? [{ href: `/category/${medicine.categorySlug}`, label: medicine.categoryName }]
          : []),
        { label: medicine.name },
      ]) +
      `<h1>${escapeHtml(medicine.name)}</h1>` +
      para(
        `${medicine.name}${medicine.companyName ? ` by ${medicine.companyName}` : ""}${
          medicine.genericName ? ` (${medicine.genericName})` : ""
        } is ${available ? "available" : "currently unavailable"} at Ayush Medico, a licensed pharmacy in Kurla West, Mumbai.`,
      ) +
      (price
        ? para(
            `Price ${price}${mrp && mrp !== price ? ` (MRP ${mrp})` : ""}. Call ${BUSINESS.phone} to confirm the pack size before ordering.`,
          )
        : "") +
      section("Ordering and delivery", [
        `Call or WhatsApp ${BUSINESS.phone} with the quantity you need. Delivery runs within about ${BUSINESS.radiusKm} km of the shop, ${BUSINESS.hours}. Schedule H and H1 medicines are dispensed only against a valid prescription.`,
      ]) +
      `<p>${anchor("/medicine-delivery-kurla-west", "Medicine delivery in Kurla West")} · ${anchor(
        "/pharmacy-kurla-west",
        "About our Kurla West pharmacy",
      )}</p>`
    );
  } catch (err) {
    logger.warn({ err, id }, "prerender: medicine body failed");
    return null;
  }
}

/* ── Public entry point ─────────────────────────────────────────────────────── */

/**
 * HTML for the requested path, or "" when the route is an app screen (cart,
 * checkout, admin) or simply unknown — those keep the plain SPA shell.
 */
export async function buildPrerender(pathname: string): Promise<string> {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";

  if (path === "/") return homePage();
  if (path === "/blog") return blogIndexBody();
  if (path === "/categories") return categoriesIndexBody();

  const staticEntry = STATIC_BODIES[path];
  if (staticEntry) return staticBody(path);

  const blogMatch = path.match(/^\/blog\/([a-z0-9-]+)$/);
  if (blogMatch) return blogPostBody(blogMatch[1]!) ?? "";

  const categoryMatch = path.match(/^\/category\/([a-z0-9-]+)$/);
  if (categoryMatch) return (await categoryBody(categoryMatch[1]!)) ?? "";

  const medicineMatch = path.match(/^\/medicine\/(\d+)$/);
  if (medicineMatch) return (await medicineBody(Number(medicineMatch[1]))) ?? "";

  return localPageBody(path.replace(/^\//, "")) ?? "";
}

function staticBody(path: string): string {
  const entry = STATIC_BODIES[path]!;
  return (
    breadcrumb([{ href: "/", label: "Home" }, { label: entry.h1 }]) +
    `<h1>${escapeHtml(entry.h1)}</h1>` +
    para(entry.intro) +
    entry.blocks.join("") +
    napBlock()
  );
}

/** Put the content inside the mounted div, so crawl order matches the page. */
export function injectPrerendered(html: string, body: string): string {
  if (!body) return html;
  const wrapper = `<div id="root"><div id="prerendered-content">${body}</div></div>`;
  if (html.includes('<div id="root"></div>')) {
    return html.replace('<div id="root"></div>', wrapper);
  }
  return html.replace(/<div id="root">[\s\S]*?<\/div>\s*(?=<script)/, wrapper);
}
