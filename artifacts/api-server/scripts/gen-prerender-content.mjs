/**
 * gen-prerender-content.mjs
 *
 * The storefront is a single-page app and the API server renders the HTML shell.
 * That shell used to ship an empty <div id="root">, so a crawler that does not
 * execute JavaScript (and Google's first-pass crawl) saw a page with no words on
 * it. This script lifts the real page copy out of the single source of truth in
 * artifacts/ayush-medico/src/content and writes it into the API server as a plain
 * data module, so lib/prerender.ts can put the same words in the served HTML.
 *
 * Nothing is hand-copied: the content files are transpiled with esbuild and the
 * exported arrays are read straight out of the module. Edit the content there and
 * the prerender output follows on the next build.
 */

import { transform } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(here, "../../ayush-medico/src/content");
const outFile = path.resolve(here, "../src/generated/prerenderContent.ts");

async function loadModule(file) {
  const source = await readFile(file, "utf8");
  const { code } = await transform(source, { loader: "ts", format: "esm", target: "node20" });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`;
  return import(dataUrl);
}

const pickSection = (section) => ({
  heading: String(section.heading ?? ""),
  body: (section.body ?? []).map(String),
  ...(section.bullets?.length ? { bullets: section.bullets.map(String) } : {}),
});

const [localModule, blogModule] = await Promise.all([
  loadModule(path.join(contentDir, "localPages.ts")),
  loadModule(path.join(contentDir, "blog.ts")),
]);

const localPages = (localModule.LOCAL_PAGES ?? []).map((page) => ({
  slug: String(page.slug),
  navLabel: String(page.navLabel ?? page.slug),
  h1: String(page.h1 ?? ""),
  intro: String(page.intro ?? ""),
  sections: (page.sections ?? []).map(pickSection),
  faqs: (page.faqs ?? []).map((faq) => ({
    question: String(faq.question ?? ""),
    answer: String(faq.answer ?? ""),
  })),
  related: (page.related ?? []).map(String),
}));

const blogPosts = (blogModule.BLOG_POSTS ?? []).map((post) => ({
  slug: String(post.slug),
  title: String(post.title ?? ""),
  h1: String(post.h1 ?? post.title ?? ""),
  excerpt: String(post.excerpt ?? ""),
  published: String(post.published ?? ""),
  ...(post.updated ? { updated: String(post.updated) } : {}),
  readingMinutes: Number(post.readingMinutes ?? 0),
  sections: (post.sections ?? []).map(pickSection),
}));

if (localPages.length === 0 || blogPosts.length === 0) {
  throw new Error(
    `prerender content came out empty (local=${localPages.length}, blog=${blogPosts.length}); refusing to write a broken module`,
  );
}

const header = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Source of truth: artifacts/ayush-medico/src/content/{localPages,blog}.ts
 * Regenerate: pnpm --filter @workspace/api-server run gen:prerender
 */
`;

const body = `
export type PrerenderSection = { heading: string; body: string[]; bullets?: string[] };

export type PrerenderLocalPage = {
  slug: string;
  navLabel: string;
  h1: string;
  intro: string;
  sections: PrerenderSection[];
  faqs: { question: string; answer: string }[];
  related: string[];
};

export type PrerenderBlogPost = {
  slug: string;
  title: string;
  h1: string;
  excerpt: string;
  published: string;
  updated?: string;
  readingMinutes: number;
  sections: PrerenderSection[];
};

export const PRERENDER_LOCAL_PAGES: PrerenderLocalPage[] = ${JSON.stringify(localPages, null, 2)};

export const PRERENDER_BLOG_POSTS: PrerenderBlogPost[] = ${JSON.stringify(blogPosts, null, 2)};
`;

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, header + body, "utf8");

console.log(
  `[prerender] wrote ${path.relative(process.cwd(), outFile)} — ${localPages.length} local pages, ${blogPosts.length} guides`,
);
