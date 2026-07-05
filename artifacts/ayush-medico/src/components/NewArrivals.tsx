import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Sparkles, PackageCheck, PackageX, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { subscribeToCollection, subscribeToDoc, orderBy, where } from "@/lib/firestoreHelpers";
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
  showInNewArrivals?: boolean;
  order?: number;
};

function getStockStatus(item: Medicine): StockStatus {
  if (item.stockStatus) return item.stockStatus;
  return item.available === false ? "out_of_stock" : "in_stock";
}

function StockBadge({ status }: { status: StockStatus }) {
  const map = {
    in_stock: { label: "In Stock", icon: <PackageCheck size={9} />, cls: "bg-secondary/90 text-white" },
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
    <div className="flex-shrink-0 w-56 sm:w-64 bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="h-40 bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-5 bg-muted rounded w-1/3 mt-2" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
        className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5 shadow-inner"
      >
        <Sparkles size={34} className="text-primary/40" />
      </motion.div>
      <h3 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
        New medicines coming soon!
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        We're stocking up on the latest medicines. Check back soon for fresh arrivals.
      </p>
    </div>
  );
}

function MedicineCard({ item, index }: { item: Medicine; index: number }) {
  const [imgErr, setImgErr] = useState(false);
  const status = getStockStatus(item);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.4) }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="flex-shrink-0 w-56 sm:w-64 bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:border-primary/25 transition-all duration-300 group"
    >
      <div className="relative h-40 bg-gradient-to-br from-primary/5 to-secondary/5 overflow-hidden">
        {item.imageUrl && !imgErr ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">{item.name.charAt(0)}</span>
            </div>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-bold shadow-md">
            <Sparkles size={9} /> NEW
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5">
          <StockBadge status={status} />
        </div>
      </div>
      <div className="p-4">
        {item.brand && <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">{item.brand}</p>}
        <h3 className="text-sm font-bold text-foreground mb-1 leading-tight line-clamp-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
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
      </div>
    </motion.div>
  );
}

const DEFAULTS = {
  title: "New Medicine Arrivals",
  description: "Fresh stock just landed — be the first to know about our latest medicines and health products.",
};

export default function NewArrivals() {
  const ref = useRef(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [items, setItems] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionEnabled, setSectionEnabled] = useState(true);
  const [title, setTitle] = useState(DEFAULTS.title);
  const [description, setDescription] = useState(DEFAULTS.description);

  useEffect(() => {
    if (!isFirebaseConfigured) { setLoading(false); return; }

    // Real-time: all medicines where showInNewArrivals == true
    const unsubMeds = subscribeToCollection(
      "medicines",
      [where("showInNewArrivals", "==", true)],
      (docs) => {
        const sorted = [...docs].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        setItems(sorted as unknown as Medicine[]);
        setLoading(false);
      },
      () => setLoading(false)
    );

    // Real-time: homepage settings
    const unsubSettings = subscribeToDoc("settings", "homepage", (doc) => {
      if (!doc) return;
      if (doc.newArrivalsEnabled === false) setSectionEnabled(false);
      else setSectionEnabled(true);
      if (doc.newArrivalsTitle) setTitle(doc.newArrivalsTitle as string);
      if (doc.newArrivalsDescription) setDescription(doc.newArrivalsDescription as string);
    });

    return () => { unsubMeds(); unsubSettings(); };
  }, []);

  // If section disabled by admin → don't show at all
  if (!loading && !sectionEnabled) return null;

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });

  return (
    <section id="new-arrivals" ref={ref} className="py-20 lg:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
              <Sparkles size={14} /> Just Arrived
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {title}
            </h2>
            <p className="text-muted-foreground text-base max-w-xl">{description}</p>
          </div>
          {!loading && items.length > 3 && (
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => scroll("left")}
                className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => scroll("right")}
                className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {items.map((item, i) => (
              <div key={item.id} className="snap-start">
                <MedicineCard item={item} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
