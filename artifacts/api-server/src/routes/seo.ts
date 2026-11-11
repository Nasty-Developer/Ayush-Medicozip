/**
 * Admin SEO endpoints.
 *
 * Stores per-page metadata overrides as one JSON document in the settings table
 * (key `seo:overrides`), so no schema change is needed and the public read path
 * in lib/seo.ts can merge them into the rendered head.
 *
 * GET  /api/admin/seo → { pages: [{path, title, description, ...}], verification }
 * PUT  /api/admin/seo → { saved: true }
 */

import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { auditSeo } from "../lib/seoAutomation.js";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware.js";
import {
  STATIC_ROUTES, LOCAL_ROUTES, BLOG_ROUTES,
  loadOverrides, invalidateOverrides, SITE_URL, type SeoOverride,
} from "../lib/seo.js";

const router = Router();

const OVERRIDE_KEY = "seo:overrides";

/** Every path the panel can edit, with the copy currently used as the base. */
function editablePaths(): string[] {
  return [
    ...Object.keys(STATIC_ROUTES),
    ...Object.keys(LOCAL_ROUTES),
    "/blog",
    ...Object.keys(BLOG_ROUTES).map((slug) => `/blog/${slug}`),
  ];
}

/**
 * Technical SEO audit for the admin dashboard. Read-only: it builds the sitemaps
 * in memory, renders a sample of heads and reports what is wrong, without ever
 * pinging Google or submitting anything.
 */
router.get("/health", requireAuth, requireAdminEmail, async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json(await auditSeo());
  } catch (err) {
    logger.warn({ err }, "SEO audit failed");
    res.status(500).json({ error: "SEO audit failed" });
  }
});

router.get("/", requireAuth, requireAdminEmail, async (_req: Request, res: Response): Promise<void> => {
  try {
    const store = await loadOverrides(true);
    const pages = editablePaths().map((path) => {
      const base = STATIC_ROUTES[path];
      const local = LOCAL_ROUTES[path];
      const override = store.pages[path] ?? {};
      return {
        path,
        url: `${SITE_URL}${path === "/" ? "/" : path}`,
        title: override.title ?? base?.title ?? local?.title ?? "",
        description: override.description ?? base?.description ?? local?.description ?? "",
        keywords: override.keywords ?? "",
        canonical: override.canonical ?? "",
        robots: override.robots ?? "index, follow, max-image-preview:large",
        ogImage: override.ogImage ?? "",
        focusKeyword: override.focusKeyword ?? "",
        edited: Object.keys(override).length > 0,
      };
    });
    res.json({ pages, verification: store.verification ?? "" });
  } catch (err) {
    logger.error({ err }, "GET /admin/seo failed");
    res.status(500).json({ error: "Failed to load SEO settings" });
  }
});

router.put("/", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as {
      pages?: Record<string, SeoOverride>;
      verification?: string;
    };
    if (body.pages && typeof body.pages !== "object") {
      res.status(400).json({ error: "pages must be an object keyed by path" });
      return;
    }

    const allowed = new Set(editablePaths());
    const pages: Record<string, SeoOverride> = {};
    for (const [path, value] of Object.entries(body.pages ?? {})) {
      if (!allowed.has(path) || !value || typeof value !== "object") continue;
      const entry: SeoOverride = {};
      const pick = (field: keyof SeoOverride, max: number): void => {
        const raw = (value as SeoOverride)[field];
        if (typeof raw !== "string") return;
        const trimmed = raw.trim();
        if (trimmed) entry[field] = trimmed.slice(0, max) as never;
      };
      pick("title", 120);
      pick("description", 320);
      pick("keywords", 400);
      pick("canonical", 300);
      pick("robots", 120);
      pick("ogImage", 300);
      pick("focusKeyword", 120);
      if (Object.keys(entry).length > 0) pages[path] = entry;
    }

    const verification = typeof body.verification === "string" ? body.verification.trim().slice(0, 200) : "";
    const payload = JSON.stringify({ pages, verification });

    await pool.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [OVERRIDE_KEY, payload],
    );

    invalidateOverrides();
    logger.info({ pages: Object.keys(pages).length }, "SEO overrides saved");
    res.json({ saved: true, pages: Object.keys(pages).length, verification: Boolean(verification) });
  } catch (err) {
    logger.error({ err }, "PUT /admin/seo failed");
    res.status(500).json({ error: "Failed to save SEO settings" });
  }
});

export default router;
