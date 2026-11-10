/**
 * TeamPage — Admin
 *
 * Controls who can open the admin panel. Admin rights are stored in the
 * PostgreSQL admin_users table and checked by the API, so adding a staff member
 * takes effect on their next sign-in without an env change or a rebuild.
 *
 * The person needs a normal account on the site first (Sign In → create
 * account). Adding their email here grants the admin panel; removing it takes
 * the panel away on their next request.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, UserPlus, Trash2, Loader2, AlertCircle, Shield, RefreshCw, CheckCircle2,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

type AdminAccount = {
  id: number;
  email: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  managedByEnv: boolean;
};

async function adminFetch(path: string, init: RequestInit = {}) {
  const token = await auth?.currentUser?.getIdToken();
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TeamPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");

  const currentEmail = auth?.currentUser?.email?.toLowerCase() ?? "";

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await adminFetch("/api/admin/accounts");
      if (!res.ok) {
        setLoadError(
          res.status === 403
            ? "This account is not allowed to manage admins."
            : "Could not load the admin list.",
        );
        setAdmins([]);
        return;
      }
      const data = (await res.json()) as { data: AdminAccount[] };
      setAdmins(data.data ?? []);
    } catch {
      setLoadError("Could not load the admin list. Check your connection.");
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeAdmins = useMemo(() => admins.filter((admin) => admin.isActive), [admins]);
  const inactiveAdmins = useMemo(() => admins.filter((admin) => !admin.isActive), [admins]);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFormError("Enter a valid email address.");
      return;
    }
    setAdding(true);
    try {
      const res = await adminFetch("/api/admin/accounts", {
        method: "POST",
        body: JSON.stringify({ email: value }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; created?: boolean };
      if (!res.ok) {
        setFormError(body.error ?? "Could not add this admin.");
        return;
      }
      toast({
        title: body.created === false
          ? "Admin access restored ✓"
          : "Admin added ✓",
        description: `${value} can sign in to the admin panel now.`,
      });
      setEmail("");
      setLoading(true);
      await load();
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (admin: AdminAccount) => {
    setRemovingId(admin.id);
    try {
      const res = await adminFetch(`/api/admin/accounts/${admin.id}`, { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({ variant: "destructive", title: "Could not remove admin", description: body.error });
        return;
      }
      toast({ title: "Admin access removed", description: admin.email });
      setLoading(true);
      await load();
    } catch {
      toast({ variant: "destructive", title: "Could not reach the server" });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Team Access
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everyone on this list can open the admin panel with their own login.
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); void load(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex items-start gap-3">
        <CheckCircle2 size={18} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/80">
          The person must have an account on the website first. Ask them to open the site, choose
          <span className="font-semibold"> Sign In → create an account</span> with the email you want to use,
          then add that same email here. Their next sign-in opens the admin panel.
        </p>
      </div>

      <form onSubmit={handleAdd} className="bg-card border border-border rounded-2xl p-5">
        <label className="block text-sm font-semibold text-foreground mb-2">Add an admin by email</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <UserPlus size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setFormError(""); }}
              placeholder="staff@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !email.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {adding ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            {adding ? "Adding…" : "Add admin"}
          </button>
        </div>
        {formError && (
          <p className="mt-2 text-xs text-destructive flex items-center gap-1.5">
            <AlertCircle size={13} /> {formError}
          </p>
        )}
      </form>

      {loadError && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle size={16} /> {loadError}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Admins ({activeAdmins.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : activeAdmins.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No admins loaded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {activeAdmins.map((admin) => {
              const isSelf = admin.email.toLowerCase() === currentEmail;
              return (
                <li key={admin.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{admin.email}</p>
                      {isSelf && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          You
                        </span>
                      )}
                      {admin.role === "superadmin" && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                          Owner
                        </span>
                      )}
                      {admin.managedByEnv && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          Env managed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last sign-in: {formatDate(admin.lastLoginAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => void handleRemove(admin)}
                    disabled={removingId === admin.id || admin.managedByEnv}
                    title={admin.managedByEnv ? "Managed by the ADMIN_EMAIL environment variable" : "Remove admin access"}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-start sm:self-center"
                  >
                    {removingId === admin.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Trash2 size={13} />}
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {inactiveAdmins.length > 0 && (
        <div className="bg-muted/40 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Removed ({inactiveAdmins.length})</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            These emails no longer open the admin panel. Add the email again to restore access.
          </p>
          <ul className="space-y-1">
            {inactiveAdmins.map((admin) => (
              <li key={admin.id} className="text-xs text-muted-foreground font-mono">{admin.email}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
