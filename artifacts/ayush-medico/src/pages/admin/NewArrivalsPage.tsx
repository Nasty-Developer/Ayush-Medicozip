import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Loader2, Sparkles, Award, PackageCheck, PackageX, Clock, ExternalLink } from "lucide-react";
import { subscribeToCollection, updateDocument, where } from "@/lib/firestoreHelpers";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type StockStatus = "in_stock" | "out_of_stock" | "coming_soon";
type Medicine = {
  id: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  sellingPrice?: number;
  stockStatus?: StockStatus;
  showInNewArrivals?: boolean;
  showInSpecialMedicines?: boolean;
};

const STOCK_LABEL: Record<StockStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  in_stock: { label: "In Stock", cls: "bg-secondary/10 text-secondary", icon: <PackageCheck size={11} /> },
  out_of_stock: { label: "Out of Stock", cls: "bg-muted text-muted-foreground", icon: <PackageX size={11} /> },
  coming_soon: { label: "Coming Soon", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", icon: <Clock size={11} /> },
};

export default function NewArrivalsPage() {
  const [items, setItems] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = subscribeToCollection(
      "medicines",
      [where("showInNewArrivals", "==", true)],
      (docs) => {
        const sorted = [...docs].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        setItems(sorted as unknown as Medicine[]);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const handleRemove = async (item: Medicine) => {
    try {
      await updateDocument("medicines", item.id, { showInNewArrivals: false });
      toast({ title: `"${item.name}" removed from New Arrivals` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update" });
    }
  };

  const handleCycleStock = async (item: Medicine) => {
    const cycle: StockStatus[] = ["in_stock", "out_of_stock", "coming_soon"];
    const current: StockStatus = item.stockStatus ?? "in_stock";
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
    await updateDocument("medicines", item.id, { stockStatus: next });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>New Arrivals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {items.length} medicines · <span className="text-primary font-medium">live sync</span>
          </p>
        </div>
        <Link href="/admin/medicines">
          <a className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 transition-all flex-shrink-0">
            <ExternalLink size={15} /> Manage in Medicines
          </a>
        </Link>
      </div>

      <div className="mb-5 p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-1.5">
        <p className="text-sm font-semibold text-primary flex items-center gap-2"><Sparkles size={14} /> How to add medicines here</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Go to <strong>Medicines</strong> page → Add or Edit a medicine → Check <strong>"✅ Show in New Medicine Arrivals"</strong>.
          It will appear here and on the homepage instantly.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-44 bg-card border border-border rounded-2xl text-muted-foreground">
          <Sparkles size={28} className="mb-2 text-primary/30" />
          <p className="text-sm font-medium">No medicines tagged as New Arrivals</p>
          <p className="text-xs mt-1">Edit any medicine and check "Show in New Medicine Arrivals"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const stockStatus: StockStatus = item.stockStatus ?? "in_stock";
            const { label, cls, icon } = STOCK_LABEL[stockStatus];
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
                    {item.brand && <p className="text-xs text-muted-foreground truncate">{item.brand}</p>}
                    {item.sellingPrice ? <span className="text-xs font-bold text-foreground">· ₹{item.sellingPrice}</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.showInSpecialMedicines && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-semibold">
                      <Award size={9} /> Special
                    </span>
                  )}
                  <button onClick={() => handleCycleStock(item)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${cls}`}>
                    {icon} {label}
                  </button>
                  <Link href="/admin/medicines">
                    <a className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      <Pencil size={13} />
                    </a>
                  </Link>
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
