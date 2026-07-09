/**
 * MedicineSearch
 *
 * Debounced medicine search backed by our Express API server, which
 * proxies to OpenFDA. The API key never touches the browser.
 *
 * The frontend calls GET /api/medicines/search?q=<query>.
 * Vite dev-server proxy (vite.config.ts) forwards /api/* → api-server.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Loader2,
  Building2,
  Pill,
  FlaskConical,
  ArrowRight,
  PackageX,
  Zap,
} from "lucide-react";
import { medicineCatalog } from "@/data/medicines";
import { useRequestMedicine } from "@/context/RequestMedicineContext";

// ─── Types ────────────────────────────────────────────────────────────────────
type MedicineResult = {
  id: string;
  name: string;
  genericName: string | null;
  dosageForm: string | null;
  manufacturer: string | null;
  activeIngredients: string[] | null;
  route: string | null;
  source: "api" | "static";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchMedicines(q: string): Promise<MedicineResult[]> {
  try {
    const res = await fetch(
      `/api/medicines/search?q=${encodeURIComponent(q)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: MedicineResult[] };
    return (data.results ?? []).map((r) => ({ ...r, source: "api" as const }));
  } catch {
    return [];
  }
}

/** Offline fallback — searches only by medicine name (no hardcoded categories) */
function staticFallback(q: string): MedicineResult[] {
  const lower = q.toLowerCase();
  return medicineCatalog
    .filter((m) => m.name.toLowerCase().includes(lower))
    .slice(0, 8)
    .map((m) => ({
      id: m.name,
      name: m.name,
      genericName: null,
      dosageForm: null,
      manufacturer: null,
      activeIngredients: null,
      route: null,
      source: "static" as const,
    }));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MedicineSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MedicineResult[]>([]);
  const [selected, setSelected] = useState<MedicineResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { triggerRequest } = useRequestMedicine();

  const doSearch = useCallback(async (q: string) => {
    const apiResults = await fetchMedicines(q);
    if (apiResults.length > 0) {
      setResults(apiResults);
    } else {
      // Fall back to static catalogue when API has no results or is unreachable
      setResults(staticFallback(q));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(q), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const showDropdown =
    focused && query.trim().length >= 2 && !selected;

  function handleSelect(r: MedicineResult) {
    setSelected(r);
    setQuery(r.name);
    setFocused(false);
    setResults([]);
  }

  function handleClear() {
    setQuery("");
    setSelected(null);
    setResults([]);
    setLoading(false);
  }

  return (
    <div
      id="medicine-search"
      className="relative w-full max-w-xl mx-auto"
      data-testid="medicine-search"
    >
      {/* ── Search input ────────────────────────────────────────────────── */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="medicine-search-results"
          aria-label="Search for a medicine"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search medicines, e.g. Paracetamol, Vitamin D3…"
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
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <X size={16} />
            )}
          </button>
        )}
      </div>

      {/* ── Selected medicine card ──────────────────────────────────────── */}
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
                {/* Name + badges */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">
                    {selected.name}
                  </p>
                  {selected.dosageForm && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {selected.dosageForm}
                    </span>
                  )}
                  {selected.route && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                      {selected.route}
                    </span>
                  )}
                </div>

                {/* Generic name */}
                {selected.genericName && selected.genericName !== selected.name && (
                  <div className="flex items-center gap-1 mb-1">
                    <FlaskConical size={11} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {selected.genericName}
                    </span>
                  </div>
                )}

                {/* Manufacturer */}
                {selected.manufacturer && (
                  <div className="flex items-center gap-1 mb-1">
                    <Building2 size={11} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">
                      {selected.manufacturer}
                    </span>
                  </div>
                )}

                {/* Active ingredients */}
                {selected.activeIngredients &&
                  selected.activeIngredients.length > 0 && (
                    <div className="flex items-start gap-1 mt-1">
                      <Pill
                        size={11}
                        className="text-muted-foreground mt-0.5 flex-shrink-0"
                      />
                      <span className="text-[11px] text-muted-foreground leading-relaxed">
                        {selected.activeIngredients.join(", ")}
                      </span>
                    </div>
                  )}
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5"
                aria-label="Deselect medicine"
              >
                <X size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => triggerRequest(selected.name)}
              data-testid="button-request-selected"
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
            >
              <ArrowRight size={15} />
              Request Medicine
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dropdown ────────────────────────────────────────────────────── */}
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
            {loading ? (
              <div className="flex items-center gap-3 px-5 py-4 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin text-primary" />
                Searching medicines…
              </div>
            ) : results.length > 0 ? (
              <>
                <ul className="max-h-72 overflow-y-auto divide-y divide-border">
                  {results.map((r, i) => (
                    <li key={r.id + i} role="option" aria-selected="false">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelect(r)}
                        data-testid={`button-search-result-${i}`}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-primary/5 transition-colors duration-150 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {r.name}
                          </p>
                          {(r.genericName || r.manufacturer) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[r.genericName, r.manufacturer]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full flex-shrink-0">
                          <ArrowRight size={11} />
                          Select
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {results[0]?.source === "api" && (
                  <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-1.5">
                    <Zap size={10} className="text-primary" />
                    <span className="text-[10px] text-muted-foreground">
                      Powered by OpenFDA — availability confirmed by our pharmacist
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div
                className="px-6 py-8 text-center"
                data-testid="empty-state-search"
              >
                <PackageX
                  size={28}
                  className="mx-auto text-muted-foreground mb-3"
                />
                <p className="text-sm text-foreground font-medium mb-1">
                  No results for "{query}"
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  It may still be available — send a request and our pharmacist
                  will confirm.
                </p>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setFocused(false);
                    triggerRequest(query);
                  }}
                  data-testid="button-request-not-found"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all duration-200"
                >
                  Request This Medicine
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
