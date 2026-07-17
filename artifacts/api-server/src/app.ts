import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { initFirebaseAdmin } from "./lib/firebaseAdmin";

initFirebaseAdmin();

const app: Express = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Handled by Vite/frontend
  })
);

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
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

// Stricter limiter for sync (heavy upload endpoint)
const syncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour window
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Sync rate limit exceeded. Please wait an hour before re-syncing." },
});

app.use("/api", generalLimiter);
app.use("/api/payment", paymentLimiter);
app.use("/api/sync", syncLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", router);

export default app;
