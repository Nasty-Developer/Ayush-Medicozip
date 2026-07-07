/**
 * Medicines routes — server-side proxy for the OpenFDA API.
 *
 * The OPENFDA_API_KEY env var is read here on the server; it is NEVER
 * sent to the browser. The frontend calls /api/medicines/search?q=...
 * and receives a cleaned JSON response.
 */
import { Router } from "express";

const router = Router();

const OPENFDA_BASE = "https://api.fda.gov";

function sanitize(q: string): string {
  // Strip characters that could break Lucene query syntax
  return q.replace(/[+\-&|!(){}[\]^"~*?:\\]/g, " ").trim();
}

/**
 * GET /api/medicines/search?q=<query>
 *
 * Returns up to 12 deduplicated medicine records from OpenFDA.
 * Falls back to an empty results array on any error so the frontend
 * always receives valid JSON.
 */
router.get("/search", async (req, res) => {
  const raw = String(req.query.q ?? "").trim();
  if (raw.length < 2) {
    return res.json({ results: [] });
  }

  const q = sanitize(raw);
  if (!q) return res.json({ results: [] });

  const key = process.env.OPENFDA_API_KEY;

  // Search brand name OR generic name with prefix wildcard
  const search = `(openfda.brand_name:${q}*)+OR+(openfda.generic_name:${q}*)`;

  const url = new URL(`${OPENFDA_BASE}/drug/label.json`);
  url.searchParams.set("search", search);
  url.searchParams.set("limit", "15");
  if (key) url.searchParams.set("api_key", key);

  try {
    const upstream = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!upstream.ok) {
      // OpenFDA 404 means no results — not an error
      if (upstream.status === 404) return res.json({ results: [] });
      return res.status(502).json({ results: [], error: "OpenFDA unavailable" });
    }

    const data = (await upstream.json()) as {
      results?: Record<string, unknown>[];
    };

    const seen = new Set<string>();
    const results = (data.results ?? [])
      .map((item) => {
        const openfda = (item.openfda ?? {}) as Record<string, string[]>;
        const name =
          openfda.brand_name?.[0] ?? openfda.generic_name?.[0] ?? null;
        if (!name) return null;

        const dedupeKey = name.toLowerCase();
        if (seen.has(dedupeKey)) return null;
        seen.add(dedupeKey);

        return {
          id: String(item.id ?? item.set_id ?? Math.random().toString(36).slice(2)),
          name,
          genericName: openfda.generic_name?.[0] ?? null,
          dosageForm: openfda.dosage_form?.[0] ?? null,
          manufacturer: openfda.manufacturer_name?.[0] ?? null,
          activeIngredients: Array.isArray(item.active_ingredient)
            ? (item.active_ingredient as string[]).slice(0, 2)
            : null,
          route: openfda.route?.[0] ?? null,
        };
      })
      .filter(Boolean);

    return res.json({ results });
  } catch (err) {
    // Network error or JSON parse error
    return res.status(502).json({ results: [], error: "Search unavailable" });
  }
});

export default router;
