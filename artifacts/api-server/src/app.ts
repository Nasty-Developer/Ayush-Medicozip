import express, { type Request } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "node:path";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { initFirebaseAdmin } from "./lib/firebaseAdmin.js";
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

// ── Trust proxy ───────────────────────────────────────────────────────────────
// Replit (and most PaaS providers) sit behind a reverse-proxy that sets
// X-Forwarded-For. Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
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
app.use(cors());

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
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/api/health";
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
  handler: (req, res, _next, options) => {
    const resetTime = (
      req as Request & { rateLimit?: { resetTime?: Date } }
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
  const frontendDir = path.resolve(
    import.meta.dirname,
    "../../ayush-medico/dist/public",
  );

  app.use(express.static(frontendDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }

    res.sendFile(path.join(frontendDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

export default app;
