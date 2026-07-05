import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, PackageCheck, PackageX, X } from "lucide-react";
import { medicineCatalog } from "@/data/medicines";
import { useRequestMedicine } from "@/context/RequestMedicineContext";

export default function MedicineSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { triggerRequest } = useRequestMedicine();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return medicineCatalog
      .filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query]);

  const showDropdown = focused && query.trim().length > 0;

  return (
    <div id="medicine-search" className="relative w-full max-w-xl mx-auto" data-testid="medicine-search">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="medicine-search-results"
          aria-label="Search for a medicine"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search medicines, e.g. Paracetamol, Vitamin D3..."
          data-testid="input-medicine-search"
          className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-border bg-card/90 backdrop-blur-sm text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all duration-200"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            data-testid="button-clear-search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

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
            {results.length > 0 ? (
              <ul className="max-h-72 overflow-y-auto divide-y divide-border">
                {results.map((med, i) => (
                  <li key={i} role="option" aria-selected="false">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-primary/5 transition-colors duration-150">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{med.name}</p>
                        <p className="text-xs text-muted-foreground">{med.category}</p>
                      </div>
                      {med.available ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full flex-shrink-0">
                          <PackageCheck size={12} /> In Stock
                        </span>
                      ) : (
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => triggerRequest(med.name)}
                          data-testid={`button-request-${i}`}
                          className="flex items-center gap-1 text-xs font-semibold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-full flex-shrink-0 transition-colors duration-150"
                        >
                          <PackageX size={12} /> Request
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-8 text-center" data-testid="empty-state-search">
                <PackageX size={28} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-foreground font-medium mb-1">We couldn't find "{query}"</p>
                <p className="text-xs text-muted-foreground mb-4">It may still be available in-store — send us a request and we'll confirm.</p>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => triggerRequest(query)}
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
