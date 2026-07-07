import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, PackageCheck, PackageX, X, Loader2,
  Building2, Pill, FlaskConical, ArrowRight, AlertCircle,
} from "lucide-react";
import { medicineCatalog } from "@/data/medicines";
import { useRequestMedicine } from "@/context/RequestMedicineContext";

// ─── eVitalRx API ────────────────────────────────────────────────────────────
// Set VITE_EVITALRX_AUTH_TOKEN in Replit Secrets to enable live search.
// Without it the component falls back to the static medicine catalogue.
const EVITALRX_AUTH_TOKEN = import.meta.env.VITE_EVITALRX_AUTH_TOKEN as string | undefined;
const EVITALRX_SEARCH_URL = "https://www.evitalrx.in/index.php/frontapi/search";

type EvitalRxDrug = {
  drugid: string;
  name: string;
  manufacturer?: string;
  composition?: string;        // generic name / composition
  type?: string;               // Tablet, Capsule, Syrup …
  packagingdetail?: string;
  strength?: string;
  unit?: string;
};

type EvitalRxResponse = {
  status: number | string;
  message?: string;
  data?: { drugs?: EvitalRxDrug[] } | EvitalRxDrug[];
};

async function searchEvitalRx(query: string): Promise<EvitalRxDrug[]> {
  if (!EVITALRX_AUTH_TOKEN) return [];
  try {
    const res = await fetch(EVITALRX_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: EVITALRX_AUTH_TOKEN,
        search_term: query,
        searchtype: 0,
      }),
    });
    if (!res.ok) return [];
    const json: EvitalRxResponse = await res.json();
    if (!json || (json.status !== 1 && json.status !== "1")) return [];
    const drugs = Array.isArray(json.data)
      ? json.data
      : (json.data as { drugs?: EvitalRxDrug[] })?.drugs ?? [];
    return drugs.slice(0, 12);
  } catch {
    return [];
  }
}

// ─── Static catalogue fallback ────────────────────────────────────────────────
type StaticResult = {
  id: string;
  name: string;
  category: string;
  available: boolean;
  source: "static";
};

type ApiResult = EvitalRxDrug & { source: "api" };
type SearchResult = StaticResult | ApiResult;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDisplayName(r: SearchResult) {
  return r.name;
}

function getSubtitle(r: SearchResult) {
  if (r.source === "static") return r.category;
  return [r.composition, r.manufacturer].filter(Boolean).join(" · ") || r.type || "";
}

function getStrengthBadge(r: SearchResult): string | null {
  if (r.source === "api") return r.strength ?? r.unit ?? null;
  return null;
}

function getForm(r: SearchResult): string | null {
  if (r.source === "api") return r.type ?? null;
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MedicineSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [apiResults, setApiResults] = useState<ApiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { triggerRequest } = useRequestMedicine();

  // ── Static fallback results ─────────────────────────────────────────────────
  const staticResults = useMemo<StaticResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return medicineCatalog
      .filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
      .slice(0, 8)
      .map((m) => ({ ...m, id: m.name, source: "static" as const }));
  }, [query]);

  // ── Debounced eVitalRx search ──────────────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (!EVITALRX_AUTH_TOKEN || q.length < 2) {
      setApiResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const drugs = await searchEvitalRx(q);
    setApiResults(drugs.map((d) => ({ ...d, source: "api" as const })));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setApiResults([]); setLoading(false); return; }
    if (EVITALRX_AUTH_TOKEN) setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(query.trim()), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // ── Merged results ──────────────────────────────────────────────────────────
  const results: SearchResult[] = EVITALRX_AUTH_TOKEN
    ? apiResults           // API mode: show eVitalRx results only
    : staticResults;       // Fallback: show static catalogue

  const showDropdown = focused && query.trim().length >= 2 && !selected;

  function handleSelect(r: SearchResult) {
    setSelected(r);
    setQuery(r.name);
    setFocused(false);
  }

  function handleClear() {
    setQuery("");
    setSelected(null);
    setApiResults([]);
  }

  function handleRequest() {
    triggerRequest(selected?.name ?? query);
  }

  return (
    <div id="medicine-search" className="relative w-full max-w-xl mx-auto" data-testid="medicine-search">
      {/* Search input */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="medicine-search-results"
          aria-label="Search for a medicine"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search medicines, e.g. Dolo 650, Vitamin D3…"
          data-testid="input-medicine-search"
          className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-border bg-card/90 backdrop-blur-sm text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all duration-200"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            data-testid="button-clear-search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {loading
              ? <Loader2 size={16} className="animate-spin" />
              : <X size={16} />}
          </button>
        )}
      </div>

      {/* Selected medicine card */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-2 p-4 rounded-2xl border border-primary/30 bg-card shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-foreground truncate">{selected.name}</p>
                  {getForm(selected) && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {getForm(selected)}
                    </span>
                  )}
                  {getStrengthBadge(selected) && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                      {getStrengthBadge(selected)}
                    </span>
                  )}
                </div>
                {getSubtitle(selected) && (
                  <p className="text-xs text-muted-foreground truncate">{getSubtitle(selected)}</p>
                )}
                {selected.source === "api" && selected.manufacturer && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Building2 size={11} className="text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{selected.manufacturer}</span>
                  </div>
                )}
                {selected.source === "api" && selected.packagingdetail && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Pill size={11} className="text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{selected.packagingdetail}</span>
                  </div>
                )}
                {selected.source === "api" && selected.composition && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <FlaskConical size={11} className="text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{selected.composition}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5"
              >
                <X size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={handleRequest}
              data-testid="button-request-selected"
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
            >
              <ArrowRight size={15} />
              Request Medicine
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            id="medicine-search-results"
            role="listbox"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl shadow-primary/5 overflow-hidden z-20"
          >
            {loading && apiResults.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-4 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin text-primary" />
                Searching medicines…
              </div>
            ) : results.length > 0 ? (
              <ul className="max-h-72 overflow-y-auto divide-y divide-border">
                {results.map((r, i) => (
                  <li key={r.source === "api" ? r.drugid : r.name + i} role="option" aria-selected="false">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(r)}
                      data-testid={`button-search-result-${i}`}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-primary/5 transition-colors duration-150 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                        {getSubtitle(r) && (
                          <p className="text-xs text-muted-foreground truncate">{getSubtitle(r)}</p>
                        )}
                      </div>
                      {r.source === "static" ? (
                        r.available ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full flex-shrink-0">
                            <PackageCheck size={11} /> In Stock
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full flex-shrink-0">
                            <PackageX size={11} /> Request
                          </span>
                        )
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full flex-shrink-0">
                          <ArrowRight size={11} /> Select
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-8 text-center" data-testid="empty-state-search">
                <PackageX size={28} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-foreground font-medium mb-1">
                  We couldn't find "{query}"
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  It may still be available in-store — send us a request and we'll confirm.
                </p>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setFocused(false); triggerRequest(query); }}
                  data-testid="button-request-not-found"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all duration-200"
                >
                  Request This Medicine
                </button>
              </div>
            )}

            {/* API attribution / status */}
            {EVITALRX_AUTH_TOKEN && results.length > 0 && (
              <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-1.5">
                <AlertCircle size={11} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Powered by eVitalRx — live medicine data</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
