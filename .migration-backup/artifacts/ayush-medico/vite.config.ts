import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// PORT and BASE_PATH are injected by Replit at runtime.
// For production builds (Vercel, CI) they are not set — use safe defaults.
const rawPort = process.env.PORT;
const parsedPort = Number(rawPort);
const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 5173;

// Normalize base path: must start and end with "/"
const rawBase = process.env.BASE_PATH ?? "/";
const basePath = rawBase.startsWith("/") ? rawBase : `/${rawBase}`;

export default defineConfig({
  base: basePath,
  // Map GOOGLE_API_KEY secret → import.meta.env.VITE_FIREBASE_API_KEY.
  // Vite only exposes VITE_-prefixed env vars to the client; this bridges
  // the gap so the Firebase SDK receives the key without storing it twice.
  define: process.env.GOOGLE_API_KEY
    ? { "import.meta.env.VITE_FIREBASE_API_KEY": JSON.stringify(process.env.GOOGLE_API_KEY) }
    : {},
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    // Proxy /api/* requests to the Express API server so backend-only
    // secrets are never exposed to the browser. The api-server artifact runs on port 8080.
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_SERVER_PORT ?? 8080}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
