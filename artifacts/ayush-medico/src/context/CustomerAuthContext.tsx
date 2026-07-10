// Customer-facing authentication context — separate from the admin
// AuthContext (which gates /admin routes with email/password only). This
// context powers the "Sign In" / "My Account" nav item and My Orders.
//
// FUTURE PHONE AUTH: the architecture here is intentionally provider-agnostic
// — `user` is just a Firebase `User | null`, and any order lookups key off
// `user.uid`. Adding Firebase Phone Authentication later only means adding
// another `signInWithX` method beside `signInWithGoogle`/`signInWithEmail`;
// nothing downstream (My Orders queries, order-linking on submit) needs to
// change because they all key off the same `uid`.

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

type CustomerAuthContextValue = {
  user: User | null;
  loading: boolean;
  /** Non-null when a redirect-based sign-in returned an error on page reload. */
  redirectError: string | null;
  clearRedirectError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  const clearRedirectError = useCallback(() => setRedirectError(null), []);

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    // Process any pending redirect result on page load (fires after signInWithRedirect
    // is used as a popup fallback). A null result means no redirect was pending.
    // Errors here are sign-in failures that need to reach the user — store them
    // in state so the Header can show a toast rather than swallowing them.
    getRedirectResult(auth).then(() => {
      // Successful redirect — onAuthStateChanged below will set the user.
    }).catch((err: any) => {
      if (!err?.code) return; // not a Firebase AuthError
      const message: string = (() => {
        switch (err.code) {
          case "auth/unauthorized-domain":
            return `Sign-in blocked: this domain isn't authorized in Firebase. ` +
              `Add it under Firebase Console → Authentication → Settings → Authorized domains.`;
          case "auth/account-exists-with-different-credential":
            return "An account already exists with this email using a different sign-in method.";
          default:
            return err.message || "Google sign-in failed. Please try again.";
        }
      })();
      console.error("[Firebase Auth] Redirect sign-in failed:", err.code, err.message);
      setRedirectError(message);
    });

    // NOTE: this listens on the same Firebase Auth instance used by the
    // admin login. In practice admin and customer sign-in never overlap in
    // the same browser session (different routes, different people), so a
    // single `auth.currentUser` is sufficient without a second Firebase app.
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase is not configured.");
    const provider = new GoogleAuthProvider();
    // Attempt popup first — better UX (no page navigation).
    // Falls back to redirect only when the browser blocked the popup, which is
    // common in Replit's sandboxed iframe preview. User-initiated close of the
    // popup (auth/popup-closed-by-user) is treated as cancellation, not an error
    // requiring redirect.
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err?.code === "auth/popup-blocked") {
        // signInWithRedirect navigates the page away; execution does not resume
        // here. On return the page reloads, getRedirectResult fires above, and
        // onAuthStateChanged sets the user.
        await signInWithRedirect(auth, provider);
        return;
      }
      if (err?.code === "auth/popup-closed-by-user") {
        // User cancelled — not an error, just return silently.
        return;
      }
      // Re-throw all other errors (auth/unauthorized-domain, network errors, etc.)
      // so SignInModal can display a meaningful toast.
      throw err;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase is not configured.");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (name: string, email: string, password: string) => {
    if (!auth) throw new Error("Firebase is not configured.");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        loading,
        redirectError,
        clearRedirectError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
