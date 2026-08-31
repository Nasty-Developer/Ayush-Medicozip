// Shared Firebase authentication context for customer and admin surfaces.
// AuthContext derives its admin-facing API from this provider so Firebase only
// has one live auth-state listener. This context powers the "Sign In" /
// "My Account" nav item and My Orders.
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
  setPersistence,
  browserLocalPersistence,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  auth,
  firebaseConfigurationError,
  isFirebaseConfigured,
} from "@/lib/firebase";

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

type FirebaseAuthErrorLike = {
  code?: unknown;
  message?: unknown;
};

export function getCustomerAuthErrorMessage(
  error: unknown,
  mode: "signin" | "signup" | "google" = "signin",
): string {
  if (error instanceof Error && error.message === firebaseConfigurationError) {
    return error.message;
  }

  const authError = error as FirebaseAuthErrorLike | null;
  const code = typeof authError?.code === "string" ? authError.code : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "The email or password is incorrect. Check your details and try again.";
    case "auth/email-already-in-use":
      return "An account already exists with this email. Sign in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Choose a stronger password with at least 6 characters.";
    case "auth/operation-not-allowed":
      return mode === "google"
        ? "Google sign-in is not enabled for this Firebase project."
        : "Email and password sign-in is not enabled for this Firebase project.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Firebase sign-in. Please contact support.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Please allow pop-ups and try again.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/network-request-failed":
      return "We couldn’t reach Firebase. Check your connection and try again.";
    case "auth/too-many-requests":
      return "There have been too many attempts. Please wait a few minutes and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/requires-recent-login":
      return "Please sign in again to continue.";
    default:
      return mode === "google"
        ? "Google sign-in failed. Please try again."
        : mode === "signup"
          ? "We couldn’t create your account. Please check your details and try again."
          : "We couldn’t sign you in. Please check your details and try again.";
  }
}

function getConfiguredAuth() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error(
      firebaseConfigurationError ?? "Firebase authentication is unavailable.",
    );
  }
  return auth;
}

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

    const configuredAuth = auth;
    let cancelled = false;

    // Process any pending redirect result on page load (fires after signInWithRedirect
    // is used as a popup fallback). A null result means no redirect was pending.
    // Errors here are sign-in failures that need to reach the user — store them
    // in state so the Header can show a toast rather than swallowing them.
    // NOTE: this listens on the same Firebase Auth instance used by the
    // admin login. In practice admin and customer sign-in never overlap in
    // the same browser session (different routes, different people), so a
    // single `auth.currentUser` is sufficient without a second Firebase app.
    const unsub = onAuthStateChanged(configuredAuth, (u) => {
      if (cancelled) return;
      setUser(u);
      setLoading(false);
    });

    void setPersistence(configuredAuth, browserLocalPersistence)
      .catch((err: unknown) => {
        // Auth should remain usable if a browser blocks local storage, but the
        // error is kept visible in logs because it affects refresh persistence.
        console.warn("[Firebase Auth] Local persistence unavailable:", err);
      })
      .then(() => getRedirectResult(configuredAuth))
      .catch((err: unknown) => {
        if (cancelled) return;
        const authError = err as FirebaseAuthErrorLike;
        if (typeof authError.code !== "string") return;
        console.error("[Firebase Auth] Redirect sign-in failed:", authError.code);
        setRedirectError(getCustomerAuthErrorMessage(err, "google"));
      });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const configuredAuth = getConfiguredAuth();
    const provider = new GoogleAuthProvider();
    // Attempt popup first — better UX (no page navigation).
    // Falls back to redirect only when the browser blocked the popup, which is
    // common in Replit's sandboxed iframe preview. User-initiated close of the
    // popup (auth/popup-closed-by-user) is treated as cancellation, not an error
    // requiring redirect.
    try {
      await signInWithPopup(configuredAuth, provider);
      setUser(configuredAuth.currentUser);
    } catch (err: any) {
      if (err?.code === "auth/popup-blocked") {
        // signInWithRedirect navigates the page away; execution does not resume
        // here. On return the page reloads, getRedirectResult fires above, and
        // onAuthStateChanged sets the user.
        await signInWithRedirect(configuredAuth, provider);
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
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const configuredAuth = getConfiguredAuth();
    await signInWithEmailAndPassword(configuredAuth, email.trim(), password);
    setUser(configuredAuth.currentUser);
  }, []);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    const configuredAuth = getConfiguredAuth();
    const cred = await createUserWithEmailAndPassword(
      configuredAuth,
      email.trim(),
      password,
    );
    if (name.trim()) {
      try {
        await updateProfile(cred.user, { displayName: name.trim() });
      } catch (err) {
        // Profile display name is optional; do not turn a successful account
        // creation into a misleading "sign up failed" result.
        console.warn("[Firebase Auth] Display name update failed:", err);
      }
    }
    setUser(cred.user);
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    // Firebase normally notifies listeners immediately. Clearing the local
    // state as well prevents a stale admin/customer view if that callback is
    // delayed by the browser or network.
    setUser(null);
  }, []);

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
