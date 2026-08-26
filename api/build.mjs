import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rm } from "node:fs/promises";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireFromApi = createRequire(
  path.join(repoRoot, "artifacts/api-server/package.json"),
);
const { build } = requireFromApi("esbuild");
const pinoPluginModule = requireFromApi("esbuild-plugin-pino");
const esbuildPluginPino = pinoPluginModule.default ?? pinoPluginModule;
const outputDir = path.join(repoRoot, "api/.vercel-build");

await rm(outputDir, { recursive: true, force: true });

await build({
  entryPoints: [path.join(repoRoot, "artifacts/api-server/src/app.ts")],
  outdir: outputDir,
  entryNames: "[name]",
  platform: "node",
  bundle: true,
  format: "esm",
  outExtension: { ".js": ".mjs" },
  sourcemap: false,
  logLevel: "info",
  external: [
    "*.node",
    "sharp",
    "better-sqlite3",
    "sqlite3",
    "canvas",
    "bcrypt",
    "argon2",
    "fsevents",
    "re2",
    "farmhash",
    "xxhash-addon",
    "bufferutil",
    "utf-8-validate",
    "ssh2",
    "cpu-features",
    "dtrace-provider",
    "isolated-vm",
    "lightningcss",
    "pg-native",
    "oracledb",
    "mongodb-client-encryption",
    "nodemailer",
    "handlebars",
    "knex",
    "typeorm",
    "onnxruntime-node",
    "@tensorflow/*",
    "@prisma/client",
    "@mikro-orm/*",
    "@swc/*",
    "@aws-sdk/*",
    "@azure/*",
    "@parcel/watcher",
    "@sentry/profiling-node",
    "@tree-sitter/*",
    "aws-sdk",
    "classic-level",
    "dd-trace",
    "ffi-napi",
    "grpc",
    "hiredis",
    "kerberos",
    "leveldown",
    "miniflare",
    "mysql2",
    "newrelic",
    "odbc",
    "piscina",
    "realm",
    "ref-napi",
    "rocksdb",
    "sass-embedded",
    "sequelize",
    "serialport",
    "snappy",
    "tinypool",
    "usb",
    "workerd",
    "wrangler",
    "zeromq",
    "zeromq-prebuilt",
    "playwright",
    "puppeteer",
    "puppeteer-core",
    "electron",
  ],
  plugins: [
    esbuildPluginPino({ transports: ["pino-pretty"] }),
  ],
  banner: {
    js: `import { createRequire as __bannerCrReq } from "node:module";
import __bannerPath from "node:path";
import __bannerUrl from "node:url";

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
  },
});