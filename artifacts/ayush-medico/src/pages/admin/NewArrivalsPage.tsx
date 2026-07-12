/**
 * NewArrivalsPage — Admin
 * Shows medicines flagged as newArrival=true from PostgreSQL.
 * "Remove" untags the medicine via PUT /api/admin/medicines/:id.
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles, Award, PackageCheck, PackageX, ExternalLink, RefreshCw } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
type AdminMedicine = {
  id: number; name: string; companyName: string | null; imageUrl: string | null;
  sellingPrice: string | null; stockStatus: StockStatus; special: boolean;
};

const STOCK_LABEL: Record<StockStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  in_stock:     { label: "In Stock",     cls: "bg-secondary/10 text-secondary",        icon: <PackageCheck size={11} /> },
  low_stock:    { label: "Low Stock",    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", icon: <PackageCheck size={11} /> },
  out_of_stock: { label: "Out of Stock", cls: "bg-muted text-muted-foreground",         icon: <PackageX size={11} /> },
};

async function adminFetch(path: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> ?? {}),
    },
  });
}

export default function NewArrivalsPage() {
  const [items,   setItems]   = useState<AdminMedicine[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res   = await fetch("/api/admin/medicines?newArrival=true&limit=100", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json() as { data: AdminMedicine[]; total: number };
      setItems(data.data);
      setTotal(data.total);
    } catch {
      toast({ variant: "destructive", title: "Failed to load medicines" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = async (item: AdminMedicine) => {
    try {
      await adminFetch(`/api/admin/medicines/${item.id}`, {
        method: "PUT", body: JSON.stringify({ newArrival: false }),
      });
      toast({ title: `"${item.name}" removed from New Arrivals` });
      load();
    } catch { toast({ variant: "destructive", title: "Failed to update" }); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>New Arrivals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} medicines · <span className="text-primary font-medium">PostgreSQL</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <Link href="/admin/medicines">
            <a className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 transition-all flex-shrink-0">
              <ExternalLink size={15} /> Manage in Medicines
            </a>
          </Link>
        </div>
      </div>

      <div className="mb-5 p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-1.5">
        <p className="text-sm font-semibold text-primary flex items-center gap-2"><Sparkles size={14} /> How to add medicines here</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Go to <strong>Medicines</strong> → Edit a medicine → Enable <strong>"New Arrivals"</strong> flag. It will appear here immediately.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-44 bg-card border border-border rounded-2xl text-muted-foreground">
          <Sparkles size={28} className="mb-2 text-primary/30" />
          <p className="text-sm font-medium">No medicines tagged as New Arrivals</p>
          <p className="text-xs mt-1">Edit any medicine and enable the New Arrivals flag</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const { label, cls, icon } = STOCK_LABEL[item.stockStatus] ?? STOCK_LABEL.out_of_stock;
            return (
              <div key={item.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border border-border">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <span className="text-primary font-bold text-sm">{item.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  <div className="flex items-center gap-2">
                    {item.companyName && <p className="text-xs text-muted-foreground truncate">{item.companyName}</p>}
                    {item.sellingPrice ? <span className="text-xs font-bold text-foreground">· ₹{item.sellingPrice}</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.special && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-semibold">
                      <Award size={9} /> Special
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
                    {icon} {label}
                  </span>
                  <button onClick={() => handleRemove(item)}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
