import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { subscribeToCustomerOrders, type Order } from "@/lib/orderService";
import { ORDER_STATUS_LABELS, type OrderStatus, isNegativeOrderStatus } from "@/lib/orderStatus";
import SignInModal from "@/components/customer/SignInModal";
import { InvoiceActions } from "@/components/customer/Invoice";

type Filter = "all" | "active" | "delivered" | "cancelled";

function formatDate(order: Order): string {
  return new Date(order.createdAt.seconds * 1000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value: number | null | undefined): string {
  if (value == null) return "Pending review";
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function StatusPill({ status }: { status: OrderStatus }) {
  const negative = isNegativeOrderStatus(status);
  const delivered = status === "delivered";
  const Icon = delivered ? CheckCircle2 : negative ? XCircle : status === "out-for-delivery" ? Truck : Clock3;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${delivered ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : negative ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`} data-testid={`status-order-${status}`}>
      <Icon size={12} /> {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function OrderCard({ order, recent = false }: { order: Order; recent?: boolean }) {
  return (
    <article className={`group rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/35 hover:shadow-md ${recent ? "min-w-[270px] flex-1" : ""}`} data-testid={`card-order-${order.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold text-primary" data-testid={`text-order-id-${order.id}`}>{order.orderId}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><CalendarDays size={12} /> {formatDate(order)}</p>
        </div>
        <StatusPill status={order.status} />
      </div>
      <div className="mt-4 space-y-2">
        {order.items.slice(0, 3).map((item, index) => (
          <div key={`${item.medicineId}-${index}`} className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-primary/60">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Package size={16} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{item.medicineName}</p>
              <p className="text-[11px] text-muted-foreground">Qty {item.quantity} × {money(item.unitPrice)}</p>
            </div>
            <p className="shrink-0 text-xs font-semibold text-foreground">{money(item.totalPrice)}</p>
          </div>
        ))}
        {order.items.length > 3 && (
          <p className="text-[11px] text-muted-foreground">+{order.items.length - 3} more item{order.items.length - 3 === 1 ? "" : "s"} in order details</p>
        )}
        {order.items.length === 0 && <p className="text-sm font-semibold text-foreground">Order items</p>}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{order.items.length} {order.items.length === 1 ? "item" : "items"} · {order.address.city}</p>
      <div className="mt-4 flex flex-col items-start gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base font-bold text-foreground">{money(order.pricing.grandTotal)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <InvoiceActions order={order} compact />
          <Link href={`/order/${order.id}`} data-testid={`link-view-order-${order.id}`} className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90">
            View <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useCustomerAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setOrders(null);
    setError(null);
    if (!user) return;
    const unsubscribe = subscribeToCustomerOrders(
      user.uid,
      (nextOrders) => setOrders(nextOrders),
      () => setError("We couldn’t load your order history. Please try again."),
    );
    return unsubscribe;
  }, [user, reloadKey]);

  const recentOrders = useMemo(() => (orders ?? []).slice(0, 3), [orders]);
  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (orders ?? []).filter((order) => {
      const filterMatch = filter === "all"
        || (filter === "active" && !isNegativeOrderStatus(order.status) && order.status !== "delivered")
        || (filter === "delivered" && order.status === "delivered")
        || (filter === "cancelled" && isNegativeOrderStatus(order.status));
      const queryMatch = !normalized
        || order.orderId.toLowerCase().includes(normalized)
        || order.items.some((item) => item.medicineName.toLowerCase().includes(normalized));
      return filterMatch && queryMatch;
    });
  }, [filter, orders, query]);
  const deliveredCount = (orders ?? []).filter((order) => order.status === "delivered").length;
  const activeCount = (orders ?? []).filter((order) => !isNegativeOrderStatus(order.status) && order.status !== "delivered").length;

  if (authLoading) {
    return <div className="min-h-[70dvh] px-4 pt-32"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-9 w-48 rounded-lg bg-muted" /><div className="mt-3 h-4 w-80 rounded bg-muted" /><div className="mt-12 h-44 rounded-2xl bg-muted" /></div></div>;
  }

  if (!user) {
    return (
      <div className="min-h-[75dvh] px-4 pb-20 pt-32">
        <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileText size={25} /></div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">Your orders, in one place</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in to view delivery updates, invoices, and the items you’ve ordered from Ayush Medico.</p>
          <button type="button" onClick={() => setShowSignIn(true)} data-testid="button-sign-in-orders" className="mt-7 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90">Sign in to continue</button>
        </div>
        {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-20 pt-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Customer account</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">My Orders</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Follow every order from pharmacy shelf to your door. Your order history stays linked to this account.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live order updates
          </div>
        </header>

        {error && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert" data-testid="error-orders">
            <div className="flex items-center gap-3"><AlertCircle size={18} className="text-destructive" /><p className="text-sm text-destructive">{error}</p></div>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} data-testid="button-retry-orders" className="inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/25 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10"><RefreshCw size={13} /> Try again</button>
          </div>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-2xl bg-primary p-5 text-primary-foreground sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/70">Order overview</p><p className="mt-2 text-3xl font-bold">{orders?.length ?? "—"} <span className="text-base font-medium text-primary-foreground/75">orders placed</span></p></div>
              <Package size={24} className="opacity-75" />
            </div>
            <div className="mt-7 flex gap-8 border-t border-primary-foreground/20 pt-4 text-sm"><div><p className="font-bold">{activeCount}</p><p className="text-primary-foreground/70">In progress</p></div><div><p className="font-bold">{deliveredCount}</p><p className="text-primary-foreground/70">Delivered</p></div></div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Need a copy?</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Invoices are ready for every order.</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">View, download, or print a clean HTML bill from any order card.</p>
            <div className="mt-5 flex items-center gap-2 text-xs font-bold text-primary"><FileText size={14} /> Available below</div>
          </div>
        </section>

        {orders === null && !error && <div className="mt-10 space-y-3" aria-label="Loading orders"><div className="h-5 w-36 animate-pulse rounded bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /></div>}

        {orders && orders.length === 0 && !error && (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center sm:p-16" data-testid="empty-orders">
            <Package size={30} className="mx-auto text-primary/50" />
            <h2 className="mt-4 text-lg font-bold text-foreground">No orders yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">When you place an order from the Ayush Medico cart, its status and invoice will appear here.</p>
            <Link href="/categories" data-testid="link-browse-medicines" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">Browse medicines <ChevronRight size={15} /></Link>
          </div>
        )}

        {orders && orders.length > 0 && (
          <>
            <section className="mt-10" data-testid="section-recent-orders">
              <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Quick view</p><h2 className="mt-1 text-xl font-bold text-foreground">Recent placed orders</h2></div><p className="text-xs text-muted-foreground">Latest {recentOrders.length}</p></div>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">{recentOrders.map((order) => <OrderCard key={`recent-${order.id}`} order={order} recent />)}</div>
            </section>

            <section className="mt-12" data-testid="section-all-orders">
              <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Full history</p><h2 className="mt-1 text-xl font-bold text-foreground">All orders <span className="text-sm font-medium text-muted-foreground">({filteredOrders.length})</span></h2></div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative"><span className="sr-only">Search orders</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order or medicine" data-testid="input-search-orders" className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs text-foreground outline-none ring-primary/20 placeholder:text-muted-foreground focus:ring-2 sm:w-56" /></label>
                  <div className="flex rounded-lg border border-border bg-card p-0.5">
                    {(["all", "active", "delivered", "cancelled"] as Filter[]).map((value) => <button type="button" key={value} onClick={() => setFilter(value)} data-testid={`button-filter-orders-${value}`} className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold capitalize transition-colors ${filter === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{value}</button>)}
                  </div>
                </div>
              </div>
              {filteredOrders.length > 0 ? <div className="mt-4 grid gap-3 md:grid-cols-2">{filteredOrders.map((order) => <OrderCard key={order.id} order={order} />)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center"><p className="text-sm font-semibold text-foreground">No matching orders</p><p className="mt-1 text-xs text-muted-foreground">Try another order number, medicine, or filter.</p></div>}
            </section>
          </>
        )}
      </div>
    </div>
  );
}