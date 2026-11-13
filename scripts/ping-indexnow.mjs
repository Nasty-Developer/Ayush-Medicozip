#!/usr/bin/env node
/**
 * ping-indexnow.mjs — ask Bing, Yandex, Seznam and Naver to recrawl the site.
 *
 * Google has its own submission channel (Search Console) which needs the owner's
 * account, but IndexNow needs nothing more than a key file hosted on the domain.
 * That makes it the one index channel a deploy can drive on its own, and Bing is
 * where the "medicine delivery in Kurla" style queries often surface first.
 *
 * Usage:
 *   node scripts/ping-indexnow.mjs              # everything in both sitemaps
 *   node scripts/ping-indexnow.mjs /delivery    # just these paths
 *   SITE=https://staging.example node scripts/ping-indexnow.mjs
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "../artifacts/ayush-medico/public");
const SITE = (process.env.SITE ?? "https://ayushmedico.com").replace(/\/$/, "");

/** The key is whatever 32-hex-char .txt file the build is hosting at the root. */
async function findKey() {
  const files = await readdir(publicDir);
  const match = files.find((name) => /^[a-f0-9]{8,128}\.txt$/.test(name));
  if (!match) throw new Error("no IndexNow key file found in artifacts/ayush-medico/public");
  const key = (await readFile(path.join(publicDir, match), "utf8")).trim();
  return { key, keyLocation: `${SITE}/${match}` };
}

async function urlsFromSitemap(location) {
  const res = await fetch(location);
  if (!res.ok) throw new Error(`${location} returned ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

const args = process.argv.slice(2).filter((arg) => arg.startsWith("/"));
let urls = args.map((arg) => `${SITE}${arg}`);
if (urls.length === 0) {
  urls = [
    ...(await urlsFromSitemap(`${SITE}/sitemap.xml`)),
    ...(await urlsFromSitemap(`${SITE}/sitemap-products.xml`)),
  ];
}

const { key, keyLocation } = await findKey();

// The protocol caps a submission at 10,000 URLs; anything more is a separate POST.
const batches = [];
for (let i = 0; i < urls.length; i += 10000) batches.push(urls.slice(i, i + 10000));

let accepted = 0;
for (const [index, batch] of batches.entries()) {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation, urlList: batch }),
  });
  const body = await res.text().catch(() => "");
  if (res.ok) {
    accepted += batch.length;
    console.log(`[indexnow] batch ${index + 1}/${batches.length}: ${batch.length} URLs accepted (${res.status})`);
  } else {
    console.error(`[indexnow] batch ${index + 1}/${batches.length} failed (${res.status}): ${body.slice(0, 300)}`);
  }
}

console.log(`[indexnow] submitted ${accepted}/${urls.length} URLs for ${SITE}`);
// 200 = accepted, 202 = accepted but key still being validated. Anything else is a real problem.
process.exit(accepted === urls.length ? 0 : 1);
