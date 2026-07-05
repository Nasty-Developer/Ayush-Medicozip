import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Award, PackageCheck, PackageX, Clock, ShieldCheck } from "lucide-react";
import { subscribeToCollection, subscribeToDoc, where } from "@/lib/firestoreHelpers";
import { isFirebaseConfigured } from "@/lib/firebase";

type StockStatus = "in_stock" | "out_of_stock" | "coming_soon";

type Medicine = {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  imageUrl?: string;
  stockStatus?: StockStatus;
  available?: boolean;
  sellingPrice?: number;
  mrp?: number;
  discount?: number;
  showInSpecialMedicines?: boolean;
  order?: number;
};

function getStockStatus(item: Medicine): StockStatus {
  if (item.stockStatus) return item.stockStatus;
  return item.available === false ? "out_of_stock" : "in_stock";
}

function StockBadge({ status }: { status: StockStatus }) {
  const map = {
    in_stock: { label: "Available", icon: <PackageCheck size={9} />, cls: "bg-secondary/90 text-white" },
    out_of_stock: { label: "Out of Stock", icon: <PackageX size={9} />, cls: "bg-muted/90 text-muted-foreground" },
    coming_soon: { label: "Coming Soon", icon: <Clock size={9} />, cls: "bg-amber-500/90 text-white" },
  };
  const { label, icon, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm ${cls}`}>
      {icon} {label}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="h-44 bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-5 bg-muted rounded w-1/3 mt-2" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center col-span-full">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
        className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mb-5 shadow-inner"
      >
        <Award size={34} className="text-secondary/40" />
      </motion.div>
      <h3 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
        Exclusive medicines coming soon!
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        We're sourcing special medicines only available at Ayush Medico. Stay tuned!
      </p>
    </div>
  );
}

function ExclusiveCard({ item, index }: { item: Medicine; index: number }) {
  const [imgErr, setImgErr] = useState(false);
  const status = getStockStatus(item);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.07, 0.42) }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-secondary/15 hover:border-secondary/30 transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />

      <div className="relative h-44 bg-gradient-to-br from-secondary/8 to-primary/8 overflow-hidden">
        {item.imageUrl && !imgErr ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <span className="text-white font-bold text-2xl">{item.name.charAt(0)}</span>
            </div>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold shadow-md">
            <Award size={9} /> EXCLUSIVE
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <StockBadge status={status} />
        </div>
      </div>

      <div className="relative p-4">
        {item.brand && <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">{item.brand}</p>}
        <h3 className="text-sm font-bold text-foreground mb-1.5 leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {item.name}
        </h3>
        {item.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>}
        {item.sellingPrice ? (
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-base font-bold text-foreground">₹{item.sellingPrice}</span>
            {item.mrp && Number(item.mrp) > Number(item.sellingPrice) && (
              <span className="text-xs text-muted-foreground line-through">₹{item.mrp}</span>
            )}
            {item.discount ? (
              <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full">{item.discount}% OFF</span>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-secondary mt-2.5">
          <ShieldCheck size={11} /> Only at Ayush Medico
        </div>
      </div>
    </motion.div>
  );
}

const DEFAULTS = {
  title: "Special Medicines – Only Available Here",
  description: "Hard-to-find medicines and exclusive healthcare products stocked specially for you at Ayush Medico.",
};

export default function SpecialMedicines() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [items, setItems] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionEnabled, setSectionEnabled] = useState(true);
  const [title, setTitle] = useState(DEFAULTS.title);
  const [description, setDescription] = useState(DEFAULTS.description);

  useEffect(() => {
    if (!isFirebaseConfigured) { setLoading(false); return; }

    // Real-time: medicines where showInSpecialMedicines == true
    const unsubMeds = subscribeToCollection(
      "medicines",
      [where("showInSpecialMedicines", "==", true)],
      (docs) => {
        const sorted = [...docs].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        setItems(sorted as unknown as Medicine[]);
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubSettings = subscribeToDoc("settings", "homepage", (doc) => {
      if (!doc) return;
      if (doc.specialMedicinesEnabled === false) setSectionEnabled(false);
      else setSectionEnabled(true);
      if (doc.specialMedicinesTitle) setTitle(doc.specialMedicinesTitle as string);
      if (doc.specialMedicinesDescription) setDescription(doc.specialMedicinesDescription as string);
    });

    return () => { unsubMeds(); unsubSettings(); };
  }, []);

  if (!loading && !sectionEnabled) return null;

  return (
    <section id="special-medicines" ref={ref} className="py-20 lg:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold border border-secondary/20 mb-4">
            <Award size={14} /> Exclusively Ours
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {title}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">{description}</p>
        </motion.div>

        {/* Responsive grid — only as many columns as there are cards */}
        <div className={`grid gap-5 ${
          loading || items.length >= 4
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : items.length === 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : items.length === 2
            ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
            : items.length === 1
            ? "grid-cols-1 max-w-sm mx-auto"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }`}>
          {loading
            ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
            : items.length === 0
            ? <EmptyState />
            : items.map((item, i) => <ExclusiveCard key={item.id} item={item} index={i} />)}
        </div>
      </div>
    </section>
  );
}
