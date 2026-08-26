import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useToast } from "@/hooks/use-toast";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.9 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.4 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.3 5.3C40.9 36.5 44 30.8 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

export default function SignInModal({
  onClose,
  defaultMode = "signin",
}: {
  onClose: () => void;
  defaultMode?: "signin" | "signup";
}) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useCustomerAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogle = async () => {
    setLoading("google");
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Sign in failed", description: err?.message || "Please try again." });
    } finally {
      setLoading(null);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading("email");
    try {
      if (mode === "signup") {
        await signUpWithEmail(name, email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: mode === "signup" ? "Sign up failed" : "Sign in failed", description: err?.message || "Please check your details and try again." });
    } finally {
      setLoading(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6"
          data-testid="signin-modal"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {mode === "signup" ? "Create Account" : "Sign In"}
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <X size={16} />
            </button>
          </div>

          <button
            onClick={handleGoogle}
            disabled={!!loading}
            data-testid="button-google-signin"
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-sm font-semibold transition-all disabled:opacity-60"
          >
            {loading === "google" ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-border flex-1" />
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">or</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <div className="relative">
                <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  data-testid="input-signup-name"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                type="email"
                data-testid="input-signin-email"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                data-testid="input-signin-password"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!!loading || !email.trim() || !password.trim()}
              data-testid="button-email-signin"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold shadow-md shadow-primary/20 disabled:opacity-50 transition-all"
            >
              {loading === "email" && <Loader2 size={15} className="animate-spin" />}
              {mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            {mode === "signup" ? "Already have an account?" : "New to Ayush Medico?"}{" "}
            <button
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="text-primary font-semibold hover:underline"
              data-testid="button-toggle-auth-mode"
            >
              {mode === "signup" ? "Sign In" : "Create one"}
            </button>
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
