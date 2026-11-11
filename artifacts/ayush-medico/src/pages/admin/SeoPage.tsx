import { useEffect, useMemo, useState } from "react";
import { Search, Save, Loader2, CheckCircle2, AlertTriangle, ExternalLink, Globe, RefreshCw } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

type SeoPage = {
  path: string;
  url: string;
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  robots: string;
  ogImage: string;
  focusKeyword: string;
  edited: boolean;
};

async function adminFetch(path: string, init: RequestInit = {}) {
  const token = await auth?.currentUser?.getIdToken();
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> ?? {}),
    },
  });
}

type HealthCheck = { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string };
type SeoHealth = {
  generatedAt: string;
  checks: HealthCheck[];
  stats: {
    pagesInSitemap: number;
    productsInSitemap: number;
    categories: number;
    guides: number;
    blockedPrefixes: number;
    overrides: number;
  };
};

const STATUS_STYLES: Record<HealthCheck["status"], string> = {
  pass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  fail: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

/** Small traffic-light chip used for the length checks. */
function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        ok ? "bg-secondary/10 text-secondary" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
      }`}
    >
      {ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
      {label}
    </span>
  );
}

export default function SeoPage() {
  const { toast } = useToast();
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [verification, setVerification] = useState("");
  const [activePath, setActivePath] = useState("/");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [health, setHealth] = useState<SeoHealth | null>(null);
  const [auditing, setAuditing] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const resp = await adminFetch("/api/admin/seo");
        if (!resp.ok) throw new Error(`API error ${resp.status}`);
        const body = await resp.json() as { pages: SeoPage[]; verification: string };
        setPages(body.pages);
        setVerification(body.verification ?? "");
      } catch {
        toast({ variant: "destructive", title: "Failed to load SEO settings" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const runAudit = async (): Promise<void> => {
    setAuditing(true);
    try {
      const resp = await adminFetch("/api/admin/seo/health");
      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      setHealth(await resp.json() as SeoHealth);
    } catch {
      toast({ variant: "destructive", title: "SEO audit failed" });
    } finally {
      setAuditing(false);
    }
  };

  useEffect(() => {
    void runAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = useMemo(
    () => pages.find((page) => page.path === activePath) ?? pages[0],
    [pages, activePath],
  );

  const update = (patch: Partial<SeoPage>): void => {
    if (!active) return;
    setPages((current) =>
      current.map((page) => (page.path === active.path ? { ...page, ...patch } : page)),
    );
    setDirty((current) => new Set(current).add(active.path));
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const path of dirty) {
        const page = pages.find((entry) => entry.path === path);
        if (!page) continue;
        payload[path] = {
          title: page.title,
          description: page.description,
          keywords: page.keywords,
          canonical: page.canonical,
          robots: page.robots,
          ogImage: page.ogImage,
          focusKeyword: page.focusKeyword,
        };
      }
      const resp = await adminFetch("/api/admin/seo", {
        method: "PUT",
        body: JSON.stringify({ pages: payload, verification }),
      });
      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      setDirty(new Set());
      toast({ title: "SEO settings saved", description: "Live within a minute." });
    } catch {
      toast({ variant: "destructive", title: "Failed to save SEO settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!active) {
    return <p className="p-6 text-sm text-muted-foreground">No editable pages found.</p>;
  }

  const titleLen = active.title.length;
  const descLen = active.description.length;
  const keywordPresent = active.focusKeyword
    ? `${active.title} ${active.description}`.toLowerCase().includes(active.focusKeyword.toLowerCase())
    : true;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SEO</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Titles, descriptions and indexing per page. Changes render into the live page head within a minute.
          </p>
        </div>
        <button
          onClick={() => void save()}
          disabled={saving || dirty.size === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save {dirty.size > 0 ? `(${dirty.size})` : ""}
        </button>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">Automation &amp; health</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Sitemaps and robots.txt are rebuilt from the route registry and live catalogue; audits run on demand and
              never submit anything to Google.
            </p>
          </div>
          <button
            onClick={() => void runAudit()}
            disabled={auditing}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
          >
            {auditing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Re-run audit
          </button>
        </div>

        {health ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Sitemap pages", health.stats.pagesInSitemap],
                ["Products", health.stats.productsInSitemap],
                ["Categories", health.stats.categories],
                ["Guides", health.stats.guides],
                ["Blocked prefixes", health.stats.blockedPrefixes],
                ["Overrides", health.stats.overrides],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold text-foreground">{String(value)}</p>
                </div>
              ))}
            </div>

            <ul className="mt-4 space-y-1.5">
              {health.checks.map((check) => (
                <li key={check.id} className="flex items-start gap-2.5 rounded-xl border border-border/60 px-3 py-2">
                  <span className={`mt-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[check.status]}`}>
                    {check.status}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{check.label}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{check.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-muted-foreground">
              Checked {new Date(health.generatedAt).toLocaleString()}
            </p>
          </>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            {auditing ? "Auditing the site…" : "No audit yet."}
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="rounded-2xl border border-border bg-card p-3">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pages</p>
          <ul className="max-h-[420px] space-y-1 overflow-y-auto">
            {pages.map((page) => (
              <li key={page.path}>
                <button
                  onClick={() => setActivePath(page.path)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    page.path === active.path
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="truncate">{page.path}</span>
                  {page.edited && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="space-y-5">
          {/* Google-style preview */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Search size={12} /> Search result preview
            </p>
            <div className="rounded-lg bg-white p-3 dark:bg-background">
              <p className="truncate text-xs text-[#5f6368] dark:text-muted-foreground">{active.url}</p>
              <p className="mt-0.5 line-clamp-2 text-lg leading-snug text-[#1a0dab] dark:text-primary">
                {active.title || "(no title)"}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-[#4d5156] dark:text-muted-foreground">
                {active.description || "(no description)"}
              </p>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">SEO title</label>
              <input
                value={active.title}
                onChange={(e) => update({ title: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="mt-1.5 flex flex-wrap gap-2">
                <Check ok={titleLen >= 30 && titleLen <= 60} label={`${titleLen} chars (30–60)`} />
                <Check ok={titleLen <= 62} label={titleLen <= 62 ? "fits Google" : "may be truncated"} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">Meta description</label>
              <textarea
                value={active.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="mt-1.5 flex flex-wrap gap-2">
                <Check ok={descLen >= 120 && descLen <= 158} label={`${descLen} chars (120–158)`} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">Focus keyword</label>
                <input
                  value={active.focusKeyword}
                  onChange={(e) => update({ focusKeyword: e.target.value })}
                  placeholder="e.g. pharmacy near me Kurla West"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="mt-1.5">
                  <Check ok={keywordPresent} label={keywordPresent ? "keyword in title/description" : "keyword missing"} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">Robots</label>
                <select
                  value={active.robots}
                  onChange={(e) => update({ robots: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="index, follow, max-image-preview:large">index, follow</option>
                  <option value="index, follow, max-image-preview:large, max-snippet:-1">index, follow + snippets</option>
                  <option value="noindex, follow">noindex, follow</option>
                  <option value="noindex, nofollow">noindex, nofollow</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">Keywords (optional)</label>
                <input
                  value={active.keywords}
                  onChange={(e) => update({ keywords: e.target.value })}
                  placeholder="comma separated"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">Social / OG image URL</label>
                <input
                  value={active.ogImage}
                  onChange={(e) => update({ ogImage: e.target.value })}
                  placeholder="https://ayushmedico.com/opengraph.jpg"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">Canonical URL (optional)</label>
              <input
                value={active.canonical}
                onChange={(e) => update({ canonical: e.target.value })}
                placeholder="leave blank to use this page's own URL"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <a
              href={active.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              Open live page <ExternalLink size={11} />
            </a>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Globe size={13} /> Google Search Console verification
            </p>
            <p className="text-xs text-muted-foreground">
              Paste only the content value of the google-site-verification meta tag. It is added to every page head.
            </p>
            <input
              value={verification}
              onChange={(e) => {
                setVerification(e.target.value);
                setDirty((current) => new Set(current).add(active.path));
              }}
              placeholder="e.g. AbC123..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
