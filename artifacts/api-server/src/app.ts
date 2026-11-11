import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { pool } from "@workspace/db";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { initFirebaseAdmin } from "./lib/firebaseAdmin.js";
import { buildSeo, applySeo, SITE_URL } from "./lib/seo.js";
import * as seoAutomation from "./lib/seoAutomation.js";
initFirebaseAdmin();

// Keep the app type inferred from the callable Express factory. This avoids
// Vercel's function type checker confusing the CommonJS Express export with
// the module namespace when it analyzes the workspace from the api function.
const app = express();

// pino-http publishes a CommonJS export. The workspace bundler handles the
// default import, while Vercel's standalone type pass can see the namespace
// shape instead. Normalize the type at this boundary; runtime behavior is
// unchanged.
const createPinoHttp = pinoHttp as unknown as (
  options: Record<string, unknown>,
) => ReturnType<typeof express>;

// ── Production frontend assets ────────────────────────────────────────────────
// Static files must be resolved before API CORS. Browser module requests include
// an Origin header, but frontend assets are same-origin resources and should not
// be rejected by the API's allowlist.
const frontendDir = path.resolve(
  import.meta.dirname,
  "../../ayush-medico/dist/public",
);
if (process.env.NODE_ENV === "production") {
  // index:false so "/" goes through the SEO head injection below instead of
  // being served as a bare file with the template's default tags.
  app.use(express.static(frontendDir, { index: false }));
}

// ── Trust proxy ───────────────────────────────────────────────────────────────
// Replit (and most PaaS providers) sit behind a reverse-proxy that sets
// X-Forwarded-For. Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Firebase signInWithPopup completes through a cross-origin Firebase
    // handler. Strict same-origin COOP severs the popup/opener relationship
    // during that return and Firebase reports auth/popup-closed-by-user even
    // after the customer clicks Continue successfully.
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    contentSecurityPolicy: false, // Handled by Vite/frontend
  })
);

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(
  createPinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
// Empty/missing Origin is same-origin, CLI, or server-to-server traffic and remains allowed.
// The Render deployment serves the frontend and API from the same hostname, but browsers
// still send an Origin header on some same-origin POST/preflight requests. Keep that
// exact production origin in the allowlist while retaining environment overrides for
// additional explicitly-approved domains.
const defaultCorsOrigins = [
  "https://ayushmedico.com",
  "https://www.ayushmedico.com",
  "https://ayush-medicozip-4.onrender.com",
  "http://localhost:18169",
  "http://localhost:5173",
  "http://127.0.0.1:18169",
  "http://127.0.0.1:5173",
];
const configuredCorsOrigins = (process.env["CORS_ALLOWLIST"] ?? process.env["CORS_ORIGINS"] ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigins = new Set([...defaultCorsOrigins, ...configuredCorsOrigins]);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.has(origin)) { callback(null, true); return; }
    callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204,
  maxAge: 86400,
}));
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof Error && err.message === "Origin is not allowed by CORS") {
    res.status(403).json({ error: "Origin is not allowed by CORS" });
    return;
  }
  next(err);
});

// ── Body parsing ──────────────────────────────────────────────────────────────
// Razorpay webhook needs raw body for HMAC verification — mount before json().
// All other routes get the generous 50mb limit for SDF inventory sync payloads.
app.use("/api/payment/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// General API rate limit — prevents DoS and brute-force on all /api routes.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 300,                    // 300 requests per window per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  skip: (req: any) => {
    // Skip rate limiting for health checks
    // The limiter is mounted at /api, so Express exposes the remaining path
    // as /healthz inside this callback.
    return req.path === "/healthz" || req.path === "/health";
  },
});

// Stricter limiter for auth-adjacent and payment routes
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many payment requests. Please wait before trying again." },
});

// Stricter limiter for sync session creation only.
// Chunk uploads are authenticated and scoped to a database-backed session;
// one normal import can contain dozens of chunks.
const syncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour window
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req: any, res: any, _next: any, options: any) => {
    const resetTime = (
      req as { rateLimit?: { resetTime?: Date } }
    ).rateLimit?.resetTime ?? new Date(Date.now() + options.windowMs);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((resetTime.getTime() - Date.now()) / 1000),
    );

    logger.warn(
      {
        ip: req.ip,
        path: req.path,
        retryAt: resetTime.toISOString(),
        retryAfterSeconds,
      },
      "Sync session creation rate limit reached",
    );

    res
      .status(options.statusCode)
      .setHeader("Retry-After", String(retryAfterSeconds))
      .json({
        error: "Sync session creation rate limit exceeded.",
        code: "sync_session_rate_limited",
        retryAt: resetTime.toISOString(),
        retryAfterSeconds,
      });
  },
});

app.use("/api", generalLimiter);
app.use("/api/payment", paymentLimiter);
app.use("/api/sync/session", syncLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Production frontend ───────────────────────────────────────────────────────
// Render runs one web service for this project. In production, the API process
// also serves the already-built Vite output from the primary frontend package.
if (process.env.NODE_ENV === "production") {
  const indexPath = path.join(frontendDir, "index.html");
  let templateCache: string | null = null;
  const loadTemplate = async (): Promise<string> => {
    if (templateCache === null) templateCache = await readFile(indexPath, "utf8");
    return templateCache;
  };

  // ── SEO automation ────────────────────────────────────────────────────────
  // Sitemaps and robots.txt are generated from the route registry and the live
  // catalogue, so new pages, categories and medicines appear on their own.
  type Cached = { body: string; builtAt: number; count: number };
  const sitemapCache = new Map<string, Cached>();

  const cached = async (
    key: string,
    builder: () => Promise<{ xml: string; builtAt: number; urlCount: number }>,
  ): Promise<Cached> => {
    const hit = sitemapCache.get(key);
    if (hit && Date.now() - hit.builtAt < seoAutomation.CACHE_MS) return hit;
    try {
      const payload = await builder();
      const entry = { body: payload.xml, builtAt: payload.builtAt, count: payload.urlCount };
      sitemapCache.set(key, entry);
      return entry;
    } catch (err) {
      // A brief database wobble should not hand Google an error for the whole
      // sitemap: serve the last good copy if we have one.
      if (hit) {
        logger.warn({ err, key }, "sitemap rebuild failed, serving the previous copy");
        return hit;
      }
      throw err;
    }
  };

  const sendXml = (res: any, body: string): void => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=900, stale-while-revalidate=3600");
    res.send(body);
  };

  app.get("/sitemap.xml", async (_req: any, res: any, next: any) => {
    try {
      const entry = await cached("pages", seoAutomation.buildPagesSitemap);
      sendXml(res, entry.body);
    } catch (err) {
      logger.warn({ err }, "sitemap.xml generation failed");
      next(err);
    }
  });

  app.get("/sitemap-products.xml", async (_req: any, res: any, next: any) => {
    try {
      const entry = await cached("products", seoAutomation.buildProductsSitemap);
      sendXml(res, entry.body);
    } catch (err) {
      logger.warn({ err }, "sitemap-products.xml generation failed");
      next(err);
    }
  });

  app.get("/robots.txt", (_req: any, res: any) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(seoAutomation.buildRobotsTxt());
  });

  app.use(async (req: any, res: any, next: any) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }

    try {
      const [template, meta] = await Promise.all([loadTemplate(), buildSeo(req.path)]);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      res.send(applySeo(template, meta));
    } catch (err) {
      logger.warn({ err, path: req.path }, "SEO head injection failed, serving template");
      res.sendFile(indexPath, (err2: any) => {
        if (err2) next(err2);
      });
    }
  });
}

export default app;
