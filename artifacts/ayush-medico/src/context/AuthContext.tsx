import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useCustomerAuth } from "./CustomerAuthContext";
import type { User } from "firebase/auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // CustomerAuthProvider owns the single Firebase auth listener. Admin
  // screens consume the same live state instead of registering a second
  // onAuthStateChanged listener against the same Firebase instance.
  const { user, loading, signInWithEmail, signOut } = useCustomerAuth();
  const signIn = useCallback(
    (email: string, password: string) => signInWithEmail(email, password),
    [signInWithEmail],
  );

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
